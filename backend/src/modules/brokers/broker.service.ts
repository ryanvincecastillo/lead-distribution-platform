import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { brokerDayRange } from '../distribution/schedule.js';
import type { CreateBrokerInput, UpdateBrokerInput } from './broker.schema.js';

const visible = { deletedAt: null };

/** Leads assigned to this broker during the broker's *own* calendar day. */
export const countSentToday = async (brokerId: number, timezone: string, at = new Date()) => {
  const { start, end } = brokerDayRange(timezone, at);

  return prisma.lead.count({
    where: { brokerId, status: 'sent', assignedAt: { gte: start, lte: end } },
  });
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

  return Promise.all(
    brokers.map(async (broker) => {
      const { _count, distributionBrokers, ...rest } = broker;
      const membership = distributionBrokers[0];

      return {
        ...rest,
        totalLeads: _count.leads,
        sentToday: await countSentToday(broker.id, broker.timezone),
        distribution: membership
          ? { percentage: Number(membership.percentage), isActive: membership.isActive }
          : null,
      };
    }),
  );
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
