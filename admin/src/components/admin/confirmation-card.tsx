import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminBadge, AdminButton, AdminCard } from './primitives';

type ConfirmationTone = 'success' | 'warning' | 'danger' | 'info';

const toneMap: Record<ConfirmationTone, { badge: 'success' | 'warning' | 'danger' | 'info'; panel: string }> = {
  success: {
    badge: 'success',
    panel: 'border-[rgb(var(--success))/35] bg-[rgb(var(--success))/8]',
  },
  warning: {
    badge: 'warning',
    panel: 'border-[rgb(var(--warning))/35] bg-[rgb(var(--warning))/8]',
  },
  danger: {
    badge: 'danger',
    panel: 'border-[rgb(var(--danger))/35] bg-[rgb(var(--danger))/8]',
  },
  info: {
    badge: 'info',
    panel: 'border-[rgb(var(--info))/35] bg-[rgb(var(--info))/8]',
  },
};

export function OperationConfirmationCard({
  title,
  subtitle,
  status,
  tone,
  summary,
  details,
  actions,
}: {
  title: string;
  subtitle: string;
  status: string;
  tone: ConfirmationTone;
  summary: Array<{ label: string; value: ReactNode }>;
  details?: ReactNode;
  actions?: Array<{ label: string; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' }>;
}) {
  const style = toneMap[tone];

  return (
    <AdminCard padding="lg" className="space-y-6">
      <div className={`rounded-2xl border px-4 py-3 ${style.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{subtitle}</p>
          </div>
          <AdminBadge tone={style.badge}>{status}</AdminBadge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{item.label}</p>
            <div className="mt-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">{item.value}</div>
          </div>
        ))}
      </div>

      {details ? <div>{details}</div> : null}

      {actions && actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) =>
            action.href ? (
              <Link key={`${action.label}-${action.href}`} href={action.href}>
                <span className={action.variant === 'secondary' ? 'button-secondary' : action.variant === 'ghost' ? 'button-ghost' : 'button-primary'}>
                  {action.label}
                </span>
              </Link>
            ) : (
              <AdminButton key={action.label} variant={action.variant ?? 'primary'} onClick={action.onClick}>
                {action.label}
              </AdminButton>
            ),
          )}
        </div>
      ) : null}
    </AdminCard>
  );
}
