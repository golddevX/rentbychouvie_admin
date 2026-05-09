'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  QrCode,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { authApi } from '@/lib/api';
import { can, normalizeRole, type Permission } from '@/lib/admin/permissions';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './Sidebar';
import { type AdminNavGroup } from './NavItem';
import { Topbar } from './Topbar';

type SidebarState = 'expanded' | 'collapsed' | 'closed';

const STORAGE_KEY = 'admin_sidebar_state';

function CommandPalette({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: AdminNavGroup[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const items = groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      group: group.label,
    })),
  );

  const filtered = items.filter((item) =>
    `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] bg-[rgb(var(--overlay))]/55 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-[32px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/95 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[rgb(var(--surface-border))]/70 px-5 py-4">
              <Search className="h-5 w-5 text-[rgb(var(--text-muted))]" />

              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('shell.commandPlaceholder')}
                className="h-10 flex-1 bg-transparent text-sm font-medium text-[rgb(var(--text-primary))] outline-none placeholder:text-[rgb(var(--text-muted))]"
              />

              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3">
              {filtered.length ? (
                <div className="space-y-1">
                  {filtered.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        onClose();
                      }}
                      className="group flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition hover:bg-[rgb(var(--surface-3))]/70"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--accent-solid))]">
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[rgb(var(--text-primary))]">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-[rgb(var(--text-muted))]">
                          {item.group}
                        </span>
                      </span>

                      <span className="text-xs font-bold text-[rgb(var(--accent-solid))]">
                        {t('common.open')}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid place-items-center rounded-[24px] border border-dashed border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/35 px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">
                    {t('shell.commandEmpty')}
                  </p>
                  <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                    {t('shell.commandEmptyHint')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[rgb(var(--surface-border))]/70 px-5 py-3 text-xs text-[rgb(var(--text-muted))]">
              <span>{t('ui.commandHint')}</span>
              <span className="rounded-full border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-2.5 py-1 font-semibold">
                {t('shell.commandClose')}
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();

  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
  const accessToken = useAuthStore((state) => state.accessToken);
  const storedUser = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded');
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useTheme();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!authHydrated || !accessToken) return;
    let active = true;
    authApi.me()
      .then((response) => {
        if (!active) return;
        const payload = response.data?.data ?? response.data;
        setUser(payload);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken, authHydrated, setUser]);

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(STORAGE_KEY) as SidebarState | null)
        : null;

    if (saved === 'expanded' || saved === 'collapsed' || saved === 'closed') {
      setSidebarState(saved);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, sidebarState);
  }, [hydrated, sidebarState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const isCommand = key === 'k' && (event.metaKey || event.ctrlKey);

      if (isCommand) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const role = normalizeRole(storedUser?.role);
  const user = storedUser ?? null;

  const groups = useMemo<AdminNavGroup[]>(() => {
    const baseGroups: Array<{
      label: string;
      items: Array<{
        label: string;
        href: string;
        permission: Permission;
        icon: ReactNode;
      }>;
    }> = [
      {
        label: t('nav.overviewGroup'),
        items: [
          {
            label: t('nav.dashboard'),
            href: '/admin',
            permission: 'view_dashboard',
            icon: <LayoutDashboard className="h-4 w-4" />,
          },
        ],
      },
      {
        label: t('nav.businessGroup'),
        items: [
          {
            label: t('nav.leads'),
            href: '/admin/leads',
            permission: 'manage_leads',
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            label: t('nav.appointments'),
            href: '/admin/appointments',
            permission: 'manage_appointments',
            icon: <CalendarDays className="h-4 w-4" />,
          },
          {
            label: t('nav.bookings'),
            href: '/admin/bookings',
            permission: 'manage_bookings',
            icon: <FileText className="h-4 w-4" />,
          },
          {
            label: t('nav.payments'),
            href: '/admin/payments',
            permission: 'view_payments',
            icon: <CreditCard className="h-4 w-4" />,
          },
        ],
      },
      {
        label: t('nav.operationsGroup'),
        items: [
          {
            label: t('nav.pickupDesk'),
            href: '/admin/pickup',
            permission: 'process_pickup',
            icon: <Package className="h-4 w-4" />,
          },
          {
            label: t('nav.returnDesk'),
            href: '/admin/returns',
            permission: 'process_return',
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            label: t('nav.scanQr'),
            href: '/admin/scan',
            permission: 'scan_qr',
            icon: <QrCode className="h-4 w-4" />,
          },
          {
            label: t('nav.inventory'),
            href: '/admin/inventory',
            permission: 'manage_inventory',
            icon: <Package className="h-4 w-4" />,
          },
        ],
      },
      {
        label: t('nav.adminGroup'),
        items: [
          {
            label: t('nav.disputes'),
            href: '/admin/disputes',
            permission: 'manage_disputes',
            icon: <Shield className="h-4 w-4" />,
          },
          {
            label: t('nav.auditLogs'),
            href: '/admin/audit',
            permission: 'view_audit_logs',
            icon: <FileText className="h-4 w-4" />,
          },
          {
            label: t('nav.users'),
            href: '/admin/users',
            permission: 'manage_users',
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: t('nav.clientSettings'),
            href: '/admin/client-settings',
            permission: 'manage_settings',
            icon: <Settings className="h-4 w-4" />,
          },
        ],
      },
    ];

    return baseGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => can(role, item.permission)),
    }));
  }, [role, t]);

  const closed = sidebarState === 'closed';
  const baseCollapsed = sidebarState === 'collapsed';
  const visualCollapsed = baseCollapsed && !hoverExpanded;

  const signOut = () => {
    logout();
    router.push('/login');
  };

  const openSidebar = () => {
    setHoverExpanded(false);
    setSidebarState('expanded');
  };

  const closeSidebar = () => {
    setHoverExpanded(false);
    setSidebarState('closed');
  };

  const toggleCollapseSidebar = () => {
    setHoverExpanded(false);
    setSidebarState((current) => (current === 'collapsed' ? 'expanded' : 'collapsed'));
  };

  const sidebar = (
    <Sidebar
      groups={groups}
      collapsed={visualCollapsed}
      setCollapsedHover={setHoverExpanded}
      onMobileClose={() => setMobileOpen(false)}
      onCollapse={toggleCollapseSidebar}
      onClose={closeSidebar}
      onOpenCommand={() => setCommandOpen(true)}
      userName={authHydrated ? user?.fullName || 'User' : 'User'}
      userEmail={authHydrated ? user?.email || '' : ''}
      role={role}
      onLogout={signOut}
    />
  );

  return (
    <>
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        groups={groups}
      />

      <div className="admin-shell flex">
        {closed ? (
          <button
            type="button"
            onClick={openSidebar}
            className="fixed left-4 top-[76px] z-[100] grid h-12 w-12 place-items-center rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/95 text-[rgb(var(--text-primary))] shadow-[var(--shadow-panel)] backdrop-blur-xl transition hover:bg-[rgb(var(--surface-3))]"
            title={t('shell.openSidebar')}
            aria-label={t('shell.openSidebar')}
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        {!closed ? (
          <motion.div
            className="hidden min-h-screen shrink-0 lg:block"
            animate={{ width: visualCollapsed ? 75 : 365 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {sidebar}
          </motion.div>
        ) : null}

        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-[rgb(var(--overlay))]/55 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onMouseDown={() => setMobileOpen(false)}
          >
            <motion.div
              className="h-full w-[304px]"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {sidebar}
            </motion.div>
          </motion.div>
        ) : null}

        <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden">
          <Topbar
            role={role}
            onOpenMobile={() => setMobileOpen(true)}
            onOpenCommand={() => setCommandOpen(true)}
          />

          <div className="mx-auto max-w-[1520px] px-4 py-8 md:px-8 md:py-10">
            <div className="console-page min-w-0">{children}</div>
          </div>
        </main>
      </div>
    </>
  );
}
