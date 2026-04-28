'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { appointmentsApi, bookingsApi, paymentsApi, rentalOrdersApi } from '@/lib/api';
import { PageHeader, SectionCard } from '@/components/admin/ui';
import { OperationConfirmationCard } from '@/components/admin/confirmation-card';
import { useI18n } from '@/hooks/useI18n';

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

type ConfirmationState = {
  tone: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  subtitle: string;
  status: string;
  actions: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' | 'ghost' }>;
};

function resolveState(kind: string, id: string, t: (key: string, params?: Record<string, string | number>) => string): ConfirmationState {
  const map: Record<string, ConfirmationState> = {
    'booking-created': {
      tone: 'success',
      title: t('confirmation.bookingCreated.title'),
      subtitle: t('confirmation.bookingCreated.subtitle'),
      status: t('confirmation.status.created'),
      actions: [
        { label: t('confirmation.actions.openBookingDetail'), href: `/admin/bookings/${id}` },
        { label: t('confirmation.actions.backToBookings'), href: '/admin/bookings', variant: 'secondary' },
      ],
    },
    'appointment-created': {
      tone: 'success',
      title: t('confirmation.appointmentCreated.title'),
      subtitle: t('confirmation.appointmentCreated.subtitle'),
      status: t('confirmation.status.created'),
      actions: [
        { label: t('confirmation.actions.openScheduler'), href: '/admin/appointments' },
        { label: t('confirmation.actions.createAnother'), href: '/admin/appointments', variant: 'secondary' },
      ],
    },
    'rental-order-created': {
      tone: 'success',
      title: t('confirmation.rentalOrderCreated.title'),
      subtitle: t('confirmation.rentalOrderCreated.subtitle'),
      status: t('confirmation.status.created'),
      actions: [
        { label: t('confirmation.actions.openOrderDetail'), href: `/admin/bookings/${id}` },
        { label: t('confirmation.actions.backToRentalOrders'), href: '/admin/bookings', variant: 'secondary' },
      ],
    },
    'payment-success': {
      tone: 'success',
      title: t('confirmation.paymentSuccess.title'),
      subtitle: t('confirmation.paymentSuccess.subtitle'),
      status: t('confirmation.status.paid'),
      actions: [
        { label: t('confirmation.actions.openRentalOrder'), href: `/admin/bookings/${id}` },
        { label: t('confirmation.actions.openPaymentDesk'), href: '/admin/payments', variant: 'secondary' },
      ],
    },
    'payment-failed': {
      tone: 'danger',
      title: t('confirmation.paymentFailed.title'),
      subtitle: t('confirmation.paymentFailed.subtitle'),
      status: t('confirmation.status.failed'),
      actions: [
        { label: t('confirmation.actions.retryFromOrder'), href: `/admin/bookings/${id}` },
        { label: t('confirmation.actions.openPaymentDesk'), href: '/admin/payments', variant: 'secondary' },
      ],
    },
    'payment-pending': {
      tone: 'warning',
      title: t('confirmation.paymentPending.title'),
      subtitle: t('confirmation.paymentPending.subtitle'),
      status: t('confirmation.status.pending'),
      actions: [
        { label: t('confirmation.actions.openOrderDetail'), href: `/admin/bookings/${id}` },
        { label: t('confirmation.actions.backToRentalOrders'), href: '/admin/bookings', variant: 'secondary' },
      ],
    },
    cancellation: {
      tone: 'info',
      title: t('confirmation.cancellation.title'),
      subtitle: t('confirmation.cancellation.subtitle'),
      status: t('confirmation.status.cancelled'),
      actions: [
        { label: t('confirmation.actions.backToDashboard'), href: '/admin' },
        { label: t('confirmation.actions.openBookings'), href: '/admin/bookings', variant: 'secondary' },
      ],
    },
  };

  return map[kind] ?? {
    tone: 'info',
    title: t('confirmation.default.title'),
    subtitle: t('confirmation.default.subtitle'),
    status: t('confirmation.status.done'),
    actions: [
      { label: t('confirmation.actions.backToDashboard'), href: '/admin' },
      { label: t('confirmation.actions.openOperations'), href: '/admin/bookings', variant: 'secondary' },
    ],
  };
}

export default function ConfirmationPage() {
  const { t } = useI18n();
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind;
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<any>(null);

  const state = useMemo(() => resolveState(kind, id, t), [kind, id, t]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (kind === 'appointment-created') {
          const res = await appointmentsApi.getById(id);
          if (active) setEntity({ type: 'appointment', data: res.data });
          return;
        }

        if (kind === 'booking-created') {
          const res = await bookingsApi.getById(id);
          if (active) setEntity({ type: 'booking', data: res.data });
          return;
        }

        if (kind === 'payment-success' || kind === 'payment-failed' || kind === 'payment-pending') {
          const [orderRes, bookingRes] = await Promise.allSettled([
            rentalOrdersApi.getById(id),
            bookingsApi.getById(id),
          ]);
          if (orderRes.status === 'fulfilled' && active) {
            setEntity({ type: 'rental-order', data: orderRes.value.data });
            return;
          }
          if (bookingRes.status === 'fulfilled' && active) {
            setEntity({ type: 'booking', data: bookingRes.value.data });
            return;
          }
        }

        if (kind === 'rental-order-created') {
          const res = await rentalOrdersApi.getById(id);
          if (active) setEntity({ type: 'rental-order', data: res.data });
          return;
        }

        if (kind === 'cancellation') {
          const [bookingRes, orderRes] = await Promise.allSettled([bookingsApi.getById(id), rentalOrdersApi.getById(id)]);
          if (bookingRes.status === 'fulfilled' && active) {
            setEntity({ type: 'booking', data: bookingRes.value.data });
            return;
          }
          if (orderRes.status === 'fulfilled' && active) {
            setEntity({ type: 'rental-order', data: orderRes.value.data });
            return;
          }
        }

        const paymentRes = await paymentsApi.getById(id);
        if (active) setEntity({ type: 'payment', data: paymentRes.data });
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message ?? t('confirmation.loadFailed'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [kind, id, t]);

  const summary = useMemo(() => {
    if (!entity) {
      return [
        { label: t('confirmation.summary.referenceCode'), value: id },
        { label: t('common.status'), value: state.status },
      ];
    }

    if (entity.type === 'appointment') {
      const a = entity.data;
      return [
        { label: t('confirmation.summary.bookingAppointmentCode'), value: a.id },
        { label: t('ui.customer'), value: a.customer?.name ?? '-' },
        { label: t('confirmation.summary.dateTime'), value: `${formatDateTime(a.startTime ?? a.scheduledAt)} - ${formatDateTime(a.endTime)}` },
        { label: t('confirmation.summary.serviceSummary'), value: a.type ?? '-' },
        { label: t('common.status'), value: a.lifecycleStatus ?? a.status ?? '-' },
        { label: t('confirmation.summary.createdTime'), value: formatDateTime(a.createdAt) },
      ];
    }

    if (entity.type === 'booking') {
      const b = entity.data;
      return [
        { label: t('confirmation.summary.bookingCode'), value: b.id },
        { label: t('ui.customer'), value: b.customer?.name ?? '-' },
        { label: t('confirmation.summary.dateTimeSummary'), value: `${formatDateTime(b.startDate)} - ${formatDateTime(b.endDate)}` },
        { label: t('confirmation.summary.selectedItems'), value: String((b.items ?? []).length || 0) },
        { label: t('confirmation.summary.paymentSummary'), value: currency.format(b.totalPrice ?? 0) },
        { label: t('common.status'), value: b.status ?? '-' },
      ];
    }

    if (entity.type === 'rental-order') {
      const o = entity.data;
      return [
        { label: t('confirmation.summary.orderCode'), value: o.orderCode ?? o.id },
        { label: t('ui.customer'), value: o.customer?.name ?? '-' },
        { label: t('confirmation.summary.dateTimeSummary'), value: `${formatDateTime(o.startDateTime)} - ${formatDateTime(o.endDateTime)}` },
        { label: t('confirmation.summary.selectedItems'), value: String((o.items ?? []).length || 0) },
        { label: t('confirmation.summary.paymentSummary'), value: currency.format(o.totalAmount ?? 0) },
        { label: t('ui.currentStatus'), value: `${o.status ?? '-'} / ${o.paymentStatus ?? '-'}` },
        { label: t('confirmation.summary.createdTime'), value: formatDateTime(o.createdAt) },
        { label: t('confirmation.summary.operator'), value: o.createdBy?.fullName ?? '-' },
      ];
    }

    const p = entity.data;
    return [
      { label: t('confirmation.summary.transactionCode'), value: p.id },
      { label: t('ui.customer'), value: p.rental?.booking?.customer?.name ?? '-' },
      { label: t('confirmation.summary.paymentSummary'), value: currency.format(p.amount ?? 0) },
      { label: t('ui.currentStatus'), value: p.status ?? '-' },
      { label: t('confirmation.summary.createdTime'), value: formatDateTime(p.createdAt) },
    ];
  }, [entity, id, state.status, t]);

  return (
    <>
      <PageHeader
        eyebrow={t('confirmation.eyebrow')}
        title={state.title}
        subtitle={t('confirmation.subtitle')}
        nextStep={t('confirmation.nextStep')}
        actions={<Link className="button-secondary" href="/admin">{t('common.dashboard')}</Link>}
      />

      <SectionCard title={t('confirmation.summary.title')} description={t('confirmation.summary.description')}>
        {loading ? (
          <p className="text-sm text-[rgb(var(--text-secondary))]">{t('confirmation.loading')}</p>
        ) : (
          <OperationConfirmationCard
            title={state.title}
            subtitle={error ? `${state.subtitle} ${t('confirmation.partialPayload')}` : state.subtitle}
            tone={error ? 'warning' : state.tone}
            status={state.status}
            summary={summary}
            actions={state.actions}
            details={
              error ? (
                <p className="text-sm text-[rgb(var(--danger))]">{error}</p>
              ) : null
            }
          />
        )}
      </SectionCard>
    </>
  );
}
