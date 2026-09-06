'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Presents as a centred sheet on desktop and a bottom sheet on phones, mirroring how iOS
 * modals behave. Escape closes, background scroll is locked while open.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="bg-surface shadow-float relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-[26px] sm:rounded-[22px]"
          >
            <div className="hairline-b flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-ink text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>
                {description ? (
                  <p className="text-ink-secondary mt-0.5 text-[13px]">{description}</p>
                ) : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-ink-tertiary hover:bg-neutral-soft hover:text-ink -m-1.5 rounded-full p-1.5 transition-colors"
              >
                <X className="size-[18px]" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="hairline-t px-5 py-3.5">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
