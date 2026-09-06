'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number')
    .regex(/^[+()\d][\d\s()+-]*$/, 'Enter a valid phone number'),
});

type FormValues = z.infer<typeof schema>;

export function PublicLeadForm({ slug }: { slug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post(`/public/forms/${slug}/leads`, values);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError && error.issues.length > 0) {
        for (const issue of error.issues) {
          setError(issue.field as keyof FormValues, { message: issue.message });
        }
        return;
      }
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="flex flex-col items-center py-8 text-center"
        >
          <div className="bg-success-soft mb-4 grid size-14 place-items-center rounded-full">
            <CheckCircle2 className="text-success size-7" />
          </div>
          <h2 className="text-ink text-[19px] font-semibold tracking-[-0.015em]">Thank you</h2>
          <p className="text-ink-secondary mt-1.5 max-w-xs text-[14px] leading-relaxed">
            Your details have been received. One of our brokers will be in touch shortly.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={onSubmit}
          className="space-y-4"
          noValidate
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Field label="Full name" error={errors.name?.message}>
            <Input
              placeholder="Jane Dela Cruz"
              autoComplete="name"
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>

          <Field label="Email address" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="jane@example.com"
              autoComplete="email"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>

          <Field label="Phone number" error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="+63 917 000 0000"
              autoComplete="tel"
              invalid={Boolean(errors.phone)}
              {...register('phone')}
            />
          </Field>

          {formError ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger rounded-[12px] px-3.5 py-2.5 text-[13px]"
            >
              {formError}
            </div>
          ) : null}

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            Submit
          </Button>

          <p className="text-ink-tertiary text-center text-[12px] leading-relaxed">
            By submitting you agree to be contacted about your enquiry.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
