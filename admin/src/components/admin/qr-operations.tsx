'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { inventoryApi, scanApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { DataTable, InlineAlert, PageHeader, QrPreviewCard, RailSection, SectionCard, StatusBadge, SummaryRow, WorkspaceLayout } from './ui';
import { AdminButton, AdminInput, AdminModal } from './primitives';

type ResolvedItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  size: string | null;
  color: string | null;
  qrCode: string;
  qrVersion: number;
  serialNumber: string;
  status: string;
  condition: string | null;
};

type ResolvedBooking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
};

type ResolveResponse = {
  item: ResolvedItem;
  currentBooking: ResolvedBooking | null;
  upcomingBookings: ResolvedBooking[];
  availableSlots: Array<{ startDate: string; endDate: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN');
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
    throw new Error('Print window blocked');
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
            <img src="${params.qrImage}" alt="QR" />
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
  itemId,
  productName,
  sku,
  initialCode,
  onRegenerated,
}: {
  itemId: string;
  productName: string;
  sku: string;
  initialCode: string;
  onRegenerated?: (newCode: string) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(initialCode);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'image' | 'regenerate' | 'print'>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadQrImage = async () => {
    setBusy('image');
    setError(null);
    try {
      const response = await inventoryApi.getQRImage(itemId);
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
    loadQrImage();
  }, [itemId, code]);

  const canUseActions = busy === 'idle' && !!qrImage;

  const handleRegenerate = async () => {
    setBusy('regenerate');
    setError(null);
    setSuccess(null);
    try {
      const response = await inventoryApi.regenerateQR(itemId);
      const newCode = response.data.qrCode as string;
      setCode(newCode);
      onRegenerated?.(newCode);
      setConfirmOpen(false);
      setSuccess(t('success.qrRegenerated'));
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
        title: t('ui.printLabel'),
        skuLabel: t('inventory.itemCode'),
      });
      setSuccess(t('success.qrPrinted'));
    } catch (err: any) {
      setError(err?.message ?? t('errors.qrPrintFailed'));
    } finally {
      setBusy('idle');
    }
  };

  return (
    <>
      <QrPreviewCard
        code={code}
        imageDataUrl={qrImage ?? undefined}
        onRegenerate={() => setConfirmOpen(true)}
        onPrint={handlePrint}
        actionDisabled={!canUseActions}
        actionLoading={busy !== 'idle'}
      />
      {success && <p className="mt-3 text-sm text-[rgb(var(--success))]">{success}</p>}
      {error && <p className="mt-3 text-sm text-[rgb(var(--danger))]">{error}</p>}

      <AdminModal
        open={confirmOpen}
        title={t('ui.regenerate')}
        onClose={() => setConfirmOpen(false)}
        size="sm"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy !== 'idle'}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={handleRegenerate} disabled={busy !== 'idle'} loading={busy === 'regenerate'}>
              {busy === 'regenerate' ? t('common.loading') : t('ui.regenerate')}
            </AdminButton>
          </>
        }
      >
        <p className="text-sm text-[rgb(var(--text-secondary))]">{t('success.qrRegenerated')}</p>
      </AdminModal>
    </>
  );
}

export function ScanWorkbench({ initialCode = '' }: { initialCode?: string }) {
  const { t } = useI18n();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraHint, setCameraHint] = useState(t('scan.cameraOptionalHint'));
  const [detectorRunning, setDetectorRunning] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  const resolvedLabel = useMemo(() => {
    if (!result) return '';
    const item = result.item;
    return `${item.productName} / ${item.serialNumber}`;
  }, [result]);

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
      const payload = err?.response?.data;
      if (payload?.code === 'QR_ROTATED') {
        setError(t('scan.qrRotated', { code: payload.latestQrCode }));
      } else {
        setError(payload?.message ?? t('scan.resolveFailed'));
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      resolveCode(initialCode);
    }
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
            resolveCode(found);
            setCameraOpen(false);
          }
        } catch {
          // ignore frame read errors
        }
      }, 500);
    };

    run().catch(() => {
      setCameraHint(t('scan.cameraInitFailHint'));
      setCameraOpen(false);
    });

    return () => {
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen, t]);

  return (
    <>
      <PageHeader
        eyebrow={t('scan.title')}
        title={t('scan.heading')}
        subtitle={t('scan.subtitle')}
        nextStep={t('scan.nextStep')}
        meta={result ? <StatusBadge value={result.item.status} /> : undefined}
      />

      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('scan.scanInput')}>
              <AdminButton className="w-full" onClick={() => resolveCode()} disabled={loading} loading={loading}>
                {loading ? t('scan.resolving') : t('scan.resolveQr')}
              </AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={() => setCameraOpen((current) => !current)}>
                {cameraOpen ? t('scan.stopCamera') : t('scan.openCamera')}
              </AdminButton>
            </RailSection>
            {result ? (
              <RailSection title={t('booking.actionsPanel')}>
                <Link className="button-secondary w-full" href={`/admin/inventory/${result.item.id}`}>{t('scan.openItem')}</Link>
                {result.currentBooking && <Link className="button-secondary w-full" href={`/admin/bookings/${result.currentBooking.id}`}>{t('scan.openBooking')}</Link>}
                <Link className="button-secondary w-full" href={`/admin/pickup?code=${encodeURIComponent(result.item.qrCode)}`}>{t('scan.pickup')}</Link>
                <Link className="button-secondary w-full" href={`/admin/returns?code=${encodeURIComponent(result.item.qrCode)}`}>{t('scan.return')}</Link>
              </RailSection>
            ) : null}
          </>
        }
      >
        <SectionCard title={t('scan.scanInput')} description={t('scan.scanInputDesc')}>
          <div className="space-y-3">
            <AdminInput
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t('scan.placeholder')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') resolveCode();
              }}
            />
            {cameraOpen && (
              <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-3">
                <video id="qr-video" className="w-full rounded-xl bg-black/15" muted playsInline />
                <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{cameraHint}</p>
                {detectorRunning && <p className="text-xs text-[rgb(var(--success))]">{t('scan.detectorRunning')}</p>}
              </div>
            )}
            {error && <InlineAlert tone="danger">{error}</InlineAlert>}
          </div>
        </SectionCard>

        <SectionCard title={t('scan.resolvedItem')}>
          {!result ? (
            <p className="text-sm text-[rgb(var(--text-secondary))]">{t('scan.noResolvedItem')}</p>
          ) : (
            <div className="space-y-6">
              <SummaryRow
                items={[
                  { label: t('scan.item'), value: result.item.serialNumber, detail: result.item.productName, tone: 'info' },
                  { label: t('common.status'), value: <StatusBadge value={result.item.status} />, detail: result.item.condition ?? t('inventory.condition.unknown'), tone: result.item.status === 'AVAILABLE' ? 'success' : 'warning' },
                  { label: t('scan.currentBooking'), value: result.currentBooking?.id ?? '-', detail: result.currentBooking?.customer.name ?? t('scan.noActiveBooking'), tone: result.currentBooking ? 'accent' : 'neutral' },
                  { label: t('scan.nextSchedule'), value: result.upcomingBookings.length, detail: t('scan.availableSlots'), tone: result.upcomingBookings.length ? 'warning' : 'success' },
                ]}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-[rgb(var(--surface-3))] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{t('scan.item')}</p>
                  <p className="mt-2 font-semibold">{resolvedLabel}</p>
                  <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{result.item.variantName ?? t('scan.noVariant')}</p>
                </div>
                <div className="rounded-2xl bg-[rgb(var(--surface-3))] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{t('common.status')}</p>
                  <div className="mt-2 flex gap-2">
                    <StatusBadge value={result.item.status} />
                    <StatusBadge value={result.item.condition ?? 'unknown'} tone="warning" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4">
                  <p className="text-sm font-semibold">{t('scan.currentBooking')}</p>
                  <div className="mt-3">
                    {result.currentBooking ? (
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">{result.currentBooking.id}</p>
                        <p>{result.currentBooking.customer.name}</p>
                        <p className="text-[rgb(var(--text-secondary))]">{formatDate(result.currentBooking.startDate)} - {formatDate(result.currentBooking.endDate)}</p>
                        <StatusBadge value={result.currentBooking.status} />
                        <Link className="button-secondary mt-1 inline-flex" href={`/admin/bookings/${result.currentBooking.id}`}>{t('scan.openBooking')}</Link>
                      </div>
                    ) : (
                      <p className="text-sm text-[rgb(var(--text-secondary))]">{t('scan.noActiveBooking')}</p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4">
                  <p className="text-sm font-semibold">{t('scan.nextSchedule')}</p>
                  <div className="mt-3 space-y-2">
                    {result.upcomingBookings.length === 0 && <p className="text-sm text-[rgb(var(--text-secondary))]">{t('scan.noUpcomingBooking')}</p>}
                    {result.upcomingBookings.map((booking) => (
                      <div key={booking.id} className="rounded-xl bg-[rgb(var(--surface-3))] px-3 py-2 text-sm">
                        <p className="font-semibold">{booking.id}</p>
                        <p className="text-[rgb(var(--text-secondary))]">{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-[rgb(var(--surface-border))] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">{t('scan.availableSlots')}</p>
                    <div className="mt-2 space-y-1.5">
                      {result.availableSlots.map((slot) => (
                        <div key={`${slot.startDate}-${slot.endDate}`} className="rounded-xl bg-[rgb(var(--surface-3))] px-3 py-2 text-sm">
                          {formatDate(slot.startDate)} - {formatDate(slot.endDate)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DataTable
                columns={[t('scan.nextSchedule'), t('booking.customer'), t('common.status')]}
                rows={result.upcomingBookings.map((booking) => [
                  `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
                  booking.customer.name,
                  <StatusBadge key={booking.id} value={booking.status} />,
                ])}
                empty={t('scan.noUpcomingBooking')}
              />
              <AdminButton
                variant="secondary"
                disabled={maintenanceBusy}
                onClick={async () => {
                  setMaintenanceBusy(true);
                  setError(null);
                  try {
                    await inventoryApi.updateItemStatus(result.item.id, 'MAINTENANCE', t('scan.markMaintenanceNote'));
                    await resolveCode(result.item.qrCode);
                  } catch (err: any) {
                    setError(err?.response?.data?.message ?? t('scan.markMaintenanceFailed'));
                  } finally {
                    setMaintenanceBusy(false);
                  }
                }}
              >
                {maintenanceBusy ? t('scan.updating') : t('scan.markMaintenance')}
              </AdminButton>

              <InventoryQrActions
                itemId={result.item.id}
                productName={result.item.productName}
                sku={result.item.serialNumber}
                initialCode={result.item.qrCode}
                onRegenerated={(newCode) => {
                  setCode(newCode);
                  resolveCode(newCode);
                }}
              />
            </div>
          )}
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
