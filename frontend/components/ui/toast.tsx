'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};

const icons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const iconTone: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, title, description }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      info: (title, description) => push('info', title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = icons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={cn(
                  'glass pointer-events-auto flex w-full max-w-sm items-start gap-3',
                  'border-hairline shadow-float rounded-[16px] border p-3.5',
                )}
              >
                <Icon className={cn('mt-0.5 size-[18px] shrink-0', iconTone[toast.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-[14px] font-medium">{toast.title}</p>
                  {toast.description ? (
                    <p className="text-ink-secondary mt-0.5 text-[13px] leading-snug">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-ink-tertiary hover:text-ink -m-1 rounded-full p-1 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
