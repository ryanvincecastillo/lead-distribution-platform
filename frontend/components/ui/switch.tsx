'use client';

import { cn } from '@/lib/cn';

/** iOS-style toggle: a track that fills and a knob that springs across. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-out disabled:opacity-50',
        checked ? 'bg-success' : 'bg-neutral-soft',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 size-[27px] rounded-full bg-white shadow-md',
          'transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
          checked ? 'translate-x-[20px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}
