'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { bookings, currency, inventory, leads, payments, previewRequests } from '@/lib/admin/demo-data';
import { DataTable, GuidanceCard, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/admin/ui';
import { useI18n } from '@/hooks/useI18n';

export default function DashboardPage() {
  const { t } = useI18n();
  const collected = payments.filter((payment) => payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
  const depositHeld = bookings.reduce((sum, booking) => sum + booking.refundableDeposit, 0);
  const inventoryRisk = inventory.filter((item) => ['maintenance', 'damaged'].includes(item.status)).length;
  const attentionRows: ReactNode[][] = [
    ...payments
      .filter((payment) => ['pending', 'processing'].includes(payment.status))
      .map((payment) => [
        <div key={`payment-${payment.id}`}>
          <p className="font-semibold">{`${payment.bookingId} / ${payment.customer}`}</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">{`${payment.type.replace(/_/g, ' ')} / ${currency(payment.amount)}`}</p>
        </div>,
        <StatusBadge key={`payment-status-${payment.id}`} value={payment.status} />,
        <Link key={`payment-link-${payment.id}`} href="/admin/payments" className="font-semibold text-[rgb(var(--accent-solid))]">{t('dashboard.verifyPayment')}</Link>,
      ]),
    ...inventory
      .filter((item) => ['maintenance', 'damaged'].includes(item.status))
      .map((item) => [
        <div key={`inventory-${item.id}`}>
          <p className="font-semibold">{`${item.itemCode} / ${item.product}`}</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">{item.maintenanceNote ?? item.location}</p>
        </div>,
        <StatusBadge key={`inventory-status-${item.id}`} value={item.status} />,
        <Link key={`inventory-link-${item.id}`} href={`/admin/inventory/${item.id}`} className="font-semibold text-[rgb(var(--accent-solid))]">{t('dashboard.inspectItem')}</Link>,
      ]),
  ];

  return (
    <>
      <PageHeader
        eyebrow={t('nav.dashboard')}
        title={t('dashboard.operationsOverview')}
        subtitle={t('dashboard.operationsOverviewSubtitle')}
        nextStep={t('dashboard.nextStepReview').replace('Next: ', '')}
        actions={
          <Link href="/admin/payments" className="button-primary">{t('dashboard.openPaymentDesk')}</Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.newLeads')} value={`${leads.filter((lead) => lead.status === 'new').length}`} detail={t('dashboard.newLeadsDetail')} />
        <StatCard label={t('dashboard.bookingsToday')} value={`${bookings.length}`} detail={t('dashboard.bookingsTodayDetail')} />
        <StatCard label={t('dashboard.revenueCollected')} value={currency(collected)} detail={t('dashboard.revenueCollectedDetail')} />
        <StatCard label={t('dashboard.depositHeld')} value={currency(depositHeld)} detail={t('dashboard.depositHeldDetail')} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title={t('dashboard.whatNeedsAttention')} description={t('dashboard.whatNeedsAttentionDesc')}>
          <DataTable
            columns={[t('dashboard.workItem'), t('dashboard.state'), t('dashboard.nextStep')]}
            rows={attentionRows}
          />
        </SectionCard>

        <SectionCard title={t('dashboard.howToUse')} description={t('dashboard.howToUseDesc')}>
          <div className="space-y-3">
            <GuidanceCard title={t('dashboard.clearMoneyBlockers')} description={`${bookings.filter((booking) => booking.paid === 0).length} ${t('dashboard.bookingNeedsPayment')}`} action={<Link href="/admin/payments" className="button-secondary w-full">{t('dashboard.goToPayments')}</Link>} />
            <GuidanceCard title={t('dashboard.resolveItemRisk')} description={`${inventoryRisk} ${t('dashboard.itemNeedsMaintenance')}`} action={<Link href="/admin/inventory" className="button-secondary w-full">{t('dashboard.openInventory')}</Link>} />
            <GuidanceCard title={t('dashboard.keepPreviewsMoving')} description={`${previewRequests.filter((item) => item.status !== 'completed').length} ${t('dashboard.previewNotComplete')}`} action={<Link href="/admin/preview-queue" className="button-secondary w-full">{t('dashboard.openQueue')}</Link>} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
