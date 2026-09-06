'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, ExternalLink, FileText, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { LeadForm } from '@/lib/types';
import { PageHeader } from '@/components/layout/shell';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes'),
});

type FormValues = z.infer<typeof schema>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function FormPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const form = useQuery({
    queryKey: ['form'],
    queryFn: () => api.get<LeadForm | null>('/form'),
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', slug: '' } });

  const create = useMutation({
    mutationFn: (values: FormValues) => api.post<LeadForm>('/form', values),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Form created', 'Your public URL is ready to share.');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.issues.length > 0) {
        for (const issue of error.issues) setError(issue.field as keyof FormValues, { message: issue.message });
        return;
      }
      toast.error('Could not create form', error instanceof ApiError ? error.message : undefined);
    },
  });

  const publicUrl =
    form.data && typeof window !== 'undefined' ? `${window.location.origin}/${form.data.slug}` : '';

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (form.isPending) {
    return (
      <>
        <PageHeader title="Lead form" />
        <Card>
          <CardBody className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardBody>
        </Card>
      </>
    );
  }

  if (form.data) {
    return (
      <>
        <PageHeader
          title="Lead form"
          description="Only one form can exist, so this one is now locked."
        />

        <Card className="mb-4">
          <CardHeader
            title={form.data.name}
            description={`Created ${formatDateTime(form.data.createdAt)}`}
            action={
              <span className="text-ink-tertiary inline-flex items-center gap-1.5 text-[12.5px]">
                <Lock className="size-3.5" /> Locked
              </span>
            }
          />
          <CardBody className="space-y-4">
            <div>
              <p className="text-ink-tertiary mb-1.5 text-[12px] tracking-wide uppercase">
                Public URL
              </p>
              <div className="bg-sunken flex items-center gap-2 rounded-[12px] p-2 pl-3.5">
                <code className="text-ink flex-1 truncate text-[13.5px]">{publicUrl}</code>
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <a href={`/${form.data.slug}`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="size-4" /> Open
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="bg-sunken rounded-[12px] px-3.5 py-3">
                <p className="text-ink-tertiary text-[12px]">Slug</p>
                <p className="text-ink mt-0.5 text-[14px] font-medium">/{form.data.slug}</p>
              </div>
              <div className="bg-sunken rounded-[12px] px-3.5 py-3">
                <p className="text-ink-tertiary text-[12px]">Distribution</p>
                <p className="text-ink mt-0.5 text-[14px] font-medium">
                  {form.data.distribution?.name ?? 'Not created'}
                </p>
              </div>
              <div className="bg-sunken rounded-[12px] px-3.5 py-3">
                <p className="text-ink-tertiary text-[12px]">Submissions</p>
                <p className="text-ink mt-0.5 text-[14px] font-medium">
                  {form.data._count?.leads ?? 0}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="text-ink-tertiary text-[13px]">
          A second form cannot be created — the database enforces this with a unique constraint, not
          just the interface.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Lead form"
        description="Create the single public form that visitors will submit."
      />

      <Card className="max-w-xl">
        <CardHeader
          title="New form"
          description="The slug becomes the public path, for example /lead-registration."
        />
        <CardBody>
          <form
            onSubmit={handleSubmit((values) => create.mutateAsync(values))}
            className="space-y-4"
            noValidate
          >
            <Field label="Form name" error={errors.name?.message}>
              <Input
                placeholder="Lead Registration"
                invalid={Boolean(errors.name)}
                {...register('name', {
                  onChange: (event) => {
                    if (!watch('slug')) setValue('slug', slugify(event.target.value));
                  },
                })}
              />
            </Field>

            <Field
              label="Public URL slug"
              hint="Lowercase letters, numbers and dashes."
              error={errors.slug?.message}
            >
              <div className="flex items-center gap-2">
                <span className="text-ink-tertiary text-[14px]">/</span>
                <Input
                  placeholder="lead-registration"
                  invalid={Boolean(errors.slug)}
                  {...register('slug')}
                />
              </div>
            </Field>

            <div className="bg-accent-soft text-accent flex items-start gap-2.5 rounded-[12px] px-3.5 py-3">
              <FileText className="mt-0.5 size-4 shrink-0" />
              <p className="text-[13px] leading-snug">
                Only one form can be created. Choose the slug carefully — it is the public address
                you will share.
              </p>
            </div>

            <Button type="submit" loading={isSubmitting || create.isPending}>
              Create form
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
