'use client';

import Link from 'next/link';
import { bookings, currency, inventory, leads, payments, previewRequests } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  ActionQueue,
  DataTable,
  GuidanceCard,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
} from '@/components/admin/ui';

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const newLeads = leads.filter((lead) => lead.status === 'new').length;
  const activeBookings = bookings.filter((booking) => ['deposit_received', 'picked_up', 'return_pending'].includes(booking.status)).length;
  const pickupsToday = bookings.filter((booking) => booking.pickupAt.startsWith('2026-04-18')).length;
  const returnsToday = bookings.filter((booking) => booking.returnAt.startsWith('2026-04-18')).length;
  const collected = payments.filter((payment) => payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
  const depositHeld = bookings.reduce((sum, booking) => sum + booking.refundableDeposit, 0);
  const previewQueue = previewRequests.filter((request) => ['pending', 'processing'].includes(request.status)).length;
  const maintenance = inventory.filter((item) => item.status === 'maintenance' || item.status === 'damaged').length;
  const pickupQueue = bookings.filter((booking) => ['deposit_received', 'confirmed', 'scheduled_pickup'].includes(booking.status));
  const returnQueue = bookings.filter((booking) => ['picked_up', 'return_pending', 'settlement_pending'].includes(booking.status));
  const pendingPayments = payments.filter((payment) => ['pending', 'processing'].includes(payment.status));
  const riskItems = [
    ...pendingPayments.map((payment) => ({
      id: payment.id,
      title: `${payment.bookingId} / ${payment.customer}`,
      detail: `${payment.type.replace(/_/g, ' ')} ${currency(payment.amount)}`,
      status: payment.status,
      tone: 'warning' as const,
      href: '/admin/payments',
      action: t('dashboard.verify'),
    })),
    ...inventory.filter((item) => ['maintenance', 'damaged'].includes(item.status)).map((item) => ({
      id: item.id,
      title: `${item.itemCode} / ${item.product}`,
      detail: item.maintenanceNote ?? item.location,
      status: item.status,
      tone: item.status === 'damaged' ? 'danger' as const : 'warning' as const,
      href: `/admin/inventory/${item.id}`,
      action: t('dashboard.openItem'),
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.operationsOverview')}
        title={t('dashboard.commandCenter')}
        subtitle={t('dashboard.commandCenterSubtitle')}
        nextStep={t('dashboard.commandCenterNextStep')}
        meta={<StatusBadge value={t('ui.liveOps')} tone="success" />}
        actions={
          <>
            <Link href="/admin/pickup" className="button-secondary">{t('nav.pickupDesk')}</Link>
            <Link href="/admin/payments" className="button-primary">{t('dashboard.openPaymentDesk')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('dashboard.newLeads'), value: newLeads, detail: t('dashboard.newLeadsDetail'), tone: newLeads ? 'accent' : 'neutral' },
          { label: t('dashboard.pickupQueue'), value: pickupQueue.length, detail: t('dashboard.pickupQueueDetail'), tone: 'info' },
          { label: t('dashboard.returnQueue'), value: returnQueue.length, detail: t('dashboard.returnQueueDetail'), tone: returnQueue.length ? 'warning' : 'success' },
          { label: t('dashboard.cashExposure'), value: currency(depositHeld), detail: t('dashboard.depositHeldDetail'), tone: 'accent' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <SectionCard title={t('dashboard.priorityWorklist')} description={t('dashboard.priorityWorklistDesc')}>
          <ActionQueue
            items={[
              ...leads.filter((lead) => ['new', 'deposit_requested'].includes(lead.status)).map((lead) => ({
                id: lead.id,
                title: `${lead.customer} / ${lead.requestedLook}`,
                detail: `${lead.phone} / ${lead.source}`,
                status: lead.status,
                tone: lead.status === 'new' ? 'accent' as const : 'warning' as const,
                href: '/admin/leads',
                action: lead.status === 'new' ? t('dashboard.callNow') : t('dashboard.verifyDeposit'),
              })),
              ...pickupQueue.map((booking) => ({
                id: booking.id,
                title: `${booking.id} / ${booking.customer}`,
                detail: `${booking.itemCode} / ${booking.pickupAt}`,
                status: booking.status,
                tone: 'info' as const,
                href: `/admin/pickup?booking=${booking.id}`,
                action: t('nav.pickupDesk'),
              })),
              ...returnQueue.map((booking) => ({
                id: booking.id,
                title: `${booking.id} / ${booking.customer}`,
                detail: `${booking.itemCode} / ${booking.returnAt}`,
                status: booking.status,
                tone: booking.status === 'settlement_pending' ? 'danger' as const : 'warning' as const,
                href: `/admin/returns?booking=${booking.id}`,
                action: t('nav.returnDesk'),
              })),
            ].slice(0, 8)}
          />
        </SectionCard>

        <SectionCard title={t('dashboard.todayTimeline')} description={t('dashboard.todayTimelineDesc')}>
          <TimelineList
            items={[
              ...pickupQueue.map((booking) => ({
                time: booking.pickupAt.slice(11),
                title: `${t('nav.pickupDesk')} / ${booking.customer}`,
                detail: `${booking.itemCode} / ${booking.product}`,
                tone: 'info' as const,
              })),
              ...returnQueue.map((booking) => ({
                time: booking.returnAt.slice(11),
                title: `${t('nav.returnDesk')} / ${booking.customer}`,
                detail: `${booking.itemCode} / ${booking.product}`,
                tone: booking.status === 'settlement_pending' ? 'danger' as const : 'warning' as const,
              })),
            ].sort((a, b) => a.time.localeCompare(b.time))}
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title={t('dashboard.riskExceptions')} description={t('dashboard.riskExceptionsDesc')}>
          <DataTable
            columns={[t('dashboard.workItem'), t('dashboard.state'), t('dashboard.nextStep')]}
            rows={riskItems.map((item) => [
              <div key={item.id}><p className="font-semibold">{item.title}</p><p className="text-xs text-[rgb(var(--text-muted))]">{item.detail}</p></div>,
              <StatusBadge key={`risk-${item.id}`} value={item.status} tone={item.tone} />,
              item.href ? <Link key={`risk-action-${item.id}`} href={item.href} className="font-semibold text-[rgb(var(--accent-solid))]">{item.action}</Link> : item.action,
            ])}
          />
        </SectionCard>

        <SectionCard title={t('dashboard.whatNext')} description={t('dashboard.whatNextDesc')}>
          <div className="space-y-3">
            <GuidanceCard title={t('dashboard.verifyPaymentBlockers')} description={t('dashboard.verifyPaymentBlockersDesc')} />
            <GuidanceCard title={t('dashboard.handleReturnExceptions')} description={t('dashboard.handleReturnExceptionsDesc')} />
            <GuidanceCard title={t('dashboard.releaseInventory')} description={t('dashboard.releaseInventoryDesc')} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.revenueCollected')} value={currency(collected)} detail={t('dashboard.revenueCollectedDetail')} tone="success" />
        <StatCard label={t('dashboard.previewQueueLabel')} value={`${previewQueue}`} detail={t('dashboard.previewQueueDetail')} tone="neutral" />
        <StatCard label={t('dashboard.riskAlerts')} value={`${riskItems.length}`} detail={t('dashboard.riskAlertsDetail', { maintenance })} tone="danger" />
      </div>
    </>
  );
}
