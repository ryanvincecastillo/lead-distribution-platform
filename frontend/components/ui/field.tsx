'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full h-11 px-3.5 rounded-[12px] bg-surface border text-[14px] text-ink placeholder:text-ink-tertiary ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:opacity-50';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="text-ink mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {error ? (
        <span className="text-danger mt-1.5 block text-[12px]">{error}</span>
      ) : hint ? (
        <span className="text-ink-tertiary mt-1.5 block text-[12px]">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, invalid ? 'border-danger' : 'border-hairline-strong', className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        control,
        'appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%238e8e93'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5'  stroke='%238e8e93' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
        invalid ? 'border-danger' : 'border-hairline-strong',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
