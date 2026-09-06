'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { Broker } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
    timezone: z.string().min(1, 'Select a timezone'),
    openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Required'),
    closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Required'),
    workingDays: z.array(z.number()).min(1, 'Select at least one working day'),
    dailyCap: z.coerce.number().int().min(0, 'Cannot be negative'),
    isActive: z.boolean(),
  })
  .refine((value) => value.openingTime !== value.closingTime, {
    path: ['closingTime'],
    message: 'Opening and closing time cannot match',
  });

type FormValues = z.input<typeof schema>;

const DEFAULTS: FormValues = {
  name: '',
  email: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
  openingTime: '09:00',
  closingTime: '18:00',
  workingDays: [1, 2, 3, 4, 5],
  dailyCap: 0,
  isActive: true,
};

export function BrokerFormModal({
  open,
  onClose,
  broker,
}: {
  open: boolean;
  onClose: () => void;
  broker?: Broker | null;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEditing = Boolean(broker);

  const timezones = useMemo(() => {
    const supported =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return supported.length > 0
      ? supported
      : ['Asia/Manila', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (!open) return;
    reset(
      broker
        ? {
            name: broker.name,
            email: broker.email ?? '',
            timezone: broker.timezone,
            openingTime: broker.openingTime,
            closingTime: broker.closingTime,
            workingDays: broker.workingDays
              .split(',')
              .map(Number)
              .filter((day) => day >= 1 && day <= 7),
            dailyCap: broker.dailyCap,
            isActive: broker.isActive,
          }
        : DEFAULTS,
    );
  }, [open, broker, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        dailyCap: Number(values.dailyCap),
        workingDays: [...values.workingDays].sort((a, b) => a - b).join(','),
      };
      return broker
        ? api.patch<Broker>(`/brokers/${broker.id}`, payload)
        : api.post<Broker>('/brokers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(isEditing ? 'Broker updated' : 'Broker created');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues.length > 0) {
        // Surface server-side validation on the exact field that failed.
        for (const issue of error.issues) {
          setError(issue.field as keyof FormValues, { message: issue.message });
        }
        return;
      }
      toast.error('Could not save broker', error instanceof ApiError ? error.message : undefined);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit broker' : 'New broker'}
      description="Availability is evaluated in the broker's own timezone."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="broker-form"
            loading={isSubmitting || save.isPending}
          >
            {isEditing ? 'Save changes' : 'Create broker'}
          </Button>
        </div>
      }
    >
      <form
        id="broker-form"
        onSubmit={handleSubmit((values) => save.mutateAsync(values).catch(() => undefined))}
        className="space-y-4"
        noValidate
      >
        <Field label="Broker name" error={errors.name?.message}>
          <Input placeholder="Manila Desk" invalid={Boolean(errors.name)} {...register('name')} />
        </Field>

        <Field label="Email" hint="Optional — for your own records." error={errors.email?.message}>
          <Input
            type="email"
            placeholder="desk@example.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field label="Timezone" error={errors.timezone?.message}>
          <Select invalid={Boolean(errors.timezone)} {...register('timezone')}>
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens at" error={errors.openingTime?.message}>
            <Input type="time" invalid={Boolean(errors.openingTime)} {...register('openingTime')} />
          </Field>
          <Field label="Closes at" error={errors.closingTime?.message}>
            <Input type="time" invalid={Boolean(errors.closingTime)} {...register('closingTime')} />
          </Field>
        </div>

        <Controller
          control={control}
          name="workingDays"
          render={({ field }) => (
            <Field label="Working days" error={errors.workingDays?.message}>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, index) => {
                  const day = index + 1;
                  const selected = field.value.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          selected
                            ? field.value.filter((value) => value !== day)
                            : [...field.value, day],
                        )
                      }
                      className={cn(
                        'h-9 min-w-11 rounded-[10px] px-2 text-[13px] font-medium transition-all duration-150 active:scale-95',
                        selected
                          ? 'bg-accent text-white'
                          : 'bg-sunken text-ink-secondary hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        />

        <Field
          label="Daily cap"
          hint="Maximum leads per day in this broker's timezone. 0 means unlimited."
          error={errors.dailyCap?.message}
        >
          <Input type="number" min={0} invalid={Boolean(errors.dailyCap)} {...register('dailyCap')} />
        </Field>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <div className="bg-sunken flex items-center justify-between rounded-[12px] px-3.5 py-3">
              <div>
                <p className="text-ink text-[14px] font-medium">Active</p>
                <p className="text-ink-secondary text-[12.5px]">
                  Inactive brokers are skipped by the distribution.
                </p>
              </div>
              <Switch checked={field.value} onChange={field.onChange} label="Active" />
            </div>
          )}
        />
      </form>
    </Modal>
  );
}
