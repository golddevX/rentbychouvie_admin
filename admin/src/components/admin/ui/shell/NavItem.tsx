'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../primitives';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm font-semibold transition duration-200',
        active ? 'bg-[rgb(var(--surface-3))]/95 text-[rgb(var(--text-primary))] shadow-sm ring-1 ring-[rgb(var(--surface-border))]/75' : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-3))]/65 hover:text-[rgb(var(--text-primary))]',
        collapsed && 'justify-center px-2',
      )}
    >
      <span className={cn('absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition', active ? 'bg-[rgb(var(--accent-solid))]' : 'bg-transparent group-hover:bg-[rgb(var(--accent-solid))]/35')} />
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[15px] border transition duration-200', active ? 'border-[rgb(var(--accent-solid))]/25 bg-[rgb(var(--accent-solid))]/12 text-[rgb(var(--accent-solid))]' : 'border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-3))]/45 text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--accent-solid))]')}>{item.icon}</span>
      <AnimatePresence initial={false}>
        {!collapsed ? <motion.span initial={{ opacity: 0, x: -8, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: -8, width: 0 }} transition={{ duration: 0.16 }} className="min-w-0 flex-1 truncate overflow-hidden">{item.label}</motion.span> : null}
      </AnimatePresence>
      {!collapsed && active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-solid))] shadow-[0_0_0_5px_rgb(var(--accent-solid))/0.10]" /> : null}
    </Link>
  );
}
