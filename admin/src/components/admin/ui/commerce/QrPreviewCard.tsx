'use client';

import { useI18n } from '@/hooks/useI18n';
import { AdminButton, cn } from '../../primitives';

export function QrPreviewCard({
  code,
  imageDataUrl,
  onRegenerate,
  onPrint,
  actionLoading = false,
  actionDisabled = false,
}: {
  code: string;
  imageDataUrl?: string;
  onRegenerate?: () => void;
  onPrint?: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}) {
  const { t } = useI18n();
  const showActions = !!onRegenerate || !!onPrint;

  return (
    <div className="flex flex-col items-center rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-5 text-center shadow-sm backdrop-blur-xl">
      <div className="grid h-36 w-36 place-items-center rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 shadow-inner">
        {imageDataUrl ? <img src={imageDataUrl} alt={t('inventory.qrCode')} className="h-32 w-32 object-contain" /> : (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }).map((_, index) => (
              <span key={index} className={cn('h-4 w-4 rounded-sm', index % 3 === 0 || index % 7 === 0 ? 'bg-[rgb(var(--text-primary))]' : 'bg-[rgb(var(--surface-border))]')} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-4 rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-3 py-1 font-mono text-xs font-semibold text-[rgb(var(--text-primary))]">{code}</p>
      {showActions ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {onRegenerate ? <AdminButton variant="secondary" onClick={onRegenerate} disabled={actionDisabled || actionLoading}>{actionLoading ? t('common.loading') : t('ui.regenerate')}</AdminButton> : null}
          {onPrint ? <AdminButton onClick={onPrint} disabled={actionDisabled || actionLoading}>{actionLoading ? t('common.loading') : t('ui.printLabel')}</AdminButton> : null}
        </div>
      ) : null}
    </div>
  );
}
