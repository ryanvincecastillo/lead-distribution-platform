'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Broker } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { BrokerFormModal } from '@/components/brokers/broker-form';
import { formatWorkingDays, localTimeIn } from '@/lib/format';

export default function BrokersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Broker | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Broker | null>(null);

  const brokers = useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<Broker[]>('/brokers'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/brokers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Broker removed', 'Existing leads keep their assignment history.');
      setDeleting(null);
    },
    onError: (error) =>
      toast.error('Could not remove broker', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <>
      <PageHeader
        title="Brokers"
        description="Each broker has its own timezone, opening hours and daily cap."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New broker
          </Button>
        }
      />

      <Card>
        {brokers.isPending ? (
          <TableSkeleton rows={4} columns={6} />
        ) : brokers.isError ? (
          <ErrorState message="The broker list could not be loaded." onRetry={() => brokers.refetch()} />
        ) : brokers.data && brokers.data.length > 0 ? (
          <Table className="min-w-[860px]">
            <thead>
              <tr>
                <Th>Broker</Th>
                <Th>Status</Th>
                <Th>Local time</Th>
                <Th>Hours</Th>
                <Th>Today</Th>
                <Th>Share</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {brokers.data.map((broker) => (
                <Tr key={broker.id}>
                  <Td>
                    <Link href={`/brokers/${broker.id}`} className="group block min-w-0">
                      <p className="text-ink group-hover:text-accent truncate font-medium transition-colors">
                        {broker.name}
                      </p>
                      <p className="text-ink-tertiary truncate text-[12.5px]">{broker.timezone}</p>
                    </Link>
                  </Td>
                  <Td>
                    {broker.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </Td>
                  <Td className="text-ink-secondary tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="text-ink-tertiary size-3.5" />
                      {localTimeIn(broker.timezone)}
                    </span>
                  </Td>
                  <Td className="text-ink-secondary whitespace-nowrap">
                    {broker.openingTime}–{broker.closingTime}
                    <span className="text-ink-tertiary ml-1.5 text-[12.5px]">
                      {formatWorkingDays(broker.workingDays)}
                    </span>
                  </Td>
                  <Td className="tabular-nums">
                    {broker.sentToday}
                    <span className="text-ink-tertiary">
                      {broker.dailyCap > 0 ? ` / ${broker.dailyCap}` : ' / ∞'}
                    </span>
                  </Td>
                  <Td className="tabular-nums">
                    {broker.distribution ? (
                      `${broker.distribution.percentage}%`
                    ) : (
                      <span className="text-ink-tertiary">—</span>
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(broker)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${broker.name}`}
                      onClick={() => setDeleting(broker)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No brokers yet"
            description="Add the brokers that should receive leads. You can set their timezone, working hours and daily cap."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Add your first broker
              </Button>
            }
          />
        )}
      </Card>

      <BrokerFormModal open={creating} onClose={() => setCreating(false)} />
      <BrokerFormModal open={Boolean(editing)} onClose={() => setEditing(null)} broker={editing} />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Remove ${deleting?.name ?? 'broker'}?`}
        description="The broker stops receiving leads. Leads already delivered keep their history."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Remove broker
            </Button>
          </div>
        }
      >
        <p className="text-ink-secondary text-[14px]">
          This is a soft delete — the record is retained so historical lead assignments stay
          auditable.
        </p>
      </Modal>
    </>
  );
}
