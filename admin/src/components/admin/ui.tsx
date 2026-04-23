'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useMemo, useState } from 'react';
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

  return (
    <AdminBadge tone={resolved}>{localized}</AdminBadge>
  );
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
    <div className="mb-8 rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/72 px-5 py-5 shadow-[var(--shadow-panel)] backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{eyebrow}</p>}
            {meta}
          </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))] md:text-[40px] md:leading-[1.08]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{subtitle}</p>
        {nextStep && (
          <p className="mt-4 inline-flex rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-secondary))]">
            {t('ui.nextPrefix')}: {nextStep}
          </p>
        )}
      </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
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
    <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
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
    <AdminCard className={className}>
      {(title || description || actions) && (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>}
            {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>}
          </div>
          {actions}
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
    <div className="summary-row">
      {items.map((item) => (
        <div key={item.label} className={cn('summary-tile', item.tone && `summary-tile-${item.tone}`)}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">{item.value}</div>
          {item.detail && <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p>}
        </div>
      ))}
    </div>
  );
}

export function ControlSurface({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="control-surface">
      {label && <p className="control-surface-label">{label}</p>}
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
    <div className="decision-workspace">
      <div className="decision-main">
        <div className="decision-hero">{hero}</div>
        {children}
      </div>
      <aside className="decision-rail">
        <section className="ops-action-group">
          <p className="ops-rail-title">{t('ui.currentStatus')}</p>
          {status}
        </section>
        <section className="ops-action-group">
          <p className="ops-rail-title">{t('ui.actionPanel')}</p>
          {actions}
        </section>
        {timeline && (
          <section className="ops-action-group">
            <p className="ops-rail-title">{t('crud.timeline')}</p>
            {timeline}
          </section>
        )}
        {related && (
          <section className="ops-action-group">
            <p className="ops-rail-title">{t('crud.relatedData')}</p>
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
          <div className="queue-row">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
              <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{item.detail}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge value={item.status} tone={item.tone} />
              {item.action && <span className="text-xs font-semibold text-[rgb(var(--accent-solid))]">{item.action}</span>}
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
    <div className="timeline-list">
      {items.map((item) => (
        <div key={`${item.time}-${item.title}`} className="timeline-row">
          <div className="w-16 shrink-0 text-xs font-semibold text-[rgb(var(--text-muted))]">{item.time}</div>
          <div className="relative flex-1 border-l border-[rgb(var(--surface-border))] pb-4 pl-4">
            <span className={cn('timeline-dot', item.tone && `timeline-dot-${item.tone}`)} />
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-shell p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="loading-block mb-2 h-12 last:mb-0" />
      ))}
    </div>
  );
}

export function WorkspaceLayout({
  children,
  rail,
}: {
  children: ReactNode;
  rail?: ReactNode;
}) {
  if (!rail) {
    return <div className="grid gap-6">{children}</div>;
  }

  return (
    <div className="workspace-grid">
      <div className="space-y-6">{children}</div>
      <aside className="ops-rail">{rail}</aside>
    </div>
  );
}

export function RailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ops-action-group">
      <p className="ops-rail-title">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="key-value-grid">
      {items.map((item) => (
        <div key={item.label} className="key-value-card">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function InlineAlert({
  tone = 'info',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <div className={cn('inline-alert-base', `inline-alert-${tone}`)}>{children}</div>;
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
    neutral: 'from-[rgb(var(--text-secondary))/10]',
    info: 'from-[rgb(var(--info))/12]',
    success: 'from-[rgb(var(--success))/12]',
    warning: 'from-[rgb(var(--warning))/13]',
    danger: 'from-[rgb(var(--danger))/12]',
    accent: 'from-[rgb(var(--accent-solid))/14]',
  };

  return (
    <div className={cn('surface-panel relative overflow-hidden p-5', tones[tone])}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-[32px] font-semibold leading-none tracking-[-0.04em]">{value}</p>
        <span className="rounded-full border border-[rgb(var(--surface-border))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--text-secondary))]">{t('common.live')}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{detail}</p>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-2.5 shadow-[0_1px_2px_rgba(15,23,20,0.03)]">
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
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: string;
  loading?: boolean;
  batchActions?: ReactNode;
}) {
  const { t } = useI18n();
  const emptyText = empty || t('ui.noRecordsMatch');
  if (loading) return <TableSkeleton />;

  return (
    <div className="table-shell overflow-x-auto">
      {batchActions && (
        <div className="border-b border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-3">
          {batchActions}
        </div>
      )}
      <table className="min-w-full text-sm">
        <thead className="table-head">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-3.5 font-bold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-5 py-14 text-center text-[rgb(var(--text-muted))]" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="table-row">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-3.5 align-middle text-[13px] leading-5 text-[rgb(var(--text-secondary))] first:text-[rgb(var(--text-primary))]">
                <div className="flex min-h-8 items-center">{cell}</div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="mb-4 h-12 w-12 rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[rgb(var(--text-secondary))]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
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
        <div key={item} className="loading-block h-16" />
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
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--surface-border))] bg-white/80 text-xs font-semibold shadow-sm">
            {index + 1}
          </span>
          <div>
            <p className="font-medium">{item}</p>
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
          <div key={label} className="flex items-center justify-between rounded-[20px] bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <span className="text-[rgb(var(--text-secondary))]">{label}</span>
            <span className="font-semibold">{value}</span>
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
    <AdminCard padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('ui.receipt')}</p>
          <h3 className="mt-2 text-xl font-semibold">{receiptId}</h3>
        </div>
        <StatusBadge value={t('receipt.printReady')} tone="success" />
      </div>
      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between"><span>{t('ui.customer')}</span><b>{customer}</b></div>
        <div className="flex justify-between"><span>{t('ui.receiptType')}</span><b>{t('ui.returnReceipt')}</b></div>
        <div className="flex justify-between"><span>{t('ui.total')}</span><b>{amount}</b></div>
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
    <div className="surface-panel flex flex-col items-center p-5 text-center">
      <div className="grid h-36 w-36 place-items-center rounded-2xl bg-white shadow-inner">
        {imageDataUrl ? (
          <img src={imageDataUrl} alt={t('inventory.qrCode')} className="h-32 w-32 object-contain" />
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }).map((_, index) => (
              <span key={index} className={cn('h-4 w-4 rounded-sm', index % 3 === 0 || index % 7 === 0 ? 'bg-[rgb(var(--text-primary))]' : 'bg-[rgb(var(--surface-border))]')} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-4 font-mono text-xs font-semibold">{code}</p>
      {showActions && (
        <div className="mt-4 flex gap-2">
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
    <aside className="shell-rail">
      <div className="shell-brand mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">{t('shell.legacyBrand')}</p>
        <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em]">{t('shell.suite')}</h2>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">
          {[t('nav.flowLead'), t('nav.flowBooking'), t('nav.flowPickup'), t('nav.flowReturn')].map((step) => (
            <span key={step} className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-2 py-1">{step}</span>
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
                      'shell-nav-item',
                      active && 'shell-nav-item-active',
                      !active && 'hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))]',
                    )}
                  >
                    <span>{label}</span>
                    {active && <span className="absolute left-0 top-2.5 h-5 w-0.5 rounded-full bg-[rgb(var(--accent-solid))]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 rounded-[20px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[rgb(var(--accent-solid))] text-sm font-bold text-white">
            {user.fullName?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-[rgb(var(--text-muted))]">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <RoleBadge role={role} />
          <button
            className="text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--danger))]"
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
          <div className="h-full" onClick={(event) => event.stopPropagation()}>{sidebar}</div>
        </div>
      )}
      <main className="min-h-screen flex-1 overflow-x-hidden">
        <div className="shell-topbar">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
            <button className="button-secondary lg:hidden" onClick={() => setMobileOpen(true)}>{t('common.menu')}</button>
            <div className="hidden md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('common.today')}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{t('ui.topbarHint')}</p>
                <StatusBadge value={t('ui.liveOps')} tone="success" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="hidden rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] sm:block">
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
