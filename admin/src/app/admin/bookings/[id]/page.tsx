'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi } from '@/lib/api';
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
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminSpinner } from '@/components/admin/primitives';

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

export default function BookingDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await bookingsApi.getById(params.id);
        if (active) setBooking(res.data);
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
  }, [params.id]);

  const payments = booking?.rental?.payments ?? [];
  const paid = useMemo(
    () => payments
      .filter((payment: any) => payment.status === 'COMPLETED')
      .reduce((sum: number, payment: any) => sum + Number(payment.amountPaid || payment.amount || 0), 0),
    [payments],
  );
  const latestDeposit = payments.reduce((max: number, payment: any) => Math.max(max, Number(payment.depositAmount || 0)), 0);
  const totalDue = Number(booking?.totalPrice ?? 0) + latestDeposit;
  const isPaymentBlocking = paid < totalDue;
  const firstItem = booking?.items?.[0];

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

  return (
    <>
      <PageHeader
        eyebrow={t('booking.detailTitle')}
        title={`${booking.id} / ${booking.customer?.name ?? t('booking.customer')}`}
        subtitle={t('booking.detailSubtitle')}
        nextStep={isPaymentBlocking ? t('booking.detailNextStepCollect') : t('booking.detailNextStepFulfillment')}
        actions={
          <Link href={`/admin/payments/from-booking/${booking.id}`} className="button-primary">
            {t('booking.collectPayment')}
          </Link>
        }
      />

      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('booking.actionsPanel')}>
              <Link href={`/admin/payments/from-booking/${booking.id}`} className="button-primary w-full text-center">{t('booking.collectPayment')}</Link>
              <Link href={`/admin/pickup?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.confirmPickup')}</Link>
              <Link href={`/admin/returns?booking=${booking.id}`} className="button-secondary w-full text-center">{t('booking.processReturn')}</Link>
            </RailSection>
            <RailSection title={t('booking.pickupStatus')}>
              <StatusBadge value={booking.rental?.status ? String(booking.rental.status).toLowerCase() : 'pending_payment'} />
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                {firstItem?.inventoryItem?.serialNumber ?? firstItem?.inventoryItemId ?? '-'}
              </p>
            </RailSection>
          </>
        }
      >
        {isPaymentBlocking ? (
          <InlineAlert tone="warning">
            {t('booking.detailNextStepCollect')}
          </InlineAlert>
        ) : (
          <InlineAlert tone="success">
            {t('booking.detailNextStepFulfillment')}
          </InlineAlert>
        )}

        <SectionCard title={t('booking.summary')} description={t('booking.summaryDesc')}>
          <KeyValueList
            items={[
              { label: t('common.status'), value: <StatusBadge key="status" value={String(booking.status).toLowerCase()} /> },
              { label: t('booking.customer'), value: booking.customer?.name ?? '-' },
              { label: t('lead.phone'), value: booking.customer?.phone ?? '-' },
              { label: t('lead.email'), value: booking.customer?.email ?? '-' },
              { label: t('booking.rentalPeriod'), value: `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}` },
              { label: t('booking.rentalFee'), value: currency.format(booking.totalPrice ?? 0) },
              { label: t('booking.deposit'), value: currency.format(latestDeposit) },
              { label: t('booking.totalDue'), value: currency.format(totalDue) },
            ]}
          />
        </SectionCard>

        <SectionCard title={t('booking.item')} description={t('booking.inventoryItemDesc')}>
          <DataTable
            columns={[t('booking.item'), t('booking.product'), t('booking.amount')]}
            rows={(booking.items ?? []).map((item: any) => [
              item.inventoryItem?.serialNumber ?? item.inventoryItemId,
              item.product?.name ?? '-',
              currency.format(item.pricePerDay ?? 0),
            ])}
          />
        </SectionCard>

        <SectionCard title={t('booking.paymentHistory')} description={t('booking.paymentHistoryDesc')}>
          <DataTable
            columns={[t('booking.payment'), t('payment.fromBooking.description'), t('booking.amount'), t('booking.deposit'), t('common.status'), t('payment.fromBooking.checkout')]}
            rows={payments.map((payment: any) => [
              payment.id,
              payment.description ?? '-',
              currency.format(payment.amount ?? 0),
              currency.format(payment.depositAmount ?? 0),
              <StatusBadge key={`payment-${payment.id}`} value={String(payment.status).toLowerCase()} />,
              payment.transactions?.[0]?.checkoutUrl ? (
                <a key={`checkout-${payment.id}`} href={payment.transactions[0].checkoutUrl} target="_blank" rel="noreferrer" className="font-semibold text-[rgb(var(--accent-solid))]">
                  {t('payment.fromBooking.checkout')}
                </a>
              ) : '-',
            ])}
            empty={t('booking.noPaymentHistory')}
          />
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
