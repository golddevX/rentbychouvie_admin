'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/hooks/useI18n';
import type { Tone } from '@/lib/admin/demo-data';
import { cn } from '../../primitives';

export function FeedbackPopup({
  error,
  feedback,
  onClose,
  autoHideMs = 4200,
}: {
  error?: string | null;
  feedback?: { tone: Tone; message: string } | null;
  onClose: () => void;
  autoHideMs?: number;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const notice = feedback ?? (error ? { tone: 'danger' as Tone, message: error } : null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => onClose(), autoHideMs);
    return () => window.clearTimeout(timeout);
  }, [autoHideMs, notice, onClose]);

  if (!mounted || !notice) return null;

  const tones: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/90 bg-[rgb(var(--surface-2))]/96 text-[rgb(var(--text-primary))]',
    info: 'border-[rgb(var(--info))]/25 bg-[rgb(var(--info))]/10 text-[rgb(var(--text-primary))]',
    success: 'border-[rgb(var(--success))]/25 bg-[rgb(var(--success))]/10 text-[rgb(var(--text-primary))]',
    warning: 'border-[rgb(var(--warning))]/28 bg-[rgb(var(--warning))]/11 text-[rgb(var(--text-primary))]',
    danger: 'border-[rgb(var(--danger))]/28 bg-[rgb(var(--danger))]/10 text-[rgb(var(--text-primary))]',
    accent: 'border-[rgb(var(--accent-solid))]/25 bg-[rgb(var(--accent-solid))]/10 text-[rgb(var(--text-primary))]',
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[180] flex justify-end sm:inset-x-auto sm:right-5">
      <div className={cn('pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[24px] border shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl', tones[notice.tone])} role="status" aria-live="polite">
        <div className="flex items-start gap-3 p-4">
          <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', notice.tone === 'danger' && 'bg-[rgb(var(--danger))]', notice.tone === 'warning' && 'bg-[rgb(var(--warning))]', notice.tone === 'success' && 'bg-[rgb(var(--success))]', notice.tone === 'info' && 'bg-[rgb(var(--info))]', notice.tone === 'accent' && 'bg-[rgb(var(--accent-solid))]', notice.tone === 'neutral' && 'bg-[rgb(var(--text-muted))]')} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('notification.title')}</p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-primary))]">{notice.message}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]" aria-label={t('common.close')}>{t('common.close')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
