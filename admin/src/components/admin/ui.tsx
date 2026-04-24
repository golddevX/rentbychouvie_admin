'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth.store';
import { can, normalizeRole, permissionsFor, roleLabels, type Permission, type Role } from '@/lib/admin/permissions';
import { statusTone, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { AdminBadge, AdminButton, AdminCard, cn } from './primitives';

export function StatusBadge({ value, tone }: { value: string; tone?: Tone }) {
  const { t } = useI18n();
  const resolved = tone ?? statusTone(value);

  const localized = (() => {
    const candidates = [
      `booking.status.${value}`,
      `inventory.status.${value}`,
      `payment.status.${value}`,
      `maintenance.status.${value}`,
      `appointment.status.${value}`,
      `lead.status.${value}`,
      `user.status.${value}`,
      `role.${value}`,
    ];
    for (const key of candidates) {
      const text = t(key);
      if (text !== key) return text;
    }
    return value.replace(/_/g, ' ');
  })();

  return <AdminBadge tone={resolved}>{localized}</AdminBadge>;
}

export function RoleBadge({ role }: { role: Role | string }) {
  const normalized = normalizeRole(role);
  return <StatusBadge value={roleLabels[normalized]} tone={normalized === 'super_admin' ? 'accent' : 'neutral'} />;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  nextStep,
  meta,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
  nextStep?: string;
  meta?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section
      className={cn(
        'relative mb-8 overflow-hidden rounded-[32px] border px-5 py-6 md:px-7 md:py-7',
        'border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/80 shadow-[var(--shadow-panel)] backdrop-blur-xl',
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[rgb(var(--accent-solid))]/10 blur-3xl" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[rgb(var(--accent-solid))]/40 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {eyebrow && (
              <p className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
                {eyebrow}
              </p>
            )}
            {meta}
          </div>

          <h1 className="max-w-5xl text-3xl font-semibold tracking-[-0.045em] text-[rgb(var(--text-primary))] md:text-[44px] md:leading-[1.04]">
            {title}
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))] md:text-[15px]">
            {subtitle}
          </p>

          {nextStep && (
            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 px-3.5 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-solid))]" />
              <span className="text-[rgb(var(--text-muted))]">{t('ui.nextPrefix')}:</span>
              <span className="truncate text-[rgb(var(--text-primary))]">{nextStep}</span>
            </div>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
}

export function GuidanceCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/75 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard
      className={cn(
        'rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 shadow-[var(--shadow-panel)] backdrop-blur-xl',
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold tracking-[-0.025em] text-[rgb(var(--text-primary))]">{title}</h2>}
            {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </AdminCard>
  );
}

export function SummaryRow({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; detail?: string; tone?: Tone }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'group relative overflow-hidden rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl transition duration-200',
            'hover:-translate-y-0.5 hover:border-[rgb(var(--accent-solid))]/30 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
            item.tone && `summary-tile-${item.tone}`,
          )}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent-solid))]/35 to-transparent opacity-0 transition group-hover:opacity-100" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-3 text-2xl font-semibold leading-none tracking-[-0.045em] text-[rgb(var(--text-primary))]">{item.value}</div>
          {item.detail && <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p>}
        </div>
      ))}
    </div>
  );
}

export function ControlSurface({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/75 p-3 shadow-sm backdrop-blur-xl">
      {label && <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{label}</p>}
      <div className="grid gap-2.5 md:grid-cols-4 xl:grid-cols-6">{children}</div>
    </div>
  );
}

export function DecisionWorkspace({
  hero,
  status,
  actions,
  timeline,
  related,
  children,
}: {
  hero: ReactNode;
  status: ReactNode;
  actions: ReactNode;
  timeline?: ReactNode;
  related?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <div className="rounded-[30px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">
          {hero}
        </div>
        {children}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('ui.currentStatus')}</p>
          {status}
        </section>

        <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('ui.actionPanel')}</p>
          {actions}
        </section>

        {timeline && (
          <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('crud.timeline')}</p>
            {timeline}
          </section>
        )}

        {related && (
          <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('crud.relatedData')}</p>
            {related}
          </section>
        )}
      </aside>
    </div>
  );
}

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
              {item.action && <span className="text-xs font-bold text-[rgb(var(--accent-solid))]">{item.action}</span>}
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} href={item.href} className="block">
            {content}
          </Link>
        ) : item.onClick ? (
          <button key={item.id} type="button" onClick={item.onClick} className="block w-full text-left">
            {content}
          </button>
        ) : (
          <div key={item.id}>{content}</div>
        );
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
            <span className={cn('absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-[rgb(var(--surface-2))] bg-[rgb(var(--accent-solid))]', item.tone && `timeline-dot-${item.tone}`)} />
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/80 p-3 shadow-sm">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="loading-block mb-2 h-12 rounded-[18px] last:mb-0" />
      ))}
    </div>
  );
}

export function WorkspaceLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  if (!rail) return <div className="grid gap-6">{children}</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">{rail}</aside>
    </div>
  );
}

export function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function KeyValueList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function InlineAlert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[22px] border px-4 py-3 text-sm leading-6 shadow-sm',
        `inline-alert-${tone}`,
      )}
    >
      {children}
    </div>
  );
}

export function FeedbackPopup({
  error,
  feedback,
  onClose,
  autoHideMs = 4200,
}: {
  error?: string | null;
  feedback?: { tone: Tone; message: string } | null;
  onClose: () => void;
  autoHideMs?: number;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const notice = feedback ?? (error ? { tone: 'danger' as Tone, message: error } : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => onClose(), autoHideMs);
    return () => window.clearTimeout(timeout);
  }, [autoHideMs, notice, onClose]);

  if (!mounted || !notice) return null;

  const tones: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/90 bg-[rgb(var(--surface-2))]/96 text-[rgb(var(--text-primary))]',
    info: 'border-[rgb(var(--info))]/25 bg-[rgb(var(--info))]/10 text-[rgb(var(--text-primary))]',
    success: 'border-[rgb(var(--success))]/25 bg-[rgb(var(--success))]/10 text-[rgb(var(--text-primary))]',
    warning: 'border-[rgb(var(--warning))]/28 bg-[rgb(var(--warning))]/11 text-[rgb(var(--text-primary))]',
    danger: 'border-[rgb(var(--danger))]/28 bg-[rgb(var(--danger))]/10 text-[rgb(var(--text-primary))]',
    accent: 'border-[rgb(var(--accent-solid))]/25 bg-[rgb(var(--accent-solid))]/10 text-[rgb(var(--text-primary))]',
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[140] flex justify-end sm:inset-x-auto sm:right-5">
      <div
        className={cn(
          'pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[24px] border shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl',
          tones[notice.tone],
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 p-4">
          <span
            className={cn(
              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
              notice.tone === 'danger' && 'bg-[rgb(var(--danger))]',
              notice.tone === 'warning' && 'bg-[rgb(var(--warning))]',
              notice.tone === 'success' && 'bg-[rgb(var(--success))]',
              notice.tone === 'info' && 'bg-[rgb(var(--info))]',
              notice.tone === 'accent' && 'bg-[rgb(var(--accent-solid))]',
              notice.tone === 'neutral' && 'bg-[rgb(var(--text-muted))]',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
              {t('notification.title')}
            </p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-primary))]">{notice.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]"
            aria-label={t('common.close')}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  const { t } = useI18n();
  const tones: Record<Tone, string> = {
    neutral: 'from-[rgb(var(--text-secondary))]/10',
    info: 'from-[rgb(var(--info))]/12',
    success: 'from-[rgb(var(--success))]/12',
    warning: 'from-[rgb(var(--warning))]/13',
    danger: 'from-[rgb(var(--danger))]/12',
    accent: 'from-[rgb(var(--accent-solid))]/14',
  };

  return (
    <div className={cn('relative overflow-hidden rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-gradient-to-br to-[rgb(var(--surface-2))] p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]', tones[tone])}>
      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-[rgb(var(--text-primary))]">{value}</p>
        <span className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--text-secondary))]">
          {t('common.live')}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{detail}</p>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/80 p-3 shadow-sm backdrop-blur-xl">
      <div className="grid gap-2.5 md:grid-cols-4 lg:grid-cols-6">{children}</div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
  loading,
  batchActions,
  rowKeys,
  selectedRowKey,
  onRowClick,
  rowClassName,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: string;
  loading?: boolean;
  batchActions?: ReactNode;
  rowKeys?: string[];
  selectedRowKey?: string;
  onRowClick?: (rowIndex: number) => void;
  rowClassName?: (rowIndex: number) => string;
}) {
  const { t } = useI18n();
  const emptyText = empty || t('ui.noRecordsMatch');

  if (loading) return <TableSkeleton />;

  return (
    <div className="overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/90 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      {batchActions && (
        <div className="border-b border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/60 px-4 py-3">
          {batchActions}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-[rgb(var(--surface-3))]/95 backdrop-blur-xl">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={cn(
                    'whitespace-nowrap border-b border-[rgb(var(--surface-border))]/80 px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]',
                    index === 0 && 'pl-6',
                    index === columns.length - 1 && 'pr-6 text-right',
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-5 py-16 text-center" colSpan={columns.length}>
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[26px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/55 px-6 py-10">
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-[20px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-solid))]" />
                    </div>
                    <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{emptyText}</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                      {t('ui.noRecordsMatch')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = rowKeys?.[index] ?? String(index);
                const selected = selectedRowKey && rowKeys?.[index] === selectedRowKey;
                const clickable = Boolean(onRowClick);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(index)}
                    className={cn(
                      'group transition duration-150',
                      clickable && 'cursor-pointer',
                      clickable && !selected && 'hover:bg-[rgb(var(--surface-3))]/55',
                      selected && 'bg-[rgb(var(--surface-3))]/85 shadow-[inset_3px_0_0_rgb(var(--accent-solid))]',
                      rowClassName?.(index),
                    )}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn(
                          'border-b border-[rgb(var(--surface-border))]/60 px-5 py-4 align-middle text-[13px] leading-5 text-[rgb(var(--text-secondary))]',
                          'transition duration-150 group-hover:text-[rgb(var(--text-primary))]',
                          cellIndex === 0 && 'pl-6 font-semibold text-[rgb(var(--text-primary))]',
                          cellIndex === row.length - 1 && 'pr-6',
                        )}
                      >
                        <div
                          className={cn(
                            'flex min-h-9 items-center',
                            cellIndex === row.length - 1 && 'justify-end',
                          )}
                        >
                          {cell}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/65 p-8 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-[22px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 shadow-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--accent-solid))]" />
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[rgb(var(--text-primary))]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/80 p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="loading-block h-16 rounded-[20px]" />
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
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/85 text-xs font-semibold text-[rgb(var(--text-primary))] shadow-sm">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-[rgb(var(--text-primary))]">{item}</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">{t('ui.activityLogged')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PaymentSummaryCard({
  rentalFee,
  deposit,
  paid,
  refundableDeposit,
}: {
  rentalFee: number;
  deposit: number;
  paid: number;
  refundableDeposit: number;
}) {
  const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const due = Math.max(rentalFee + deposit - paid, 0);
  const { t } = useI18n();

  return (
    <SectionCard title={t('ui.paymentSummary')} description={t('ui.outstandingBalanceAndDeposit')}>
      <div className="grid gap-3 text-sm">
        {[
          [t('ui.rentalFee'), fmt.format(rentalFee)],
          [t('ui.depositHeld'), fmt.format(deposit)],
          [t('ui.paidToDate'), fmt.format(paid)],
          [t('ui.outstandingBalance'), fmt.format(due)],
          [t('ui.refundableDeposit'), fmt.format(refundableDeposit)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <span className="text-[rgb(var(--text-secondary))]">{label}</span>
            <span className="font-semibold text-[rgb(var(--text-primary))]">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ReceiptPreviewCard({
  receiptId,
  customer,
  amount,
  onPrint,
  printing = false,
}: {
  receiptId: string;
  customer: string;
  amount: string;
  onPrint?: () => void;
  printing?: boolean;
}) {
  const { t } = useI18n();

  return (
    <AdminCard padding="md" className="rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('ui.receipt')}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">{receiptId}</h3>
        </div>
        <StatusBadge value={t('receipt.printReady')} tone="success" />
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5">
          <span className="text-[rgb(var(--text-secondary))]">{t('ui.customer')}</span>
          <b className="text-[rgb(var(--text-primary))]">{customer}</b>
        </div>
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5">
          <span className="text-[rgb(var(--text-secondary))]">{t('ui.receiptType')}</span>
          <b className="text-[rgb(var(--text-primary))]">{t('ui.returnReceipt')}</b>
        </div>
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5">
          <span className="text-[rgb(var(--text-secondary))]">{t('ui.total')}</span>
          <b className="text-[rgb(var(--text-primary))]">{amount}</b>
        </div>
      </div>

      <AdminButton className="mt-6 w-full" onClick={onPrint} loading={printing} disabled={!onPrint}>
        {t('ui.printBill')}
      </AdminButton>
    </AdminCard>
  );
}

export function QrPreviewCard({
  code,
  imageDataUrl,
  onRegenerate,
  onPrint,
  actionLoading = false,
  actionDisabled = false,
}: {
  code: string;
  imageDataUrl?: string;
  onRegenerate?: () => void;
  onPrint?: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}) {
  const { t } = useI18n();
  const showActions = !!onRegenerate || !!onPrint;

  return (
    <div className="flex flex-col items-center rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-5 text-center shadow-sm backdrop-blur-xl">
      <div className="grid h-36 w-36 place-items-center rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 shadow-inner">
        {imageDataUrl ? (
          <img src={imageDataUrl} alt={t('inventory.qrCode')} className="h-32 w-32 object-contain" />
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-4 w-4 rounded-sm',
                  index % 3 === 0 || index % 7 === 0 ? 'bg-[rgb(var(--text-primary))]' : 'bg-[rgb(var(--surface-border))]',
                )}
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-3 py-1 font-mono text-xs font-semibold text-[rgb(var(--text-primary))]">
        {code}
      </p>

      {showActions && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {onRegenerate && (
            <AdminButton variant="secondary" onClick={onRegenerate} disabled={actionDisabled || actionLoading}>
              {actionLoading ? t('common.loading') : t('ui.regenerate')}
            </AdminButton>
          )}
          {onPrint && (
            <AdminButton onClick={onPrint} disabled={actionDisabled || actionLoading}>
              {actionLoading ? t('common.loading') : t('ui.printLabel')}
            </AdminButton>
          )}
        </div>
      )}
    </div>
  );
}

export function PermissionButton({
  permission,
  children,
  className,
  disabledLabel,
  disabled,
  type = 'button',
  ...props
}: {
  permission: Permission;
  children: ReactNode;
  className?: string;
  disabledLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { t } = useI18n();
  const resolvedDisabledLabel = disabledLabel || t('ui.notAllowed');
  const user = useAuthStore((state) => state.user);
  const allowed = can(user?.role, permission);

  return (
    <button
      type={type}
      className={cn(className ?? 'button-primary')}
      disabled={!allowed || disabled}
      title={allowed ? undefined : resolvedDisabledLabel}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const storedUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = normalizeRole(storedUser?.role);
  const user = storedUser ?? {
    fullName: 'Linh Nguyen',
    email: 'admin@test.com',
    role,
  };

  const { t } = useI18n();

  const allowedNav = useMemo(() => {
    const navGroups = [
      {
        label: t('nav.operations'),
        items: [
          [t('nav.dashboard'), '/admin', 'view_dashboard'],
          [t('nav.leads'), '/admin/leads', 'manage_leads'],
          [t('nav.appointments'), '/admin/appointments', 'manage_appointments'],
          [t('nav.bookings'), '/admin/bookings', 'manage_bookings'],
          [t('nav.rentals'), '/admin/rental-orders', 'manage_bookings'],
          [t('nav.payments'), '/admin/payments', 'view_payments'],
          [t('nav.receipts'), '/admin/receipts', 'print_receipts'],
        ],
      },
      {
        label: t('nav.fulfillment'),
        items: [
          [t('nav.inventory'), '/admin/inventory', 'manage_inventory'],
          [t('nav.scanQr'), '/admin/scan', 'scan_qr'],
          [t('nav.pickupDesk'), '/admin/pickup', 'process_pickup'],
          [t('nav.returnDesk'), '/admin/returns', 'process_return'],
          [t('nav.previewQueue'), '/admin/preview-queue', 'manage_preview_queue'],
        ],
      },
      {
        label: t('nav.admin'),
        items: [
          [t('nav.disputes'), '/admin/disputes', 'manage_disputes'],
          [t('nav.auditLogs'), '/admin/audit', 'view_audit_logs'],
          [t('nav.users'), '/admin/users', 'manage_users'],
          [t('nav.roles'), '/admin/roles', 'manage_users'],
          [t('nav.permissions'), '/admin/permissions', 'manage_users'],
          [t('nav.clientSettings'), '/admin/client-settings', 'manage_settings'],
          [t('nav.settings'), '/admin/settings', 'manage_settings'],
        ],
      },
    ] as Array<{ label: string; items: Array<[string, string, Permission]> }>;

    return navGroups.map((group) => ({
      ...group,
      items: group.items.filter(([, , permission]) => can(role, permission)),
    }));
  }, [role, t]);

  const sidebar = (
    <aside className="flex h-full w-[288px] flex-col border-r border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/88 p-4 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="mb-5 rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/55 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">{t('shell.legacyBrand')}</p>
        <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">{t('shell.suite')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
          {[t('nav.flowLead'), t('nav.flowBooking'), t('nav.flowPickup'), t('nav.flowReturn')].map((step) => (
            <span key={step} className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80 px-2 py-1 text-center">
              {step}
            </span>
          ))}
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {allowedNav.map((group) => (
          <div key={group.label} className={group.items.length ? '' : 'hidden'}>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(([label, href]) => {
                const active =
                  pathname === href ||
                  (pathname === '/dashboard' && href === '/admin') ||
                  (href !== '/admin' && pathname.startsWith(href));

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'relative flex items-center rounded-[16px] px-3.5 py-2.5 text-sm font-semibold transition duration-200',
                      active &&
                        'bg-[rgb(var(--surface-3))] text-[rgb(var(--text-primary))] shadow-sm ring-1 ring-[rgb(var(--surface-border))]',
                      !active &&
                        'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-3))]/70 hover:text-[rgb(var(--text-primary))]',
                    )}
                  >
                    <span className="truncate">{label}</span>
                    {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[rgb(var(--accent-solid))]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/75 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[rgb(var(--accent-solid))] text-sm font-bold text-[rgb(var(--button-primary-text))] shadow-sm">
            {user.fullName?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{user.fullName}</p>
            <p className="truncate text-xs text-[rgb(var(--text-muted))]">{user.email}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <RoleBadge role={role} />
          <button
            type="button"
            className="text-xs font-semibold text-[rgb(var(--text-muted))] transition hover:text-[rgb(var(--danger))]"
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            {t('common.signOut')}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="admin-shell flex">
      <div className="hidden min-h-screen lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[rgb(var(--overlay))] backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full" onClick={(event) => event.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-h-screen flex-1 overflow-x-hidden">
        <div className="sticky top-0 z-30 border-b border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface))]/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
            <button type="button" className="button-secondary lg:hidden" onClick={() => setMobileOpen(true)}>
              {t('common.menu')}
            </button>

            <div className="hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('common.today')}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('ui.topbarHint')}</p>
                <StatusBadge value={t('ui.liveOps')} tone="success" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <div className="hidden rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] shadow-sm sm:block">
                {permissionsFor(role).length} {t('crud.permissionsActive')}
              </div>
              <RoleBadge role={role} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1480px] px-4 py-8 md:px-8 md:py-10">
          <div className="console-page">{children}</div>
        </div>
      </main>
    </div>
  );
}
