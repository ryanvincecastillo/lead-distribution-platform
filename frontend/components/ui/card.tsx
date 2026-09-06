import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-surface border-hairline shadow-card rounded-[18px] border overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('hairline-b flex items-start justify-between gap-4 px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-ink text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description ? (
          <p className="text-ink-secondary mt-0.5 text-[13px] leading-snug">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
