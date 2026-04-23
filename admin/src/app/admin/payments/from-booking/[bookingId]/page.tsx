'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi, paymentsApi } from '@/lib/api';
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
import { AdminButton, AdminInput, AdminSelect, AdminSpinner } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';

type PaymentType = 'deposit' | 'remaining' | 'full';

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export default function BookingPaymentPage() {
  const { t } = useI18n();
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('deposit');
  const [depositAmount, setDepositAmount] = useState(() => Number(searchParams.get('deposit') || 200000));
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const loadBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.getById(params.bookingId);
      setBooking(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('payment.fromBooking.loadBookingFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bookingId]);

  const paymentRows = booking?.rental?.payments ?? [];
  const paidTotal = useMemo(
    () => paymentRows
      .filter((payment: any) => payment.status === 'COMPLETED')
      .reduce((sum: number, payment: any) => sum + Number(payment.amountPaid || payment.amount || 0), 0),
    [paymentRows],
  );
  const paidDeposit = useMemo(
    () => paymentRows
      .filter((payment: any) => payment.status === 'COMPLETED')
      .reduce((sum: number, payment: any) => sum + Number(payment.depositAmount || 0), 0),
    [paymentRows],
  );
  const rentalFee = Number(booking?.totalPrice ?? 0);
  const depositDue = Math.max(depositAmount - paidDeposit, 0);
  const totalDue = Math.max(rentalFee + depositAmount - paidTotal, 0);
  const payAmount = paymentType === 'deposit' ? depositDue : totalDue;

  const initializeCheckout = async () => {
    setSubmitting(true);
    setError(null);
    setCheckoutUrl(null);
    try {
      const returnUrl = `${window.location.origin}/admin/confirmations/payment-pending/${params.bookingId}`;
      const callbackUrl = apiUrl('/api/payments/webhooks/payos');

      const res = await paymentsApi.initializeBooking(params.bookingId, {
        provider: 'PAYOS',
        paymentType,
        depositAmount,
        returnUrl,
        callbackUrl,
      });

      const nextUrl = res.data?.checkoutUrl;
      setCheckoutUrl(nextUrl ?? null);
      if (nextUrl) {
        window.open(nextUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('payment.fromBooking.initializeFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
        <AdminSpinner />
        {t('payment.fromBooking.loading')}
      </div>
    );
  }

  if (!booking) {
    return <EmptyState title={t('booking.notFound')} description={error ?? t('booking.notFoundDesc')} />;
  }

  return (
    <>
      <PageHeader
        eyebrow={t('payment.fromBooking.eyebrow')}
        title={t('payment.fromBooking.title', { id: booking.id })}
        subtitle={t('payment.fromBooking.subtitle')}
        nextStep={t('payment.fromBooking.nextStep')}
        actions={<Link href={`/admin/bookings/${booking.id}`} className="button-secondary">{t('payment.fromBooking.backToBooking')}</Link>}
      />

      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('payment.fromBooking.amountDue')}>
              <div className="space-y-2 rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm">
                <div className="flex justify-between"><span>{t('payment.fromBooking.rentalFee')}</span><b>{currency.format(rentalFee)}</b></div>
                <div className="flex justify-between"><span>{t('payment.fromBooking.deposit')}</span><b>{currency.format(depositAmount)}</b></div>
                <div className="flex justify-between"><span>{t('payment.fromBooking.paid')}</span><b>{currency.format(paidTotal)}</b></div>
                <div className="border-t border-[rgb(var(--surface-border))] pt-2 flex justify-between text-base"><span>{t('payment.fromBooking.currentAmount')}</span><b>{currency.format(payAmount)}</b></div>
              </div>
              <AdminButton className="w-full" onClick={initializeCheckout} loading={submitting} disabled={payAmount <= 0}>
                {t('payment.fromBooking.initializeCheckout')}
              </AdminButton>
              {checkoutUrl ? (
                <a className="button-secondary w-full text-center" href={checkoutUrl} target="_blank" rel="noreferrer">
                  {t('payment.fromBooking.reopenCheckout')}
                </a>
              ) : null}
              <AdminButton variant="ghost" className="w-full" onClick={() => router.push(`/admin/confirmations/payment-pending/${booking.id}`)}>
                {t('payment.fromBooking.viewPendingPage')}
              </AdminButton>
            </RailSection>
          </>
        }
      >
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <SectionCard title={t('payment.fromBooking.stepReview')} description={t('payment.fromBooking.stepReviewDesc')}>
          <KeyValueList
            items={[
              { label: t('payment.fromBooking.bookingCode'), value: booking.id },
              { label: t('booking.customer'), value: booking.customer?.name ?? '-' },
              { label: t('lead.phone'), value: booking.customer?.phone ?? '-' },
              { label: t('common.status'), value: <StatusBadge value={String(booking.status).toLowerCase()} /> },
              { label: t('booking.rentalPeriod'), value: `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}` },
              { label: t('bookingOps.detail.rentalDays'), value: `${booking.rentalDays ?? '-'} ${t('bookingOps.detail.days')}` },
            ]}
          />
        </SectionCard>

        <SectionCard title={t('payment.fromBooking.itemsTitle')} description={t('payment.fromBooking.itemsDesc')}>
          <DataTable
            columns={[t('inventory.itemCode'), t('booking.product'), t('payment.fromBooking.quantity'), t('payment.fromBooking.unitPricePerDay')]}
            rows={(booking.items ?? []).map((item: any) => [
              item.inventoryItem?.serialNumber ?? item.inventoryItemId,
              item.product?.name ?? '-',
              String(item.quantity ?? 1),
              currency.format(item.pricePerDay ?? 0),
            ])}
          />
        </SectionCard>

        <SectionCard title={t('payment.fromBooking.stepCollect')} description={t('payment.fromBooking.stepCollectDesc')}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              {t('paymentOps.actions.paymentType')}
              <AdminSelect value={paymentType} onChange={(event) => setPaymentType(event.target.value as PaymentType)}>
                <option value="deposit">{t('payment.fromBooking.collectDeposit')}</option>
                <option value="remaining">{t('payment.fromBooking.collectRemaining')}</option>
                <option value="full">{t('payment.fromBooking.collectFull')}</option>
              </AdminSelect>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {t('payment.fromBooking.deposit')}
              <AdminInput
                type="number"
                min={0}
                value={depositAmount}
                onChange={(event) => setDepositAmount(Number(event.target.value || 0))}
              />
            </label>
            <div className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{t('payment.fromBooking.amountToCollect')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{currency.format(payAmount)}</p>
            </div>
          </div>
          {payAmount <= 0 ? (
            <p className="mt-4 text-sm text-[rgb(var(--success))]">{t('payment.fromBooking.nothingDue')}</p>
          ) : null}
        </SectionCard>

        <SectionCard title={t('payment.fromBooking.historyTitle')} description={t('payment.fromBooking.historyDesc')}>
          <DataTable
            columns={[
              t('payment.fromBooking.paymentCode'),
              t('payment.fromBooking.description'),
              t('payment.fromBooking.amount'),
              t('payment.fromBooking.deposit'),
              t('common.status'),
              t('payment.fromBooking.checkout'),
            ]}
            rows={paymentRows.map((payment: any) => [
              payment.id,
              payment.description ?? '-',
              currency.format(payment.amount ?? 0),
              currency.format(payment.depositAmount ?? 0),
              <StatusBadge key={`payment-${payment.id}`} value={String(payment.status).toLowerCase()} />,
              payment.transactions?.[0]?.checkoutUrl ? (
                <a key={`checkout-${payment.id}`} className="font-semibold text-[rgb(var(--accent-solid))]" href={payment.transactions[0].checkoutUrl} target="_blank" rel="noreferrer">
                  {t('payment.fromBooking.openCheckout')}
                </a>
              ) : '-',
            ])}
            empty={t('payment.fromBooking.emptyHistory')}
          />
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
