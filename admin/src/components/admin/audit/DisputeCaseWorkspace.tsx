'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { auditLogsApi, disputesApi } from '@/lib/api';
import { auditLogs as demoAuditLogs, currency, disputes as demoDisputes, type AuditLog, type Dispute, type Tone } from '@/lib/admin/demo-data';
import {
  DataTable,
  InlineAlert,
  KeyValueList,
  PageHeader,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminModal, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';

type DisputeStatus = Dispute['status'];
type DisputePriority = Dispute['priority'];

const CATEGORIES = [
  'DAMAGE_FEE',
  'LATE_FEE',
  'CLEANING_FEE',
  'MISSING_ACCESSORY',
  'PAYMENT',
  'REFUND',
  'INVENTORY_MISMATCH',
  'BOOKING_TERMS',
  'OTHER',
];

const STATUSES: DisputeStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_ON_CUSTOMER',
  'WAITING_ON_MANAGER',
  'RESOLVED',
  'REJECTED',
  'CANCELLED',
];

const PRIORITIES: DisputePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const OUTCOMES = ['CUSTOMER_REFUND', 'FEE_UPHELD', 'PARTIAL_ADJUSTMENT', 'INTERNAL_WRITE_OFF', 'CUSTOMER_CANCELLED', 'NO_ACTION'];

function normalizeDispute(row: any): Dispute {
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    title: row.title,
    category: row.category,
    priority: row.priority,
    status: row.status,
    summary: row.summary,
    customerPosition: row.customerPosition,
    internalNotes: row.internalNotes,
    requestedAmount: Number(row.requestedAmount ?? 0),
    approvedAmount: Number(row.approvedAmount ?? 0),
    bookingId: row.bookingId,
    paymentId: row.paymentId,
    inventoryItemId: row.inventoryItemId,
    assignedTo: row.assignedTo?.fullName ?? row.assignedTo,
    createdAt: row.createdAt,
    dueAt: row.dueAt,
    evidence: (row.evidence ?? []).map((item: any) => ({
      id: item.id,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      evidenceType: item.evidenceType ?? 'attachment',
      note: item.note,
      createdAt: item.createdAt,
    })),
  };
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

function priorityTone(priority: string): Tone {
  if (priority === 'CRITICAL') return 'danger';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'MEDIUM') return 'info';
  return 'neutral';
}

function statusTone(status: string): Tone {
  if (status === 'RESOLVED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  if (status.includes('WAITING')) return 'warning';
  return 'info';
}

function pretty(value?: Record<string, unknown> | null) {
  if (!value) return '-';
  return JSON.stringify(value, null, 2);
}

export function DisputeCaseWorkspace({ initialId }: { initialId?: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Dispute[]>(demoDisputes);
  const [audit, setAudit] = useState<AuditLog[]>(demoAuditLogs);
  const [activeId, setActiveId] = useState(initialId ?? demoDisputes[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DisputeStatus>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    category: 'DAMAGE_FEE',
    priority: 'HIGH',
    summary: '',
    customerPosition: '',
    requestedAmount: 0,
    bookingId: '',
    paymentId: '',
    inventoryItemId: '',
  });
  const [triage, setTriage] = useState({
    status: 'IN_REVIEW' as DisputeStatus,
    priority: 'HIGH' as DisputePriority,
    internalNotes: '',
    approvedAmount: 0,
  });
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [resolution, setResolution] = useState({
    outcome: 'PARTIAL_ADJUSTMENT',
    resolutionSummary: '',
    approvedAmount: 0,
  });

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [rows, activeId]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const statusMatch = statusFilter === 'all' || row.status === statusFilter;
      const queryMatch = !term || [row.caseNumber, row.title, row.summary, row.bookingId, row.paymentId, row.inventoryItemId]
        .some((value) => String(value ?? '').toLowerCase().includes(term));
      return statusMatch && queryMatch;
    });
  }, [rows, query, statusFilter]);

  const activeAudit = useMemo(() => audit.filter((item) =>
    item.bookingId === active?.bookingId ||
    item.paymentId === active?.paymentId ||
    item.inventoryItemId === active?.inventoryItemId ||
    item.entityId === active?.id,
  ), [active, audit]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [disputesRes, auditRes] = await Promise.allSettled([
        disputesApi.getAll(),
        auditLogsApi.getAll(),
      ]);
      const disputeRows = disputesRes.status === 'fulfilled' ? (disputesRes.value.data ?? []).map(normalizeDispute) : demoDisputes;
      const auditRows = auditRes.status === 'fulfilled' ? (auditRes.value.data ?? []).map(normalizeAudit) : demoAuditLogs;
      setRows(disputeRows.length ? disputeRows : demoDisputes);
      setAudit(auditRows.length ? auditRows : demoAuditLogs);
      setActiveId((current) =>
        disputeRows.find((row: Dispute) => row.id === (initialId ?? current))?.id ??
        disputeRows[0]?.id ??
        demoDisputes[0]?.id ??
        '',
      );
      if (disputesRes.status === 'rejected' || auditRes.status === 'rejected') {
        setError('API unavailable; showing dispute and audit sample data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  useEffect(() => {
    if (!active) return;
    setTriage({
      status: active.status === 'OPEN' ? 'IN_REVIEW' : active.status,
      priority: active.priority,
      internalNotes: active.internalNotes ?? '',
      approvedAmount: active.approvedAmount,
    });
    setResolution({
      outcome: active.approvedAmount > 0 ? 'PARTIAL_ADJUSTMENT' : 'FEE_UPHELD',
      resolutionSummary: '',
      approvedAmount: active.approvedAmount,
    });
  }, [active?.id]);

  const createDispute = async () => {
    if (!draft.title || !draft.summary) return;
    setBusyAction('create');
    setError(null);
    setFeedback(null);
    try {
      const response = await disputesApi.create({
        ...draft,
        requestedAmount: Number(draft.requestedAmount || 0),
        bookingId: draft.bookingId || undefined,
        paymentId: draft.paymentId || undefined,
        inventoryItemId: draft.inventoryItemId || undefined,
      });
      const created = normalizeDispute(response.data);
      setRows((current) => [created, ...current]);
      setActiveId(created.id);
      setCreateOpen(false);
      setFeedback({ tone: 'success', message: t('dispute.feedback.opened') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('dispute.errors.createFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const saveTriage = async () => {
    if (!active) return;
    setBusyAction('triage');
    setError(null);
    setFeedback(null);
    try {
      const response = await disputesApi.update(active.id, triage);
      const updated = normalizeDispute(response.data);
      setRows((current) => current.map((row) => row.id === active.id ? updated : row));
      setFeedback({ tone: 'success', message: t('dispute.feedback.triageSaved') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('dispute.errors.updateFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const addEvidence = async (file?: File) => {
    if (!active || (!file && !evidenceUrl)) return;
    setBusyAction('evidence');
    setError(null);
    setFeedback(null);
    try {
      const payload = file
        ? {
            fileName: file.name,
            fileUrl: `local-evidence://${Date.now()}-${file.name}`,
            mimeType: file.type || 'application/octet-stream',
            fileSize: file.size,
            evidenceType: 'uploaded_file',
            note: evidenceNote,
          }
        : {
            fileName: evidenceUrl.split('/').pop() || t('dispute.evidence.link'),
            fileUrl: evidenceUrl,
            evidenceType: 'external_link',
            note: evidenceNote,
          };
      await disputesApi.addEvidence(active.id, payload);
      await loadData();
      setEvidenceUrl('');
      setEvidenceNote('');
      setFeedback({ tone: 'success', message: t('dispute.feedback.evidenceAttached') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('dispute.errors.evidenceFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const resolveDispute = async () => {
    if (!active || !resolution.resolutionSummary) return;
    setBusyAction('resolve');
    setError(null);
    setFeedback(null);
    try {
      const response = await disputesApi.resolve(active.id, {
        ...resolution,
        approvedAmount: Number(resolution.approvedAmount || 0),
      });
      const updated = normalizeDispute(response.data);
      setRows((current) => current.map((row) => row.id === active.id ? updated : row));
      setFeedback({ tone: 'success', message: t('dispute.feedback.resolved') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('dispute.errors.resolveFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const openCount = rows.filter((row) => row.status !== 'RESOLVED' && row.status !== 'CANCELLED' && row.status !== 'REJECTED').length;
  const criticalCount = rows.filter((row) => row.priority === 'CRITICAL' || row.priority === 'HIGH').length;
  const requestedExposure = rows.reduce((sum, row) => sum + row.requestedAmount, 0);
  const evidenceCount = rows.reduce((sum, row) => sum + row.evidence.length, 0);

  return (
    <>
      <PageHeader
        eyebrow={t('dispute.eyebrow')}
        title={t('dispute.commandCenter')}
        subtitle={t('dispute.commandCenterSubtitle')}
        nextStep={active ? `${active.caseNumber}: ${t(`dispute.status.${active.status.toLowerCase()}`)}` : t('dispute.openOrSelect')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadData} loading={loading}>{t('common.refresh')}</AdminButton>
            <Link href="/admin/audit" className="button-secondary">{t('nav.auditLogs')}</Link>
            <AdminButton onClick={() => setCreateOpen(true)}>{t('dispute.openDispute')}</AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('dispute.summary.openCases'), value: openCount, detail: t('dispute.summary.openCasesDetail'), tone: openCount ? 'warning' : 'success' },
          { label: t('dispute.summary.highPriority'), value: criticalCount, detail: t('dispute.summary.highPriorityDetail'), tone: criticalCount ? 'danger' : 'neutral' },
          { label: t('dispute.summary.requestedExposure'), value: currency(requestedExposure), detail: t('dispute.summary.requestedExposureDetail'), tone: 'accent' },
          { label: t('dispute.summary.evidenceFiles'), value: evidenceCount, detail: t('dispute.summary.evidenceFilesDetail'), tone: 'info' },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard title={t('dispute.list.title')} description={t('dispute.list.description')}>
          <div className="mb-4 grid gap-2">
            <AdminInput placeholder={t('dispute.list.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
            <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | DisputeStatus)}>
              <option value="all">{t('dispute.allStatuses')}</option>
              {STATUSES.map((status) => <option key={status} value={status}>{t(`dispute.status.${status.toLowerCase()}`)}</option>)}
            </AdminSelect>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('dispute.list.loading')}</div>
          ) : (
            <div className="space-y-2">
              {filteredRows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                    active?.id === item.id ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.caseNumber}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[rgb(var(--text-secondary))]">{item.title}</p>
                    </div>
                    <AdminBadge tone={priorityTone(item.priority)}>{item.priority}</AdminBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge value={item.status.toLowerCase()} tone={statusTone(item.status)} />
                    {item.bookingId ? <AdminBadge tone="neutral">{item.bookingId}</AdminBadge> : null}
                    <AdminBadge tone="info">{currency(item.requestedAmount)}</AdminBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {active ? (
          <div className="space-y-6">
            {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
            {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

            <WorkspaceLayout
              rail={
                <>
                  <RailSection title={t('dispute.resolution.title')}>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('dispute.resolution.outcome')}
                      <AdminSelect value={resolution.outcome} onChange={(event) => setResolution((current) => ({ ...current, outcome: event.target.value }))}>
                        {OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{t(`dispute.outcome.${outcome.toLowerCase()}`)}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('dispute.resolution.approvedAdjustment')}
                      <AdminInput type="number" min={0} value={resolution.approvedAmount} onChange={(event) => setResolution((current) => ({ ...current, approvedAmount: Number(event.target.value || 0) }))} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      {t('dispute.resolution.rationale')}
                      <textarea className="field h-24 py-3" value={resolution.resolutionSummary} onChange={(event) => setResolution((current) => ({ ...current, resolutionSummary: event.target.value }))} />
                    </label>
                    <AdminButton className="w-full" onClick={resolveDispute} loading={busyAction === 'resolve'} disabled={!resolution.resolutionSummary || active.status === 'RESOLVED'}>
                      {t('dispute.resolution.record')}
                    </AdminButton>
                  </RailSection>
                  <RailSection title={t('dispute.linkedOperations')}>
                    {active.bookingId ? <Link className="button-secondary w-full text-center" href={`/admin/bookings/${active.bookingId}`}>{t('dispute.openBooking')}</Link> : null}
                    {active.paymentId ? <Link className="button-secondary w-full text-center" href="/admin/payments">{t('dispute.openPaymentDesk')}</Link> : null}
                    {active.inventoryItemId ? <Link className="button-secondary w-full text-center" href={`/admin/inventory/${active.inventoryItemId}`}>{t('dispute.openInventoryItem')}</Link> : null}
                    <Link className="button-secondary w-full text-center" href={`/admin/audit?bookingId=${active.bookingId ?? ''}`}>{t('dispute.auditTrail')}</Link>
                  </RailSection>
                </>
              }
            >
              <SectionCard title={`${active.caseNumber} / ${active.title}`} description={active.summary}>
                <div className="mb-5 flex flex-wrap gap-2">
                  <StatusBadge value={active.status.toLowerCase()} tone={statusTone(active.status)} />
                  <AdminBadge tone={priorityTone(active.priority)}>{active.priority}</AdminBadge>
                  <AdminBadge tone="neutral">{t(`dispute.category.${active.category.toLowerCase()}`)}</AdminBadge>
                </div>
                <KeyValueList
                  items={[
                    { label: t('dispute.fields.booking'), value: active.bookingId ?? '-' },
                    { label: t('dispute.fields.payment'), value: active.paymentId ?? '-' },
                    { label: t('dispute.fields.inventoryItem'), value: active.inventoryItemId ?? '-' },
                    { label: t('dispute.fields.assignedManager'), value: active.assignedTo ?? t('leadOps.unassigned') },
                    { label: t('dispute.fields.requestedAmount'), value: currency(active.requestedAmount) },
                    { label: t('dispute.fields.approvedAmount'), value: currency(active.approvedAmount) },
                    { label: t('dispute.fields.opened'), value: formatDateTime(active.createdAt) },
                    { label: t('dispute.fields.due'), value: formatDateTime(active.dueAt) },
                  ]}
                />
              </SectionCard>

              <SectionCard title={t('dispute.review.title')} description={t('dispute.review.description')}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('dispute.customerPosition')}</p>
                    <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{active.customerPosition || t('dispute.review.noCustomerStatement')}</p>
                  </div>
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('dispute.internalNotes')}</p>
                    <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{active.internalNotes || t('dispute.review.noInternalNotes')}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={t('dispute.triage.title')} description={t('dispute.triage.description')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    {t('common.status')}
                    <AdminSelect value={triage.status} onChange={(event) => setTriage((current) => ({ ...current, status: event.target.value as DisputeStatus }))}>
                      {STATUSES.map((status) => <option key={status} value={status}>{t(`dispute.status.${status.toLowerCase()}`)}</option>)}
                    </AdminSelect>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    {t('dispute.fields.priority')}
                    <AdminSelect value={triage.priority} onChange={(event) => setTriage((current) => ({ ...current, priority: event.target.value as DisputePriority }))}>
                      {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </AdminSelect>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    {t('dispute.triage.provisionalAdjustment')}
                    <AdminInput type="number" min={0} value={triage.approvedAmount} onChange={(event) => setTriage((current) => ({ ...current, approvedAmount: Number(event.target.value || 0) }))} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
                    {t('dispute.internalNotes')}
                    <textarea className="field h-24 py-3" value={triage.internalNotes} onChange={(event) => setTriage((current) => ({ ...current, internalNotes: event.target.value }))} />
                  </label>
                </div>
                <AdminButton className="mt-4" variant="secondary" onClick={saveTriage} loading={busyAction === 'triage'}>{t('dispute.saveTriage')}</AdminButton>
              </SectionCard>

              <SectionCard title={t('dispute.evidence.title')} description={t('dispute.evidence.description')}>
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <AdminInput placeholder={t('dispute.evidence.urlPlaceholder')} value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} />
                  <AdminInput placeholder={t('dispute.evidence.notePlaceholder')} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} />
                  <AdminButton variant="secondary" onClick={() => addEvidence()} loading={busyAction === 'evidence'} disabled={!evidenceUrl}>{t('dispute.attachLink')}</AdminButton>
                </div>
                <label className="mb-5 flex min-h-20 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 text-center text-sm font-semibold text-[rgb(var(--text-secondary))]">
                  {t('dispute.evidence.uploadFile')}
                  <input className="hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addEvidence(file); event.currentTarget.value = ''; }} />
                </label>
                <DataTable
                  columns={[t('dispute.evidence.evidence'), t('dispute.evidence.type'), t('dispute.evidence.note'), t('dispute.evidence.created')]}
                  rows={active.evidence.map((item) => [
                    <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-[rgb(var(--accent-solid))]">{item.fileName}</a>,
                    t(`dispute.evidence.typeValue.${item.evidenceType}`),
                    item.note ?? '-',
                    formatDateTime(item.createdAt),
                  ])}
                  empty={t('dispute.evidence.empty')}
                />
              </SectionCard>

              <SectionCard title={t('dispute.relatedAudit.title')} description={t('dispute.relatedAudit.description')}>
                <TimelineList
                  items={(activeAudit.length ? activeAudit : audit.slice(0, 5)).map((item) => ({
                    time: formatDateTime(item.createdAt),
                    title: `${item.action.replace(/_/g, ' ')} / ${item.entity}`,
                    detail: item.summary,
                    tone: item.action.includes('DISPUTE') ? 'accent' : item.action.includes('RETURN') ? 'warning' : 'info',
                  }))}
                />
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {(activeAudit.length ? activeAudit : audit.slice(0, 1)).slice(0, 2).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{item.action.replace(/_/g, ' ')}</p>
                      <div className="mt-3 grid gap-3 text-xs lg:grid-cols-2">
                        <pre className="max-h-48 overflow-auto rounded-xl bg-[rgb(var(--surface-2))] p-3 text-[rgb(var(--text-secondary))]">{pretty(item.before)}</pre>
                        <pre className="max-h-48 overflow-auto rounded-xl bg-[rgb(var(--surface-2))] p-3 text-[rgb(var(--text-secondary))]">{pretty(item.after)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </WorkspaceLayout>
          </div>
        ) : null}
      </div>

      <AdminModal
        open={createOpen}
        title={t('dispute.openCaseTitle')}
        onClose={() => setCreateOpen(false)}
        size="xl"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={createDispute} loading={busyAction === 'create'} disabled={!draft.title || !draft.summary}>{t('dispute.openCase')}</AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('dispute.form.caseTitle')}
            <AdminInput value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.form.category')}
            <AdminSelect value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{t(`dispute.category.${category}`)}</option>)}
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.fields.priority')}
            <AdminSelect value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.form.bookingId')}
            <AdminInput value={draft.bookingId} onChange={(event) => setDraft((current) => ({ ...current, bookingId: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.form.paymentId')}
            <AdminInput value={draft.paymentId} onChange={(event) => setDraft((current) => ({ ...current, paymentId: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.form.inventoryItemId')}
            <AdminInput value={draft.inventoryItemId} onChange={(event) => setDraft((current) => ({ ...current, inventoryItemId: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('dispute.fields.requestedAmount')}
            <AdminInput type="number" min={0} value={draft.requestedAmount} onChange={(event) => setDraft((current) => ({ ...current, requestedAmount: Number(event.target.value || 0) }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('dispute.form.summary')}
            <textarea className="field h-24 py-3" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('dispute.customerPosition')}
            <textarea className="field h-20 py-3" value={draft.customerPosition} onChange={(event) => setDraft((current) => ({ ...current, customerPosition: event.target.value }))} />
          </label>
        </div>
      </AdminModal>
    </>
  );
}
