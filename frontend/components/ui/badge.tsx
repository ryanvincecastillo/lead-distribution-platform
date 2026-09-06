import { cn } from '@/lib/cn';
import type { LeadStatus } from '@/lib/types';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-ink-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<LeadStatus, Tone> = {
  sent: 'success',
  unsent: 'warning',
  duplicate: 'accent',
  failed: 'danger',
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge tone={statusTone[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </Badge>
  );
}
