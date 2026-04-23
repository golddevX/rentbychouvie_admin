'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { receiptsApi } from '@/lib/api';
import { payments } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { EmptyState, InlineAlert, PageHeader, ReceiptPreviewCard, SectionCard, StatusBadge } from '@/components/admin/ui';
import { AdminButton, AdminSpinner } from '@/components/admin/primitives';

export default function ReceiptPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackPayment = payments.find((item) => item.receiptId === params.id) ?? payments[0];

  const loadReceipt = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await receiptsApi.getById(params.id);
      setReceipt(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.generic'));
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const printReceipt = async () => {
    setPrinting(true);
    setError(null);
    try {
      await receiptsApi.print(params.id);
      await loadReceipt();
      window.print();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.generic'));
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</div>;
  }

  const payment = receipt?.payment ?? fallbackPayment;
  if (!payment) {
    return <EmptyState title={t('errors.notFound')} description={error ?? t('errors.generic')} />;
  }

  const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(payment.amount ?? fallbackPayment.amount);
  const customer = payment.rental?.booking?.customer?.name ?? fallbackPayment.customer;
  const bookingId = payment.rental?.booking?.id ?? fallbackPayment.bookingId;
  const method = String(payment.paymentMethod ?? fallbackPayment.method).toLowerCase();
  const status = String(payment.status ?? fallbackPayment.status).toLowerCase();

  return (
    <>
      <PageHeader
        eyebrow={t('receipt.receiptBill')}
        title={receipt?.receiptNumber ?? params.id}
        subtitle={t('receipt.printFriendlySubtitle')}
        actions={<AdminButton onClick={printReceipt} loading={printing}>{t('receipt.printBill')}</AdminButton>}
      />

      {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <ReceiptPreviewCard receiptId={receipt?.receiptNumber ?? params.id} customer={customer} amount={amount} onPrint={printReceipt} printing={printing} />
        <SectionCard title={t('receipt.billDetails')} description={t('receipt.billDetailsDesc')}>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between rounded-2xl bg-[rgb(var(--surface-3))]/70 p-4"><span>{t('receipt.booking')}</span><b>{bookingId}</b></div>
            <div className="flex justify-between rounded-2xl bg-[rgb(var(--surface-3))]/70 p-4"><span>{t('receipt.receiptType')}</span><b>{receipt?.type ?? fallbackPayment.type}</b></div>
            <div className="flex justify-between rounded-2xl bg-[rgb(var(--surface-3))]/70 p-4"><span>{t('receipt.paymentMethod')}</span><b>{t(`payment.method.${method}`)}</b></div>
            <div className="flex justify-between rounded-2xl bg-[rgb(var(--surface-3))]/70 p-4"><span>{t('receipt.status')}</span><StatusBadge value={status} /></div>
            <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-white/60 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('receipt.printNotes')}</p>
              <p className="mt-2 text-[rgb(var(--text-secondary))]">{t('receipt.printNotesDesc')}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
