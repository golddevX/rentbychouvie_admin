'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '../../primitives';
import { TableSkeleton } from './TableSkeleton';

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [data-row-click-ignore="true"]',
    ),
  );
}

export function DataTable({
  columns,
  rows,
  empty,
  emptyDescription,
  emptyAction,
  loading,
  batchActions,
  rowKeys,
  selectedRowKey,
  onRowClick,
  rowClassName,
  tableClassName,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  batchActions?: ReactNode;
  rowKeys?: string[];
  selectedRowKey?: string;
  onRowClick?: (rowIndex: number) => void;
  rowClassName?: (rowIndex: number) => string;
  tableClassName?: string;
}) {
  const { t } = useI18n();
  const emptyText = empty || t('ui.noRecordsMatch');
  const emptyCopy = emptyDescription || t('ui.noRecordsMatchDetail');

  if (loading) return <TableSkeleton />;

  return (
    <div className="group/table relative overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/94 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--surface-border))] to-transparent" />
      {batchActions ? <div className="relative border-b border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-3))]/42 px-4 py-3 backdrop-blur-xl">{batchActions}</div> : null}
      <div className="relative overflow-x-auto overscroll-x-contain">
        <table className={cn('min-w-full border-separate border-spacing-0 text-sm', tableClassName)}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-[rgb(var(--surface-3))]/72 backdrop-blur-xl">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap border-b border-[rgb(var(--surface-border))]/75 px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]',
                    index === 0 && 'pl-6',
                    index === columns.length - 1 && 'pr-6 text-right',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {index === 0 ? <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-solid))]" /> : null}
                    {column}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-5 py-20 text-center" colSpan={columns.length}>
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-[30px] border border-dashed border-[rgb(var(--surface-border))]/85 bg-[rgb(var(--surface-3))]/42 px-6 py-12 shadow-sm">
                    <div className="mb-5 grid h-14 w-14 place-items-center rounded-[22px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/88 shadow-sm">
                      <span className="h-3 w-3 rounded-full bg-[rgb(var(--accent-solid))] shadow-[0_0_0_7px_rgb(var(--accent-solid))/10]" />
                    </div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[rgb(var(--text-primary))]">{emptyText}</p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-[rgb(var(--text-secondary))]">{emptyCopy}</p>
                    {emptyAction ? <div className="mt-6">{emptyAction}</div> : null}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = rowKeys?.[index] ?? String(index);
                const selected = selectedRowKey && rowKeys?.[index] === selectedRowKey;
                const clickable = Boolean(onRowClick);

                return (
                  <tr
                    key={key}
                    onClick={(event) => {
                      if (!onRowClick || isInteractiveTarget(event.target)) return;
                      onRowClick(index);
                    }}
                    className={cn(
                      'group/row relative transition duration-150',
                      clickable && 'cursor-pointer',
                      clickable && !selected && 'hover:bg-[rgb(var(--surface-3))]/38',
                      selected && 'bg-[rgb(var(--accent-solid))]/8 shadow-[inset_4px_0_0_rgb(var(--accent-solid))]',
                      rowClassName?.(index),
                    )}
                  >
                    {row.map((cell, cellIndex) => {
                      const isFirst = cellIndex === 0;
                      const isLast = cellIndex === row.length - 1;

                      return (
                        <td
                          key={cellIndex}
                          className={cn(
                            'border-b border-[rgb(var(--surface-border))]/52 px-5 py-4 align-middle text-[13px] leading-5 text-[rgb(var(--text-secondary))] transition duration-150 group-hover/row:text-[rgb(var(--text-primary))]',
                            isFirst && 'pl-6 font-semibold text-[rgb(var(--text-primary))]',
                            isLast && 'pr-6',
                          )}
                        >
                          <div className={cn('flex min-h-10 min-w-0 max-w-full items-center', isFirst && 'gap-3', isLast && 'justify-end')}>
                            {isFirst ? <span className={cn('hidden h-8 w-1 shrink-0 rounded-full transition sm:block', selected ? 'bg-[rgb(var(--accent-solid))]' : 'bg-[rgb(var(--surface-border))]/70 group-hover/row:bg-[rgb(var(--accent-solid))]/55')} /> : null}
                            <div className="min-w-0 max-w-full">{cell}</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 ? (
        <div className="flex items-center justify-between border-t border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-3))]/30 px-5 py-3 text-xs text-[rgb(var(--text-muted))]">
          <span className="font-semibold">{rows.length} {t('common.records')}</span>
          {onRowClick ? <span className="hidden sm:inline">{t('ui.rowOpenHint')}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
