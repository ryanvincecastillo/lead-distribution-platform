import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { brokerDayRange } from '../distribution/schedule.js';
import type { CreateBrokerInput, UpdateBrokerInput } from './broker.schema.js';

const visible = { deletedAt: null };

/** Accepts either the shared client or a transaction client. */
type DbClient = Pick<Prisma.TransactionClient, 'lead'>;

/** Leads assigned to this broker during the broker's *own* calendar day. */
export const countSentToday = async (brokerId: number, timezone: string, at = new Date()) => {
  const { start, end } = brokerDayRange(timezone, at);

  return prisma.lead.count({
    where: { brokerId, status: 'sent', assignedAt: { gte: start, lte: end } },
  });
};

/**
 * Today's count for many brokers in a *single* query.
 *
 * Counting per broker is one query each, so a list of N brokers cost N+1 round trips.
 * Each broker's "today" differs — it is their own local calendar day — so this widens the
 * filter to the union of every broker's day, fetches that slice once, and then applies each
 * broker's own boundaries in memory. The union spans at most ~50 hours regardless of how
 * many brokers there are.
 */
export const countSentTodayForBrokers = async (
  brokers: { id: number; timezone: string }[],
  at: Date = new Date(),
  client: DbClient = prisma,
): Promise<Map<number, number>> => {
  const counts = new Map<number, number>(brokers.map((broker) => [broker.id, 0]));
  if (brokers.length === 0) return counts;

  const ranges = brokers.map((broker) => ({
    id: broker.id,
    ...brokerDayRange(broker.timezone, at),
  }));

  const windowStart = new Date(Math.min(...ranges.map((range) => range.start.getTime())));
  const windowEnd = new Date(Math.max(...ranges.map((range) => range.end.getTime())));

  const rows = await client.lead.findMany({
    where: {
      status: 'sent',
      brokerId: { in: brokers.map((broker) => broker.id) },
      assignedAt: { gte: windowStart, lte: windowEnd },
    },
    select: { brokerId: true, assignedAt: true },
  });

  const rangeById = new Map(ranges.map((range) => [range.id, range]));

  for (const row of rows) {
    if (row.brokerId === null || row.assignedAt === null) continue;
    const range = rangeById.get(row.brokerId);
    if (!range) continue;
    if (row.assignedAt >= range.start && row.assignedAt <= range.end) {
      counts.set(row.brokerId, (counts.get(row.brokerId) ?? 0) + 1);
    }
  }

  return counts;
};

export const listBrokers = async () => {
  const brokers = await prisma.broker.findMany({
    where: visible,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { leads: true } },
      distributionBrokers: { select: { percentage: true, isActive: true } },
    },
  });

  const sentToday = await countSentTodayForBrokers(brokers);

  return brokers.map((broker) => {
    const { _count, distributionBrokers, ...rest } = broker;
    const membership = distributionBrokers[0];

    return {
      ...rest,
      totalLeads: _count.leads,
      sentToday: sentToday.get(broker.id) ?? 0,
      distribution: membership
        ? { percentage: Number(membership.percentage), isActive: membership.isActive }
        : null,
    };
  });
};

export const getBroker = async (id: number) => {
  const broker = await prisma.broker.findFirst({
    where: { id, ...visible },
    include: { distributionBrokers: { select: { percentage: true, isActive: true } } },
  });

  if (!broker) throw AppError.notFound('Broker not found');

  const { distributionBrokers, ...rest } = broker;
  const membership = distributionBrokers[0];

  return {
    ...rest,
    sentToday: await countSentToday(broker.id, broker.timezone),
    distribution: membership
      ? { percentage: Number(membership.percentage), isActive: membership.isActive }
      : null,
  };
};

export const listBrokerLeads = async (brokerId: number) => {
  await getBroker(brokerId);

  return prisma.lead.findMany({
    where: { brokerId },
    orderBy: { assignedAt: 'desc' },
    include: { form: { select: { name: true } } },
  });
};

export const createBroker = (input: CreateBrokerInput) =>
  prisma.broker.create({ data: { ...input, email: input.email || null } });

export const updateBroker = async (id: number, input: UpdateBrokerInput) => {
  await getBroker(id);

  return prisma.broker.update({
    where: { id },
    data: { ...input, ...(input.email !== undefined ? { email: input.email || null } : {}) },
  });
};

/**
 * Soft delete. Leads keep pointing at the broker that actually received them, so the
 * historical record on the leads and distribution pages stays intact and auditable.
 */
export const deleteBroker = async (id: number) => {
  await getBroker(id);
  await prisma.broker.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
};
