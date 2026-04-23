'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { appointmentsApi, leadsApi, usersApi } from '@/lib/api';
import { leads as demoLeads, staff as demoStaff, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  ControlSurface,
  DataTable,
  InlineAlert,
  KeyValueList,
  PageHeader,
  PermissionButton,
  RailSection,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
  WorkspaceLayout,
} from './ui';
import { AdminBadge, AdminButton, AdminInput, AdminModal, AdminSelect, AdminSpinner, cn } from './primitives';

type LeadStatus = 'new' | 'contacted' | 'deposit_requested' | 'deposit_received' | 'booking_created' | 'lost';

type LeadRow = {
  id: string;
  customerId?: string;
  customer: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  owner: string;
  ownerId?: string;
  notes: string;
  interestedProduct: string;
  preferredRentalDate: string;
  quotedPrice: number;
  contactDeadlineAt?: string;
  contactedAt?: string;
  depositRequestedAt?: string;
  depositDeadlineAt?: string;
  depositReceivedAt?: string;
  convertedToBookingId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StaffOption = {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
};

const STATUS_OPTIONS: Array<{ value: 'all' | LeadStatus; labelKey: string }> = [
  { value: 'all', labelKey: 'leadOps.filters.allStatuses' },
  { value: 'new', labelKey: 'lead.status.new' },
  { value: 'contacted', labelKey: 'lead.status.contacted' },
  { value: 'deposit_requested', labelKey: 'lead.status.deposit_requested' },
  { value: 'deposit_received', labelKey: 'lead.status.deposit_received' },
  { value: 'booking_created', labelKey: 'lead.status.booking_created' },
  { value: 'lost', labelKey: 'lead.status.lost' },
];

const SOURCE_OPTIONS = ['all', 'web', 'zalo', 'facebook', 'walk-in', 'referral'];

function normalizeStatus(value?: string): LeadStatus {
  const normalized = String(value ?? 'new').toLowerCase();
  if (
    normalized === 'new' ||
    normalized === 'contacted' ||
    normalized === 'deposit_requested' ||
    normalized === 'deposit_received' ||
    normalized === 'booking_created' ||
    normalized === 'lost'
  ) {
    return normalized;
  }
  return 'new';
}

function parseRentalDates(value?: string | null) {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    const start = parsed.startDate ? new Date(parsed.startDate) : null;
    const end = parsed.endDate ? new Date(parsed.endDate) : null;
    if (start && end) return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    if (start) return start.toLocaleDateString();
  } catch {
    return value;
  }
  return value;
}

function contactDeadline(row: any) {
  if (row.contactDeadlineAt) return row.contactDeadlineAt;
  if (!row.createdAt) return undefined;
  return new Date(new Date(row.createdAt).getTime() + 60 * 60 * 1000).toISOString();
}

function leadFromApi(row: any): LeadRow {
  const demo = row.requestedLook ? row : undefined;
  const notes = row.notes ?? demo?.notes ?? '';
  return {
    id: row.id,
    customerId: row.customer?.id ?? row.customerId,
    customer: row.customer?.name ?? row.customer ?? row.title ?? 'Unknown customer',
    email: row.customer?.email ?? row.email ?? '-',
    phone: row.customer?.phone ?? row.phone ?? '-',
    source: row.source ?? 'web',
    status: normalizeStatus(row.status),
    owner: row.assignedTo?.fullName ?? row.staff ?? 'Unassigned',
    ownerId: row.assignedTo?.id ?? row.assignedToId,
    notes,
    interestedProduct: (row.interestedProduct ?? row.productName ?? row.requestedLook ?? notes) || 'Rental outfit consultation',
    preferredRentalDate: parseRentalDates(row.rentalDates) || row.date || 'Not confirmed',
    quotedPrice: Number(row.quotedPrice ?? row.budget ?? 0),
    contactDeadlineAt: contactDeadline(row),
    contactedAt: row.contactedAt,
    depositRequestedAt: row.depositRequestedAt,
    depositDeadlineAt: row.depositDeadlineAt,
    depositReceivedAt: row.depositReceivedAt,
    convertedToBookingId: row.convertedToBookingId,
    createdAt: row.createdAt ?? row.date,
    updatedAt: row.updatedAt,
  };
}

function minutesUntil(value?: string) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 60000);
}

function timeLabel(value?: string, fallback = 'Not set') {
  const minutes = minutesUntil(value);
  if (minutes === null) return fallback;
  const overdue = minutes < 0;
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return overdue ? `${text} overdue` : `${text} left`;
}

function urgencyTone(lead: LeadRow): Tone {
  if (lead.status === 'lost') return 'danger';
  if (lead.status === 'booking_created' || lead.status === 'deposit_received') return 'success';
  const contact = minutesUntil(lead.contactDeadlineAt);
  const deposit = minutesUntil(lead.depositDeadlineAt);
  if ((lead.status === 'new' && contact !== null && contact <= 0) || (lead.status === 'deposit_requested' && deposit !== null && deposit <= 0)) {
    return 'danger';
  }
  if ((lead.status === 'new' && contact !== null && contact <= 20) || lead.status === 'deposit_requested') return 'warning';
  if (lead.status === 'contacted') return 'info';
  return 'neutral';
}

function urgencyScore(lead: LeadRow) {
  const contact = minutesUntil(lead.contactDeadlineAt) ?? 9999;
  const deposit = minutesUntil(lead.depositDeadlineAt) ?? 9999;
  if (lead.status === 'new') return contact;
  if (lead.status === 'deposit_requested') return deposit + 1000;
  if (lead.status === 'contacted') return 3000;
  if (lead.status === 'deposit_received') return 4000;
  if (lead.status === 'booking_created') return 5000;
  return 9000;
}

function depositPercent(lead: LeadRow) {
  if (lead.status === 'deposit_received' || lead.status === 'booking_created') return 100;
  if (lead.status !== 'deposit_requested') return 0;
  const start = lead.depositRequestedAt ? new Date(lead.depositRequestedAt).getTime() : Date.now();
  const end = lead.depositDeadlineAt ? new Date(lead.depositDeadlineAt).getTime() : start + 5 * 60 * 60 * 1000;
  const elapsed = Date.now() - start;
  const total = Math.max(end - start, 1);
  return Math.min(95, Math.max(12, Math.round((elapsed / total) * 100)));
}

function nextStep(lead: LeadRow) {
  if (lead.status === 'new') return 'leadOps.next.call';
  if (lead.status === 'contacted') return 'leadOps.next.deposit';
  if (lead.status === 'deposit_requested') return 'leadOps.next.verify';
  if (lead.status === 'deposit_received') return 'leadOps.next.booking';
  if (lead.status === 'booking_created') return 'leadOps.next.done';
  return 'leadOps.next.recover';
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function zaloUrl(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits ? `https://zalo.me/${digits}` : 'https://zalo.me';
}

function defaultAppointmentStart() {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date;
}

export function LeadManagementScreen() {
  const { t } = useI18n();
  const [rows, setRows] = useState<LeadRow[]>(demoLeads.map(leadFromApi));
  const [staffRows, setStaffRows] = useState<StaffOption[]>(demoStaff.map((item) => ({ id: item.id, fullName: item.name, email: item.email, role: item.role })));
  const [activeId, setActiveId] = useState(demoLeads[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState({ name: '', email: '', phone: '', source: 'web', notes: '' });
  const [editDraft, setEditDraft] = useState({ notes: '', quotedPrice: '' });
  const [assignDraft, setAssignDraft] = useState('');
  const appointmentStart = useMemo(() => defaultAppointmentStart(), []);
  const [appointmentDraft, setAppointmentDraft] = useState({
    startTime: appointmentStart.toISOString().slice(0, 16),
    room: 'Consultation A',
    notes: '',
  });

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [rows, activeId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadResponse, userResponse] = await Promise.allSettled([leadsApi.getAll(), usersApi.getAll()]);
      const leadRows = leadResponse.status === 'fulfilled' ? (leadResponse.value.data ?? []).map(leadFromApi) : [];
      const userRows = userResponse.status === 'fulfilled'
        ? (userResponse.value.data ?? []).map((user: any) => ({ id: user.id, fullName: user.fullName, email: user.email, role: user.role }))
        : [];
      const nextRows = leadRows.length ? leadRows : demoLeads.map(leadFromApi);
      setRows(nextRows);
      setStaffRows(userRows.length ? userRows : demoStaff.map((item) => ({ id: item.id, fullName: item.name, email: item.email, role: item.role })));
      setActiveId((current) => nextRows.find((row: LeadRow) => row.id === current)?.id ?? nextRows[0]?.id ?? '');
      if (leadResponse.status === 'rejected') {
        setError(t('leadOps.errors.loadFallback'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    setEditDraft({ notes: active.notes, quotedPrice: active.quotedPrice ? String(active.quotedPrice) : '' });
    setAssignDraft(active.ownerId ?? '');
    setAppointmentDraft((draft) => ({
      ...draft,
      notes: `${active.interestedProduct}. ${active.preferredRentalDate}`,
    }));
  }, [active]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((lead) => statusFilter === 'all' || lead.status === statusFilter)
      .filter((lead) => sourceFilter === 'all' || lead.source === sourceFilter)
      .filter((lead) => ownerFilter === 'all' || lead.ownerId === ownerFilter || (ownerFilter === 'unassigned' && !lead.ownerId))
      .filter((lead) => {
        if (!normalizedQuery) return true;
        return [lead.customer, lead.phone, lead.email, lead.source, lead.owner, lead.interestedProduct, lead.notes]
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  }, [ownerFilter, query, rows, sourceFilter, statusFilter]);

  const stats = useMemo(() => {
    const contactDue = rows.filter((lead) => lead.status === 'new' && (minutesUntil(lead.contactDeadlineAt) ?? 0) <= 60).length;
    const overdueContact = rows.filter((lead) => lead.status === 'new' && (minutesUntil(lead.contactDeadlineAt) ?? 1) <= 0).length;
    const depositHolds = rows.filter((lead) => lead.status === 'deposit_requested').length;
    const depositOverdue = rows.filter((lead) => lead.status === 'deposit_requested' && (minutesUntil(lead.depositDeadlineAt) ?? 1) <= 0).length;
    const bookingReady = rows.filter((lead) => lead.status === 'deposit_received').length;
    return { contactDue, overdueContact, depositHolds, depositOverdue, bookingReady };
  }, [rows]);

  const runAction = async (key: string, operation: () => Promise<void>, success: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      await load();
      setFeedback({ tone: 'success', message: success });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.actionFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const createLead = async () => {
    await runAction(
      'create',
      async () => {
        await leadsApi.create(createDraft);
        setCreateOpen(false);
        setCreateDraft({ name: '', email: '', phone: '', source: 'web', notes: '' });
      },
      t('leadOps.success.created'),
    );
  };

  const editLead = async () => {
    if (!active) return;
    await runAction(
      'edit',
      async () => {
        await leadsApi.update(active.id, {
          notes: editDraft.notes,
          quotedPrice: editDraft.quotedPrice ? Number(editDraft.quotedPrice) : undefined,
        });
        setEditOpen(false);
      },
      t('leadOps.success.updated'),
    );
  };

  const assignLead = async () => {
    if (!active || !assignDraft) return;
    await runAction(
      'assign',
      async () => {
        await leadsApi.assignTo(active.id, assignDraft);
        setAssignOpen(false);
      },
      t('leadOps.success.assigned'),
    );
  };

  const updateStatus = async (lead: LeadRow, status: LeadStatus) => {
    await runAction(
      `status-${lead.id}`,
      async () => {
        if (status === 'contacted') await leadsApi.markContacted(lead.id, { notes: t('leadOps.timeline.callLogged') });
        else if (status === 'deposit_requested') await leadsApi.requestDeposit(lead.id, { quotedPrice: lead.quotedPrice || undefined });
        else await leadsApi.updateStatus(lead.id, status.toUpperCase());
      },
      t('leadOps.success.statusUpdated'),
    );
  };

  const archiveLead = async () => {
    if (!active) return;
    await runAction(
      'archive',
      async () => {
        await leadsApi.archive(active.id);
      },
      t('leadOps.success.archived'),
    );
  };

  const callCustomer = async () => {
    if (!active) return;
    window.location.href = `tel:${active.phone}`;
    await updateStatus(active, 'contacted');
  };

  const sendZalo = async () => {
    if (!active) return;
    window.open(zaloUrl(active.phone), '_blank', 'noopener,noreferrer');
    await runAction(
      'zalo',
      async () => {
        await leadsApi.markContacted(active.id, { notes: t('leadOps.timeline.zaloSent') });
      },
      t('leadOps.success.zaloLogged'),
    );
  };

  const createAppointment = async () => {
    if (!active) return;
    const start = new Date(appointmentDraft.startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await runAction(
      'appointment',
      async () => {
        await appointmentsApi.create({
          leadId: active.id,
          customerId: active.customerId,
          name: active.customer,
          email: active.email,
          phone: active.phone,
          type: 'CONSULTATION',
          scheduledAt: start.toISOString(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          room: appointmentDraft.room,
          staffId: active.ownerId || undefined,
          lifecycleStatus: 'pending',
          notes: appointmentDraft.notes,
        });
        setAppointmentOpen(false);
      },
      t('leadOps.success.appointmentCreated'),
    );
  };

  const timeline = active ? [
    { time: formatDateTime(active.createdAt), title: t('leadOps.timeline.created'), detail: active.source, tone: 'neutral' as Tone },
    active.contactedAt ? { time: formatDateTime(active.contactedAt), title: t('leadOps.timeline.contacted'), detail: active.owner, tone: 'info' as Tone } : null,
    active.depositRequestedAt ? { time: formatDateTime(active.depositRequestedAt), title: t('leadOps.timeline.depositRequested'), detail: timeLabel(active.depositDeadlineAt), tone: 'warning' as Tone } : null,
    active.depositReceivedAt ? { time: formatDateTime(active.depositReceivedAt), title: t('leadOps.timeline.depositReceived'), detail: t('leadOps.timeline.readyForBooking'), tone: 'success' as Tone } : null,
    active.convertedToBookingId ? { time: formatDateTime(active.updatedAt), title: t('leadOps.timeline.converted'), detail: active.convertedToBookingId, tone: 'success' as Tone } : null,
  ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone?: Tone }> : [];

  return (
    <>
      <PageHeader
        eyebrow={t('leadOps.eyebrow')}
        title={t('leadOps.title')}
        subtitle={t('leadOps.subtitle')}
        nextStep={filteredRows[0] ? `${filteredRows[0].customer}: ${t(nextStep(filteredRows[0]))}` : t('leadOps.noBlockers')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={load} loading={loading}>{t('common.refresh')}</AdminButton>
            <PermissionButton permission="manage_leads" onClick={() => setCreateOpen(true)}>
              {t('leadOps.createLead')}
            </PermissionButton>
          </>
        }
      />

      <SummaryRow
        items={[
          {
            label: t('leadOps.stats.contactSla'),
            value: `${stats.contactDue}`,
            detail: stats.overdueContact ? t('leadOps.stats.overdueCount', { count: stats.overdueContact }) : t('leadOps.stats.oneHourRule'),
            tone: stats.overdueContact ? 'danger' : stats.contactDue ? 'warning' : 'success',
          },
          {
            label: t('leadOps.stats.depositWindow'),
            value: `${stats.depositHolds}`,
            detail: stats.depositOverdue ? t('leadOps.stats.depositOverdue', { count: stats.depositOverdue }) : t('leadOps.stats.fiveHourRule'),
            tone: stats.depositOverdue ? 'danger' : stats.depositHolds ? 'warning' : 'neutral',
          },
          {
            label: t('leadOps.stats.bookingReady'),
            value: `${stats.bookingReady}`,
            detail: t('leadOps.stats.readyDetail'),
            tone: stats.bookingReady ? 'success' : 'neutral',
          },
          {
            label: t('leadOps.stats.visibleLeads'),
            value: `${filteredRows.length}`,
            detail: t('leadOps.stats.filteredDetail'),
            tone: 'info',
          },
        ]}
      />

      <div className="mt-6">
        <ControlSurface label={t('leadOps.filters.label')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('leadOps.filters.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LeadStatus)}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
          </AdminSelect>
          <AdminSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === 'all' ? t('leadOps.filters.allSources') : source}</option>)}
          </AdminSelect>
          <AdminSelect value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="all">{t('leadOps.filters.allStaff')}</option>
            <option value="unassigned">{t('leadOps.unassigned')}</option>
            {staffRows.map((staff) => <option key={staff.id} value={staff.id}>{staff.fullName}</option>)}
          </AdminSelect>
          <AdminButton variant="secondary" onClick={() => { setQuery(''); setStatusFilter('all'); setSourceFilter('all'); setOwnerFilter('all'); }}>
            {t('leadOps.filters.reset')}
          </AdminButton>
        </ControlSurface>
      </div>

      <div className="mt-6">
        <WorkspaceLayout
          rail={active ? (
            <>
              <RailSection title={t('leadOps.actionPanel')}>
                <AdminButton className="w-full" onClick={callCustomer} loading={busyAction?.startsWith('status-')}>{t('leadOps.actions.call')}</AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={sendZalo} loading={busyAction === 'zalo'}>{t('leadOps.actions.zalo')}</AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => updateStatus(active, 'deposit_requested')} loading={busyAction?.startsWith('status-')}>
                  {t('leadOps.actions.requestDeposit')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => setAppointmentOpen(true)}>{t('leadOps.actions.appointment')}</AdminButton>
                <Link className="button-primary w-full text-center" href={`/admin/bookings/new?lead=${active.id}`}>{t('leadOps.actions.convert')}</Link>
              </RailSection>
              <RailSection title={t('leadOps.detail.depositStatus')}>
                <DepositProgress lead={active} />
                <div className="mt-3 grid gap-2 text-xs text-[rgb(var(--text-secondary))]">
                  <div className="flex justify-between"><span>{t('leadOps.detail.contactDeadline')}</span><b>{timeLabel(active.contactDeadlineAt)}</b></div>
                  <div className="flex justify-between"><span>{t('leadOps.detail.depositDeadline')}</span><b>{timeLabel(active.depositDeadlineAt, t('leadOps.notRequested'))}</b></div>
                </div>
              </RailSection>
              <RailSection title={t('leadOps.manageLead')}>
                <AdminButton variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>{t('common.edit')}</AdminButton>
                <PermissionButton permission="manage_leads" className="button-secondary w-full" onClick={() => setAssignOpen(true)}>{t('leadOps.actions.assign')}</PermissionButton>
                <AdminSelect value={active.status} onChange={(event) => updateStatus(active, event.target.value as LeadStatus)}>
                  {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </AdminSelect>
                <PermissionButton permission="manage_leads" className="button-secondary w-full text-[rgb(var(--danger))]" onClick={archiveLead} disabled={busyAction === 'archive'}>
                  {t('common.archive')}
                </PermissionButton>
              </RailSection>
            </>
          ) : null}
        >
          {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
          {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

          <SectionCard
            title={t('leadOps.table.title')}
            description={t('leadOps.table.description')}
            actions={loading ? <span className="inline-flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</span> : undefined}
          >
            <DataTable
              columns={[
                t('leadOps.columns.customer'),
                t('leadOps.columns.source'),
                t('leadOps.columns.status'),
                t('leadOps.columns.assignedStaff'),
                t('leadOps.columns.contactDeadline'),
                t('leadOps.columns.depositProgress'),
                t('leadOps.columns.nextStep'),
                t('common.actions'),
              ]}
              loading={loading}
              empty={t('leadOps.empty')}
              rows={filteredRows.map((lead) => [
                <button key={lead.id} type="button" className="text-left" onClick={() => setActiveId(lead.id)}>
                  <span className="block font-semibold text-[rgb(var(--text-primary))]">{lead.customer}</span>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">{lead.phone}</span>
                </button>,
                <AdminBadge key={`${lead.id}-source`} tone="neutral">{lead.source}</AdminBadge>,
                <StatusBadge key={`${lead.id}-status`} value={lead.status} tone={urgencyTone(lead)} />,
                <span key={`${lead.id}-owner`} className={cn(!lead.ownerId && 'text-[rgb(var(--danger))]')}>{lead.owner}</span>,
                <DeadlineCell key={`${lead.id}-contact`} lead={lead} />,
                <DepositProgress key={`${lead.id}-deposit`} lead={lead} compact />,
                <span key={`${lead.id}-next`} className="font-semibold text-[rgb(var(--text-primary))]">{t(nextStep(lead))}</span>,
                <div key={`${lead.id}-actions`} className="flex flex-wrap gap-2">
                  <AdminButton size="sm" variant="secondary" onClick={() => { setActiveId(lead.id); updateStatus(lead, 'contacted'); }}>
                    {t('leadOps.short.call')}
                  </AdminButton>
                  <AdminButton size="sm" variant="secondary" onClick={() => { setActiveId(lead.id); updateStatus(lead, 'deposit_requested'); }}>
                    {t('leadOps.short.deposit')}
                  </AdminButton>
                </div>,
              ])}
            />
          </SectionCard>

          {active ? (
            <SectionCard title={t('leadOps.detail.title')} description={t('leadOps.detail.description')}>
              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('leadOps.detail.customerInfo')}</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{active.customer}</h2>
                        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{active.phone} / {active.email}</p>
                      </div>
                      <StatusBadge value={active.status} tone={urgencyTone(active)} />
                    </div>
                  </div>
                  <KeyValueList
                    items={[
                      { label: t('leadOps.detail.product'), value: active.interestedProduct },
                      { label: t('leadOps.detail.preferredDate'), value: active.preferredRentalDate },
                      { label: t('leadOps.detail.source'), value: active.source },
                      { label: t('leadOps.detail.assignedStaff'), value: active.owner },
                      { label: t('leadOps.detail.quote'), value: active.quotedPrice ? currency(active.quotedPrice) : t('leadOps.notQuoted') },
                      { label: t('leadOps.detail.nextAction'), value: t(nextStep(active)) },
                    ]}
                  />
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-5 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('leadOps.detail.notes')}</p>
                    {active.notes || t('leadOps.detail.noNotes')}
                  </div>
                </div>
                <div className="space-y-5">
                  <SectionCard title={t('leadOps.detail.timeline')} description={t('leadOps.detail.timelineDesc')} className="shadow-none">
                    <TimelineList items={timeline.length ? timeline : [{ time: formatDateTime(active.createdAt), title: t('leadOps.timeline.created'), detail: active.source }]} />
                  </SectionCard>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </WorkspaceLayout>
      </div>

      <AdminModal
        open={createOpen}
        title={t('leadOps.modals.createTitle')}
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={createLead} loading={busyAction === 'create'} disabled={!createDraft.name || !createDraft.email || !createDraft.phone}>{t('leadOps.createLead')}</AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LeadTextField label={t('leadOps.form.name')} value={createDraft.name} onChange={(value) => setCreateDraft((draft) => ({ ...draft, name: value }))} />
          <LeadTextField label={t('leadOps.form.email')} type="email" value={createDraft.email} onChange={(value) => setCreateDraft((draft) => ({ ...draft, email: value }))} />
          <LeadTextField label={t('leadOps.form.phone')} value={createDraft.phone} onChange={(value) => setCreateDraft((draft) => ({ ...draft, phone: value }))} />
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.source')}
            <AdminSelect value={createDraft.source} onChange={(event) => setCreateDraft((draft) => ({ ...draft, source: event.target.value }))}>
              {SOURCE_OPTIONS.filter((source) => source !== 'all').map((source) => <option key={source} value={source}>{source}</option>)}
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('leadOps.form.notes')}
            <textarea className="field h-24 py-3" value={createDraft.notes} onChange={(event) => setCreateDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={editOpen}
        title={t('leadOps.modals.editTitle')}
        onClose={() => setEditOpen(false)}
        size="lg"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setEditOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={editLead} loading={busyAction === 'edit'}>{t('common.save')}</AdminButton>
          </>
        }
      >
        <div className="grid gap-4">
          <LeadTextField label={t('leadOps.form.quote')} type="number" value={editDraft.quotedPrice} onChange={(value) => setEditDraft((draft) => ({ ...draft, quotedPrice: value }))} />
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.notes')}
            <textarea className="field h-32 py-3" value={editDraft.notes} onChange={(event) => setEditDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={assignOpen}
        title={t('leadOps.modals.assignTitle')}
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setAssignOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={assignLead} loading={busyAction === 'assign'} disabled={!assignDraft}>{t('leadOps.actions.assign')}</AdminButton>
          </>
        }
      >
        <AdminSelect value={assignDraft} onChange={(event) => setAssignDraft(event.target.value)}>
          <option value="">{t('leadOps.unassigned')}</option>
          {staffRows.map((staff) => <option key={staff.id} value={staff.id}>{staff.fullName} / {staff.role ?? 'staff'}</option>)}
        </AdminSelect>
      </AdminModal>

      <AdminModal
        open={appointmentOpen}
        title={t('leadOps.modals.appointmentTitle')}
        onClose={() => setAppointmentOpen(false)}
        size="lg"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setAppointmentOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={createAppointment} loading={busyAction === 'appointment'}>{t('leadOps.actions.appointment')}</AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LeadTextField label={t('leadOps.form.appointmentTime')} type="datetime-local" value={appointmentDraft.startTime} onChange={(value) => setAppointmentDraft((draft) => ({ ...draft, startTime: value }))} />
          <LeadTextField label={t('leadOps.form.room')} value={appointmentDraft.room} onChange={(value) => setAppointmentDraft((draft) => ({ ...draft, room: value }))} />
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('leadOps.form.notes')}
            <textarea className="field h-24 py-3" value={appointmentDraft.notes} onChange={(event) => setAppointmentDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>
    </>
  );
}

function LeadTextField({
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

function DeadlineCell({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();
  const tone = urgencyTone(lead);
  return (
    <div className="grid gap-1">
      <span className={cn('font-semibold', tone === 'danger' && 'text-[rgb(var(--danger))]', tone === 'warning' && 'text-[rgb(var(--warning))]')}>
        {timeLabel(lead.contactDeadlineAt)}
      </span>
      <span className="text-xs text-[rgb(var(--text-muted))]">{t('leadOps.stats.oneHourRule')}</span>
    </div>
  );
}

function DepositProgress({ lead, compact = false }: { lead: LeadRow; compact?: boolean }) {
  const { t } = useI18n();
  const percent = depositPercent(lead);
  const tone = urgencyTone(lead);
  const label =
    lead.status === 'deposit_received' || lead.status === 'booking_created'
      ? t('leadOps.deposit.paid')
      : lead.status === 'deposit_requested'
        ? timeLabel(lead.depositDeadlineAt)
        : t('leadOps.notRequested');

  return (
    <div className={cn('w-full', !compact && 'rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{compact ? t('leadOps.deposit.label') : t('leadOps.deposit.window')}</span>
        <span className="text-xs font-semibold text-[rgb(var(--text-secondary))]">{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-border))]/70">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            tone === 'danger' ? 'bg-[rgb(var(--danger))]' : tone === 'warning' ? 'bg-[rgb(var(--warning))]' : 'bg-[rgb(var(--success))]',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{t('leadOps.deposit.rule')}</p>}
    </div>
  );
}
