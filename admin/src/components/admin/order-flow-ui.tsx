'use client';

import type { ReactNode, Ref } from 'react';
import Link from 'next/link';
import { AdminBadge, AdminButton, AdminInput, cn } from './primitives';
import { EmptyState, SectionCard, StatusBadge } from './ui';
import { formatVndAmount } from './lead-ui';
import type { Tone } from '@/lib/admin/demo-data';

export function MoneyDisplay({
  value,
  tone = 'neutral',
  strong = false,
  className,
}: {
  value?: number | null;
  tone?: Tone;
  strong?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'tabular-nums',
        strong && 'font-semibold',
        tone === 'danger' && 'text-[rgb(var(--danger))]',
        tone === 'warning' && 'text-[rgb(var(--warning))]',
        tone === 'success' && 'text-[rgb(var(--success))]',
        tone === 'accent' && 'text-[rgb(var(--accent-strong))]',
        className,
      )}
    >
      {formatVndAmount(value ?? 0) || '0 đ'}
    </span>
  );
}

function toneDot(tone: Tone) {
  return cn(
    'h-2.5 w-2.5 rounded-full',
    tone === 'danger' && 'bg-[rgb(var(--danger))]',
    tone === 'warning' && 'bg-[rgb(var(--warning))]',
    tone === 'success' && 'bg-[rgb(var(--success))]',
    tone === 'accent' && 'bg-[rgb(var(--accent-strong))]',
    tone === 'info' && 'bg-[rgb(var(--info))]',
    tone === 'neutral' && 'bg-[rgb(var(--text-muted))]',
  );
}

function toneSurface(tone: Tone) {
  return cn(
    'border',
    tone === 'danger' && 'border-[rgb(var(--danger))]/18 bg-[rgb(var(--danger))]/8',
    tone === 'warning' && 'border-[rgb(var(--warning))]/18 bg-[rgb(var(--warning))]/10',
    tone === 'success' && 'border-[rgb(var(--success))]/18 bg-[rgb(var(--success))]/10',
    tone === 'accent' && 'border-[rgb(var(--accent-strong))]/18 bg-[rgb(var(--accent-strong))]/10',
    tone === 'info' && 'border-[rgb(var(--info))]/18 bg-[rgb(var(--info))]/10',
    tone === 'neutral' && 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72',
  );
}

export function QueueList({
  title,
  description,
  items,
  activeId,
  onSelect,
  emptyState,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  title: string;
  description: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta?: string;
    helper?: string;
    badges?: Array<{ label: string; tone?: Tone }>;
    nextStep?: string;
    status: string;
    statusTone?: Tone;
  }>;
  activeId?: string;
  onSelect: (id: string) => void;
  emptyState?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-2.5">
        {items.length ? items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'group w-full rounded-[24px] border px-4 py-4 text-left transition duration-200',
                'hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]',
                active
                  ? 'border-[rgb(var(--accent-strong))]/30 bg-[rgb(var(--surface-3))] shadow-[0_16px_30px_rgba(15,23,42,0.06)]'
                  : 'border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{item.subtitle}</p>
                  {item.meta ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.meta}</p> : null}
                </div>
                <StatusBadge value={item.status} tone={item.statusTone} />
              </div>
              {(item.badges?.length || item.helper || item.nextStep) ? (
                <div className="mt-4 space-y-3">
                  {item.badges?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {item.badges.map((badge) => (
                        <AdminBadge key={`${item.id}-${badge.label}`} tone={badge.tone ?? 'neutral'}>
                          {badge.label}
                        </AdminBadge>
                      ))}
                    </div>
                  ) : null}
                  {item.helper ? <p className="text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.helper}</p> : null}
                  {item.nextStep ? (
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--accent-strong))]">
                      <span className={toneDot('accent')} />
                      <span>{item.nextStep}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        }) : (
          emptyState ?? (
            <EmptyState
              title={emptyTitle ?? title}
              description={emptyDescription ?? description}
              action={emptyAction}
            />
          )
        )}
      </div>
    </SectionCard>
  );
}

export function BookingContextCard({
  eyebrow,
  title,
  subtitle,
  status,
  statusTone,
  details,
  badges,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  status: string;
  statusTone?: Tone;
  details: Array<{ label: string; value: ReactNode }>;
  badges?: Array<{ label: string; tone?: Tone }>;
  actions?: ReactNode;
}) {
  return (
    <SectionCard>
      <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/78 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{eyebrow}</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[rgb(var(--text-primary))]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{subtitle}</p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <StatusBadge value={status} tone={statusTone} />
            {badges?.length ? (
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {badges.map((badge) => (
                  <AdminBadge key={`${title}-${badge.label}`} tone={badge.tone ?? 'neutral'}>
                    {badge.label}
                  </AdminBadge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {details.map((detail) => (
          <div key={detail.label} className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{detail.label}</p>
            <div className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{detail.value}</div>
          </div>
        ))}
      </div>

      {actions ? <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div> : null}
    </SectionCard>
  );
}

export function PaymentBreakdownCard({
  title,
  description,
  rows,
  footer,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; value: number; tone?: Tone; strong?: boolean; helper?: string }>;
  footer?: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'rounded-[20px] px-4 py-3.5',
              row.strong ? toneSurface(row.tone ?? 'accent') : 'border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{row.label}</p>
                {row.helper ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{row.helper}</p> : null}
              </div>
              <MoneyDisplay value={row.value} tone={row.tone} strong className={row.strong ? 'text-base' : 'text-sm'} />
            </div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </SectionCard>
  );
}

export function ScanPanel({
  title,
  description,
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder,
  submitLabel,
  clearLabel,
  loading = false,
  disabled = false,
  inputRef,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  placeholder: string;
  submitLabel: string;
  clearLabel: string;
  loading?: boolean;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/72 p-4">
        <AdminInput
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          inputClassName="h-12 text-base font-semibold tracking-[0.08em]"
          disabled={disabled}
          autoFocus
        />
        <div className="mt-3 flex flex-wrap gap-2.5">
          <AdminButton onClick={onSubmit} loading={loading} disabled={disabled || !value.trim()}>
            {submitLabel}
          </AdminButton>
          <AdminButton variant="secondary" onClick={onClear} disabled={disabled && !value}>
            {clearLabel}
          </AdminButton>
        </div>
      </div>
    </SectionCard>
  );
}

export function ValidationResult({
  title,
  status,
  tone,
  message,
  expectedLabel = 'Expected',
  actualLabel = 'Scanned',
  expected,
  actual,
}: {
  title: string;
  status: string;
  tone: Tone;
  message: string;
  expectedLabel?: string;
  actualLabel?: string;
  expected?: ReactNode;
  actual?: ReactNode;
}) {
  return (
    <SectionCard title={title} description={message}>
      <div className={cn('rounded-[22px] p-4', toneSurface(tone))}>
        <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          <span className={toneDot(tone)} />
          <span>{status}</span>
        </div>
      </div>
      {(expected || actual) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{expectedLabel}</p>
            <div className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{expected ?? '-'}</div>
          </div>
          <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{actualLabel}</p>
            <div className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{actual ?? '-'}</div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function FeeBreakdown({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; value: number; tone?: Tone; helper?: string }>;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{row.label}</p>
                {row.helper ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{row.helper}</p> : null}
              </div>
              <MoneyDisplay value={row.value} tone={row.tone} strong />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function RefundBreakdown({
  title,
  description,
  rows,
  actions,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; value: number; tone?: Tone; strong?: boolean; helper?: string }>;
  actions?: ReactNode;
}) {
  return (
    <PaymentBreakdownCard
      title={title}
      description={description}
      rows={rows}
      footer={actions ? <div className="grid gap-2.5">{actions}</div> : null}
    />
  );
}

export function FlowActions({
  links,
}: {
  links: Array<{ href?: string; label: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; onClick?: () => void; disabled?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {links.map((link) => (
        link.href ? (
          <Link key={`${link.href}-${link.label}`} href={link.href} className={cn(link.variant === 'primary' ? 'button-primary' : link.variant === 'ghost' ? 'button-ghost' : link.variant === 'danger' ? 'button-danger' : 'button-secondary')}>
            {link.label}
          </Link>
        ) : (
          <AdminButton key={link.label} variant={link.variant} onClick={link.onClick} disabled={link.disabled}>
            {link.label}
          </AdminButton>
        )
      ))}
    </div>
  );
}
