'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { auditLogsApi } from '@/lib/api';
import { auditLogs as demoAuditLogs, type AuditLog, type Tone } from '@/lib/admin/demo-data';
import {
  DataTable,
  InlineAlert,
  KeyValueList,
  PageHeader,
  PaginationControls,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';

const ENTITIES = ['all', 'Booking', 'Payment', 'InventoryItem', 'Rental', 'ReturnInspection', 'RentalOrder', 'Dispute', 'DisputeEvidence'];

function entityLabel(value: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    all: t('audit.allEntities'),
    Booking: t('nav.bookings'),
    Payment: t('nav.payments'),
    InventoryItem: t('nav.inventory'),
    Rental: t('nav.bookings'),
    ReturnInspection: t('nav.returnDesk'),
    RentalOrder: t('nav.bookings'),
    Dispute: t('nav.disputes'),
    DisputeEvidence: t('nav.disputes'),
  };
  return labels[value] ?? value;
}

function normalizeAudit(row: any): AuditLog {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    summary: row.summary,
    actor: row.actor?.fullName ?? row.actor ?? 'System',
    createdAt: row.createdAt,
    bookingId: row.bookingId,
    paymentId: row.paymentId,
    inventoryItemId: row.inventoryItemId,
    before: row.before,
    after: row.after,
  };
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function actionTone(action: string): Tone {
  if (action.includes('RESOLVED') || action.includes('PROCESSED') || action.includes('SETTLED')) return 'success';
  if (action.includes('ARCHIVE') || action.includes('REFUND')) return 'danger';
  if (action.includes('RETURN') || action.includes('DISPUTE')) return 'warning';
  if (action.includes('INVENTORY')) return 'accent';
  return 'info';
}

function pretty(value?: Record<string, unknown> | null) {
  if (!value) return '-';
  return JSON.stringify(value, null, 2);
}

function changedKeys(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}

function AuditLogsPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { params, updateParams, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [rows, setRows] = useState<AuditLog[]>(demoAuditLogs);
  const [activeId, setActiveId] = useState(demoAuditLogs[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const entity = searchParams.get('entity') ?? 'all';
  const query = params.search;

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [rows, activeId]);
  const filteredRows = rows;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const response = await auditLogsApi.list({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        entity: entity === 'all' ? undefined : entity,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        bookingId: search.get('bookingId') || undefined,
        paymentId: search.get('paymentId') || undefined,
        inventoryItemId: search.get('inventoryItemId') || undefined,
      });
      const next = (response.data?.data ?? []).map(normalizeAudit);
      setRows(next);
      setMeta(response.data?.meta ?? { page: params.page, limit: params.limit, total: next.length, totalPages: next.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      setActiveId((current) => next.find((row: AuditLog) => row.id === current)?.id ?? next[0]?.id ?? '');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('audit.apiFallback'));
      setRows(demoAuditLogs);
      setMeta({ page: params.page, limit: params.limit, total: demoAuditLogs.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [entity, params.limit, params.page, params.search, params.sortBy, params.sortOrder]);

  const beforeAfterCount = rows.filter((row) => row.before || row.after).length;
  const bookingLinked = rows.filter((row) => row.bookingId).length;
  const actorCount = new Set(rows.map((row) => row.actor)).size;
  const returnEvents = rows.filter((row) => row.action.includes('RETURN')).length;

  return (
    <>
      <PageHeader
        eyebrow={t('audit.title')}
        title={t('nav.auditLogs')}
        subtitle={t('audit.subtitle')}
        nextStep={active ? `${entityLabel(active.entity, t)} ${active.entityId}` : t('audit.nextSelect')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadData} loading={loading}>{t('common.refresh')}</AdminButton>
            <Link href="/admin/disputes" className="button-primary">{t('audit.disputeCases')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('audit.auditEntries'), value: rows.length, detail: t('audit.loadedWindow'), tone: 'info' },
          { label: t('audit.beforeAfter'), value: beforeAfterCount, detail: t('audit.stateSnapshots'), tone: 'success' },
          { label: t('audit.bookingLinked'), value: bookingLinked, detail: t('audit.rentalLifecycle'), tone: 'accent' },
          { label: t('audit.returnEvents'), value: returnEvents, detail: t('audit.inspectionSettlement'), tone: returnEvents ? 'warning' : 'neutral' },
        ]}
      />

      {error ? <div className="mt-6"><InlineAlert tone="warning">{error}</InlineAlert></div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <SectionCard title={t('audit.register')} description={t('audit.registerDesc')}>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <AdminInput placeholder={t('audit.searchPlaceholder')} value={query} onChange={(event) => updateParams({ search: event.target.value }, { resetPage: true })} />
            <AdminSelect value={entity} onChange={(event) => updateParams({ entity: event.target.value }, { resetPage: true })}>
              {ENTITIES.map((item) => <option key={item} value={item}>{entityLabel(item, t)}</option>)}
            </AdminSelect>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('audit.loadingLogs')}</div>
          ) : (
            <DataTable
              columns={[t('audit.columns.event'), t('audit.columns.entity'), t('audit.columns.actor'), t('audit.columns.linkedIds'), t('audit.columns.created')]}
              rows={filteredRows.map((row) => [
                <button key={row.id} type="button" onClick={() => setActiveId(row.id)} className="text-left">
                  <span className="font-semibold text-[rgb(var(--text-primary))]">{row.action.replace(/_/g, ' ')}</span>
                  <span className="mt-1 block max-w-xl text-xs text-[rgb(var(--text-muted))]">{row.summary}</span>
                </button>,
                <AdminBadge key={`${row.id}-entity`} tone={actionTone(row.action)}>{entityLabel(row.entity, t)}</AdminBadge>,
                row.actor,
                <div key={`${row.id}-links`} className="flex flex-wrap gap-1.5">
                  {row.bookingId ? <AdminBadge tone="neutral">{row.bookingId}</AdminBadge> : null}
                  {row.paymentId ? <AdminBadge tone="neutral">{row.paymentId}</AdminBadge> : null}
                  {row.inventoryItemId ? <AdminBadge tone="neutral">{row.inventoryItemId}</AdminBadge> : null}
                  {!row.bookingId && !row.paymentId && !row.inventoryItemId ? '-' : null}
                </div>,
                formatDateTime(row.createdAt),
              ])}
            />
          )}
          <PaginationControls
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            totalPages={meta.totalPages}
            hasNextPage={meta.hasNextPage}
            hasPreviousPage={meta.hasPreviousPage}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </SectionCard>

        {active ? (
          <div className="space-y-6">
            <SectionCard title={t('audit.selectedEntry')} description={t('audit.selectedEntryDesc')}>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatusBadge value={active.action.toLowerCase()} tone={actionTone(active.action)} />
                <AdminBadge tone="neutral">{active.entity}</AdminBadge>
              </div>
              <KeyValueList
                items={[
                  { label: t('audit.fields.action'), value: active.action.replace(/_/g, ' ') },
                  { label: t('audit.fields.entity'), value: `${active.entity} / ${active.entityId}` },
                  { label: t('audit.fields.actor'), value: active.actor },
                  { label: t('audit.fields.created'), value: formatDateTime(active.createdAt) },
                  { label: t('audit.fields.booking'), value: active.bookingId ?? '-' },
                  { label: t('audit.fields.payment'), value: active.paymentId ?? '-' },
                  { label: t('audit.fields.inventory'), value: active.inventoryItemId ?? '-' },
                  { label: t('audit.fields.changedFields'), value: changedKeys(active.before, active.after).slice(0, 6).join(', ') || t('audit.fields.snapshotOnly') },
                ]}
              />
            </SectionCard>

            <SectionCard title={t('audit.beforeAfter')} description={t('audit.beforeAfterDesc')}>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('audit.before')}</p>
                    <AdminBadge tone="neutral">{t('audit.previousState')}</AdminBadge>
                  </div>
                  <pre className={cn('max-h-72 overflow-auto rounded-xl bg-[rgb(var(--surface-2))] p-3 text-xs leading-5 text-[rgb(var(--text-secondary))]')}>{pretty(active.before)}</pre>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('audit.after')}</p>
                    <AdminBadge tone="success">{t('audit.newState')}</AdminBadge>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-xl bg-[rgb(var(--surface-2))] p-3 text-xs leading-5 text-[rgb(var(--text-secondary))]">{pretty(active.after)}</pre>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t('audit.recentTrail')} description={t('audit.recentTrailDesc')}>
              <TimelineList
                items={rows.slice(0, 8).map((row) => ({
                  time: formatDateTime(row.createdAt),
                  title: `${row.action.replace(/_/g, ' ')} / ${entityLabel(row.entity, t)}`,
                  detail: row.summary,
                  tone: actionTone(row.action),
                }))}
              />
            </SectionCard>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogsPageContent />
    </Suspense>
  );
}
