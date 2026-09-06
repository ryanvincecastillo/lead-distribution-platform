import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { brokerDayRange } from '../distribution/schedule.js';
import { selectBroker, type BrokerCandidate } from '../distribution/engine.js';
import type { PublicLeadInput } from './lead.schema.js';

export interface SubmitLeadParams extends PublicLeadInput {
  slug: string;
  ipAddress: string;
}

type Tx = Prisma.TransactionClient;

/**
 * The decision snapshot is a structurally-typed object; Prisma's Json input type only
 * accepts index-signature shapes, so it is widened here in one place rather than at
 * every call site.
 */
const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/**
 * A lead counts as a duplicate when this email was *already assigned to a broker* at
 * some point. Two unsent submissions from the same address are not duplicates — nothing
 * was ever delivered — so the second one is still allowed to find a broker.
 */
const isDuplicate = async (tx: Tx, email: string) =>
  (await tx.lead.count({ where: { email, brokerId: { not: null } } })) > 0;

const countSentTodayTx = (tx: Tx, brokerId: number, timezone: string, at: Date) => {
  const { start, end } = brokerDayRange(timezone, at);
  return tx.lead.count({
    where: { brokerId, status: 'sent', assignedAt: { gte: start, lte: end } },
  });
};

/**
 * Last-resort persistence. If routing throws, the visitor's details would otherwise be
 * lost entirely — they filled in a form and got a 500. Recording the lead as `failed`
 * keeps it visible on the leads and distribution pages so an admin can assign it by hand.
 */
const recordFailedLead = async (
  base: Omit<Prisma.LeadUncheckedCreateInput, 'status'>,
  cause: unknown,
) => {
  const distribution = await prisma.distribution.findFirst({ select: { id: true } }).catch(() => null);

  try {
    return await prisma.lead.create({
      data: {
        ...base,
        distributionId: distribution?.id ?? null,
        status: 'failed',
        statusReason: 'The lead could not be routed because of a system error',
        events: {
          create: {
            type: 'failed',
            message: `Routing failed: ${cause instanceof Error ? cause.message : 'unknown error'}`.slice(0, 500),
          },
        },
      },
      include: { broker: true },
    });
  } catch {
    // The database itself is unreachable; nothing can be salvaged.
    throw cause;
  }
};

export const submitLead = async (params: SubmitLeadParams) => {
  const form = await prisma.form.findUnique({ where: { slug: params.slug } });
  if (!form) throw AppError.notFound('This form does not exist');

  const at = new Date();

  const identity = {
    name: params.name,
    email: params.email,
    phone: params.phone,
    ipAddress: params.ipAddress,
    formId: form.id,
  };

  return prisma.$transaction(
    async (tx) => {
      const distribution = await tx.distribution.findFirst({
        include: { brokers: { include: { broker: true } } },
      });

      // Serialise concurrent submissions against the one distribution row. Without this
      // two visitors submitting at the same moment can both read "9 of 10 sent" and both
      // be assigned, pushing the broker one over its daily cap.
      if (distribution) {
        await tx.$queryRaw`SELECT id FROM distributions WHERE id = ${distribution.id} FOR UPDATE`;
      }

      const base = { ...identity, distributionId: distribution?.id ?? null };

      if (await isDuplicate(tx, params.email)) {
        return tx.lead.create({
          data: {
            ...base,
            status: 'duplicate',
            statusReason: 'This email address was already delivered to a broker',
            events: {
              create: {
                type: 'duplicate_detected',
                message: 'Email already assigned to a broker on an earlier submission',
              },
            },
          },
          include: { broker: true },
        });
      }

      if (!distribution || !distribution.isActive) {
        return tx.lead.create({
          data: {
            ...base,
            status: 'unsent',
            statusReason: distribution
              ? 'The distribution is currently inactive'
              : 'No distribution has been created yet',
            events: {
              create: {
                type: 'no_distribution',
                message: distribution
                  ? 'Distribution is inactive'
                  : 'No distribution exists for this form',
              },
            },
          },
          include: { broker: true },
        });
      }

      const candidates: BrokerCandidate[] = await Promise.all(
        distribution.brokers.map(async (membership) => ({
          brokerId: membership.brokerId,
          brokerName: membership.broker.name,
          percentage: Number(membership.percentage),
          activeInDistribution: membership.isActive,
          brokerIsActive: membership.broker.isActive,
          brokerIsDeleted: membership.broker.deletedAt !== null,
          dailyCap: membership.broker.dailyCap,
          sentToday: await countSentTodayTx(tx, membership.brokerId, membership.broker.timezone, at),
          schedule: membership.broker,
        })),
      );

      const { selectedBrokerId, evaluations, totalSentToday } = selectBroker(candidates, at);

      if (selectedBrokerId === null) {
        return tx.lead.create({
          data: {
            ...base,
            status: 'unsent',
            statusReason:
              candidates.length === 0
                ? 'No brokers have been added to the distribution'
                : 'No broker was eligible at the time of submission',
            events: {
              create: {
                type: 'no_eligible_broker',
                message: 'Every broker in the distribution was skipped',
                context: asJson({ totalSentToday, evaluations }),
              },
            },
          },
          include: { broker: true },
        });
      }

      const winner = evaluations.find((item) => item.brokerId === selectedBrokerId);

      return tx.lead.create({
        data: {
          ...base,
          status: 'sent',
          brokerId: selectedBrokerId,
          assignedAt: at,
          events: {
            create: {
              type: 'assigned',
              message: `Assigned to ${winner?.brokerName ?? 'broker'} with the highest deficit (${winner?.deficit ?? 0})`,
              context: asJson({ totalSentToday, evaluations }),
            },
          },
        },
        include: { broker: true },
      });
    },
    { timeout: 15_000 },
  ).catch((error) => {
    logger.error({ err: error }, 'Lead intake failed, recording the lead as failed');
    return recordFailedLead(identity, error);
  });
};
