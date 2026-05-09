'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi, paymentsApi, pickupApi } from '@/lib/api';
import { bookings as demoBookings, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import {
  BookingContextCard,
  FlowActions,
  MoneyDisplay,
  QueueList,
} from '@/components/admin/order-flow-ui';
import {
  ActionMenu,
  FeedbackPopup,
  InlineAlert,
  PageHeader,
  PaginationControls,
  SectionCard,
  StatusBadge,
  SummaryRow,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminSpinner, cn } from '@/components/admin/primitives';

type PickupBooking = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  status: string;
  pickupDate: string;
  returnDate: string;
  securityDepositPaid: number;
  depositRequired: number;
  rentalRemaining: number;
  amountDueNow: number;
  canPickup: boolean;
  pickupBlockedReasons: string[];
  productLabel: string;
  handoverImages: string[];
  handoverNote?: string;
  products: Array<{
    id: string;
    name: string;
    image?: string;
    qrCode?: string;
    status?: string;
  }>;
};

function parseImages(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

type BookingPaymentSummary = {
  rentalRemaining: number;
  securityDepositPaid: number;
  depositRequired?: number;
  securityDepositRequiredByRate: number;
  amountDueNow: number;
  canPickup: boolean;
  pickupBlockedReasons: string[];
  products?: Array<{
    id: string;
    name: string;
    image?: string;
    qrCode?: string;
    status?: string;
  }>;
};

function normalizeStatus(value?: string) {
  return String(value ?? '').toLowerCase();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function queueTone(booking: PickupBooking): Tone {
  if (booking.amountDueNow > 0) return 'warning';
  if (booking.canPickup) return 'success';
  return 'neutral';
}

function bookingFromApi(row: any, summary?: BookingPaymentSummary, labels?: { unknownCustomer: string }): PickupBooking {
  const summaryProducts = Array.isArray(summary?.products) ? summary.products : [];
  const bookingProducts = Array.isArray(row.items)
    ? row.items.map((item: any) => ({
        id: item.inventoryItemId ?? item.productId,
        name: item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
        image: item.product?.image ?? item.inventoryItem?.product?.image,
        qrCode: item.inventoryItem?.qrCode ?? item.product?.qrCode ?? item.inventoryItemId ?? item.productId,
        status: normalizeStatus(item.inventoryItem?.status ?? item.product?.status),
      }))
    : [];
  const products = summaryProducts.length ? summaryProducts : bookingProducts;
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? labels?.unknownCustomer ?? '-',
    phone: row.customer?.phone ?? row.phone,
    status: normalizeStatus(row.status),
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    securityDepositPaid: Number(summary?.securityDepositPaid ?? 0),
    depositRequired: Number(summary?.depositRequired ?? summary?.securityDepositRequiredByRate ?? 0),
    rentalRemaining: Number(summary?.rentalRemaining ?? 0),
    amountDueNow: Number(summary?.amountDueNow ?? 0),
    canPickup: Boolean(summary?.canPickup),
    pickupBlockedReasons: Array.isArray(summary?.pickupBlockedReasons) ? summary.pickupBlockedReasons.map(String) : [],
    productLabel: products.map((product: { name: string }) => product.name).join(', ') || '-',
    handoverImages: parseImages(row.handoverRecord?.images),
    handoverNote: row.handoverRecord?.note ?? '',
    products,
  };
}

function bookingFromDemo(row: any): PickupBooking {
  return {
    id: row.id,
    code: row.id,
    customer: row.customer,
    phone: row.phone,
    status: normalizeStatus(row.status),
    pickupDate: row.pickupAt,
    returnDate: row.returnAt,
    securityDepositPaid: Number(row.refundableDeposit ?? 0),
    depositRequired: Number(row.refundableDeposit ?? 0),
    rentalRemaining: Math.max(Number(row.rentalFee ?? 0) - Number(row.paid ?? 0), 0),
    amountDueNow: Math.max(Number(row.rentalFee ?? 0) - Number(row.paid ?? 0), 0),
    canPickup: false,
    pickupBlockedReasons: ['rental_unpaid'],
    productLabel: row.product,
    handoverImages: [],
    handoverNote: '',
    products: [{
      id: row.id,
      name: row.product,
      qrCode: row.itemCode,
      status: 'reserved',
    }],
  };
}

function PickupDeskPageContent() {
  const { t } = useI18n();
  const labels = useMemo(() => ({ unknownCustomer: t('leadOps.fallback.unknownCustomer') }), [t]);
  const searchParams = useSearchParams();
  const { params, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'pickupDate',
    sortOrder: 'asc',
  });
  const [rows, setRows] = useState<PickupBooking[]>(demoBookings.map(bookingFromDemo));
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [handoverImages, setHandoverImages] = useState<string[]>(['', '', '', '']);
  const [handoverNote, setHandoverNote] = useState('');
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);
  const reviewMode = Boolean(active && ['picked_up', 'return_pending', 'settlement_pending', 'returned', 'completed'].includes(active.status));
  const completedImages = handoverImages.filter((value) => value.trim()).length;
  const canConfirm = Boolean(
    active
    && !reviewMode
    && active.canPickup
    && active.products.length > 0
    && completedImages === 4,
  );

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const bookingsRes = await bookingsApi.list({
        page: params.page,
        limit: params.limit,
        sortBy: 'pickupDate',
        sortOrder: 'asc',
        statuses: 'DEPOSIT_RECEIVED,CONFIRMED,READY_FOR_PICKUP,AWAITING_REMAINING_PAYMENT,AWAITING_SECURITY_DEPOSIT',
      });
      const bookingSource = bookingsRes.data?.data ?? [];
      setMeta(bookingsRes.data?.meta ?? { page: params.page, limit: params.limit, total: bookingSource.length, totalPages: bookingSource.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      const summaryResults = await Promise.allSettled(
        bookingSource.map((booking: any) => paymentsApi.getByBooking(booking.id)),
      );
      const nextRows = bookingSource.map((booking: any, index: number) => {
        const summaryResult = summaryResults[index];
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data?.summary as BookingPaymentSummary : undefined;
        return bookingFromApi(booking, summary, labels);
      });
      const queryBooking = searchParams.get('booking');
      let sourceRows = nextRows;
      if (queryBooking && !sourceRows.some((booking: PickupBooking) => booking.id === queryBooking)) {
        try {
          const [bookingRes, paymentRes] = await Promise.all([
            bookingsApi.getById(queryBooking),
            paymentsApi.getByBooking(queryBooking),
          ]);
          sourceRows = [
            bookingFromApi(bookingRes.data, paymentRes.data?.summary as BookingPaymentSummary | undefined, labels),
            ...sourceRows,
          ];
        } catch {
          // Keep the queue visible even when the review booking cannot be loaded.
        }
      }
      setRows(sourceRows);
      setActiveId((current) => {
        return sourceRows.find((booking: PickupBooking) => booking.id === queryBooking)?.id
          ?? sourceRows.find((booking: PickupBooking) => booking.id === current)?.id
          ?? sourceRows[0]?.id
          ?? '';
      });
      if (summaryResults.some((result) => result.status === 'rejected')) {
        setError(t('pickupOps.errors.loadFallback'));
      }
    } catch {
      setRows(demoBookings.map(bookingFromDemo));
      setMeta({ page: 1, limit: demoBookings.length, total: demoBookings.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
      setActiveId(demoBookings[0]?.id ?? '');
      setError(t('pickupOps.errors.loadFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [params.limit, params.page]);

  useEffect(() => {
    if (reviewMode && active) {
      setHandoverImages(active.handoverImages.length ? active.handoverImages : ['', '', '', '']);
      setHandoverNote(active.handoverNote ?? '');
      return;
    }
    setHandoverImages(['', '', '', '']);
    setHandoverNote('');
  }, [active, activeId, reviewMode]);

  const confirmPickup = async () => {
    if (!active || !canConfirm) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await pickupApi.confirm(active.id, handoverImages.map((value) => value.trim()), handoverNote || undefined);
      setFeedback({ tone: 'success', message: t('pickup.feedback.confirmed') });
      await loadBookings();
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('pickupOps.errors.confirmFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />

      <PageHeader
        eyebrow={t('pickupOps.eyebrow')}
        title={t('pickup.title')}
        subtitle={t('pickup.subtitle')}
        nextStep={active ? `${active.code}: ${active.canPickup ? t('handover.confirm') : t('payment.summary.amount_due_now')}` : t('pickupOps.next.selectBooking')}
        actions={(
          <>
            <AdminButton variant="secondary" onClick={() => void loadBookings()} loading={loading}>{t('common.refresh')}</AdminButton>
            {active && !reviewMode && !active.canPickup ? <Link href={`/admin/payments?booking=${active.id}`} className="button-primary">{t('pickup.actions.open_payment')}</Link> : null}
            {active && !reviewMode && active.canPickup ? <AdminButton onClick={() => void confirmPickup()} loading={busy} disabled={!canConfirm}>{t('handover.confirm')}</AdminButton> : null}
            {active ? (
              <ActionMenu
                label={t('common.moreActions')}
                items={[
                  { label: reviewMode ? t('booking.reviewPayment') : t('pickup.actions.open_payment'), href: `/admin/payments?booking=${active.id}` },
                  { label: t('pickup.actions.open_booking'), href: `/admin/bookings/${active.id}` },
                  { label: t('booking.reviewReturn'), href: `/admin/returns?booking=${active.id}` },
                ]}
              />
            ) : null}
          </>
        )}
      />

      <SummaryRow
        items={[
          { label: t('pickupOps.stats.queue'), value: rows.length, detail: t('pickupOps.stats.queueDetail'), tone: 'info' },
          { label: t('pickupOps.stats.active'), value: active?.code ?? '-', detail: active?.customer ?? '-', tone: active ? queueTone(active) : 'neutral' },
          { label: t('handover.images'), value: `${completedImages}/4`, detail: t('pickup.subtitle'), tone: completedImages === 4 ? 'success' : 'warning' },
          { label: t('payment.summary.amount_due_now'), value: <MoneyDisplay value={active?.amountDueNow ?? 0} strong />, detail: t('pickupOps.stats.collectDetail'), tone: (active?.amountDueNow ?? 0) > 0 ? 'danger' : 'success' },
        ]}
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
        <QueueList
          title={t('pickup.queue.title')}
          description={t('pickup.queue.description')}
          items={rows.map((booking) => ({
            id: booking.id,
            title: `${booking.code} / ${booking.customer}`,
            subtitle: booking.productLabel,
            meta: `${t('pickup.queue.pickup_time')}: ${formatDateTime(booking.pickupDate)}`,
            helper: booking.amountDueNow > 0 ? t('pickup.validation.missing_payment') : t('pickup.queue.ready_helper'),
            badges: [
              { label: booking.amountDueNow > 0 ? t('pickup.queue.payment_due') : t('pickup.queue.payment_ready'), tone: booking.amountDueNow > 0 ? 'warning' : 'success' },
              { label: `${booking.products.length} ${t('pickup.queue.expected_items')}`, tone: 'info' },
            ],
            nextStep: booking.amountDueNow > 0 ? t('pickup.actions.open_payment') : t('handover.confirm'),
            status: booking.status,
            statusTone: queueTone(booking),
          }))}
          activeId={active?.id}
          onSelect={setActiveId}
          emptyState={loading ? (
            <div className="flex items-center gap-2 rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-5 text-sm text-[rgb(var(--text-secondary))]">
              <AdminSpinner />
              {t('common.loading')}
            </div>
          ) : undefined}
        />

        <div className="space-y-6">
          {active ? (
            <>
              <BookingContextCard
                eyebrow={t('pickup.workspace.title')}
                title={`${active.code} / ${active.customer}`}
                subtitle={active.productLabel}
                status={active.status}
                statusTone={queueTone(active)}
                badges={[
                  { label: reviewMode ? t('booking.reviewPickup') : active.canPickup ? t('pickup.queue.payment_ready') : t('pickup.queue.payment_due'), tone: reviewMode ? 'info' : active.canPickup ? 'success' : 'warning' },
                  { label: `${completedImages}/4`, tone: completedImages === 4 ? 'success' : 'info' },
                ]}
                details={[
                  { label: t('common.rental_order_code'), value: active.code },
                  { label: t('pickup.context.customer'), value: active.customer },
                  { label: t('pickup.context.phone'), value: active.phone ?? '-' },
                  { label: t('lead.deposit.paid'), value: <MoneyDisplay value={active.securityDepositPaid} tone="info" strong /> },
                  { label: t('lead.deposit.required'), value: <MoneyDisplay value={active.depositRequired} tone="warning" strong /> },
                  { label: t('payment.rental.remaining'), value: <MoneyDisplay value={active.rentalRemaining} tone={active.rentalRemaining > 0 ? 'danger' : 'success'} strong /> },
                  { label: t('pickup.context.pickup_time'), value: formatDateTime(active.pickupDate) },
                  { label: t('pickup.context.expected_item'), value: `${active.products.length} ${t('pickup.queue.expected_items')}` },
                ]}
                actions={(
                  <FlowActions
                    links={[
                      { href: `/admin/payments?booking=${active.id}`, label: reviewMode ? t('booking.reviewPayment') : t('pickup.actions.open_payment'), variant: !reviewMode && !active.canPickup ? 'primary' : 'secondary' },
                      { href: `/admin/bookings/${active.id}`, label: t('pickup.actions.open_booking'), variant: 'secondary' },
                      { href: `/admin/returns?booking=${active.id}`, label: t('booking.reviewReturn'), variant: 'secondary' },
                      ...(!reviewMode ? [{ label: t('handover.confirm'), onClick: () => void confirmPickup(), variant: active.canPickup ? 'primary' as const : 'secondary' as const, disabled: !canConfirm }] : []),
                    ]}
                  />
                )}
              />

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <SectionCard title={t('pickupOps.payment.title')} description={t('pickupOps.payment.description')}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <QuickStateRow
                      label={t('payment.rental.remaining')}
                      value={<MoneyDisplay value={active.rentalRemaining} strong tone={active.rentalRemaining > 0 ? 'danger' : 'success'} />}
                    />
                    <QuickStateRow
                      label={t('payment.deposit.remaining')}
                      value={<MoneyDisplay value={Math.max(active.depositRequired - active.securityDepositPaid, 0)} strong tone={active.securityDepositPaid >= active.depositRequired ? 'success' : 'warning'} />}
                    />
                    <QuickStateRow
                      label={t('handover.images')}
                      value={<span className={cn('font-semibold', completedImages === 4 ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warning))]')}>{completedImages}/4</span>}
                    />
                  </div>
                  <div className="mt-4">
                    {reviewMode ? (
                      <InlineAlert tone="success">{t('pickup.feedback.confirmed')}</InlineAlert>
                    ) : !active.canPickup ? (
                      <InlineAlert tone="warning">
                        {active.pickupBlockedReasons.includes('deposit_missing')
                          ? t('pickup.blocked.deposit_missing')
                          : t('pickup.blocked.unpaid')}
                      </InlineAlert>
                    ) : completedImages < 4 ? (
                      <InlineAlert tone="info">{t('pickupOps.next.scanMissing')}</InlineAlert>
                    ) : (
                      <InlineAlert tone="success">{t('pickupOps.next.confirm')}</InlineAlert>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title={t('booking.products.title')} description={t('pickup.expected.description')}>
                  <div className="space-y-3">
                    {active.products.map((product) => (
                      <div key={product.id} className="rounded-[22px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/60 px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center">
                          <div className="overflow-hidden rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/70">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="h-20 w-full object-cover" />
                            ) : (
                              <div className="grid h-20 w-full place-items-center text-xs text-[rgb(var(--text-muted))]">{t('return.context.expected_item')}</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
                            <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{product.qrCode ?? '-'}</p>
                          </div>
                          <StatusBadge value={product.status ?? 'reserved'} tone={product.status === 'reserved' ? 'info' : 'neutral'} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title={t('handover.images')} description={t('pickup.subtitle')}>
                  {reviewMode ? (
                    <div className="space-y-4">
                      {handoverImages.length ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {handoverImages.map((image, index) => (
                            <div key={`${active.id}-handover-review-${index}`} className="overflow-hidden rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/70">
                              <img src={image} alt={`${active.code}-handover-${index + 1}`} className="h-44 w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/58 px-4 py-4 text-sm text-[rgb(var(--text-secondary))]">
                          {t('pickup.validation.pending')}
                        </div>
                      )}
                      <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/58 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
                        {t('return.inspection.notes')}: <span className="font-semibold text-[rgb(var(--text-primary))]">{handoverNote || '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {[
                        'handover.image_front',
                        'handover.image_back',
                        'handover.image_accessory',
                        'handover.image_overview',
                      ].map((key, index) => (
                        <label key={key} className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                          {t(key)}
                          <AdminInput
                            value={handoverImages[index]}
                            onChange={(event) => {
                              const next = [...handoverImages];
                              next[index] = event.target.value;
                              setHandoverImages(next);
                            }}
                            placeholder="https://..."
                          />
                        </label>
                      ))}

                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('return.inspection.notes')}
                        <textarea className="field h-24 py-3" value={handoverNote} onChange={(event) => setHandoverNote(event.target.value)} />
                      </label>

                      <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/58 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
                        {t('pickup.scan_progress')}: <span className="font-semibold text-[rgb(var(--text-primary))]">{completedImages}/4</span>
                      </div>

                      <AdminButton onClick={() => void confirmPickup()} loading={busy} disabled={!canConfirm}>
                        {t('handover.confirm')}
                      </AdminButton>
                    </div>
                  )}
                </SectionCard>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function PickupDeskPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner />...</div>}>
      <PickupDeskPageContent />
    </Suspense>
  );
}

function QuickStateRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-2 text-sm text-[rgb(var(--text-primary))]">{value}</div>
    </div>
  );
}
