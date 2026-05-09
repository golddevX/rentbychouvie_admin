'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import {
  BookingContextCard,
  FlowActions,
  MoneyDisplay,
  PaymentBreakdownCard,
  QueueList,
} from '@/components/admin/order-flow-ui';
import { MoneyInput } from '@/components/admin/lead-ui';
import {
  ActionMenu,
  FeedbackPopup,
  InlineAlert,
  PageHeader,
  PaginationControls,
  SectionCard,
  StatusBadge,
  SummaryRow,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

type PaymentMethodValue = 'cash' | 'bank_transfer' | 'ewallet';

type PaymentRow = {
  id: string;
  bookingId: string;
  type: string;
  status: string;
  method: string;
  amount: number;
  rentalAmount: number;
  securityDepositAmount: number;
  description?: string;
  createdAt?: string;
  paidAt?: string;
  staff?: string;
};

type DepositPolicySummary = {
  allowPartialDeposit: boolean;
  allowedDepositRates: number[];
  defaultDepositRate: number;
  allowCustomDepositAmount: boolean;
};

type BookingSummary = {
  bookingId: string;
  rentalId?: string | null;
  leadId?: string | null;
  appointmentId?: string | null;
  productValue: number;
  productValueTotal: number;
  selectedDepositType?: string;
  selectedDepositRate: number;
  customDepositAmount?: number | null;
  depositPolicy: DepositPolicySummary;
  depositRequired?: number;
  depositPaid?: number;
  depositRemaining?: number;
  securityDepositRequiredByRate: number;
  securityDepositFullAmount: number;
  securityDepositPaid: number;
  securityDepositRemainingForSelectedRate: number;
  securityDepositRemainingForFull: number;
  securityDepositRemainingForPickup: number;
  rentalTotal: number;
  rentalPaid: number;
  rentalRemaining: number;
  feesTotal: number;
  refundsTotal: number;
  refundableDepositAmount: number;
  amountDueNow: number;
  collectionStage?: string;
  canPickup: boolean;
  pickupBlockedReasons: string[];
  paymentStatus: string;
  returnSettlementDraftActive?: boolean;
  returnSettlementPreview?: {
    lateDays: number;
    lateFee: number;
    dirtyFee: number;
    damageFee: number;
    accessoryFee: number;
    otherFee: number;
    totalCharges: number;
    rentalRemaining: number;
    depositCreditRemaining: number;
    cashCollected: number;
    refundNow: number;
    amountDueFromCustomer: number;
    applyRentalToDeposit?: boolean;
    status?: string;
    hasDraft?: boolean;
    actualReturnDate?: string | null;
    notes?: string | null;
  };
  products?: Array<{
    id: string;
    productId?: string;
    inventoryItemId?: string | null;
    name: string;
    image?: string | null;
    qrCode?: string | null;
    serialNumber?: string | null;
    productValue: number;
    rentalPrice: number;
    status?: string;
  }>;
};

type BookingDeskRow = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  status: string;
  product: string;
  products: Array<{
    id: string;
    name: string;
    image?: string | null;
    qrCode?: string | null;
    serialNumber?: string | null;
    productValue: number;
    rentalPrice: number;
    status?: string;
  }>;
  pickupDate?: string;
  returnDate?: string;
  payments: PaymentRow[];
  summary: BookingSummary;
};

const METHOD_OPTIONS: PaymentMethodValue[] = ['cash', 'bank_transfer', 'ewallet'];

function lower(value?: string | null) {
  return String(value ?? '').toLowerCase();
}

function isPostPickupStatus(status?: string | null) {
  const value = lower(status);
  return value === 'picked_up' || value === 'return_pending' || value === 'returned' || value === 'settlement_pending' || value === 'completed';
}

function isReturnSettlementStatus(status?: string | null) {
  const value = lower(status);
  return value === 'return_pending' || value === 'returned' || value === 'settlement_pending' || value === 'completed';
}

function hasPendingReturnSettlement(summary?: BookingSummary | null) {
  return Boolean(summary?.returnSettlementDraftActive);
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function compactCode(value?: string | null, head = 8, tail = 6) {
  const text = String(value ?? '');
  if (!text) return '-';
  if (text.length <= head + tail + 1) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function paymentTone(type: string): Tone {
  if (type === 'refund') return 'danger';
  if (type === 'security_deposit') return 'info';
  if (type === 'rental_payment') return 'success';
  return 'accent';
}

function bookingTone(row: BookingDeskRow): Tone {
  if (row.status === 'cancelled') return 'danger';
  if (row.status === 'completed') return 'success';
  if (row.status === 'settlement_pending') return 'warning';
  if (row.summary.amountDueNow > 0) return 'warning';
  if (row.summary.canPickup) return 'success';
  return 'info';
}

function nextStepKey(row?: BookingDeskRow) {
  if (!row) return 'paymentOps.next.selectBooking';
  if (row.status === 'cancelled') return 'paymentOps.next.cancelled';
  if (hasPendingReturnSettlement(row.summary)) return 'return.actions.open_payment';
  if (row.summary.rentalRemaining > 0) return 'payment.actions.collect_rental';
  if (isReturnSettlementStatus(row.status) && row.summary.refundableDepositAmount > 0) return 'payment.actions.refund_deposit';
  if (row.summary.securityDepositRemainingForPickup > 0) return 'payment.actions.collect_deposit';
  if (row.summary.canPickup) return 'paymentOps.actions.open_pickup';
  return 'paymentOps.next.ready';
}

function backendMethod(method: PaymentMethodValue) {
  if (method === 'cash') return 'CASH';
  if (method === 'bank_transfer') return 'BANK_TRANSFER';
  return 'MOMO';
}

function paymentFromApi(row: any): PaymentRow {
  return {
    id: row.id,
    bookingId: row.bookingId ?? row.booking?.id ?? row.rental?.booking?.id ?? '-',
    type: lower(row.type),
    status: lower(row.status),
    method: lower(row.paymentMethod),
    amount: Number(row.amountPaid ?? row.amount ?? 0),
    rentalAmount: Number(row.rentalAmount ?? 0),
    securityDepositAmount: Number(row.securityDepositAmount ?? 0),
    description: row.description,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    staff: row.processedBy?.fullName,
  };
}

function summaryFromApi(row: any): BookingSummary {
  return {
    bookingId: row.bookingId,
    rentalId: row.rentalId,
    leadId: row.leadId,
    appointmentId: row.appointmentId,
    productValue: Number(row.productValue ?? row.productValueTotal ?? 0),
    productValueTotal: Number(row.productValueTotal ?? row.productValue ?? 0),
    selectedDepositType: String(row.selectedDepositType ?? 'percent'),
    selectedDepositRate: Number(row.selectedDepositRate ?? 50),
    customDepositAmount: row.customDepositAmount == null ? null : Number(row.customDepositAmount),
    depositPolicy: row.depositPolicy ?? {
      allowPartialDeposit: true,
      allowedDepositRates: [30, 50, 100],
      defaultDepositRate: 50,
      allowCustomDepositAmount: true,
    },
    depositRequired: row.depositRequired == null ? undefined : Number(row.depositRequired),
    depositPaid: row.depositPaid == null ? undefined : Number(row.depositPaid),
    depositRemaining: row.depositRemaining == null ? undefined : Number(row.depositRemaining),
    securityDepositRequiredByRate: Number(row.securityDepositRequiredByRate ?? 0),
    securityDepositFullAmount: Number(row.securityDepositFullAmount ?? 0),
    securityDepositPaid: Number(row.securityDepositPaid ?? 0),
    securityDepositRemainingForSelectedRate: Number(row.securityDepositRemainingForSelectedRate ?? 0),
    securityDepositRemainingForFull: Number(row.securityDepositRemainingForFull ?? 0),
    securityDepositRemainingForPickup: Number(row.securityDepositRemainingForPickup ?? row.securityDepositOutstanding ?? 0),
    rentalTotal: Number(row.rentalTotal ?? 0),
    rentalPaid: Number(row.rentalPaid ?? 0),
    rentalRemaining: Number(row.rentalRemaining ?? 0),
    feesTotal: Number(row.feesTotal ?? 0),
    refundsTotal: Number(row.refundsTotal ?? 0),
    refundableDepositAmount: Number(row.refundableDepositAmount ?? 0),
    amountDueNow: Number(row.amountDueNow ?? 0),
    collectionStage: row.collectionStage ? String(row.collectionStage) : undefined,
    canPickup: Boolean(row.canPickup),
    pickupBlockedReasons: Array.isArray(row.pickupBlockedReasons) ? row.pickupBlockedReasons.map(String) : [],
    paymentStatus: String(row.paymentStatus ?? 'unpaid'),
    returnSettlementDraftActive: Boolean(row.returnSettlementDraftActive),
    returnSettlementPreview: row.returnSettlementPreview
      ? {
          lateDays: Number(row.returnSettlementPreview.lateDays ?? 0),
          lateFee: Number(row.returnSettlementPreview.lateFee ?? 0),
          dirtyFee: Number(row.returnSettlementPreview.dirtyFee ?? 0),
          damageFee: Number(row.returnSettlementPreview.damageFee ?? 0),
          accessoryFee: Number(row.returnSettlementPreview.accessoryFee ?? 0),
          otherFee: Number(row.returnSettlementPreview.otherFee ?? 0),
          totalCharges: Number(row.returnSettlementPreview.totalCharges ?? 0),
          rentalRemaining: Number(row.returnSettlementPreview.rentalRemaining ?? 0),
          depositCreditRemaining: Number(row.returnSettlementPreview.depositCreditRemaining ?? 0),
          cashCollected: Number(row.returnSettlementPreview.cashCollected ?? 0),
          refundNow: Number(row.returnSettlementPreview.refundNow ?? 0),
          amountDueFromCustomer: Number(row.returnSettlementPreview.amountDueFromCustomer ?? 0),
          applyRentalToDeposit: row.returnSettlementPreview.applyRentalToDeposit !== false,
          status: row.returnSettlementPreview.status ? String(row.returnSettlementPreview.status) : undefined,
          hasDraft: Boolean(row.returnSettlementPreview.hasDraft),
          actualReturnDate: row.returnSettlementPreview.actualReturnDate ?? null,
          notes: row.returnSettlementPreview.notes ?? null,
        }
      : undefined,
    products: Array.isArray(row.products)
      ? row.products.map((item: any) => ({
          id: item.id,
          productId: item.productId ?? undefined,
          inventoryItemId: item.inventoryItemId ?? null,
          name: item.name ?? '-',
          image: item.image ?? null,
          qrCode: item.qrCode ?? null,
          serialNumber: item.serialNumber ?? null,
          productValue: Number(item.productValue ?? 0),
          rentalPrice: Number(item.rentalPrice ?? 0),
          status: item.status,
        }))
      : [],
  };
}

function bookingFromApi(row: any, payments: PaymentRow[], summary: BookingSummary): BookingDeskRow {
  const fallbackProducts = Array.isArray(row.items)
    ? row.items.map((item: any) => ({
        id: item.inventoryItemId ?? item.productId,
        name: item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
        image: item.product?.image ?? item.inventoryItem?.product?.image ?? null,
        qrCode: item.inventoryItem?.qrCode ?? item.product?.qrCode ?? item.inventoryItemId ?? item.productId,
        serialNumber: item.inventoryItem?.serialNumber ?? null,
        productValue: Number(item.productValueAtTime ?? item.product?.productValue ?? item.product?.price ?? 0),
        rentalPrice: Number(item.rentalPriceAtTime ?? item.product?.rentalPrice ?? item.product?.price ?? 0),
        status: item.inventoryItem?.status ? String(item.inventoryItem.status).toLowerCase() : item.pickupStatus ? String(item.pickupStatus).toLowerCase() : undefined,
      }))
    : [];
  const products = summary.products?.length ? summary.products : fallbackProducts;
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? '-',
    phone: row.customer?.phone ?? row.phone,
    status: lower(row.status),
    product: products.map((item: { name: string }) => item.name).join(', ') || '-',
    products,
    pickupDate: row.pickupDate ?? row.startDate,
    returnDate: row.returnDate ?? row.endDate,
    payments,
    summary,
  };
}

function depositPolicyLabel(summary: BookingSummary, t: (key: string) => string) {
  if (summary.selectedDepositType === 'custom_amount') {
    return t('payment.deposit.custom_amount');
  }
  return `${summary.selectedDepositRate}%`;
}

function actionTheme(kind: 'pickup' | 'settle-return' | 'collect' | 'refund' | 'receipt' | 'done') {
  if (kind === 'settle-return') {
    return {
      card: 'border-[rgb(var(--warning))]/30 bg-[rgb(var(--warning))]/10',
      badge: 'text-[rgb(var(--warning))]',
      button: 'border-[rgb(var(--warning))]/35 bg-[rgb(var(--warning))] text-white hover:brightness-95',
    };
  }
  if (kind === 'collect') {
    return {
      card: 'border-[rgb(var(--danger))]/22 bg-[rgb(var(--danger))]/8',
      badge: 'text-[rgb(var(--danger))]',
      button: 'border-[rgb(var(--danger))]/35 bg-[rgb(var(--danger))] text-white hover:brightness-95',
    };
  }
  if (kind === 'refund') {
    return {
      card: 'border-[rgb(var(--accent-strong))]/24 bg-[rgb(var(--accent-strong))]/10',
      badge: 'text-[rgb(var(--accent-strong))]',
      button: 'border-[rgb(var(--accent-strong))]/30 bg-[rgb(var(--accent-strong))] text-[rgb(var(--button-primary-text))] hover:brightness-95',
    };
  }
  if (kind === 'pickup') {
    return {
      card: 'border-[rgb(var(--success))]/28 bg-[rgb(var(--success))]/10',
      badge: 'text-[rgb(var(--success))]',
      button: 'border-[rgb(var(--success))]/35 bg-[rgb(var(--success))] text-white hover:brightness-95',
    };
  }
  if (kind === 'done') {
    return {
      card: 'border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/8',
      badge: 'text-[rgb(var(--success))]',
      button: 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))] text-[rgb(var(--text-primary))]',
    };
  }
  return {
    card: 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/70',
    badge: 'text-[rgb(var(--text-secondary))]',
    button: 'button-secondary',
  };
}

function DepositProgressCard({
  title,
  required,
  paid,
  remaining,
  requiredLabel,
  paidLabel,
  remainingLabel,
}: {
  title: string;
  required: number;
  paid: number;
  remaining: number;
  requiredLabel: string;
  paidLabel: string;
  remainingLabel: string;
}) {
  const progress = required > 0 ? Math.min((paid / required) * 100, 100) : 0;
  return (
    <SectionCard title={title}>
      <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/68 p-4">
        <div className="flex items-end justify-between gap-3">
          <MoneyDisplay value={paid} strong className="text-xl" tone={paid >= required ? 'success' : 'info'} />
          <p className="text-xs text-[rgb(var(--text-secondary))]">{Math.round(progress)}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgb(var(--surface))]">
          <div
            className="h-full rounded-full theme-accent-gradient transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatChip label={requiredLabel} value={required} tone="warning" />
          <StatChip label={paidLabel} value={paid} tone={paid >= required ? 'success' : 'info'} />
          <StatChip label={remainingLabel} value={remaining} tone={remaining > 0 ? 'warning' : 'success'} />
        </div>
      </div>
    </SectionCard>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="rounded-[18px] border border-[rgb(var(--chip-border))] bg-[rgb(var(--chip-bg))] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <MoneyDisplay value={value} tone={tone} strong className="mt-2 block text-sm" />
    </div>
  );
}

function PaymentDeskContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { params, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [rows, setRows] = useState<BookingDeskRow[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodValue>('cash');
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [applyRentalToDeposit, setApplyRentalToDeposit] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0] ?? null, [activeId, rows]);
  const filteredRows = rows;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const bookingsRes = await bookingsApi.list({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
      const bookingSource = bookingsRes.data?.data ?? [];
      setMeta(bookingsRes.data?.meta ?? { page: params.page, limit: params.limit, total: bookingSource.length, totalPages: bookingSource.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      const result = await Promise.allSettled(
        bookingSource.map(async (booking: any) => {
          const paymentRes = await paymentsApi.getByBooking(booking.id);
          const summary = summaryFromApi(paymentRes.data?.summary ?? {});
          const payments = (paymentRes.data?.payments ?? []).map(paymentFromApi);
          return bookingFromApi(booking, payments, summary);
        }),
      );
      const nextRows = result
        .filter((item): item is PromiseFulfilledResult<BookingDeskRow> => item.status === 'fulfilled')
        .map((item) => item.value);
      setRows(nextRows);
      setActiveId((current) => {
        const preferred = searchParams.get('booking');
        return nextRows.find((item) => item.id === preferred)?.id
          ?? nextRows.find((item) => item.id === current)?.id
          ?? nextRows[0]?.id
          ?? '';
      });
      if (result.some((item) => item.status === 'rejected')) {
        setError(t('paymentOps.errors.loadFallback'));
      }
    } catch (err: any) {
      setRows([]);
      setActiveId('');
      setError(err?.response?.data?.message ?? t('paymentOps.errors.loadFallback'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [params.limit, params.page, params.sortBy, params.sortOrder]);

  useEffect(() => {
    if (!active) {
      setAmount(null);
      setDescription('');
      return;
    }
    setAmount(active.summary.amountDueNow || active.summary.securityDepositRemainingForSelectedRate || active.summary.rentalRemaining || 0);
    setDescription(`${active.code} / ${active.customer}`);
    setApplyRentalToDeposit(active.summary.returnSettlementPreview?.applyRentalToDeposit !== false);
  }, [active]);

  const globalSummary = useMemo(() => rows.reduce((acc, row) => {
    acc.deposit += row.summary.securityDepositPaid;
    acc.rental += row.summary.rentalPaid;
    acc.due += row.summary.amountDueNow;
    acc.refund += row.summary.refundableDepositAmount;
    return acc;
  }, { deposit: 0, rental: 0, due: 0, refund: 0 }), [rows]);

  const latestCompletedSecurityDeposit = active?.payments.find(
    (payment) => payment.status === 'completed' && payment.type === 'security_deposit',
  );
  const latestCompletedPayment = active?.payments.find((payment) => payment.status === 'completed');
  const returnSettlementPreview = active?.summary.returnSettlementPreview;
  const hasReturnSettlementDraft = hasPendingReturnSettlement(active?.summary);
  const riskFeesToSettleNow = Math.max(returnSettlementPreview?.totalCharges ?? active?.summary.feesTotal ?? 0, 0);
  const rentalToCollectNow = Math.max(returnSettlementPreview?.rentalRemaining ?? active?.summary.rentalRemaining ?? 0, 0);
  const depositToCollectNow = Math.max(!isPostPickupStatus(active?.status) ? active?.summary.securityDepositRemainingForPickup ?? 0 : 0, 0);
  const settlementDepositCredit = Math.max(returnSettlementPreview?.depositCreditRemaining ?? active?.summary.securityDepositPaid ?? 0, 0);
  const riskFeesCoveredByDeposit = Math.min(riskFeesToSettleNow, settlementDepositCredit);
  const depositCreditAfterRiskFees = Math.max(settlementDepositCredit - riskFeesCoveredByDeposit, 0);
  const rentalCoveredByDeposit = applyRentalToDeposit ? Math.min(rentalToCollectNow, depositCreditAfterRiskFees) : 0;
  const riskFeesCustomerTopUp = Math.max(riskFeesToSettleNow - riskFeesCoveredByDeposit, 0);
  const rentalCustomerTopUp = applyRentalToDeposit ? Math.max(rentalToCollectNow - rentalCoveredByDeposit, 0) : rentalToCollectNow;
  const totalDeductedFromDepositNow = riskFeesCoveredByDeposit + rentalCoveredByDeposit;
  const depositToRefundNow = Math.max(
    applyRentalToDeposit ? depositCreditAfterRiskFees - rentalToCollectNow : depositCreditAfterRiskFees,
    0,
  );
  const amountToCollectNow = Math.max(riskFeesCustomerTopUp + (applyRentalToDeposit ? rentalCustomerTopUp : 0), 0);
  const refundRequiresSeparateStep = Boolean(
    returnSettlementPreview && !applyRentalToDeposit && rentalToCollectNow > 0 && depositToRefundNow > 0,
  );
  const depositToRefundInCurrentAction = refundRequiresSeparateStep ? 0 : depositToRefundNow;
  const depositToRefundLater = refundRequiresSeparateStep ? depositToRefundNow : 0;
  const canCollectRental = Boolean(active && active.status !== 'cancelled' && active.summary.rentalRemaining > 0);
  const canCollectDeposit = Boolean(
    active &&
    active.status !== 'cancelled' &&
    !isPostPickupStatus(active.status) &&
    active.summary.securityDepositRemainingForPickup > 0,
  );
  const canRefundDeposit = Boolean(
    active &&
    isReturnSettlementStatus(active.status) &&
    !hasReturnSettlementDraft &&
    latestCompletedSecurityDeposit &&
    active.summary.rentalRemaining <= 0 &&
    active.summary.refundableDepositAmount > 0,
  );
  const canFinalizeReturnSettlement = Boolean(
    active &&
    hasReturnSettlementDraft &&
    returnSettlementPreview &&
    (returnSettlementPreview.totalCharges > 0
      || returnSettlementPreview.rentalRemaining > 0
      || returnSettlementPreview.refundNow > 0
      || returnSettlementPreview.amountDueFromCustomer >= 0),
  );

  const runAction = async (key: string, task: () => Promise<void>, successMessage: string) => {
    setBusyAction(key);
    setError(null);
    setFeedback(null);
    try {
      await task();
      await loadData();
      setFeedback({ tone: 'success', message: successMessage });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paymentOps.errors.loadFallback'));
    } finally {
      setBusyAction(null);
    }
  };

  const collectRental = async (value = Number(amount || 0)) => {
    if (!active || value <= 0) return;
    await runAction(
      'collect-rental',
      async () => {
        await bookingsApi.collectRentalPayment(active.id, {
          amount: value,
          paymentMethod: backendMethod(method),
          description: description || undefined,
        });
      },
      t('payment.feedback.payment_success'),
    );
  };

  const collectDeposit = async (value = Number(amount || 0)) => {
    if (!active || value <= 0) return;
    await runAction(
      'collect-deposit',
      async () => {
        await bookingsApi.collectSecurityDeposit(active.id, {
          amount: value,
          paymentMethod: backendMethod(method),
          description: description || undefined,
        });
      },
      t('payment.feedback.payment_success'),
    );
  };

  const collectAll = async () => {
    if (!active) return;
    await runAction(
      'collect-all',
      async () => {
        if (active.summary.rentalRemaining > 0) {
          await bookingsApi.collectRentalPayment(active.id, {
            amount: active.summary.rentalRemaining,
            paymentMethod: backendMethod(method),
            description: description || undefined,
          });
        }
        if (!isPostPickupStatus(active.status) && active.summary.securityDepositRemainingForPickup > 0) {
          await bookingsApi.collectSecurityDeposit(active.id, {
            amount: active.summary.securityDepositRemainingForPickup,
            paymentMethod: backendMethod(method),
            description: description || undefined,
          });
        }
      },
      t('payment.feedback.payment_success'),
    );
  };

  const refundDeposit = async () => {
    if (!latestCompletedSecurityDeposit || !active || active.summary.refundableDepositAmount <= 0) return;
    await runAction(
      'refund-deposit',
      async () => {
        await paymentsApi.refund(
          latestCompletedSecurityDeposit.id,
          active.summary.refundableDepositAmount,
        );
      },
      t('payment.feedback.refund_success'),
    );
  };

  const finalizeReturnSettlement = async () => {
    if (!active) return;
    await runAction(
      'finalize-return-settlement',
      async () => {
        await bookingsApi.finalizeReturnSettlement(active.id, {
          paymentMethod: backendMethod(method),
          description: description || undefined,
          applyRentalToDeposit,
        });
      },
      'Đã quyết toán giao dịch nhận trả.',
    );
  };

  const printReceipt = async () => {
    if (!latestCompletedPayment) return;
    await runAction(
      'print-receipt',
      async () => {
        await paymentsApi.generateReceipt(latestCompletedPayment.id);
      },
      t('payment.feedback.payment_success'),
    );
  };

  const pickupBlockingCopy = active?.summary.pickupBlockedReasons ?? [];
  const hasCollectActions = Boolean(
    active && (canCollectDeposit || canCollectRental),
  );
  const receiptOnlyMode = Boolean(
    active && !hasReturnSettlementDraft && !canRefundDeposit && !canCollectDeposit && !canCollectRental,
  );
  const collectPrimaryMode = canCollectDeposit
    ? 'deposit'
    : canCollectRental
      ? 'rental'
      : null;
  const currentMode = hasReturnSettlementDraft
    ? 'settlement'
    : canRefundDeposit
      ? 'refund'
      : hasCollectActions
        ? 'collect'
        : active?.summary.canPickup
          ? 'pickup'
          : latestCompletedPayment
            ? 'receipt'
            : active
              ? 'done'
              : null;
  const collectPrimaryAmount = collectPrimaryMode === 'deposit'
    ? Math.max(active?.summary.securityDepositRemainingForPickup || active?.summary.securityDepositRemainingForSelectedRate || 0, 0)
    : collectPrimaryMode === 'rental'
      ? Math.max(active?.summary.rentalRemaining || 0, 0)
      : Math.max(active?.summary.amountDueNow || 0, 0);
  const currentActionAmount = currentMode === 'settlement'
    ? amountToCollectNow > 0
      ? amountToCollectNow
      : depositToRefundInCurrentAction > 0
        ? depositToRefundInCurrentAction
        : 0
    : currentMode === 'refund'
      ? Math.max(active?.summary.refundableDepositAmount || 0, 0)
      : currentMode === 'collect'
        ? collectPrimaryAmount
        : 0;
  const showMethodTabs = currentMode === 'collect' || currentMode === 'settlement';
  const needsAmountInput = currentMode === 'collect' || (currentMode === 'settlement' && amountToCollectNow > 0);
  const suggestedAmount = currentMode === 'collect'
    ? collectPrimaryAmount
    : currentMode === 'settlement' && amountToCollectNow > 0
      ? amountToCollectNow
      : 0;
  const workstationTheme = currentMode === 'settlement'
    ? 'settle-return'
    : currentMode === 'refund'
      ? 'refund'
      : currentMode === 'collect'
        ? 'collect'
        : currentMode === 'pickup'
          ? 'pickup'
          : currentMode === 'receipt'
            ? 'receipt'
            : 'done';
  const workstationLabel = currentMode === 'settlement'
    ? 'Quyết toán nhận trả'
    : currentMode === 'refund'
      ? 'Hoàn cọc'
      : currentMode === 'collect'
        ? collectPrimaryMode === 'deposit'
          ? 'Thu cọc'
          : collectPrimaryMode === 'rental'
            ? 'Thu tiền thuê'
            : 'Thu tiền'
        : currentMode === 'pickup'
          ? 'Sẵn sàng bàn giao'
          : currentMode === 'receipt'
            ? 'Đã thanh toán'
            : 'Hoàn tất';
  const workstationTitle = currentMode === 'settlement'
    ? 'Chốt quyết toán nhận trả'
    : currentMode === 'refund'
      ? 'Trả cọc lại cho khách'
      : currentMode === 'collect'
        ? collectPrimaryMode === 'deposit'
          ? 'Thu cọc tài sản'
          : collectPrimaryMode === 'rental'
            ? 'Thu tiền thuê còn lại'
            : 'Thu tiền còn thiếu'
        : currentMode === 'pickup'
          ? 'Mở quầy bàn giao'
          : currentMode === 'receipt'
            ? 'In biên lai'
            : 'Không còn thao tác';
  const workstationAmountHelper = currentMode === 'settlement'
    ? amountToCollectNow > 0
      ? 'Số tiền khách cần trả thêm sau khi đã khấu trừ vào cọc.'
      : depositToRefundInCurrentAction > 0
        ? 'Số tiền cần hoàn lại cho khách sau khi đã trừ phí và tiền thuê.'
        : 'Bước này chỉ ghi nhận khấu trừ vào cọc, không cần thu thêm hay hoàn thêm.'
    : currentMode === 'refund'
      ? 'Phần cọc còn dư có thể hoàn lại ngay cho khách.'
      : currentMode === 'collect'
        ? collectPrimaryMode === 'deposit'
          ? 'Thu đủ cọc tài sản trước khi đơn đủ điều kiện bàn giao.'
          : collectPrimaryMode === 'rental'
            ? 'Khoản tiền thuê còn thiếu của đơn thuê này.'
            : 'Khoản tiền cần xử lý ngay cho đơn thuê này.'
        : currentMode === 'pickup'
          ? 'Đơn đã đủ điều kiện để chuyển sang quầy bàn giao.'
          : currentMode === 'receipt'
            ? 'Không còn khoản tiền cần xử lý. Có thể in lại biên lai.'
            : 'Đơn này hiện không còn thao tác thu ngân bắt buộc.';
  const suppressHeaderPrimaryAction = rows.length >= 0;
  const headerPrimaryAction = suppressHeaderPrimaryAction
    ? { kind: 'done' as const }
    : hasReturnSettlementDraft
      ? { kind: 'settle-return' as const }
      : canRefundDeposit
        ? { kind: 'refund' as const }
      : hasCollectActions
        ? { kind: 'collect' as const }
        : latestCompletedPayment
          ? { kind: 'receipt' as const }
          : active?.summary.canPickup
            ? { kind: 'pickup' as const }
            : active
              ? { kind: 'done' as const }
              : { kind: 'done' as const };
  const primaryActionMeta = useMemo(() => {
    if (!active || !headerPrimaryAction) return null;
    if (headerPrimaryAction.kind === 'settle-return') {
      return {
        step: 'Bước 1',
        title: 'Chốt quyết toán sau giao trả',
        description: 'Phí đã được ghi nhận ở quầy giao trả. Thu ngân chốt thu hoặc hoàn tại đây để đơn tự động hoàn tất.',
      };
    }
    if (headerPrimaryAction.kind === 'refund') {
      return {
        step: 'Bước 2',
        title: 'Trả cọc lại cho khách',
        description: 'Đơn đã khấu trừ xong. Thu ngân hoàn phần cọc còn dư cho khách ngay trên màn hình này.',
      };
    }
    if (headerPrimaryAction.kind === 'collect') {
      return {
        step: 'Bước 1',
        title: 'Thu tiền còn thiếu',
        description: 'Còn khoản cần thu trước khi đơn đủ điều kiện sang bước tiếp theo.',
      };
    }
    if (headerPrimaryAction.kind === 'pickup') {
      return {
        step: 'Sẵn sàng',
        title: 'Đã đủ tiền, chuyển sang bàn giao',
        description: 'Thanh toán đã xong cho giai đoạn hiện tại. Có thể mở quầy bàn giao.',
      };
    }
    if (headerPrimaryAction.kind === 'receipt') {
      return {
        step: 'Hoàn tất',
        title: 'Đã xử lý xong dòng tiền',
        description: 'Không còn thao tác thu ngân bắt buộc. Có thể in biên lai nếu cần.',
      };
    }
    return {
      step: 'Hoàn tất',
      title: 'Không còn việc cần xử lý',
      description: 'Trạng thái thanh toán hiện tại đã xong.',
    };
  }, [active, headerPrimaryAction]);
  const primaryActionMetaResolved = useMemo(() => {
    if (!active || !headerPrimaryAction) {
      return {
        step: '',
        title: '',
        description: '',
      };
    }
    if (headerPrimaryAction.kind === 'settle-return') {
      if (refundRequiresSeparateStep) {
        return {
          step: 'Bước 1',
          title: t('paymentOps.ui.settlementActionSeparateRentalTitle'),
          description: t('paymentOps.ui.settlementActionSeparateRentalDesc', {
            collect: formatVnd(amountToCollectNow),
            refund: formatVnd(depositToRefundLater),
          }),
        };
      }
      if (amountToCollectNow > 0) {
        return {
          step: 'Bước 1',
          title: t('paymentOps.ui.settlementActionCollectTitle'),
          description: t('paymentOps.ui.settlementActionCollectDesc', {
            amount: formatVnd(amountToCollectNow),
          }),
        };
      }
      if (depositToRefundInCurrentAction > 0) {
        return {
          step: 'Bước 1',
          title: t('paymentOps.ui.settlementActionRefundTitle'),
          description: t('paymentOps.ui.settlementActionRefundDesc', {
            amount: formatVnd(depositToRefundInCurrentAction),
          }),
        };
      }
      return {
        step: 'Bước 1',
        title: t('paymentOps.ui.settlementActionDeductTitle'),
        description: t('paymentOps.ui.settlementActionDeductDesc'),
      };
    }
    if (headerPrimaryAction.kind === 'refund') {
      return {
        step: 'Bước 2',
        title: 'Trả cọc lại cho khách',
        description: 'Đơn đã khấu trừ xong. Thu ngân hoàn phần cọc còn dư cho khách ngay trên màn hình này.',
      };
    }
    if (headerPrimaryAction.kind === 'collect') {
      return {
        step: 'Bước 1',
        title: 'Thu tiền còn thiếu',
        description: 'Còn khoản cần thu trước khi đơn đủ điều kiện sang bước tiếp theo.',
      };
    }
    if (headerPrimaryAction.kind === 'pickup') {
      return {
        step: 'Sẵn sàng',
        title: 'Đã đủ tiền, chuyển sang bàn giao',
        description: 'Thanh toán đã xong cho giai đoạn hiện tại. Có thể mở quầy bàn giao.',
      };
    }
    if (headerPrimaryAction.kind === 'receipt') {
      return {
        step: 'Hoàn tất',
        title: 'Đã xử lý xong dòng tiền',
        description: 'Không còn thao tác thu ngân bắt buộc. Có thể in biên lai nếu cần.',
      };
    }
    return {
      step: 'Hoàn tất',
      title: 'Không còn việc cần xử lý',
      description: 'Trạng thái thanh toán hiện tại đã xong.',
    };
  }, [
    active,
    amountToCollectNow,
    depositToRefundInCurrentAction,
    depositToRefundLater,
    headerPrimaryAction,
    refundRequiresSeparateStep,
    t,
  ]);

  useEffect(() => {
    setShowAllHistory(false);
  }, [active?.id]);

  useEffect(() => {
    if (!active || !needsAmountInput) return;
    setAmount(suggestedAmount);
  }, [active?.id, needsAmountInput, suggestedAmount]);

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
        eyebrow={t('paymentOps.eyebrow')}
        title={t('payment.title')}
        subtitle={t('payment.subtitle')}
        nextStep={active ? t(nextStepKey(active)) : t('paymentOps.next.selectBooking')}
        actions={(
          <>
            <AdminButton variant="secondary" onClick={() => void loadData()} loading={loading}>
              {t('common.refresh')}
            </AdminButton>
            {headerPrimaryAction?.kind === 'settle-return' ? (
              <AdminButton className={actionTheme('settle-return').button} onClick={() => void finalizeReturnSettlement()} loading={busyAction === 'finalize-return-settlement'}>
                Chốt quyết toán
              </AdminButton>
            ) : null}
            {headerPrimaryAction?.kind === 'collect' ? (
              <AdminButton
                className={actionTheme('collect').button}
                onClick={() => {
                  if (collectPrimaryMode === 'deposit') {
                    void collectDeposit(active?.summary.securityDepositRemainingForSelectedRate || Number(amount || 0));
                    return;
                  }
                  if (collectPrimaryMode === 'rental') {
                    void collectRental(active?.summary.rentalRemaining || Number(amount || 0));
                  }
                }}
                loading={busyAction === (collectPrimaryMode === 'deposit' ? 'collect-deposit' : 'collect-rental')}
                disabled={!collectPrimaryMode}
              >
                {collectPrimaryMode === 'deposit' ? t('payment.actions.collect_deposit') : t('payment.actions.collect_rental')}
              </AdminButton>
            ) : null}
            {headerPrimaryAction?.kind === 'refund' ? (
              <AdminButton className={actionTheme('refund').button} onClick={() => void refundDeposit()} loading={busyAction === 'refund-deposit'}>
                Trả cọc lại cho khách
              </AdminButton>
            ) : null}
            {headerPrimaryAction?.kind === 'receipt' ? (
              <AdminButton variant="secondary" onClick={() => void printReceipt()} loading={busyAction === 'print-receipt'}>
                {t('payment.actions.print_receipt')}
              </AdminButton>
            ) : null}
            {active ? (
              <ActionMenu
                label={t('common.moreActions')}
                items={[
                  { label: t('paymentOps.actions.open_booking'), href: `/admin/bookings/${active.id}` },
                  { label: t('paymentOps.actions.open_pickup'), href: `/admin/pickup?booking=${active.id}` },
                  { label: t('paymentOps.actions.open_return'), href: `/admin/returns?booking=${active.id}` },
                  {
                    label: t('payment.actions.refund_deposit'),
                    disabled: !canRefundDeposit,
                    onSelect: () => { void refundDeposit(); },
                  },
                  {
                    label: t('payment.actions.print_receipt'),
                    disabled: !latestCompletedPayment,
                    onSelect: () => { void printReceipt(); },
                  },
                ]}
              />
            ) : null}
          </>
        )}
      />

      {active && pickupBlockingCopy.length ? (
        <div className="mt-4">
          <InlineAlert tone="warning">
            {pickupBlockingCopy.includes('rental_unpaid') ? t('pickup.blocked.unpaid') : t('pickup.blocked.deposit_missing')}
          </InlineAlert>
        </div>
      ) : null}

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

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CashierQueue
          rows={filteredRows}
          activeId={active?.id}
          onSelect={setActiveId}
          loading={loading}
        />

        {active ? (
          <div className="space-y-6">
            <div className={cn(
              'rounded-[32px] border px-5 py-5 shadow-sm xl:px-7 xl:py-7',
              actionTheme(workstationTheme).card,
            )}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className={cn('text-[11px] font-bold uppercase tracking-[0.18em]', actionTheme(workstationTheme).badge)}>
                    {workstationLabel}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] xl:text-2xl">
                      <span title={active.code}>{compactCode(active.code, 10, 6)}</span> / {active.customer}
                    </h2>
                    <StatusBadge value={active.status} tone={bookingTone(active)} />
                    <AdminBadge tone={active.summary.amountDueNow > 0 ? 'warning' : 'info'}>{t(nextStepKey(active))}</AdminBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[rgb(var(--text-secondary))]">
                    <span>{active.phone ?? '-'}</span>
                    <span>{formatDate(active.pickupDate)}</span>
                    <span>{formatDate(active.returnDate)}</span>
                    <span>{depositPolicyLabel(active.summary, t)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/bookings/${active.id}`)}
                  className="text-sm font-semibold text-[rgb(var(--accent-strong))]"
                >
                  {t('paymentOps.actions.open_booking')}
                </button>
              </div>

              <div className="mt-6">
                <CashierBigAmount
                  label={workstationTitle}
                  amount={currentActionAmount}
                  helper={workstationAmountHelper}
                  tone={currentMode === 'refund' ? 'accent' : currentMode === 'pickup' || currentMode === 'receipt' || currentMode === 'done' ? 'success' : currentMode === 'settlement' && amountToCollectNow <= 0 ? 'neutral' : 'warning'}
                />
              </div>

              {showMethodTabs ? (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{t('paymentOps.actions.method')}</p>
                  <CashierMethodTabs method={method} setMethod={setMethod} disabled={receiptOnlyMode} />
                </div>
              ) : null}

              {needsAmountInput ? (
                <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                    {t('paymentOps.actions.amount')}
                    <MoneyInput value={amount} onValueChange={setAmount} disabled={receiptOnlyMode} />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                      type="button"
                      className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))]"
                      onClick={() => setAmount(suggestedAmount)}
                    >
                      Đủ số tiền
                    </button>
                    {Math.max(active.summary.rentalRemaining || rentalToCollectNow, 0) > 0 ? (
                      <button
                        type="button"
                        className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))]"
                        onClick={() => setAmount(Math.max(active.summary.rentalRemaining || rentalToCollectNow, 0))}
                      >
                        Tiền thuê
                      </button>
                    ) : null}
                    {depositToCollectNow > 0 ? (
                      <button
                        type="button"
                        className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))]"
                        onClick={() => setAmount(depositToCollectNow)}
                      >
                        Tiền cọc
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm font-semibold text-[rgb(var(--text-primary))]"
                      onClick={() => setAmount(null)}
                    >
                      Nhập tay
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
                <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {t('common.notes')}
                  <AdminInput value={description} onChange={(event) => setDescription(event.target.value)} disabled={receiptOnlyMode} />
                </label>
                <div className="flex flex-col gap-3 xl:justify-end">
                  {currentMode === 'settlement' ? (
                    <AdminButton className={actionTheme('settle-return').button} onClick={() => void finalizeReturnSettlement()} loading={busyAction === 'finalize-return-settlement'} disabled={!canFinalizeReturnSettlement}>
                      Chốt quyết toán nhận trả
                    </AdminButton>
                  ) : null}
                  {currentMode === 'refund' ? (
                    <AdminButton className={actionTheme('refund').button} onClick={() => void refundDeposit()} loading={busyAction === 'refund-deposit'} disabled={!canRefundDeposit}>
                      Trả cọc lại cho khách
                    </AdminButton>
                  ) : null}
                  {currentMode === 'collect' ? (
                    <AdminButton
                      className={actionTheme('collect').button}
                      onClick={() => {
                        const nextAmount = Number(amount || collectPrimaryAmount || 0);
                        if (collectPrimaryMode === 'deposit') {
                          void collectDeposit(nextAmount);
                          return;
                        }
                        if (collectPrimaryMode === 'rental') {
                          void collectRental(nextAmount);
                        }
                      }}
                      loading={busyAction === (collectPrimaryMode === 'deposit' ? 'collect-deposit' : 'collect-rental')}
                      disabled={!collectPrimaryMode || Number(amount || collectPrimaryAmount || 0) <= 0}
                    >
                      {collectPrimaryMode === 'deposit' ? t('payment.actions.collect_deposit') : collectPrimaryMode === 'rental' ? t('payment.actions.collect_rental') : 'Thu tiền'}
                    </AdminButton>
                  ) : null}
                  {currentMode === 'pickup' ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/pickup?booking=${active.id}`)}
                      className={cn('button-primary text-center', actionTheme('pickup').button)}
                    >
                      {t('paymentOps.actions.open_pickup')}
                    </button>
                  ) : null}
                  {currentMode === 'receipt' ? (
                    <AdminButton variant="secondary" onClick={() => void printReceipt()} loading={busyAction === 'print-receipt'} disabled={!latestCompletedPayment}>
                      {t('payment.actions.print_receipt')}
                    </AdminButton>
                  ) : null}
                  {currentMode === 'done' ? (
                    <div className="rounded-[20px] border border-[rgb(var(--success))]/18 bg-[rgb(var(--success))]/8 px-4 py-3 text-sm font-semibold text-[rgb(var(--success))]">
                      Đơn này hiện không còn thao tác thu ngân.
                    </div>
                  ) : null}
                  {latestCompletedPayment && currentMode !== 'receipt' ? (
                    <AdminButton variant="secondary" onClick={() => void printReceipt()} loading={busyAction === 'print-receipt'}>
                      {t('payment.actions.print_receipt')}
                    </AdminButton>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <CashierSettlementSummary
                  show={Boolean(returnSettlementPreview)}
                  applyRentalToDeposit={applyRentalToDeposit}
                  setApplyRentalToDeposit={setApplyRentalToDeposit}
                  riskFeesToSettleNow={riskFeesToSettleNow}
                  riskFeesCoveredByDeposit={riskFeesCoveredByDeposit}
                  rentalCoveredByDeposit={rentalCoveredByDeposit}
                  amountToCollectNow={amountToCollectNow}
                  depositToRefundInCurrentAction={depositToRefundInCurrentAction}
                  depositToRefundLater={depositToRefundLater}
                />
                <CompactProductList products={active.products} />
                <CompactPaymentHistory payments={active.payments} showAll={showAllHistory} setShowAll={setShowAllHistory} />
              </div>

              <div className="space-y-6">
                <CashierOperationalSummary
                  summary={active.summary}
                  feesWaiting={returnSettlementPreview?.totalCharges ?? 0}
                />
                {hasReturnSettlementDraft ? (
                  <InlineAlert tone="warning">{t('paymentOps.ui.settlementPending')}</InlineAlert>
                ) : returnSettlementPreview ? (
                  <InlineAlert tone="success">{t('paymentOps.ui.settlementCompleted')}</InlineAlert>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <SectionCard title={t('paymentOps.context.title')} description={t('paymentOps.queue.description')}>
            <div className="rounded-[28px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 px-5 py-10 text-center text-sm text-[rgb(var(--text-secondary))]">
              {loading ? t('common.loading') : t('paymentOps.validation.selectBooking')}
            </div>
          </SectionCard>
        )}
      </div>

      {false ? (
        <>

      <SummaryRow
        items={[
          { label: t('payment.deposit.title'), value: <MoneyDisplay value={globalSummary.deposit} strong />, detail: t('payment.deposit.paid'), tone: 'info' },
          { label: t('payment.rental.title'), value: <MoneyDisplay value={globalSummary.rental} strong />, detail: t('payment.rental.total'), tone: 'success' },
          { label: t('payment.summary.amount_due_now'), value: <MoneyDisplay value={globalSummary.due} strong />, detail: t('paymentOps.queue.remaining_hint'), tone: globalSummary.due > 0 ? 'warning' : 'success' },
          { label: t('payment.actions.refund_deposit'), value: <MoneyDisplay value={globalSummary.refund} strong />, detail: t('payment.feedback.refund_success'), tone: 'accent' },
        ]}
      />

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

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
        <QueueList
          title={t('paymentOps.queue.title')}
          description={t('paymentOps.queue.description')}
          items={filteredRows.map((row) => ({
            id: row.id,
            title: `${row.code} / ${row.customer}`,
            subtitle: `${row.product}`,
            meta: `${formatDate(row.pickupDate)} - ${formatDate(row.returnDate)}`,
            helper: `${t('payment.summary.amount_due_now')}: ${formatVnd(row.summary.amountDueNow)}`,
            badges: [
              { label: depositPolicyLabel(row.summary, t), tone: 'info' },
              { label: row.summary.rentalRemaining > 0 ? t('payment.rental.remaining') : t('paymentOps.next.ready'), tone: row.summary.rentalRemaining > 0 ? 'warning' : 'success' },
            ],
            nextStep: t(nextStepKey(row)),
            status: row.status,
            statusTone: bookingTone(row),
          }))}
          activeId={active?.id}
          onSelect={setActiveId}
          emptyTitle={t('paymentOps.queue.emptyTitle')}
          emptyDescription={t('paymentOps.queue.emptyDescription')}
          emptyState={loading ? (
            <div className="flex items-center gap-2 rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-5 text-sm text-[rgb(var(--text-secondary))]">
              <AdminSpinner />
              {t('common.loading')}
            </div>
          ) : undefined}
        />

        <div className="space-y-6">
          {active ? (
            <>
              <BookingContextCard
                eyebrow={t('paymentOps.context.title')}
                title={`${active.code} / ${active.customer}`}
                subtitle={`${active.product}`}
                status={active.status}
                statusTone={bookingTone(active)}
                badges={[
                  { label: depositPolicyLabel(active.summary, t), tone: 'info' },
                  { label: active.summary.canPickup ? t('paymentOps.actions.open_pickup') : t('payment.summary.amount_due_now'), tone: active.summary.canPickup ? 'success' : 'warning' },
                ]}
                details={[
                  { label: t('common.rental_order_code'), value: active.code },
                  { label: t('paymentOps.context.customer'), value: active.customer },
                  { label: t('paymentOps.context.phone'), value: active.phone ?? '-' },
                  { label: t('paymentOps.context.product'), value: active.product },
                  { label: t('payment.deposit.product_value'), value: <MoneyDisplay value={active.summary.productValueTotal} tone="info" strong /> },
                  { label: t('paymentOps.context.pickup'), value: formatDate(active.pickupDate) },
                  { label: t('paymentOps.context.return'), value: formatDate(active.returnDate) },
                  { label: t('paymentOps.context.lead'), value: active.summary.leadId ? `#${active.summary.leadId}` : '-' },
                  { label: t('paymentOps.context.appointment'), value: active.summary.appointmentId ? `#${active.summary.appointmentId}` : '-' },
                ]}
                actions={(
                  <FlowActions
                    links={[
                      { href: `/admin/bookings/${active.id}`, label: t('paymentOps.actions.open_booking'), variant: 'secondary' },
                      { href: `/admin/pickup?booking=${active.id}`, label: t('paymentOps.actions.open_pickup'), variant: active.summary.canPickup ? 'primary' : 'secondary' },
                      { href: `/admin/returns?booking=${active.id}`, label: t('paymentOps.actions.open_return'), variant: 'secondary' },
                    ]}
                  />
                )}
              />

              {!active.summary.canPickup && pickupBlockingCopy.length ? (
                <InlineAlert tone="warning">
                  {pickupBlockingCopy.includes('rental_unpaid') ? t('pickup.blocked.unpaid') : t('pickup.blocked.deposit_missing')}
                </InlineAlert>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
                <div className="space-y-6">
                  <PaymentBreakdownCard
                    title={t('payment.summary.title')}
                    description={t('paymentOps.workspace.breakdown')}
                    rows={[
                      { label: t('payment.deposit.title'), value: active.summary.securityDepositPaid, tone: 'info', helper: `${t('payment.deposit.required')}: ${formatVnd(active.summary.securityDepositRequiredByRate)}` },
                      { label: t('payment.rental.title'), value: active.summary.rentalPaid, tone: 'success', helper: `${t('payment.rental.remaining')}: ${formatVnd(active.summary.rentalRemaining)}` },
                      { label: t('common.refundableDeposit'), value: active.summary.refundableDepositAmount, tone: active.summary.refundableDepositAmount > 0 ? 'accent' : 'neutral' },
                      { label: t('payment.summary.amount_due_now'), value: active.summary.amountDueNow, tone: active.summary.amountDueNow > 0 ? 'danger' : 'success', strong: true, helper: active.summary.canPickup ? t('paymentOps.next.openPickup') : t(nextStepKey(active)) },
                    ]}
                  />

                  {returnSettlementPreview ? (
                    <PaymentBreakdownCard
                      title={t('paymentOps.ui.returnSettlementTitle')}
                      description={t('paymentOps.ui.returnSettlementDesc')}
                      rows={[
                        { label: t('return.fees.late_fee'), value: returnSettlementPreview!.lateFee, tone: returnSettlementPreview!.lateFee > 0 ? 'danger' : 'neutral', helper: returnSettlementPreview!.lateDays > 0 ? t('return.fees.late_days', { count: returnSettlementPreview!.lateDays }) : undefined },
                        { label: t('paymentOps.ui.dirtyFee'), value: returnSettlementPreview!.dirtyFee, tone: returnSettlementPreview!.dirtyFee > 0 ? 'danger' : 'neutral' },
                        { label: t('return.fees.damage_fee'), value: returnSettlementPreview!.damageFee, tone: returnSettlementPreview!.damageFee > 0 ? 'danger' : 'neutral' },
                        { label: t('return.fees.accessory_fee'), value: returnSettlementPreview!.accessoryFee, tone: returnSettlementPreview!.accessoryFee > 0 ? 'danger' : 'neutral' },
                        { label: t('paymentOps.ui.otherFee'), value: returnSettlementPreview!.otherFee, tone: returnSettlementPreview!.otherFee > 0 ? 'danger' : 'neutral' },
                        { label: t('paymentOps.ui.rentalRemaining'), value: returnSettlementPreview!.rentalRemaining, tone: returnSettlementPreview!.rentalRemaining > 0 ? 'warning' : 'success' },
                        { label: t('paymentOps.ui.riskDeductedFromDeposit'), value: riskFeesCoveredByDeposit, tone: riskFeesCoveredByDeposit > 0 ? 'warning' : 'neutral' },
                        { label: t('paymentOps.ui.rentalDeductedFromDeposit'), value: rentalCoveredByDeposit, tone: rentalCoveredByDeposit > 0 ? 'warning' : 'neutral' },
                        { label: t('paymentOps.ui.deductedFromDeposit'), value: totalDeductedFromDepositNow, tone: totalDeductedFromDepositNow > 0 ? 'warning' : 'neutral', strong: true },
                        { label: t('paymentOps.ui.riskCustomerTopUp'), value: riskFeesCustomerTopUp, tone: riskFeesCustomerTopUp > 0 ? 'danger' : 'success' },
                        { label: t('paymentOps.ui.rentalCustomerTopUp'), value: rentalCustomerTopUp, tone: rentalCustomerTopUp > 0 ? 'danger' : 'success' },
                        { label: t('return.settlement.amount_due_from_customer'), value: amountToCollectNow, tone: amountToCollectNow > 0 ? 'danger' : 'success', strong: amountToCollectNow > 0 },
                        {
                          label: depositToRefundLater > 0 ? t('paymentOps.ui.depositToRefundLater') : t('return.settlement.refund_now'),
                          value: depositToRefundLater > 0 ? depositToRefundLater : depositToRefundInCurrentAction,
                          tone: (depositToRefundLater > 0 ? depositToRefundLater : depositToRefundInCurrentAction) > 0 ? 'accent' : 'neutral',
                          strong: (depositToRefundLater > 0 ? depositToRefundLater : depositToRefundInCurrentAction) > 0,
                        },
                      ]}
                      footer={hasReturnSettlementDraft ? (
                        <InlineAlert tone="warning">{t('paymentOps.ui.settlementPending')}</InlineAlert>
                      ) : (
                        <InlineAlert tone="success">{t('paymentOps.ui.settlementCompleted')}</InlineAlert>
                      )}
                    />
                  ) : null}

                  <DepositProgressCard
                    title={t('payment.deposit.title')}
                    required={active.summary.securityDepositRequiredByRate}
                    paid={active.summary.securityDepositPaid}
                    remaining={active.summary.securityDepositRemainingForSelectedRate}
                    requiredLabel={t('payment.deposit.required')}
                    paidLabel={t('payment.deposit.paid')}
                    remainingLabel={t('payment.deposit.remaining')}
                  />

                  <PaymentBreakdownCard
                    title={t('payment.rental.title')}
                    description={t('paymentOps.breakdown.description')}
                    rows={[
                      { label: t('payment.deposit.product_value'), value: active.summary.productValueTotal, tone: 'info' },
                      { label: t('payment.deposit.policy'), value: active.summary.securityDepositRequiredByRate, helper: depositPolicyLabel(active.summary, t) },
                      { label: t('payment.deposit.remaining'), value: active.summary.securityDepositRemainingForPickup, tone: active.summary.securityDepositRemainingForPickup > 0 ? 'warning' : 'success' },
                      { label: t('payment.rental.total'), value: active.summary.rentalTotal },
                      { label: t('payment.rental.remaining'), value: active.summary.rentalRemaining, tone: active.summary.rentalRemaining > 0 ? 'warning' : 'success' },
                      { label: t('common.refundableDeposit'), value: active.summary.refundableDepositAmount, tone: active.summary.refundableDepositAmount > 0 ? 'accent' : 'neutral' },
                      { label: t('payment.summary.amount_due_now'), value: active.summary.amountDueNow, tone: active.summary.amountDueNow > 0 ? 'danger' : 'success', strong: true },
                    ]}
                  />

                  <PaymentBreakdownCard
                    title={t('paymentOps.history.title')}
                    description={t('paymentOps.history.description')}
                    rows={[
                      { label: t('payment.summary.booking_deposit_paid'), value: active.summary.securityDepositPaid, tone: 'info' },
                      { label: t('payment.summary.rental_remaining'), value: active.summary.rentalRemaining, tone: active.summary.rentalRemaining > 0 ? 'warning' : 'success' },
                      { label: t('payment.summary.security_deposit_required'), value: active.summary.securityDepositRequiredByRate, tone: 'info' },
                      { label: t('common.refundableDeposit'), value: active.summary.refundableDepositAmount, tone: active.summary.refundableDepositAmount > 0 ? 'accent' : 'neutral' },
                      { label: t('payment.summary.amount_due_now'), value: active.summary.amountDueNow, tone: active.summary.amountDueNow > 0 ? 'danger' : 'success', strong: true },
                    ]}
                    footer={active.summary.canPickup ? (
                      <InlineAlert tone="success">{t('paymentOps.next.openPickup')}</InlineAlert>
                    ) : (
                      <InlineAlert tone="info">{t(nextStepKey(active))}</InlineAlert>
                    )}
                  />

                  <SectionCard title={t('paymentOps.history.title')} description={t('paymentOps.history.description')}>
                    <div className="space-y-3">
                      {active.payments.length ? active.payments.map((payment) => (
                        <div key={payment.id} className="rounded-[22px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/58 px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{payment.id}</p>
                                <AdminBadge tone={paymentTone(payment.type)}>{payment.type}</AdminBadge>
                                <StatusBadge value={payment.status} />
                              </div>
                              <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{payment.description ?? payment.type}</p>
                              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTime(payment.paidAt ?? payment.createdAt)} / {payment.staff ?? '-'}</p>
                            </div>
                            <div className="text-right">
                              <MoneyDisplay value={payment.amount} tone={paymentTone(payment.type)} strong className="text-base" />
                              <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{payment.method}</p>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-5 py-8 text-center text-sm text-[rgb(var(--text-secondary))]">
                          {t('paymentOps.history.empty')}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                <div className="space-y-6">
                  {returnSettlementPreview ? (
                    <SectionCard title={t('paymentOps.ui.settlementOrderTitle')} description={t('paymentOps.ui.settlementOrderDesc')}>
                      <div className="grid gap-3">
                        <MoneyFocusTile
                          label={t('paymentOps.ui.riskStep')}
                          value={riskFeesToSettleNow}
                          helper={t('paymentOps.ui.riskStepDetail', {
                            deposit: formatVnd(riskFeesCoveredByDeposit),
                            cash: formatVnd(riskFeesCustomerTopUp),
                          })}
                          tone={riskFeesToSettleNow > 0 ? 'danger' : 'neutral'}
                        />
                        <MoneyFocusTile
                          label={t('paymentOps.ui.rentalStep')}
                          value={rentalToCollectNow}
                          helper={t('paymentOps.ui.rentalStepDetail', {
                            deposit: formatVnd(rentalCoveredByDeposit),
                            cash: formatVnd(rentalCustomerTopUp),
                          })}
                          tone={rentalToCollectNow > 0 ? 'warning' : 'success'}
                        />
                        <MoneyFocusTile
                          label={t('paymentOps.ui.refundStep')}
                          value={depositToRefundInCurrentAction}
                          helper={refundRequiresSeparateStep ? t('paymentOps.ui.depositToRefundLaterHelp') : t('paymentOps.ui.refundStepHelp')}
                          tone={depositToRefundInCurrentAction > 0 ? 'accent' : 'neutral'}
                        />
                        {depositToRefundLater > 0 ? (
                          <MoneyFocusTile
                            label={t('paymentOps.ui.refundLaterStep')}
                            value={depositToRefundLater}
                            helper={t('paymentOps.ui.refundLaterHelp')}
                            tone="accent"
                          />
                        ) : null}
                        {amountToCollectNow > 0 ? (
                          <MoneyFocusTile
                            label={t('paymentOps.ui.customerPayAfterDeposit')}
                            value={amountToCollectNow}
                            helper={t('paymentOps.ui.customerPayAfterDepositHelp')}
                            tone="danger"
                            strong
                          />
                        ) : null}
                      </div>
                    </SectionCard>
                  ) : null}

                  <SectionCard title={t('paymentOps.ui.moneyFocusTitle')} description={t('paymentOps.ui.moneyFocusDesc')}>
                    <div className="grid gap-3">
                      {returnSettlementPreview ? (
                        <label className="flex items-start gap-3 rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4 text-sm text-[rgb(var(--text-primary))]">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={applyRentalToDeposit}
                            onChange={(event) => setApplyRentalToDeposit(event.target.checked)}
                          />
                          <span>
                            <span className="block font-semibold">{t('paymentOps.ui.applyRentalToDeposit')}</span>
                            <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-secondary))]">
                              {applyRentalToDeposit ? t('paymentOps.ui.applyRentalToDepositHelp') : t('paymentOps.ui.keepRentalSeparateHelp')}
                            </span>
                          </span>
                        </label>
                      ) : null}
                      <MoneyFocusTile
                        label={returnSettlementPreview ? t('paymentOps.ui.rentalCustomerTopUp') : t('paymentOps.ui.rentalToCollect')}
                        value={returnSettlementPreview ? rentalCustomerTopUp : rentalToCollectNow}
                        helper={returnSettlementPreview ? t('paymentOps.ui.rentalCustomerTopUpHelp') : t('paymentOps.ui.rentalToCollectHelp')}
                        tone={(returnSettlementPreview ? rentalCustomerTopUp : rentalToCollectNow) > 0 ? 'warning' : 'success'}
                      />
                      <MoneyFocusTile
                        label={t('paymentOps.ui.depositToCollect')}
                        value={depositToCollectNow}
                        helper={t('paymentOps.ui.depositToCollectHelp')}
                        tone={depositToCollectNow > 0 ? 'warning' : 'neutral'}
                      />
                      <MoneyFocusTile
                        label={depositToRefundLater > 0 ? t('paymentOps.ui.depositToRefundLater') : t('paymentOps.ui.depositToRefund')}
                        value={depositToRefundLater > 0 ? depositToRefundLater : depositToRefundInCurrentAction}
                        helper={depositToRefundLater > 0 ? t('paymentOps.ui.depositToRefundLaterHelp') : t('paymentOps.ui.depositToRefundHelp')}
                        tone={(depositToRefundLater > 0 ? depositToRefundLater : depositToRefundInCurrentAction) > 0 ? 'accent' : 'neutral'}
                      />
                      <MoneyFocusTile
                        label={amountToCollectNow > 0 ? t('paymentOps.ui.amountToCollectNow') : t('paymentOps.ui.amountToRefundNow')}
                        value={amountToCollectNow > 0 ? amountToCollectNow : depositToRefundInCurrentAction}
                        helper={amountToCollectNow > 0 ? t('paymentOps.ui.amountToCollectNowHelp') : t('paymentOps.ui.amountToRefundNowHelp')}
                        tone={amountToCollectNow > 0 ? 'danger' : depositToRefundInCurrentAction > 0 ? 'accent' : 'success'}
                        strong
                      />
                    </div>
                  </SectionCard>

                  {primaryActionMetaResolved && headerPrimaryAction ? (
                    <SectionCard title={t('paymentOps.ui.currentAction')} description={t('paymentOps.ui.currentActionDesc')}>
                      <div className={cn('rounded-[24px] border px-4 py-4', actionTheme(headerPrimaryAction.kind).card)}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', actionTheme(headerPrimaryAction.kind).badge)}>
                          {primaryActionMetaResolved.step}
                        </p>
                        <p className="mt-2 text-base font-semibold text-[rgb(var(--text-primary))]">
                          {primaryActionMetaResolved.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                          {primaryActionMetaResolved.description}
                        </p>
                        {headerPrimaryAction.kind === 'settle-return' ? (
                          <div className="mt-4 rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-white/70 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary))]">
                              {t('paymentOps.ui.settlementWillProcess')}
                            </p>
                            <div className="mt-3 space-y-2">
                              {riskFeesCoveredByDeposit > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.riskDeductedFromDeposit')} value={riskFeesCoveredByDeposit} />
                              ) : null}
                              {riskFeesCustomerTopUp > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.riskCustomerTopUp')} value={riskFeesCustomerTopUp} />
                              ) : null}
                              {rentalCoveredByDeposit > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.rentalDeductedFromDeposit')} value={rentalCoveredByDeposit} />
                              ) : null}
                              {rentalCustomerTopUp > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.rentalCustomerTopUp')} value={rentalCustomerTopUp} />
                              ) : null}
                              {depositToRefundInCurrentAction > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.depositToRefund')} value={depositToRefundInCurrentAction} strong />
                              ) : null}
                              {depositToRefundLater > 0 ? (
                                <QuickActionRow label={t('paymentOps.ui.depositToRefundLater')} value={depositToRefundLater} strong />
                              ) : null}
                              {riskFeesCoveredByDeposit <= 0
                              && riskFeesCustomerTopUp <= 0
                              && rentalCoveredByDeposit <= 0
                              && rentalCustomerTopUp <= 0
                              && depositToRefundInCurrentAction <= 0
                              && depositToRefundLater <= 0 ? (
                                <p className="text-sm text-[rgb(var(--text-secondary))]">
                                  {t('paymentOps.ui.settlementNothingElse')}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-4 grid gap-2.5">
                          {headerPrimaryAction.kind === 'settle-return' ? (
                            <AdminButton className={actionTheme('settle-return').button} onClick={() => void finalizeReturnSettlement()} loading={busyAction === 'finalize-return-settlement'} disabled={!canFinalizeReturnSettlement}>
                              Chốt quyết toán nhận trả
                            </AdminButton>
                          ) : null}
                          {headerPrimaryAction.kind === 'refund' ? (
                            <AdminButton className={actionTheme('refund').button} onClick={() => void refundDeposit()} loading={busyAction === 'refund-deposit'} disabled={!canRefundDeposit}>
                              Trả cọc lại cho khách
                            </AdminButton>
                          ) : null}
                          {headerPrimaryAction.kind === 'collect' ? (
                            <AdminButton
                              className={actionTheme('collect').button}
                              onClick={() => {
                                if (collectPrimaryMode === 'deposit') {
                                  void collectDeposit(active?.summary.securityDepositRemainingForSelectedRate || Number(amount || 0));
                                  return;
                                }
                                if (collectPrimaryMode === 'rental') {
                                  void collectRental(active?.summary.rentalRemaining || Number(amount || 0));
                                }
                              }}
                              loading={busyAction === (collectPrimaryMode === 'deposit' ? 'collect-deposit' : 'collect-rental')}
                              disabled={!collectPrimaryMode}
                            >
                              {collectPrimaryMode === 'deposit' ? t('payment.actions.collect_deposit') : t('payment.actions.collect_rental')}
                            </AdminButton>
                          ) : null}
                          {headerPrimaryAction.kind === 'pickup' && active ? (
                            <Link href={`/admin/pickup?booking=${active.id}`} className={cn('button-primary text-center', actionTheme('pickup').button)}>
                              {t('paymentOps.actions.open_pickup')}
                            </Link>
                          ) : null}
                          {headerPrimaryAction.kind === 'receipt' ? (
                            <AdminButton variant="secondary" onClick={() => void printReceipt()} loading={busyAction === 'print-receipt'} disabled={!latestCompletedPayment}>
                              {t('payment.actions.print_receipt')}
                            </AdminButton>
                          ) : null}
                          {headerPrimaryAction.kind === 'done' ? (
                            <div className="rounded-[18px] border border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/8 px-4 py-3 text-sm font-semibold text-[rgb(var(--success))]">
                              Đơn thuê đã hoàn tất.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </SectionCard>
                  ) : null}

                  <SectionCard title={t('paymentOps.actions.panel')} description={t('paymentOps.workspace.description')}>
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('paymentOps.actions.method')}
                        <AdminSelect value={method} onChange={(event) => setMethod(event.target.value as PaymentMethodValue)} disabled={receiptOnlyMode}>
                          {METHOD_OPTIONS.map((option) => (
                            <option key={option} value={option}>{t(`payment.method.${option}`)}</option>
                          ))}
                        </AdminSelect>
                      </label>

                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('paymentOps.actions.amount')}
                        <MoneyInput value={amount} onValueChange={setAmount} disabled={receiptOnlyMode} />
                      </label>

                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('common.notes')}
                        <AdminInput value={description} onChange={(event) => setDescription(event.target.value)} disabled={receiptOnlyMode} />
                      </label>

                      <div className="grid gap-2.5">
                        {hasReturnSettlementDraft ? (
                          <AdminButton onClick={() => void finalizeReturnSettlement()} loading={busyAction === 'finalize-return-settlement'} disabled={!canFinalizeReturnSettlement}>
                            Chốt quyết toán nhận trả
                          </AdminButton>
                        ) : canRefundDeposit ? (
                          <AdminButton className={actionTheme('refund').button} onClick={() => void refundDeposit()} loading={busyAction === 'refund-deposit'} disabled={!canRefundDeposit}>
                            Trả cọc lại cho khách
                          </AdminButton>
                        ) : hasCollectActions ? (
                          <>
                            <AdminButton onClick={() => void collectDeposit(active?.summary.securityDepositRemainingForSelectedRate || Number(amount || 0))} loading={busyAction === 'collect-deposit'} disabled={!canCollectDeposit}>
                              {t('payment.actions.collect_deposit')}
                            </AdminButton>
                            <AdminButton variant="secondary" onClick={() => void collectRental(active?.summary.rentalRemaining || Number(amount || 0))} loading={busyAction === 'collect-rental'} disabled={!canCollectRental}>
                              {t('payment.actions.collect_rental')}
                            </AdminButton>
                          </>
                        ) : null}
                        {receiptOnlyMode ? (
                          <div className="rounded-[18px] border border-[rgb(var(--success))]/20 bg-[rgb(var(--success))]/8 px-4 py-3 text-sm font-semibold text-[rgb(var(--success))]">
                            Đã xử lý xong các khoản tiền.
                          </div>
                        ) : null}
                        <AdminButton variant="secondary" onClick={() => void printReceipt()} loading={busyAction === 'print-receipt'} disabled={!latestCompletedPayment}>
                          {t('payment.actions.print_receipt')}
                        </AdminButton>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title={t('payment.products.title')} description={t('payment.subtitle')}>
                    <div className="space-y-3">
                      {active.products.map((product) => (
                        <div key={product.id} className="rounded-[22px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/58 px-4 py-4">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px_120px] md:items-center">
                            <div className="flex items-start gap-3">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="h-14 w-14 rounded-[16px] object-cover" />
                              ) : null}
                              <div>
                                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
                                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{product.serialNumber ?? product.qrCode ?? product.id}</p>
                              </div>
                            </div>
                            <MoneyDisplay value={product.productValue} tone="info" strong className="text-sm" />
                            <MoneyDisplay value={product.rentalPrice} tone="accent" strong className="text-sm" />
                            <StatusBadge value={product.status ?? 'requested'} tone="neutral" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title={t('payment.summary.amount_due_now')} description={t('paymentOps.workspace.breakdown')}>
                    <div className="space-y-3">
                      <QuickActionRow label={t('payment.deposit.remaining')} value={active.summary.securityDepositRemainingForPickup} />
                      <QuickActionRow label={t('payment.rental.remaining')} value={active.summary.rentalRemaining} />
                      <QuickActionRow label={t('paymentOps.breakdown.fees')} value={active.summary.feesTotal} />
                      {returnSettlementPreview ? <QuickActionRow label="Phí nhận trả chờ quyết toán" value={returnSettlementPreview!.totalCharges} /> : null}
                      <QuickActionRow label={t('common.refundableDeposit')} value={active.summary.refundableDepositAmount} />
                      <QuickActionRow label={t('payment.summary.amount_due_now')} value={active.summary.amountDueNow} strong />
                    </div>
                  </SectionCard>
                </div>
              </div>
            </>
          ) : (
            <SectionCard title={t('paymentOps.context.title')} description={t('paymentOps.queue.description')}>
              <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 px-5 py-8 text-center text-sm text-[rgb(var(--text-secondary))]">
                {loading ? t('common.loading') : t('paymentOps.validation.selectBooking')}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
        </>
      ) : null}
    </>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner />...</div>}>
      <PaymentDeskContent />
    </Suspense>
  );
}

function QuickActionRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-[18px] border px-4 py-3',
      strong
        ? 'border-[rgb(var(--accent-strong))]/24 bg-[rgb(var(--accent-strong))]/8'
        : 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60',
    )}>
      <span className="text-sm text-[rgb(var(--text-secondary))]">{label}</span>
      <MoneyDisplay value={value} strong={strong} />
    </div>
  );
}

function CashierMethodTabs({
  method,
  setMethod,
  disabled = false,
}: {
  method: PaymentMethodValue;
  setMethod: (value: PaymentMethodValue) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {METHOD_OPTIONS.map((option) => {
        const active = method === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setMethod(option)}
            disabled={disabled}
            className={cn(
              'rounded-[20px] border px-4 py-3 text-left text-sm font-semibold transition',
              active
                ? 'border-[rgb(var(--accent-strong))]/45 bg-[rgb(var(--accent-strong))]/10 text-[rgb(var(--text-primary))] shadow-sm'
                : 'border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 text-[rgb(var(--text-secondary))]',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {t(`payment.method.${option}`)}
          </button>
        );
      })}
    </div>
  );
}

function CashierBigAmount({
  label,
  amount,
  helper,
  tone = 'neutral',
}: {
  label: string;
  amount: number;
  helper: string;
  tone?: Tone | 'neutral';
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-secondary))]">{label}</p>
      <div className="mt-3">
        <MoneyDisplay
          value={amount}
          strong
          className={cn(
            'text-5xl font-semibold tracking-tight xl:text-6xl',
            tone === 'danger' && 'text-[rgb(var(--danger))]',
            tone === 'accent' && 'text-[rgb(var(--accent-strong))]',
            tone === 'success' && 'text-[rgb(var(--success))]',
            tone === 'warning' && 'text-[rgb(var(--warning))]',
          )}
        />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{helper}</p>
    </div>
  );
}

function CashierQueue({
  rows,
  activeId,
  onSelect,
  loading,
}: {
  rows: BookingDeskRow[];
  activeId?: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const { t } = useI18n();

  return (
    <SectionCard title={t('paymentOps.queue.title')} description={t('paymentOps.queue.description')}>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => {
          const selected = row.id === activeId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={cn(
                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                selected
                  ? 'border-[rgb(var(--accent-strong))]/35 bg-[rgb(var(--accent-strong))]/8 shadow-sm'
                  : 'border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/66 hover:bg-[rgb(var(--surface-3))]/92',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[rgb(var(--text-primary))]" title={row.code}>
                    {compactCode(row.code)}
                  </p>
                  <p className="mt-1 truncate text-sm text-[rgb(var(--text-secondary))]">{row.customer}</p>
                </div>
                <MoneyDisplay value={row.summary.amountDueNow} strong className="text-sm" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge value={row.status} tone={bookingTone(row)} />
                <AdminBadge tone={row.summary.amountDueNow > 0 ? 'warning' : 'info'}>{t(nextStepKey(row))}</AdminBadge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[rgb(var(--text-muted))]">
                <span>{formatDate(row.pickupDate)}</span>
                <span>{formatDate(row.returnDate)}</span>
              </div>
            </button>
          );
        }) : (
          <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-5 py-8 text-center text-sm text-[rgb(var(--text-secondary))]">
            {loading ? t('common.loading') : t('paymentOps.queue.emptyDescription')}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function CashierOperationalSummary({
  summary,
  feesWaiting,
}: {
  summary: BookingSummary;
  feesWaiting: number;
}) {
  const { t } = useI18n();

  return (
    <SectionCard title={t('payment.summary.title')} description={t('paymentOps.workspace.breakdown')}>
      <div className="space-y-3">
        <QuickActionRow label={t('payment.rental.remaining')} value={summary.rentalRemaining} />
        <QuickActionRow label={t('payment.deposit.remaining')} value={summary.securityDepositRemainingForPickup} />
        <QuickActionRow label={t('paymentOps.breakdown.fees')} value={summary.feesTotal} />
        {feesWaiting > 0 ? <QuickActionRow label="Phí chờ quyết toán" value={feesWaiting} /> : null}
        <QuickActionRow label={t('common.refundableDeposit')} value={summary.refundableDepositAmount} />
        <QuickActionRow label={t('payment.summary.amount_due_now')} value={summary.amountDueNow} strong />
      </div>
    </SectionCard>
  );
}

function CashierSettlementSummary({
  show,
  applyRentalToDeposit,
  setApplyRentalToDeposit,
  riskFeesToSettleNow,
  riskFeesCoveredByDeposit,
  rentalCoveredByDeposit,
  amountToCollectNow,
  depositToRefundInCurrentAction,
  depositToRefundLater,
}: {
  show: boolean;
  applyRentalToDeposit: boolean;
  setApplyRentalToDeposit: (value: boolean) => void;
  riskFeesToSettleNow: number;
  riskFeesCoveredByDeposit: number;
  rentalCoveredByDeposit: number;
  amountToCollectNow: number;
  depositToRefundInCurrentAction: number;
  depositToRefundLater: number;
}) {
  const { t } = useI18n();

  if (!show) return null;

  return (
    <SectionCard title={t('paymentOps.ui.returnSettlementTitle')} description={t('paymentOps.ui.returnSettlementDesc')}>
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-4 text-sm text-[rgb(var(--text-primary))]">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={applyRentalToDeposit}
            onChange={(event) => setApplyRentalToDeposit(event.target.checked)}
          />
          <span>
            <span className="block font-semibold">{t('paymentOps.ui.applyRentalToDeposit')}</span>
            <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-secondary))]">
              {applyRentalToDeposit ? t('paymentOps.ui.applyRentalToDepositHelp') : t('paymentOps.ui.keepRentalSeparateHelp')}
            </span>
          </span>
        </label>
        <QuickActionRow label={t('paymentOps.breakdown.fees')} value={riskFeesToSettleNow} />
        <QuickActionRow label={t('paymentOps.ui.riskDeductedFromDeposit')} value={riskFeesCoveredByDeposit} />
        <QuickActionRow label={t('paymentOps.ui.rentalDeductedFromDeposit')} value={rentalCoveredByDeposit} />
        <QuickActionRow label={t('paymentOps.ui.amountToCollectNow')} value={amountToCollectNow} strong={amountToCollectNow > 0} />
        <QuickActionRow label={t('paymentOps.ui.depositToRefund')} value={depositToRefundInCurrentAction} strong={depositToRefundInCurrentAction > 0} />
        {depositToRefundLater > 0 ? (
          <QuickActionRow label={t('paymentOps.ui.depositToRefundLater')} value={depositToRefundLater} strong />
        ) : null}
      </div>
    </SectionCard>
  );
}

function CompactPaymentHistory({
  payments,
  showAll,
  setShowAll,
}: {
  payments: PaymentRow[];
  showAll: boolean;
  setShowAll: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const visiblePayments = showAll ? payments : payments.slice(0, 3);

  return (
    <SectionCard
      title={t('paymentOps.history.title')}
      description={t('paymentOps.history.description')}
      actions={payments.length > 3 ? (
        <AdminButton variant="secondary" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Thu gọn' : 'Xem tất cả'}
        </AdminButton>
      ) : undefined}
    >
      <div className="space-y-3">
        {visiblePayments.length ? visiblePayments.map((payment) => (
          <div key={payment.id} className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge tone={paymentTone(payment.type)}>{payment.type}</AdminBadge>
                  <StatusBadge value={payment.status} />
                </div>
                <p className="mt-2 text-sm text-[rgb(var(--text-primary))]">{payment.description ?? payment.type}</p>
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
              </div>
              <div className="text-right">
                <MoneyDisplay value={payment.amount} strong className="text-sm" />
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{payment.method}</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-5 py-8 text-center text-sm text-[rgb(var(--text-secondary))]">
            {t('paymentOps.history.empty')}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function CompactProductList({ products }: { products: BookingDeskRow['products'] }) {
  const { t } = useI18n();

  return (
    <SectionCard title={t('payment.products.title')} description={t('payment.subtitle')}>
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_110px_92px] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
                <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]" title={product.serialNumber ?? product.qrCode ?? product.id}>
                  {compactCode(product.serialNumber ?? product.qrCode ?? product.id, 10, 6)}
                </p>
              </div>
              <MoneyDisplay value={product.productValue} tone="info" strong className="text-sm" />
              <MoneyDisplay value={product.rentalPrice} tone="accent" strong className="text-sm" />
              <StatusBadge value={product.status ?? 'requested'} tone="neutral" />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MoneyFocusTile({
  label,
  value,
  helper,
  tone,
  strong = false,
}: {
  label: string;
  value: number;
  helper: string;
  tone: Tone;
  strong?: boolean;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-[rgb(var(--danger))]/22 bg-[rgb(var(--danger))]/7'
      : tone === 'warning'
        ? 'border-[rgb(var(--warning))]/22 bg-[rgb(var(--warning))]/7'
        : tone === 'accent'
          ? 'border-[rgb(var(--accent-strong))]/22 bg-[rgb(var(--accent-strong))]/7'
          : tone === 'success'
            ? 'border-[rgb(var(--success))]/22 bg-[rgb(var(--success))]/7'
            : 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60';

  return (
    <div className={cn('rounded-[22px] border px-4 py-4', toneClass)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-2">
        <MoneyDisplay value={value} strong className={cn('text-lg', strong && 'text-xl')} />
      </div>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{helper}</p>
    </div>
  );
}

function formatVnd(value: number) {
  const text = Math.max(0, Math.trunc(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${text} đ`;
}

