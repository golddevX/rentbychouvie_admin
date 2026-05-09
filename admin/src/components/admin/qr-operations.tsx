'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { productsApi, scanApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import {
  DataTable,
  FeedbackPopup,
  InlineAlert,
  PageHeader,
  QrPreviewCard,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  WorkspaceLayout,
} from './ui';
import { ProductQuickLeadModal } from './product-quick-lead-modal';
import { AdminButton, AdminInput, AdminModal } from './primitives';

type ProductScheduleSlot = {
  sourceType: 'lead' | 'booking' | 'maintenance';
  sourceId: string;
  status: string;
  startDate: string;
  endDate: string;
  customerName?: string | null;
  customerPhone?: string | null;
  leadId?: string | null;
  bookingId?: string | null;
  reason?: string | null;
};

type ResolvedProduct = {
  id: string;
  code: string;
  qrCode: string;
  name: string;
  image?: string | null;
  images?: string[];
  rentalPrice: number;
  productValue: number;
  size?: string | null;
  color?: string | null;
  accessories?: string | null;
  status: string;
  nextAction?: string;
};

type ResolveResponse = {
  product: ResolvedProduct;
  availability: {
    todayAvailable: boolean;
    reservedSlots: ProductScheduleSlot[];
    nextAvailableDate?: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function printQrLabel(params: {
  itemName: string;
  sku: string;
  qrCode: string;
  qrImage: string;
  title: string;
  skuLabel: string;
}) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=420,height=560');
  if (!printWindow) {
    throw new Error('qrPrintBlocked');
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${params.title}</title>
        <style>
          @page { size: 70mm 45mm; margin: 4mm; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .label { width: 100%; border: 1px solid #d8dfdc; border-radius: 8px; padding: 10px; box-sizing: border-box; }
          .name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
          .sku { font-size: 10px; color: #4f5b57; margin-bottom: 8px; }
          .qr-wrap { display: grid; justify-items: center; }
          .qr-wrap img { width: 120px; height: 120px; object-fit: contain; }
          .code { margin-top: 6px; font-size: 10px; font-family: Consolas, monospace; word-break: break-all; text-align: center; }
        </style>
      </head>
      <body>
        <section class="label">
          <div class="name">${params.itemName}</div>
          <div class="sku">${params.skuLabel}: ${params.sku}</div>
          <div class="qr-wrap">
            <img src="${params.qrImage}" alt="${params.title}" />
            <div class="code">${params.qrCode}</div>
          </div>
        </section>
        <script>
          window.onload = () => setTimeout(() => { window.print(); window.close(); }, 120);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function InventoryQrActions({
  productId,
  productName,
  sku,
  initialCode,
  onRegenerated,
}: {
  productId: string;
  productName: string;
  sku: string;
  initialCode: string;
  onRegenerated?: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(initialCode);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'image' | 'regenerate' | 'print'>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const loadQrImage = async () => {
    setBusy('image');
    setError(null);
    try {
      const response = await productsApi.getQRImage(productId);
      setQrImage(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.qrImageFailed'));
    } finally {
      setBusy('idle');
    }
  };

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    void loadQrImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, code]);

  const handleRegenerate = async () => {
    setBusy('regenerate');
    setError(null);
    setFeedback(null);
    try {
      const response = await productsApi.regenerateQR(productId);
      const newCode = response.data.qrCode as string;
      setCode(newCode);
      onRegenerated?.();
      setConfirmOpen(false);
      setFeedback({ tone: 'success', message: t('success.qrRegenerated') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.qrRegenerateFailed'));
    } finally {
      setBusy('idle');
    }
  };

  const handlePrint = async () => {
    if (!qrImage) return;
    setBusy('print');
    setError(null);
    try {
      printQrLabel({
        itemName: productName,
        sku,
        qrCode: code,
        qrImage,
        title: t('inventory.actions.print_qr'),
        skuLabel: t('inventory.columns.code'),
      });
      setFeedback({ tone: 'success', message: t('success.qrPrinted') });
    } catch (err: any) {
      setError(err?.message === 'qrPrintBlocked' ? t('errors.qrPrintBlocked') : err?.message ?? t('errors.qrPrintFailed'));
    } finally {
      setBusy('idle');
    }
  };

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />
      <QrPreviewCard
        code={code}
        imageDataUrl={qrImage ?? undefined}
        onRegenerate={() => setConfirmOpen(true)}
        onPrint={handlePrint}
        actionDisabled={!qrImage || busy !== 'idle'}
        actionLoading={busy !== 'idle'}
      />

      <AdminModal
        open={confirmOpen}
        title={t('inventory.actions.regenerate_qr')}
        onClose={() => setConfirmOpen(false)}
        size="sm"
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy !== 'idle'}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={() => void handleRegenerate()} disabled={busy !== 'idle'} loading={busy === 'regenerate'}>
              {busy === 'regenerate' ? t('common.loading') : t('inventory.actions.regenerate_qr')}
            </AdminButton>
          </>
        )}
      >
        <p className="text-sm text-[rgb(var(--text-secondary))]">{t('inventory.qr.regenerateConfirm')}</p>
      </AdminModal>
    </>
  );
}

export function ScanWorkbench({ initialCode = '' }: { initialCode?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraHint, setCameraHint] = useState(t('scan.cameraOptionalHint'));
  const [detectorRunning, setDetectorRunning] = useState(false);
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);

  const resolveCode = async (rawCode?: string) => {
    const value = (rawCode ?? code).trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const response = await scanApi.resolve(value);
      setResult(response.data);
      setCode(value);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('scan.resolveFailed'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      void resolveCode(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    if (!cameraOpen) {
      setDetectorRunning(false);
      return;
    }

    const run = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraHint(t('scan.cameraNotSupportedHint'));
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.getElementById('qr-video') as HTMLVideoElement | null;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      if (!('BarcodeDetector' in window)) {
        setCameraHint(t('scan.detectorNotSupportedHint'));
        return;
      }

      setCameraHint(t('scan.scanningHint'));
      setDetectorRunning(true);
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      timer = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          const found = barcodes?.[0]?.rawValue;
          if (found) {
            setCode(found);
            void resolveCode(found);
            setCameraOpen(false);
          }
        } catch {
          // ignore frame read errors
        }
      }, 500);
    };

    void run().catch(() => {
      setCameraHint(t('scan.cameraInitFailHint'));
      setCameraOpen(false);
    });

    return () => {
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen, t]);

  const reservedRows = result?.availability.reservedSlots ?? [];
  const todayTone = result?.availability.todayAvailable ? 'success' : 'warning';

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />
      <PageHeader
        eyebrow={t('qr.title')}
        title={t('scan.heading')}
        subtitle={t('scan.subtitle')}
        nextStep={result ? t('inventory.actions.quick_lead') : t('scan.nextStep')}
        actions={(
          <>
            <AdminButton variant="secondary" onClick={() => void resolveCode()} disabled={loading} loading={loading}>
              {loading ? t('scan.resolving') : t('scan.resolveQr')}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setCameraOpen((current) => !current)}>
              {cameraOpen ? t('scan.stopCamera') : t('scan.openCamera')}
            </AdminButton>
            <AdminButton onClick={() => setQuickLeadOpen(true)} disabled={!result?.product || !result.availability.todayAvailable}>
              {t('inventory.actions.quick_lead')}
            </AdminButton>
          </>
        )}
      />

      <WorkspaceLayout
        rail={(
          <>
            <RailSection title={t('scan.scanInput')}>
              <AdminInput
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('qr.placeholder')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void resolveCode();
                  }
                }}
              />
              <AdminButton className="w-full" onClick={() => void resolveCode()} disabled={loading} loading={loading}>
                {loading ? t('scan.resolving') : t('scan.resolveQr')}
              </AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={() => setCameraOpen((current) => !current)}>
                {cameraOpen ? t('scan.stopCamera') : t('scan.openCamera')}
              </AdminButton>
            </RailSection>

            {result?.product ? (
              <RailSection title={t('product.availability.title')}>
                <div className="grid gap-3">
                  <div className="rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3 text-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('common.status')}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge value={result.product.status} tone={todayTone} />
                    </div>
                    <p className="mt-3 text-xs text-[rgb(var(--text-secondary))]">
                      {result.availability.todayAvailable ? t('product.availability.available') : t('product.availability.unavailable')}
                    </p>
                  </div>
                  <Link href={`/admin/inventory/${result.product.id}`} className="button-secondary w-full text-center">
                    {t('inventory.actions.open_product')}
                  </Link>
                  <AdminButton onClick={() => setQuickLeadOpen(true)} disabled={!result.availability.todayAvailable}>
                    {t('inventory.actions.quick_lead')}
                  </AdminButton>
                </div>
              </RailSection>
            ) : null}
          </>
        )}
      >
        <SectionCard title={t('scan.scanInput')} description={t('scan.scanInputDesc')}>
          <div className="space-y-3">
            {cameraOpen ? (
              <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 p-3">
                <video id="qr-video" className="w-full rounded-[18px] bg-[rgb(var(--surface))]/60" muted playsInline />
                <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{cameraHint}</p>
                {detectorRunning ? <p className="text-xs text-[rgb(var(--success))]">{t('scan.detectorRunning')}</p> : null}
              </div>
            ) : null}
            {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
          </div>
        </SectionCard>

        <SectionCard title={t('qr.result.title')} description={t('scan.subtitle')}>
          {!result ? (
            <p className="text-sm text-[rgb(var(--text-secondary))]">{t('scan.noResolvedItem')}</p>
          ) : (
            <div className="space-y-6">
              <SummaryRow
                items={[
                  { label: t('product.value'), value: formatVnd(result.product.productValue), detail: result.product.name, tone: 'info' },
                  { label: t('product.rental_price'), value: formatVnd(result.product.rentalPrice), detail: result.product.code, tone: 'accent' },
                  { label: t('common.status'), value: <StatusBadge value={result.product.status} tone={todayTone} />, detail: result.availability.todayAvailable ? t('product.availability.available') : t('product.availability.unavailable'), tone: todayTone },
                  { label: t('product.availability.next_available'), value: result.availability.nextAvailableDate ? formatDate(result.availability.nextAvailableDate) : '-', detail: t('product.availability.title'), tone: reservedRows.length ? 'warning' : 'success' },
                ]}
              />

              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[28px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60">
                  {result.product.image ? (
                    <img src={result.product.image} alt={result.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-[220px] place-items-center text-sm text-[rgb(var(--text-muted))]">
                      {result.product.name}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('inventory.columns.name')}</p>
                    <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">{result.product.name}</p>
                    <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{result.product.code}</p>
                  </div>
                  <div className="rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('inventory.columns.qr')}</p>
                    <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">{result.product.qrCode}</p>
                  </div>
                  <div className="rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('inventory.columns.attributes')}</p>
                    <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">
                      {[result.product.size, result.product.color].filter(Boolean).join(' / ') || '-'}
                    </p>
                    <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{result.product.accessories || '-'}</p>
                  </div>
                  <div className="rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('inventory.columns.schedule')}</p>
                    <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">{result.availability.todayAvailable ? t('product.availability.available') : t('product.availability.unavailable')}</p>
                    <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{result.availability.nextAvailableDate ? formatDateTime(result.availability.nextAvailableDate) : '-'}</p>
                  </div>
                </div>
              </div>

              <DataTable
                columns={[
                  t('product.availability.title'),
                  t('booking.customer'),
                  t('common.status'),
                ]}
                rows={reservedRows.map((slot) => [
                  `${formatDate(slot.startDate)} - ${formatDate(slot.endDate)}`,
                  slot.customerName ?? slot.reason ?? '-',
                  <StatusBadge key={`${slot.sourceType}-${slot.sourceId}`} value={slot.status} />,
                ])}
                empty={t('scan.noUpcomingBooking')}
              />
            </div>
          )}
        </SectionCard>
      </WorkspaceLayout>

      <ProductQuickLeadModal
        open={quickLeadOpen}
        product={result?.product ? { id: result.product.id, name: result.product.name, productValue: result.product.productValue } : null}
        source="qr_scan"
        onClose={() => setQuickLeadOpen(false)}
        onCreated={(leadId) => {
          setFeedback({ tone: 'success', message: t('inventory.feedback.quickLeadCreated') });
          router.push(`/admin/leads/${leadId}`);
        }}
      />
    </>
  );
}
