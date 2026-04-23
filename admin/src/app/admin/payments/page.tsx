'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { bookings as demoBookings, payments as demoPayments, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  ControlSurface,
  DataTable,
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

type DeskPaymentType =
  | 'booking_deposit'
  | 'rental_payment'
  | 'security_deposit'
  | 'late_fee'
  | 'damage_fee'
  | 'accessory_fee'
  | 'dirty_hold'
  | 'refund';

type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOMO' | 'ZALO_PAY';

type BookingContext = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  status: string;
  product: string;
  variant: string;
  pickupDate?: string;
  returnDate?: string;
  rentalId?: string;
  rentalTotal: number;
  discount: number;
  earlyPickupFee: number;
  totalRental: number;
  bookingDepositRequired: number;
  depositPaid: number;
  remaining: number;
  securityDeposit: number;
  netPayable: number;
  payments: PaymentRow[];
};

type PaymentRow = {
  id: string;
  bookingId: string;
  rentalId?: string;
  customer: string;
  type: string;
  method: string;
  status: string;
  amount: number;
  rentalAmount: number;
  depositAmount: number;
  securityDepositAmount: number;
  description?: string;
  paidAt?: string;
  createdAt?: string;
  receiptId?: string;
};

const PAYMENT_TYPES: DeskPaymentType[] = [
  'booking_deposit',
  'rental_payment',
  'security_deposit',
  'late_fee',
  'damage_fee',
  'accessory_fee',
  'dirty_hold',
  'refund',
];

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOMO', 'ZALO_PAY'];

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

function normalizePaymentType(value?: string) {
  return String(value ?? 'rental_payment').toLowerCase();
}

function paymentFromApi(row: any): PaymentRow {
  const booking = row.booking ?? row.rental?.booking;
  return {
    id: row.id,
    bookingId: row.bookingId ?? booking?.id ?? '-',
    rentalId: row.rentalId ?? row.rental?.id,
    customer: booking?.customer?.name ?? row.customer ?? '-',
    type: normalizePaymentType(row.type),
    method: normalizePaymentType(row.paymentMethod ?? row.method ?? 'pending'),
    status: normalizePaymentType(row.status),
    amount: Number(row.amount ?? 0),
    rentalAmount: Number(row.rentalAmount ?? 0),
    depositAmount: Number(row.depositAmount ?? 0),
    securityDepositAmount: Number(row.securityDepositAmount ?? 0),
    description: row.description,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    receiptId: row.receipts?.[0]?.receiptNumber ?? row.receiptId,
  };
}

function paymentFromDemo(row: any): PaymentRow {
  return {
    id: row.id,
    bookingId: row.bookingId,
    customer: row.customer,
    type: row.type,
    method: row.method,
    status: row.status,
    amount: row.amount,
    rentalAmount: row.type === 'rental_payment' ? row.amount : 0,
    depositAmount: row.type === 'booking_deposit' ? row.amount : 0,
    securityDepositAmount: row.type === 'security_deposit' ? row.amount : 0,
    paidAt: row.paidAt,
    receiptId: row.receiptId,
  };
}

function bookingFromApi(row: any, allPayments: PaymentRow[]): BookingContext {
  const firstItem = row.items?.[0] ?? {};
  const inventoryItem = firstItem.inventoryItem ?? {};
  const product = firstItem.product ?? inventoryItem.product ?? {};
  const variant = firstItem.variant ?? inventoryItem.variant ?? {};
  const payments = [
    ...(row.rental?.payments ?? []).map(paymentFromApi),
    ...allPayments.filter((payment) => payment.bookingId === row.id),
  ];
  const uniquePayments = Array.from(new Map(payments.map((payment) => [payment.id, payment])).values());
  const completed = uniquePayments.filter((payment) => payment.status === 'completed');
  const depositPaid = Math.max(
    Number(row.bookingDepositPaid ?? 0),
    completed.reduce((sum, payment) => sum + Number(payment.depositAmount || 0), 0),
  );
  const paidTotal = completed.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const rentalTotal = Number(row.basePrice ?? row.totalPrice ?? row.rentalFee ?? 0);
  const totalRental = Number(row.totalPrice ?? rentalTotal);
  const discount = Math.max(0, rentalTotal - totalRental);
  const earlyPickupFee = Math.max(0, Number(row.priceAdjustment ?? 0));
  const bookingDepositRequired = Number(row.bookingDepositRequired ?? row.deposit ?? 0);
  const securityDeposit = Number(row.securityDepositRequired ?? row.refundableDeposit ?? 0);
  const remaining = Math.max(totalRental - Math.max(0, paidTotal - depositPaid), 0);
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? 'Unknown customer',
    phone: row.customer?.phone ?? row.phone,
    status: String(row.status ?? 'DRAFT').toLowerCase(),
    product: product.name ?? row.product ?? '-',
    variant: [variant.name, variant.size, variant.color].filter(Boolean).join(' / ') || row.variant || '-',
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    rentalId: row.rental?.id,
    rentalTotal,
    discount,
    earlyPickupFee,
    totalRental,
    bookingDepositRequired,
    depositPaid,
    remaining,
    securityDeposit,
    netPayable: remaining + Math.max(0, bookingDepositRequired - depositPaid),
    payments: uniquePayments.sort((a, b) => new Date(b.createdAt ?? b.paidAt ?? 0).getTime() - new Date(a.createdAt ?? a.paidAt ?? 0).getTime()),
  };
}

function bookingFromDemo(row: any, allPayments: PaymentRow[]): BookingContext {
  const payments = allPayments.filter((payment) => payment.bookingId === row.id);
  const depositPaid = payments.filter((payment) => payment.type === 'booking_deposit' && payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
  const paidTotal = payments.filter((payment) => payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
  return {
    id: row.id,
    code: row.id,
    customer: row.customer,
    phone: row.phone,
    status: row.status,
    product: row.product,
    variant: row.variant,
    pickupDate: row.startDate,
    returnDate: row.endDate,
    rentalId: row.id,
    rentalTotal: row.rentalFee,
    discount: 0,
    earlyPickupFee: 0,
    totalRental: row.rentalFee,
    bookingDepositRequired: row.deposit,
    depositPaid,
    remaining: Math.max(row.rentalFee - Math.max(0, paidTotal - depositPaid), 0),
    securityDeposit: row.refundableDeposit,
    netPayable: Math.max(row.rentalFee + row.deposit - paidTotal, 0),
    payments,
  };
}

function backendType(type: DeskPaymentType) {
  if (type === 'booking_deposit') return 'BOOKING_DEPOSIT';
  if (type === 'rental_payment') return 'RENTAL_PAYMENT';
  if (type === 'security_deposit') return 'SECURITY_DEPOSIT';
  if (type === 'refund') return 'REFUND';
  return 'FEE';
}

function suggestedAmount(type: DeskPaymentType, booking?: BookingContext) {
  if (!booking) return 0;
  if (type === 'booking_deposit') return Math.max(booking.bookingDepositRequired - booking.depositPaid, 0);
  if (type === 'rental_payment') return booking.remaining;
  if (type === 'security_deposit') return booking.securityDeposit;
  if (type === 'refund') return booking.securityDeposit;
  return 0;
}

function nextAction(booking?: BookingContext) {
  if (!booking) return 'paymentOps.next.selectBooking';
  if (booking.depositPaid < booking.bookingDepositRequired) return 'paymentOps.next.collectDeposit';
  if (booking.remaining > 0) return 'paymentOps.next.collectRental';
  if (booking.securityDeposit > 0 && !booking.payments.some((payment) => payment.type === 'security_deposit' && payment.status === 'completed')) return 'paymentOps.next.holdSecurity';
  return 'paymentOps.next.ready';
}

function paymentTone(type: string): Tone {
  if (type === 'refund') return 'danger';
  if (type.includes('deposit')) return 'warning';
  if (type === 'rental_payment') return 'success';
  if (type === 'fee') return 'accent';
  return 'info';
}

export default function PaymentsPage() {
  const { t } = useI18n();
  const demoPaymentRows = useMemo(() => demoPayments.map(paymentFromDemo), []);
  const [bookings, setBookings] = useState<BookingContext[]>(demoBookings.map((booking) => bookingFromDemo(booking, demoPaymentRows)));
  const [payments, setPayments] = useState<PaymentRow[]>(demoPaymentRows);
  const [activeBookingId, setActiveBookingId] = useState(demoBookings[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeskPaymentType>('all');
  const [paymentType, setPaymentType] = useState<DeskPaymentType>('booking_deposit');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);

  const activeBooking = useMemo(() => bookings.find((booking) => booking.id === activeBookingId) ?? bookings[0], [activeBookingId, bookings]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsRes, bookingsRes] = await Promise.allSettled([
        paymentsApi.getAll(),
        bookingsApi.getAll(),
      ]);
      const paymentRows = paymentsRes.status === 'fulfilled' ? (paymentsRes.value.data ?? []).map(paymentFromApi) : demoPaymentRows;
      const bookingRows = bookingsRes.status === 'fulfilled'
        ? (bookingsRes.value.data ?? []).map((booking: any) => bookingFromApi(booking, paymentRows))
        : demoBookings.map((booking) => bookingFromDemo(booking, paymentRows));
      setPayments(paymentRows);
      setBookings(bookingRows.length ? bookingRows : demoBookings.map((booking) => bookingFromDemo(booking, paymentRows)));
      setActiveBookingId((current) => bookingRows.find((booking: BookingContext) => booking.id === current)?.id ?? bookingRows[0]?.id ?? demoBookings[0]?.id ?? '');
      if (paymentsRes.status === 'rejected' || bookingsRes.status === 'rejected') setError(t('paymentOps.errors.loadFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAmount(suggestedAmount(paymentType, activeBooking));
  }, [activeBooking, paymentType]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (!normalizedQuery) return true;
      return [booking.code, booking.customer, booking.phone, booking.product, booking.variant].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
    });
  }, [bookings, query]);

  const filteredPayments = useMemo(() => {
    const rows = activeBooking?.payments?.length ? activeBooking.payments : payments.filter((payment) => payment.bookingId === activeBooking?.id);
    return rows.filter((payment) => typeFilter === 'all' || payment.type === typeFilter || (typeFilter.endsWith('_fee') && payment.type === 'fee'));
  }, [activeBooking, payments, typeFilter]);

  const totals = useMemo(() => payments.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.type] = (acc[payment.type] ?? 0) + payment.amount;
    return acc;
  }, {}), [payments]);

  const invalidReason = useMemo(() => {
    if (!activeBooking) return t('paymentOps.validation.selectBooking');
    if (amount <= 0) return t('paymentOps.validation.amount');
    if ((paymentType === 'security_deposit' || paymentType === 'late_fee' || paymentType === 'damage_fee' || paymentType === 'accessory_fee' || paymentType === 'dirty_hold' || paymentType === 'refund') && !activeBooking.rentalId) {
      return t('paymentOps.validation.needsRental');
    }
    if (paymentType === 'booking_deposit' && activeBooking.depositPaid >= activeBooking.bookingDepositRequired) return t('paymentOps.validation.depositPaid');
    if (paymentType === 'rental_payment' && activeBooking.remaining <= 0) return t('paymentOps.validation.rentalPaid');
    return null;
  }, [activeBooking, amount, paymentType, t]);

  const submitPayment = async () => {
    if (!activeBooking || invalidReason) return;
    setBusyAction('submit');
    setError(null);
    setFeedback(null);
    try {
      if (paymentType === 'booking_deposit') {
        if (method === 'CASH') {
          await bookingsApi.recordBookingDeposit(activeBooking.id, amount, method);
        } else {
          await paymentsApi.initializeBooking(activeBooking.id, {
            paymentType: 'deposit',
            depositAmount: amount,
            provider: 'PAYOS',
            currency: 'VND',
          });
        }
      } else if (paymentType === 'rental_payment' && !activeBooking.rentalId) {
        await paymentsApi.initializeBooking(activeBooking.id, {
          paymentType: 'remaining',
          provider: 'PAYOS',
          currency: 'VND',
        });
      } else {
        await paymentsApi.create({
          rentalId: activeBooking.rentalId,
          bookingId: activeBooking.id,
          type: backendType(paymentType),
          amount,
          rentalAmount: paymentType === 'rental_payment' ? amount : 0,
          depositAmount: 0,
          securityDepositAmount: paymentType === 'security_deposit' ? amount : 0,
          paymentMethod: method,
          description: t(`paymentOps.type.${paymentType}`),
        });
      }
      await loadData();
      setFeedback({ tone: 'success', message: t('paymentOps.success.created') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paymentOps.errors.actionFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const processPayment = async (payment: PaymentRow) => {
    setBusyAction(payment.id);
    setError(null);
    try {
      await paymentsApi.process(payment.id, `ADMIN-${Date.now()}`);
      await loadData();
      setFeedback({ tone: 'success', message: t('paymentOps.success.processed') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paymentOps.errors.actionFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('paymentOps.eyebrow')}
        title={t('paymentOps.title')}
        subtitle={t('paymentOps.subtitle')}
        nextStep={t(nextAction(activeBooking))}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadData} loading={loading}>{t('common.refresh')}</AdminButton>
            <Link href="/admin/bookings" className="button-primary">{t('paymentOps.actions.openBookings')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('paymentOps.stats.bookingDeposits'), value: currency(totals.booking_deposit ?? 0), detail: t('paymentOps.stats.depositDetail'), tone: 'warning' },
          { label: t('paymentOps.stats.rentalPayments'), value: currency(totals.rental_payment ?? 0), detail: t('paymentOps.stats.rentalDetail'), tone: 'success' },
          { label: t('paymentOps.stats.securityDeposits'), value: currency(totals.security_deposit ?? 0), detail: t('paymentOps.stats.securityDetail'), tone: 'info' },
          { label: t('paymentOps.stats.refundsFees'), value: currency((totals.refund ?? 0) + (totals.fee ?? 0)), detail: t('paymentOps.stats.refundsFeesDetail'), tone: 'accent' },
        ]}
      />

      <div className="mt-6">
        <ControlSurface label={t('paymentOps.controls.label')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('paymentOps.controls.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <AdminSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | DeskPaymentType)}>
            <option value="all">{t('paymentOps.controls.allTypes')}</option>
            {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{t(`paymentOps.type.${type}`)}</option>)}
          </AdminSelect>
          <AdminSelect value={activeBooking?.id ?? ''} onChange={(event) => setActiveBookingId(event.target.value)}>
            {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.code} / {booking.customer}</option>)}
          </AdminSelect>
        </ControlSurface>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title={t('paymentOps.booking.title')} description={t('paymentOps.booking.description')}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</div>
          ) : (
            <div className="space-y-2">
              {filteredBookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setActiveBookingId(booking.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                    activeBooking?.id === booking.id ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[rgb(var(--text-primary))]">{booking.code} / {booking.customer}</p>
                      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{booking.product} / {booking.variant}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-[rgb(var(--text-secondary))] md:grid-cols-3">
                    <span>{t('paymentOps.booking.pickup')}: <b>{formatDate(booking.pickupDate)}</b></span>
                    <span>{t('paymentOps.booking.remaining')}: <b>{currency(booking.remaining)}</b></span>
                    <span>{t('paymentOps.booking.netPayable')}: <b>{currency(booking.netPayable)}</b></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('paymentOps.workspace.title')} description={t('paymentOps.workspace.description')}>
          {error ? <div className="mb-4"><InlineAlert tone="warning">{error}</InlineAlert></div> : null}
          {feedback ? <div className="mb-4"><InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert></div> : null}
          {activeBooking ? (
            <WorkspaceLayout
              rail={
                <>
                  <RailSection title={t('paymentOps.actions.panel')}>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('paymentOps.actions.paymentType')}
                      <AdminSelect value={paymentType} onChange={(event) => setPaymentType(event.target.value as DeskPaymentType)}>
                        {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{t(`paymentOps.type.${type}`)}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('paymentOps.actions.method')}
                      <AdminSelect value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                        {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{t(`paymentOps.method.${item.toLowerCase()}`)}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('paymentOps.actions.amount')}
                      <AdminInput type="number" min={0} value={amount} onChange={(event) => setAmount(Number(event.target.value || 0))} />
                    </label>
                    {invalidReason ? <InlineAlert tone="warning">{invalidReason}</InlineAlert> : null}
                    <AdminButton className="w-full" onClick={submitPayment} loading={busyAction === 'submit'} disabled={!!invalidReason}>
                      {t('paymentOps.actions.submit', { type: t(`paymentOps.type.${paymentType}`) })}
                    </AdminButton>
                  </RailSection>
                  <RailSection title={t('paymentOps.nextPanel.title')}>
                    <InlineAlert tone={activeBooking.netPayable > 0 ? 'warning' : 'success'}>{t(nextAction(activeBooking))}</InlineAlert>
                    <Link href={`/admin/bookings/${activeBooking.id}`} className="button-secondary w-full text-center">{t('paymentOps.actions.openBooking')}</Link>
                  </RailSection>
                </>
              }
            >
              <SectionCard title={t('paymentOps.breakdown.title')} description={t('paymentOps.breakdown.description')} className="shadow-none">
                <KeyValueList
                  items={[
                    { label: t('paymentOps.breakdown.rentalTotal'), value: currency(activeBooking.rentalTotal) },
                    { label: t('paymentOps.breakdown.discount'), value: currency(activeBooking.discount) },
                    { label: t('paymentOps.breakdown.earlyPickupFee'), value: currency(activeBooking.earlyPickupFee) },
                    { label: t('paymentOps.breakdown.totalRental'), value: currency(activeBooking.totalRental) },
                    { label: t('paymentOps.breakdown.depositPaid'), value: currency(activeBooking.depositPaid) },
                    { label: t('paymentOps.breakdown.remaining'), value: <span className={cn(activeBooking.remaining > 0 && 'text-[rgb(var(--danger))]')}>{currency(activeBooking.remaining)}</span> },
                    { label: t('paymentOps.breakdown.securityDeposit'), value: currency(activeBooking.securityDeposit) },
                    { label: t('paymentOps.breakdown.netPayable'), value: <span className="text-[rgb(var(--accent-solid))]">{currency(activeBooking.netPayable)}</span> },
                  ]}
                />
              </SectionCard>
              <SectionCard title={t('paymentOps.context.title')} description={t('paymentOps.context.description')} className="shadow-none">
                <KeyValueList
                  items={[
                    { label: t('paymentOps.context.booking'), value: activeBooking.code },
                    { label: t('paymentOps.context.customer'), value: activeBooking.customer },
                    { label: t('paymentOps.context.product'), value: activeBooking.product },
                    { label: t('paymentOps.context.variant'), value: activeBooking.variant },
                    { label: t('paymentOps.context.pickup'), value: formatDate(activeBooking.pickupDate) },
                    { label: t('paymentOps.context.return'), value: formatDate(activeBooking.returnDate) },
                  ]}
                />
              </SectionCard>
            </WorkspaceLayout>
          ) : null}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title={t('paymentOps.history.title')} description={t('paymentOps.history.description')}>
          <DataTable
            loading={loading}
            empty={t('paymentOps.history.empty')}
            columns={[
              t('paymentOps.history.payment'),
              t('paymentOps.history.booking'),
              t('paymentOps.history.type'),
              t('paymentOps.history.method'),
              t('paymentOps.history.amount'),
              t('paymentOps.history.status'),
              t('paymentOps.history.created'),
              t('common.actions'),
            ]}
            rows={filteredPayments.map((payment) => [
              <div key={payment.id}>
                <p className="font-semibold text-[rgb(var(--text-primary))]">{payment.id}</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{payment.description ?? '-'}</p>
              </div>,
              payment.bookingId,
              <AdminBadge key={`${payment.id}-type`} tone={paymentTone(payment.type)}>{payment.type.replace(/_/g, ' ')}</AdminBadge>,
              payment.method.replace(/_/g, ' '),
              currency(payment.amount),
              <StatusBadge key={`${payment.id}-status`} value={payment.status} />,
              formatDateTime(payment.createdAt ?? payment.paidAt),
              <div key={`${payment.id}-actions`} className="flex flex-wrap gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => processPayment(payment)} loading={busyAction === payment.id} disabled={payment.status === 'completed'}>
                  {t('paymentOps.actions.markCompleted')}
                </AdminButton>
                {payment.receiptId ? <Link className="button-secondary min-h-9 px-3 text-sm" href={`/admin/receipts/${payment.receiptId}`}>{t('paymentOps.actions.receipt')}</Link> : null}
              </div>,
            ])}
          />
          <div className="mt-5">
            <TimelineList
              items={filteredPayments.slice(0, 6).map((payment) => ({
                time: formatDateTime(payment.createdAt ?? payment.paidAt),
                title: `${payment.type.replace(/_/g, ' ')} / ${currency(payment.amount)}`,
                detail: payment.description ?? payment.status,
                tone: paymentTone(payment.type),
              }))}
            />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
