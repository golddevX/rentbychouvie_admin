'use client';

import { useI18n } from '@/hooks/useI18n';
import { AdminButton, AdminCard } from '../../primitives';
import { StatusBadge } from '../display/StatusBadge';

export function ReceiptPreviewCard({
  receiptId,
  customer,
  amount,
  onPrint,
  printing = false,
}: {
  receiptId: string;
  customer: string;
  amount: string;
  onPrint?: () => void;
  printing?: boolean;
}) {
  const { t } = useI18n();

  return (
    <AdminCard padding="md" className="rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('ui.receipt')}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">{receiptId}</h3>
        </div>
        <StatusBadge value={t('receipt.printReady')} tone="success" />
      </div>
      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5"><span className="text-[rgb(var(--text-secondary))]">{t('ui.customer')}</span><b className="text-[rgb(var(--text-primary))]">{customer}</b></div>
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5"><span className="text-[rgb(var(--text-secondary))]">{t('ui.receiptType')}</span><b className="text-[rgb(var(--text-primary))]">{t('ui.returnReceipt')}</b></div>
        <div className="flex justify-between gap-4 rounded-[18px] bg-[rgb(var(--surface-3))]/60 px-3 py-2.5"><span className="text-[rgb(var(--text-secondary))]">{t('ui.total')}</span><b className="text-[rgb(var(--text-primary))]">{amount}</b></div>
      </div>
      <AdminButton className="mt-6 w-full" onClick={onPrint} loading={printing} disabled={!onPrint}>{t('ui.printBill')}</AdminButton>
    </AdminCard>
  );
}
