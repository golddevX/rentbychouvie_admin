'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { bookingsApi, paymentsApi, pickupApi } from '@/lib/api';
import { bookings as demoBookings, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  DataTable,
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  SectionCard,
  StatusBadge,
  SummaryRow,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminSpinner, cn } from '@/components/admin/primitives';

type ExpectedItem = {
  itemId: string;
  qrCode: string;
  productName: string;
  variantName?: string | null;
  serialNumber?: string;
};

type ScanRecord = {
  qrCode: string;
  itemId?: string;
  productName?: string;
  variantName?: string | null;
  matched: boolean;
  message: string;
  scannedAt: string;
};

type PaymentRow = {
  id: string;
  bookingId: string;
  status: string;
  type: string;
  amount: number;
  amountPaid: number;
  depositAmount: number;
  securityDepositAmount: number;
};

type PickupBooking = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  status: string;
  pickupDate: string;
  returnDate: string;
  totalPrice: number;
  bookingDepositRequired: number;
  bookingDepositPaid: number;
  securityDepositRequired: number;
  securityDepositHeld: number;
  expectedItems: ExpectedItem[];
  payments: PaymentRow[];
};

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeStatus(value?: string) {
  return String(value ?? '').toLowerCase();
}

function paymentFromApi(row: any): PaymentRow {
  const booking = row.booking ?? row.rental?.booking;
  return {
    id: row.id,
    bookingId: row.bookingId ?? booking?.id ?? '-',
    status: normalizeStatus(row.status),
    type: normalizeStatus(row.type),
    amount: Number(row.amount ?? 0),
    amountPaid: Number(row.amountPaid ?? 0),
    depositAmount: Number(row.depositAmount ?? 0),
    securityDepositAmount: Number(row.securityDepositAmount ?? 0),
  };
}

function bookingFromApi(row: any, externalPayments: PaymentRow[]): PickupBooking {
  const payments = [
    ...(row.rental?.payments ?? []).map(paymentFromApi),
    ...externalPayments.filter((payment) => payment.bookingId === row.id),
  ];
  const uniquePayments = Array.from(new Map(payments.map((payment) => [payment.id, payment])).values());
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? 'Unknown customer',
    phone: row.customer?.phone ?? row.phone,
    status: normalizeStatus(row.status),
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    totalPrice: Number(row.totalPrice ?? row.rentalFee ?? 0),
    bookingDepositRequired: Number(row.bookingDepositRequired ?? row.deposit ?? 0),
    bookingDepositPaid: Number(row.bookingDepositPaid ?? 0),
    securityDepositRequired: Number(row.securityDepositRequired ?? row.refundableDeposit ?? 0),
    securityDepositHeld: Number(row.securityDepositHeld ?? 0),
    expectedItems: (row.items ?? []).map((item: any) => ({
      itemId: item.inventoryItemId,
      qrCode: item.inventoryItem?.qrCode ?? item.inventoryItemId,
      productName: item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
      variantName: ([item.variant?.name, item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || item.inventoryItem?.variant?.name) ?? null,
      serialNumber: item.inventoryItem?.serialNumber,
    })),
    payments: uniquePayments,
  };
}

function bookingFromDemo(row: any): PickupBooking {
  return {
    id: row.id,
    code: row.id,
    customer: row.customer,
    phone: row.phone,
    status: row.status,
    pickupDate: row.pickupAt,
    returnDate: row.returnAt,
    totalPrice: row.rentalFee,
    bookingDepositRequired: row.deposit,
    bookingDepositPaid: row.paid >= row.deposit ? row.deposit : row.paid,
    securityDepositRequired: row.refundableDeposit,
    securityDepositHeld: 0,
    expectedItems: [{
      itemId: row.itemCode,
      qrCode: row.itemCode,
      productName: row.product,
      variantName: row.variant,
      serialNumber: row.itemCode,
    }],
    payments: [],
  };
}

function completedPaidTotal(booking: PickupBooking) {
  return Math.max(
    booking.bookingDepositPaid,
    booking.payments
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amountPaid || payment.amount || 0), 0),
  );
}

function securityPaid(booking: PickupBooking) {
  return Math.max(
    booking.securityDepositHeld,
    booking.payments
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.securityDepositAmount || 0), 0),
  );
}

function paymentPosition(booking?: PickupBooking) {
  if (!booking) return { remaining: 0, securityDue: 0, totalToCollect: 0 };
  const paid = completedPaidTotal(booking);
  const remaining = Math.max(booking.totalPrice - Math.max(0, paid - booking.bookingDepositPaid), 0);
  const securityDue = Math.max(booking.securityDepositRequired - securityPaid(booking), 0);
  return {
    remaining,
    securityDue,
    totalToCollect: remaining + securityDue,
  };
}

function isPickupReady(booking?: PickupBooking) {
  return !!booking && ['confirmed', 'scheduled_pickup'].includes(booking.status);
}

function itemMatched(item: ExpectedItem, scans: ScanRecord[]) {
  return scans.some((scan) => scan.matched && scan.itemId === item.itemId);
}

function queueTone(booking: PickupBooking): Tone {
  if (!isPickupReady(booking)) return 'warning';
  const position = paymentPosition(booking);
  return position.totalToCollect > 0 ? 'warning' : 'success';
}

export default function PickupDeskPage() {
  const { t } = useI18n();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PickupBooking[]>(demoBookings.map(bookingFromDemo));
  const [activeId, setActiveId] = useState(demoBookings[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scansByBooking, setScansByBooking] = useState<Record<string, ScanRecord[]>>({});
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);
  const activeScans = active ? scansByBooking[active.id] ?? [] : [];
  const matchedCount = active ? active.expectedItems.filter((item) => itemMatched(item, activeScans)).length : 0;
  const missingCount = active ? Math.max(active.expectedItems.length - matchedCount, 0) : 0;
  const payment = paymentPosition(active);
  const canConfirm = Boolean(active && isPickupReady(active) && missingCount === 0 && payment.totalToCollect <= 0 && active.expectedItems.length > 0);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, paymentsRes] = await Promise.allSettled([
        bookingsApi.getAll(),
        paymentsApi.getAll(),
      ]);
      const paymentRows = paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data ?? []).map(paymentFromApi) : [];
      const nextRows = bookingsRes.status === 'fulfilled'
        ? (bookingsRes.value.data ?? []).map((booking: any) => bookingFromApi(booking, paymentRows))
        : demoBookings.map(bookingFromDemo);
      const queue = nextRows.filter((booking: PickupBooking) => ['deposit_received', 'confirmed', 'scheduled_pickup'].includes(booking.status));
      const sourceRows = queue.length ? queue : nextRows;
      setRows(sourceRows.length ? sourceRows : demoBookings.map(bookingFromDemo));
      const queryBooking = new URLSearchParams(window.location.search).get('booking');
      setActiveId((current) =>
        sourceRows.find((booking: PickupBooking) => booking.id === queryBooking)?.id ??
        sourceRows.find((booking: PickupBooking) => booking.id === current)?.id ??
        sourceRows[0]?.id ??
        demoBookings[0]?.id ??
        '',
      );
      if (bookingsRes.status === 'rejected') setError(t('pickupOps.errors.loadFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setScanValue('');
    setFeedback(null);
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, [activeId]);

  const scanQr = async (qrCode = scanValue.trim()) => {
    if (!active || !qrCode || busy) return;
    setBusy(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await pickupApi.scan(active.id, qrCode);
      const data = response.data;
      const record: ScanRecord = {
        qrCode,
        itemId: data.scannedItem?.id,
        productName: data.scannedItem?.productName,
        variantName: data.scannedItem?.variantName,
        matched: Boolean(data.matched),
        message: data.message,
        scannedAt: new Date().toISOString(),
      };
      setScansByBooking((current) => {
        const existing = current[active.id] ?? [];
        const withoutDuplicate = existing.filter((item) => item.qrCode !== qrCode);
        return { ...current, [active.id]: [record, ...withoutDuplicate] };
      });
      setFeedback({ tone: data.matched ? 'success' : 'danger', message: data.message });
      setScanValue('');
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('pickupOps.errors.scanFailed') });
    } finally {
      setBusy(false);
      setTimeout(() => scanInputRef.current?.focus(), 0);
    }
  };

  const confirmPickup = async () => {
    if (!active || !canConfirm) return;
    setBusy(true);
    setFeedback(null);
    setError(null);
    try {
      const qrCodes = active.expectedItems.map((item) => item.qrCode);
      await pickupApi.confirm(active.id, qrCodes);
      setFeedback({ tone: 'success', message: t('pickupOps.success.confirmed') });
      await loadBookings();
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('pickupOps.errors.confirmFailed') });
    } finally {
      setBusy(false);
      setTimeout(() => scanInputRef.current?.focus(), 0);
    }
  };

  return (
    <>
      <FeedbackPopup
        feedback={feedback}
        onClose={() => {
          setFeedback(null);
        }}
      />

      <PageHeader
        eyebrow={t('pickupOps.eyebrow')}
        title={t('pickupOps.title')}
        subtitle={t('pickupOps.subtitle')}
        nextStep={active ? `${active.code}: ${payment.totalToCollect > 0 ? t('pickupOps.next.collectPayment') : missingCount > 0 ? t('pickupOps.next.scanMissing') : t('pickupOps.next.confirm')}` : t('pickupOps.next.selectBooking')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadBookings} loading={loading}>{t('common.refresh')}</AdminButton>
            <Link href="/admin/payments" className="button-secondary">{t('pickupOps.actions.collectPayment')}</Link>
            <AdminButton onClick={confirmPickup} loading={busy} disabled={!canConfirm}>{t('pickupOps.actions.confirmPickup')}</AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('pickupOps.stats.queue'), value: rows.length, detail: t('pickupOps.stats.queueDetail'), tone: 'info' },
          { label: t('pickupOps.stats.active'), value: active?.code ?? '-', detail: active?.customer ?? '-', tone: queueTone(active ?? rows[0]) },
          { label: t('pickupOps.stats.scanned'), value: `${matchedCount}/${active?.expectedItems.length ?? 0}`, detail: missingCount ? t('pickupOps.stats.missingCount', { count: missingCount }) : t('pickupOps.stats.allMatched'), tone: missingCount ? 'warning' : 'success' },
          { label: t('pickupOps.stats.collect'), value: currency(payment.totalToCollect), detail: t('pickupOps.stats.collectDetail'), tone: payment.totalToCollect > 0 ? 'danger' : 'success' },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
        <SectionCard title={t('pickupOps.queue.title')} description={t('pickupOps.queue.description')}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</div>
          ) : (
            <div className="space-y-2">
              {rows.map((booking) => {
                const position = paymentPosition(booking);
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => setActiveId(booking.id)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                      active?.id === booking.id ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[rgb(var(--text-primary))]">{booking.code} / {booking.customer}</p>
                        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTime(booking.pickupDate)}</p>
                      </div>
                      <StatusBadge value={booking.status} tone={queueTone(booking)} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AdminBadge tone={position.totalToCollect > 0 ? 'warning' : 'success'}>{currency(position.totalToCollect)}</AdminBadge>
                      <AdminBadge tone={isPickupReady(booking) ? 'success' : 'warning'}>{isPickupReady(booking) ? t('pickupOps.ready') : t('pickupOps.notReady')}</AdminBadge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          {active ? (
            <>
              <SectionCard title={t('pickupOps.workspace.title')} description={t('pickupOps.workspace.description')}>
                {error ? <div className="mb-4"><InlineAlert tone="warning">{error}</InlineAlert></div> : null}
                {feedback ? <div className="mb-4"><InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert></div> : null}
                {!isPickupReady(active) ? <div className="mb-4"><InlineAlert tone="warning">{t('pickupOps.validation.notReady')}</InlineAlert></div> : null}
                {payment.totalToCollect > 0 ? <div className="mb-4"><InlineAlert tone="danger">{t('pickupOps.validation.paymentBlocked')}</InlineAlert></div> : null}

                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('pickupOps.bookingContext')}</p>
                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{active.customer}</h2>
                          <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{active.code} / {active.phone ?? '-'}</p>
                        </div>
                        <StatusBadge value={active.status} tone={queueTone(active)} />
                      </div>
                    </div>

                    <KeyValueList
                      items={[
                        { label: t('pickupOps.fields.pickup'), value: formatDateTime(active.pickupDate) },
                        { label: t('pickupOps.fields.return'), value: formatDateTime(active.returnDate) },
                        { label: t('pickupOps.fields.items'), value: active.expectedItems.length },
                        { label: t('pickupOps.fields.matched'), value: `${matchedCount}/${active.expectedItems.length}` },
                      ]}
                    />

                    <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4">
                      <label className="grid gap-2 text-sm font-semibold">
                        {t('pickupOps.scan.label')}
                        <input
                          ref={scanInputRef}
                          className="field h-14 text-lg font-semibold tracking-wide"
                          value={scanValue}
                          onChange={(event) => setScanValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void scanQr();
                            }
                          }}
                          placeholder={t('pickupOps.scan.placeholder')}
                          autoFocus
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AdminButton onClick={() => scanQr()} loading={busy} disabled={!scanValue.trim()}>{t('pickupOps.scan.submit')}</AdminButton>
                        <AdminButton variant="secondary" onClick={() => { setScanValue(''); scanInputRef.current?.focus(); }}>{t('pickupOps.scan.clear')}</AdminButton>
                      </div>
                    </div>
                  </div>

                  <SectionCard title={t('pickupOps.payment.title')} description={t('pickupOps.payment.description')} className="shadow-none">
                    <div className="space-y-3 text-sm">
                      <MoneyRow label={t('pickupOps.payment.remaining')} value={payment.remaining} tone={payment.remaining > 0 ? 'danger' : 'success'} />
                      <MoneyRow label={t('pickupOps.payment.securityDeposit')} value={payment.securityDue} tone={payment.securityDue > 0 ? 'warning' : 'success'} />
                      <MoneyRow label={t('pickupOps.payment.totalToCollect')} value={payment.totalToCollect} tone={payment.totalToCollect > 0 ? 'danger' : 'success'} strong />
                    </div>
                    <div className="mt-5 grid gap-2">
                      <Link className="button-primary w-full text-center" href={`/admin/payments/from-booking/${active.id}`}>{t('pickupOps.actions.collectPayment')}</Link>
                      <AdminButton className="w-full" onClick={confirmPickup} loading={busy} disabled={!canConfirm}>{t('pickupOps.actions.confirmPickup')}</AdminButton>
                    </div>
                  </SectionCard>
                </div>
              </SectionCard>

              <SectionCard title={t('pickupOps.expected.title')} description={t('pickupOps.expected.description')}>
                <DataTable
                  columns={[t('pickupOps.expected.item'), t('pickupOps.expected.product'), t('pickupOps.expected.expectedQr'), t('pickupOps.expected.scanState')]}
                  rows={active.expectedItems.map((item) => {
                    const matched = itemMatched(item, activeScans);
                    return [
                      <div key={`${item.itemId}-item`}>
                        <p className="font-semibold text-[rgb(var(--text-primary))]">{item.serialNumber ?? item.itemId}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">{item.variantName ?? '-'}</p>
                      </div>,
                      item.productName,
                      <span key={`${item.itemId}-qr`} className="font-mono text-xs">{item.qrCode}</span>,
                      <StatusBadge key={`${item.itemId}-status`} value={matched ? t('pickupOps.expected.matched') : t('pickupOps.expected.missing')} tone={matched ? 'success' : 'warning'} />,
                    ];
                  })}
                />
              </SectionCard>

              <SectionCard title={t('pickupOps.scanLog.title')} description={t('pickupOps.scanLog.description')}>
                <DataTable
                  empty={t('pickupOps.scanLog.empty')}
                  columns={[t('pickupOps.scanLog.qr'), t('pickupOps.scanLog.item'), t('common.status'), t('pickupOps.scanLog.time')]}
                  rows={activeScans.map((scan) => [
                    <span key={`${scan.qrCode}-qr`} className="font-mono text-xs">{scan.qrCode}</span>,
                    scan.productName ?? '-',
                    <StatusBadge key={`${scan.qrCode}-status`} value={scan.matched ? t('pickupOps.expected.matched') : t('pickupOps.expected.mismatch')} tone={scan.matched ? 'success' : 'danger'} />,
                    formatDateTime(scan.scannedAt),
                  ])}
                />
              </SectionCard>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function MoneyRow({ label, value, tone, strong = false }: { label: string; value: number; tone: Tone; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3', strong && 'border border-[rgb(var(--surface-border))]')}>
      <span className="text-[rgb(var(--text-secondary))]">{label}</span>
      <span className={cn('font-semibold', tone === 'danger' && 'text-[rgb(var(--danger))]', tone === 'warning' && 'text-[rgb(var(--warning))]', tone === 'success' && 'text-[rgb(var(--success))]')}>
        {currency(value)}
      </span>
    </div>
  );
}
