'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { appointmentsApi, auditLogsApi, leadsApi, paymentsApi, productsApi, usersApi } from '@/lib/api';
import { can } from '@/lib/admin/permissions';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/auth.store';
import {
  FeedbackPopup,
  InlineAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
  TimelineList,
} from '@/components/admin/ui';
import { MoneyInput, ProductCardSelect, parseImageList, type LeadProductOption } from '@/components/admin/lead-ui';
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
  workflowBlockCode?: string;
  workflowBlockMessage?: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productValue: number;
    rentalPrice: number;
    imageUrl?: string;
    qrCode?: string;
    status: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

type LeadPaymentSummary = {
  productValue: number;
  rentalTotal?: number;
  selectedDepositType?: string;
  selectedDepositRate: number;
  customDepositAmount?: number | null;
  securityDepositRequiredByRate: number;
  securityDepositFullAmount: number;
  securityDepositPaid: number;
  securityDepositRemainingForSelectedRate: number;
  securityDepositRemainingForFull: number;
  refundedAmount: number;
  depositStatus: string;
  depositDeadline?: string | null;
  canReserve: boolean;
  canReceiveDeposit: boolean;
  canRefundDeposit: boolean;
  products?: Array<{
    id: string;
    name: string;
    image?: string | null;
    productValue: number;
    rentalPrice: number;
    status?: string;
    qrCode?: string;
  }>;
};

type ProductOption = LeadProductOption;

type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
};

type LeadDepositChoice = {
  key: string;
  labelKey: string;
  helperKey: string;
  amount: number;
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

function formatPolicyMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.max(Number(value || 0), 0));
}

function normalizeEntityId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) return undefined;
  if (normalized.startsWith('data:') || normalized.startsWith('[') || normalized.includes('base64,')) return undefined;
  return normalized;
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

function leadDepositChoices(productValue: number): {
  defaultAmount: number;
  policyLabelKey: string;
  policyHelperKey: string;
  options: LeadDepositChoice[];
} {
  const normalizedValue = Math.max(Number(productValue || 0), 0);
  if (normalizedValue <= 300000) {
    return {
      defaultAmount: 0,
      policyLabelKey: 'leadOps.deposit.policyLabel.none',
      policyHelperKey: 'leadOps.deposit.policyHelper.none',
      options: [
        {
          key: 'no_deposit',
          labelKey: 'leadOps.deposit.option.no_deposit',
          helperKey: 'leadOps.deposit.optionHelper.no_deposit',
          amount: 0,
        },
      ],
    };
  }
  if (normalizedValue < 1000000) {
    return {
      defaultAmount: 500000,
      policyLabelKey: 'leadOps.deposit.policyLabel.mid',
      policyHelperKey: 'leadOps.deposit.policyHelper.mid',
      options: [
        {
          key: 'cash_500k',
          labelKey: 'leadOps.deposit.option.cash_500k',
          helperKey: 'leadOps.deposit.optionHelper.cash_500k',
          amount: 500000,
        },
        {
          key: 'document_only',
          labelKey: 'leadOps.deposit.option.document_only',
          helperKey: 'leadOps.deposit.optionHelper.document_only',
          amount: 0,
        },
      ],
    };
  }
  return {
    defaultAmount: 1000000,
    policyLabelKey: 'leadOps.deposit.policyLabel.high',
    policyHelperKey: 'leadOps.deposit.policyHelper.high',
    options: [
      {
        key: 'cash_1m',
        labelKey: 'leadOps.deposit.option.cash_1m',
        helperKey: 'leadOps.deposit.optionHelper.cash_1m',
        amount: 1000000,
      },
      {
        key: 'cash_500k_with_document',
        labelKey: 'leadOps.deposit.option.cash_500k_with_document',
        helperKey: 'leadOps.deposit.optionHelper.cash_500k_with_document',
        amount: 500000,
      },
    ],
  };
}

function resolveLeadDepositSelection(productValue: number, _depositRate: number, amount?: number | null) {
  const policy = leadDepositChoices(productValue);
  const normalizedAmount = amount == null ? policy.defaultAmount : Math.max(Number(amount || 0), 0);
  return {
    depositType: 'custom_amount' as const,
    customDepositAmount: normalizedAmount,
  };
}

function sumLeadProductValue(items: LeadDetail['items']) {
  return items.reduce((sum, item) => sum + Math.max(Number(item.productValue || 0), 0), 0);
}

function hasProductSelection(lead: LeadDetail) {
  return Boolean(lead.items.length || lead.productId);
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

function hasReservedProducts(lead: LeadDetail) {
  return ['reserved', 'converted_to_booking'].includes(lead.productHoldStatus)
    || lead.items.some((item) => ['reserved', 'converted_to_booking'].includes(lower(item.status)));
}

function appointmentIsRecoverable(lead: LeadDetail) {
  return hasReceivedDeposit(lead) && !lead.appointmentId;
}

function isManualLead(lead: LeadDetail) {
  return !hasProductSelection(lead);
}

function canEditProduct(lead: LeadDetail) {
  return !hasRequestedDeposit(lead) && !hasReceivedDeposit(lead) && !hasBooking(lead);
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
  return lead.status === 'appointment_completed' && !hasBooking(lead) && lead.workflowBlockCode === 'booking_failed';
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

function translateLeadSource(
  source: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const key = `leadOps.source.${source}`;
  const translated = t(key);
  return translated === key ? source : translated;
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
    appointmentId: normalizeEntityId(row.appointment?.id ?? row.appointmentId),
    appointmentStatus: lower(row.appointment?.status ?? row.appointmentStatus) || undefined,
    appointmentType: lower(row.appointment?.type) || undefined,
    appointmentTime: row.appointment?.scheduledAt ?? row.appointment?.startTime ?? undefined,
    bookingId: normalizeEntityId(row.booking?.id ?? row.bookingId ?? row.convertedToBookingId),
    bookingStatus: lower(row.booking?.status ?? row.bookingStatus) || undefined,
    workflowBlockCode: row.workflowBlockCode ?? undefined,
    workflowBlockMessage: row.workflowBlockMessage ?? undefined,
    items: (row.items ?? []).map((item: any) => ({
      id: item.productId ?? item.id,
      productId: item.productId,
      productName: item.product?.name ?? '-',
      productValue: Number(item.productValueAtTime ?? item.product?.productValue ?? item.product?.price ?? 0),
      rentalPrice: Number(item.rentalPriceAtTime ?? item.product?.rentalPrice ?? item.product?.price ?? 0),
      imageUrl: item.product?.image ?? undefined,
      qrCode: item.product?.qrCode ?? item.productId,
      status: lower(item.status) || 'requested',
    })),
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

function DotIcon() {
  return <span className="block h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />;
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M3 6.5L10 3l7 3.5M3 6.5V14l7 3 7-3V6.5M3 6.5l7 3.5m7-3.5L10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M4 5.5h10.75A1.25 1.25 0 0 1 16 6.75V14a1.25 1.25 0 0 1-1.25 1.25H5.25A1.25 1.25 0 0 1 4 14V5.5Zm0 0L12.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9.25h-3a1.5 1.5 0 0 0 0 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M5.5 3.75v2.5M14.5 3.75v2.5M4.25 6h11.5A1.25 1.25 0 0 1 17 7.25v8.5A1.25 1.25 0 0 1 15.75 17H4.25A1.25 1.25 0 0 1 3 15.75v-8.5A1.25 1.25 0 0 1 4.25 6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8.75h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="m4.75 10.5 3.25 3.25 7.25-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailField({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="group rounded-[20px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-3))]/45 px-4 py-3.5 transition hover:border-[rgb(var(--accent-solid))]/25 hover:bg-[rgb(var(--surface-2))]/80">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))]">
        {label}
      </p>

      <div className="mt-1.5 min-w-0 truncate text-sm font-semibold text-[rgb(var(--text-primary))]">
        {value}
      </div>

      {helper ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function FormBlock({
  title,
  description,
  children,
  rightSlot,
}: {
  title: string;
  description: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/82 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.045)] md:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-[rgb(var(--surface-border))]/55 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.025em] text-[rgb(var(--text-primary))]">
            {title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[rgb(var(--text-secondary))]">
            {description}
          </p>
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: Tone;
}) {
  const toneClass: Record<Tone, string> = {
    neutral: 'bg-[rgb(var(--surface-3))]/55 border-[rgb(var(--surface-border))]/65',
    info: 'bg-[rgb(var(--info))/7] border-[rgb(var(--info))/18]',
    success: 'bg-[rgb(var(--success))/8] border-[rgb(var(--success))/18]',
    warning: 'bg-[rgb(var(--warning))/8] border-[rgb(var(--warning))/22]',
    danger: 'bg-[rgb(var(--danger))/8] border-[rgb(var(--danger))/22]',
    accent: 'bg-[rgb(var(--accent-solid))/8] border-[rgb(var(--accent-solid))/18]',
  };

  return (
    <div className={cn('rounded-[22px] border px-4 py-3.5', toneClass[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))]">
        {label}
      </p>
      <div className="mt-1.5 truncate text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">
        {value}
      </div>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function OverviewStageCard({
  icon,
  title,
  value,
  detail,
  tone,
  statusLabel,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  tone: Tone;
  statusLabel: string;
}) {
  const toneClass: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-3))]/45',
    info: 'border-[rgb(var(--info))/18] bg-[rgb(var(--info))/7]',
    success: 'border-[rgb(var(--success))/18] bg-[rgb(var(--success))/8]',
    warning: 'border-[rgb(var(--warning))/22] bg-[rgb(var(--warning))/8]',
    danger: 'border-[rgb(var(--danger))/22] bg-[rgb(var(--danger))/8]',
    accent: 'border-[rgb(var(--accent-solid))/18] bg-[rgb(var(--accent-solid))/8]',
  };

  return (
    <div className={cn('rounded-[24px] border p-4 transition', toneClass[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-2))]/78 text-[rgb(var(--text-primary))]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))]">
              {title}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[rgb(var(--text-primary))]">
              {value}
            </p>
          </div>
        </div>

        <AdminBadge tone={tone}>{statusLabel}</AdminBadge>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
        {detail}
      </p>
    </div>
  );
}

function LeadHeroCard({
  lead,
  currency,
  nextStep,
  productDetail,
  productStepDetail,
  productValue,
  rentalValue,
  depositRequestedAmount,
  depositPaidAmount,
  depositRemainingAmount,
  depositDeadlineState,
  requestDepositHelper,
  bookingStepTitle,
  bookingStepDetail,
  reserveFailed,
  appointmentFailed,
  bookingFailed,
  bookingReservationBlocked,
}: {
  lead: LeadDetail;
  currency: Intl.NumberFormat;
  nextStep: string;
  productDetail: string;
  productStepDetail: string;
  productValue: number;
  rentalValue: number;
  depositRequestedAmount: number;
  depositPaidAmount: number;
  depositRemainingAmount: number;
  depositDeadlineState: string;
  requestDepositHelper: string;
  bookingStepTitle: string;
  bookingStepDetail: string;
  reserveFailed: boolean;
  appointmentFailed: boolean;
  bookingFailed: boolean;
  bookingReservationBlocked: boolean;
}) {
  const { t } = useI18n();
  const productCompletion = hasProductSelection(lead);
  const depositCompletion = hasRequestedDeposit(lead);
  const depositReceived = hasReceivedDeposit(lead);
  const appointmentCompletion = hasAppointment(lead);
  const bookingCompletion = hasBooking(lead);
  const rentalWindowValue = hasRentalRequestContext(lead)
    ? `${formatDateTime(lead.pickupDate)} - ${formatDateTime(lead.returnDate)}`
    : t('lead.no_pickup_date.title');
  const appointmentValue = lead.appointmentId
    ? (lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.actions.open_appointment'))
    : t('lead.empty.appointment');
  const appointmentDetail = lead.appointmentTime
    ? formatDateTime(lead.appointmentTime)
    : depositReceived
      ? t('lead.appointment.missing_after_deposit')
      : t('lead.appointment.waiting_completion');
  const riskMessage = reserveFailed
    ? t('lead.deposit.reserve_failed')
    : appointmentFailed
      ? t('lead.deposit.appointment_failed')
      : bookingFailed
        ? t('lead.booking.creationFailed')
        : bookingReservationBlocked
          ? t('lead.booking.reserveRequiredHelper')
          : !productCompletion
            ? t('lead.no_product.description')
            : !hasRentalRequestContext(lead)
              ? t('lead.no_pickup_date.description')
              : !depositCompletion
                ? t('leadFlow.stepDesc.requestDeposit')
                : !depositReceived
                  ? t('leadFlow.stepDesc.receiveDeposit')
                  : !appointmentCompletion
                    ? t('lead.appointment.missing_after_deposit')
                    : !bookingCompletion
                      ? bookingStepDetail
                      : t('lead.booking.locked');
  const riskTone: Tone = reserveFailed || appointmentFailed || bookingFailed || bookingReservationBlocked || lead.status === 'deposit_expired'
    ? 'danger'
    : !productCompletion || !hasRentalRequestContext(lead) || !depositCompletion || !depositReceived || !appointmentCompletion || !bookingCompletion
      ? 'warning'
      : 'success';
  const riskPanelClass: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-3))]/50',
    info: 'border-[rgb(var(--info))/18] bg-[rgb(var(--info))/7]',
    success: 'border-[rgb(var(--success))/18] bg-[rgb(var(--success))/8]',
    warning: 'border-[rgb(var(--warning))/22] bg-[rgb(var(--warning))/8]',
    danger: 'border-[rgb(var(--danger))/22] bg-[rgb(var(--danger))/8]',
    accent: 'border-[rgb(var(--accent-solid))/18] bg-[rgb(var(--accent-solid))/8]',
  };
  return (
    <section className="overflow-hidden rounded-[32px] border border-[rgb(var(--surface-border))]/70 bg-[linear-gradient(135deg,rgb(var(--surface-2))_0%,rgb(var(--surface))_55%,rgb(var(--surface-3))_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.075)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
            {t('leadOps.ui.leadCockpit')}
          </p>
          <h2 className="mt-2 truncate text-3xl font-semibold tracking-[-0.05em] text-[rgb(var(--text-primary))] md:text-4xl">
            {lead.customerName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">
            {lead.phone} / {lead.email}
          </p>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
            {translateLeadSource(lead.source, t)} / {lead.ownerName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge value={lead.status} tone={statusTone(lead)} />
          <AdminBadge tone="accent">{nextStep}</AdminBadge>
          {isManualLead(lead) ? <AdminBadge tone="warning">{t('leadOps.ui.manual')}</AdminBadge> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField
              label={t('lead.source')}
              value={translateLeadSource(lead.source, t)}
              helper={productCompletion ? productDetail : t('lead.manual.description')}
            />
            <DetailField
              label={t('leadOps.ui.owner')}
              value={lead.ownerName}
              helper={t('leadOps.ui.ownerHelper')}
            />
            <DetailField
              label={t('leadOps.ui.rentalWindow')}
              value={rentalWindowValue}
              helper={productStepDetail}
            />
            <DetailField
              label={t('leadFlow.summary.appointmentType')}
              value={t(`leadFlow.intent.${lead.appointmentIntent}`)}
              helper={appointmentValue}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricTile
              label={t('lead.products.total_value')}
              value={currency.format(productValue)}
              helper={productDetail}
            />
            <MetricTile
              label={t('lead.products.total_rental')}
              value={currency.format(rentalValue)}
              helper={t('leadOps.deposit.rentalValueHelper')}
              tone="accent"
            />
            <MetricTile
              label={t('lead.deposit.required')}
              value={currency.format(depositRequestedAmount || 0)}
              helper={depositDeadlineState}
              tone={depositCompletion ? 'warning' : 'neutral'}
            />
            <MetricTile
              label={t('lead.deposit.paid')}
              value={currency.format(depositPaidAmount || 0)}
              helper={t('leadOps.ui.depositPaidHelper')}
              tone={depositReceived ? 'success' : 'neutral'}
            />
            <MetricTile
              label={t('lead.deposit.remaining')}
              value={currency.format(depositRemainingAmount || 0)}
              helper={requestDepositHelper}
              tone={depositRemainingAmount > 0 ? 'warning' : 'success'}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/78 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
            {t('leadOps.ui.nextBestAction')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[rgb(var(--text-primary))]">
            {nextStep}
          </p>

          <div className="mt-4 grid gap-3">
            <DetailField
              label={t('lead.deposit.deadline')}
              value={depositDeadlineState}
              helper={requestDepositHelper}
            />
            <DetailField
              label={t('lead.flow.appointment')}
              value={appointmentValue}
              helper={appointmentDetail}
            />
            <DetailField
              label={t('lead.flow.booking')}
              value={bookingStepTitle}
              helper={bookingStepDetail}
            />
          </div>

          <div className={cn('mt-4 rounded-[22px] border p-4', riskPanelClass[riskTone])}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
              {t('leadOps.ui.dangerZone')}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[rgb(var(--text-primary))]">
              {riskMessage}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-[rgb(var(--surface-border))]/55 pt-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
              {t('leadFlow.panel.title')}
            </p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {t('leadFlow.panel.description')}
            </p>
          </div>
          <AdminBadge tone="accent">{nextStep}</AdminBadge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <OverviewStageCard
            icon={<BoxIcon />}
            title={t('leadFlow.steps.product')}
            value={productCompletion ? productDetail : t('lead.no_product.title')}
            detail={productStepDetail}
            tone={productCompletion ? 'success' : 'warning'}
            statusLabel={productCompletion ? t('lead.flow.complete') : t('lead.flow.pending')}
          />
          <OverviewStageCard
            icon={<WalletIcon />}
            title={t('leadFlow.steps.requestDeposit')}
            value={depositCompletion ? t(`lead.status.${lead.status}`) : t('lead.deposit.missing')}
            detail={depositCompletion ? depositDeadlineState : t('lead.deposit.reserve_pending')}
            tone={lead.status === 'deposit_expired' ? 'danger' : depositCompletion ? 'success' : productCompletion ? 'warning' : 'neutral'}
            statusLabel={depositCompletion ? t('lead.flow.complete') : productCompletion ? t('lead.flow.pending') : t('lead.flow.blocked')}
          />
          <OverviewStageCard
            icon={<DotIcon />}
            title={t('leadFlow.steps.receiveDeposit')}
            value={depositReceived ? t('lead.deposit.reserved') : t('lead.actions.confirm_deposit')}
            detail={depositReceived ? currency.format(depositPaidAmount || 0) : t('lead.deposit.reserve_pending')}
            tone={reserveFailed ? 'danger' : depositReceived ? 'success' : depositCompletion ? 'info' : 'neutral'}
            statusLabel={depositReceived ? t('lead.flow.complete') : depositCompletion ? t('lead.flow.pending') : t('lead.flow.blocked')}
          />
          <OverviewStageCard
            icon={<CalendarIcon />}
            title={t('leadFlow.steps.appointment')}
            value={appointmentValue}
            detail={appointmentDetail}
            tone={appointmentCompletion ? 'success' : appointmentIsRecoverable(lead) || appointmentFailed ? 'warning' : 'neutral'}
            statusLabel={appointmentCompletion ? t('lead.flow.complete') : appointmentIsRecoverable(lead) || appointmentFailed ? t('lead.flow.pending') : t('lead.flow.blocked')}
          />
          <OverviewStageCard
            icon={<CheckIcon />}
            title={t('leadFlow.steps.booking')}
            value={bookingStepTitle}
            detail={bookingStepDetail}
            tone={bookingCompletion ? 'success' : bookingFailed ? 'info' : bookingReservationBlocked ? 'warning' : 'neutral'}
            statusLabel={bookingCompletion ? t('lead.flow.complete') : canCreateBookingOverride(lead) ? t('lead.flow.pending') : t('lead.flow.blocked')}
          />
        </div>
      </div>
    </section>
  );
}

function ActionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
        {title}
      </p>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function FlowStepCard({
  step,
  title,
  detail,
  helper,
  tone,
  statusLabel,
  action,
  state,
  icon,
  isLast = false,
}: {
  step: string;
  title: string;
  detail: string;
  helper?: string;
  tone: Tone;
  statusLabel: string;
  action?: ReactNode;
  state: 'completed' | 'current' | 'locked';
  icon: ReactNode;
  isLast?: boolean;
}) {
  const tones: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/52',
    info: 'border-[rgb(var(--info))/18] bg-[rgb(var(--info))/7]',
    success: 'border-[rgb(var(--success))/18] bg-[rgb(var(--success))/8]',
    warning: 'border-[rgb(var(--warning))/22] bg-[rgb(var(--warning))/8]',
    danger: 'border-[rgb(var(--danger))/22] bg-[rgb(var(--danger))/8]',
    accent: 'border-[rgb(var(--accent-solid))/18] bg-[rgb(var(--accent-solid))/8]',
  };

  return (
    <div className="relative pl-14">
      {!isLast ? (
        <div className="absolute bottom-[-14px] left-[21px] top-11 w-px bg-[rgb(var(--surface-border))]/60" />
      ) : null}

      <div
        className={cn(
          'absolute left-0 top-1 flex h-11 w-11 items-center justify-center rounded-[18px] border shadow-[0_10px_24px_rgba(15,23,42,0.07)]',
          tones[tone],
          state === 'current' && 'ring-4 ring-[rgb(var(--accent-solid))]/10',
          state === 'locked' && 'opacity-60',
        )}
      >
        <span
          className={cn(
            'text-[rgb(var(--text-primary))]',
            state === 'locked' && 'text-[rgb(var(--text-muted))]',
          )}
        >
          {icon}
        </span>
      </div>

      <div
        className={cn(
          'rounded-[22px] border p-4 transition',
          tones[tone],
          state === 'current' &&
            'border-[rgb(var(--accent-solid))]/30 bg-[rgb(var(--surface-2))] shadow-[0_16px_38px_rgba(15,23,42,0.06)]',
          state === 'locked' && 'opacity-80',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
              {step}
            </p>
            <p className="mt-1.5 truncate text-sm font-semibold tracking-[-0.015em] text-[rgb(var(--text-primary))]">
              {title}
            </p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">
              {detail}
            </p>
          </div>

          <AdminBadge tone={tone}>{statusLabel}</AdminBadge>
        </div>

        {helper ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
            {helper}
          </p>
        ) : null}

        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

function CompactLeadSummary({
  lead,
  eyebrow,
  nextStep,
  sourceLabel,
  nextStepLabel,
  sourceFieldLabel,
  ownerLabel,
  statusBadge,
  manualBadge,
  ownerHelper,
  rentalWindowFieldLabel,
  rentalWindowHelper,
  appointmentIntentLabel,
  appointmentIntentValue,
}: {
  lead: LeadDetail;
  eyebrow: string;
  nextStep: string;
  sourceLabel: string;
  nextStepLabel: string;
  sourceFieldLabel: string;
  ownerLabel: string;
  statusBadge: ReactNode;
  manualBadge?: ReactNode;
  ownerHelper: string;
  rentalWindowFieldLabel: string;
  rentalWindowHelper: string;
  appointmentIntentLabel: string;
  appointmentIntentValue: string;
}) {
  return (
    <section className="rounded-[32px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/88 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.045)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
            {eyebrow}
          </p>
          <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-[rgb(var(--text-primary))] md:text-[2rem]">
            {lead.customerName}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
            {lead.phone} / {lead.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {statusBadge}
          {manualBadge}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DetailField label={nextStepLabel} value={nextStep} helper={rentalWindowHelper} />
        <DetailField label={sourceFieldLabel} value={sourceLabel} />
        <DetailField label={ownerLabel} value={lead.ownerName} helper={ownerHelper} />
        <DetailField
          label={rentalWindowFieldLabel}
          value={lead.pickupDate && lead.returnDate ? `${formatDate(lead.pickupDate)} - ${formatDate(lead.returnDate)}` : '-'}
        />
        <DetailField label={appointmentIntentLabel} value={appointmentIntentValue} />
      </div>
    </section>
  );
}

function WorkflowRail({
  eyebrow,
  description,
  items,
}: {
  eyebrow: string;
  description: string;
  items: Array<{
    step: string;
    title: string;
    detail: string;
    helper?: string;
    tone: Tone;
    statusLabel: string;
    state: 'completed' | 'current' | 'locked';
  }>;
}) {
  const toneMap: Record<Tone, string> = {
    neutral: 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55',
    info: 'border-[rgb(var(--info))/18] bg-[rgb(var(--info))/7]',
    success: 'border-[rgb(var(--success))/18] bg-[rgb(var(--success))/7]',
    warning: 'border-[rgb(var(--warning))/22] bg-[rgb(var(--warning))/8]',
    danger: 'border-[rgb(var(--danger))/22] bg-[rgb(var(--danger))/8]',
    accent: 'border-[rgb(var(--accent-solid))/18] bg-[rgb(var(--accent-solid))/8]',
  };

  return (
    <section className="rounded-[32px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface))]/96 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.04)] md:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
          {eyebrow}
        </p>
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          {description}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div
            key={`${item.step}-${item.title}`}
            className={cn(
              'rounded-[28px] border p-4 transition',
              toneMap[item.tone],
              item.state === 'current' && 'border-[rgb(var(--accent-solid))]/28 bg-[rgb(var(--surface-2))] shadow-[0_16px_36px_rgba(15,23,42,0.06)]',
              item.state === 'locked' && 'opacity-70',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--text-muted))]">
                  {item.step}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {item.title}
                </p>
              </div>
              <AdminBadge tone={item.tone}>{item.statusLabel}</AdminBadge>
            </div>
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-secondary))]">
              {item.detail}
            </p>
            {item.helper ? (
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                {item.helper}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function CurrentActionPanel({
  eyebrow,
  title,
  description,
  primaryAction,
  supportActions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: ReactNode;
  supportActions?: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="grid gap-4">
        <div className="rounded-[28px] border border-[rgb(var(--accent-solid))]/18 bg-[rgb(var(--accent-solid))]/7 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">
            {eyebrow}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {primaryAction}
          </div>
        </div>
        {supportActions ? (
          <div className="flex flex-wrap gap-2">
            {supportActions}
          </div>
        ) : null}
      </div>
    </SectionCard>
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
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<LeadPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectDraft, setSelectDraft] = useState({
    productId: '',
    productIds: [] as string[],
    pickupDate: '',
    returnDate: '',
    appointmentIntent: 'FITTING',
    quotedPrice: null as number | null,
    notes: '',
  });
  const [receiveDraft, setReceiveDraft] = useState({
    amount: null as number | null,
    paymentMethod: 'CASH' as PaymentMethod,
    description: '',
    depositRate: 50,
  });
  const [editDraft, setEditDraft] = useState({
    notes: '',
    quotedPrice: null as number | null,
  });
  const [assignDraft, setAssignDraft] = useState('');
  const canViewAuditLogs = can(userRole, 'view_audit_logs');
  const canManageUsers = can(userRole, 'manage_users');

  const loadData = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const requests: Array<Promise<any>> = [
        leadsApi.getById(leadId),
        productsApi.getAll(),
        paymentsApi.getByLead(leadId),
      ];
      if (canManageUsers) {
        requests.push(usersApi.getAll());
      }
      if (canViewAuditLogs) {
        requests.push(auditLogsApi.getAll({ entityId: leadId }));
      }
      const results = await Promise.allSettled(requests);
      const [leadRes, productsRes, paymentSummaryRes] = results;
      let resultIndex = 3;
      const staffRes = canManageUsers ? results[resultIndex++] : undefined;
      const auditRes = canViewAuditLogs ? results[resultIndex] : undefined;

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
              name: row.name ?? row.code ?? row.id,
              price: Number(row.rentalPrice ?? row.price ?? 0),
              productValue: Number(row.productValue ?? row.price ?? 0),
              rentalPrice: Number(row.rentalPrice ?? row.price ?? 0),
              imageUrl: row.image ?? parseImageList(row.images)[0] ?? undefined,
              qrCode: row.qrCode ?? row.code ?? undefined,
              status: lower(row.status) || 'available',
              variants: Array.isArray(row.variants)
                ? row.variants.map((variant: any) => ({
                    id: variant.id,
                    name: variant.name,
                    size: variant.size,
                    color: variant.color,
                    imageUrls: parseImageList(variant.imageUrls),
                  }))
                : [],
            }))
          : [],
      );
      setPaymentSummary(
        paymentSummaryRes.status === 'fulfilled'
          ? {
              productValue: Number(paymentSummaryRes.value.data?.summary?.productValue ?? 0),
              rentalTotal: Number(paymentSummaryRes.value.data?.summary?.rentalTotal ?? 0),
              selectedDepositType: String(paymentSummaryRes.value.data?.summary?.selectedDepositType ?? 'percent'),
              selectedDepositRate: Number(paymentSummaryRes.value.data?.summary?.selectedDepositRate ?? 50),
              customDepositAmount: paymentSummaryRes.value.data?.summary?.customDepositAmount == null ? null : Number(paymentSummaryRes.value.data?.summary?.customDepositAmount),
              securityDepositRequiredByRate: Number(paymentSummaryRes.value.data?.summary?.securityDepositRequiredByRate ?? 0),
              securityDepositFullAmount: Number(paymentSummaryRes.value.data?.summary?.securityDepositFullAmount ?? 0),
              securityDepositPaid: Number(paymentSummaryRes.value.data?.summary?.securityDepositPaid ?? 0),
              securityDepositRemainingForSelectedRate: Number(paymentSummaryRes.value.data?.summary?.securityDepositRemainingForSelectedRate ?? 0),
              securityDepositRemainingForFull: Number(paymentSummaryRes.value.data?.summary?.securityDepositRemainingForFull ?? 0),
              refundedAmount: Number(paymentSummaryRes.value.data?.summary?.refundedAmount ?? 0),
              depositStatus: String(paymentSummaryRes.value.data?.summary?.depositStatus ?? 'none'),
              depositDeadline: paymentSummaryRes.value.data?.summary?.depositDeadline ?? null,
              canReserve: Boolean(paymentSummaryRes.value.data?.summary?.canReserve),
              canReceiveDeposit: Boolean(paymentSummaryRes.value.data?.summary?.canReceiveDeposit),
              canRefundDeposit: Boolean(paymentSummaryRes.value.data?.summary?.canRefundDeposit),
              products: Array.isArray(paymentSummaryRes.value.data?.summary?.products)
                ? paymentSummaryRes.value.data.summary.products.map((item: any) => ({
                    id: item.id,
                    name: item.name ?? '-',
                    image: item.image ?? null,
                    productValue: Number(item.productValue ?? 0),
                    rentalPrice: Number(item.rentalPrice ?? 0),
                    status: item.status,
                    qrCode: item.qrCode,
                  }))
                : [],
            }
          : null,
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
    const fallbackProductValue = sumLeadProductValue(lead.items);
    const fallbackDepositSelection = resolveLeadDepositSelection(
      fallbackProductValue,
      paymentSummary?.selectedDepositRate ?? 50,
      paymentSummary?.customDepositAmount ?? paymentSummary?.securityDepositRequiredByRate ?? lead.depositAmountRequired,
    );
    setSelectDraft({
      productId: lead.productId ?? lead.items[0]?.productId ?? '',
      productIds: lead.items.length
        ? lead.items.map((item) => item.productId).filter(Boolean)
        : (lead.productId ? [lead.productId] : []),
      pickupDate: toDateTimeLocal(lead.pickupDate),
      returnDate: toDateTimeLocal(lead.returnDate),
      appointmentIntent: lead.appointmentIntent.toUpperCase(),
      quotedPrice: lead.quotedPrice || null,
      notes: lead.notes ?? '',
    });
    setReceiveDraft({
      amount:
        paymentSummary?.securityDepositRemainingForSelectedRate != null
          ? paymentSummary.securityDepositRemainingForSelectedRate
          : lead.depositAmountRequired > 0
            ? lead.depositAmountRequired
            : lead.depositAmountPaid > 0
              ? lead.depositAmountPaid
              : (fallbackDepositSelection.customDepositAmount ?? null),
      paymentMethod: 'CASH',
      description: lead.items.length ? lead.items.map((item) => item.productName).join(', ') : (lead.productName ? `${lead.productName}` : ''),
      depositRate: paymentSummary?.selectedDepositRate ?? 50,
    });
    setEditDraft({
      notes: lead.notes ?? '',
      quotedPrice: lead.quotedPrice || null,
    });
    setAssignDraft(lead.ownerId ?? '');
  }, [lead, paymentSummary]);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectDraft.productIds.includes(product.id)),
    [products, selectDraft.productIds],
  );
  const selectedProductsProductValue = useMemo(
    () => selectedProducts.reduce((sum, product) => sum + Math.max(Number(product.productValue ?? product.price ?? 0), 0), 0),
    [selectedProducts],
  );
  const selectedProductsRentalTotal = useMemo(
    () => selectedProducts.reduce((sum, product) => sum + Math.max(Number(product.rentalPrice ?? product.price ?? 0), 0), 0),
    [selectedProducts],
  );
  const leadProductValue = useMemo(
    () => {
      if (paymentSummary) return Math.max(Number(paymentSummary.productValue || 0), 0);
      if (lead?.items.length) return sumLeadProductValue(lead.items);
      return selectedProductsProductValue;
    },
    [lead, paymentSummary?.productValue, selectedProductsProductValue],
  );
  const draftHasRentalContext = Boolean(selectDraft.productIds.length && selectDraft.pickupDate && selectDraft.returnDate);
  const selectedProductsDepositPolicy = useMemo(
    () => leadDepositChoices(selectedProductsProductValue),
    [selectedProductsProductValue],
  );
  const currentLeadDepositPolicy = useMemo(
    () => leadDepositChoices(leadProductValue),
    [leadProductValue],
  );
  const draftDepositPreviewAmount = useMemo(
    () => {
      if (selectedProductsProductValue <= 0) return 0;
      return resolveLeadDepositSelection(
        selectedProductsProductValue,
        receiveDraft.depositRate,
        receiveDraft.amount ?? selectedProductsDepositPolicy.defaultAmount,
      ).customDepositAmount ?? 0;
    },
    [receiveDraft.amount, receiveDraft.depositRate, selectedProductsDepositPolicy.defaultAmount, selectedProductsProductValue],
  );
  const showDraftDepositPreview = Boolean(
    lead
    && canEditProduct(lead)
    && selectedProductsProductValue > 0,
  );

  useEffect(() => {
    if (!lead || !canEditProduct(lead)) return;
    setReceiveDraft((current) => ({
      ...current,
      amount: selectedProductsProductValue > 0 ? draftDepositPreviewAmount : null,
    }));
  }, [draftDepositPreviewAmount, lead, selectedProductsProductValue]);

  const selectProductValidationMessage = !selectDraft.productIds.length
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
      { time: formatDateTime(lead.createdAt), title: t('leadOps.timeline.created'), detail: translateLeadSource(lead.source, t), tone: 'neutral' as Tone },
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
          productId: selectDraft.productIds[0],
          productIds: selectDraft.productIds,
          pickupDate: toIsoOrUndefined(selectDraft.pickupDate),
          returnDate: toIsoOrUndefined(selectDraft.returnDate),
          appointmentIntent: selectDraft.appointmentIntent,
          quotedPrice: selectDraft.quotedPrice ?? undefined,
          notes: selectDraft.notes || undefined,
        });
      },
      t('lead.feedback.productSelected'),
    );
  };

  const requestDeposit = async () => {
    if (!lead) return;
    const depositSelection = resolveLeadDepositSelection(
      leadProductValue,
      receiveDraft.depositRate,
      receiveDraft.amount,
    );
    await runAction(
      `request-deposit-${lead.id}`,
      async () => {
        await leadsApi.requestDeposit(lead.id, {
          quotedPrice: lead.quotedPrice || undefined,
          depositAmount: (receiveDraft.amount ?? lead.depositAmountRequired) || undefined,
          depositRate: receiveDraft.depositRate,
          depositType: depositSelection.depositType,
          customDepositAmount: depositSelection.customDepositAmount,
        });
      },
      t('lead.feedback.depositRequested'),
    );
  };

  const receiveDeposit = async () => {
    if (!lead) return;
    const depositSelection = resolveLeadDepositSelection(
      leadProductValue,
      receiveDraft.depositRate,
      receiveDraft.amount,
    );
    await runAction(
      `receive-deposit-${lead.id}`,
      async () => {
        await leadsApi.receiveDeposit(lead.id, {
          amount: Number(receiveDraft.amount),
          paymentMethod: receiveDraft.paymentMethod,
          description: receiveDraft.description || undefined,
          depositRate: receiveDraft.depositRate,
          depositType: depositSelection.depositType,
          customDepositAmount: depositSelection.customDepositAmount,
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

  const refundDeposit = async () => {
    if (!lead) return;
    await runAction(
      `refund-deposit-${lead.id}`,
      async () => {
        await leadsApi.refundDeposit(lead.id);
      },
      t('lead.feedback.depositRefunded'),
    );
  };

  const retryAppointment = async () => {
    if (!lead) return;
    await runAction(
      `retry-appointment-${lead.id}`,
      async () => {
        await leadsApi.retryAppointment(lead.id);
      },
      t('lead.feedback.appointmentCreated'),
    );
  };

  const retryBooking = async () => {
    if (!lead) return;
    await runAction(
      `retry-booking-${lead.id}`,
      async () => {
        await leadsApi.retryBooking(lead.id);
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
          quotedPrice: editDraft.quotedPrice ?? undefined,
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
    ? lead.items.length
      ? `${lead.items.length} sản phẩm`
      : `${lead.productName ?? '-'}`
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

  const depositDeadlineSource = paymentSummary?.depositDeadline ?? lead.depositDeadlineAt;
  const depositDeadlineLabel = depositDeadlineSource ? formatDateTime(depositDeadlineSource) : t('leadOps.notSet');
  const depositWindow = minutesUntil(depositDeadlineSource ?? undefined);
  const depositDeadlineState =
    depositWindow === null ? t('leadOps.notSet') : depositWindow < 0 ? t('lead.deposit.expired') : depositDeadlineLabel;
  const productValue = showDraftDepositPreview ? selectedProductsProductValue : leadProductValue;
  const rentalValue = showDraftDepositPreview
    ? selectedProductsRentalTotal
    : paymentSummary?.rentalTotal ?? (lead.items.length
      ? lead.items.reduce((sum, item) => sum + Math.max(Number(item.rentalPrice || 0), 0), 0)
      : selectedProductsRentalTotal);
  const effectiveDepositAmount = showDraftDepositPreview
    ? draftDepositPreviewAmount
    : paymentSummary?.customDepositAmount ?? paymentSummary?.securityDepositRequiredByRate ?? lead.depositAmountRequired;
  const effectiveDepositPolicy = showDraftDepositPreview ? selectedProductsDepositPolicy : currentLeadDepositPolicy;
  const selectedDepositOption = effectiveDepositPolicy.options.find((option) => option.amount === effectiveDepositAmount) ?? effectiveDepositPolicy.options[0];
  const depositRequestedAmount = showDraftDepositPreview ? draftDepositPreviewAmount : paymentSummary?.securityDepositRequiredByRate ?? lead.depositAmountRequired;
  const depositPaidAmount = showDraftDepositPreview ? 0 : paymentSummary?.securityDepositPaid ?? lead.depositAmountPaid;
  const depositRemainingForSelectedRate = showDraftDepositPreview
    ? Math.max(draftDepositPreviewAmount - depositPaidAmount, 0)
    : paymentSummary?.securityDepositRemainingForSelectedRate ?? Math.max(depositRequestedAmount - depositPaidAmount, 0);
  const depositRemainingForFull = showDraftDepositPreview
    ? Math.max(selectedProductsProductValue - depositPaidAmount, 0)
    : paymentSummary?.securityDepositRemainingForFull ?? Math.max(productValue - depositPaidAmount, 0);
  const canRefundLeadDeposit = Boolean(paymentSummary?.canRefundDeposit && !hasBooking(lead));
  const canRequestDepositNow = canRequestDeposit(lead, userRole);
  const canReceiveDepositNow = canReceiveDeposit(lead, userRole);
  const productCompletion = hasProductSelection(lead);
  const depositCompletion = hasRequestedDeposit(lead);
  const depositReceived = hasReceivedDeposit(lead);
  const appointmentCompletion = hasAppointment(lead);
  const bookingCompletion = hasBooking(lead);
  const reserveFailed = lead.workflowBlockCode === 'reserve_failed';
  const appointmentFailed = lead.workflowBlockCode === 'appointment_failed';
  const bookingFailed = lead.workflowBlockCode === 'booking_failed';
  const bookingReservationBlocked = lead.status === 'appointment_completed' && !hasReservedProducts(lead) && !bookingCompletion && !bookingFailed;
  const bookingStepTitle = lead.bookingId
    ? lead.bookingId
    : canCreateBookingOverride(lead)
      ? t('lead.booking.ready')
      : bookingReservationBlocked
        ? t('lead.booking.reserveRequired')
        : t('lead.empty.booking');
  const bookingStepDetail = lead.bookingStatus
    ? t(`booking.status.${lead.bookingStatus}`)
    : bookingReservationBlocked
      ? t('lead.booking.reserveRequiredHelper')
      : lead.appointmentStatus === 'completed'
        ? t('lead.booking.ready')
        : t('lead.appointment.waiting_completion');
  const bookingStepHelper = hasBooking(lead)
    ? t('lead.booking.locked')
    : bookingReservationBlocked
      ? t('lead.booking.reserveRequiredHelper')
      : t('leadFlow.stepDesc.booking');
  const bookingSectionDescription = hasBooking(lead)
    ? t('lead.booking.locked')
    : bookingReservationBlocked
      ? t('lead.booking.reserveRequiredHelper')
      : t('lead.appointment.waiting_completion');
  const nextStepLabel = t(nextStepKey(lead));
  const sourceLabel = translateLeadSource(lead.source, t);
  const workflowItems = [
    {
      step: t('leadFlow.steps.product'),
      title: productCompletion ? productDetail : t('lead.no_product.title'),
      detail: productStepDetail,
      helper: !productCompletion ? t('lead.manual.description') : t('leadFlow.stepDesc.product'),
      tone: productCompletion ? 'success' as Tone : canEditProduct(lead) ? 'warning' as Tone : 'neutral' as Tone,
      statusLabel: productCompletion ? t('lead.flow.complete') : canEditProduct(lead) ? t('lead.flow.pending') : t('lead.flow.blocked'),
      state: productCompletion ? 'completed' as const : canEditProduct(lead) ? 'current' as const : 'locked' as const,
    },
    {
      step: t('leadFlow.steps.requestDeposit'),
      title: depositCompletion ? t(`lead.status.${lead.status}`) : t('lead.deposit.missing'),
      detail: depositCompletion ? depositDeadlineLabel : t('lead.deposit.reserve_pending'),
      helper: requestDepositHelper,
      tone: lead.status === 'deposit_expired' ? 'danger' as Tone : depositCompletion ? 'success' as Tone : productCompletion ? 'warning' as Tone : 'neutral' as Tone,
      statusLabel: depositCompletion ? t('lead.flow.complete') : canRequestDeposit(lead, userRole) ? t('lead.flow.pending') : t('lead.flow.blocked'),
      state: depositCompletion ? 'completed' as const : canRequestDeposit(lead, userRole) ? 'current' as const : 'locked' as const,
    },
    {
      step: t('leadFlow.steps.receiveDeposit'),
      title: depositReceived ? t('lead.deposit.reserved') : t('lead.actions.confirm_deposit'),
      detail: depositReceived ? currency.format(depositPaidAmount || 0) : t('lead.deposit.reserve_pending'),
      helper: depositReceived ? t('lead.appointment.auto_created') : t('leadFlow.helper.autoReserve'),
      tone: reserveFailed ? 'warning' as Tone : depositReceived ? 'success' as Tone : canReceiveDeposit(lead, userRole) ? 'info' as Tone : 'neutral' as Tone,
      statusLabel: depositReceived ? t('lead.flow.complete') : canReceiveDeposit(lead, userRole) ? t('lead.flow.pending') : t('lead.flow.blocked'),
      state: depositReceived ? 'completed' as const : canReceiveDeposit(lead, userRole) ? 'current' as const : 'locked' as const,
    },
    {
      step: t('leadFlow.steps.appointment'),
      title: lead.appointmentId ? (lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.actions.open_appointment')) : t('lead.empty.appointment'),
      detail: lead.appointmentTime ? formatDateTime(lead.appointmentTime) : hasReceivedDeposit(lead) ? t('lead.appointment.missing_after_deposit') : t('lead.appointment.waiting_completion'),
      helper: lead.appointmentId ? t('leadFlow.next.completeAppointment') : t('leadFlow.helper.autoAppointment'),
      tone: lead.appointmentId ? 'success' as Tone : appointmentIsRecoverable(lead) || appointmentFailed || canCompleteAppointment(lead) ? 'warning' as Tone : 'neutral' as Tone,
      statusLabel: lead.appointmentId ? t('lead.flow.complete') : appointmentIsRecoverable(lead) || appointmentFailed || canCompleteAppointment(lead) ? t('lead.flow.pending') : t('lead.flow.blocked'),
      state: lead.appointmentId ? 'completed' as const : appointmentIsRecoverable(lead) || appointmentFailed || canCompleteAppointment(lead) ? 'current' as const : 'locked' as const,
    },
    {
      step: t('leadFlow.steps.booking'),
      title: bookingStepTitle,
      detail: bookingStepDetail,
      helper: bookingStepHelper,
      tone: bookingCompletion ? 'success' as Tone : (bookingFailed && canCreateBookingOverride(lead)) || (lead.status === 'appointment_completed' && !hasBooking(lead) && !bookingReservationBlocked) ? 'info' as Tone : bookingReservationBlocked ? 'warning' as Tone : 'neutral' as Tone,
      statusLabel: bookingCompletion ? t('lead.flow.complete') : canCreateBookingOverride(lead) || (lead.status === 'appointment_completed' && !hasBooking(lead) && !bookingReservationBlocked) ? t('lead.flow.pending') : t('lead.flow.blocked'),
      state: bookingCompletion ? 'completed' as const : canCreateBookingOverride(lead) || (lead.status === 'appointment_completed' && !hasBooking(lead) && !bookingReservationBlocked) ? 'current' as const : 'locked' as const,
    },
  ];
  const currentActionConfig = lead.bookingId
    ? {
        title: t('lead.actions.open_booking'),
        description: bookingStepHelper,
        primaryAction: <Link className="button-primary" href={`/admin/bookings/${lead.bookingId}`}>{t('lead.actions.open_booking')}</Link>,
      }
    : canCreateBookingOverride(lead)
      ? {
          title: t('lead.actions.retry_booking'),
          description: t('lead.booking.creationFailed'),
          primaryAction: <AdminButton onClick={retryBooking} loading={busyAction === `retry-booking-${lead.id}`}>{t('lead.actions.retry_booking')}</AdminButton>,
        }
      : lead.status === 'appointment_completed' && !hasBooking(lead) && !bookingReservationBlocked && !bookingFailed
        ? {
            title: t('leadFlow.steps.booking'),
            description: t('leadFlow.stepDesc.booking'),
            primaryAction: <AdminButton onClick={createBooking} loading={busyAction === `create-booking-${lead.id}`}>{t('lead.actions.open_booking')}</AdminButton>,
          }
        : canCompleteAppointment(lead)
          ? {
              title: t('lead.actions.complete_appointment'),
              description: t('leadFlow.next.completeAppointment'),
              primaryAction: <AdminButton onClick={completeAppointment} loading={busyAction === `complete-appointment-${lead.appointmentId}`}>{t('lead.actions.complete_appointment')}</AdminButton>,
            }
          : appointmentFailed
            ? {
                title: t('lead.actions.retry_appointment'),
                description: t('lead.deposit.appointment_failed'),
                primaryAction: <AdminButton onClick={retryAppointment} loading={busyAction === `retry-appointment-${lead.id}`}>{t('lead.actions.retry_appointment')}</AdminButton>,
              }
            : appointmentIsRecoverable(lead)
              ? {
                  title: t('lead.actions.recreate_appointment'),
                  description: t('lead.appointment.missing_after_deposit'),
                  primaryAction: <AdminButton onClick={recreateAppointment} loading={busyAction === `create-appointment-${lead.id}`}>{t('lead.actions.recreate_appointment')}</AdminButton>,
                }
              : canRequestDepositNow
                ? {
                    title: t('lead.actions.request_deposit'),
                    description: requestDepositHelper,
                    primaryAction: <AdminButton onClick={requestDeposit} loading={busyAction === `request-deposit-${lead.id}`} disabled={!canRequestDepositNow}>{t('lead.actions.request_deposit')}</AdminButton>,
                  }
                : canReceiveDepositNow
                  ? {
                      title: t('lead.actions.confirm_deposit'),
                      description: t('leadOps.ui.cashierIntake'),
                      primaryAction: <AdminButton onClick={() => setReceiveOpen(true)}>{t('lead.actions.confirm_deposit')}</AdminButton>,
                    }
                  : {
                      title: t('leadFlow.actions.saveProduct'),
                      description: t('leadFlow.stepDesc.product'),
                      primaryAction: (
                        <AdminButton
                          onClick={selectProduct}
                          loading={busyAction === `select-product-${lead.id}`}
                          disabled={!canEditProduct(lead) || Boolean(selectProductValidationMessage)}
                        >
                          {t('leadFlow.actions.saveProduct')}
                        </AdminButton>
                      ),
                    };
  const renderDepositActionButtons = () => {
    if (!canRequestDepositNow && !canReceiveDepositNow && !canRefundLeadDeposit) return null;
    return (
      <>
        {canRequestDepositNow ? (
          <AdminButton onClick={requestDeposit} loading={busyAction === `request-deposit-${lead.id}`} disabled={!canRequestDepositNow}>
            {t('lead.actions.request_deposit')}
          </AdminButton>
        ) : null}
        {canReceiveDepositNow ? (
          <AdminButton variant="secondary" onClick={() => setReceiveOpen(true)}>
            {t('lead.actions.confirm_deposit')}
          </AdminButton>
        ) : null}
        {canRefundLeadDeposit ? (
          <AdminButton variant="secondary" onClick={refundDeposit} loading={busyAction === `refund-deposit-${lead.id}`}>
            {t('lead.actions.refund_deposit')}
          </AdminButton>
        ) : null}
      </>
    );
  };
  const hasDepositActionButtons = canRequestDepositNow || canReceiveDepositNow || canRefundLeadDeposit;
  const riskAlerts = [
    reserveFailed ? t('lead.deposit.reserve_failed') : null,
    appointmentFailed ? t('lead.deposit.appointment_failed') : null,
    bookingFailed ? t('lead.booking.creationFailed') : null,
    bookingReservationBlocked ? t('lead.booking.reserveRequiredHelper') : null,
    lead.status === 'deposit_expired' ? t('lead.deposit.expired') : null,
    lead.workflowBlockMessage ?? null,
  ].filter(Boolean) as string[];
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
      {lead.workflowBlockMessage ? <div className="mt-4"><InlineAlert tone="warning">{lead.workflowBlockMessage}</InlineAlert></div> : null}

      <div className="mt-6 space-y-6">
        <CompactLeadSummary
          lead={lead}
          eyebrow={t('lead.title')}
          nextStep={nextStepLabel}
          sourceLabel={sourceLabel}
          nextStepLabel={t('leadOps.ui.nextBestAction')}
          sourceFieldLabel={t('lead.source')}
          ownerLabel={t('leadOps.ui.owner')}
          ownerHelper={t('leadOps.ui.ownerHelper')}
          rentalWindowFieldLabel={t('leadOps.ui.rentalWindow')}
          rentalWindowHelper={productStepDetail}
          appointmentIntentLabel={t('leadFlow.summary.appointmentType')}
          appointmentIntentValue={t(`leadFlow.intent.${lead.appointmentIntent}`)}
          statusBadge={<StatusBadge value={lead.status} tone={statusTone(lead)} />}
          manualBadge={isManualLead(lead) ? <AdminBadge tone="warning">{t('lead.manual.badge')}</AdminBadge> : undefined}
        />

        <WorkflowRail eyebrow={t('leadFlow.panel.title')} description={t('leadFlow.panel.description')} items={workflowItems} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="grid gap-6">
            <CurrentActionPanel
              eyebrow={t('leadOps.ui.nextBestAction')}
              title={currentActionConfig.title}
              description={currentActionConfig.description}
              primaryAction={currentActionConfig.primaryAction}
              supportActions={(
                <>
                  {renderDepositActionButtons()}
                  <AdminButton variant="secondary" onClick={callCustomer} loading={busyAction === `contact-${lead.id}`}>
                    {t('lead.actions.call_customer')}
                  </AdminButton>
                  <AdminButton variant="secondary" onClick={sendZalo} loading={busyAction === `zalo-${lead.id}`}>
                    {t('lead.actions.send_zalo')}
                  </AdminButton>
                </>
              )}
            />

            <FormBlock
              title={t('lead.panels.productRequest')}
              description={isManualLead(lead) ? t('lead.manual.description') : t('leadFlow.stepDesc.product')}
              rightSlot={!canEditProduct(lead) ? <AdminBadge tone="neutral">{t('leadOps.ui.locked')}</AdminBadge> : undefined}
            >
              <ProductCardSelect
                products={products}
                description={t('leadFlow.helper.productOnlySelection')}
                selectedProductId={selectDraft.productId}
                onSelectProduct={(productId) =>
                  setSelectDraft((current) => ({
                    ...current,
                    productId,
                    productIds: current.productIds.includes(productId)
                      ? current.productIds
                      : [...current.productIds, productId],
                  }))
                }
                disabled={!canEditProduct(lead)}
              />

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('lead.products.title')}</p>
                  <AdminBadge tone="info">{selectedProducts.length}</AdminBadge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedProducts.length ? selectedProducts.map((product) => (
                    <div key={product.id} className="rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
                          <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                            {currency.format(product.productValue ?? product.price ?? 0)} / {currency.format(product.rentalPrice ?? product.price ?? 0)}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-[rgb(var(--text-muted))]">{product.qrCode ?? product.id}</p>
                        </div>
                        {canEditProduct(lead) ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[rgb(var(--danger))]"
                            onClick={() => setSelectDraft((current) => ({
                              ...current,
                              productIds: current.productIds.filter((id) => id !== product.id),
                              productId: current.productId === product.id ? current.productIds.filter((id) => id !== product.id)[0] ?? '' : current.productId,
                            }))}
                          >
                            {t('common.remove')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/55 px-4 py-5 text-sm text-[rgb(var(--text-secondary))]">
                      {t('leadFlow.validation.productRequired')}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('leadFlow.form.pickupDate')}
                  <AdminInput
                    type="datetime-local"
                    value={selectDraft.pickupDate}
                    onChange={(event) => setSelectDraft((current) => ({ ...current, pickupDate: event.target.value }))}
                    disabled={!canEditProduct(lead)}
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('leadFlow.form.returnDate')}
                  <AdminInput
                    type="datetime-local"
                    value={selectDraft.returnDate}
                    onChange={(event) => setSelectDraft((current) => ({ ...current, returnDate: event.target.value }))}
                    disabled={!canEditProduct(lead)}
                  />
                </label>
              </div>

              {selectDraft.pickupDate && selectDraft.returnDate ? (
                <div className="rounded-[24px] border border-[rgb(var(--accent-solid))]/18 bg-[rgb(var(--accent-solid))]/7 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('leadOps.ui.rentalWindow')}: {formatDateTime(selectDraft.pickupDate)} - {formatDateTime(selectDraft.returnDate)}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('leadFlow.form.appointmentIntent')}
                  <AdminSelect
                    value={selectDraft.appointmentIntent}
                    onChange={(event) => setSelectDraft((current) => ({ ...current, appointmentIntent: event.target.value }))}
                    disabled={!canEditProduct(lead)}
                  >
                    <option value="FITTING">{t('leadFlow.intent.fitting')}</option>
                    <option value="PICKUP">{t('leadFlow.intent.pickup')}</option>
                    <option value="DELIVERY">{t('leadFlow.intent.delivery')}</option>
                  </AdminSelect>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('lead.budget')}
                  <MoneyInput
                    value={selectDraft.quotedPrice}
                    onValueChange={(value) => setSelectDraft((current) => ({ ...current, quotedPrice: value }))}
                    disabled={!canEditProduct(lead)}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                {t('lead.notes')}
                <textarea
                  className="field h-28 py-3"
                  value={canEditProduct(lead) ? selectDraft.notes : lead.notes}
                  onChange={(event) => setSelectDraft((current) => ({ ...current, notes: event.target.value }))}
                  disabled={!canEditProduct(lead)}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <DetailField label={t('lead.products.total_value')} value={currency.format(selectedProductsProductValue)} helper={t('leadOps.deposit.productValueHelper')} />
                <DetailField label={t('lead.products.total_rental')} value={currency.format(selectedProductsRentalTotal)} helper={t('leadOps.deposit.rentalValueHelper')} />
                <DetailField
                  label={t('leadOps.deposit.policyTitle')}
                  value={selectedDepositOption ? t(selectedDepositOption.labelKey) : t(effectiveDepositPolicy.policyLabelKey)}
                  helper={t(effectiveDepositPolicy.policyHelperKey)}
                />
              </div>

              {selectProductValidationMessage ? <InlineAlert tone="warning">{selectProductValidationMessage}</InlineAlert> : null}

              {canEditProduct(lead) ? (
                <div className="flex justify-end">
                  <AdminButton onClick={selectProduct} loading={busyAction === `select-product-${lead.id}`} disabled={Boolean(selectProductValidationMessage)}>
                    {t('leadFlow.actions.saveProduct')}
                  </AdminButton>
                </div>
              ) : null}
            </FormBlock>

            <FormBlock title={t('lead.panels.deposit')} description={t('leadOps.deposit.rule')}>
              <div className="flex flex-wrap gap-2">
                {effectiveDepositPolicy.options.map((option) => {
                  const activeOption = (receiveDraft.amount ?? effectiveDepositPolicy.defaultAmount) === option.amount;
                  return (
                    <button
                      key={`lead-deposit-option-${option.key}`}
                      type="button"
                      onClick={() => setReceiveDraft((current) => ({ ...current, amount: option.amount }))}
                      className={cn(
                        'rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
                        activeOption
                          ? 'bg-[rgb(var(--accent-strong))] text-[rgb(var(--button-primary-text))] shadow-[0_14px_28px_rgba(15,23,42,0.14)]'
                          : 'border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] text-[rgb(var(--text-secondary))] hover:-translate-y-0.5 hover:border-[rgb(var(--accent-strong))]/28 hover:text-[rgb(var(--text-primary))]',
                      )}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>

              <InlineAlert tone="info">{t(effectiveDepositPolicy.policyHelperKey)}</InlineAlert>

              <div className="grid gap-4 md:grid-cols-3">
                <DetailField label={t('lead.deposit.deadline')} value={depositDeadlineState} helper={requestDepositHelper} />
                <DetailField label={t('leadFlow.summary.holdStatus')} value={t(`leadFlow.hold.${lead.productHoldStatus}`)} helper={t('leadFlow.summary.holdStatus')} />
                <DetailField
                  label={t('payment.deposit.required')}
                  value={currency.format(depositRequestedAmount || 0)}
                  helper={showDraftDepositPreview ? t('leadOps.deposit.previewMetricHelper') : t('lead.deposit.required')}
                />
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                {t('lead.deposit.custom_amount')}
                <MoneyInput
                  value={receiveDraft.amount}
                  onValueChange={(value) => setReceiveDraft((current) => ({ ...current, amount: value }))}
                  disabled={!canRequestDeposit(lead, userRole) && !canReceiveDeposit(lead, userRole)}
                />
              </label>

              {showDraftDepositPreview ? (
                <InlineAlert tone="info">
                  {draftHasRentalContext
                    ? t('leadOps.deposit.previewActive', {
                        policy: t(selectedProductsDepositPolicy.policyLabelKey),
                        productValue: currency.format(selectedProductsProductValue),
                        amount: currency.format(draftDepositPreviewAmount),
                      })
                    : t('leadOps.deposit.previewPending', {
                        amount: currency.format(draftDepositPreviewAmount),
                      })}
                </InlineAlert>
              ) : null}

              {lead.status === 'deposit_expired' ? <InlineAlert tone="warning">{t('lead.deposit.expired')}</InlineAlert> : null}
              {reserveFailed ? <InlineAlert tone="warning">{t('lead.deposit.reserve_failed')}</InlineAlert> : null}

              {hasDepositActionButtons ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {renderDepositActionButtons()}
                </div>
              ) : null}
            </FormBlock>

            <FormBlock title={t('lead.panels.appointment')} description={lead.appointmentId ? t('lead.appointment.auto_created') : t('lead.appointment.waiting_completion')}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label={t('leadFlow.summary.appointmentType')} value={t(`leadFlow.intent.${lead.appointmentIntent}`)} />
                    <DetailField label={t('leadFlow.summary.appointmentStatus')} value={lead.appointmentStatus ? t(`appointment.status.${lead.appointmentStatus}`) : t('lead.empty.appointment')} />
                    <DetailField label={t('leadFlow.summary.appointmentTime')} value={lead.appointmentTime ? formatDateTime(lead.appointmentTime) : '-'} />
                    <DetailField label={t('lead.flow.booking')} value={lead.bookingId ?? t('lead.empty.booking')} helper={t('leadFlow.helper.bookingAnchor')} />
                  </div>

                  {appointmentIsRecoverable(lead) || appointmentFailed ? (
                    <InlineAlert tone="warning">
                      {appointmentFailed ? t('lead.deposit.appointment_failed') : t('lead.appointment.missing_after_deposit')}
                    </InlineAlert>
                  ) : null}
                  {bookingFailed ? <InlineAlert tone="warning">{t('lead.booking.creationFailed')}</InlineAlert> : null}
                  {bookingReservationBlocked ? <InlineAlert tone="warning">{t('lead.booking.reserveRequiredHelper')}</InlineAlert> : null}
                </div>

                <div className="grid gap-3 self-start">
                  <Link className="button-secondary text-center" href="/admin/appointments">
                    {t('lead.actions.open_appointment')}
                  </Link>

                  {appointmentIsRecoverable(lead) ? (
                    <AdminButton onClick={recreateAppointment} loading={busyAction === `create-appointment-${lead.id}`}>
                      {t('lead.actions.recreate_appointment')}
                    </AdminButton>
                  ) : appointmentFailed ? (
                    <AdminButton onClick={retryAppointment} loading={busyAction === `retry-appointment-${lead.id}`}>
                      {t('lead.actions.retry_appointment')}
                    </AdminButton>
                  ) : canCompleteAppointment(lead) ? (
                    <AdminButton onClick={completeAppointment} loading={busyAction === `complete-appointment-${lead.appointmentId}`}>
                      {t('lead.actions.complete_appointment')}
                    </AdminButton>
                  ) : null}

                  {lead.bookingId ? (
                    <Link className="button-primary text-center" href={`/admin/bookings/${lead.bookingId}`}>
                      {t('lead.actions.open_booking')}
                    </Link>
                  ) : canCreateBookingOverride(lead) ? (
                    <AdminButton onClick={retryBooking} loading={busyAction === `retry-booking-${lead.id}`}>
                      {t('lead.actions.retry_booking')}
                    </AdminButton>
                  ) : lead.status === 'appointment_completed' && !hasBooking(lead) && !bookingReservationBlocked && !bookingFailed ? (
                    <AdminButton onClick={createBooking} loading={busyAction === `create-booking-${lead.id}`}>
                      {t('leadFlow.steps.booking')}
                    </AdminButton>
                  ) : null}
                </div>
              </div>
            </FormBlock>

            <SectionCard title={t('lead.notes')} description={lead.notes ? t('leadOps.ui.noteSnapshot') : t('leadOps.detail.noNotes')}>
              <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 p-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                {lead.notes || t('leadOps.detail.noNotes')}
              </div>
            </SectionCard>

            <SectionCard title={t('lead.panels.activity')} description={t('leadOps.detail.timelineDesc')}>
              <TimelineList
                items={
                  timelineItems.length
                    ? timelineItems
                    : [
                        {
                          time: formatDateTime(lead.createdAt),
                          title: t('leadOps.timeline.created'),
                          detail: translateLeadSource(lead.source, t),
                        },
                      ]
                }
              />
            </SectionCard>
          </main>

          <aside className="grid gap-4 self-start xl:sticky xl:top-6">
            <SectionCard title={t('payment.summary.title')} description={t('leadOps.detail.description')} className="shadow-none">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile label={t('lead.products.total_value')} value={currency.format(productValue)} helper={productDetail} />
                <MetricTile label={t('lead.products.total_rental')} value={currency.format(rentalValue)} helper={t('leadOps.deposit.rentalValueHelper')} tone="accent" />
                <MetricTile label={t('payment.deposit.required')} value={currency.format(depositRequestedAmount || 0)} helper={t('lead.deposit.required')} tone="warning" />
                <MetricTile label={t('payment.deposit.paid')} value={currency.format(depositPaidAmount || 0)} helper={t('lead.deposit.paid')} tone={depositReceived ? 'success' : 'neutral'} />
                <MetricTile label={t('lead.deposit.remaining')} value={currency.format(depositRemainingForSelectedRate || 0)} helper={selectedDepositOption ? t(selectedDepositOption.helperKey) : t('leadOps.ui.depositRequiredHelper')} tone={depositRemainingForSelectedRate > 0 ? 'warning' : 'success'} />
                <MetricTile label={t('lead.deposit.remaining')} value={currency.format(depositRemainingForFull || 0)} helper={t('leadOps.deposit.productValueHelper')} tone={depositRemainingForFull > 0 ? 'neutral' : 'success'} />
              </div>
            </SectionCard>

            <SectionCard title={t('lead.title')} description={t('lead.subtitle')} className="shadow-none">
              <div className="grid gap-3">
                <DetailField label={t('lead.phone')} value={lead.phone} />
                <DetailField label={t('lead.email')} value={lead.email} />
                <DetailField label={t('lead.source')} value={sourceLabel} />
                <DetailField label={t('leadOps.ui.owner')} value={lead.ownerName} helper={t('leadOps.ui.ownerHelper')} />
                <DetailField label={t('leadOps.ui.rentalWindow')} value={lead.pickupDate && lead.returnDate ? `${formatDate(lead.pickupDate)} - ${formatDate(lead.returnDate)}` : '-'} />
                <DetailField label={t('leadFlow.summary.appointmentType')} value={t(`leadFlow.intent.${lead.appointmentIntent}`)} />
              </div>
            </SectionCard>

            <SectionCard title={t('leadOps.ui.dangerZone')} description={t('leadOps.detail.description')} className="shadow-none">
              <div className="grid gap-3">
                {riskAlerts.length ? riskAlerts.map((message, index) => (
                  <InlineAlert key={`lead-risk-${index}`} tone="warning">{message}</InlineAlert>
                )) : (
                  <div className="rounded-[24px] border border-[rgb(var(--success))]/18 bg-[rgb(var(--success))]/7 px-4 py-4 text-sm text-[rgb(var(--text-secondary))]">
                    {t('lead.booking.locked')}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t('leadOps.ui.secondaryActions')} description={nextStepLabel} className="shadow-none">
              <div className="grid gap-2">
                <AdminButton variant="secondary" className="w-full" onClick={callCustomer} loading={busyAction === `contact-${lead.id}`}>
                  {t('lead.actions.call_customer')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={sendZalo} loading={busyAction === `zalo-${lead.id}`}>
                  {t('lead.actions.send_zalo')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => setAssignOpen(true)}>
                  {t('lead.actions.assign_staff')}
                </AdminButton>
                <AdminButton variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
                  {t('lead.actions.edit_lead')}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  className="w-full"
                  onClick={() => setConfirmAction({ kind: 'cancel' })}
                  disabled={lead.status === 'cancelled' || hasBooking(lead)}
                >
                  {t('lead.actions.cancel_lead')}
                </AdminButton>
                <AdminButton variant="danger" className="w-full" onClick={() => setConfirmAction({ kind: 'archive' })}>
                  {t('lead.actions.archive_lead')}
                </AdminButton>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>

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
              disabled={receiveDraft.amount == null || Number(receiveDraft.amount) < 0}
            >
              {t('lead.actions.confirm_deposit')}
            </AdminButton>
          </>
        )}
      >
        <div className="grid gap-5">
          <FormBlock title={t('lead.panels.deposit')} description={t('leadOps.ui.cashierIntake')}>
            <div className="flex flex-wrap gap-2">
              {currentLeadDepositPolicy.options.map((option) => {
                const activeOption = (receiveDraft.amount ?? currentLeadDepositPolicy.defaultAmount) === option.amount;
                return (
                  <button
                    key={`receive-deposit-option-${option.key}`}
                    type="button"
                    onClick={() => {
                      setReceiveDraft((current) => ({
                        ...current,
                        amount: Math.max(option.amount - depositPaidAmount, 0),
                      }));
                    }}
                    className={cn(
                      'rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
                      activeOption
                        ? 'bg-[rgb(var(--accent-strong))] text-[rgb(var(--button-primary-text))] shadow-[0_14px_28px_rgba(15,23,42,0.14)]'
                        : 'border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] text-[rgb(var(--text-secondary))] hover:-translate-y-0.5 hover:border-[rgb(var(--accent-strong))]/28 hover:text-[rgb(var(--text-primary))]',
                    )}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
            <InlineAlert tone="info">{t(currentLeadDepositPolicy.policyHelperKey)}</InlineAlert>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('leadFlow.form.depositAmount')}
              <MoneyInput value={receiveDraft.amount} onValueChange={(value) => setReceiveDraft((current) => ({ ...current, amount: value }))} />
              <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{t('leadOps.deposit.documentNote')}</p>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('leadFlow.form.paymentMethod')}
              <AdminSelect value={receiveDraft.paymentMethod} onChange={(event) => setReceiveDraft((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`payment.method.${lower(method)}`)}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('leadFlow.form.paymentNote')}
              <AdminInput value={receiveDraft.description} onChange={(event) => setReceiveDraft((current) => ({ ...current, description: event.target.value }))} />
              <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{t('leadOps.deposit.noteHelper')}</p>
            </label>
          </FormBlock>
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
        <div className="grid gap-5">
          <FormBlock title={t('leadOps.ui.commercialEdit')} description={t('leadOps.ui.commercialEditDescription')}>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('lead.budget')}
              <MoneyInput value={editDraft.quotedPrice} onValueChange={(value) => setEditDraft((current) => ({ ...current, quotedPrice: value }))} />
              <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{t('leadOps.ui.commercialPriceHelper')}</p>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('lead.notes')}
              <textarea className="field h-32 py-3" value={editDraft.notes} onChange={(event) => setEditDraft((current) => ({ ...current, notes: event.target.value }))} />
              <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{t('leadOps.ui.commercialNoteHelper')}</p>
            </label>
          </FormBlock>
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

