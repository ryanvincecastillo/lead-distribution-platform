'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Clock, Share2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Broker, Distribution, LeadForm } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { EmptyState, Skeleton } from '@/components/ui/states';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { formatWorkingDays, localTimeIn } from '@/lib/format';

interface Row {
  brokerId: number;
  name: string;
  percentage: number;
  isActive: boolean;
  included: boolean;
}

export default function DistributionPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('Main Distribution');
  const [rows, setRows] = useState<Row[]>([]);
  const [noFormMessage, setNoFormMessage] = useState<string | null>(null);

  const form = useQuery({ queryKey: ['form'], queryFn: () => api.get<LeadForm | null>('/form') });
  const brokers = useQuery({ queryKey: ['brokers'], queryFn: () => api.get<Broker[]>('/brokers') });
  const distribution = useQuery({
    queryKey: ['distribution'],
    queryFn: () => api.get<Distribution | null>('/distribution'),
  });

  // Seed the editable table from whichever source is authoritative right now.
  useEffect(() => {
    if (!brokers.data) return;

    setRows(
      brokers.data.map((broker) => {
        const membership = distribution.data?.brokers.find((item) => item.brokerId === broker.id);
        return {
          brokerId: broker.id,
          name: broker.name,
          percentage: membership?.percentage ?? 0,
          isActive: membership?.isActive ?? true,
          included: Boolean(membership),
        };
      }),
    );
  }, [brokers.data, distribution.data]);

  const included = rows.filter((row) => row.included);
  const totalPercentage = included.reduce((sum, row) => sum + Number(row.percentage || 0), 0);

  const payloadBrokers = included.map((row) => ({
    brokerId: row.brokerId,
    percentage: Number(row.percentage) || 0,
    isActive: row.isActive,
  }));

  const create = useMutation({
    mutationFn: () => api.post<Distribution>('/distribution', { name, brokers: payloadBrokers }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Distribution created', 'It is now linked to your form automatically.');
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Something went wrong.';
      // The specification requires this exact prompt when no form exists yet.
      if (message.startsWith('Oops')) setNoFormMessage(message);
      else toast.error('Could not create distribution', message);
    },
  });

  const save = useMutation({
    mutationFn: () => api.put<Distribution>('/distribution/brokers', { brokers: payloadBrokers }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Distribution updated');
    },
    onError: (error) =>
      toast.error('Could not save', error instanceof ApiError ? error.message : undefined),
  });

  const updateRow = (brokerId: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.brokerId === brokerId ? { ...row, ...patch } : row)),
    );

  const exists = Boolean(distribution.data);
  const isLoading = form.isPending || brokers.isPending || distribution.isPending;

  return (
    <>
      <PageHeader
        title="Distribution"
        description="Choose which brokers participate and what share of leads each should receive."
        action={
          exists ? (
            <Link href={`/distribution/${distribution.data?.id}`}>
              <Button variant="secondary">
                View detail <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : null
        }
      />

      {isLoading ? (
        <Card>
          <CardBody className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {!exists ? (
            <Card>
              <CardHeader
                title="Create the distribution"
                description="One distribution only. It is attached to your form automatically."
              />
              <CardBody className="space-y-4">
                <Field label="Distribution name" className="max-w-sm">
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                {!form.data ? (
                  <div className="bg-warning-soft text-warning flex items-start gap-2.5 rounded-[12px] px-3.5 py-3">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p className="text-[13px] leading-snug">
                      No form exists yet. A distribution cannot be created until you create the lead
                      form.
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Broker line-up"
              description="Percentages set each broker's target share of the day's leads."
              action={
                <Badge tone={totalPercentage === 100 ? 'success' : 'warning'}>
                  {totalPercentage}% allocated
                </Badge>
              }
            />

            {rows.length === 0 ? (
              <EmptyState
                icon={<Share2 className="size-5" />}
                title="No brokers to add"
                description="Create brokers first, then choose which of them take part in the distribution."
                action={
                  <Link href="/brokers">
                    <Button>Go to brokers</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-hairline divide-y">
                {rows.map((row) => {
                  const broker = brokers.data?.find((item) => item.id === row.brokerId);
                  const live = distribution.data?.brokers.find((item) => item.brokerId === row.brokerId);

                  return (
                    <li
                      key={row.brokerId}
                      className={cn(
                        'flex flex-wrap items-center gap-4 px-5 py-4 transition-opacity',
                        !row.included && 'opacity-55',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(event) => updateRow(row.brokerId, { included: event.target.checked })}
                        aria-label={`Include ${row.name}`}
                        className="accent-accent size-[18px] shrink-0 rounded"
                      />

                      <div className="min-w-[160px] flex-1">
                        <p className="text-ink text-[14px] font-medium">{row.name}</p>
                        <p className="text-ink-tertiary text-[12.5px]">
                          {broker?.timezone} · {broker?.openingTime}–{broker?.closingTime} ·{' '}
                          {broker ? formatWorkingDays(broker.workingDays) : ''}
                        </p>
                      </div>

                      {live ? (
                        <Badge tone={live.isOpenNow ? 'success' : 'neutral'}>
                          <Clock className="size-3" />
                          {live.isOpenNow ? 'Open now' : 'Closed'} ·{' '}
                          {broker ? localTimeIn(broker.timezone) : ''}
                        </Badge>
                      ) : null}

                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={row.percentage}
                          disabled={!row.included}
                          onChange={(event) =>
                            updateRow(row.brokerId, { percentage: Number(event.target.value) })
                          }
                          aria-label={`${row.name} percentage`}
                          className="h-9 w-20 text-center tabular-nums"
                        />
                        <span className="text-ink-secondary text-[13px]">%</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-ink-tertiary text-[12.5px]">Active</span>
                        <Switch
                          checked={row.isActive}
                          disabled={!row.included}
                          onChange={(value) => updateRow(row.brokerId, { isActive: value })}
                          label={`${row.name} active in distribution`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {rows.length > 0 ? (
              <div className="hairline-t flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-ink-tertiary text-[12.5px]">
                  {totalPercentage === 100
                    ? 'Shares add up to 100%.'
                    : 'Shares do not add up to 100% — routing still works, but the split will not match your intent.'}
                </p>
                <Button
                  onClick={() => (exists ? save.mutate() : create.mutate())}
                  loading={create.isPending || save.isPending}
                >
                  {exists ? 'Save changes' : 'Create distribution'}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(noFormMessage)}
        onClose={() => setNoFormMessage(null)}
        title={noFormMessage ?? ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoFormMessage(null)}>
              Close
            </Button>
            <Link href="/form">
              <Button>Create the form</Button>
            </Link>
          </div>
        }
      >
        <p className="text-ink-secondary text-[14px]">
          A distribution is always attached to a form, so the form has to exist first.
        </p>
      </Modal>
    </>
  );
}
