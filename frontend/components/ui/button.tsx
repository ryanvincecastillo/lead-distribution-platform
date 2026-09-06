'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-soft hover:bg-accent-hover active:brightness-95 disabled:bg-accent/50',
  secondary:
    'bg-surface text-ink border border-hairline shadow-soft hover:bg-sunken active:brightness-95',
  ghost: 'text-ink-secondary hover:bg-neutral-soft hover:text-ink',
  danger: 'bg-danger text-white shadow-soft hover:brightness-110 active:brightness-95',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-[10px] gap-1.5',
  md: 'h-10 px-4 text-[14px] rounded-[12px] gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-[14px] gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        // The subtle press-scale is what makes a control feel native rather than webby.
        'transition-[background-color,transform,filter,opacity] duration-150 ease-out',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
