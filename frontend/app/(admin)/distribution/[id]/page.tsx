'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import type { Distribution, Lead, LeadStatus } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

const FILTERS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'unsent', label: 'Unsent' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'failed', label: 'Failed' },
];

export default function DistributionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');

  const distribution = useQuery({
    queryKey: ['distribution'],
    queryFn: () => api.get<Distribution | null>('/distribution'),
  });

  const leads = useQuery({
    queryKey: ['distribution', 'leads'],
    queryFn: () => api.get<Lead[]>('/distribution/leads'),
  });

  const visible = (leads.data ?? []).filter((lead) => filter === 'all' || lead.status === filter);

  const counts = (leads.data ?? []).reduce<Record<string, number>>((accumulator, lead) => {
    accumulator[lead.status] = (accumulator[lead.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <>
      <Link
        href="/distribution"
        className="text-ink-secondary hover:text-ink mb-4 inline-flex items-center gap-1.5 text-[13px] transition-colors"
      >
        <ArrowLeft className="size-4" /> Distribution
      </Link>

      <PageHeader
        title={distribution.data?.name ?? 'Distribution'}
        description="Every lead that passed through this distribution, including duplicates and leads nobody could take."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(['sent', 'unsent', 'duplicate', 'failed'] as LeadStatus[]).map((status) => (
          <Card key={status} className="px-5 py-4">
            <p className="text-ink-secondary text-[13px] capitalize">{status}</p>
            <p className="text-display text-ink mt-1 text-[26px] font-semibold">
              {counts[status] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Lead history"
          description="The reason column explains why a lead was not delivered."
          action={
            <div className="bg-sunken inline-flex rounded-[10px] p-0.5">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    'rounded-[8px] px-2.5 py-1 text-[12.5px] font-medium transition-all duration-150',
                    filter === option.value
                      ? 'bg-surface text-ink shadow-soft'
                      : 'text-ink-tertiary hover:text-ink-secondary',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        />

        {leads.isPending ? (
          <TableSkeleton rows={6} columns={6} />
        ) : leads.isError ? (
          <ErrorState message="Lead history could not be loaded." onRetry={() => leads.refetch()} />
        ) : visible.length > 0 ? (
          <Table className="min-w-[940px]">
            <thead>
              <tr>
                <Th>Lead</Th>
                <Th>IP address</Th>
                <Th>Broker</Th>
                <Th>Status</Th>
                <Th>Reason</Th>
                <Th>Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <Tr key={lead.id}>
                  <Td>
                    <p className="text-ink font-medium">{lead.name}</p>
                    <p className="text-ink-tertiary text-[12.5px]">{lead.email}</p>
                  </Td>
                  <Td className="text-ink-secondary tabular-nums">{lead.ipAddress}</Td>
                  <Td className="text-ink-secondary">
                    {lead.broker?.name ?? '—'}
                    {lead.assignedManual ? (
                      <span className="text-ink-tertiary ml-1.5 text-[12px]">(manual)</span>
                    ) : null}
                  </Td>
                  <Td>
                    <StatusBadge status={lead.status} />
                  </Td>
                  <Td className="text-ink-tertiary max-w-[260px] text-[13px]">
                    {lead.statusReason ?? '—'}
                  </Td>
                  <Td className="text-ink-secondary whitespace-nowrap">
                    {formatDateTime(lead.createdAt)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={filter === 'all' ? 'No leads yet' : `No ${filter} leads`}
            description="Leads appear here as soon as the public form is submitted."
          />
        )}
      </Card>
    </>
  );
}
