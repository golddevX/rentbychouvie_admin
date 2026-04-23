'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { paymentsApi, rentalOrdersApi } from '@/lib/api';
import { apiUrl } from '@/lib/api-client';
import {
  DataTable,
  EmptyState,
  InlineAlert,
  KeyValueList,
  PageHeader,
  RailSection,
  SectionCard,
  StatusBadge,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminButton, AdminSelect } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';

const orderStatuses = [
  'draft',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'picked_up',
  'rented_out',
  'returned',
  'overdue',
  'cancelled',
];

const paymentStatuses = [
  'unpaid',
  'partially_paid',
  'paid',
  'refunded',
  'failed',
];

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export default function RentalOrderDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('draft');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rentalOrdersApi.getById(params.id);
      setOrder(res.data);
      setStatus(res.data?.status ?? 'draft');
      setPaymentStatus(res.data?.paymentStatus ?? 'unpaid');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.loadDetailFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const paymentHint = useMemo(() => {
    if (!order) return '';
    if (order.paymentStatus === 'paid') return t('rentalOrders.paymentHint.complete');
    if (order.paymentStatus === 'failed') return t('rentalOrders.paymentHint.failed');
    return t('rentalOrders.paymentHint.notFinalized');
  }, [order, t]);

  const saveStatus = async () => {
    setSaving(true);
    setError(null);
    try {
      await rentalOrdersApi.updateStatus(params.id, status);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.updateStatusFailed'));
    } finally {
      setSaving(false);
    }
  };

  const savePaymentStatus = async () => {
    setSaving(true);
    setError(null);
    try {
      await rentalOrdersApi.updatePaymentStatus(params.id, paymentStatus);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.updatePaymentStatusFailed'));
    } finally {
      setSaving(false);
    }
  };

  const initializePayment = async (isRetry = false) => {
    setPaymentBusy(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/admin/confirmations/payment-pending/${params.id}`;
      const callbackUrl = apiUrl('/api/payments/webhooks/payos');

      const res = isRetry
        ? await paymentsApi.retryRentalOrder(params.id, { provider: 'PAYOS', returnUrl, callbackUrl })
        : await paymentsApi.initializeRentalOrder(params.id, { provider: 'PAYOS', returnUrl, callbackUrl });

      const checkoutUrl = res.data?.checkoutUrl;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      }

      router.push(`/admin/confirmations/payment-pending/${params.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.initializePaymentFailed'));
      router.push(`/admin/confirmations/payment-failed/${params.id}`);
    } finally {
      setPaymentBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[rgb(var(--text-secondary))]">{t('rentalOrders.loadingDetail')}</p>;
  }

  if (!order) {
    return <EmptyState title={t('rentalOrders.notFound')} description={t('rentalOrders.notFoundDesc')} />;
  }

  const orderTransactions = order.transactions ?? [];
  const isCancelled = order.status === 'cancelled';

  return (
    <>
      <PageHeader
        eyebrow={t('rentalOrders.order')}
        title={`${order.orderCode} / ${order.customer?.name ?? t('ui.customer')}`}
        subtitle={t('rentalOrders.detailSubtitle')}
        nextStep={isCancelled ? t('rentalOrders.cancelledHint') : paymentHint}
        actions={<Link className="button-secondary" href="/admin/rental-orders">{t('rentalOrders.backToList')}</Link>}
      />

      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('rentalOrders.paymentActions')}>
              <AdminButton className="w-full" onClick={() => initializePayment(false)} loading={paymentBusy}>
                {t('rentalOrders.initializePayment')}
              </AdminButton>
              <AdminButton className="w-full" variant="secondary" onClick={() => initializePayment(true)} loading={paymentBusy}>
                {t('rentalOrders.retryPayment')}
              </AdminButton>
              <Link className="button-secondary w-full text-center" href={`/admin/confirmations/payment-success/${order.id}`}>
                {t('rentalOrders.openPaymentConfirmation')}
              </Link>
            </RailSection>
            <RailSection title={t('rentalOrders.statusControl')}>
              <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">
                {t('rentalOrders.orderStatus')}
                <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
                  {orderStatuses.map((option) => (
                    <option key={option} value={option}>
                      {t(`rentalOrders.status.${option}`)}
                    </option>
                  ))}
                </AdminSelect>
              </label>
              <AdminButton className="w-full" variant="secondary" onClick={saveStatus} loading={saving}>
                {t('rentalOrders.updateOrderStatus')}
              </AdminButton>

              <label className="grid gap-2 pt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">
                {t('rentalOrders.paymentStatus')}
                <AdminSelect value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  {paymentStatuses.map((option) => (
                    <option key={option} value={option}>
                      {t(`rentalOrders.paymentStatusValue.${option}`)}
                    </option>
                  ))}
                </AdminSelect>
              </label>
              <AdminButton className="w-full" variant="secondary" onClick={savePaymentStatus} loading={saving}>
                {t('rentalOrders.updatePaymentStatus')}
              </AdminButton>
            </RailSection>
          </>
        }
      >
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <SectionCard title={t('rentalOrders.summaryTitle')} description={t('rentalOrders.summaryDesc')}>
          <KeyValueList
            items={[
              { label: t('rentalOrders.orderCode'), value: order.orderCode },
              { label: t('rentalOrders.orderStatus'), value: <StatusBadge value={order.status} /> },
              { label: t('rentalOrders.paymentStatus'), value: <StatusBadge value={order.paymentStatus} /> },
              { label: t('ui.customer'), value: order.customer?.name ?? '-' },
              { label: t('lead.phone'), value: order.customer?.phone ?? '-' },
              { label: t('lead.email'), value: order.customer?.email ?? '-' },
              { label: t('rentalOrders.start'), value: formatDateTime(order.startDateTime) },
              { label: t('rentalOrders.end'), value: formatDateTime(order.endDateTime) },
              { label: t('confirmation.summary.createdTime'), value: formatDateTime(order.createdAt) },
              { label: t('rentalOrders.createdBy'), value: order.createdBy?.fullName ?? '-' },
            ]}
          />
        </SectionCard>

        <SectionCard title={t('rentalOrders.itemsTitle')} description={t('rentalOrders.itemsDesc')}>
          <DataTable
            columns={[t('rentalOrders.inventory'), t('booking.product'), t('payment.fromBooking.quantity'), t('rentalOrders.unitPrice'), t('leadOps.form.notes')]}
            rows={(order.items ?? []).map((item: any) => [
              item.inventoryItem?.serialNumber ?? '-',
              item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
              String(item.quantity ?? 1),
              currency.format(item.unitPrice ?? 0),
              item.notes ?? '-',
            ])}
            empty={t('rentalOrders.noItems')}
          />
        </SectionCard>

        <SectionCard title={t('rentalOrders.pricingTitle')} description={t('rentalOrders.pricingDesc')}>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('rentalOrders.subtotal')}</span><b>{currency.format(order.subtotal ?? 0)}</b></div>
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('rentalOrders.deposit')}</span><b>{currency.format(order.depositAmount ?? 0)}</b></div>
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('rentalOrders.additionalFees')}</span><b>{currency.format(order.additionalFees ?? 0)}</b></div>
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('rentalOrders.discount')}</span><b>{currency.format(order.discountAmount ?? 0)}</b></div>
            <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-4))] px-4 py-3 text-base"><span>{t('rentalOrders.totalAmount')}</span><b>{currency.format(order.totalAmount ?? 0)}</b></div>
          </div>
        </SectionCard>

        <SectionCard title={t('rentalOrders.transactionsTitle')} description={t('rentalOrders.transactionsDesc')}>
          <DataTable
            columns={[t('rentalOrders.provider'), t('common.status'), t('booking.amount'), t('rentalOrders.transaction'), t('confirmation.summary.createdTime'), t('common.actions')]}
            rows={orderTransactions.map((tx: any) => [
              tx.provider,
              <StatusBadge key={`tx-${tx.id}`} value={String(tx.status || '').toLowerCase()} />,
              currency.format(tx.amount ?? 0),
              tx.providerTransactionId ?? '-',
              formatDateTime(tx.createdAt),
              tx.checkoutUrl ? (
                <a key={`go-${tx.id}`} className="font-semibold text-[rgb(var(--accent-solid))]" href={tx.checkoutUrl} target="_blank" rel="noreferrer">
                  {t('payment.fromBooking.openCheckout')}
                </a>
              ) : (
                '-'
              ),
            ])}
            empty={t('rentalOrders.noTransactions')}
          />
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
