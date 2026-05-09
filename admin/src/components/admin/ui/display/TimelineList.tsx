'use client';

import Link from 'next/link';
import type { Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '../../primitives';
import { StatusBadge } from './StatusBadge';

export function ActionQueue({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    detail: string;
    status: string;
    tone?: Tone;
    href?: string;
    onClick?: () => void;
    action?: string;
  }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const content = (
          <div className="group flex items-center justify-between gap-3 rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 px-3.5 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-solid))]/35 hover:bg-[rgb(var(--surface-3))]/90 hover:shadow-sm">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
              <p className="mt-1 truncate text-xs leading-5 text-[rgb(var(--text-muted))]">{item.detail}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge value={item.status} tone={item.tone} />
              {item.action ? <span className="text-xs font-bold text-[rgb(var(--accent-solid))]">{item.action}</span> : null}
            </div>
          </div>
        );

        if (item.href) {
          return <Link key={item.id} href={item.href} className="block">{content}</Link>;
        }

        if (item.onClick) {
          return <button key={item.id} type="button" onClick={item.onClick} className="block w-full text-left">{content}</button>;
        }

        return <div key={item.id}>{content}</div>;
      })}
    </div>
  );
}

export function TimelineList({
  items,
}: {
  items: Array<{ time: string; title: string; detail: string; tone?: Tone }>;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="flex gap-3">
          <div className="w-16 shrink-0 pt-0.5 text-xs font-semibold text-[rgb(var(--text-muted))]">{item.time}</div>
          <div className="relative flex-1 border-l border-[rgb(var(--surface-border))] pb-5 pl-4 last:pb-1">
            <span className={cn('absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-[rgb(var(--surface-2))] bg-[rgb(var(--accent-solid))]')} />
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ items }: { items: string[] }) {
  const { t } = useI18n();

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/85 text-xs font-semibold text-[rgb(var(--text-primary))] shadow-sm">{index + 1}</span>
          <div>
            <p className="font-medium text-[rgb(var(--text-primary))]">{item}</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">{t('ui.activityLogged')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
