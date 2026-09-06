'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Circle, Inbox, Share2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardStats, Lead } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

const statTiles = [
  { key: 'total', label: 'Total leads', tone: 'text-ink' },
  { key: 'sent', label: 'Sent', tone: 'text-success' },
  { key: 'unsent', label: 'Unsent', tone: 'text-warning' },
  { key: 'duplicate', label: 'Duplicates', tone: 'text-accent' },
] as const;

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<DashboardStats>('/leads/stats'),
  });

  const recent = useQuery({
    queryKey: ['leads', { page: 1, pageSize: 6 }],
    queryFn: () => api.getPage<Lead[]>('/leads?page=1&pageSize=6'),
  });

  const setupSteps = [
    {
      label: 'Create brokers',
      done: (stats.data?.brokerCount ?? 0) > 0,
      href: '/brokers',
      detail: `${stats.data?.brokerCount ?? 0} created`,
    },
    {
      label: 'Create the lead form',
      done: Boolean(stats.data?.form),
      href: '/form',
      detail: stats.data?.form ? `/${stats.data.form.slug}` : 'Not created yet',
    },
    {
      label: 'Create the distribution',
      done: Boolean(stats.data?.distribution),
      href: '/distribution',
      detail: stats.data?.distribution?.name ?? 'Not created yet',
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Lead volume and routing health at a glance."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((tile) => (
          <Card key={tile.key} className="p-5">
            <p className="text-ink-secondary text-[13px]">{tile.label}</p>
            {stats.isPending ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className={cn('text-display mt-1 text-[30px] font-semibold', tile.tone)}>
                {stats.data?.leads[tile.key] ?? 0}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader
            title="Recent leads"
            description="The latest submissions across the form."
            action={
              <Link
                href="/leads"
                className="text-accent inline-flex items-center gap-1 text-[13px] font-medium hover:underline"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {recent.isPending ? (
            <TableSkeleton rows={4} columns={4} />
          ) : recent.isError ? (
            <ErrorState message="The lead list could not be loaded." onRetry={() => recent.refetch()} />
          ) : recent.data && recent.data.data.length > 0 ? (
            <Table className="min-w-[560px]">
              <thead>
                <tr>
                  <Th>Lead</Th>
                  <Th>Broker</Th>
                  <Th>Status</Th>
                  <Th>Received</Th>
                </tr>
              </thead>
              <tbody>
                {recent.data.data.map((lead) => (
                  <Tr key={lead.id}>
                    <Td>
                      <div className="min-w-0">
                        <p className="text-ink truncate font-medium">{lead.name}</p>
                        <p className="text-ink-tertiary truncate text-[13px]">{lead.email}</p>
                      </div>
                    </Td>
                    <Td className="text-ink-secondary">{lead.broker?.name ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={lead.status} />
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
              title="No leads yet"
              description="Once your public form receives its first submission it will appear here."
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Setup" description="Three steps to start routing leads." />
          <ul className="p-2">
            {setupSteps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="hover:bg-sunken flex items-center gap-3 rounded-[12px] px-3 py-3 transition-colors"
                >
                  {step.done ? (
                    <CheckCircle2 className="text-success size-5 shrink-0" />
                  ) : (
                    <Circle className="text-ink-tertiary size-5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-ink text-[14px] font-medium">{step.label}</p>
                    <p className="text-ink-tertiary truncate text-[12.5px]">{step.detail}</p>
                  </div>
                  <ArrowRight className="text-ink-tertiary size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hairline-t flex items-center gap-3 px-5 py-4">
            <Users className="text-ink-tertiary size-4" />
            <span className="text-ink-secondary text-[13px]">
              {stats.data?.brokerCount ?? 0} brokers ·{' '}
              {stats.data?.distribution ? 'distribution live' : 'no distribution'}
            </span>
            <Share2 className="text-ink-tertiary ml-auto size-4" />
          </div>
        </Card>
      </div>
    </>
  );
}
