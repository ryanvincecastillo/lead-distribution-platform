import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-neutral-soft animate-pulse rounded-[8px]', className)} />;
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-hairline divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-4', columnIndex === 0 ? 'w-40' : 'w-24', 'shrink-0')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="bg-sunken text-ink-tertiary mb-4 grid size-12 place-items-center rounded-[16px]">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-[15px] font-medium">{title}</p>
      {description ? (
        <p className="text-ink-secondary mt-1 max-w-sm text-[13px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-ink text-[15px] font-medium">Could not load this</p>
      <p className="text-ink-secondary mt-1 max-w-sm text-[13px]">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="text-accent mt-4 text-[13px] font-medium hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
