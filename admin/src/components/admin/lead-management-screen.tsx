'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { leadsApi, usersApi } from '@/lib/api';
import { can } from '@/lib/admin/permissions';
import { leads as demoLeads, staff as demoStaff, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/auth.store';
import {
  ControlSurface,
  EmptyState,
  FeedbackPopup,
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
import { MoneyInput } from './lead-ui';
import { AdminBadge, AdminButton, AdminIconButton, AdminInput, AdminModal, AdminSelect, AdminSpinner, cn } from './primitives';

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'product_selected'
  | 'deposit_requested'
  | 'deposit_received'
  | 'appointment_created'
  | 'appointment_completed'
  | 'booking_created'
  | 'deposit_expired'
  | 'lost'
  | 'cancelled';

type StaffOption = {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
};

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
  quotedPrice: number;
  productId?: string;
  productName?: string;
  variantName?: string;
  inventoryItemLabel?: string;
  pickupDate?: string;
  returnDate?: string;
  appointmentId?: string;
  appointmentStatus?: string;
  appointmentTime?: string;
  bookingId?: string;
  bookingStatus?: string;
  contactDeadlineAt?: string;
  contactedAt?: string;
  depositRequestedAt?: string;
  depositDeadlineAt?: string;
  depositReceivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ConfirmAction =
  | { kind: 'archive'; lead: LeadRow }
  | { kind: 'cancel'; lead: LeadRow }
  | null;

const STATUS_OPTIONS: Array<{ value: 'all' | LeadStatus; labelKey: string }> = [
  { value: 'all', labelKey: 'leadOps.filters.allStatuses' },
  { value: 'new', labelKey: 'lead.status.new' },
  { value: 'contacted', labelKey: 'lead.status.contacted' },
  { value: 'product_selected', labelKey: 'lead.status.product_selected' },
  { value: 'deposit_requested', labelKey: 'lead.status.deposit_requested' },
  { value: 'deposit_received', labelKey: 'lead.status.deposit_received' },
  { value: 'appointment_created', labelKey: 'lead.status.appointment_created' },
  { value: 'appointment_completed', labelKey: 'lead.status.appointment_completed' },
  { value: 'booking_created', labelKey: 'lead.status.booking_created' },
  { value: 'deposit_expired', labelKey: 'lead.status.deposit_expired' },
  { value: 'cancelled', labelKey: 'lead.status.cancelled' },
  { value: 'lost', labelKey: 'lead.status.lost' },
];

const SOURCE_OPTIONS = ['all', 'web', 'zalo', 'facebook', 'walk-in', 'referral'];

function normalizeStatus(value?: string): LeadStatus {
  const normalized = String(value ?? 'new').toLowerCase();
  if (
    normalized === 'new' ||
    normalized === 'contacted' ||
    normalized === 'product_selected' ||
    normalized === 'deposit_requested' ||
    normalized === 'deposit_received' ||
    normalized === 'appointment_created' ||
    normalized === 'appointment_completed' ||
    normalized === 'booking_created' ||
    normalized === 'deposit_expired' ||
    normalized === 'cancelled' ||
    normalized === 'lost'
  ) {
    return normalized;
  }
  return 'new';
}

function contactDeadline(row: any) {
  if (row.contactDeadlineAt) return row.contactDeadlineAt;
  if (!row.createdAt) return undefined;
  return new Date(new Date(row.createdAt).getTime() + 60 * 60 * 1000).toISOString();
}

function leadFromApi(
  row: any,
  labels: {
    unknownCustomer: string;
    unassigned: string;
  },
): LeadRow {
  return {
    id: row.id,
    customerId: row.customer?.id ?? row.customerId,
    customer: row.customer?.name ?? row.customer ?? row.title ?? labels.unknownCustomer,
    email: row.customer?.email ?? row.email ?? '-',
    phone: row.customer?.phone ?? row.phone ?? '-',
    source: row.source ?? 'web',
    status: normalizeStatus(row.status),
    owner: row.assignedTo?.fullName ?? row.staff ?? labels.unassigned,
    ownerId: row.assignedTo?.id ?? row.assignedToId,
    notes: row.notes ?? '',
    quotedPrice: Number(row.quotedPrice ?? row.budget ?? 0),
    productId: row.product?.id ?? row.productId ?? undefined,
    productName: row.product?.name ?? row.productName ?? undefined,
    variantName: row.variant?.name ?? undefined,
    inventoryItemLabel: row.inventoryItem?.serialNumber ?? undefined,
    pickupDate: row.pickupDate ?? undefined,
    returnDate: row.returnDate ?? undefined,
    appointmentId: row.appointment?.id ?? row.appointmentId ?? undefined,
    appointmentStatus: row.appointment?.status ?? undefined,
    appointmentTime: row.appointment?.scheduledAt ?? row.appointment?.startTime ?? undefined,
    bookingId: row.booking?.id ?? row.bookingId ?? row.convertedToBookingId ?? undefined,
    bookingStatus: row.booking?.status ?? undefined,
    contactDeadlineAt: contactDeadline(row),
    contactedAt: row.contactedAt,
    depositRequestedAt: row.depositRequestedAt,
    depositDeadlineAt: row.depositDeadlineAt,
    depositReceivedAt: row.depositReceivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function lower(value?: string | null) {
  return String(value ?? '').toLowerCase();
}

function hasProductSelection(lead: LeadRow) {
  return Boolean(lead.productId || lead.productName);
}

function hasRentalRequestContext(lead: LeadRow) {
  return Boolean(hasProductSelection(lead) && lead.pickupDate && lead.returnDate);
}

function isManualLead(lead: LeadRow) {
  return !hasProductSelection(lead);
}

function hasRequestedDeposit(lead: LeadRow) {
  return ['deposit_requested', 'deposit_received', 'appointment_created', 'appointment_completed', 'booking_created'].includes(lead.status);
}

function hasReceivedDeposit(lead: LeadRow) {
  return ['deposit_received', 'appointment_created', 'appointment_completed', 'booking_created'].includes(lead.status);
}

function hasBooking(lead: LeadRow) {
  return Boolean(lead.bookingId || lead.status === 'booking_created');
}

function hasAppointment(lead: LeadRow) {
  return Boolean(lead.appointmentId);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function minutesUntil(value?: string) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 60000);
}

function relativeWindow(value: string | undefined, labels: { fallback: string; overdue: string; left: string }) {
  const minutes = minutesUntil(value);
  if (minutes === null) return labels.fallback;
  const overdue = minutes < 0;
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return overdue ? `${text} ${labels.overdue}` : `${text} ${labels.left}`;
}

function urgencyTone(lead: LeadRow): Tone {
  if (lead.status === 'lost' || lead.status === 'cancelled') return 'danger';
  if (lead.status === 'booking_created') return 'success';
  if (lead.status === 'appointment_completed') return 'success';
  if (lead.status === 'deposit_received' || lead.status === 'appointment_created') return 'info';
  if (lead.status === 'deposit_expired') return 'danger';
  if (lead.status === 'deposit_requested' || lead.status === 'product_selected') return 'warning';
  return 'neutral';
}

function urgencyScore(lead: LeadRow) {
  const deposit = minutesUntil(lead.depositDeadlineAt) ?? 9999;
  const contact = minutesUntil(lead.contactDeadlineAt) ?? 9999;
  if (!hasProductSelection(lead)) return 100 + contact;
  if (lead.status === 'deposit_requested') return 200 + deposit;
  if (lead.status === 'deposit_received' && !lead.appointmentId) return 300;
  if (lead.status === 'appointment_created') return 400;
  if (lead.status === 'appointment_completed') return 500;
  if (lead.status === 'booking_created') return 900;
  return 600 + contact;
}

function nextStepKey(lead: LeadRow) {
  if (hasBooking(lead)) return 'lead.next_step.open_booking';
  if (!hasProductSelection(lead)) return 'lead.next_step.select_product';
  if (lead.status === 'product_selected' || lead.status === 'contacted' || lead.status === 'deposit_expired') return 'lead.next_step.request_deposit';
  if (lead.status === 'deposit_requested') return 'lead.next_step.waiting_deposit';
  if (lead.status === 'deposit_received' && !lead.appointmentId) return 'lead.next_step.open_appointment';
  if (lead.status === 'deposit_received' || lead.status === 'appointment_created') return 'lead.next_step.waiting_appointment_completed';
  if (lead.status === 'appointment_completed') return 'lead.next_step.open_booking';
  return 'lead.next_step.call_customer';
}

function buildActionSummary(lead: LeadRow, t: (key: string, params?: Record<string, string | number>) => string) {
  if (hasBooking(lead)) {
    return {
      label: t('lead.actions.open_booking'),
      href: lead.bookingId ? `/admin/bookings/${lead.bookingId}` : '/admin/bookings',
    };
  }
  if (!hasProductSelection(lead)) {
    return {
      label: t('lead.actions.select_product'),
      href: `/admin/leads/${lead.id}`,
    };
  }
  if (lead.status === 'product_selected' || lead.status === 'contacted' || lead.status === 'deposit_expired') {
    return {
      label: t('lead.actions.request_deposit'),
      action: 'request-deposit' as const,
    };
  }
  if (lead.status === 'deposit_requested') {
    return {
      label: t('lead.actions.confirm_deposit'),
      href: `/admin/leads/${lead.id}`,
    };
  }
  if (lead.status === 'deposit_received' || lead.status === 'appointment_created') {
    return {
      label: t('lead.actions.open_appointment'),
      href: `/admin/leads/${lead.id}`,
    };
  }
  return {
    label: t('lead.actions.open_detail'),
    href: `/admin/leads/${lead.id}`,
  };
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M2.75 10S5.5 4.75 10 4.75 17.25 10 17.25 10 14.5 15.25 10 15.25 2.75 10 2.75 10Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M15.3 12.47c-.86-.09-1.7-.23-2.5-.42a1.26 1.26 0 0 0-1.23.36l-1.09 1.09a14.02 14.02 0 0 1-4-4l1.09-1.09c.33-.33.46-.81.36-1.23a12.52 12.52 0 0 1-.42-2.5A1.25 1.25 0 0 0 6.27 3.5H4.5c-.69 0-1.26.58-1.22 1.27A15.98 15.98 0 0 0 15.23 16.72c.69.04 1.27-.53 1.27-1.22v-1.77a1.25 1.25 0 0 0-1.2-1.26Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 10h10m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function rowDepositStatus(lead: LeadRow) {
  if (lead.status === 'deposit_expired') return { value: 'deposit_expired', tone: 'danger' as Tone };
  if (hasReceivedDeposit(lead)) return { value: 'deposit_received', tone: 'success' as Tone };
  if (hasRequestedDeposit(lead)) return { value: 'deposit_requested', tone: 'warning' as Tone };
  return { value: 'not requested', tone: 'neutral' as Tone };
}

function rowAppointmentStatus(lead: LeadRow) {
  if (lead.appointmentStatus) return { value: lower(lead.appointmentStatus), tone: lead.appointmentId ? 'info' as Tone : 'neutral' as Tone };
  if (hasReceivedDeposit(lead)) return { value: 'appointment missing', tone: 'warning' as Tone };
  return { value: 'pending', tone: 'neutral' as Tone };
}

export function LeadManagementScreen() {
  const { t } = useI18n();
  const userRole = useAuthStore((state) => state.user?.role);
  const canManageUsers = can(userRole, 'manage_users');
  const [rows, setRows] = useState<LeadRow[]>(() =>
    demoLeads.map((row) =>
      leadFromApi(row, {
        unknownCustomer: t('leadOps.fallback.unknownCustomer'),
        unassigned: t('lead.unassigned'),
      }),
    ),
  );
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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState({ name: '', email: '', phone: '', source: 'web', notes: '' });
  const [editDraft, setEditDraft] = useState({ notes: '', quotedPrice: null as number | null });
  const [assignDraft, setAssignDraft] = useState('');

  const active = rows.find((row) => row.id === activeId) ?? rows[0];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const requests: Array<Promise<any>> = [leadsApi.getAll()];
      if (canManageUsers) {
        requests.push(usersApi.getAll());
      }
      const results = await Promise.allSettled(requests);
      const [leadResponse, userResponse] = results;
      const leadRows = leadResponse.status === 'fulfilled'
        ? (leadResponse.value.data ?? []).map((row: any) =>
            leadFromApi(row, {
              unknownCustomer: t('leadOps.fallback.unknownCustomer'),
              unassigned: t('lead.unassigned'),
            }),
          )
        : [];
      const userRows = canManageUsers && userResponse?.status === 'fulfilled'
        ? (userResponse.value.data ?? []).map((user: any) => ({ id: user.id, fullName: user.fullName, email: user.email, role: user.role }))
        : [];

      const nextRows: LeadRow[] = leadRows.length
        ? leadRows
        : demoLeads.map((row) =>
            leadFromApi(row, {
              unknownCustomer: t('leadOps.fallback.unknownCustomer'),
              unassigned: t('lead.unassigned'),
            }),
          );

      setRows(nextRows);
      setStaffRows(userRows.length ? userRows : demoStaff.map((item) => ({ id: item.id, fullName: item.name, email: item.email, role: item.role })));
      setActiveId((current) => nextRows.find((row) => row.id === current)?.id ?? nextRows[0]?.id ?? '');
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
  }, [canManageUsers]);

  useEffect(() => {
    if (!active) return;
    setEditDraft({
      notes: active.notes,
      quotedPrice: active.quotedPrice || null,
    });
    setAssignDraft(active.ownerId ?? '');
  }, [active]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((lead) => statusFilter === 'all' || lead.status === statusFilter)
      .filter((lead) => sourceFilter === 'all' || lead.source === sourceFilter)
      .filter((lead) => ownerFilter === 'all' || lead.ownerId === ownerFilter || (ownerFilter === 'unassigned' && !lead.ownerId))
      .filter((lead) => {
        if (!normalizedQuery) return true;
        return [
          lead.customer,
          lead.phone,
          lead.email,
          lead.source,
          lead.owner,
          lead.productName,
          lead.notes,
          lead.inventoryItemLabel,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  }, [ownerFilter, query, rows, sourceFilter, statusFilter]);

  const stats = useMemo(() => {
    const noProduct = rows.filter((lead) => !hasProductSelection(lead)).length;
    const waitingDeposit = rows.filter((lead) => lead.status === 'deposit_requested').length;
    const waitingAppointment = rows.filter((lead) => ['deposit_received', 'appointment_created'].includes(lead.status)).length;
    const readyBooking = rows.filter((lead) => lead.status === 'appointment_completed').length;
    return { noProduct, waitingDeposit, waitingAppointment, readyBooking };
  }, [rows]);

  const runAction = async (key: string, operation: () => Promise<void>, successMessage: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      await load();
      setFeedback({ tone: 'success', message: successMessage });
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.actionFailed'));
      return false;
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
          quotedPrice: editDraft.quotedPrice ?? undefined,
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

  const requestDeposit = async (lead: LeadRow) => {
    await runAction(
      `request-deposit-${lead.id}`,
      async () => {
        await leadsApi.requestDeposit(lead.id, { quotedPrice: lead.quotedPrice || undefined });
      },
      t('lead.feedback.depositRequested'),
    );
  };

  const markContacted = async (lead: LeadRow, noteKey = 'lead.feedback.contacted') => {
    return runAction(
      `contact-${lead.id}`,
      async () => {
        await leadsApi.markContacted(lead.id, { notes: t('leadOps.timeline.callLogged') });
      },
      t(noteKey),
    );
  };

  const callCustomer = async () => {
    if (!active) return;
    const logged = await markContacted(active, 'lead.feedback.contacted');
    if (logged) {
      window.location.assign(`tel:${active.phone}`);
    }
  };

  const sendZalo = async () => {
    if (!active) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    const logged = await runAction(
      `zalo-${active.id}`,
      async () => {
        await leadsApi.markContacted(active.id, { notes: t('leadOps.timeline.zaloSent') });
      },
      t('lead.feedback.contacted'),
    );
    if (logged) {
      if (popup) {
        popup.location.href = zaloUrl(active.phone);
      } else {
        window.open(zaloUrl(active.phone), '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (popup) {
      popup.close();
    }
  };

  const confirmCurrentAction = async () => {
    if (!confirmAction) return;
    const target = confirmAction.lead;
    if (confirmAction.kind === 'archive') {
      await runAction(
        `archive-${target.id}`,
        async () => {
          await leadsApi.archive(target.id);
          setConfirmAction(null);
        },
        t('lead.feedback.archived'),
      );
      return;
    }

    await runAction(
      `cancel-${target.id}`,
      async () => {
        await leadsApi.updateStatus(target.id, 'CANCELLED');
        setConfirmAction(null);
      },
      t('lead.feedback.cancelled'),
    );
  };

  const timeline = active
    ? [
        { time: formatDateTime(active.createdAt), title: t('leadOps.timeline.created'), detail: active.source, tone: 'neutral' as Tone },
        active.contactedAt ? { time: formatDateTime(active.contactedAt), title: t('leadOps.timeline.contacted'), detail: active.owner, tone: 'info' as Tone } : null,
        active.depositRequestedAt ? { time: formatDateTime(active.depositRequestedAt), title: t('leadOps.timeline.depositRequested'), detail: relativeWindow(active.depositDeadlineAt, { fallback: t('leadOps.notSet'), overdue: t('leadOps.overdue'), left: t('leadOps.left') }), tone: 'warning' as Tone } : null,
        active.depositReceivedAt ? { time: formatDateTime(active.depositReceivedAt), title: t('leadOps.timeline.depositReceived'), detail: t('leadOps.timeline.readyForAppointment'), tone: 'success' as Tone } : null,
        active.appointmentTime ? { time: formatDateTime(active.appointmentTime), title: t('lead.flow.appointment'), detail: active.appointmentStatus ? t(`appointment.status.${lower(active.appointmentStatus)}`) : '-', tone: 'info' as Tone } : null,
        active.bookingId ? { time: formatDateTime(active.updatedAt), title: t('lead.flow.booking'), detail: active.bookingId, tone: 'success' as Tone } : null,
      ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone?: Tone }>
    : [];

  const activeSummary = active ? buildActionSummary(active, t) : null;

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
        eyebrow={t('lead.title')}
        title={t('leadOps.title')}
        subtitle={t('lead.subtitle')}
        nextStep={filteredRows[0] ? `${filteredRows[0].customer}: ${t(nextStepKey(filteredRows[0]))}` : t('leadOps.noBlockers')}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone="accent">{t('nav.flowLead')}</AdminBadge>
            <AdminBadge tone="neutral">
              {filteredRows.length} / {rows.length}
            </AdminBadge>
          </div>
        }
        actions={(
          <>
            <AdminButton type="button" variant="secondary" onClick={load} loading={loading}>
              {t('common.refresh')}
            </AdminButton>
            <PermissionButton permission="manage_leads" onClick={() => setCreateOpen(true)}>
              {t('leadOps.createLead')}
            </PermissionButton>
          </>
        )}
      />

      <div className="grid gap-6">
        <SummaryRow
          items={[
            {
              label: t('lead.flow.product'),
              value: `${stats.noProduct}`,
              detail: t('lead.no_product.description'),
              tone: stats.noProduct ? 'warning' : 'success',
            },
            {
              label: t('lead.flow.deposit'),
              value: `${stats.waitingDeposit}`,
              detail: t('lead.next_step.waiting_deposit'),
              tone: stats.waitingDeposit ? 'warning' : 'neutral',
            },
            {
              label: t('lead.flow.appointment'),
              value: `${stats.waitingAppointment}`,
              detail: t('lead.next_step.waiting_appointment_completed'),
              tone: stats.waitingAppointment ? 'info' : 'neutral',
            },
            {
              label: t('lead.flow.booking'),
              value: `${stats.readyBooking}`,
              detail: t('lead.next_step.open_booking'),
              tone: stats.readyBooking ? 'success' : 'neutral',
            },
          ]}
        />

        <ControlSurface label={t('leadOps.filters.label')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('leadOps.filters.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LeadStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </AdminSelect>

          <AdminSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>
                {source === 'all' ? t('leadOps.filters.allSources') : t(`leadOps.source.${source}`)}
              </option>
            ))}
          </AdminSelect>

          <AdminSelect value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="all">{t('leadOps.filters.allStaff')}</option>
            <option value="unassigned">{t('lead.unassigned')}</option>
            {staffRows.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.fullName}
              </option>
            ))}
          </AdminSelect>

          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
              setSourceFilter('all');
              setOwnerFilter('all');
            }}
          >
            {t('leadOps.filters.reset')}
          </AdminButton>
        </ControlSurface>

        <WorkspaceLayout
          rail={active ? (
            <>
              <RailSection title={t('lead.panels.operationalSummary')}>
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
                          {t('lead.customer')}
                        </p>
                        <h3 className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">
                          {active.customer}
                        </h3>
                        <p className="mt-1 truncate text-xs text-[rgb(var(--text-secondary))]">
                          {active.phone} · {active.email}
                        </p>
                      </div>
                      <StatusBadge value={active.status} tone={urgencyTone(active)} />
                    </div>
                  </div>

                  <OperationalState
                    title={t('lead.flow.product')}
                    value={active.productName ?? t('lead.no_product.title')}
                    detail={!hasProductSelection(active)
                      ? t('lead.manual.description')
                      : active.pickupDate
                        ? `${formatDate(active.pickupDate)} - ${formatDate(active.returnDate)}`
                        : t('lead.no_pickup_date.description')}
                    tone={!hasProductSelection(active) || !hasRentalRequestContext(active) ? 'warning' : 'neutral'}
                  />

                  <OperationalState
                    title={t('lead.flow.deposit')}
                    value={t(`lead.status.${active.status}`)}
                    detail={hasRequestedDeposit(active)
                      ? relativeWindow(active.depositDeadlineAt, {
                          fallback: t('leadOps.notSet'),
                          overdue: t('leadOps.overdue'),
                          left: t('leadOps.left'),
                        })
                      : t('lead.deposit.missing')}
                    tone={active.status === 'deposit_expired' ? 'danger' : hasRequestedDeposit(active) ? 'info' : 'neutral'}
                  />

                  <OperationalState
                    title={t('lead.flow.appointment')}
                    value={active.appointmentStatus ? t(`appointment.status.${lower(active.appointmentStatus)}`) : t('lead.empty.appointment')}
                    detail={active.appointmentTime ? formatDateTime(active.appointmentTime) : t('lead.appointment.missing_after_deposit')}
                    tone={active.appointmentId ? 'info' : hasReceivedDeposit(active) ? 'warning' : 'neutral'}
                  />
                </div>
              </RailSection>

              <RailSection title={t('lead.panels.quickActions')}>
                <div className="grid gap-2">
                  <AdminButton type="button" className="w-full" onClick={callCustomer} loading={busyAction === `contact-${active.id}`}>
                    {t('lead.actions.call_customer')}
                  </AdminButton>

                  <AdminButton type="button" variant="secondary" className="w-full" onClick={sendZalo} loading={busyAction === `zalo-${active.id}`}>
                    {t('lead.actions.send_zalo')}
                  </AdminButton>

                  <PermissionButton permission="manage_leads" className="button-secondary w-full" onClick={() => setAssignOpen(true)}>
                    {t('lead.actions.assign_staff')}
                  </PermissionButton>

                  <AdminButton type="button" variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
                    {t('lead.actions.edit_lead')}
                  </AdminButton>

                  {activeSummary?.href ? (
                    <Link className="button-primary w-full text-center" href={activeSummary.href}>
                      {activeSummary.label}
                    </Link>
                  ) : (
                    <AdminButton
                      type="button"
                      className="w-full"
                      onClick={() => requestDeposit(active)}
                      loading={busyAction === `request-deposit-${active.id}`}
                      disabled={!hasRentalRequestContext(active) || hasRequestedDeposit(active) || hasBooking(active)}
                    >
                      {activeSummary?.label ?? t('lead.actions.request_deposit')}
                    </AdminButton>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <AdminButton
                      type="button"
                      variant="secondary"
                      className="w-full text-[rgb(var(--danger))]"
                      onClick={() => setConfirmAction({ kind: 'cancel', lead: active })}
                      disabled={active.status === 'cancelled' || hasBooking(active)}
                    >
                      {t('lead.actions.cancel_lead')}
                    </AdminButton>

                    <AdminButton
                      type="button"
                      variant="secondary"
                      className="w-full text-[rgb(var(--danger))]"
                      onClick={() => setConfirmAction({ kind: 'archive', lead: active })}
                    >
                      {t('lead.actions.archive_lead')}
                    </AdminButton>
                  </div>
                </div>
              </RailSection>

              <RailSection title={t('lead.workflow')}>
                <FlowHighlightCard lead={active} />
              </RailSection>

              <RailSection title={t('lead.panels.notesTimeline')}>
                <TimelineList
                  items={timeline.length ? timeline : [
                    {
                      time: formatDateTime(active.createdAt),
                      title: t('leadOps.timeline.created'),
                      detail: active.source,
                    },
                  ]}
                />
              </RailSection>
            </>
          ) : null}
        >
          {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
          {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

          <SectionCard
            title={t('leadOps.table.title')}
            description={t('leadOps.table.description')}
            actions={loading ? (
              <span className="inline-flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
                <AdminSpinner /> {t('common.loading')}
              </span>
            ) : undefined}
          >
            {filteredRows.length ? (
              <div className="overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/96 shadow-[0_18px_40px_rgba(15,23,42,0.07)]">
                <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_220px_148px] gap-4 border-b border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/82 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))] lg:grid">
                  <span>{t('lead.customer')}</span>
                  <span>{t('common.status')}</span>
                  <span>{t('lead.table.nextStep')}</span>
                  <span className="text-right">{t('lead.table.actions')}</span>
                </div>

                <div className="divide-y divide-[rgb(var(--surface-border))]/70">
                  {filteredRows.map((lead) => {
                    const rowAction = buildActionSummary(lead, t);
                    const selected = active?.id === lead.id;
                    const depositBadge = rowDepositStatus(lead);
                    const appointmentBadge = rowAppointmentStatus(lead);

                    return (
                      <div
                        key={lead.id}
                        className={cn(
                          'group relative transition duration-200 hover:bg-[rgb(var(--surface-3))]/74',
                          selected && 'bg-[rgb(var(--surface-3))]/88',
                        )}
                      >
                        {selected ? <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-[rgb(var(--accent-strong))]" /> : null}
                        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_220px_148px] lg:px-6">
                          <button type="button" className="text-left" onClick={() => setActiveId(lead.id)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-base font-semibold tracking-[-0.02em] text-[rgb(var(--text-primary))]">{lead.customer}</span>
                              {isManualLead(lead) ? <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge> : null}
                            </div>
                            <p className="mt-1 truncate text-sm text-[rgb(var(--text-secondary))]">{lead.productName ?? t('lead.no_product.title')}</p>
                            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                              {lead.pickupDate ? formatDate(lead.pickupDate) : t('lead.no_pickup_date.title')} · {lead.owner}
                            </p>
                          </button>

                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <StatusBadge value={lead.status} tone={urgencyTone(lead)} />
                              <StatusBadge value={depositBadge.value} tone={depositBadge.tone} />
                              <StatusBadge value={appointmentBadge.value} tone={appointmentBadge.tone} />
                            </div>
                            <p className="text-xs leading-5 text-[rgb(var(--text-secondary))]">
                              {lead.notes || (hasRequestedDeposit(lead) ? t('lead.deposit.deadline') : t('lead.no_product.description'))}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t(nextStepKey(lead))}</p>
                            <p className="text-xs leading-5 text-[rgb(var(--text-secondary))]">
                              {hasBooking(lead)
                                ? t('lead.booking.locked')
                                : lead.appointmentTime
                                  ? formatDateTime(lead.appointmentTime)
                                  : hasRequestedDeposit(lead)
                                    ? relativeWindow(lead.depositDeadlineAt, {
                                        fallback: t('leadOps.notSet'),
                                        overdue: t('leadOps.overdue'),
                                        left: t('leadOps.left'),
                                      })
                                    : lead.phone}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 opacity-100 transition duration-150 lg:opacity-0 lg:group-hover:opacity-100">
                            <Link href={`/admin/leads/${lead.id}`} title={t('lead.actions.open_detail')}>
                              <AdminIconButton aria-label={t('lead.actions.open_detail')}>
                                <EyeIcon />
                              </AdminIconButton>
                            </Link>
                            <AdminIconButton
                              title={t('lead.actions.call_customer')}
                              aria-label={t('lead.actions.call_customer')}
                              onClick={async () => {
                                const logged = await markContacted(lead);
                                if (logged) {
                                  window.location.assign(`tel:${lead.phone}`);
                                }
                              }}
                            >
                              <PhoneIcon />
                            </AdminIconButton>
                            {rowAction.href ? (
                              <Link href={rowAction.href} title={rowAction.label}>
                                <AdminIconButton variant="primary" aria-label={rowAction.label}>
                                  <ArrowIcon />
                                </AdminIconButton>
                              </Link>
                            ) : (
                              <AdminIconButton
                                variant="primary"
                                title={rowAction.label}
                                aria-label={rowAction.label}
                                onClick={() => requestDeposit(lead)}
                                disabled={!hasRentalRequestContext(lead) || hasRequestedDeposit(lead) || hasBooking(lead)}
                              >
                                <ArrowIcon />
                              </AdminIconButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                title={t('leadOps.empty')}
                description="Clear the filters or create a fresh lead to restart the operating queue."
                action={<PermissionButton permission="manage_leads" onClick={() => setCreateOpen(true)}>{t('leadOps.createLead')}</PermissionButton>}
              />
            )}
          </SectionCard>

          {active ? (
            <SectionCard title={active.customer} description={t(nextStepKey(active))}>
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-[30px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/60 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
                          {t('lead.flow.customer')}
                        </p>
                        <h2 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[rgb(var(--text-primary))]">
                          {active.customer}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                          {active.phone} / {active.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={active.status} tone={urgencyTone(active)} />
                        {isManualLead(active) ? <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge> : null}
                        <AdminBadge tone="neutral">{t(nextStepKey(active))}</AdminBadge>
                      </div>
                    </div>
                  </div>

                  <KeyValueList
                    items={[
                      { label: t('lead.panels.productRequest'), value: active.productName ?? t('lead.no_product.title') },
                      { label: t('lead.source'), value: t(`leadOps.source.${active.source}`) },
                      { label: t('lead.salesOwner'), value: active.owner },
                      { label: t('lead.budget'), value: active.quotedPrice ? currency(active.quotedPrice) : t('leadOps.notQuoted') },
                    ]}
                  />

                  <div className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/60 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
                      {t('lead.notes')}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                      {active.notes || t('leadOps.detail.noNotes')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FlowHighlightCard lead={active} />

                  <SectionCard
                    title={t('lead.flow.booking')}
                    description={active.bookingId ? t('lead.booking.locked') : t('lead.appointment.waiting_completion')}
                    className="shadow-none"
                  >
                    <KeyValueList
                      items={[
                        {
                          label: t('lead.flow.deposit'),
                          value: active.depositRequestedAt
                            ? relativeWindow(active.depositDeadlineAt, {
                                fallback: t('leadOps.notSet'),
                                overdue: t('leadOps.overdue'),
                                left: t('leadOps.left'),
                              })
                            : t('lead.deposit.missing'),
                        },
                        {
                          label: t('lead.flow.appointment'),
                          value: active.appointmentStatus ? t(`appointment.status.${lower(active.appointmentStatus)}`) : t('lead.empty.appointment'),
                        },
                        {
                          label: t('lead.flow.booking'),
                          value: active.bookingId ?? t('lead.empty.booking'),
                        },
                      ]}
                    />
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
        footer={(
          <>
            <AdminButton type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton type="button" onClick={createLead} loading={busyAction === 'create'} disabled={!createDraft.name || !createDraft.email || !createDraft.phone}>
              {t('leadOps.createLead')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LeadTextField label={t('leadOps.form.name')} value={createDraft.name} onChange={(value) => setCreateDraft((draft) => ({ ...draft, name: value }))} />
          <LeadTextField label={t('leadOps.form.email')} type="email" value={createDraft.email} onChange={(value) => setCreateDraft((draft) => ({ ...draft, email: value }))} />
          <LeadTextField label={t('leadOps.form.phone')} value={createDraft.phone} onChange={(value) => setCreateDraft((draft) => ({ ...draft, phone: value }))} />
          <label className="grid gap-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('leadOps.form.source')}
            <AdminSelect value={createDraft.source} onChange={(event) => setCreateDraft((draft) => ({ ...draft, source: event.target.value }))}>
              {SOURCE_OPTIONS.filter((source) => source !== 'all').map((source) => (
                <option key={source} value={source}>
                  {t(`leadOps.source.${source}`)}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
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
        footer={(
          <>
            <AdminButton type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton type="button" onClick={editLead} loading={busyAction === 'edit'}>
              {t('common.save')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('leadOps.form.quote')}
            <MoneyInput value={editDraft.quotedPrice} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, quotedPrice: value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('leadOps.form.notes')}
            <textarea className="field h-32 py-3" value={editDraft.notes} onChange={(event) => setEditDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={assignOpen}
        title={t('leadOps.modals.assignTitle')}
        onClose={() => setAssignOpen(false)}
        footer={(
          <>
            <AdminButton type="button" variant="secondary" onClick={() => setAssignOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton type="button" onClick={assignLead} loading={busyAction === 'assign'} disabled={!assignDraft}>
              {t('lead.actions.assign_staff')}
            </AdminButton>
          </>
        )}
      >
        <AdminSelect value={assignDraft} onChange={(event) => setAssignDraft(event.target.value)}>
          <option value="">{t('lead.unassigned')}</option>
          {staffRows.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.fullName}{staff.role ? ` / ${staff.role}` : ''}
            </option>
          ))}
        </AdminSelect>
      </AdminModal>

      <AdminModal
        open={Boolean(confirmAction)}
        title={confirmAction?.kind === 'archive' ? t('lead.confirm.archiveTitle') : t('lead.confirm.cancelTitle')}
        onClose={() => setConfirmAction(null)}
        footer={(
          <>
            <AdminButton type="button" variant="secondary" onClick={() => setConfirmAction(null)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton type="button" onClick={confirmCurrentAction} loading={busyAction === `${confirmAction?.kind}-${confirmAction?.lead.id}`}>
              {confirmAction?.kind === 'archive' ? t('lead.actions.archive_lead') : t('lead.actions.cancel_lead')}
            </AdminButton>
          </>
        )}
      >
        <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">
          {confirmAction?.kind === 'archive' ? t('lead.confirm.archiveDescription') : t('lead.confirm.cancelDescription')}
        </p>
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
    <label className="grid gap-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">
      {label}
      <AdminInput type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ProductCell({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();
  if (!hasProductSelection(lead)) {
    return (
      <div className="rounded-[18px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('lead.no_product.title')}</div>
          <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge>
        </div>
        <div className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{t('lead.no_product.description')}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <span className="font-semibold text-[rgb(var(--text-primary))]">{lead.productName}</span>
      <span className="text-xs text-[rgb(var(--text-secondary))]">
        {lead.variantName ?? t('leadFlow.form.optionalPlaceholder')}
        {lead.inventoryItemLabel ? ` · ${lead.inventoryItemLabel}` : ''}
      </span>
    </div>
  );
}

function DateCell({ pickupDate, returnDate }: { pickupDate?: string; returnDate?: string }) {
  const { t } = useI18n();
  if (!pickupDate) {
    return (
      <div className="text-sm text-[rgb(var(--text-secondary))]">
        <div className="font-semibold text-[rgb(var(--text-primary))]">{t('lead.no_pickup_date.title')}</div>
        <div className="mt-1 text-xs">{t('lead.no_pickup_date.description')}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <span className="font-semibold text-[rgb(var(--text-primary))]">{formatDate(pickupDate)}</span>
      <span className="text-xs text-[rgb(var(--text-secondary))]">{returnDate ? formatDate(returnDate) : '-'}</span>
    </div>
  );
}

function DepositCell({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();

  const requested = hasRequestedDeposit(lead);
  const received = hasReceivedDeposit(lead);
  const expired = lead.status === 'deposit_expired';

  const tone: Tone = expired ? 'danger' : received ? 'success' : requested ? 'warning' : 'neutral';

  const title = !requested
    ? t('lead.deposit.missing')
    : received
      ? t('lead.status.deposit_received')
      : expired
        ? t('lead.status.deposit_expired')
        : t('lead.status.deposit_requested');

  const detail = !requested
    ? t('lead.deposit.reserve_pending')
    : lead.depositDeadlineAt
      ? formatDateTime(lead.depositDeadlineAt)
      : t('leadOps.notSet');

  return (
    <div
      className={cn(
        'min-w-[190px] rounded-[20px] border px-3.5 py-3 shadow-sm transition duration-200',
        'bg-[rgb(var(--surface-3))]/65',
        tone === 'success' && 'border-[rgb(var(--success))]/25 bg-[rgb(var(--success))]/7',
        tone === 'warning' && 'border-[rgb(var(--warning))]/25 bg-[rgb(var(--warning))]/7',
        tone === 'danger' && 'border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/7',
        tone === 'neutral' && 'border-[rgb(var(--surface-border))]/80',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">
            {title}
          </p>
          <p className="mt-1 truncate text-xs text-[rgb(var(--text-secondary))]">
            {detail}
          </p>
        </div>

        <span
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            tone === 'success' && 'bg-[rgb(var(--success))]',
            tone === 'warning' && 'bg-[rgb(var(--warning))]',
            tone === 'danger' && 'bg-[rgb(var(--danger))]',
            tone === 'neutral' && 'bg-[rgb(var(--text-muted))]',
          )}
        />
      </div>
    </div>
  );
}

function AppointmentCell({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();
  if (!lead.appointmentId) {
    return (
      <div className="grid gap-1 text-sm text-[rgb(var(--text-secondary))]">
        <span className="font-semibold text-[rgb(var(--text-primary))]">{t('lead.empty.appointment')}</span>
        <span className="text-xs">{hasReceivedDeposit(lead) ? t('lead.appointment.missing_after_deposit') : t('lead.appointment.waiting_completion')}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <StatusBadge value={lead.appointmentStatus ? t(`appointment.status.${lower(lead.appointmentStatus)}`) : '-'} tone="info" />
      <span className="text-xs text-[rgb(var(--text-secondary))]">{formatDateTime(lead.appointmentTime)}</span>
    </div>
  );
}

function NextStepCell({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-1">
      <span className="font-semibold text-[rgb(var(--text-primary))]">{t(nextStepKey(lead))}</span>
      <span className="text-xs text-[rgb(var(--text-secondary))]">
        {hasBooking(lead)
          ? t('lead.booking.locked')
          : !hasProductSelection(lead)
            ? t('lead.no_product.description')
            : lead.status === 'deposit_requested'
              ? t('lead.deposit.deadline')
              : lead.status === 'appointment_created'
                ? t('lead.appointment.waiting_completion')
                : t('lead.subtitle')}
      </span>
    </div>
  );
}

function OperationalState({
  title,
  value,
  detail,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border px-4 py-4 shadow-sm',
        tone === 'warning'
          ? 'border-[rgb(var(--warning))]/20 bg-[rgb(var(--warning))]/7'
          : tone === 'danger'
            ? 'border-[rgb(var(--danger))]/20 bg-[rgb(var(--danger))]/7'
            : tone === 'info'
              ? 'border-[rgb(var(--info))]/18 bg-[rgb(var(--info))]/6'
              : 'border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[rgb(var(--text-muted))]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{detail}</p>
    </div>
  );
}

function FlowHighlightCard({ lead }: { lead: LeadRow }) {
  const { t } = useI18n();
  const items = [
    {
      title: t('lead.flow.product'),
      done: hasProductSelection(lead),
      detail: hasProductSelection(lead) ? (lead.productName ?? '-') : t('lead.no_product.title'),
    },
    {
      title: t('lead.flow.deposit'),
      done: hasRequestedDeposit(lead),
      detail: hasRequestedDeposit(lead) ? t(`lead.status.${lead.status}`) : t('lead.deposit.missing'),
    },
    {
      title: t('lead.flow.appointment'),
      done: hasAppointment(lead),
      detail: lead.appointmentStatus ? t(`appointment.status.${lower(lead.appointmentStatus)}`) : t('lead.empty.appointment'),
    },
    {
      title: t('lead.flow.booking'),
      done: hasBooking(lead),
      detail: lead.bookingId ?? t('lead.empty.booking'),
    },
  ];

  return (
    <SectionCard title={t('lead.workflow')} description={t(nextStepKey(lead))} className="shadow-none">
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              'relative overflow-hidden rounded-[20px] border px-4 py-3 transition duration-200',
              item.done
                ? 'border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/7'
                : 'border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-3))]/70',
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80 text-[10px] font-bold text-[rgb(var(--text-muted))]">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{item.title}</p>
                </div>
                <p className="mt-1.5 truncate pl-8 text-xs text-[rgb(var(--text-secondary))]">{item.detail}</p>
              </div>
              <AdminBadge tone={item.done ? 'success' : 'neutral'}>
                {item.done ? t('lead.flow.complete') : t('lead.flow.pending')}
              </AdminBadge>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function zaloUrl(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits ? `https://zalo.me/${digits}` : 'https://zalo.me';
}
