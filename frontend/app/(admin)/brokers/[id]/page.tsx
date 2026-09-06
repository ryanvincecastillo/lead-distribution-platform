'use client';

import Link from 'next/link';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import type { Broker, Lead } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { formatDateTime, formatWorkingDays, localTimeIn } from '@/lib/format';

export default function BrokerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const broker = useQuery({
    queryKey: ['brokers', id],
    queryFn: () => api.get<Broker>(`/brokers/${id}`),
  });

  const leads = useQuery({
    queryKey: ['brokers', id, 'leads'],
    queryFn: () => api.get<Lead[]>(`/brokers/${id}/leads`),
  });

  const facts = broker.data
    ? [
        { label: 'Timezone', value: broker.data.timezone },
        { label: 'Local time', value: localTimeIn(broker.data.timezone) },
        { label: 'Opening hours', value: `${broker.data.openingTime}–${broker.data.closingTime}` },
        { label: 'Working days', value: formatWorkingDays(broker.data.workingDays) },
        {
          label: 'Daily cap',
          value: broker.data.dailyCap > 0 ? String(broker.data.dailyCap) : 'Unlimited',
        },
        { label: 'Sent today', value: String(broker.data.sentToday) },
        {
          label: 'Share of distribution',
          value: broker.data.distribution ? `${broker.data.distribution.percentage}%` : 'Not in distribution',
        },
      ]
    : [];

  return (
    <>
      <Link
        href="/brokers"
        className="text-ink-secondary hover:text-ink mb-4 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-4" /> Brokers
      </Link>

      <PageHeader
        title={broker.data?.name ?? 'Broker'}
        description="Everything this broker has received, with the captured visitor details."
        action={
          broker.data ? (
            broker.data.isActive ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="neutral">Inactive</Badge>
            )
          ) : null
        }
      />

      <Card className="mb-4">
        <CardHeader title="Configuration" />
        <dl className="divide-hairline grid grid-cols-1 divide-y sm:grid-cols-2 lg:grid-cols-4">
          {broker.isPending
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="px-5 py-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
              ))
            : facts.map((fact) => (
                <div key={fact.label} className="px-5 py-4">
                  <dt className="text-ink-tertiary text-[12px] tracking-wide uppercase">
                    {fact.label}
                  </dt>
                  <dd className="text-ink mt-1 text-[14px] font-medium">{fact.value}</dd>
                </div>
              ))}
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Leads received"
          description="Normalised email, captured IP address and the time this broker received each lead."
        />
        {leads.isPending ? (
          <TableSkeleton rows={5} columns={7} />
        ) : leads.isError ? (
          <ErrorState message="Leads for this broker could not be loaded." onRetry={() => leads.refetch()} />
        ) : leads.data && leads.data.length > 0 ? (
          <Table className="min-w-[900px]">
            <thead>
              <tr>
                <Th>Lead name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>IP address</Th>
                <Th>Form name</Th>
                <Th>Date received</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {leads.data.map((lead) => (
                <Tr key={lead.id}>
                  <Td className="font-medium">{lead.name}</Td>
                  <Td className="text-ink-secondary">{lead.email}</Td>
                  <Td className="text-ink-secondary tabular-nums">{lead.phone}</Td>
                  <Td className="text-ink-secondary tabular-nums">{lead.ipAddress}</Td>
                  <Td className="text-ink-secondary">{lead.form?.name ?? '—'}</Td>
                  <Td className="text-ink-secondary whitespace-nowrap">
                    {formatDateTime(lead.assignedAt ?? lead.createdAt)}
                  </Td>
                  <Td>
                    <StatusBadge status={lead.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="No leads received yet"
            description="When the distribution routes a lead to this broker it will show up here."
          />
        )}
      </Card>
    </>
  );
}
