'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Share2,
  Users,
  Inbox,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/types';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './theme-toggle';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brokers', label: 'Brokers', icon: Users },
  { href: '/form', label: 'Lead form', icon: FileText },
  { href: '/distribution', label: 'Distribution', icon: Share2 },
  { href: '/leads', label: 'Leads', icon: Inbox },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<AdminUser>('/auth/me'),
    retry: false,
  });

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="bg-accent grid size-8 place-items-center rounded-[9px]">
          <Share2 className="size-[17px] text-white" />
        </div>
        <span className="text-ink text-[15px] font-semibold tracking-[-0.015em]">Distribution</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors duration-150',
                active
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-ink-secondary hover:bg-neutral-soft hover:text-ink',
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hairline-t space-y-3 p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-ink-tertiary text-[12px]">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="bg-sunken flex items-center gap-2.5 rounded-[12px] p-2.5">
          {user ? (
            <div className="bg-accent grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white">
              {(user.name ?? user.email)[0]?.toUpperCase()}
            </div>
          ) : (
            <div className="bg-neutral-soft size-8 shrink-0 animate-pulse rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="text-ink truncate text-[13px] font-medium">{user.name ?? 'Admin'}</p>
                <p className="text-ink-tertiary truncate text-[12px]">{user.email}</p>
              </>
            ) : (
              <>
                <div className="bg-neutral-soft h-3 w-24 animate-pulse rounded" />
                <div className="bg-neutral-soft mt-1.5 h-2.5 w-32 animate-pulse rounded" />
              </>
            )}
          </div>
          <button
            onClick={() => logout.mutate()}
            aria-label="Sign out"
            className="text-ink-tertiary hover:bg-neutral-soft hover:text-danger rounded-[8px] p-1.5 transition-colors"
          >
            <LogOut className="size-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-canvas min-h-dvh">
      <aside className="bg-surface border-hairline fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/35" onClick={() => setMobileOpen(false)} />
          <aside className="bg-surface absolute inset-y-0 left-0 w-[264px] shadow-float">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="glass hairline-b sticky top-0 z-20 flex h-14 items-center gap-3 px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
            className="text-ink-secondary hover:bg-neutral-soft rounded-[9px] p-2 transition-colors"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="text-ink text-[15px] font-semibold">Distribution</span>
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-display text-ink text-[26px] font-semibold sm:text-[30px]">{title}</h1>
        {description ? (
          <p className="text-ink-secondary mt-1.5 text-[14px]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
