'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Inbox, Search, UserPlus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Broker, Lead, LeadStatus, PageMeta } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

const FILTERS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'unsent', label: 'Unsent' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'failed', label: 'Failed' },
];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState<Lead | null>(null);
  const [brokerId, setBrokerId] = useState('');

  const queryString = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    ...(status !== 'all' ? { status } : {}),
    ...(search ? { search } : {}),
  }).toString();

  const leads = useQuery({
    queryKey: ['leads', queryString],
    queryFn: () => api.getPage<Lead[]>(`/leads?${queryString}`),
  });

  const brokers = useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<Broker[]>('/brokers'),
  });

  const assign = useMutation({
    mutationFn: ({ leadId, broker }: { leadId: number; broker: number }) =>
      api.post<Lead>(`/leads/${leadId}/assign`, { brokerId: broker }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Lead assigned');
      setAssigning(null);
      setBrokerId('');
    },
    onError: (error) =>
      toast.error('Could not assign lead', error instanceof ApiError ? error.message : undefined),
  });

  const meta: PageMeta | undefined = leads.data?.meta;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every submission, with the captured IP address and where it was routed."
      />

      <Card>
        <CardHeader
          title="All leads"
          description={meta ? `${meta.total} total` : undefined}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="text-ink-tertiary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, IP…"
                  className="h-9 w-56 pl-9"
                />
              </div>
              <div className="bg-sunken inline-flex rounded-[10px] p-0.5">
                {FILTERS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatus(option.value);
                      setPage(1);
                    }}
                    className={cn(
                      'rounded-[8px] px-2.5 py-1 text-[12.5px] font-medium transition-all duration-150',
                      status === option.value
                        ? 'bg-surface text-ink shadow-soft'
                        : 'text-ink-tertiary hover:text-ink-secondary',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {leads.isPending ? (
          <TableSkeleton rows={8} columns={7} />
        ) : leads.isError ? (
          <ErrorState message="Leads could not be loaded." onRetry={() => leads.refetch()} />
        ) : leads.data && leads.data.data.length > 0 ? (
          <>
            <Table className="min-w-[1000px]">
              <thead>
                <tr>
                  <Th>Lead name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>IP address</Th>
                  <Th>Form</Th>
                  <Th>Broker</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {leads.data.data.map((lead) => (
                  <Tr key={lead.id}>
                    <Td className="font-medium">{lead.name}</Td>
                    <Td className="text-ink-secondary">{lead.email}</Td>
                    <Td className="text-ink-secondary tabular-nums">{lead.phone}</Td>
                    <Td className="text-ink-secondary tabular-nums">{lead.ipAddress}</Td>
                    <Td className="text-ink-secondary">{lead.form?.name ?? '—'}</Td>
                    <Td className="text-ink-secondary">{lead.broker?.name ?? '—'}</Td>
                    <Td>
                      <StatusBadge status={lead.status} />
                    </Td>
                    <Td className="text-ink-secondary whitespace-nowrap">
                      {formatDateTime(lead.createdAt)}
                    </Td>
                    <Td className="text-right">
                      {lead.status === 'unsent' ? (
                        <Button variant="secondary" size="sm" onClick={() => setAssigning(lead)}>
                          <UserPlus className="size-3.5" /> Assign
                        </Button>
                      ) : (
                        <span className="text-ink-tertiary text-[13px]">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {meta && meta.pageCount > 1 ? (
              <div className="hairline-t flex items-center justify-between px-5 py-3">
                <p className="text-ink-tertiary text-[13px]">
                  Page {meta.page} of {meta.pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page >= meta.pageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={search || status !== 'all' ? 'No matching leads' : 'No leads yet'}
            description={
              search || status !== 'all'
                ? 'Try a different search term or filter.'
                : 'Share your public form URL to start collecting leads.'
            }
          />
        )}
      </Card>

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="Assign lead manually"
        description={assigning ? `${assigning.name} · ${assigning.email}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button
              loading={assign.isPending}
              disabled={!brokerId}
              onClick={() =>
                assigning && assign.mutate({ leadId: assigning.id, broker: Number(brokerId) })
              }
            >
              Assign lead
            </Button>
          </div>
        }
      >
        <Field
          label="Broker"
          hint="Manual assignment intentionally overrides opening hours and the daily cap."
        >
          <Select value={brokerId} onChange={(event) => setBrokerId(event.target.value)}>
            <option value="">Select a broker…</option>
            {(brokers.data ?? []).map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name} · {broker.sentToday}
                {broker.dailyCap > 0 ? `/${broker.dailyCap}` : ''} today
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </>
  );
}
