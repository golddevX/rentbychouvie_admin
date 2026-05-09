'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import {
  DataTable,
  EmptyState,
  InlineAlert,
  KeyValueList,
  PageHeader,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { MoneyDisplay } from '@/components/admin/order-flow-ui';
import { AdminSpinner } from '@/components/admin/primitives';

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function parseImages(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function lower(value?: string | null) {
  return String(value ?? '').toLowerCase();
}

function derivePickupStatus(booking: any, bookingStatus: string) {
  const rentalStatus = lower(booking?.rental?.status);
  if (
    booking?.rental?.actualPickupDate
    || ['picked_up', 'return_pending', 'settlement_pending', 'returned', 'completed'].includes(bookingStatus)
    || ['picked_up', 'return_pending', 'settlement_pending', 'returned', 'completed'].includes(rentalStatus)
  ) {
    return 'picked_up';
  }
  if (rentalStatus === 'scheduled_pickup') return 'scheduled_pickup';
  if (['scheduled_pickup', 'ready_for_pickup', 'confirmed'].includes(bookingStatus)) return bookingStatus;
  return 'pending';
}

function deriveReturnStatus(booking: any, bookingStatus: string) {
  const rentalStatus = lower(booking?.rental?.status);
  if (
    booking?.rental?.actualReturnDate
    || ['returned', 'completed'].includes(bookingStatus)
    || ['returned', 'completed'].includes(rentalStatus)
  ) {
    return 'returned';
  }
  if (bookingStatus === 'settlement_pending' || rentalStatus === 'settlement_pending') return 'settlement_pending';
  if (bookingStatus === 'return_pending' || rentalStatus === 'return_pending') return 'return_pending';
  return 'pending';
}

export default function BookingDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [paymentRows, setPaymentRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingRes, paymentRes] = await Promise.all([
          bookingsApi.getById(params.id),
          paymentsApi.getByBooking(params.id),
        ]);
        if (!active) return;
        setBooking(bookingRes.data);
        setSummary(paymentRes.data?.summary ?? null);
        setPaymentRows(Array.isArray(paymentRes.data?.payments) ? paymentRes.data.payments : []);
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message ?? t('booking.loadFailed'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [params.id, t]);

  const handoverImages = useMemo(
    () => parseImages(booking?.handoverRecord?.images),
    [booking?.handoverRecord?.images],
  );
  const payments = useMemo(
    () => paymentRows,
    [paymentRows],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
        <AdminSpinner />
        {t('booking.loading')}
      </div>
    );
  }

  if (!booking) {
    return (
      <EmptyState
        title={t('errors.notFound')}
        description={error ?? t('booking.noPaymentHistory')}
      />
    );
  }

  const bookingProducts = Array.isArray(summary?.products) && summary.products.length
    ? summary.products
    : (booking.items ?? []).map((item: any) => ({
        id: item.inventoryItemId ?? item.productId ?? item.id,
        name: item.productNameAtTime ?? item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
        image: item.product?.image ?? item.inventoryItem?.product?.image ?? null,
        qrCode: item.inventoryItem?.qrCode ?? item.product?.qrCode ?? item.inventoryItemId ?? item.productId,
        serialNumber: item.inventoryItem?.serialNumber ?? null,
        status: lower(item.inventoryItem?.status ?? item.pickupStatus ?? item.returnStatus),
        productValue: Number(item.productValueAtTime ?? item.product?.productValue ?? item.product?.price ?? 0),
        rentalPrice: Number(item.rentalPriceAtTime ?? item.product?.rentalPrice ?? item.product?.price ?? item.pricePerDay ?? 0),
      }));
  const currentStatus = lower(booking.status);
  const isCompleted = currentStatus === 'completed';
  const pickupStatus = derivePickupStatus(booking, currentStatus);
  const returnStatus = deriveReturnStatus(booking, currentStatus);
  const canPickup = Boolean(summary?.canPickup);
  const amountDueNow = Number(summary?.amountDueNow ?? 0);
  const showPaymentAction = amountDueNow > 0;
  const productValueTotal = Number(summary?.productValueTotal ?? booking.productValueTotal ?? booking.productValue ?? 0);
  const rentalTotal = Number(summary?.rentalTotal ?? booking.totalPrice ?? 0);
  const depositPaid = Number(summary?.depositPaid ?? summary?.securityDepositPaid ?? booking.depositPaid ?? 0);
  const depositRemaining = Number(summary?.depositRemaining ?? summary?.securityDepositRemainingForSelectedRate ?? 0);
  const rentalRemaining = Number(summary?.rentalRemaining ?? 0);
  const pickupBlockedReasons = Array.isArray(summary?.pickupBlockedReasons) ? summary.pickupBlockedReasons : [];
  const timeline = [
    booking.createdAt ? { time: formatDateTime(booking.createdAt), title: t('booking.detailTitle'), detail: booking.leadId ?? '-' } : null,
    booking.lockedAt ? { time: formatDateTime(booking.lockedAt), title: t('payment.deposit.title'), detail: t('payment.deposit.paid') } : null,
    booking.rental?.actualPickupDate ? { time: formatDateTime(booking.rental.actualPickupDate), title: t('booking.pickupStatus'), detail: <StatusBadge value={pickupStatus} compact /> } : null,
    booking.rental?.actualReturnDate ? { time: formatDateTime(booking.rental.actualReturnDate), title: t('booking.returnStatus'), detail: <StatusBadge value={returnStatus} compact /> } : null,
    booking.updatedAt ? { time: formatDateTime(booking.updatedAt), title: t('common.status'), detail: <StatusBadge value={currentStatus} compact /> } : null,
  ].filter(Boolean) as Array<{ time: string; title: ReactNode; detail: ReactNode }>;

  return (
    <>
      <PageHeader
        eyebrow={t('booking.detailTitle')}
        title={`${booking.id} / ${booking.customer?.name ?? t('booking.customer')}`}
        subtitle={t('booking.detailSubtitle')}
        nextStep={canPickup ? t('booking.detailNextStepFulfillment') : t('payment.summary.amount_due_now')}
        actions={(
          <>
            {isCompleted ? (
              <>
                <Link href={`/admin/payments?booking=${booking.id}`} className="button-secondary">
                  {t('booking.reviewPayment')}
                </Link>
                <Link href={`/admin/pickup?booking=${booking.id}`} className="button-secondary">
                  {t('booking.reviewPickup')}
                </Link>
                <Link href={`/admin/returns?booking=${booking.id}`} className="button-secondary">
                  {t('booking.reviewReturn')}
                </Link>
              </>
            ) : null}
            {!isCompleted && showPaymentAction ? (
              <Link href={`/admin/payments?booking=${booking.id}`} className="button-secondary">
                {t('booking.collectPayment')}
              </Link>
            ) : null}
            {!isCompleted ? (
              <Link href={`/admin/pickup?booking=${booking.id}`} className="button-primary">
                {t('booking.confirmPickup')}
              </Link>
            ) : null}
          </>
        )}
      />

      <SummaryRow
        items={[
          { label: t('lead.products.total_value'), value: <MoneyDisplay value={productValueTotal} strong />, detail: `${bookingProducts.length} ${t('booking.item')}`, tone: 'info' },
          { label: t('payment.rental.title'), value: <MoneyDisplay value={rentalTotal} strong />, detail: t('payment.rental.total'), tone: 'accent' },
          { label: t('lead.deposit.paid'), value: <MoneyDisplay value={depositPaid} strong />, detail: t('payment.deposit.title'), tone: 'success' },
          { label: t('payment.summary.amount_due_now'), value: <MoneyDisplay value={amountDueNow} strong />, detail: canPickup ? t('booking.detailNextStepFulfillment') : t('booking.detailNextStepCollect'), tone: amountDueNow > 0 ? 'warning' : 'success' },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <RailSection title={t('booking.actionsPanel')}>
              {isCompleted ? (
                <>
                  <Link href={`/admin/payments?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.reviewPayment')}</Link>
                  <Link href={`/admin/pickup?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.reviewPickup')}</Link>
                  <Link href={`/admin/returns?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.reviewReturn')}</Link>
                </>
              ) : null}
              {!isCompleted && showPaymentAction ? (
                <Link href={`/admin/payments?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.collectPayment')}</Link>
              ) : null}
              {!isCompleted ? (
                <Link href={`/admin/pickup?booking=${booking.id}`} className="button-primary w-full text-center">{t('booking.confirmPickup')}</Link>
              ) : null}
              {!isCompleted ? (
                <Link href={`/admin/returns?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.processReturn')}</Link>
              ) : null}
            </RailSection>

            <RailSection title={t('common.status')}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('common.status')}</p>
                  <StatusBadge value={currentStatus} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('booking.pickupStatus')}</p>
                  <StatusBadge value={pickupStatus} compact />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('booking.returnStatus')}</p>
                  <StatusBadge value={returnStatus} compact />
                </div>
              </div>
            </RailSection>

            <RailSection title={t('booking.handover.images')}>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{handoverImages.length}/4</p>
            </RailSection>
          </>
        )}
      >
        {!canPickup && pickupBlockedReasons.length ? (
          <InlineAlert tone="warning">
            {pickupBlockedReasons.includes('rental_unpaid') ? t('pickup.blocked.unpaid') : t('pickup.blocked.deposit_missing')}
          </InlineAlert>
        ) : null}

        <SectionCard title={t('booking.summary')} description={t('booking.summaryDesc')}>
          <KeyValueList
            items={[
              { label: t('common.status'), value: <StatusBadge key="status" value={currentStatus} /> },
              { label: t('booking.pickupStatus'), value: <StatusBadge key="pickup-status" value={pickupStatus} compact /> },
              { label: t('booking.returnStatus'), value: <StatusBadge key="return-status" value={returnStatus} compact /> },
              { label: t('booking.customer'), value: booking.customer?.name ?? '-' },
              { label: t('lead.phone'), value: booking.customer?.phone ?? '-' },
              { label: t('lead.email'), value: booking.customer?.email ?? '-' },
              { label: t('booking.rentalPeriod'), value: `${formatDateTime(booking.pickupDate ?? booking.startDate)} - ${formatDateTime(booking.returnDate ?? booking.endDate)}` },
              { label: t('payment.deposit.title'), value: <MoneyDisplay value={depositPaid} strong tone="info" /> },
              { label: t('lead.deposit.remaining'), value: <MoneyDisplay value={depositRemaining} strong tone={depositRemaining > 0 ? 'warning' : 'success'} /> },
              { label: t('payment.rental.remaining'), value: <MoneyDisplay value={rentalRemaining} strong tone={rentalRemaining > 0 ? 'warning' : 'success'} /> },
            ]}
          />
        </SectionCard>

        <SectionCard title={t('booking.products.title')} description={t('booking.summaryDesc')}>
          <div className="space-y-3">
            {bookingProducts.map((product: any) => (
              <div key={product.id} className="rounded-[22px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/60 p-4">
                <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)_140px_140px_120px] md:items-center">
                  <div className="overflow-hidden rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/70">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="grid h-20 w-full place-items-center text-xs text-[rgb(var(--text-muted))]">{product.name}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{product.serialNumber ?? product.qrCode ?? product.id}</p>
                  </div>
                  <MoneyDisplay value={product.productValue} tone="info" strong className="text-sm" />
                  <MoneyDisplay value={product.rentalPrice} tone="accent" strong className="text-sm" />
                  <StatusBadge value={product.status ?? 'reserved'} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('booking.handover.images')} description={t('pickup.subtitle')}>
          {handoverImages.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {handoverImages.map((image, index) => (
                <div key={`${booking.id}-handover-${index}`} className="overflow-hidden rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/70">
                  <img src={image} alt={`${booking.id}-handover-${index + 1}`} className="h-44 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-5 text-sm text-[rgb(var(--text-secondary))]">
              {t('pickup.validation.pending')}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('return.inspection.title')} description={t('return.subtitle')}>
          <KeyValueList
            items={[
              { label: t('return.context.pickup'), value: formatDateTime(booking.rental?.actualPickupDate ?? booking.pickupDate ?? booking.startDate) },
              { label: t('return.context.return'), value: formatDateTime(booking.returnDate ?? booking.endDate) },
              { label: t('return.context.actual_return'), value: formatDateTime(booking.rental?.actualReturnDate) },
              { label: t('return.fees.damage_fee'), value: <MoneyDisplay value={Number(booking.rental?.damageCost ?? 0)} strong tone={Number(booking.rental?.damageCost ?? 0) > 0 ? 'danger' : 'success'} /> },
              { label: t('return.settlement.refund_now'), value: <MoneyDisplay value={Number(summary?.returnSettlementPreview?.refundNow ?? 0)} strong tone="success" /> },
              { label: t('return.settlement.amount_due_from_customer'), value: <MoneyDisplay value={Number(summary?.returnSettlementPreview?.amountDueFromCustomer ?? 0)} strong tone={Number(summary?.returnSettlementPreview?.amountDueFromCustomer ?? 0) > 0 ? 'danger' : 'neutral'} /> },
            ]}
          />
        </SectionCard>

        <SectionCard title={t('booking.timeline')} description={t('booking.timelineDesc')}>
          <DataTable
            columns={[t('common.time'), t('common.status'), t('common.notes')]}
            rows={timeline.map((item) => [item.time, item.title, item.detail])}
            empty={t('booking.noPaymentHistory')}
          />
        </SectionCard>

        <SectionCard title={t('booking.paymentHistory')} description={t('booking.paymentHistoryDesc')}>
          <DataTable
            columns={[t('booking.payment'), t('booking.amount'), t('common.status'), t('payment.method.cash'), t('common.time')]}
            rows={payments.map((payment: any) => [
              lower(payment.type),
              <MoneyDisplay key={`${payment.id}-amount`} value={Number(payment.amountPaid ?? payment.amount ?? 0)} strong />,
              <StatusBadge key={`${payment.id}-status`} value={lower(payment.status)} />,
              lower(payment.paymentMethod),
              formatDateTime(payment.paidAt ?? payment.createdAt),
            ])}
            empty={t('booking.noPaymentHistory')}
          />
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
