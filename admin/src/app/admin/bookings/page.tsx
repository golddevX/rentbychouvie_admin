'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '@/lib/api';
import { bookings as demoBookings, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import {
  ActionMenu,
  ControlSurface,
  DataTable,
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  PaginationControls,
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
  | 'awaiting_security_deposit'
  | 'awaiting_remaining_payment'
  | 'ready_for_pickup'
  | 'deposit_requested'
  | 'deposit_received'
  | 'confirmed'
  | 'scheduled_pickup'
  | 'picked_up'
  | 'return_pending'
  | 'settlement_pending'
  | 'returned'
  | 'completed'
  | 'cancelled';

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
  leadId?: string;
  appointmentId?: string;
  items: any[];
  payments: any[];
  timeline: Array<{ time: string; title: string; detail: string; tone?: Tone }>;
};

const STATUS_OPTIONS: Array<'all' | BookingStatus> = [
  'all',
  'draft',
  'awaiting_security_deposit',
  'awaiting_remaining_payment',
  'ready_for_pickup',
  'deposit_requested',
  'deposit_received',
  'confirmed',
  'scheduled_pickup',
  'picked_up',
  'return_pending',
  'settlement_pending',
  'returned',
  'completed',
  'cancelled',
];

const PICKUP_READY_STATUSES: BookingStatus[] = ['ready_for_pickup', 'deposit_received', 'confirmed', 'scheduled_pickup'];
const RETURN_FLOW_STATUSES: BookingStatus[] = ['picked_up', 'return_pending'];
const SETTLEMENT_STATUSES: BookingStatus[] = ['returned', 'settlement_pending'];
const TERMINAL_STATUSES: BookingStatus[] = ['cancelled', 'completed'];

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

function hasBookingDepositCovered(booking: Pick<BookingRow, 'bookingDepositPaid' | 'bookingDepositRequired'>) {
  return booking.bookingDepositRequired <= 0 || booking.bookingDepositPaid >= booking.bookingDepositRequired;
}

function canRequestDeposit(booking: BookingRow) {
  return !TERMINAL_STATUSES.includes(booking.status)
    && !RETURN_FLOW_STATUSES.includes(booking.status)
    && !SETTLEMENT_STATUSES.includes(booking.status)
    && !hasBookingDepositCovered(booking);
}

function bookingFromApi(row: any, labels?: { unknownCustomer: string }): BookingRow {
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
  const locked = Boolean(row.lockedAt)
    || hasBookingDepositCovered({ bookingDepositPaid, bookingDepositRequired })
    || PICKUP_READY_STATUSES.includes(status)
    || RETURN_FLOW_STATUSES.includes(status)
    || SETTLEMENT_STATUSES.includes(status)
    || status === 'completed';
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? labels?.unknownCustomer ?? '-',
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
    leadId: row.leadId ?? row.lead?.id,
    appointmentId: row.appointmentId ?? row.appointment?.id ?? row.lead?.appointmentId,
    items: row.items ?? [],
    payments,
    timeline: [
      { time: formatDateTime(row.createdAt), title: 'bookingOps.timeline.created', detail: row.createdBy?.fullName ?? '-', tone: 'neutral' },
      row.lockedAt ? { time: formatDateTime(row.lockedAt), title: 'bookingOps.timeline.locked', detail: inventoryItem.serialNumber ?? firstItem.inventoryItemId ?? '-', tone: 'success' } : null,
      row.rental?.actualPickupDate ? { time: formatDateTime(row.rental.actualPickupDate), title: 'bookingOps.timeline.pickedUp', detail: row.rentalStatus ?? 'picked_up', tone: 'info' } : null,
      row.rental?.actualReturnDate ? { time: formatDateTime(row.rental.actualReturnDate), title: 'bookingOps.timeline.returned', detail: row.rentalStatus ?? 'returned', tone: 'success' } : null,
    ].filter(Boolean) as BookingRow['timeline'],
  };
}

function nextStepKey(booking: BookingRow) {
  if (booking.status === 'cancelled') return 'bookingOps.next.cancelled';
  if (booking.status === 'completed') return 'bookingOps.next.complete';
  if (SETTLEMENT_STATUSES.includes(booking.status)) return 'bookingOps.next.settle';
  if (RETURN_FLOW_STATUSES.includes(booking.status)) return 'bookingOps.next.return';
  if (booking.status === 'awaiting_remaining_payment' && booking.remaining > 0) return 'bookingOps.next.collectPayment';
  if (PICKUP_READY_STATUSES.includes(booking.status)) return 'bookingOps.next.pickup';
  if (booking.remaining <= 0 && hasBookingDepositCovered(booking)) return 'bookingOps.next.pickup';
  if (hasBookingDepositCovered(booking)) return 'bookingOps.next.pickup';
  if (booking.status === 'draft' && booking.bookingDepositPaid <= 0) return 'bookingOps.next.requestDeposit';
  if (booking.status === 'deposit_requested' || booking.status === 'awaiting_security_deposit' || booking.bookingDepositPaid > 0) {
    return 'bookingOps.next.collectDeposit';
  }
  return 'bookingOps.next.requestDeposit';
}

function actionHref(booking: BookingRow) {
  if (booking.status === 'completed') return `/admin/payments?booking=${booking.id}`;
  const next = nextStepKey(booking);
  if (next === 'bookingOps.next.pickup') return `/admin/pickup?booking=${booking.id}`;
  if (next === 'bookingOps.next.return' || next === 'bookingOps.next.settle') return `/admin/returns?booking=${booking.id}`;
  return `/admin/payments?booking=${booking.id}`;
}

function actionLabelKey(booking: BookingRow) {
  if (booking.status === 'completed') return 'booking.reviewPayment';
  return nextStepKey(booking);
}

function lifecycleTone(booking: BookingRow): Tone {
  if (['cancelled', 'settlement_pending'].includes(booking.status)) return 'danger';
  if (['draft', 'deposit_requested', 'awaiting_security_deposit', 'awaiting_remaining_payment'].includes(booking.status)) return 'warning';
  if (['ready_for_pickup', 'picked_up', 'return_pending'].includes(booking.status)) return 'accent';
  if (['returned', 'completed'].includes(booking.status)) return 'success';
  return 'info';
}

function lockLabelKey(booking: BookingRow) {
  if (booking.locked) return 'bookingOps.lock.locked';
  return 'bookingOps.lock.notLocked';
}

function matchesFinancialFilter(booking: BookingRow, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'needs_deposit') return !hasBookingDepositCovered(booking);
  if (filter === 'payment_remaining') return booking.remaining > 0;
  if (filter === 'pickup_ready') return PICKUP_READY_STATUSES.includes(booking.status);
  if (filter === 'return_due') return RETURN_FLOW_STATUSES.includes(booking.status);
  return true;
}

function BookingsPageContent() {
  const { t } = useI18n();
  const bookingLabels = useMemo(() => ({
    unknownCustomer: t('leadOps.fallback.unknownCustomer'),
  }), [t]);
  const { params, updateParams, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [rows, setRows] = useState<BookingRow[]>(demoBookings.map((row) => bookingFromApi(row, bookingLabels)));
  const [activeId, setActiveId] = useState(demoBookings[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [financialFilter, setFinancialFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const query = params.search;
  const statusFilter = (params.status || 'all') as 'all' | BookingStatus;

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.list({
        page: params.page,
        limit: params.limit,
        search: query || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter.toUpperCase(),
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
      const next = (res.data?.data ?? []).map((row: any) => bookingFromApi(row, bookingLabels));
      setRows(next);
      setMeta(res.data?.meta ?? { page: params.page, limit: params.limit, total: next.length, totalPages: next.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      setActiveId((current) => next.find((row: BookingRow) => row.id === current)?.id ?? next[0]?.id ?? '');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('bookingOps.errors.loadFallback'));
      setRows(demoBookings.map((row) => bookingFromApi(row, bookingLabels)));
      setMeta({ page: 1, limit: demoBookings.length, total: demoBookings.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
      setActiveId(demoBookings[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [params.limit, params.page, params.search, params.sortBy, params.sortOrder, statusFilter]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((booking) => matchesFinancialFilter(booking, financialFilter))
      ;
  }, [financialFilter, rows]);

  const stats = useMemo(() => {
    const awaitingDeposit = rows.filter((booking) => !hasBookingDepositCovered(booking)).length;
    const locked = rows.filter((booking) => booking.locked).length;
    const pickupReady = rows.filter((booking) => PICKUP_READY_STATUSES.includes(booking.status)).length;
    const returnDue = rows.filter((booking) => RETURN_FLOW_STATUSES.includes(booking.status)).length;
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
            onChange={(event) => updateParams({ search: event.target.value }, { resetPage: true })}
          />
          <AdminSelect value={statusFilter} onChange={(event) => updateParams({ status: event.target.value }, { resetPage: true })}>
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
          <AdminButton variant="secondary" onClick={() => { updateParams({ search: '', status: '' }, { resetPage: true }); setFinancialFilter('all'); }}>
            {t('bookingOps.filters.reset')}
          </AdminButton>
        </ControlSurface>
      </div>

      <div className="mt-6">
        <WorkspaceLayout
          rail={active ? (
            <>
              <RailSection title={t('bookingOps.actionsPanel')}>
                {active.status === 'completed' ? (
                  <div className="grid gap-2">
                    <Link className="button-secondary w-full text-center" href={`/admin/payments?booking=${active.id}`}>{t('booking.reviewPayment')}</Link>
                    <Link className="button-secondary w-full text-center" href={`/admin/pickup?booking=${active.id}`}>{t('booking.reviewPickup')}</Link>
                    <Link className="button-secondary w-full text-center" href={`/admin/returns?booking=${active.id}`}>{t('booking.reviewReturn')}</Link>
                  </div>
                ) : (
                  <Link className="button-primary w-full text-center" href={actionHref(active)}>{t(actionLabelKey(active))}</Link>
                )}
                <ActionMenu
                  className="w-full"
                  label={t('common.moreActions')}
                  items={[
                    ...(active.status === 'completed'
                      ? [
                          { label: t('booking.reviewPayment'), href: `/admin/payments?booking=${active.id}` },
                          { label: t('booking.reviewPickup'), href: `/admin/pickup?booking=${active.id}` },
                          { label: t('booking.reviewReturn'), href: `/admin/returns?booking=${active.id}` },
                        ]
                      : []),
                    {
                      label: t('bookingOps.actions.requestDeposit'),
                      disabled: !canRequestDeposit(active),
                      onSelect: () => { void requestDeposit(active); },
                    },
                    {
                      label: t('bookingOps.actions.confirmBooking'),
                      disabled: active.status === 'cancelled' || active.status === 'completed',
                      onSelect: () => { void confirmBooking(active); },
                    },
                    ...(active.remaining > 0 ? [{ label: t('bookingOps.actions.collectPayment'), href: `/admin/payments?booking=${active.id}` }] : []),
                    { label: t('bookingOps.actions.pickupDesk'), href: `/admin/pickup?booking=${active.id}` },
                    { label: t('bookingOps.actions.returnDesk'), href: `/admin/returns?booking=${active.id}` },
                    {
                      label: t('bookingOps.actions.cancel'),
                      disabled: active.status === 'cancelled' || active.status === 'completed',
                      tone: 'danger',
                      onSelect: () => { void cancelBooking(active); },
                    },
                  ]}
                />
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
              tableClassName="min-w-[1240px]"
              empty={t('bookingOps.empty')}
              emptyDescription={t('bookingOps.emptyDetail')}
              rowKeys={filteredRows.map((booking) => booking.id)}
              selectedRowKey={active?.id}
              onRowClick={(rowIndex) => setActiveId(filteredRows[rowIndex]?.id ?? '')}
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
                <div key={booking.id} className="grid gap-1">
                  <span className="block font-semibold text-[rgb(var(--text-primary))]">{booking.code}</span>
                  <span className="block text-xs text-[rgb(var(--text-secondary))]">{booking.itemCode}</span>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">{booking.leadId ? `#${booking.leadId}` : '-'}</span>
                </div>,
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
                <div key={`${booking.id}-actions`} className="flex flex-wrap items-center justify-end gap-2">
                  <Link className={cn('min-h-9 px-3 text-sm', booking.status === 'completed' ? 'button-secondary' : 'button-primary')} href={actionHref(booking)}>{t(actionLabelKey(booking))}</Link>
                  <ActionMenu
                    label={t('common.moreActions')}
                    items={[
                      { label: t('common.open'), href: `/admin/bookings/${booking.id}` },
                      ...(booking.status === 'completed'
                        ? [
                            { label: t('booking.reviewPayment'), href: `/admin/payments?booking=${booking.id}` },
                            { label: t('booking.reviewPickup'), href: `/admin/pickup?booking=${booking.id}` },
                            { label: t('booking.reviewReturn'), href: `/admin/returns?booking=${booking.id}` },
                          ]
                        : []),
                      {
                        label: t('bookingOps.actions.requestDeposit'),
                        disabled: !canRequestDeposit(booking),
                        onSelect: () => { void requestDeposit(booking); },
                      },
                      {
                        label: t('bookingOps.actions.confirmBooking'),
                        disabled: booking.status === 'cancelled' || booking.status === 'completed',
                        onSelect: () => { void confirmBooking(booking); },
                      },
                      ...(booking.remaining > 0 ? [{ label: t('bookingOps.actions.collectPayment'), href: `/admin/payments?booking=${booking.id}` }] : []),
                      { label: t('bookingOps.actions.pickupDesk'), href: `/admin/pickup?booking=${booking.id}` },
                      { label: t('bookingOps.actions.returnDesk'), href: `/admin/returns?booking=${booking.id}` },
                      {
                        label: t('bookingOps.actions.cancel'),
                        disabled: booking.status === 'cancelled' || booking.status === 'completed',
                        tone: 'danger',
                        onSelect: () => { void cancelBooking(booking); },
                      },
                    ]}
                  />
                </div>,
              ])}
            />
            <PaginationControls
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              hasNextPage={meta.hasNextPage}
              hasPreviousPage={meta.hasPreviousPage}
              onPageChange={setPage}
              onLimitChange={setLimit}
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
                      tableClassName="min-w-[720px]"
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

                  <SectionCard title={t('bookingOps.detail.sourceSection')} description={t('bookingOps.detail.sourceDesc')} className="shadow-none">
                    <KeyValueList
                      items={[
                        { label: t('bookingOps.detail.sourceLead'), value: active.leadId ? `#${active.leadId}` : '-' },
                        { label: t('bookingOps.detail.sourceAppointment'), value: active.appointmentId ? `#${active.appointmentId}` : '-' },
                        { label: t('bookingOps.detail.sourceFlow'), value: t('bookingOps.detail.sourceFlowValue') },
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
                        detail: item.detail === 'picked_up' || item.detail === 'returned' ? t(`booking.status.${item.detail}`) : item.detail,
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

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageContent />
    </Suspense>
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
