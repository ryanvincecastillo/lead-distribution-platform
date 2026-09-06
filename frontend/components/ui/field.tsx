'use client';

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full h-11 px-3.5 rounded-[12px] bg-surface border text-[14px] text-ink placeholder:text-ink-tertiary ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:opacity-50';

interface FieldContextValue {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Hint and error text are linked with aria-describedby rather than nested inside the
 * <label>. Nesting them makes the *accessible name* of the control the label plus the
 * entire hint sentence, which screen readers then announce in full on every focus.
 */
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
  const id = useId();
  const controlId = `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('block', className)}>
      <label htmlFor={controlId} className="text-ink mb-1.5 block text-[13px] font-medium">
        {label}
      </label>

      <FieldContext.Provider value={{ controlId, describedBy, invalid: Boolean(error) }}>
        {children}
      </FieldContext.Provider>

      {error ? (
        <span id={errorId} role="alert" className="text-danger mt-1.5 block text-[12px]">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-ink-tertiary mt-1.5 block text-[12px]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Lets a control inherit the id/aria wiring when it sits inside a Field. */
const useFieldWiring = (invalidProp?: boolean) => {
  const context = useContext(FieldContext);
  return {
    id: context?.controlId,
    'aria-describedby': context?.describedBy,
    invalid: invalidProp ?? context?.invalid ?? false,
  };
};

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, id, ...props }, ref) {
  const wiring = useFieldWiring(invalid);

  return (
    <input
      ref={ref}
      id={id ?? wiring.id}
      aria-describedby={wiring['aria-describedby']}
      aria-invalid={wiring.invalid || undefined}
      className={cn(control, wiring.invalid ? 'border-danger' : 'border-hairline-strong', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, id, children, ...props }, ref) {
  const wiring = useFieldWiring(invalid);

  return (
    <select
      ref={ref}
      id={id ?? wiring.id}
      aria-describedby={wiring['aria-describedby']}
      aria-invalid={wiring.invalid || undefined}
      className={cn(
        control,
        'appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5' stroke='%238e8e93' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
        wiring.invalid ? 'border-danger' : 'border-hairline-strong',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
