import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { countSentTodayForBrokers } from '../brokers/broker.service.js';
import { evaluateAvailability } from './schedule.js';
import type { CreateDistributionInput, SetDistributionBrokersInput } from './distribution.schema.js';

/** Exact wording required by the specification. */
export const NO_FORM_MESSAGE = 'Oops, please create a form first.';

const membershipInclude = {
  form: { select: { id: true, name: true, slug: true } },
  brokers: {
    include: { broker: true },
    orderBy: { brokerId: 'asc' },
  },
} satisfies Prisma.DistributionInclude;

const serialize = async (
  distribution: Prisma.DistributionGetPayload<{ include: typeof membershipInclude }>,
) => {
  // One query for every broker's daily count rather than one query per broker.
  const sentToday = await countSentTodayForBrokers(
    distribution.brokers.map((membership) => membership.broker),
  );

  return {
    id: distribution.id,
    name: distribution.name,
    isActive: distribution.isActive,
    createdAt: distribution.createdAt,
    form: distribution.form,
    brokers: distribution.brokers.map((membership) => {
      const availability = evaluateAvailability(membership.broker);

      return {
        id: membership.id,
        brokerId: membership.brokerId,
        name: membership.broker.name,
        percentage: Number(membership.percentage),
        isActive: membership.isActive,
        brokerIsActive: membership.broker.isActive && membership.broker.deletedAt === null,
        timezone: membership.broker.timezone,
        openingTime: membership.broker.openingTime,
        closingTime: membership.broker.closingTime,
        workingDays: membership.broker.workingDays,
        dailyCap: membership.broker.dailyCap,
        sentToday: sentToday.get(membership.brokerId) ?? 0,
        isOpenNow: availability.isOpen,
        closedReason: availability.reason ?? null,
      };
    }),
  };
};

export const getDistribution = async () => {
  const distribution = await prisma.distribution.findFirst({ include: membershipInclude });
  return distribution ? serialize(distribution) : null;
};

const requireDistributionRow = async () => {
  const distribution = await prisma.distribution.findFirst();
  if (!distribution) throw AppError.notFound('No distribution has been created yet');
  return distribution;
};

export const createDistribution = async (input: CreateDistributionInput) => {
  const form = await prisma.form.findFirst();
  if (!form) throw AppError.conflict(NO_FORM_MESSAGE);

  try {
    const created = await prisma.distribution.create({
      data: {
        name: input.name,
        // A distribution is bound to the one existing form automatically; the admin
        // never picks it, per the scope limits.
        formId: form.id,
        brokers: { create: input.brokers },
      },
      include: membershipInclude,
    });

    return serialize(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('A distribution already exists. Only one distribution can be created.');
    }
    throw error;
  }
};

/** Replaces the broker line-up wholesale — simpler to reason about than a diff API. */
export const setDistributionBrokers = async (input: SetDistributionBrokersInput) => {
  const distribution = await requireDistributionRow();

  const brokerIds = input.brokers.map((broker) => broker.brokerId);
  if (new Set(brokerIds).size !== brokerIds.length) {
    throw AppError.badRequest('A broker can only appear once in the distribution');
  }

  const existing = await prisma.broker.findMany({
    where: { id: { in: brokerIds }, deletedAt: null },
    select: { id: true },
  });

  if (existing.length !== brokerIds.length) {
    throw AppError.badRequest('One or more selected brokers no longer exist');
  }

  await prisma.$transaction([
    prisma.distributionBroker.deleteMany({ where: { distributionId: distribution.id } }),
    prisma.distributionBroker.createMany({
      data: input.brokers.map((broker) => ({ ...broker, distributionId: distribution.id })),
    }),
  ]);

  return getDistribution();
};

export const getDistributionLeads = async () => {
  const distribution = await requireDistributionRow();

  return prisma.lead.findMany({
    where: { OR: [{ distributionId: distribution.id }, { distributionId: null }] },
    orderBy: { createdAt: 'desc' },
    include: {
      broker: { select: { id: true, name: true } },
      form: { select: { name: true } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
};
