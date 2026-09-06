'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Share2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/login', values);
      // A full navigation, not a client push: the session cookie has to be visible to
      // middleware on the next request.
      window.location.assign(searchParams.get('next') ?? '/dashboard');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="admin@example.com"
          invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(errors.password)}
          {...register('password')}
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
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-canvas grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-accent shadow-card mb-4 grid size-14 place-items-center rounded-[16px]">
            <Share2 className="size-7 text-white" />
          </div>
          <h1 className="text-display text-ink text-[26px] font-semibold">Welcome back</h1>
          <p className="text-ink-secondary mt-1.5 text-[14px]">
            Sign in to manage brokers, forms and lead routing.
          </p>
        </div>

        <div className="bg-surface border-hairline shadow-card rounded-[20px] border p-6">
          <Suspense fallback={<div className="h-[280px]" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-ink-tertiary mt-6 text-center text-[12px]">
          Admin access only. The public lead form does not require an account.
        </p>
      </div>
    </div>
  );
}
