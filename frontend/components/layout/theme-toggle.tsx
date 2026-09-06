'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';

type Theme = 'light' | 'dark' | 'system';

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

/** Segmented control, the same shape iOS uses for this exact choice. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('ldp-theme');
    setTheme(stored === 'light' || stored === 'dark' ? stored : 'system');
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    if (next === 'system') {
      localStorage.removeItem('ldp-theme');
      document.documentElement.removeAttribute('data-theme');
    } else {
      localStorage.setItem('ldp-theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  return (
    <div className="bg-sunken inline-flex rounded-[10px] p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => apply(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={cn(
            'grid size-7 place-items-center rounded-[8px] transition-all duration-150',
            theme === value
              ? 'bg-surface text-ink shadow-soft'
              : 'text-ink-tertiary hover:text-ink-secondary',
          )}
        >
          <Icon className="size-[15px]" />
        </button>
      ))}
    </div>
  );
}
