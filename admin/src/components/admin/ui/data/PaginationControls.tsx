'use client';

import { AdminButton, AdminSelect } from '../../primitives';
import { useI18n } from '@/hooks/useI18n';

type PaginationControlsProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onLimitChange,
}: PaginationControlsProps) {
  const { t } = useI18n();
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/88 px-4 py-3 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('pagination.showing_range', { start, end, total })}
        </p>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          {t('pagination.page')} {Math.min(page, Math.max(totalPages, 1))} / {Math.max(totalPages, 1)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
          <span>{t('pagination.page_size')}</span>
          <AdminSelect
            className="min-w-[200px]"
            value={String(limit)}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </AdminSelect>
        </label>
        <AdminButton variant="secondary" disabled={!hasPreviousPage} onClick={() => onPageChange(page - 1)}>
          {t('pagination.previous')}
        </AdminButton>
        <AdminButton variant="secondary" disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}>
          {t('pagination.next')}
        </AdminButton>
      </div>
    </div>
  );
}
