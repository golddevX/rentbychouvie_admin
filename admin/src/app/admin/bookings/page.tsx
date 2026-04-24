'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '@/lib/api';
import { bookings as demoBookings, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  ControlSurface,
  DataTable,
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';

type BookingStatus =
  | 'draft'
  | 'deposit_requested'
  | 'deposit_received'
  | 'confirmed'
  | 'scheduled_pickup'
  | 'picked_up'
  | 'return_pending'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'late_return'
  | 'damage_review';

type BookingRow = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  email?: string;
  status: BookingStatus;
  pickupDate: string;
  returnDate: string;
  product: string;
  variant: string;
  itemCode: string;
  total: number;
  basePrice: number;
  priceAdjustment: number;
  rentalDays: number;
  durationDays: number;
  bookingDepositRequired: number;
  bookingDepositPaid: number;
  securityDepositRequired: number;
  securityDepositHeld: number;
  securityDepositOption?: string;
  paid: number;
  remaining: number;
  locked: boolean;
  lockedAt?: string;
  rentalStatus?: string;
  items: any[];
  payments: any[];
  timeline: Array<{ time: string; title: string; detail: string; tone?: Tone }>;
};

const STATUS_OPTIONS: Array<'all' | BookingStatus> = [
  'all',
  'draft',
  'deposit_requested',
  'deposit_received',
  'confirmed',
  'scheduled_pickup',
  'picked_up',
  'return_pending',
  'returned',
  'completed',
  'cancelled',
  'late_return',
  'damage_review',
];

function normalizeStatus(value?: string): BookingStatus {
  const normalized = String(value ?? 'draft').toLowerCase();
  if (STATUS_OPTIONS.includes(normalized as BookingStatus)) return normalized as BookingStatus;
  return 'draft';
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function paymentTotal(payments: any[]) {
  return payments
    .filter((payment) => String(payment.status).toUpperCase() === 'COMPLETED')
    .reduce((sum, payment) => sum + Number(payment.amountPaid || payment.amount || 0), 0);
}

function bookingFromApi(row: any): BookingRow {
  const firstItem = row.items?.[0] ?? {};
  const inventoryItem = firstItem.inventoryItem ?? {};
  const product = firstItem.product ?? inventoryItem.product ?? {};
  const variant = firstItem.variant ?? inventoryItem.variant ?? {};
  const payments = row.rental?.payments ?? row.payments ?? [];
  const paid = Math.max(Number(row.bookingDepositPaid ?? 0), paymentTotal(payments));
  const total = Number(row.totalPrice ?? row.rentalFee ?? 0);
  const bookingDepositRequired = Number(row.bookingDepositRequired ?? row.deposit ?? 0);
  const bookingDepositPaid = Number(row.bookingDepositPaid ?? Math.min(paid, bookingDepositRequired));
  const status = normalizeStatus(row.status);
  const locked = Boolean(row.lockedAt) || bookingDepositPaid >= bookingDepositRequired || ['deposit_received', 'confirmed', 'scheduled_pickup', 'picked_up', 'return_pending', 'returned', 'completed'].includes(status);
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? 'Unknown customer',
    phone: row.customer?.phone ?? row.phone,
    email: row.customer?.email,
    status,
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    product: product.name ?? row.product ?? '-',
    variant: [variant.name, variant.size, variant.color].filter(Boolean).join(' / ') || row.variant || '-',
    itemCode: inventoryItem.serialNumber ?? firstItem.inventoryItemId ?? row.itemCode ?? '-',
    total,
    basePrice: Number(row.basePrice ?? total),
    priceAdjustment: Number(row.priceAdjustment ?? 0),
    rentalDays: Number(row.rentalDays ?? row.durationDays ?? 0),
    durationDays: Number(row.durationDays ?? row.rentalDays ?? 0),
    bookingDepositRequired,
    bookingDepositPaid,
    securityDepositRequired: Number(row.securityDepositRequired ?? row.refundableDeposit ?? 0),
    securityDepositHeld: Number(row.securityDepositHeld ?? row.refundableDeposit ?? 0),
    securityDepositOption: row.securityDepositOption,
    paid,
    remaining: Math.max(total - paid, 0),
    locked,
    lockedAt: row.lockedAt,
    rentalStatus: row.rental?.status,
    items: row.items ?? [],
    payments,
    timeline: [
      { time: formatDateTime(row.createdAt), title: 'bookingOps.timeline.created', detail: row.createdBy?.fullName ?? '-', tone: 'neutral' },
      row.lockedAt ? { time: formatDateTime(row.lockedAt), title: 'bookingOps.timeline.locked', detail: inventoryItem.serialNumber ?? firstItem.inventoryItemId ?? '-', tone: 'success' } : null,
      row.rental?.actualPickupDate ? { time: formatDateTime(row.rental.actualPickupDate), title: 'bookingOps.timeline.pickedUp', detail: row.rentalStatus ?? 'picked up', tone: 'info' } : null,
      row.rental?.actualReturnDate ? { time: formatDateTime(row.rental.actualReturnDate), title: 'bookingOps.timeline.returned', detail: row.rentalStatus ?? 'returned', tone: 'success' } : null,
    ].filter(Boolean) as BookingRow['timeline'],
  };
}

function nextStepKey(booking: BookingRow) {
  if (booking.status === 'draft') return 'bookingOps.next.requestDeposit';
  if (booking.status === 'deposit_requested') return booking.bookingDepositPaid >= booking.bookingDepositRequired ? 'bookingOps.next.confirm' : 'bookingOps.next.collectDeposit';
  if (booking.status === 'deposit_received' || booking.status === 'confirmed' || booking.status === 'scheduled_pickup') return 'bookingOps.next.pickup';
  if (booking.status === 'picked_up' || booking.status === 'return_pending' || booking.status === 'late_return' || booking.status === 'damage_review') return 'bookingOps.next.return';
  if (booking.status === 'returned') return 'bookingOps.next.settle';
  if (booking.status === 'cancelled') return 'bookingOps.next.cancelled';
  return 'bookingOps.next.complete';
}

function actionHref(booking: BookingRow) {
  const next = nextStepKey(booking);
  if (next === 'bookingOps.next.pickup') return `/admin/pickup?booking=${booking.id}`;
  if (next === 'bookingOps.next.return' || next === 'bookingOps.next.settle') return `/admin/returns?booking=${booking.id}`;
  return `/admin/payments/from-booking/${booking.id}`;
}

function lifecycleTone(booking: BookingRow): Tone {
  if (['cancelled', 'late_return', 'damage_review'].includes(booking.status)) return 'danger';
  if (['draft', 'deposit_requested'].includes(booking.status)) return 'warning';
  if (['picked_up', 'return_pending'].includes(booking.status)) return 'accent';
  if (['returned', 'completed'].includes(booking.status)) return 'success';
  return 'info';
}

function lockLabelKey(booking: BookingRow) {
  if (booking.locked) return 'bookingOps.lock.locked';
  return 'bookingOps.lock.notLocked';
}

function matchesFinancialFilter(booking: BookingRow, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'needs_deposit') return booking.bookingDepositPaid < booking.bookingDepositRequired;
  if (filter === 'payment_remaining') return booking.remaining > 0;
  if (filter === 'pickup_ready') return ['deposit_received', 'confirmed', 'scheduled_pickup'].includes(booking.status);
  if (filter === 'return_due') return ['picked_up', 'return_pending', 'late_return', 'damage_review'].includes(booking.status);
  return true;
}

export default function BookingsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<BookingRow[]>(demoBookings.map(bookingFromApi));
  const [activeId, setActiveId] = useState(demoBookings[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [financialFilter, setFinancialFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.getAll();
      const next = (res.data ?? []).map(bookingFromApi);
      setRows(next.length ? next : demoBookings.map(bookingFromApi));
      setActiveId((current) => next.find((row: BookingRow) => row.id === current)?.id ?? next[0]?.id ?? demoBookings[0]?.id ?? '');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('bookingOps.errors.loadFallback'));
      setRows(demoBookings.map(bookingFromApi));
      setActiveId(demoBookings[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((booking) => statusFilter === 'all' || booking.status === statusFilter)
      .filter((booking) => matchesFinancialFilter(booking, financialFilter))
      .filter((booking) => {
        if (!normalizedQuery) return true;
        return [booking.code, booking.customer, booking.phone, booking.email, booking.product, booking.variant, booking.itemCode]
          .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        const priority = (booking: BookingRow) => {
          if (booking.bookingDepositPaid < booking.bookingDepositRequired) return 1;
          if (['confirmed', 'scheduled_pickup', 'deposit_received'].includes(booking.status)) return 2;
          if (['picked_up', 'return_pending', 'late_return', 'damage_review'].includes(booking.status)) return 3;
          return 9;
        };
        return priority(a) - priority(b) || new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
      });
  }, [financialFilter, query, rows, statusFilter]);

  const stats = useMemo(() => {
    const awaitingDeposit = rows.filter((booking) => booking.bookingDepositPaid < booking.bookingDepositRequired).length;
    const locked = rows.filter((booking) => booking.locked).length;
    const pickupReady = rows.filter((booking) => ['deposit_received', 'confirmed', 'scheduled_pickup'].includes(booking.status)).length;
    const returnDue = rows.filter((booking) => ['picked_up', 'return_pending', 'late_return', 'damage_review'].includes(booking.status)).length;
    const outstanding = rows.reduce((sum, booking) => sum + booking.remaining, 0);
    return { awaitingDeposit, locked, pickupReady, returnDue, outstanding };
  }, [rows]);

  const runAction = async (key: string, operation: () => Promise<void>, success: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      await loadBookings();
      setFeedback({ tone: 'success', message: success });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('bookingOps.errors.actionFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const requestDeposit = async (booking: BookingRow) => {
    await runAction(
      `request-${booking.id}`,
      async () => {
        await bookingsApi.updateStatus(booking.id, 'DEPOSIT_REQUESTED');
      },
      t('bookingOps.success.depositRequested'),
    );
  };

  const confirmBooking = async (booking: BookingRow) => {
    await runAction(
      `confirm-${booking.id}`,
      async () => {
        await bookingsApi.confirm(booking.id, t('bookingOps.timeline.manualConfirm'));
      },
      t('bookingOps.success.confirmed'),
    );
  };

  const cancelBooking = async (booking: BookingRow) => {
    await runAction(
      `cancel-${booking.id}`,
      async () => {
        await bookingsApi.updateStatus(booking.id, 'CANCELLED');
      },
      t('bookingOps.success.cancelled'),
    );
  };

  return (
    <>
      <FeedbackPopup
        error={error}
        feedback={feedback}
        onClose={() => {
          setError(null);
          setFeedback(null);
        }}
      />

      <PageHeader
        eyebrow={t('bookingOps.eyebrow')}
        title={t('bookingOps.title')}
        subtitle={t('bookingOps.subtitle')}
        nextStep={filteredRows[0] ? `${filteredRows[0].code}: ${t(nextStepKey(filteredRows[0]))}` : t('bookingOps.noBlockers')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadBookings} loading={loading}>{t('common.refresh')}</AdminButton>
            <Link href="/admin/bookings/new" className="button-primary">{t('booking.createBooking')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('bookingOps.stats.awaitingDeposit'), value: stats.awaitingDeposit, detail: t('bookingOps.stats.awaitingDepositDetail'), tone: stats.awaitingDeposit ? 'warning' : 'success' },
          { label: t('bookingOps.stats.inventoryLocked'), value: stats.locked, detail: t('bookingOps.stats.inventoryLockedDetail'), tone: 'info' },
          { label: t('bookingOps.stats.pickupReady'), value: stats.pickupReady, detail: t('bookingOps.stats.pickupReadyDetail'), tone: stats.pickupReady ? 'accent' : 'neutral' },
          { label: t('bookingOps.stats.outstanding'), value: currency(stats.outstanding), detail: `${stats.returnDue} ${t('bookingOps.stats.returnDueDetail')}`, tone: stats.outstanding ? 'danger' : 'success' },
        ]}
      />

      <div className="mt-6">
        <ControlSurface label={t('bookingOps.filters.label')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('bookingOps.filters.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | BookingStatus)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status === 'all' ? t('bookingOps.filters.allStatuses') : t(`booking.status.${status}`)}</option>
            ))}
          </AdminSelect>
          <AdminSelect value={financialFilter} onChange={(event) => setFinancialFilter(event.target.value)}>
            <option value="all">{t('bookingOps.filters.allFinancial')}</option>
            <option value="needs_deposit">{t('bookingOps.filters.needsDeposit')}</option>
            <option value="payment_remaining">{t('bookingOps.filters.paymentRemaining')}</option>
            <option value="pickup_ready">{t('bookingOps.filters.pickupReady')}</option>
            <option value="return_due">{t('bookingOps.filters.returnDue')}</option>
          </AdminSelect>
          <AdminButton variant="secondary" onClick={() => { setQuery(''); setStatusFilter('all'); setFinancialFilter('all'); }}>
            {t('bookingOps.filters.reset')}
          </AdminButton>
        </ControlSurface>
      </div>

      <div className="mt-6">
        <WorkspaceLayout
          rail={active ? (
            <>
              <RailSection title={t('bookingOps.actionsPanel')}>
                <AdminButton className="w-full" onClick={() => requestDeposit(active)} loading={busyAction === `request-${active.id}`} disabled={active.status !== 'draft'}>
                  {t('bookingOps.actions.requestDeposit')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => confirmBooking(active)} loading={busyAction === `confirm-${active.id}`} disabled={active.status === 'cancelled' || active.status === 'completed'}>
                  {t('bookingOps.actions.confirmBooking')}
                </AdminButton>
                <Link className="button-primary w-full text-center" href={`/admin/payments/from-booking/${active.id}`}>{t('bookingOps.actions.collectPayment')}</Link>
                <Link className="button-secondary w-full text-center" href={`/admin/pickup?booking=${active.id}`}>{t('bookingOps.actions.pickupDesk')}</Link>
                <Link className="button-secondary w-full text-center" href={`/admin/returns?booking=${active.id}`}>{t('bookingOps.actions.returnDesk')}</Link>
                <AdminButton variant="secondary" className="w-full text-[rgb(var(--danger))]" onClick={() => cancelBooking(active)} loading={busyAction === `cancel-${active.id}`} disabled={active.status === 'cancelled' || active.status === 'completed'}>
                  {t('bookingOps.actions.cancel')}
                </AdminButton>
              </RailSection>
              <RailSection title={t('bookingOps.lock.title')}>
                <InlineAlert tone={active.locked ? 'success' : 'warning'}>
                  {t(lockLabelKey(active))}
                </InlineAlert>
                <div className="mt-3 grid gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <div className="flex justify-between"><span>{t('bookingOps.deposit.bookingDeposit')}</span><b>{currency(active.bookingDepositPaid)} / {currency(active.bookingDepositRequired)}</b></div>
                  <div className="flex justify-between"><span>{t('bookingOps.deposit.securityDeposit')}</span><b>{currency(active.securityDepositHeld)} / {currency(active.securityDepositRequired)}</b></div>
                </div>
              </RailSection>
              <RailSection title={t('bookingOps.rules.title')}>
                <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">{t('bookingOps.rules.copy')}</p>
              </RailSection>
            </>
          ) : null}
        >
          {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
          {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

          <SectionCard title={t('bookingOps.table.title')} description={t('bookingOps.table.description')}>
            <DataTable
              loading={loading}
              empty={t('bookingOps.empty')}
              columns={[
                t('bookingOps.columns.code'),
                t('bookingOps.columns.customer'),
                t('bookingOps.columns.product'),
                t('common.status'),
                t('bookingOps.columns.pickupDate'),
                t('bookingOps.columns.returnDate'),
                t('bookingOps.columns.total'),
                t('bookingOps.columns.paid'),
                t('bookingOps.columns.remaining'),
                t('bookingOps.columns.nextStep'),
                t('common.actions'),
              ]}
              rows={filteredRows.map((booking) => [
                <button key={booking.id} type="button" className="text-left" onClick={() => setActiveId(booking.id)}>
                  <span className="block font-semibold text-[rgb(var(--text-primary))]">{booking.code}</span>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">{booking.itemCode}</span>
                </button>,
                <div key={`${booking.id}-customer`}>
                  <p className="font-semibold text-[rgb(var(--text-primary))]">{booking.customer}</p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">{booking.phone ?? '-'}</p>
                </div>,
                <div key={`${booking.id}-product`}>
                  <p className="font-semibold text-[rgb(var(--text-primary))]">{booking.product}</p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">{booking.variant}</p>
                </div>,
                <StatusBadge key={`${booking.id}-status`} value={booking.status} tone={lifecycleTone(booking)} />,
                formatDate(booking.pickupDate),
                formatDate(booking.returnDate),
                currency(booking.total),
                currency(booking.paid),
                <span key={`${booking.id}-remaining`} className={cn(booking.remaining > 0 && 'font-semibold text-[rgb(var(--danger))]')}>{currency(booking.remaining)}</span>,
                <span key={`${booking.id}-next`} className="font-semibold text-[rgb(var(--text-primary))]">{t(nextStepKey(booking))}</span>,
                <div key={`${booking.id}-actions`} className="flex flex-wrap gap-2">
                  <Link className="button-secondary min-h-9 px-3 text-sm" href={`/admin/bookings/${booking.id}`}>{t('common.open')}</Link>
                  <Link className="button-primary min-h-9 px-3 text-sm" href={actionHref(booking)}>{t(nextStepKey(booking))}</Link>
                </div>,
              ])}
            />
          </SectionCard>

          {active ? (
            <SectionCard title={t('bookingOps.detail.title')} description={t('bookingOps.detail.description')}>
              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('bookingOps.detail.booking')}</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{active.code} / {active.customer}</h2>
                        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{formatDate(active.pickupDate)} - {formatDate(active.returnDate)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={active.status} tone={lifecycleTone(active)} />
                        <AdminBadge tone={active.locked ? 'success' : 'warning'}>{t(lockLabelKey(active))}</AdminBadge>
                      </div>
                    </div>
                  </div>

                  <SectionCard title={t('bookingOps.detail.productSection')} description={t('bookingOps.detail.productDesc')} className="shadow-none">
                    <DataTable
                      columns={[t('bookingOps.columns.product'), t('bookingOps.columns.variant'), t('bookingOps.columns.item'), t('bookingOps.columns.total')]}
                      rows={(active.items.length ? active.items : [{ product: { name: active.product }, variant: { name: active.variant }, inventoryItem: { serialNumber: active.itemCode }, pricePerDay: active.basePrice }]).map((item: any) => [
                        item.product?.name ?? active.product,
                        [item.variant?.name, item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || active.variant,
                        item.inventoryItem?.serialNumber ?? item.inventoryItemId ?? active.itemCode,
                        currency(Number(item.pricePerDay ?? active.basePrice ?? 0)),
                      ])}
                    />
                  </SectionCard>

                  <SectionCard title={t('bookingOps.detail.rentalSection')} description={t('bookingOps.detail.rentalDesc')} className="shadow-none">
                    <KeyValueList
                      items={[
                        { label: t('bookingOps.detail.pickup'), value: formatDateTime(active.pickupDate) },
                        { label: t('bookingOps.detail.return'), value: formatDateTime(active.returnDate) },
                        { label: t('bookingOps.detail.rentalDays'), value: active.rentalDays || '-' },
                        { label: t('bookingOps.detail.durationPolicy'), value: `${active.durationDays || '-'} ${t('bookingOps.detail.days')}` },
                        { label: t('bookingOps.detail.rentalStatus'), value: active.rentalStatus ? <StatusBadge value={String(active.rentalStatus).toLowerCase()} /> : '-' },
                        { label: t('bookingOps.detail.nextAction'), value: t(nextStepKey(active)) },
                      ]}
                    />
                  </SectionCard>
                </div>

                <div className="space-y-5">
                  <SectionCard title={t('bookingOps.pricing.title')} description={t('bookingOps.pricing.description')} className="shadow-none">
                    <div className="grid gap-3 text-sm">
                      {[
                        [t('bookingOps.pricing.base'), currency(active.basePrice)],
                        [t('bookingOps.pricing.adjustment'), currency(active.priceAdjustment)],
                        [t('bookingOps.pricing.total'), currency(active.total)],
                        [t('bookingOps.pricing.paid'), currency(active.paid)],
                        [t('bookingOps.pricing.remaining'), currency(active.remaining)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3">
                          <span className="text-[rgb(var(--text-secondary))]">{label}</span>
                          <b>{value}</b>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title={t('bookingOps.deposit.title')} description={t('bookingOps.deposit.description')} className="shadow-none">
                    <DepositBar label={t('bookingOps.deposit.bookingDeposit')} paid={active.bookingDepositPaid} required={active.bookingDepositRequired} />
                    <div className="mt-4">
                      <DepositBar label={t('bookingOps.deposit.securityDeposit')} paid={active.securityDepositHeld} required={active.securityDepositRequired} />
                    </div>
                    <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-secondary))]">{active.securityDepositOption ?? t('bookingOps.deposit.securityPolicy')}</p>
                  </SectionCard>

                  <SectionCard title={t('bookingOps.timeline.title')} description={t('bookingOps.timeline.description')} className="shadow-none">
                    <TimelineList
                      items={(active.timeline.length ? active.timeline : [{ time: '-', title: 'bookingOps.timeline.created', detail: active.customer }]).map((item) => ({
                        ...item,
                        title: t(item.title),
                      }))}
                    />
                  </SectionCard>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </WorkspaceLayout>
      </div>
    </>
  );
}

function DepositBar({ label, paid, required }: { label: string; paid: number; required: number }) {
  const percent = required <= 0 ? 100 : Math.min(100, Math.round((paid / required) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-xs font-semibold text-[rgb(var(--text-secondary))]">{currency(paid)} / {currency(required)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-border))]/70">
        <div className={cn('h-full rounded-full transition-all', percent >= 100 ? 'bg-[rgb(var(--success))]' : 'bg-[rgb(var(--warning))]')} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
