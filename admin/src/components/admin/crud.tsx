'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { can, type Permission } from '@/lib/admin/permissions';
import { useI18n } from '@/hooks/useI18n';
import { DataTable, EmptyState, FormSection, InlineAlert, PageHeader, SectionCard, StatusBadge } from './ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect } from './primitives';
import {
  appointmentsApi,
  bookingsApi,
  inventoryApi,
  leadsApi,
  paymentsApi,
  previewRequestsApi,
  receiptsApi,
  usersApi,
} from '@/lib/api';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export type CrudField = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  section?: string;
};

export type CrudRecord = {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  archived?: boolean;
  timeline?: string[];
  related?: Array<{ label: string; value: string }>;
  [key: string]: unknown;
};

export type CrudModuleConfig = {
  storageKey: string;
  title: string;
  eyebrow: string;
  description: string;
  nextStep: string;
  primaryAction: string;
  entityLabel: string;
  createPermission: Permission;
  updatePermission: Permission;
  archivePermission: Permission;
  statusOptions: string[];
  filters?: Array<{ key: string; label: string; options: string[] }>;
  fields: CrudField[];
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  seed: CrudRecord[];
  workflow?: string[];
};

function getInitialRows(config: CrudModuleConfig) {
  if (typeof window === 'undefined') return config.seed;

  const stored = window.localStorage.getItem(config.storageKey);
  if (!stored) return config.seed;

  try {
    return JSON.parse(stored) as CrudRecord[];
  } catch {
    return config.seed;
  }
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') return new Intl.NumberFormat('vi-VN').format(value);
  return String(value);
}

function makeId(entityLabel: string) {
  const prefix = entityLabel.slice(0, 3).toUpperCase();
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const enumModules = new Set([
  'rental-admin-leads',
  'rental-admin-appointments',
  'rental-admin-bookings',
  'rental-admin-payments',
  'rental-admin-inventory',
  'rental-admin-preview-requests',
]);

function toApiStatus(config: CrudModuleConfig, status: string) {
  return enumModules.has(config.storageKey) ? status.toUpperCase() : status;
}

function fromApiStatus(status?: string) {
  return status?.toLowerCase() ?? 'active';
}

function apiFor(config: CrudModuleConfig) {
  switch (config.storageKey) {
    case 'rental-admin-leads':
      return {
        list: async () => (await leadsApi.getAll()).data,
        create: async (record: CrudRecord) =>
          (await leadsApi.create({
            email: record.email,
            name: record.title,
            phone: record.phone,
            source: record.source,
            notes: record.notes,
          })).data,
        update: async (record: CrudRecord) => (await leadsApi.update(record.id, { notes: record.notes })).data,
        status: async (id: string, status: string) => (await leadsApi.updateStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await leadsApi.archive(id)).data,
      };
    case 'rental-admin-appointments':
      return {
        list: async () => (await appointmentsApi.getAll()).data,
        create: async (record: CrudRecord) =>
          (await appointmentsApi.create({
            name: record.title,
            email: record.email,
            phone: record.phone,
            type: String(record.type ?? 'consultation').toUpperCase(),
            scheduledAt: record.date ? `${record.date}T${record.time ?? '09:00'}:00.000Z` : new Date().toISOString(),
            room: record.room,
            notes: record.notes,
          })).data,
        update: async (record: CrudRecord) => (await appointmentsApi.update(record.id, record)).data,
        status: async (id: string, status: string) => (await appointmentsApi.updateStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await appointmentsApi.archive(id)).data,
      };
    case 'rental-admin-bookings':
      return {
        list: async () => (await bookingsApi.getAll()).data,
        status: async (id: string, status: string) => (await bookingsApi.updateStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await bookingsApi.archive(id)).data,
      };
    case 'rental-admin-payments':
      return {
        list: async () => (await paymentsApi.getAll()).data,
        status: async (id: string, status: string) => (await paymentsApi.updateStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await paymentsApi.archive(id)).data,
      };
    case 'rental-admin-receipts':
      return {
        list: async () => (await receiptsApi.getAll()).data,
        update: async (record: CrudRecord) => (await receiptsApi.update(record.id, { type: String(record.type ?? 'rental_receipt').toUpperCase() })).data,
        status: async (id: string) => (await receiptsApi.print(id)).data,
        archive: async (id: string) => (await receiptsApi.archive(id)).data,
      };
    case 'rental-admin-inventory':
      return {
        list: async () => (await inventoryApi.getItems()).data,
        status: async (id: string, status: string) => (await inventoryApi.updateItemStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await inventoryApi.archiveItem(id)).data,
      };
    case 'rental-admin-preview-requests':
      return {
        list: async () => (await previewRequestsApi.getAll()).data,
        create: async (record: CrudRecord) =>
          (await previewRequestsApi.create({
            name: record.title,
            garmentName: record.garment,
            notes: record.result,
          })).data,
        update: async (record: CrudRecord) => (await previewRequestsApi.update(record.id, { resultNotes: record.result })).data,
        status: async (id: string, status: string) => (await previewRequestsApi.updateStatus(id, status.toUpperCase())).data,
        archive: async (id: string) => (await previewRequestsApi.archive(id)).data,
      };
    case 'rental-admin-users':
      return {
        list: async () => (await usersApi.getAll()).data,
        create: async (record: CrudRecord) =>
          (await usersApi.create({
            email: record.email,
            fullName: record.title,
            password: 'password123',
            role: String(record.role ?? 'CASHIER').toUpperCase(),
          })).data,
        update: async (record: CrudRecord) =>
          (await usersApi.update(record.id, {
            fullName: record.title,
            role: String(record.role ?? 'cashier').toUpperCase(),
          })).data,
        archive: async (id: string) => (await usersApi.archive(id)).data,
      };
    default:
      return null;
  }
}

function normalizeApiRows(config: CrudModuleConfig, apiRows: any[]): CrudRecord[] {
  switch (config.storageKey) {
    case 'rental-admin-leads':
      return apiRows.map((lead) => ({
        id: lead.id,
        title: lead.customer?.name ?? 'Lead',
        subtitle: `${lead.source ?? 'web'} · ${lead.customer?.email ?? ''}`,
        email: lead.customer?.email,
        phone: lead.customer?.phone,
        source: lead.source,
        request: lead.notes ?? 'Rental request',
        owner: lead.assignedTo?.fullName ?? 'Unassigned',
        status: fromApiStatus(lead.status),
        notes: lead.notes,
        timeline: ['Lead loaded from backend'],
      }));
    case 'rental-admin-appointments':
      return apiRows.map((appointment) => ({
        id: appointment.id,
        title: appointment.customer?.name ?? 'Appointment',
        subtitle: new Date(appointment.scheduledAt).toLocaleString(),
        type: fromApiStatus(appointment.type),
        owner: appointment.staff?.fullName ?? 'Unassigned',
        date: appointment.scheduledAt?.slice(0, 10),
        time: appointment.scheduledAt?.slice(11, 16),
        room: appointment.room,
        status: fromApiStatus(appointment.status),
        notes: appointment.notes,
        timeline: ['Appointment loaded from backend'],
      }));
    case 'rental-admin-bookings':
      return apiRows.map((booking) => ({
        id: booking.id,
        title: booking.customer?.name ?? 'Đơn thuê',
        subtitle: booking.id,
        item: booking.items?.[0]?.product?.name ?? 'No item',
        period: `${booking.startDate?.slice(0, 10)} to ${booking.endDate?.slice(0, 10)}`,
        status: fromApiStatus(booking.status),
        paid: booking.rental?.payments?.[0]?.amountPaid ?? 0,
        deposit: booking.rental?.payments?.[0]?.depositAmount ?? 0,
        timeline: ['Đơn thuê đã tải từ backend'],
      }));
    case 'rental-admin-payments':
      return apiRows.map((payment) => ({
        id: payment.id,
        title: payment.id,
        subtitle: payment.rental?.booking?.customer?.name ?? payment.rentalId,
        customer: payment.rental?.booking?.customer?.name,
        bookingId: payment.rental?.booking?.id,
        type: 'rental_payment',
        method: fromApiStatus(payment.paymentMethod),
        amount: payment.amount,
        status: fromApiStatus(payment.status),
        timeline: ['Payment loaded from backend'],
      }));
    case 'rental-admin-receipts':
      return apiRows.map((receipt) => ({
        id: receipt.id,
        title: receipt.receiptNumber,
        subtitle: receipt.payment?.rental?.booking?.id,
        customer: receipt.payment?.rental?.booking?.customer?.name,
        type: fromApiStatus(receipt.type),
        amount: receipt.payment?.amount,
        status: receipt.printedAt ? 'printed' : 'print_ready',
        timeline: ['Receipt loaded from backend'],
      }));
    case 'rental-admin-inventory':
      return apiRows.map((item) => ({
        id: item.id,
        title: item.serialNumber,
        subtitle: item.qrCode,
        product: item.product?.name,
        variant: item.condition,
        qrCode: item.qrCode,
        condition: item.condition,
        status: fromApiStatus(item.status),
        timeline: ['Inventory item loaded from backend'],
      }));
    case 'rental-admin-preview-requests':
      return apiRows.map((request) => ({
        id: request.id,
        title: request.customer?.name ?? 'Preview request',
        subtitle: request.id,
        garment: request.garmentName,
        requestedAt: request.createdAt?.slice(0, 10),
        result: request.resultNotes ?? request.notes,
        status: fromApiStatus(request.status),
        timeline: ['Preview request loaded from backend'],
      }));
    case 'rental-admin-users':
      return apiRows.map((user) => ({
        id: user.id,
        title: user.fullName,
        subtitle: user.email,
        email: user.email,
        role: fromApiStatus(user.role),
        status: user.isActive ? 'active' : 'disabled',
        workload: 0,
        timeline: ['User loaded from backend'],
      }));
    default:
      return apiRows;
  }
}

export function CrudPage({ config }: { config: CrudModuleConfig }) {
  const { t } = useI18n();
  const localizeOption = (option: string) => {
    const domains = ['booking', 'inventory', 'payment', 'lead', 'appointment', 'maintenance', 'user'];
    for (const domain of domains) {
      const localized = t(`${domain}.status.${option}`);
      if (localized !== `${domain}.status.${option}`) return localized;
    }
    return option.replace(/_/g, ' ');
  };
  const user = useAuthStore((state) => state.user);
  const [rows, setRows] = useState<CrudRecord[]>(config.seed);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [sortKey, setSortKey] = useState(config.columns[0]?.key ?? 'title');
  const [selected, setSelected] = useState<CrudRecord | null>(null);
  const [editing, setEditing] = useState<CrudRecord | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<CrudRecord | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const api = apiFor(config);

  const canCreate = can(user?.role, config.createPermission);
  const canUpdate = can(user?.role, config.updatePermission);
  const canArchive = can(user?.role, config.archivePermission);

  useEffect(() => {
    let mounted = true;
    async function loadRows() {
      if (!api?.list) {
        setRows(getInitialRows(config));
        return;
      }

      try {
        const apiRows = await api.list();
        if (mounted) setRows(normalizeApiRows(config, apiRows));
      } catch {
        if (mounted) {
          setRows(getInitialRows(config));
          showFeedback('error', t('errors.loadApiFallback', { entity: config.entityLabel.toLowerCase() }));
        }
      }
    }

    loadRows();
    return () => {
      mounted = false;
    };
  }, [config.storageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(config.storageKey, JSON.stringify(rows));
    }
  }, [rows, config.storageKey]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows
      .filter((row) => (status === 'archived' ? row.archived : !row.archived))
      .filter((row) => (status === 'active' || status === 'archived' ? true : row.status === status))
      .filter((row) => {
        if (!normalizedQuery) return true;
        return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')));
  }, [query, rows, sortKey, status]);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 2800);
  }

  function saveRecord(record: CrudRecord) {
    setSaving(true);
    window.setTimeout(async () => {
      if (!record.title?.trim()) {
        setSaving(false);
        showFeedback('error', t('errors.nameRequired', { entity: config.entityLabel }));
        return;
      }

      const exists = rows.some((row) => row.id === record.id);
      const updatedRecord = {
        ...record,
        timeline: [
          `${exists ? 'Updated' : 'Created'} ${config.entityLabel.toLowerCase()}`,
          ...(record.timeline ?? []),
        ],
      };

      try {
        const response =
          exists && api?.update
            ? await api.update(updatedRecord)
            : !exists && api?.create
              ? await api.create(updatedRecord)
              : null;
        const savedRecord = response ? normalizeApiRows(config, [response])[0] : updatedRecord;

        setRows((current) =>
          exists
            ? current.map((row) => (row.id === record.id ? savedRecord : row))
            : [savedRecord, ...current],
        );
        setEditing(null);
        setSelected(savedRecord);
        showFeedback('success', `${config.entityLabel} ${exists ? 'updated' : 'created'}.`);
      } catch {
        showFeedback('error', t('errors.saveFailed', { entity: config.entityLabel }));
      } finally {
        setSaving(false);
      }
    }, 350);
  }

  async function archiveRecord(record: CrudRecord) {
    try {
      if (api?.archive) {
        await api.archive(record.id);
      }
    } catch {
      showFeedback('error', t('errors.archiveFailed', { entity: config.entityLabel }));
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === record.id
          ? {
              ...row,
              archived: true,
              timeline: [`Archived ${config.entityLabel.toLowerCase()}`, ...(row.timeline ?? [])],
            }
          : row,
      ),
    );
    setSelected(null);
    setConfirmArchive(null);
    showFeedback('success', t('success.archived', { entity: config.entityLabel }));
  }

  async function changeStatus(record: CrudRecord, nextStatus: string) {
    if (!canUpdate) return;

    try {
      if (api?.status) {
        await api.status(record.id, toApiStatus(config, nextStatus));
      }
    } catch {
      showFeedback('error', t('errors.statusFailed'));
      return;
    }

    const updated = {
      ...record,
      status: nextStatus,
      timeline: [`Status changed to ${nextStatus}`, ...(record.timeline ?? [])],
    };

    setRows((current) => current.map((row) => (row.id === record.id ? updated : row)));
    setSelected(updated);
    showFeedback('success', t('success.statusUpdated', { status: nextStatus.replace(/_/g, ' ') }));
  }

  const rowsForTable = visibleRows.map((row) => [
    <button
      key="title"
      className="text-left"
      onClick={() => setSelected(row)}
    >
      <p className="font-semibold text-[rgb(var(--text-primary))]">{row.title}</p>
      <p className="text-xs text-[rgb(var(--text-muted))]">{row.subtitle ?? row.id}</p>
    </button>,
    ...config.columns.slice(1).map((column) => (
      column.key === 'status'
        ? <StatusBadge key={column.key} value={row.status} />
        : <span key={column.key} className={column.align === 'right' ? 'ml-auto tabular-nums' : ''}>{formatValue(row[column.key])}</span>
    )),
    <div key="actions" className="flex items-center gap-2">
      <button className="font-semibold text-[rgb(var(--accent-solid))]" onClick={() => setSelected(row)}>
        {t('common.open')}
      </button>
      {canUpdate && (
        <button className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]" onClick={() => setEditing(row)}>
          {t('common.edit')}
        </button>
      )}
    </div>,
  ]);

  return (
    <>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        subtitle={config.description}
        nextStep={config.nextStep}
        actions={
          canCreate ? (
            <AdminButton
              onClick={() =>
                setEditing({
                  id: makeId(config.entityLabel),
                  title: '',
                  status: config.statusOptions[0],
                  timeline: [],
                  related: [],
                })
              }
            >
              {config.primaryAction}
            </AdminButton>
          ) : undefined
        }
      />

      {feedback && (
        <div className="mb-4">
          <InlineAlert tone={feedback.type === 'success' ? 'success' : 'danger'}>
          {feedback.message}
          </InlineAlert>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-2.5">
        <div className="grid gap-2.5 md:grid-cols-5">
          <AdminInput className="md:col-span-2" placeholder={`${t('common.search')} ${config.entityLabel.toLowerCase()}s`} value={query} onChange={(event) => setQuery(event.target.value)} />
          <AdminSelect value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">{t('common.active')}</option>
            <option value="archived">{t('common.archived')}</option>
            {config.statusOptions.map((option) => (
              <option key={option} value={option}>{localizeOption(option)}</option>
            ))}
          </AdminSelect>
          <AdminSelect value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {config.columns.map((column) => (
              <option key={column.key} value={column.key}>{t('common.sortBy')} {column.label}</option>
            ))}
          </AdminSelect>
          <div className="flex items-center justify-end rounded-xl bg-[rgb(var(--surface-3))] px-3 text-xs font-semibold text-[rgb(var(--text-muted))]">
            {visibleRows.length} {t('common.records')}
          </div>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          title={t('crud.noRecordsHere', { entity: config.entityLabel })}
          description={t('crud.createOrAdjust', { entity: config.entityLabel })}
          action={canCreate ? <AdminButton onClick={() => setEditing({ id: makeId(config.entityLabel), title: '', status: config.statusOptions[0] })}>{t('crud.createEntity', { entity: config.entityLabel })}</AdminButton> : undefined}
        />
      ) : (
        <SectionCard title={t('crud.list', { entity: config.entityLabel })} description={t('crud.listDesc')}>
          <DataTable
            columns={[config.columns[0]?.label ?? config.entityLabel, ...config.columns.slice(1).map((column) => column.label), t('common.actions')]}
            rows={rowsForTable}
          />
        </SectionCard>
      )}

      {selected && (
        <DetailDrawer
          record={selected}
          config={config}
          canUpdate={canUpdate}
          canArchive={canArchive}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onArchive={() => setConfirmArchive(selected)}
          onStatusChange={(nextStatus) => changeStatus(selected, nextStatus)}
        />
      )}

      {editing && (
        <RecordModal
          record={editing}
          config={config}
          saving={saving}
          canSave={editing.id ? canUpdate || canCreate : canCreate}
          onClose={() => setEditing(null)}
          onSave={saveRecord}
        />
      )}

      {confirmArchive && (
        <ConfirmDialog
          title={t('crud.archiveConfirmTitle', { entity: config.entityLabel.toLowerCase() })}
          message={t('crud.archiveConfirmMsg', { title: confirmArchive.title })}
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => archiveRecord(confirmArchive)}
        />
      )}
    </>
  );
}

function DetailDrawer({
  record,
  config,
  canUpdate,
  canArchive,
  onClose,
  onEdit,
  onArchive,
  onStatusChange,
}: {
  record: CrudRecord;
  config: CrudModuleConfig;
  canUpdate: boolean;
  canArchive: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onStatusChange: (status: string) => void;
}) {
  const { t } = useI18n();
  const localizeOption = (option: string) => {
    const domains = ['booking', 'inventory', 'payment', 'lead', 'appointment', 'maintenance', 'user'];
    for (const domain of domains) {
      const localized = t(`${domain}.status.${option}`);
      if (localized !== `${domain}.status.${option}`) return localized;
    }
    return option.replace(/_/g, ' ');
  };
  return (
    <div className="fixed inset-0 z-50 bg-[rgb(var(--overlay))]" onClick={onClose}>
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-[rgb(var(--surface-2))] shadow-[var(--shadow-float)]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[rgb(var(--surface-border))] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{config.entityLabel}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{record.title}</h2>
              <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{record.subtitle ?? record.id}</p>
            </div>
            <AdminButton variant="secondary" onClick={onClose}>{t('common.close')}</AdminButton>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <SectionCard title={t('crud.summary')} description={t('crud.summaryDesc')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[rgb(var(--surface-3))] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{t('crud.status')}</p>
                <div className="mt-2"><StatusBadge value={record.status} /></div>
              </div>
              <div className="rounded-xl bg-[rgb(var(--surface-3))] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{t('crud.recordId')}</p>
                <p className="mt-2 font-mono text-sm font-semibold">{record.id}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('crud.actions')} description={t('crud.actionsDesc')}>
            <div className="grid gap-3">
              <AdminSelect value={record.status} disabled={!canUpdate} onChange={(event) => onStatusChange(event.target.value)}>
                {config.statusOptions.map((option) => (
                  <option key={option} value={option}>{localizeOption(option)}</option>
                ))}
              </AdminSelect>
              <div className="grid grid-cols-2 gap-3">
                <AdminButton variant="secondary" disabled={!canUpdate} onClick={onEdit}>{t('common.edit')}</AdminButton>
                <AdminButton variant="secondary" className="text-[rgb(var(--danger))]" disabled={!canArchive} onClick={onArchive}>{t('common.archive')}</AdminButton>
              </div>
            </div>
          </SectionCard>

          {config.workflow && (
            <SectionCard title={t('crud.workflow')} description={t('crud.workflowDesc')}>
              <div className="flex flex-wrap gap-2">
                {config.workflow.map((step) => (
                  <span
                    key={step}
                    className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-secondary))]"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title={t('crud.keyInfo')}>
            <div className="grid gap-3">
              {config.fields.slice(0, 8).map((field) => (
                <div key={field.key} className="flex items-center justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3 text-sm">
                  <span className="text-[rgb(var(--text-secondary))]">{field.label}</span>
                  <span className="max-w-[55%] truncate font-semibold">{formatValue(record[field.key])}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('crud.relatedData')}>
            <div className="space-y-2">
              {(record.related?.length ? record.related : [{ label: t('crud.workflow'), value: t('crud.noRelatedRecords') }]).map((item) => (
                <div key={item.label} className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3 text-sm">
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('crud.timeline')}>
            <ol className="space-y-3">
              {(record.timeline?.length ? record.timeline : [t('crud.recordCreated')]).map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[rgb(var(--accent-solid))]" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </aside>
    </div>
  );
}

function RecordModal({
  record,
  config,
  saving,
  canSave,
  onClose,
  onSave,
}: {
  record: CrudRecord;
  config: CrudModuleConfig;
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onSave: (record: CrudRecord) => void;
}) {
  const { t } = useI18n();
  const localizeOption = (option: string) => {
    const domains = ['booking', 'inventory', 'payment', 'lead', 'appointment', 'maintenance', 'user'];
    for (const domain of domains) {
      const localized = t(`${domain}.status.${option}`);
      if (localized !== `${domain}.status.${option}`) return localized;
    }
    return option.replace(/_/g, ' ');
  };
  const [draft, setDraft] = useState<CrudRecord>(record);
  const sections = Array.from(new Set(config.fields.map((field) => field.section ?? t('crud.details'))));

  function update(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value, title: key === 'title' ? value : current.title }));
  }

  return (
    <AdminModal
      open
      title={record.title ? t('crud.editEntity', { entity: config.entityLabel }) : t('crud.createEntity', { entity: config.entityLabel })}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>{t('common.cancel')}</AdminButton>
          <AdminButton disabled={!canSave || saving} loading={saving} onClick={() => onSave(draft)}>
            {saving ? t('common.saving') : t('common.save')}
          </AdminButton>
        </>
      }
    >
      <p className="mb-4 text-sm text-[rgb(var(--text-secondary))]">{t('crud.fieldsGrouped')}</p>
      <div className="space-y-4">
        {sections.map((section) => (
          <FormSection key={section} title={section} description={t('crud.requiredContext', { entity: config.entityLabel })}>
            {config.fields.filter((field) => (field.section ?? t('crud.details')) === section).map((field) => (
              <label key={field.key} className="grid gap-1.5 text-sm font-semibold">
                {field.label}{field.required && <span className="text-[rgb(var(--danger))]">{t('common.required')}</span>}
                {field.type === 'textarea' ? (
                  <textarea className="field h-24 py-3" value={String(draft[field.key] ?? '')} onChange={(event) => update(field.key, event.target.value)} />
                ) : field.type === 'select' ? (
                  <AdminSelect value={String(draft[field.key] ?? field.options?.[0] ?? '')} onChange={(event) => update(field.key, event.target.value)}>
                    {field.options?.map((option) => <option key={option} value={option}>{localizeOption(option)}</option>)}
                  </AdminSelect>
                ) : (
                  <AdminInput type={field.type ?? 'text'} value={String(draft[field.key] ?? '')} onChange={(event) => update(field.key, event.target.value)} />
                )}
              </label>
            ))}
          </FormSection>
        ))}
      </div>
    </AdminModal>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AdminModal
      open
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onCancel}>{t('common.cancel')}</AdminButton>
          <AdminButton onClick={onConfirm}>{t('common.archive')}</AdminButton>
        </>
      }
    >
      <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">{message}</p>
    </AdminModal>
  );
}
