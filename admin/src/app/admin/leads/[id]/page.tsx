'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { appointmentsApi, auditLogsApi, inventoryApi, leadsApi, productsApi, usersApi } from '@/lib/api';
import { can } from '@/lib/admin/permissions';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/auth.store';
import {
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  RailSection,
  SectionCard,
  StatusBadge,
  TimelineList,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminModal, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

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

type ProductHoldStatus = 'none' | 'pending_deposit' | 'reserved' | 'released' | 'converted_to_booking';
type LeadDepositStatus = 'none' | 'requested' | 'received' | 'expired';
type AppointmentIntent = 'fitting' | 'pickup' | 'delivery';
type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOMO' | 'ZALO_PAY';

type LeadDetail = {
  id: string;
  customerId?: string;
  customerName: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  ownerName: string;
  ownerId?: string;
  notes: string;
  quotedPrice: number;
  productId?: string;
  productName?: string;
  variantId?: string;
  variantName?: string;
  requestedSize?: string;
  requestedColor?: string;
  inventoryItemId?: string;
  inventoryItemLabel?: string;
  inventoryStatus?: string;
  pickupDate?: string;
  returnDate?: string;
  appointmentIntent: AppointmentIntent;
  productHoldStatus: ProductHoldStatus;
  depositStatus: LeadDepositStatus;
  depositAmountRequired: number;
  depositAmountPaid: number;
  depositRequestedAt?: string;
  depositDeadlineAt?: string;
  depositReceivedAt?: string;
  contactedAt?: string;
  appointmentId?: string;
  appointmentStatus?: string;
  appointmentType?: string;
  appointmentTime?: string;
  bookingId?: string;
  bookingStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProductOption = {
  id: string;
  name: string;
  price: number;
  variants: Array<{
    id: string;
    name: string;
    size?: string | null;
    color?: string | null;
  }>;
};

type InventoryOption = {
  id: string;
  productId: string;
  variantId?: string;
  serialNumber: string;
  status?: string;
  productName?: string;
  variantName?: string;
};

type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
};

type AuditRow = {
  id: string;
  action: string;
  summary: string;
  actor: string;
  createdAt?: string;
};

type ConfirmAction =
  | { kind: 'cancel' }
  | { kind: 'archive' }
  | null;

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOMO', 'ZALO_PAY'];

function lower(value?: string | null) {
  return String(value ?? '').toLowerCase();
}

function normalizeStatus(value?: string): LeadStatus {
  const normalized = lower(value);
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
    normalized === 'lost' ||
    normalized === 'cancelled'
  ) {
    return normalized;
  }
  return 'new';
}

function normalizeHoldStatus(value?: string): ProductHoldStatus {
  const normalized = lower(value);
  if (
    normalized === 'none' ||
    normalized === 'pending_deposit' ||
    normalized === 'reserved' ||
    normalized === 'released' ||
    normalized === 'converted_to_booking'
  ) {
    return normalized;
  }
  return 'none';
}

function normalizeDepositStatus(value?: string): LeadDepositStatus {
  const normalized = lower(value);
  if (normalized === 'requested' || normalized === 'received' || normalized === 'expired') {
    return normalized;
  }
  return 'none';
}

function normalizeAppointmentIntent(value?: string): AppointmentIntent {
  const normalized = lower(value);
  if (normalized === 'pickup' || normalized === 'delivery') return normalized;
  return 'fitting';
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

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrUndefined(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function minutesUntil(value?: string) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 60000);
}

function hasProductSelection(lead: LeadDetail) {
  return Boolean(lead.productId);
}

function hasRentalRequestContext(lead: LeadDetail) {
  return Boolean(hasProductSelection(lead) && lead.pickupDate && lead.returnDate);
}

function hasRequestedDeposit(lead: LeadDetail) {
  return ['deposit_requested', 'deposit_received', 'appointment_created', 'appointment_completed', 'booking_created'].includes(lead.status);
}

function hasReceivedDeposit(lead: LeadDetail) {
  return ['deposit_received', 'appointment_created', 'appointment_completed', 'booking_created'].includes(lead.status);
}

function hasAppointment(lead: LeadDetail) {
  return Boolean(lead.appointmentId);
}

function hasBooking(lead: LeadDetail) {
  return Boolean(lead.bookingId || lead.status === 'booking_created');
}

function appointmentIsRecoverable(lead: LeadDetail) {
  return hasReceivedDeposit(lead) && !lead.appointmentId;
}

function isManualLead(lead: LeadDetail) {
  return !hasProductSelection(lead);
}

function canEditProduct(lead: LeadDetail) {
  return !hasRequestedDeposit(lead) && !hasReceivedDeposit(lead) && !hasBooking(lead) && (isManualLead(lead) || !hasRentalRequestContext(lead));
}

function canReceiveDepositByRole(role?: string | null) {
  const normalized = lower(role);
  return normalized === 'cashier' || normalized === 'manager' || normalized === 'super_admin';
}

function canRequestDeposit(lead: LeadDetail, role?: string | null) {
  if (!can(role, 'manage_leads')) return false;
  return hasRentalRequestContext(lead) && !hasRequestedDeposit(lead) && !hasBooking(lead) && lead.status !== 'cancelled' && lead.status !== 'lost';
}

function canReceiveDeposit(lead: LeadDetail, role?: string | null) {
  return canReceiveDepositByRole(role) && hasRentalRequestContext(lead) && !hasReceivedDeposit(lead) && !hasBooking(lead) && lead.status !== 'deposit_expired' && lead.status !== 'cancelled';
}

function canCompleteAppointment(lead: LeadDetail) {
  return Boolean(
    lead.appointmentId &&
      !hasBooking(lead) &&
      lead.appointmentStatus &&
      !['completed', 'cancelled', 'no_show'].includes(lower(lead.appointmentStatus)),
  );
}

function canCreateBookingOverride(lead: LeadDetail) {
  return lead.status === 'appointment_completed' && !hasBooking(lead);
}

function nextStepKey(lead: LeadDetail) {
  if (hasBooking(lead)) return 'lead.next_step.open_booking';
  if (!hasProductSelection(lead)) return 'lead.next_step.select_product';
  if (lead.status === 'product_selected' || lead.status === 'contacted' || lead.status === 'deposit_expired') return 'lead.next_step.request_deposit';
  if (lead.status === 'deposit_requested') return 'lead.next_step.waiting_deposit';
  if (appointmentIsRecoverable(lead)) return 'lead.next_step.open_appointment';
  if (lead.status === 'deposit_received' || lead.status === 'appointment_created') return 'lead.next_step.waiting_appointment_completed';
  if (lead.status === 'appointment_completed') return 'lead.next_step.open_booking';
  return 'lead.next_step.call_customer';
}

function statusTone(lead: LeadDetail): Tone {
  if (lead.status === 'booking_created' || lead.status === 'appointment_completed') return 'success';
  if (lead.status === 'deposit_received' || lead.status === 'appointment_created') return 'info';
  if (lead.status === 'deposit_requested' || lead.status === 'product_selected') return 'warning';
  if (lead.status === 'deposit_expired' || lead.status === 'lost' || lead.status === 'cancelled') return 'danger';
  return 'neutral';
}

function leadFromApi(row: any, labels: { unknownCustomer: string; unassigned: string }): LeadDetail {
  return {
    id: row.id,
    customerId: row.customer?.id ?? row.customerId,
    customerName: row.customer?.name ?? row.customer ?? row.title ?? labels.unknownCustomer,
    email: row.customer?.email ?? row.email ?? '-',
    phone: row.customer?.phone ?? row.phone ?? '-',
    source: row.source ?? 'web',
    status: normalizeStatus(row.status),
    ownerName: row.assignedTo?.fullName ?? row.staff ?? labels.unassigned,
    ownerId: row.assignedTo?.id ?? row.assignedToId,
    notes: row.notes ?? '',
    quotedPrice: Number(row.quotedPrice ?? row.budget ?? 0),
    productId: row.product?.id ?? row.productId ?? undefined,
    productName: row.product?.name ?? row.productName ?? undefined,
    variantId: row.variant?.id ?? row.variantId ?? undefined,
    variantName: row.variant?.name ?? row.variantName ?? undefined,
    requestedSize: row.requestedSize ?? row.variant?.size ?? undefined,
    requestedColor: row.requestedColor ?? row.variant?.color ?? undefined,
    inventoryItemId: row.inventoryItem?.id ?? row.inventoryItemId ?? undefined,
    inventoryItemLabel: row.inventoryItem?.serialNumber ?? undefined,
    inventoryStatus: row.inventoryItem?.status ?? undefined,
    pickupDate: row.pickupDate ?? undefined,
    returnDate: row.returnDate ?? undefined,
    appointmentIntent: normalizeAppointmentIntent(row.appointmentIntent),
    productHoldStatus: normalizeHoldStatus(row.productHoldStatus),
    depositStatus: normalizeDepositStatus(row.depositStatus),
    depositAmountRequired: Number(row.depositAmountRequired ?? 0),
    depositAmountPaid: Number(row.depositAmountPaid ?? 0),
    depositRequestedAt: row.depositRequestedAt ?? undefined,
    depositDeadlineAt: row.depositDeadlineAt ?? undefined,
    depositReceivedAt: row.depositReceivedAt ?? undefined,
    contactedAt: row.contactedAt ?? undefined,
    appointmentId: row.appointment?.id ?? row.appointmentId ?? undefined,
    appointmentStatus: lower(row.appointment?.status ?? row.appointmentStatus) || undefined,
    appointmentType: lower(row.appointment?.type) || undefined,
    appointmentTime: row.appointment?.scheduledAt ?? row.appointment?.startTime ?? undefined,
    bookingId: row.booking?.id ?? row.bookingId ?? row.convertedToBookingId ?? undefined,
    bookingStatus: lower(row.booking?.status ?? row.bookingStatus) || undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

function auditFromApi(row: any, systemLabel: string): AuditRow {
  return {
    id: row.id,
    action: row.action,
    summary: row.summary,
    actor: row.actor?.fullName ?? row.actor ?? systemLabel,
    createdAt: row.createdAt,
  };
}

function zaloUrl(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  return digits ? `https://zalo.me/${digits}` : 'https://zalo.me';
}

function FlowStepCard({
  step,
  title,
  detail,
  helper,
  tone,
  statusLabel,
  action,
}: {
  step: string;
  title: string;
  detail: string;
  helper?: string;
  tone: Tone;
  statusLabel: string;
  action?: ReactNode;
}) {
  const tones: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]',
    info: 'border-[rgb(var(--info))/16] bg-[rgb(var(--info))/6]',
    success: 'border-[rgb(var(--success))/18] bg-[rgb(var(--success))/8]',
    warning: 'border-[rgb(var(--warning))/22] bg-[rgb(var(--warning))/8]',
    danger: 'border-[rgb(var(--danger))/22] bg-[rgb(var(--danger))/8]',
    accent: 'border-[rgb(var(--accent-solid))/18] bg-[rgb(var(--accent-solid))/8]',
  };

  return (
    <div className={cn('rounded-[22px] border p-4 shadow-[var(--shadow-soft)]', tones[tone])}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{step}</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{detail}</p>
        </div>
        <AdminBadge tone={tone}>{statusLabel}</AdminBadge>
      </div>
      {helper ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-secondary))]">{helper}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export default function LeadDetailPage() {
  const { t } = useI18n();
  const userRole = useAuthStore((state) => state.user?.role);
  const params = useParams();
  const leadId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const currency = useMemo(
    () =>
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectDraft, setSelectDraft] = useState({
    productId: '',
    variantId: '',
    inventoryItemId: '',
    size: '',
    color: '',
    pickupDate: '',
    returnDate: '',
    appointmentIntent: 'FITTING',
    quotedPrice: '',
    notes: '',
  });
  const [receiveDraft, setReceiveDraft] = useState({
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod,
    description: '',
  });
  const [editDraft, setEditDraft] = useState({
    notes: '',
    quotedPrice: '',
  });
  const [assignDraft, setAssignDraft] = useState('');
  const canViewAuditLogs = can(userRole, 'view_audit_logs');
  const canManageUsers = can(userRole, 'manage_users');
  const canCollectDeposit = canReceiveDepositByRole(userRole);

  const loadData = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const requests: Array<Promise<any>> = [
        leadsApi.getById(leadId),
        productsApi.getAll(),
        inventoryApi.getItems(),
      ];
      if (canManageUsers) {
        requests.push(usersApi.getAll());
      }
      if (canViewAuditLogs) {
        requests.push(auditLogsApi.getAll({ entityId: leadId }));
      }
      const results = await Promise.allSettled(requests);
      const [leadRes, productsRes, inventoryRes, staffRes, auditRes] = results;

      if (leadRes.status !== 'fulfilled') {
        throw leadRes.reason;
      }

      const nextLead = leadFromApi(leadRes.value.data, {
        unknownCustomer: t('leadOps.fallback.unknownCustomer'),
        unassigned: t('lead.unassigned'),
      });

      setLead(nextLead);
      setProducts(
        productsRes.status === 'fulfilled'
          ? (productsRes.value.data ?? []).map((row: any) => ({
              id: row.id,
              name: row.name,
              price: Number(row.price ?? 0),
              variants: (row.variants ?? []).map((variant: any) => ({
                id: variant.id,
                name: variant.name,
                size: variant.size,
                color: variant.color,
              })),
            }))
          : [],
      );
      setInventoryItems(
        inventoryRes.status === 'fulfilled'
          ? (inventoryRes.value.data ?? []).map((item: any) => ({
              id: item.id,
              productId: item.productId,
              variantId: item.variantId ?? undefined,
              serialNumber: item.serialNumber,
              status: lower(item.status),
              productName: item.product?.name,
              variantName: item.variant?.name,
            }))
          : [],
      );
      setStaff(
        canManageUsers && staffRes?.status === 'fulfilled'
          ? (staffRes.value.data ?? []).map((user: any) => ({
              id: user.id,
              fullName: user.fullName,
              role: user.role,
            }))
          : [],
      );
      setAuditRows(
        canViewAuditLogs && auditRes?.status === 'fulfilled'
          ? (auditRes.value.data ?? []).map((row: any) => auditFromApi(row, t('common.system')))
          : [],
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.actionFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageUsers, canViewAuditLogs, leadId]);

  useEffect(() => {
    if (!lead) return;
    setSelectDraft({
      productId: lead.productId ?? '',
      variantId: lead.variantId ?? '',
      inventoryItemId: lead.inventoryItemId ?? '',
      size: lead.requestedSize ?? '',
      color: lead.requestedColor ?? '',
      pickupDate: toDateTimeLocal(lead.pickupDate),
      returnDate: toDateTimeLocal(lead.returnDate),
      appointmentIntent: lead.appointmentIntent.toUpperCase(),
      quotedPrice: lead.quotedPrice ? String(lead.quotedPrice) : '',
      notes: lead.notes ?? '',
    });
    setReceiveDraft({
      amount: String(lead.depositAmountRequired || lead.depositAmountPaid || ''),
      paymentMethod: 'CASH',
      description: lead.productName ? `${lead.productName}` : '',
    });
    setEditDraft({
      notes: lead.notes ?? '',
      quotedPrice: lead.quotedPrice ? String(lead.quotedPrice) : '',
    });
    setAssignDraft(lead.ownerId ?? '');
  }, [lead]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectDraft.productId),
    [products, selectDraft.productId],
  );
  const selectedVariant = useMemo(
    () => selectedProduct?.variants.find((variant) => variant.id === selectDraft.variantId),
    [selectedProduct, selectDraft.variantId],
  );
  const filteredInventoryItems = useMemo(
    () =>
      inventoryItems.filter((item) => {
        if (!selectDraft.productId || item.productId !== selectDraft.productId) return false;
        if (selectDraft.variantId && item.variantId !== selectDraft.variantId) return false;
        if (item.id === lead?.inventoryItemId) return true;
        return item.status === 'available';
      }),
    [inventoryItems, lead?.inventoryItemId, selectDraft.productId, selectDraft.variantId],
  );
  const selectProductValidationMessage = !selectDraft.productId
    ? t('leadFlow.validation.productRequired')
    : !selectDraft.pickupDate || !selectDraft.returnDate
      ? t('leadFlow.validation.rentalDatesRequired')
      : null;

  const timelineItems = useMemo(() => {
    if (auditRows.length) {
      return auditRows.slice(0, 12).map((row) => ({
        time: formatDateTime(row.createdAt),
        title: row.summary,
        detail: `${row.actor} / ${row.action}`,
        tone: row.action.includes('ARCHIVE')
          ? ('danger' as Tone)
          : row.action.includes('PAYMENT')
            ? ('success' as Tone)
            : ('info' as Tone),
      }));
    }

    if (!lead) return [];

    return [
      { time: formatDateTime(lead.createdAt), title: t('leadOps.timeline.created'), detail: lead.source, tone: 'neutral' as Tone },
      lead.contactedAt ? { time: formatDateTime(lead.contactedAt), title: t('leadOps.timeline.contacted'), detail: lead.ownerName, tone: 'info' as Tone } : null,
      lead.depositRequestedAt ? { time: formatDateTime(lead.depositRequestedAt), title: t('leadOps.timeline.depositRequested'), detail: formatDateTime(lead.depositDeadlineAt), tone: 'warning' as Tone } : null,
      lead.depositReceivedAt ? { time: formatDateTime(lead.depositReceivedAt), title: t('leadOps.timeline.depositReceived'), detail: t('lead.appointment.auto_created'), tone: 'success' as Tone } : null,
      lead.appointmentTime ? { time: formatDateTime(lead.appointmentTime), title: t('lead.flow.appointment'), detail: lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : '-', tone: 'info' as Tone } : null,
      lead.bookingId ? { time: formatDateTime(lead.updatedAt), title: t('lead.flow.booking'), detail: lead.bookingId, tone: 'success' as Tone } : null,
    ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone?: Tone }>;
  }, [auditRows, lead, t]);

  const runAction = async (key: string, operation: () => Promise<void>, successMessage: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await operation();
      await loadData();
      setFeedback({ tone: 'success', message: successMessage });
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.actionFailed'));
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const selectProduct = async () => {
    if (!lead) return;
    await runAction(
      `select-product-${lead.id}`,
      async () => {
        await leadsApi.selectProduct(lead.id, {
          productId: selectDraft.productId,
          variantId: selectDraft.variantId || undefined,
          inventoryItemId: selectDraft.inventoryItemId || undefined,
          size: selectDraft.size || undefined,
          color: selectDraft.color || undefined,
          pickupDate: toIsoOrUndefined(selectDraft.pickupDate),
          returnDate: toIsoOrUndefined(selectDraft.returnDate),
          appointmentIntent: selectDraft.appointmentIntent,
          quotedPrice: selectDraft.quotedPrice ? Number(selectDraft.quotedPrice) : undefined,
          notes: selectDraft.notes || undefined,
        });
        setSelectOpen(false);
      },
      t('lead.feedback.productSelected'),
    );
  };

  const requestDeposit = async () => {
    if (!lead) return;
    await runAction(
      `request-deposit-${lead.id}`,
      async () => {
        await leadsApi.requestDeposit(lead.id, {
          quotedPrice: lead.quotedPrice || undefined,
          depositAmount: lead.depositAmountRequired || undefined,
        });
      },
      t('lead.feedback.depositRequested'),
    );
  };

  const receiveDeposit = async () => {
    if (!lead) return;
    await runAction(
      `receive-deposit-${lead.id}`,
      async () => {
        await leadsApi.receiveDeposit(lead.id, {
          amount: Number(receiveDraft.amount),
          paymentMethod: receiveDraft.paymentMethod,
          description: receiveDraft.description || undefined,
        });
        setReceiveOpen(false);
      },
      t('lead.feedback.depositReceived'),
    );
  };

  const recreateAppointment = async () => {
    if (!lead) return;
    await runAction(
      `create-appointment-${lead.id}`,
      async () => {
        await leadsApi.createAppointment(lead.id);
      },
      t('lead.feedback.appointmentCreated'),
    );
  };

  const completeAppointment = async () => {
    if (!lead?.appointmentId) return;
    await runAction(
      `complete-appointment-${lead.appointmentId}`,
      async () => {
        await appointmentsApi.complete(lead.appointmentId!);
      },
      t('leadFlow.success.appointmentCompleted'),
    );
  };

  const createBooking = async () => {
    if (!lead) return;
    await runAction(
      `create-booking-${lead.id}`,
      async () => {
        await leadsApi.convertToBooking(lead.id);
      },
      t('leadFlow.success.bookingCreated'),
    );
  };

  const saveLead = async () => {
    if (!lead) return;
    await runAction(
      `edit-${lead.id}`,
      async () => {
        await leadsApi.update(lead.id, {
          notes: editDraft.notes,
          quotedPrice: editDraft.quotedPrice ? Number(editDraft.quotedPrice) : undefined,
        });
        setEditOpen(false);
      },
      t('leadOps.success.updated'),
    );
  };

  const assignLead = async () => {
    if (!lead || !assignDraft) return;
    await runAction(
      `assign-${lead.id}`,
      async () => {
        await leadsApi.assignTo(lead.id, assignDraft);
        setAssignOpen(false);
      },
      t('leadOps.success.assigned'),
    );
  };

  const callCustomer = async () => {
    if (!lead) return;
    const logged = await runAction(
      `contact-${lead.id}`,
      async () => {
        await leadsApi.markContacted(lead.id, { notes: t('leadOps.timeline.callLogged') });
      },
      t('lead.feedback.contacted'),
    );
    if (logged) {
      window.location.assign(`tel:${lead.phone}`);
    }
  };

  const sendZalo = async () => {
    if (!lead) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    const logged = await runAction(
      `zalo-${lead.id}`,
      async () => {
        await leadsApi.markContacted(lead.id, { notes: t('leadOps.timeline.zaloSent') });
      },
      t('lead.feedback.contacted'),
    );
    if (logged) {
      if (popup) {
        popup.location.href = zaloUrl(lead.phone);
      } else {
        window.open(zaloUrl(lead.phone), '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (popup) {
      popup.close();
    }
  };

  const confirmCurrentAction = async () => {
    if (!lead || !confirmAction) return;
    if (confirmAction.kind === 'cancel') {
      await runAction(
        `cancel-${lead.id}`,
        async () => {
          await leadsApi.updateStatus(lead.id, 'CANCELLED');
          setConfirmAction(null);
        },
        t('lead.feedback.cancelled'),
      );
      return;
    }

    await runAction(
      `archive-${lead.id}`,
      async () => {
        await leadsApi.archive(lead.id);
        setConfirmAction(null);
      },
      t('lead.feedback.archived'),
    );
  };

  if (!leadId) {
    return <InlineAlert tone="warning">{t('errors.notFound')}</InlineAlert>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
        <AdminSpinner />
        {t('common.loading')}
      </div>
    );
  }

  if (!lead) {
    return <InlineAlert tone="warning">{t('errors.notFound')}</InlineAlert>;
  }

  const productDetail = hasProductSelection(lead)
    ? `${lead.productName ?? '-'}${lead.variantName ? ` / ${lead.variantName}` : ''}`
    : t('lead.no_product.title');
  const productStepDetail = !hasProductSelection(lead)
    ? t('lead.no_product.description')
    : hasRentalRequestContext(lead)
      ? `${formatDate(lead.pickupDate)} - ${formatDate(lead.returnDate)}`
      : t('lead.no_pickup_date.description');
  const requestDepositHelper = !hasRentalRequestContext(lead)
    ? t('lead.no_pickup_date.description')
    : canRequestDeposit(lead, userRole)
      ? t('leadFlow.helper.depositDeadline')
      : t('leadFlow.stepDesc.requestDeposit');

  const depositDeadlineLabel = lead.depositDeadlineAt ? formatDateTime(lead.depositDeadlineAt) : t('leadOps.notSet');
  const depositWindow = minutesUntil(lead.depositDeadlineAt);
  const depositDeadlineState =
    depositWindow === null ? t('leadOps.notSet') : depositWindow < 0 ? t('lead.deposit.expired') : depositDeadlineLabel;

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
        title={lead.customerName}
        subtitle={t('lead.subtitle')}
        nextStep={t(nextStepKey(lead))}
        meta={(
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={lead.status} tone={statusTone(lead)} />
            {isManualLead(lead) ? <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge> : null}
          </div>
        )}
        actions={(
          <>
            <Link className="button-secondary" href="/admin/leads">
              {t('common.back')}
            </Link>
            <AdminButton variant="secondary" onClick={loadData} loading={loading}>
              {t('common.refresh')}
            </AdminButton>
          </>
        )}
      />

      {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
      {feedback ? <div className="mt-4"><InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert></div> : null}

      <div className="mt-6">
        <WorkspaceLayout
          rail={(
            <>
              <RailSection title={t('lead.panels.quickActions')}>
                <AdminButton className="w-full" onClick={callCustomer} loading={busyAction === `contact-${lead.id}`}>
                  {t('lead.actions.call_customer')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={sendZalo} loading={busyAction === `zalo-${lead.id}`}>
                  {t('lead.actions.send_zalo')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
                  {t('lead.actions.edit_lead')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => setAssignOpen(true)}>
                  {t('lead.actions.assign_staff')}
                </AdminButton>
                {canEditProduct(lead) ? (
                  <AdminButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => setSelectOpen(true)}
                  >
                    {t('lead.actions.select_product')}
                  </AdminButton>
                ) : null}
                <AdminButton
                  className="w-full"
                  onClick={requestDeposit}
                  loading={busyAction === `request-deposit-${lead.id}`}
                  disabled={!canRequestDeposit(lead, userRole)}
                >
                  {t('lead.actions.request_deposit')}
                </AdminButton>
                <AdminButton
                  className="w-full"
                  onClick={() => setReceiveOpen(true)}
                  disabled={!canReceiveDeposit(lead, userRole)}
                >
                  {t('lead.actions.confirm_deposit')}
                </AdminButton>
                {lead.bookingId ? (
                  <Link className="button-primary w-full text-center" href={`/admin/bookings/${lead.bookingId}`}>
                    {t('lead.actions.open_booking')}
                  </Link>
                ) : canCreateBookingOverride(lead) ? (
                  <AdminButton
                    className="w-full"
                    onClick={createBooking}
                    loading={busyAction === `create-booking-${lead.id}`}
                  >
                    {t('lead.actions.create_booking')}
                  </AdminButton>
                ) : lead.appointmentId ? (
                  <AdminButton
                    className="w-full"
                    onClick={completeAppointment}
                    loading={busyAction === `complete-appointment-${lead.appointmentId}`}
                    disabled={!canCompleteAppointment(lead)}
                  >
                    {t('lead.actions.complete_appointment')}
                  </AdminButton>
                ) : (
                  <AdminButton
                    className="w-full"
                    onClick={recreateAppointment}
                    loading={busyAction === `create-appointment-${lead.id}`}
                    disabled={!appointmentIsRecoverable(lead)}
                  >
                    {lead.appointmentId ? t('lead.actions.open_appointment') : t('lead.actions.recreate_appointment')}
                  </AdminButton>
                )}
                <AdminButton
                  variant="secondary"
                  className="w-full text-[rgb(var(--danger))]"
                  onClick={() => setConfirmAction({ kind: 'cancel' })}
                  disabled={lead.status === 'cancelled' || hasBooking(lead)}
                >
                  {t('lead.actions.cancel_lead')}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  className="w-full text-[rgb(var(--danger))]"
                  onClick={() => setConfirmAction({ kind: 'archive' })}
                >
                  {t('lead.actions.archive_lead')}
                </AdminButton>
              </RailSection>

              <RailSection title={t('lead.panels.deposit')}>
                <KeyValueList
                  items={[
                    { label: t('leadFlow.summary.depositStatus'), value: t(`leadFlow.depositState.${lead.depositStatus}`) },
                    { label: t('leadFlow.summary.holdStatus'), value: t(`leadFlow.hold.${lead.productHoldStatus}`) },
                    { label: t('lead.deposit.deadline'), value: depositDeadlineState },
                    { label: t('leadFlow.summary.depositAmount'), value: currency.format(lead.depositAmountRequired || 0) },
                    { label: t('leadFlow.summary.depositPaid'), value: currency.format(lead.depositAmountPaid || 0) },
                  ]}
                />
              </RailSection>

              <RailSection title={t('lead.panels.appointment')}>
                <KeyValueList
                  items={[
                    { label: t('leadFlow.summary.appointmentType'), value: t(`leadFlow.intent.${lead.appointmentIntent}`) },
                    { label: t('leadFlow.summary.appointmentStatus'), value: lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.empty.appointment') },
                    { label: t('leadFlow.summary.appointmentTime'), value: lead.appointmentTime ? formatDateTime(lead.appointmentTime) : '-' },
                  ]}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="button-secondary text-center" href="/admin/appointments">
                    {t('lead.actions.open_appointment')}
                  </Link>
                  {appointmentIsRecoverable(lead) ? (
                    <AdminButton
                      onClick={recreateAppointment}
                      loading={busyAction === `create-appointment-${lead.id}`}
                    >
                      {t('lead.actions.recreate_appointment')}
                    </AdminButton>
                  ) : null}
                </div>
              </RailSection>
            </>
          )}
        >
          <SectionCard title={t('lead.detail')} description={t('leadOps.detail.description')}>
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-6 shadow-[var(--shadow-panel)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('lead.flow.customer')}</p>
                      <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-[rgb(var(--text-primary))]">{lead.customerName}</h2>
                      <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{lead.phone} / {lead.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={lead.status} tone={statusTone(lead)} />
                      {isManualLead(lead) ? <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge> : null}
                      <AdminBadge tone="neutral">{t(nextStepKey(lead))}</AdminBadge>
                    </div>
                  </div>
                </div>

                <SectionCard title={t('lead.customerProfile')} description={t('lead.customerProfileDesc')} className="shadow-none">
                  <KeyValueList
                    items={[
                      { label: t('lead.customer'), value: lead.customerName },
                      { label: t('lead.phone'), value: lead.phone },
                      { label: t('lead.email'), value: lead.email },
                      { label: t('lead.source'), value: t(`leadOps.source.${lead.source}`) },
                      { label: t('lead.salesOwner'), value: lead.ownerName },
                    ]}
                  />
                </SectionCard>

                <SectionCard
                  title={t('lead.panels.productRequest')}
                  description={isManualLead(lead) ? t('lead.manual.description') : t('leadFlow.stepDesc.product')}
                  className="shadow-none"
                >
                  {!hasProductSelection(lead) ? (
                    <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('lead.no_product.title')}</p>
                        <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{t('lead.manual.description')}</p>
                      {canEditProduct(lead) ? (
                        <div className="mt-4">
                          <AdminButton onClick={() => setSelectOpen(true)}>{t('lead.actions.select_product')}</AdminButton>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <KeyValueList
                      items={[
                        { label: t('lead.flow.product'), value: productDetail },
                        { label: t('leadFlow.form.size'), value: lead.requestedSize || t('leadFlow.form.optionalPlaceholder') },
                        { label: t('leadFlow.form.color'), value: lead.requestedColor || t('leadFlow.form.optionalPlaceholder') },
                        { label: t('leadFlow.form.inventoryItem'), value: lead.inventoryItemLabel ?? t('leadFlow.form.autoAssign') },
                        { label: t('leadFlow.summary.pickupDate'), value: lead.pickupDate ? formatDateTime(lead.pickupDate) : '-' },
                        { label: t('leadFlow.summary.returnDate'), value: lead.returnDate ? formatDateTime(lead.returnDate) : '-' },
                        { label: t('lead.panels.rentalIntent'), value: t(`leadFlow.intent.${lead.appointmentIntent}`) },
                        { label: t('lead.budget'), value: lead.quotedPrice ? currency.format(lead.quotedPrice) : t('leadOps.notQuoted') },
                      ]}
                    />
                  )}
                </SectionCard>

                <SectionCard title={t('lead.notes')} description={t('leadOps.detail.noNotes')} className="shadow-none">
                  <div className="rounded-[22px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                    {lead.notes || t('leadOps.detail.noNotes')}
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-4">
                <SectionCard title={t('leadFlow.panel.title')} description={t('leadFlow.panel.description')} className="shadow-none">
                  <div className="grid gap-3">
                    <FlowStepCard
                      step={t('leadFlow.steps.product')}
                      title={hasProductSelection(lead) ? productDetail : t('lead.no_product.title')}
                      detail={productStepDetail}
                      helper={!hasProductSelection(lead)
                        ? t('lead.manual.description')
                        : !hasRentalRequestContext(lead)
                          ? t('lead.no_pickup_date.description')
                          : t('leadFlow.stepDesc.product')}
                      tone={hasProductSelection(lead) ? 'success' : canEditProduct(lead) ? 'warning' : 'neutral'}
                      statusLabel={hasProductSelection(lead) ? t('lead.flow.complete') : t('lead.flow.blocked')}
                      action={canEditProduct(lead) ? (
                        <AdminButton variant="secondary" onClick={() => setSelectOpen(true)}>
                          {t('lead.actions.select_product')}
                        </AdminButton>
                      ) : undefined}
                    />

                    <FlowStepCard
                      step={t('leadFlow.steps.requestDeposit')}
                      title={hasRequestedDeposit(lead) ? t(`lead.status.${lead.status}`) : t('lead.deposit.missing')}
                      detail={hasRequestedDeposit(lead) ? depositDeadlineLabel : t('lead.deposit.reserve_pending')}
                      helper={requestDepositHelper}
                      tone={lead.status === 'deposit_expired' ? 'danger' : hasRequestedDeposit(lead) ? 'success' : canRequestDeposit(lead, userRole) || hasProductSelection(lead) ? 'warning' : 'neutral'}
                      statusLabel={hasRequestedDeposit(lead) ? t('lead.flow.complete') : t('lead.flow.pending')}
                      action={(
                        <AdminButton onClick={requestDeposit} loading={busyAction === `request-deposit-${lead.id}`} disabled={!canRequestDeposit(lead, userRole)}>
                          {t('lead.actions.request_deposit')}
                        </AdminButton>
                      )}
                    />

                    <FlowStepCard
                      step={t('leadFlow.steps.receiveDeposit')}
                      title={hasReceivedDeposit(lead) ? t('lead.deposit.reserved') : t('lead.actions.confirm_deposit')}
                      detail={hasReceivedDeposit(lead) ? currency.format(lead.depositAmountPaid || 0) : t('lead.deposit.reserve_pending')}
                      helper={hasReceivedDeposit(lead)
                        ? t('lead.appointment.auto_created')
                        : !canCollectDeposit
                          ? t('common.notAllowed')
                          : t('leadFlow.helper.autoReserve')}
                      tone={hasReceivedDeposit(lead) ? 'success' : canReceiveDeposit(lead, userRole) ? 'info' : 'neutral'}
                      statusLabel={hasReceivedDeposit(lead) ? t('lead.flow.complete') : t('lead.flow.pending')}
                      action={(
                        <AdminButton onClick={() => setReceiveOpen(true)} disabled={!canReceiveDeposit(lead, userRole)}>
                          {t('lead.actions.confirm_deposit')}
                        </AdminButton>
                      )}
                    />

                    <FlowStepCard
                      step={t('leadFlow.steps.appointment')}
                      title={lead.appointmentId ? (lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.actions.open_appointment')) : t('lead.empty.appointment')}
                      detail={lead.appointmentTime ? formatDateTime(lead.appointmentTime) : hasReceivedDeposit(lead) ? t('lead.appointment.missing_after_deposit') : t('lead.appointment.waiting_completion')}
                      helper={lead.appointmentId ? t('leadFlow.next.completeAppointment') : t('leadFlow.helper.autoAppointment')}
                      tone={lead.appointmentId ? 'success' : appointmentIsRecoverable(lead) ? 'warning' : 'neutral'}
                      statusLabel={lead.appointmentId ? t('lead.flow.complete') : t('lead.flow.pending')}
                      action={(
                        <div className="flex flex-wrap gap-2">
                          <Link className="button-secondary text-center" href="/admin/appointments">
                            {t('lead.actions.open_appointment')}
                          </Link>
                          {appointmentIsRecoverable(lead) ? (
                            <AdminButton
                              onClick={recreateAppointment}
                              loading={busyAction === `create-appointment-${lead.id}`}
                            >
                              {t('lead.actions.recreate_appointment')}
                            </AdminButton>
                          ) : canCompleteAppointment(lead) ? (
                            <AdminButton
                              onClick={completeAppointment}
                              loading={busyAction === `complete-appointment-${lead.appointmentId}`}
                            >
                              {t('lead.actions.complete_appointment')}
                            </AdminButton>
                          ) : null}
                        </div>
                      )}
                    />

                    <FlowStepCard
                      step={t('leadFlow.steps.booking')}
                      title={lead.bookingId ?? (canCreateBookingOverride(lead) ? t('lead.booking.ready') : t('lead.empty.booking'))}
                      detail={lead.bookingStatus ? t(`booking.status.${lead.bookingStatus}`) : lead.appointmentStatus === 'completed' ? t('lead.booking.ready') : t('lead.appointment.waiting_completion')}
                      helper={hasBooking(lead) ? t('lead.booking.locked') : t('leadFlow.stepDesc.booking')}
                      tone={hasBooking(lead) ? 'success' : canCreateBookingOverride(lead) ? 'info' : 'neutral'}
                      statusLabel={hasBooking(lead) ? t('lead.flow.complete') : canCreateBookingOverride(lead) ? t('lead.flow.pending') : t('lead.flow.blocked')}
                      action={hasBooking(lead) ? (
                        <Link className="button-primary text-center" href={`/admin/bookings/${lead.bookingId}`}>
                          {t('lead.actions.open_booking')}
                        </Link>
                      ) : (
                        <AdminButton
                          onClick={createBooking}
                          loading={busyAction === `create-booking-${lead.id}`}
                          disabled={!canCreateBookingOverride(lead)}
                        >
                          {t('lead.actions.create_booking')}
                        </AdminButton>
                      )}
                    />
                  </div>
                </SectionCard>

                <SectionCard title={t('lead.panels.deposit')} description={t('leadOps.deposit.rule')} className="shadow-none">
                  <KeyValueList
                    items={[
                      { label: t('leadFlow.summary.holdStatus'), value: t(`leadFlow.hold.${lead.productHoldStatus}`) },
                      { label: t('leadFlow.summary.depositStatus'), value: t(`leadFlow.depositState.${lead.depositStatus}`) },
                      { label: t('lead.deposit.deadline'), value: depositDeadlineLabel },
                      { label: t('leadFlow.summary.depositAmount'), value: currency.format(lead.depositAmountRequired || 0) },
                      { label: t('leadFlow.summary.depositPaid'), value: currency.format(lead.depositAmountPaid || 0) },
                    ]}
                  />
                </SectionCard>

                <SectionCard
                  title={t('lead.panels.appointment')}
                  description={lead.appointmentId ? t('lead.appointment.auto_created') : t('lead.appointment.waiting_completion')}
                  className="shadow-none"
                >
                  <KeyValueList
                    items={[
                      { label: t('leadFlow.summary.appointmentType'), value: t(`leadFlow.intent.${lead.appointmentIntent}`) },
                      { label: t('leadFlow.summary.appointmentStatus'), value: lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.empty.appointment') },
                      { label: t('leadFlow.summary.appointmentTime'), value: lead.appointmentTime ? formatDateTime(lead.appointmentTime) : '-' },
                    ]}
                  />
                  {appointmentIsRecoverable(lead) ? (
                    <div className="mt-4">
                      <InlineAlert tone="warning">{t('lead.appointment.missing_after_deposit')}</InlineAlert>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard
                  title={t('lead.panels.booking')}
                  description={hasBooking(lead) ? t('lead.booking.locked') : t('lead.appointment.waiting_completion')}
                  className="shadow-none"
                >
                  <KeyValueList
                    items={[
                      { label: t('lead.flow.booking'), value: lead.bookingId ?? t('lead.empty.booking') },
                      { label: t('common.status'), value: lead.bookingStatus ? t(`booking.status.${lead.bookingStatus}`) : '-' },
                    ]}
                  />
                </SectionCard>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('lead.panels.activity')} description={t('leadOps.detail.timelineDesc')}>
            <TimelineList
              items={timelineItems.length ? timelineItems : [{ time: formatDateTime(lead.createdAt), title: t('leadOps.timeline.created'), detail: lead.source }]}
            />
          </SectionCard>
        </WorkspaceLayout>
      </div>

      <AdminModal
        open={selectOpen}
        title={t('lead.actions.select_product')}
        onClose={() => setSelectOpen(false)}
        size="lg"
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setSelectOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              onClick={selectProduct}
              loading={busyAction === `select-product-${lead.id}`}
              disabled={Boolean(selectProductValidationMessage)}
            >
              {t('leadFlow.actions.saveProduct')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.product')}
            <AdminSelect value={selectDraft.productId} onChange={(event) => setSelectDraft((current) => ({ ...current, productId: event.target.value, variantId: '', inventoryItemId: '' }))}>
              <option value="">{t('leadFlow.form.selectPlaceholder')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.variant')}
            <AdminSelect value={selectDraft.variantId} onChange={(event) => setSelectDraft((current) => ({ ...current, variantId: event.target.value, inventoryItemId: '' }))}>
              <option value="">{t('leadFlow.form.optionalPlaceholder')}</option>
              {(selectedProduct?.variants ?? []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}{variant.size ? ` / ${variant.size}` : ''}{variant.color ? ` / ${variant.color}` : ''}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.size')}
            <AdminInput
              value={selectDraft.size}
              onChange={(event) => setSelectDraft((current) => ({ ...current, size: event.target.value }))}
              placeholder={selectedVariant?.size ?? t('leadFlow.form.optionalPlaceholder')}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.color')}
            <AdminInput
              value={selectDraft.color}
              onChange={(event) => setSelectDraft((current) => ({ ...current, color: event.target.value }))}
              placeholder={selectedVariant?.color ?? t('leadFlow.form.optionalPlaceholder')}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.inventoryItem')}
            <AdminSelect value={selectDraft.inventoryItemId} onChange={(event) => setSelectDraft((current) => ({ ...current, inventoryItemId: event.target.value }))}>
              <option value="">{t('leadFlow.form.autoAssign')}</option>
              {filteredInventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.serialNumber}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.appointmentIntent')}
            <AdminSelect value={selectDraft.appointmentIntent} onChange={(event) => setSelectDraft((current) => ({ ...current, appointmentIntent: event.target.value }))}>
              <option value="FITTING">{t('leadFlow.intent.fitting')}</option>
              <option value="PICKUP">{t('leadFlow.intent.pickup')}</option>
              <option value="DELIVERY">{t('leadFlow.intent.delivery')}</option>
            </AdminSelect>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.pickupDate')}
            <AdminInput type="datetime-local" value={selectDraft.pickupDate} onChange={(event) => setSelectDraft((current) => ({ ...current, pickupDate: event.target.value }))} />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.returnDate')}
            <AdminInput type="datetime-local" value={selectDraft.returnDate} onChange={(event) => setSelectDraft((current) => ({ ...current, returnDate: event.target.value }))} />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.quotedPrice')}
            <AdminInput type="number" value={selectDraft.quotedPrice} onChange={(event) => setSelectDraft((current) => ({ ...current, quotedPrice: event.target.value }))} />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('leadOps.form.notes')}
            <textarea className="field h-28 py-3" value={selectDraft.notes} onChange={(event) => setSelectDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
        </div>
        {selectProductValidationMessage ? (
          <div className="mt-4">
            <InlineAlert tone="warning">{selectProductValidationMessage}</InlineAlert>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={receiveOpen}
        title={t('lead.actions.confirm_deposit')}
        onClose={() => setReceiveOpen(false)}
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setReceiveOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              onClick={receiveDeposit}
              loading={busyAction === `receive-deposit-${lead.id}`}
              disabled={!Number(receiveDraft.amount)}
            >
              {t('lead.actions.confirm_deposit')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.depositAmount')}
            <AdminInput type="number" value={receiveDraft.amount} onChange={(event) => setReceiveDraft((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.paymentMethod')}
            <AdminSelect value={receiveDraft.paymentMethod} onChange={(event) => setReceiveDraft((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`payment.method.${lower(method)}`)}
                </option>
              ))}
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadFlow.form.paymentNote')}
            <AdminInput value={receiveDraft.description} onChange={(event) => setReceiveDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={editOpen}
        title={t('lead.actions.edit_lead')}
        onClose={() => setEditOpen(false)}
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={saveLead} loading={busyAction === `edit-${lead.id}`}>
              {t('common.save')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('lead.budget')}
            <AdminInput type="number" value={editDraft.quotedPrice} onChange={(event) => setEditDraft((current) => ({ ...current, quotedPrice: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('lead.notes')}
            <textarea className="field h-32 py-3" value={editDraft.notes} onChange={(event) => setEditDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={assignOpen}
        title={t('lead.actions.assign_staff')}
        onClose={() => setAssignOpen(false)}
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setAssignOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={assignLead} loading={busyAction === `assign-${lead.id}`} disabled={!assignDraft}>
              {t('lead.actions.assign_staff')}
            </AdminButton>
          </>
        )}
      >
        <AdminSelect value={assignDraft} onChange={(event) => setAssignDraft(event.target.value)}>
          <option value="">{t('lead.unassigned')}</option>
          {staff.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}{user.role ? ` / ${user.role}` : ''}
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
            <AdminButton variant="secondary" onClick={() => setConfirmAction(null)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={confirmCurrentAction} loading={busyAction === `${confirmAction?.kind}-${lead.id}`}>
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
