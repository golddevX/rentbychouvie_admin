'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/components/admin/primitives';

type SidebarState = 'expanded' | 'collapsed' | 'closed';

function NavIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-[15px] border transition',
        active
          ? 'border-[rgb(var(--accent-solid))]/25 bg-[rgb(var(--accent-solid))]/12 text-[rgb(var(--accent-solid))]'
          : 'border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-3))]/45 text-[rgb(var(--text-secondary))] group-hover:border-[rgb(var(--accent-solid))]/20 group-hover:bg-[rgb(var(--accent-solid))]/8 group-hover:text-[rgb(var(--accent-solid))]',
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  );
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const [state, setState] = useState<SidebarState>('expanded');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem('sidebar_state') as SidebarState | null;
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'closed') {
      setState(saved);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem('sidebar_state', state);
  }, [mounted, state]);

  const collapsed = state === 'collapsed';
  const closed = state === 'closed';

  const menuGroups = useMemo(
    () => [
      {
        label: t('nav.operations'),
        items: [
          { label: t('nav.dashboard'), href: '/dashboard' },
          { label: t('nav.leads'), href: '/dashboard/leads' },
          { label: t('nav.bookings'), href: '/dashboard/bookings' },
          { label: t('nav.inventory'), href: '/dashboard/inventory' },
        ],
      },
      {
        label: t('nav.finance'),
        items: [
          { label: t('nav.payments'), href: '/dashboard/payments' },
          { label: t('nav.reports'), href: '/dashboard/reports' },
        ],
      },
    ],
    [t],
  );

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {closed ? (
        <button
          type="button"
          onClick={() => setState('expanded')}
          className="fixed left-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/90 text-[rgb(var(--text-primary))] shadow-[var(--shadow-panel)] backdrop-blur-xl transition hover:bg-[rgb(var(--surface-3))]"
          aria-label={t('shell.openSidebar')}
          title={t('shell.openSidebar')}
        >
          ☰
        </button>
      ) : null}

      <aside
        className={cn(
          'relative flex h-screen shrink-0 flex-col overflow-hidden border-r border-[rgb(var(--surface-border))]/70',
          'bg-[linear-gradient(180deg,rgb(var(--surface-2))/96,rgb(var(--surface))/90)] shadow-[var(--shadow-panel)] backdrop-blur-2xl',
          'transition-[width,opacity,transform] duration-300 ease-out',
          state === 'expanded' && 'w-[304px] opacity-100',
          state === 'collapsed' && 'w-[88px] opacity-100',
          state === 'closed' && 'w-0 -translate-x-4 border-r-0 opacity-0',
        )}
      >
        <div className="relative flex h-[84px] items-center gap-3 border-b border-[rgb(var(--surface-border))]/60 px-4">
          <div className="theme-accent-gradient grid h-12 w-12 shrink-0 place-items-center rounded-[20px] text-sm font-black tracking-[-0.08em] text-[rgb(var(--button-primary-text))]">
            RF
          </div>

          <div
            className={cn(
              'min-w-0 transition-all duration-200',
              collapsed && 'pointer-events-none w-0 translate-x-2 opacity-0',
            )}
          >
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.04em] text-[rgb(var(--text-primary))]">
              {t('shell.legacyBrand')}
            </h1>
            <p className="truncate text-xs font-medium text-[rgb(var(--text-muted))]">
              {t('nav.admin')}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setState(collapsed ? 'expanded' : 'collapsed')}
              className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))]"
              aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              title={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            >
              {collapsed ? '›' : '‹'}
            </button>

            {!collapsed ? (
              <button
                type="button"
                onClick={() => setState('closed')}
                className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--danger))]/10 hover:text-[rgb(var(--danger))]"
                aria-label={t('shell.closeSidebar')}
                title={t('common.close')}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-6">
            {menuGroups.map((group) => (
              <div key={group.label}>
                <p
                  className={cn(
                    'mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]',
                    collapsed && 'px-0 text-center text-[9px]',
                  )}
                >
                  {collapsed ? '•••' : group.label}
                </p>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                          active
                            ? 'bg-[rgb(var(--surface-3))]/92 text-[rgb(var(--text-primary))] shadow-sm ring-1 ring-[rgb(var(--surface-border))]/70'
                            : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-3))]/62 hover:text-[rgb(var(--text-primary))]',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition',
                            active
                              ? 'bg-[rgb(var(--accent-solid))]'
                              : 'bg-transparent group-hover:bg-[rgb(var(--accent-solid))]/35',
                          )}
                        />

                        <NavIcon active={active} />

                        <span
                          className={cn(
                            'min-w-0 truncate transition-all duration-200',
                            collapsed && 'pointer-events-none w-0 opacity-0',
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-[rgb(var(--surface-border))]/60 p-3">
          <div
            className={cn(
              'rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 p-3 shadow-sm',
              collapsed && 'rounded-[22px] px-2',
            )}
          >
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[rgb(var(--accent-solid))] text-sm font-bold text-[rgb(var(--button-primary-text))]">
                {user?.fullName?.slice(0, 2).toUpperCase() || 'US'}
              </div>

              <div
                className={cn(
                  'min-w-0 transition-all duration-200',
                  collapsed && 'pointer-events-none w-0 opacity-0',
                )}
              >
                <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {user?.fullName || 'User'}
                </p>
                <p className="truncate text-xs text-[rgb(var(--text-muted))]">
                  {user?.role || 'admin'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? t('common.logout') : undefined}
              className={cn(
                'mt-3 w-full rounded-[16px] border border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 py-2 text-sm font-semibold text-[rgb(var(--danger))] transition hover:bg-[rgb(var(--danger))]/18',
                collapsed && 'px-0 text-xs',
              )}
            >
              {collapsed ? '↪' : t('common.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
