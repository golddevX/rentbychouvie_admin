'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, Search, X } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '../../primitives';
import { RoleBadge } from '../display/StatusBadge';
import { ShellMark } from './ShellMark';
import { type AdminNavGroup, NavItem } from './NavItem';

export function Sidebar({
  groups,
  collapsed,
  setCollapsedHover,
  onMobileClose,
  onCollapse,
  onClose,
  onOpenCommand,
  userName,
  userEmail,
  role,
  onLogout,
}: {
  groups: AdminNavGroup[];
  collapsed: boolean;
  setCollapsedHover: (value: boolean) => void;
  onMobileClose?: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onOpenCommand: () => void;
  userName: string;
  userEmail: string;
  role: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside
      onMouseEnter={() => collapsed && setCollapsedHover(true)}
      onMouseLeave={() => collapsed && setCollapsedHover(false)}
      className="relative flex h-full flex-col overflow-hidden border-r border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/95 shadow-[0_22px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--surface-border))] to-transparent" />
      <div className="relative flex h-[92px] shrink-0 items-center gap-3 border-b border-[rgb(var(--surface-border))]/60 px-4">
        <ShellMark collapsed={collapsed} />
        <div className="ml-auto flex shrink-0 gap-1.5">
          <button type="button" onClick={onOpenCommand} className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))]" title={t('shell.commandPalette')}><Search className="h-4 w-4" /></button>
          <button type="button" onClick={onCollapse} className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))]" title={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
          {!collapsed ? <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[14px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--danger))]/10 hover:text-[rgb(var(--danger))]" title={t('shell.closeSidebar')}><X className="h-4 w-4" /></button> : null}
        </div>
      </div>

      {!collapsed ? (
        <div className="shrink-0 px-4 py-4">
          <button type="button" onClick={onOpenCommand} className="flex w-full items-center gap-3 rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/45 px-3 py-3 text-left text-sm text-[rgb(var(--text-secondary))] transition hover:bg-[rgb(var(--surface-3))]/75 hover:text-[rgb(var(--text-primary))]">
            <Search className="h-4 w-4" />
            <span className="flex-1">{t('shell.searchJump')}</span>
            <span className="rounded-full border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/80 px-2 py-0.5 text-[10px] font-bold text-[rgb(var(--text-muted))]">Ctrl K</span>
          </button>
        </div>
      ) : null}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className={group.items.length ? '' : 'hidden'}>
            <p className={cn('mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]', collapsed && 'px-0 text-center text-[9px]')}>
              {collapsed ? '...' : group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return <NavItem key={item.href} item={item} active={active} collapsed={collapsed} onClick={onMobileClose} />;
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[rgb(var(--surface-border))]/60 p-3">
        <div className={cn('rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70 p-3 shadow-sm', collapsed && 'rounded-[22px] px-2')}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[rgb(var(--accent-solid))] text-sm font-bold text-[rgb(var(--button-primary-text))] shadow-sm">{userName.slice(0, 2).toUpperCase()}</div>
            <AnimatePresence initial={false}>
              {!collapsed ? <motion.div initial={{ opacity: 0, x: -8, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: -8, width: 0 }} transition={{ duration: 0.16 }} className="min-w-0 overflow-hidden"><p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{userName}</p><p className="truncate text-xs text-[rgb(var(--text-muted))]">{userEmail}</p></motion.div> : null}
            </AnimatePresence>
          </div>
          <div className={cn('mt-3 flex items-center justify-between gap-3', collapsed && 'justify-center')}>
            {!collapsed ? <RoleBadge role={role} /> : null}
            <button type="button" onClick={onLogout} title={t('common.signOut')} className={cn('inline-flex items-center justify-center gap-2 rounded-[15px] text-xs font-semibold text-[rgb(var(--text-muted))] transition hover:text-[rgb(var(--danger))]', collapsed ? 'h-9 w-9 border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]' : 'px-2 py-1')}>
              <LogOut className="h-4 w-4" />
              {!collapsed ? <span>{t('common.signOut')}</span> : null}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
