'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { appointmentsApi, inventoryApi, usersApi } from '@/lib/api';
import { appointments as demoAppointments, inventory as demoInventory, staff as demoStaff, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import {
  ActionMenu,
  ControlSurface,
  DataTable,
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  PaginationControls,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminModal, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';

type AppointmentType = 'consultation' | 'fitting' | 'pickup' | 'delivery_preparation' | 'return';
type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
type ViewMode = 'calendar' | 'list';
type RangeMode = 'day' | 'week';

type AppointmentRow = {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  lifecycleStatus?: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  staffId?: string;
  staffName: string;
  resourceItemId?: string;
  resourceItemCode?: string;
  leadId?: string;
  bookingId?: string;
};

type StaffOption = { id: string; fullName: string };
type ItemOption = { id: string; serialNumber: string; status?: string };

const TYPE_OPTIONS: AppointmentType[] = ['consultation', 'fitting', 'pickup', 'delivery_preparation', 'return'];
const STATUS_OPTIONS: AppointmentStatus[] = ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'];

function toIsoLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeType(value?: string): AppointmentType {
  const normalized = String(value ?? 'consultation').toLowerCase();
  if (TYPE_OPTIONS.includes(normalized as AppointmentType)) return normalized as AppointmentType;
  return 'consultation';
}

function normalizeStatus(row: any): AppointmentStatus {
  const lifecycle = String(row.lifecycleStatus ?? '').toLowerCase();
  const status = String(row.status ?? '').toLowerCase();
  if (lifecycle === 'checked_in' || status === 'checked_in') return 'checked_in';
  if (lifecycle === 'completed' || status === 'completed') return 'completed';
  if (lifecycle === 'no_show' || status === 'no_show') return 'no_show';
  if (lifecycle === 'cancelled' || status === 'cancelled') return 'cancelled';
  return 'scheduled';
}

function appointmentFromApi(row: any, labels?: { unknownCustomer: string; unassigned: string }): AppointmentRow {
  const start = row.startTime ?? row.scheduledAt ?? row.date;
  const end = row.endTime ?? (start ? new Date(new Date(start).getTime() + Number(row.durationMinutes ?? 60) * 60000).toISOString() : new Date().toISOString());
  return {
    id: row.id,
    customerId: row.customer?.id ?? row.customerId,
    customerName: row.customer?.name ?? row.customer ?? labels?.unknownCustomer ?? '-',
    customerEmail: row.customer?.email ?? row.email,
    customerPhone: row.customer?.phone ?? row.phone,
    type: normalizeType(row.type),
    status: normalizeStatus(row),
    lifecycleStatus: row.lifecycleStatus,
    startTime: new Date(start ?? Date.now()).toISOString(),
    endTime: new Date(end).toISOString(),
    room: row.room,
    notes: row.notes,
    staffId: row.staff?.id ?? row.staffId,
    staffName: row.staff?.fullName ?? row.staff ?? labels?.unassigned ?? '-',
    resourceItemId: row.resourceItem?.id ?? row.resourceItemId,
    resourceItemCode: row.resourceItem?.serialNumber ?? row.resourceItem?.qrCode,
    leadId: row.leadId,
    bookingId: row.bookingId,
  };
}

function typeTone(type: AppointmentType): Tone {
  if (type === 'consultation') return 'accent';
  if (type === 'fitting') return 'info';
  if (type === 'pickup') return 'success';
  if (type === 'delivery_preparation') return 'warning';
  return 'warning';
}

function statusTone(status: AppointmentStatus): Tone {
  if (status === 'completed') return 'success';
  if (status === 'checked_in') return 'info';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  return 'warning';
}

function nextStepKey(row: AppointmentRow) {
  if (row.status === 'scheduled') return new Date(row.startTime).getTime() <= Date.now() + 30 * 60000 ? 'appointmentOps.next.checkIn' : 'appointmentOps.next.prepare';
  if (row.status === 'checked_in') return 'appointmentOps.next.complete';
  if (row.status === 'completed' && (row.type === 'consultation' || row.type === 'fitting')) return 'appointmentOps.next.convert';
  if (row.status === 'cancelled' || row.status === 'no_show') return 'appointmentOps.next.reschedule';
  return 'appointmentOps.next.done';
}

function appointmentTypeLabel(type: AppointmentType, t: (key: string) => string) {
  if (type === 'delivery_preparation') return t('leadFlow.appointmentType.delivery_preparation');
  return t(`appointmentOps.type.${type}`);
}

function appointmentStatusLabel(status: AppointmentStatus, t: (key: string) => string) {
  if (status === 'no_show') return t('leadFlow.appointmentStatus.no_show');
  return t(`appointment.status.${status}`);
}

function sourceLabel(row: AppointmentRow, t: (key: string) => string) {
  if (row.bookingId) return `${t('appointmentOps.source.booking')} ${row.bookingId}`;
  if (row.leadId) return `${t('appointmentOps.source.lead')} ${row.leadId}`;
  return t('appointmentOps.source.walkIn');
}

function isToday(row: AppointmentRow) {
  const today = startOfDay(new Date()).getTime();
  return startOfDay(new Date(row.startTime)).getTime() === today;
}

function isUpcoming(row: AppointmentRow) {
  const start = new Date(row.startTime).getTime();
  return row.status === 'scheduled' && start >= Date.now() && start <= Date.now() + 3 * 60 * 60 * 1000;
}

function statusToApi(status: AppointmentStatus) {
  return status.toUpperCase();
}

function newAppointmentDraft(startDate = new Date(Date.now() + 3600000), room = '') {
  const endDate = new Date(startDate.getTime() + 60 * 60000);
  return {
    name: '',
    email: '',
    phone: '',
    type: 'CONSULTATION',
    startTime: toIsoLocal(startDate),
    endTime: toIsoLocal(endDate),
    room,
    staffId: '',
    resourceItemId: '',
    notes: '',
  };
}

function AppointmentsPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { params, updateParams, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'startTime',
    sortOrder: 'asc',
  });
  const appointmentLabels = useMemo(() => ({
    unknownCustomer: t('leadOps.fallback.unknownCustomer'),
    unassigned: t('appointmentOps.unassigned'),
  }), [t]);
  const [rows, setRows] = useState<AppointmentRow[]>(demoAppointments.map((row) => appointmentFromApi(row, appointmentLabels)));
  const [staff, setStaff] = useState<StaffOption[]>(demoStaff.map((item) => ({ id: item.id, fullName: item.name })));
  const [items, setItems] = useState<ItemOption[]>(demoInventory.map((item) => ({ id: item.id, serialNumber: item.itemCode, status: item.status })));
  const [activeId, setActiveId] = useState(demoAppointments[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [rangeMode, setRangeMode] = useState<RangeMode>('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(newAppointmentDraft(new Date(Date.now() + 3600000), t('appointmentOps.form.defaultRoom')));
  const [editForm, setEditForm] = useState(newAppointmentDraft(new Date(Date.now() + 3600000), t('appointmentOps.form.defaultRoom')));
  const [availability, setAvailability] = useState<{ available: boolean; blockedBy: any[] } | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const query = params.search;
  const typeFilter = (searchParams.get('type') ?? 'all') as 'all' | AppointmentType;
  const statusFilter = (searchParams.get('status') ?? 'all') as 'all' | AppointmentStatus;
  const staffFilter = searchParams.get('staffId') ?? 'all';
  const windowStart = useMemo(() => startOfDay(anchorDate), [anchorDate]);
  const windowEnd = useMemo(() => addDays(windowStart, rangeMode === 'day' ? 1 : 7), [rangeMode, windowStart]);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [apRes, usersRes, invRes] = await Promise.allSettled([
        appointmentsApi.list({
          includeArchived: false,
          page: params.page,
          limit: params.limit,
          search: query || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter.toUpperCase(),
          status: statusFilter === 'all' ? undefined : statusToApi(statusFilter),
          staffId: staffFilter === 'all' ? undefined : staffFilter,
          sortBy: 'startTime',
          sortOrder: 'asc',
          dateFrom: windowStart.toISOString(),
          dateTo: windowEnd.toISOString(),
        }),
        usersApi.list({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
        inventoryApi.listItems({ status: 'AVAILABLE', limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);
      const appointmentRows = apRes.status === 'fulfilled' ? (apRes.value.data?.data ?? []).map((row: any) => appointmentFromApi(row, appointmentLabels)) : [];
      const nextRows = appointmentRows.length ? appointmentRows : demoAppointments.map((row) => appointmentFromApi(row, appointmentLabels));
      setRows(nextRows);
      if (apRes.status === 'fulfilled') {
        setMeta(apRes.value.data?.meta ?? { page: params.page, limit: params.limit, total: nextRows.length, totalPages: nextRows.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      }
      setActiveId((current) => nextRows.find((row: AppointmentRow) => row.id === current)?.id ?? nextRows[0]?.id ?? '');
      if (usersRes.status === 'fulfilled') {
        setStaff((usersRes.value.data?.data ?? []).map((user: any) => ({ id: user.id, fullName: user.fullName })));
      }
      if (invRes.status === 'fulfilled') {
        setItems((invRes.value.data?.data ?? []).map((item: any) => ({ id: item.id, serialNumber: item.serialNumber, status: item.status })));
      }
      if (apRes.status === 'rejected') setError(t('appointmentOps.errors.loadFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [params.limit, params.page, params.search, rangeMode, staffFilter, statusFilter, typeFilter, windowEnd, windowStart]);

  useEffect(() => {
    const start = form.startTime;
    const end = form.endTime;
    if (!start || !end) return;
    let activeRequest = true;
    appointmentsApi.getAvailability({
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      staffId: form.staffId || undefined,
      room: form.room || undefined,
      resourceItemId: form.resourceItemId || undefined,
    })
      .then((res) => {
        if (activeRequest) setAvailability(res.data);
      })
      .catch(() => {
        if (activeRequest) setAvailability(null);
      });
    return () => {
      activeRequest = false;
    };
  }, [form.endTime, form.resourceItemId, form.room, form.staffId, form.startTime]);

  useEffect(() => {
    if (!active) return;
    setEditForm({
      name: active.customerName,
      email: active.customerEmail ?? '',
      phone: active.customerPhone ?? '',
      type: active.type.toUpperCase(),
      startTime: toIsoLocal(new Date(active.startTime)),
      endTime: toIsoLocal(new Date(active.endTime)),
      room: active.room ?? '',
      staffId: active.staffId ?? '',
      resourceItemId: active.resourceItemId ?? '',
      notes: active.notes ?? '',
    });
  }, [active]);

  const visibleRows = useMemo(() => {
    return rows
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [rows]);

  const todayRows = useMemo(() => rows.filter(isToday).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()), [rows]);
  const upcomingRows = useMemo(() => rows.filter(isUpcoming).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()), [rows]);

  const stats = useMemo(() => ({
    today: todayRows.length,
    upcoming: upcomingRows.length,
    checkedIn: todayRows.filter((row) => row.status === 'checked_in').length,
    completed: todayRows.filter((row) => row.status === 'completed').length,
    cancelled: todayRows.filter((row) => row.status === 'cancelled').length,
  }), [todayRows, upcomingRows]);

  const runAction = async (key: string, operation: () => Promise<void>, success: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      await loadData();
      setFeedback({ tone: 'success', message: success });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('appointmentOps.errors.actionFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const submitCreate = async () => {
    await runAction(
      'create',
      async () => {
        await appointmentsApi.create({
          name: form.name,
          email: form.email,
          phone: form.phone,
          type: form.type,
          scheduledAt: new Date(form.startTime).toISOString(),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
          room: form.room,
          staffId: form.staffId || undefined,
          resourceItemId: form.resourceItemId || undefined,
          lifecycleStatus: 'pending',
          notes: form.notes,
        });
        setCreateOpen(false);
        setForm(newAppointmentDraft(new Date(Date.now() + 3600000), t('appointmentOps.form.defaultRoom')));
      },
      t('appointmentOps.success.created'),
    );
  };

  const submitEdit = async () => {
    if (!active) return;
    await runAction(
      'edit',
      async () => {
        await appointmentsApi.update(active.id, {
          customerId: active.customerId,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          type: editForm.type,
          scheduledAt: new Date(editForm.startTime).toISOString(),
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
          room: editForm.room,
          staffId: editForm.staffId || undefined,
          resourceItemId: editForm.resourceItemId || undefined,
          lifecycleStatus: active.lifecycleStatus ?? 'confirmed',
          notes: editForm.notes,
          leadId: active.leadId,
          bookingId: active.bookingId,
        });
        setEditOpen(false);
      },
      t('appointmentOps.success.updated'),
    );
  };

  const updateStatus = async (row: AppointmentRow, status: AppointmentStatus) => {
    await runAction(
      `status-${row.id}`,
      async () => {
        await appointmentsApi.updateStatus(row.id, statusToApi(status));
      },
      t('appointmentOps.success.statusUpdated'),
    );
  };

  const archiveAppointment = async () => {
    if (!active) return;
    await runAction(
      'archive',
      async () => {
        await appointmentsApi.archive(active.id);
      },
      t('appointmentOps.success.archived'),
    );
  };

  const openCreateAt = (date: Date) => {
    setForm(newAppointmentDraft(date, t('appointmentOps.form.defaultRoom')));
    setCreateOpen(true);
  };

  const groupedByDay = useMemo(() => {
    return Array.from({ length: rangeMode === 'day' ? 1 : 7 }, (_, index) => {
      const day = addDays(windowStart, index);
      const dayStart = startOfDay(day).getTime();
      return {
        day,
        rows: visibleRows.filter((row) => startOfDay(new Date(row.startTime)).getTime() === dayStart),
      };
    });
  }, [rangeMode, visibleRows, windowStart]);

  const timeline = active ? [
    { time: formatDateTime(active.startTime), title: t('appointmentOps.timeline.scheduled'), detail: sourceLabel(active, t), tone: 'warning' as Tone },
    active.status === 'checked_in' || active.status === 'completed' ? { time: formatDateTime(active.startTime), title: t('appointmentOps.timeline.checkedIn'), detail: active.staffName, tone: 'info' as Tone } : null,
    active.status === 'completed' ? { time: formatDateTime(active.endTime), title: t('appointmentOps.timeline.completed'), detail: t(nextStepKey(active)), tone: 'success' as Tone } : null,
    active.status === 'cancelled' ? { time: formatDateTime(active.endTime), title: t('appointmentOps.timeline.cancelled'), detail: active.notes ?? '-', tone: 'danger' as Tone } : null,
  ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone?: Tone }> : [];
  const primaryActionLabel = active
    ? active.status === 'scheduled'
      ? t('appointmentOps.actions.checkIn')
      : active.status === 'checked_in'
        ? t('appointmentOps.actions.complete')
        : active.bookingId
          ? t('appointmentOps.actions.openBooking')
          : active.leadId
            ? t('appointmentOps.actions.openLead')
            : t('appointmentOps.actions.reschedule')
    : '';

  return (
    <>
      <FeedbackPopup
        error={error}
        feedback={feedback}
        onClose={() => {
          setError(null);
          setFeedback(null);
        }}
      />

      <PageHeader
        eyebrow={t('appointmentOps.eyebrow')}
        title={t('appointmentOps.title')}
        subtitle={t('appointmentOps.subtitle')}
        nextStep={upcomingRows[0] ? `${formatTime(upcomingRows[0].startTime)} / ${upcomingRows[0].customerName}: ${t(nextStepKey(upcomingRows[0]))}` : t('appointmentOps.noUpcoming')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadData} loading={loading}>{t('common.refresh')}</AdminButton>
            <AdminButton onClick={() => setCreateOpen(true)}>{t('appointmentOps.create')}</AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('appointmentOps.stats.today'), value: stats.today, detail: t('appointmentOps.stats.todayDetail'), tone: stats.today ? 'info' : 'neutral' },
          { label: t('appointmentOps.stats.upcoming'), value: stats.upcoming, detail: t('appointmentOps.stats.upcomingDetail'), tone: stats.upcoming ? 'warning' : 'success' },
          { label: t('appointmentOps.stats.checkedIn'), value: stats.checkedIn, detail: t('appointmentOps.stats.checkedInDetail'), tone: stats.checkedIn ? 'accent' : 'neutral' },
          { label: t('appointmentOps.stats.completed'), value: stats.completed, detail: `${stats.cancelled} ${t('appointmentOps.stats.cancelledToday')}`, tone: stats.completed ? 'success' : 'neutral' },
        ]}
      />

      <div className="mt-6">
        <ControlSurface label={t('appointmentOps.controls.label')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('appointmentOps.controls.searchPlaceholder')}
            value={query}
            onChange={(event) => updateParams({ search: event.target.value }, { resetPage: true })}
          />
          <AdminSelect value={typeFilter} onChange={(event) => updateParams({ type: event.target.value }, { resetPage: true })}>
            <option value="all">{t('appointmentOps.controls.allTypes')}</option>
            {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{appointmentTypeLabel(type, t)}</option>)}
          </AdminSelect>
          <AdminSelect value={statusFilter} onChange={(event) => updateParams({ status: event.target.value }, { resetPage: true })}>
            <option value="all">{t('appointmentOps.controls.allStatuses')}</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{appointmentStatusLabel(status, t)}</option>)}
          </AdminSelect>
          <AdminSelect value={staffFilter} onChange={(event) => updateParams({ staffId: event.target.value }, { resetPage: true })}>
            <option value="all">{t('appointmentOps.controls.allStaff')}</option>
            <option value="unassigned">{t('appointmentOps.unassigned')}</option>
            {staff.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </AdminSelect>
          <AdminSelect value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)}>
            <option value="day">{t('appointmentOps.controls.day')}</option>
            <option value="week">{t('appointmentOps.controls.week')}</option>
          </AdminSelect>
        </ControlSurface>
      </div>

      <div className="mt-6">
        <WorkspaceLayout
          rail={
            <>
              <RailSection title={t('appointmentOps.rail.upcoming')}>
                <div className="space-y-2">
                  {(upcomingRows.length ? upcomingRows : todayRows.slice(0, 4)).map((row) => (
                    <button key={row.id} type="button" className="queue-row w-full text-left" onClick={() => setActiveId(row.id)}>
                      <div>
                        <p className="text-sm font-semibold">{formatTime(row.startTime)} / {row.customerName}</p>
                        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{appointmentTypeLabel(row.type, t)} / {row.staffName}</p>
                      </div>
                    <StatusBadge value={appointmentStatusLabel(row.status, t)} tone={statusTone(row.status)} />
                    </button>
                  ))}
                  {!upcomingRows.length && !todayRows.length ? <p className="text-sm text-[rgb(var(--text-muted))]">{t('appointmentOps.noUpcoming')}</p> : null}
                </div>
              </RailSection>
              {active ? (
                <>
                  <RailSection title={t('appointmentOps.rail.actions')}>
                    {active.status === 'scheduled' ? (
                      <AdminButton className="w-full" onClick={() => updateStatus(active, 'checked_in')} disabled={active.status !== 'scheduled'} loading={busyAction === `status-${active.id}`}>
                        {primaryActionLabel}
                      </AdminButton>
                    ) : active.status === 'checked_in' ? (
                      <AdminButton className="w-full" onClick={() => updateStatus(active, 'completed')} loading={busyAction === `status-${active.id}`}>
                        {primaryActionLabel}
                      </AdminButton>
                    ) : active.bookingId ? (
                      <Link className="button-primary w-full text-center" href={`/admin/bookings/${active.bookingId}`}>
                        {primaryActionLabel}
                      </Link>
                    ) : active.leadId ? (
                      <Link className="button-primary w-full text-center" href={`/admin/leads/${active.leadId}`}>
                        {primaryActionLabel}
                      </Link>
                    ) : (
                      <AdminButton className="w-full" onClick={() => setEditOpen(true)}>
                        {primaryActionLabel}
                      </AdminButton>
                    )}
                    <ActionMenu
                      className="w-full"
                      label={t('common.moreActions')}
                      items={[
                        { label: t('appointmentOps.actions.reschedule'), onSelect: () => setEditOpen(true) },
                        {
                          label: t('appointmentOps.actions.cancel'),
                          disabled: active.status === 'cancelled',
                          tone: 'danger',
                          onSelect: () => { void updateStatus(active, 'cancelled'); },
                        },
                        ...(active.leadId ? [{ label: t('appointmentOps.actions.openLead'), href: `/admin/leads/${active.leadId}` }] : []),
                        ...(active.bookingId ? [{ label: t('appointmentOps.actions.openBooking'), href: `/admin/bookings/${active.bookingId}` }] : []),
                        ...(!active.leadId ? [{ label: t('appointmentOps.actions.convert'), href: active.customerId ? `/admin/bookings/new?customerId=${active.customerId}` : '/admin/bookings/new' }] : []),
                      ]}
                    />
                  </RailSection>
                  <RailSection title={t('appointmentOps.rail.detail')}>
                    <KeyValueList
                      items={[
                        { label: t('appointmentOps.detail.customer'), value: active.customerName },
                        { label: t('appointmentOps.detail.source'), value: sourceLabel(active, t) },
                        { label: t('appointmentOps.detail.type'), value: <StatusBadge value={active.type} tone={typeTone(active.type)} /> },
                        { label: t('appointmentOps.detail.time'), value: `${formatTime(active.startTime)} - ${formatTime(active.endTime)}` },
                      ]}
                    />
                  </RailSection>
                </>
              ) : null}
            </>
          }
        >
          {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
          {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

          <SectionCard
            title={t('appointmentOps.scheduler.title')}
            description={t('appointmentOps.scheduler.description')}
            actions={
              <div className="flex flex-wrap gap-2">
                <AdminButton variant={viewMode === 'calendar' ? 'primary' : 'secondary'} onClick={() => setViewMode('calendar')}>{t('appointmentOps.views.calendar')}</AdminButton>
                <AdminButton variant={viewMode === 'list' ? 'primary' : 'secondary'} onClick={() => setViewMode('list')}>{t('appointmentOps.views.list')}</AdminButton>
              </div>
            }
          >
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <AdminButton variant="secondary" onClick={() => setAnchorDate(addDays(anchorDate, rangeMode === 'day' ? -1 : -7))}>{t('appointmentOps.controls.previous')}</AdminButton>
              <AdminButton variant="secondary" onClick={() => setAnchorDate(new Date())}>{t('appointmentOps.controls.today')}</AdminButton>
              <AdminButton variant="secondary" onClick={() => setAnchorDate(addDays(anchorDate, rangeMode === 'day' ? 1 : 7))}>{t('appointmentOps.controls.next')}</AdminButton>
              <span className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))]">
                {rangeMode === 'day' ? formatDate(windowStart.toISOString()) : `${formatDate(windowStart.toISOString())} - ${formatDate(addDays(windowEnd, -1).toISOString())}`}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</div>
            ) : viewMode === 'calendar' ? (
              <CalendarView groupedByDay={groupedByDay} activeId={activeId} onSelect={setActiveId} onCreate={openCreateAt} />
            ) : (
              <DataTable
                tableClassName="min-w-[1120px]"
                rowKeys={visibleRows.map((row) => row.id)}
                selectedRowKey={activeId}
                onRowClick={(rowIndex) => setActiveId(visibleRows[rowIndex]?.id ?? '')}
                columns={[
                  t('appointmentOps.columns.customer'),
                  t('appointmentOps.columns.type'),
                  t('appointmentOps.columns.time'),
                  t('appointmentOps.columns.status'),
                  t('appointmentOps.columns.staff'),
                  t('appointmentOps.columns.source'),
                  t('appointmentOps.columns.nextStep'),
                  t('common.actions'),
                ]}
                empty={t('appointmentOps.empty')}
                emptyDescription={t('appointmentOps.emptyDetail')}
                rows={visibleRows.map((row) => [
                  <div key={row.id} className="grid gap-1">
                    <span className="block font-semibold text-[rgb(var(--text-primary))]">{row.customerName}</span>
                    <span className="block text-xs text-[rgb(var(--text-secondary))]">{row.customerPhone ?? row.customerEmail ?? row.id}</span>
                    <span className="block text-xs text-[rgb(var(--text-muted))]">{row.room ?? t('appointmentOps.form.defaultRoom')}</span>
                  </div>,
                  <StatusBadge key={`${row.id}-type`} value={row.type} tone={typeTone(row.type)} />,
                  <div key={`${row.id}-time`} className="grid gap-1">
                    <span className={cn('font-semibold', isUpcoming(row) && 'text-[rgb(var(--warning))]')}>{formatDate(row.startTime)} / {formatTime(row.startTime)}</span>
                    <span className="text-xs text-[rgb(var(--text-muted))]">{formatTime(row.endTime)}</span>
                  </div>,
                  <StatusBadge key={`${row.id}-status`} value={row.status} tone={statusTone(row.status)} />,
                  <div key={`${row.id}-staff`} className="grid gap-1">
                    <span className="font-medium text-[rgb(var(--text-primary))]">{row.staffName}</span>
                    <span className="text-xs text-[rgb(var(--text-muted))]">{row.resourceItemCode ?? '-'}</span>
                  </div>,
                  <div key={`${row.id}-source`} className="grid gap-1">
                    <span className="font-medium text-[rgb(var(--text-primary))]">{sourceLabel(row, t)}</span>
                    <span className="text-xs text-[rgb(var(--text-muted))]">{row.notes || '-'}</span>
                  </div>,
                  <span key={`${row.id}-next`} className="font-semibold text-[rgb(var(--text-primary))]">{t(nextStepKey(row))}</span>,
                  <div key={`${row.id}-actions`} className="flex flex-wrap items-center justify-end gap-2">
                    {row.status === 'scheduled' ? (
                      <AdminButton size="sm" onClick={() => void updateStatus(row, 'checked_in')} loading={busyAction === `status-${row.id}`}>
                        {t('appointmentOps.short.checkIn')}
                      </AdminButton>
                    ) : row.status === 'checked_in' ? (
                      <AdminButton size="sm" onClick={() => void updateStatus(row, 'completed')} loading={busyAction === `status-${row.id}`}>
                        {t('appointmentOps.actions.complete')}
                      </AdminButton>
                    ) : row.bookingId ? (
                      <Link className="button-primary min-h-9 px-3 text-sm" href={`/admin/bookings/${row.bookingId}`}>
                        {t('appointmentOps.actions.openBooking')}
                      </Link>
                    ) : row.leadId ? (
                      <Link className="button-primary min-h-9 px-3 text-sm" href={`/admin/leads/${row.leadId}`}>
                        {t('appointmentOps.actions.openLead')}
                      </Link>
                    ) : (
                      <AdminButton size="sm" variant="secondary" onClick={() => { setActiveId(row.id); setEditOpen(true); }}>
                        {t('appointmentOps.actions.reschedule')}
                      </AdminButton>
                    )}
                    <ActionMenu
                      label={t('common.moreActions')}
                      items={[
                        { label: t('common.edit'), onSelect: () => { setActiveId(row.id); setEditOpen(true); } },
                        {
                          label: t('appointmentOps.actions.cancel'),
                          disabled: row.status === 'cancelled',
                          tone: 'danger',
                          onSelect: () => { void updateStatus(row, 'cancelled'); },
                        },
                        ...(row.leadId ? [{ label: t('appointmentOps.actions.openLead'), href: `/admin/leads/${row.leadId}` }] : []),
                        ...(row.bookingId ? [{ label: t('appointmentOps.actions.openBooking'), href: `/admin/bookings/${row.bookingId}` }] : []),
                        ...(!row.leadId ? [{ label: t('appointmentOps.actions.convert'), href: row.customerId ? `/admin/bookings/new?customerId=${row.customerId}` : '/admin/bookings/new' }] : []),
                      ]}
                    />
                  </div>,
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
            <SectionCard title={t('appointmentOps.detail.title')} description={t('appointmentOps.detail.description')}>
              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('appointmentOps.detail.customerInfo')}</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{active.customerName}</h2>
                        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{active.customerPhone ?? '-'} / {active.customerEmail ?? '-'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={active.type} tone={typeTone(active.type)} />
                        <StatusBadge value={active.status} tone={statusTone(active.status)} />
                      </div>
                    </div>
                  </div>
                  <KeyValueList
                    items={[
                      { label: t('appointmentOps.detail.source'), value: sourceLabel(active, t) },
                      { label: t('appointmentOps.detail.time'), value: `${formatDate(active.startTime)} / ${formatTime(active.startTime)} - ${formatTime(active.endTime)}` },
                      { label: t('appointmentOps.detail.room'), value: active.room ?? '-' },
                      { label: t('appointmentOps.detail.staff'), value: active.staffName },
                      { label: t('appointmentOps.detail.resource'), value: active.resourceItemCode ?? '-' },
                      { label: t('appointmentOps.detail.nextAction'), value: t(nextStepKey(active)) },
                    ]}
                  />
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-5 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('appointmentOps.detail.notes')}</p>
                    {active.notes || t('appointmentOps.detail.noNotes')}
                  </div>
                </div>
                <SectionCard title={t('appointmentOps.detail.timeline')} description={t('appointmentOps.detail.timelineDesc')} className="shadow-none">
                  <TimelineList items={timeline.length ? timeline : [{ time: formatDateTime(active.startTime), title: t('appointmentOps.timeline.scheduled'), detail: sourceLabel(active, t) }]} />
                </SectionCard>
                <SectionCard title={t('appointmentOps.detail.sourceBlock')} description={t('appointmentOps.detail.sourceBlockDesc')} className="shadow-none">
                  <KeyValueList
                    items={[
                      { label: t('appointmentOps.detail.sourceLead'), value: active.leadId ? `#${active.leadId}` : '-' },
                      { label: t('appointmentOps.detail.sourceBooking'), value: active.bookingId ? `#${active.bookingId}` : '-' },
                      { label: t('appointmentOps.detail.sourceFlow'), value: t('appointmentOps.detail.sourceFlowValue') },
                    ]}
                  />
                </SectionCard>
                <SectionCard title={t('appointmentOps.detail.afterCompletion')} description={t('appointmentOps.detail.afterCompletionDesc')} className="shadow-none">
                  <KeyValueList
                    items={[
                      { label: t('appointmentOps.detail.nextAction'), value: t(nextStepKey(active)) },
                      { label: t('appointmentOps.detail.sourceLead'), value: active.leadId ? t('appointmentOps.actions.openLead') : '-' },
                      { label: t('appointmentOps.detail.sourceBooking'), value: active.bookingId ? t('appointmentOps.actions.openBooking') : (!active.leadId ? t('appointmentOps.actions.convert') : '-') },
                    ]}
                  />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <AdminButton variant="secondary" onClick={() => setEditOpen(true)}>{t('appointmentOps.actions.reschedule')}</AdminButton>
                    <AdminButton variant="secondary" className="text-[rgb(var(--danger))]" onClick={archiveAppointment} loading={busyAction === 'archive'}>{t('common.archive')}</AdminButton>
                  </div>
                </SectionCard>
              </div>
            </SectionCard>
          ) : null}
        </WorkspaceLayout>
      </div>

      <AppointmentFormModal
        open={createOpen}
        title={t('appointmentOps.modals.create')}
        form={form}
        staff={staff}
        items={items}
        availability={availability}
        loading={busyAction === 'create'}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
        onChange={setForm}
      />

      <AppointmentFormModal
        open={editOpen}
        title={t('appointmentOps.modals.edit')}
        form={editForm}
        staff={staff}
        items={items}
        loading={busyAction === 'edit'}
        onClose={() => setEditOpen(false)}
        onSubmit={submitEdit}
        onChange={setEditForm}
      />
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsPageContent />
    </Suspense>
  );
}

function CalendarView({
  groupedByDay,
  activeId,
  onSelect,
  onCreate,
}: {
  groupedByDay: Array<{ day: Date; rows: AppointmentRow[] }>;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (date: Date) => void;
}) {
  const { t } = useI18n();
  const hours = useMemo(() => Array.from({ length: 13 }, (_, index) => index + 8), []);
  return (
    <div className="table-shell overflow-hidden">
      <div className="grid min-w-[780px]" style={{ gridTemplateColumns: `92px repeat(${groupedByDay.length}, minmax(220px, 1fr))` }}>
        <div className="border-b border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">
          {t('appointmentOps.calendar.time')}
        </div>
        {groupedByDay.map((group) => (
          <div key={group.day.toISOString()} className="border-b border-l border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3">
            <p className="text-sm font-semibold">{group.day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{group.rows.length} {t('common.records')}</p>
          </div>
        ))}
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-t border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-4 py-5 text-xs font-semibold text-[rgb(var(--text-muted))]">
              {String(hour).padStart(2, '0')}:00
            </div>
            {groupedByDay.map((group) => {
              const slotRows = group.rows.filter((row) => new Date(row.startTime).getHours() === hour);
              const slotDate = new Date(group.day);
              slotDate.setHours(hour, 0, 0, 0);
              return (
                <div key={`${group.day.toISOString()}-${hour}`} className="min-h-24 border-l border-t border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-1))] p-2">
                  {slotRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className={cn(
                        'mb-2 w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                        row.id === activeId ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{formatTime(row.startTime)}</span>
                        <AdminBadge tone={typeTone(row.type)}>{appointmentTypeLabel(row.type, t)}</AdminBadge>
                      </div>
                      <p className="truncate text-sm font-semibold">{row.customerName}</p>
                      <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{row.staffName} / {row.room ?? '-'}</p>
                    </button>
                  ))}
                  {!slotRows.length ? (
                    <button type="button" onClick={() => onCreate(slotDate)} className="h-full min-h-16 w-full rounded-xl border border-dashed border-[rgb(var(--surface-border))] text-xs font-semibold text-[rgb(var(--text-muted))] opacity-0 transition hover:opacity-100">
                      {t('appointmentOps.calendar.addSlot')}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentFormModal({
  open,
  title,
  form,
  staff,
  items,
  availability,
  loading,
  onClose,
  onSubmit,
  onChange,
}: {
  open: boolean;
  title: string;
  form: ReturnType<typeof newAppointmentDraft>;
  staff: StaffOption[];
  items: ItemOption[];
  availability?: { available: boolean; blockedBy: any[] } | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (form: ReturnType<typeof newAppointmentDraft>) => void;
}) {
  const { t } = useI18n();
  const setField = (key: keyof typeof form, value: string) => onChange({ ...form, [key]: value });
  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>{t('common.cancel')}</AdminButton>
          <AdminButton onClick={onSubmit} loading={loading} disabled={availability ? !availability.available : false}>
            {t('common.save')}
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t('appointmentOps.form.name')} value={form.name} onChange={(value) => setField('name', value)} />
        <FormField label={t('appointmentOps.form.email')} type="email" value={form.email} onChange={(value) => setField('email', value)} />
        <FormField label={t('appointmentOps.form.phone')} value={form.phone} onChange={(value) => setField('phone', value)} />
        <label className="grid gap-1.5 text-sm font-semibold">
          {t('appointmentOps.form.type')}
          <AdminSelect value={form.type} onChange={(event) => setField('type', event.target.value)}>
            <option value="CONSULTATION">{t('appointmentOps.type.consultation')}</option>
            <option value="FITTING">{t('appointmentOps.type.fitting')}</option>
            <option value="PICKUP">{t('appointmentOps.type.pickup')}</option>
            <option value="DELIVERY_PREPARATION">{t('leadFlow.appointmentType.delivery_preparation')}</option>
            <option value="RETURN">{t('appointmentOps.type.return')}</option>
          </AdminSelect>
        </label>
        <FormField label={t('appointmentOps.form.startTime')} type="datetime-local" value={form.startTime} onChange={(value) => setField('startTime', value)} />
        <FormField label={t('appointmentOps.form.endTime')} type="datetime-local" value={form.endTime} onChange={(value) => setField('endTime', value)} />
        <FormField label={t('appointmentOps.form.room')} value={form.room} onChange={(value) => setField('room', value)} />
        <label className="grid gap-1.5 text-sm font-semibold">
          {t('appointmentOps.form.staff')}
          <AdminSelect value={form.staffId} onChange={(event) => setField('staffId', event.target.value)}>
            <option value="">{t('appointmentOps.unassigned')}</option>
            {staff.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </AdminSelect>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          {t('appointmentOps.form.resource')}
          <AdminSelect value={form.resourceItemId} onChange={(event) => setField('resourceItemId', event.target.value)}>
            <option value="">{t('appointmentOps.form.noResource')}</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.serialNumber}</option>)}
          </AdminSelect>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
          {t('appointmentOps.form.notes')}
          <textarea className="field h-24 py-3" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
        </label>
      </div>
      {availability ? (
        <div className="mt-4">
          <InlineAlert tone={availability.available ? 'success' : 'danger'}>
            {availability.available ? t('appointmentOps.availability.available') : t('appointmentOps.availability.blocked')}
          </InlineAlert>
        </div>
      ) : null}
    </AdminModal>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <AdminInput type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
