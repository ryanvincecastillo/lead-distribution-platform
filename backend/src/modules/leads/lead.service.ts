import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { LeadQuery } from './lead.schema.js';

const leadInclude = {
  broker: { select: { id: true, name: true } },
  form: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.LeadInclude;

export const listLeads = async (query: LeadQuery) => {
  const where: Prisma.LeadWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.brokerId ? { brokerId: query.brokerId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
            { phone: { contains: query.search } },
            { ipAddress: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total };
};

export const getLead = async (id: number) => {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { ...leadInclude, events: { orderBy: { createdAt: 'asc' } } },
  });

  if (!lead) throw AppError.notFound('Lead not found');

  return lead;
};

/**
 * Manual assignment is an explicit admin override: it deliberately ignores open hours
 * and the daily cap, because the admin is making the call knowingly. It does *not*
 * override the duplicate rule — that one is a hard requirement.
 */
export const assignLeadManually = async (leadId: number, brokerId: number) => {
  const lead = await getLead(leadId);

  if (lead.status === 'duplicate') {
    throw AppError.conflict('Duplicate leads cannot be assigned to a broker');
  }

  if (lead.brokerId !== null) {
    throw AppError.conflict('This lead has already been assigned to a broker');
  }

  const broker = await prisma.broker.findFirst({ where: { id: brokerId, deletedAt: null } });
  if (!broker) throw AppError.notFound('Broker not found');

  const distribution = await prisma.distribution.findFirst();

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      brokerId,
      status: 'sent',
      assignedAt: new Date(),
      assignedManual: true,
      statusReason: null,
      distributionId: lead.distributionId ?? distribution?.id ?? null,
      events: {
        create: {
          type: 'manually_assigned',
          message: `Manually assigned to ${broker.name} by an administrator`,
        },
      },
    },
    include: leadInclude,
  });
};

export const getDashboardStats = async () => {
  const [statusGroups, brokerCount, form, distribution] = await prisma.$transaction([
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.broker.count({ where: { deletedAt: null } }),
    prisma.form.findFirst({ select: { id: true, name: true, slug: true } }),
    prisma.distribution.findFirst({ select: { id: true, name: true } }),
  ]);

  const byStatus = { sent: 0, unsent: 0, duplicate: 0, failed: 0 };
  for (const group of statusGroups) {
    byStatus[group.status] = group._count._all;
  }

  return {
    leads: {
      ...byStatus,
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    },
    brokerCount,
    form,
    distribution,
  };
};
