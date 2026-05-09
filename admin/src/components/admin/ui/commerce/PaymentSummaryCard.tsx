'use client';

import { useI18n } from '@/hooks/useI18n';
import { SectionCard } from '../display/SectionCard';

export function PaymentSummaryCard({
  rentalFee,
  deposit,
  paid,
  refundableDeposit,
}: {
  rentalFee: number;
  deposit: number;
  paid: number;
  refundableDeposit: number;
}) {
  const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const due = Math.max(rentalFee + deposit - paid, 0);
  const { t } = useI18n();

  return (
    <SectionCard title={t('ui.paymentSummary')} description={t('ui.outstandingBalanceAndDeposit')}>
      <div className="grid gap-3 text-sm">
        {[
          [t('ui.rentalFee'), fmt.format(rentalFee)],
          [t('ui.depositHeld'), fmt.format(deposit)],
          [t('ui.paidToDate'), fmt.format(paid)],
          [t('ui.outstandingBalance'), fmt.format(due)],
          [t('ui.refundableDeposit'), fmt.format(refundableDeposit)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
            <span className="text-[rgb(var(--text-secondary))]">{label}</span>
            <span className="font-semibold text-[rgb(var(--text-primary))]">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
