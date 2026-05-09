'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi, paymentsApi, returnsApi } from '@/lib/api';
import { bookings as demoBookings, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import {
  BookingContextCard,
  FeeBreakdown,
  FlowActions,
  MoneyDisplay,
  QueueList,
  RefundBreakdown,
} from '@/components/admin/order-flow-ui';
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
import { AdminButton, AdminInput, AdminSpinner, cn } from '@/components/admin/primitives';

type ReturnConditionUi = 'good' | 'dirty' | 'damaged' | 'missing_accessory' | 'missing_item';
type BackendReturnCondition = 'clean' | 'dirty' | 'damaged' | 'incomplete';

type ReturnItemState = {
  inventoryItemId: string;
  productName: string;
  productId?: string;
  inventoryItemLabel?: string;
  qrCode?: string;
  imageUrl?: string;
  condition: ReturnConditionUi;
  damageFee: number;
  accessoryFee: number;
  returnImages: string[];
};

type ReturnBooking = {
  id: string;
  code: string;
  customer: string;
  phone?: string;
  status: string;
  rentalStatus?: string;
  pickupDate?: string;
  returnDate?: string;
  actualReturnDate?: string;
  totalPrice: number;
  rentalDays: number;
  securityDepositPaid: number;
  refundsTotal: number;
  amountDueAtReturn: number;
  rentalOutstandingAtReturn: number;
  paymentStatus?: string;
  handoverImages: string[];
  returnSettlementPreview?: {
    lateDays: number;
    lateFee: number;
    dirtyFee: number;
    damageFee: number;
    accessoryFee: number;
    otherFee: number;
    applyRentalToDeposit?: boolean;
  };
  items: ReturnItemState[];
};

type ReturnPaymentSummary = {
  securityDepositPaid: number;
  refundsTotal: number;
  amountDueAtReturn: number;
  rentalOutstandingAtReturn?: number;
  paymentStatus?: string;
  returnSettlementPreview?: {
    lateDays?: number;
    lateFee?: number;
    dirtyFee?: number;
    damageFee?: number;
    accessoryFee?: number;
    otherFee?: number;
    applyRentalToDeposit?: boolean;
  };
};

type SettlementPreview = {
  lateDays: number;
  lateFee: number;
  dirtyFee: number;
  damageFee: number;
  accessoryFee: number;
  otherFee: number;
  totalDeductions: number;
  rentalCoveredByDeposit: number;
  rentalCustomerTopUp: number;
  refundNow: number;
  amountDueFromCustomer: number;
};

function normalizeStatus(value?: string) {
  return String(value ?? '').toLowerCase();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function parseImages(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeReturnCondition(value?: string): ReturnConditionUi {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'dirty') return 'dirty';
  if (normalized === 'damaged') return 'damaged';
  if (normalized === 'missing_accessory') return 'missing_accessory';
  if (normalized === 'missing_item') return 'missing_item';
  return 'good';
}

function parseItemFees(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as { damageFee?: number; accessoryFee?: number };
}

function bookingFromApi(row: any, summary?: ReturnPaymentSummary, labels?: { unknownCustomer: string }): ReturnBooking {
  const items = Array.isArray(row.items)
    ? row.items.map((item: any) => ({
        inventoryItemId: item.inventoryItemId ?? item.productId,
        productId: item.productId,
        inventoryItemLabel: item.inventoryItem?.serialNumber ?? undefined,
        productName: item.productNameAtTime ?? item.product?.name ?? item.inventoryItem?.product?.name ?? '-',
        qrCode: item.inventoryItem?.qrCode ?? item.product?.qrCode ?? item.inventoryItemId ?? item.productId,
        imageUrl: item.product?.image ?? item.inventoryItem?.product?.image,
        condition: normalizeReturnCondition(item.condition),
        damageFee: Number(parseItemFees(item.fees).damageFee ?? 0),
        accessoryFee: Number(parseItemFees(item.fees).accessoryFee ?? 0),
        returnImages: parseImages(item.returnImages),
      }))
    : [];
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? labels?.unknownCustomer ?? '-',
    phone: row.customer?.phone ?? row.phone,
    status: normalizeStatus(row.status),
    rentalStatus: normalizeStatus(row.rental?.status),
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    actualReturnDate: row.rental?.actualReturnDate ?? undefined,
    totalPrice: Number(row.totalPrice ?? row.rentalFee ?? 0),
    rentalDays: Number(row.rentalDays ?? row.durationDays ?? 1),
    securityDepositPaid: Number(summary?.securityDepositPaid ?? row.depositPaid ?? row.securityDepositHeld ?? row.refundableDeposit ?? 0),
    refundsTotal: Number(summary?.refundsTotal ?? 0),
    amountDueAtReturn: Number(summary?.amountDueAtReturn ?? 0),
    rentalOutstandingAtReturn: Number(summary?.rentalOutstandingAtReturn ?? summary?.amountDueAtReturn ?? 0),
    paymentStatus: summary?.paymentStatus ? normalizeStatus(summary.paymentStatus) : undefined,
    handoverImages: parseImages(row.handoverRecord?.images),
    returnSettlementPreview: summary?.returnSettlementPreview
      ? {
          lateDays: Number(summary.returnSettlementPreview.lateDays ?? 0),
          lateFee: Number(summary.returnSettlementPreview.lateFee ?? 0),
          dirtyFee: Number(summary.returnSettlementPreview.dirtyFee ?? 0),
          damageFee: Number(summary.returnSettlementPreview.damageFee ?? 0),
          accessoryFee: Number(summary.returnSettlementPreview.accessoryFee ?? 0),
          otherFee: Number(summary.returnSettlementPreview.otherFee ?? 0),
          applyRentalToDeposit: summary.returnSettlementPreview.applyRentalToDeposit !== false,
        }
      : undefined,
    items,
  };
}

function bookingFromDemo(row: any): ReturnBooking {
  return {
    id: row.id,
    code: row.id,
    customer: row.customer,
    phone: row.phone,
    status: normalizeStatus(row.status),
    rentalStatus: row.status === 'picked_up' ? 'picked_up' : 'in_rental',
    pickupDate: row.pickupAt,
    returnDate: row.returnAt,
    actualReturnDate: undefined,
    totalPrice: row.rentalFee,
    rentalDays: 3,
    securityDepositPaid: row.refundableDeposit || 500000,
    refundsTotal: 0,
    amountDueAtReturn: 0,
    rentalOutstandingAtReturn: 0,
    paymentStatus: undefined,
    handoverImages: [],
    returnSettlementPreview: undefined,
    items: [{
      inventoryItemId: row.id,
      productName: row.product,
      qrCode: row.itemCode,
      condition: 'good',
      damageFee: 0,
      accessoryFee: 0,
      returnImages: [],
    }],
  };
}

function backendCondition(items: ReturnItemState[]): BackendReturnCondition {
  if (items.some((item) => item.condition === 'damaged')) return 'damaged';
  if (items.some((item) => item.condition === 'missing_accessory' || item.condition === 'missing_item')) return 'incomplete';
  if (items.some((item) => item.condition === 'dirty')) return 'dirty';
  return 'clean';
}

function estimateLateFee(booking?: ReturnBooking, actualReturnDate?: string) {
  if (!booking?.returnDate || !actualReturnDate) return { lateDays: 0, lateFee: 0 };
  const lateMs = new Date(actualReturnDate).getTime() - new Date(booking.returnDate).getTime();
  const lateDays = Math.max(0, Math.ceil(lateMs / (1000 * 60 * 60 * 24)));
  if (lateDays <= 0) return { lateDays: 0, lateFee: 0 };
  if (lateDays <= 3) return { lateDays, lateFee: lateDays * 20000 };
  return { lateDays, lateFee: 3 * 20000 + (lateDays - 3) * 10000 };
}

function suggestedDamageFeeForItem(item: Pick<ReturnItemState, 'condition' | 'damageFee'>) {
  const declared = Math.max(Number(item.damageFee || 0), 0);
  return declared;
}

function buildPreview(params: {
  booking?: ReturnBooking;
  items: ReturnItemState[];
  actualReturnDate: string;
  lateFee: number;
  dirtyFee: number;
  otherFee: number;
  applyRentalToDeposit: boolean;
}) {
  const late = estimateLateFee(params.booking, params.actualReturnDate);
  const lateFee = Math.max(Number(params.lateFee || 0), 0);
  const damageFee = params.items.reduce((sum, item) => sum + suggestedDamageFeeForItem(item), 0);
  const accessoryFee = params.items.reduce((sum, item) => sum + Math.max(Number(item.accessoryFee || 0), 0), 0);
  const dirtyFee = Math.max(Number(params.dirtyFee || 0), 0);
  const otherFee = Math.max(Number(params.otherFee || 0), 0);
  const totalDeductions = lateFee + dirtyFee + damageFee + accessoryFee + otherFee;
  const securityDepositPaid = Number(params.booking?.securityDepositPaid ?? 0);
  const existingRefunds = Number(params.booking?.refundsTotal ?? 0);
  const rentalOutstanding = Math.max(Number(params.booking?.rentalOutstandingAtReturn || params.booking?.amountDueAtReturn || 0), 0);
  const depositRemaining = Math.max(securityDepositPaid - existingRefunds, 0);
  const depositAfterFees = Math.max(depositRemaining - totalDeductions, 0);
  const rentalCoveredByDeposit = params.applyRentalToDeposit ? Math.min(rentalOutstanding, depositAfterFees) : 0;
  const refundNow = params.applyRentalToDeposit
    ? Math.max(depositAfterFees - rentalOutstanding, 0)
    : depositAfterFees;
  const amountDueFromCustomer = params.applyRentalToDeposit
    ? Math.max(totalDeductions + rentalOutstanding - depositRemaining, 0)
    : Math.max(totalDeductions - depositRemaining, 0);
  const rentalCustomerTopUp = params.applyRentalToDeposit
    ? Math.max(rentalOutstanding - rentalCoveredByDeposit, 0)
    : rentalOutstanding;
  return {
    lateDays: late.lateDays,
    lateFee,
    dirtyFee,
    damageFee,
    accessoryFee,
    otherFee,
    totalDeductions,
    rentalCoveredByDeposit,
    rentalCustomerTopUp,
    refundNow,
    amountDueFromCustomer,
  };
}

function canProcessReturn(booking?: ReturnBooking) {
  return !!booking && ['picked_up', 'return_pending', 'returned'].includes(booking.status);
}

function isSettlementFollowUp(booking?: ReturnBooking) {
  return booking?.status === 'settlement_pending';
}

function queueTone(booking: ReturnBooking): Tone {
  if (booking.status === 'completed') return 'success';
  if (booking.status === 'settlement_pending') return 'danger';
  if (booking.status === 'return_pending') return 'warning';
  if (booking.status === 'returned') return 'accent';
  return 'info';
}

function queuePriority(booking: ReturnBooking) {
  if (booking.status === 'picked_up' || booking.status === 'return_pending') return 1;
  if (booking.status === 'returned') return 2;
  if (booking.status === 'settlement_pending') return 3;
  return 9;
}

function toIsoLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function conditionTone(condition: ReturnConditionUi): Tone {
  if (condition === 'good') return 'success';
  if (condition === 'dirty') return 'warning';
  return 'danger';
}

function ReturnsPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const labels = useMemo(() => ({ unknownCustomer: t('leadOps.fallback.unknownCustomer') }), [t]);
  const searchParams = useSearchParams();
  const { params, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'returnDate',
    sortOrder: 'asc',
  });
  const [rows, setRows] = useState<ReturnBooking[]>(demoBookings.map(bookingFromDemo));
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState(toIsoLocal(new Date()));
  const [notes, setNotes] = useState('');
  const [lateFee, setLateFee] = useState(0);
  const [dirtyFee, setDirtyFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectionSaved, setInspectionSaved] = useState(false);
  const [managerOverride, setManagerOverride] = useState(false);
  const [applyRentalToDeposit, setApplyRentalToDeposit] = useState(true);
  const [draftItems, setDraftItems] = useState<ReturnItemState[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);
  const reviewMode = active?.status === 'completed';
  const preview = useMemo(() => buildPreview({
    booking: active,
    items: draftItems,
    actualReturnDate,
    lateFee,
    dirtyFee,
    otherFee,
    applyRentalToDeposit,
  }), [active, actualReturnDate, applyRentalToDeposit, dirtyFee, draftItems, lateFee, otherFee]);
  const requiresEvidence = draftItems.some((item) => item.condition !== 'good' && item.returnImages.filter(Boolean).length === 0);
  const requiresManagerOverride = preview.totalDeductions >= 1000000 || preview.amountDueFromCustomer > 0;
  const canSettle = Boolean(
    active
    && !reviewMode
    && canProcessReturn(active)
    && draftItems.length > 0
    && inspectionSaved
    && !requiresEvidence
    && (!requiresManagerOverride || managerOverride),
  );

  const loadReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.list({
        page: params.page,
        limit: params.limit,
        sortBy: 'returnDate',
        sortOrder: 'asc',
        statuses: 'PICKED_UP,RETURN_PENDING,RETURNED,SETTLEMENT_PENDING',
      });
      const bookingSource = response.data?.data ?? [];
      setMeta(response.data?.meta ?? { page: params.page, limit: params.limit, total: bookingSource.length, totalPages: bookingSource.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
      const summaryResults = await Promise.allSettled(
        bookingSource.map((booking: any) => paymentsApi.getByBooking(booking.id)),
      );
      const next = bookingSource.map((row: any, index: number) => {
        const summaryResult = summaryResults[index];
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value.data?.summary as ReturnPaymentSummary : undefined;
        return bookingFromApi(row, summary, labels);
      });
      const queryBooking = searchParams.get('booking');
      let sourceRows = next;
      if (queryBooking && !sourceRows.some((booking: ReturnBooking) => booking.id === queryBooking)) {
        try {
          const [bookingRes, paymentRes] = await Promise.all([
            bookingsApi.getById(queryBooking),
            paymentsApi.getByBooking(queryBooking),
          ]);
          sourceRows = [
            bookingFromApi(bookingRes.data, paymentRes.data?.summary as ReturnPaymentSummary | undefined, labels),
            ...sourceRows,
          ];
        } catch {
          // Keep the queue visible even if the review booking cannot be loaded.
        }
      }
      setRows(sourceRows);
      setActiveId((current) => {
        return sourceRows.find((booking: ReturnBooking) => booking.id === queryBooking)?.id
          ?? sourceRows.find((booking: ReturnBooking) => booking.id === current)?.id
          ?? sourceRows[0]?.id
          ?? '';
      });
      if (summaryResults.some((result) => result.status === 'rejected')) {
        setError(t('returnOps.errors.loadFallback'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.loadFallback'));
      setRows(demoBookings.map(bookingFromDemo));
      setMeta({ page: 1, limit: demoBookings.length, total: demoBookings.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
      setActiveId(demoBookings[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReturns();
  }, [params.limit, params.page]);

  useEffect(() => {
    const nextDraftItems = active?.items.map((item) => ({
      ...item,
      condition: item.condition ?? 'good',
      damageFee: Number(item.damageFee ?? 0),
      accessoryFee: Number(item.accessoryFee ?? 0),
      returnImages: item.returnImages.length ? item.returnImages : ['', ''],
    })) ?? [];
    const hasExistingInspection = nextDraftItems.some((item) =>
      item.condition !== 'good'
      || item.damageFee > 0
      || item.accessoryFee > 0
      || item.returnImages.filter(Boolean).length > 0,
    );
    setDraftItems(nextDraftItems);
    setNotes('');
    setActualReturnDate(active?.actualReturnDate ? toIsoLocal(new Date(active.actualReturnDate)) : toIsoLocal(new Date()));
    setLateFee(Number(active?.returnSettlementPreview?.lateFee ?? estimateLateFee(active, active?.actualReturnDate ?? actualReturnDate).lateFee));
    setDirtyFee(Number(active?.returnSettlementPreview?.dirtyFee ?? 0));
    setOtherFee(Number(active?.returnSettlementPreview?.otherFee ?? 0));
    setApplyRentalToDeposit(active?.returnSettlementPreview?.applyRentalToDeposit !== false);
    setManagerOverride(false);
    setInspectionSaved(hasExistingInspection || active?.status === 'returned' || active?.status === 'settlement_pending' || active?.status === 'completed');
  }, [activeId, active?.actualReturnDate, active?.items, actualReturnDate]);

  const updateItem = (inventoryItemId: string, updater: (item: ReturnItemState) => ReturnItemState) => {
    setDraftItems((current) => current.map((item) => item.inventoryItemId === inventoryItemId ? updater(item) : item));
    setInspectionSaved(false);
  };

  const inspectReturn = async () => {
    if (!active || !canProcessReturn(active)) return;
    setBusyAction('inspect');
    setError(null);
    setFeedback(null);
    try {
      await returnsApi.inspect(active.id, {
        condition: backendCondition(draftItems),
        images: draftItems.flatMap((item) => item.returnImages.filter(Boolean)),
        notes,
        declaredDamageFee: draftItems.reduce((sum, item) => sum + item.damageFee, 0),
        items: draftItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          condition: item.condition,
          images: item.returnImages.filter(Boolean),
          damageFee: item.damageFee || undefined,
          accessoryFee: item.accessoryFee || undefined,
        })),
      });
      setInspectionSaved(true);
      setFeedback({ tone: 'success', message: t('return.feedback.inspection_saved') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.inspectFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const settleReturn = async () => {
    if (!active || !canSettle) return;
    setBusyAction('confirm');
    setError(null);
    setFeedback(null);
    try {
      const response = await returnsApi.settle(active.id, {
        condition: backendCondition(draftItems),
        actualReturnDate: new Date(actualReturnDate).toISOString(),
        lateFee: lateFee || undefined,
        dirtyFee: dirtyFee || undefined,
        otherFee: otherFee || undefined,
        notes,
        applyRentalToDeposit,
        items: draftItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          condition: item.condition,
          images: item.returnImages.filter(Boolean),
          damageFee: item.damageFee || undefined,
          accessoryFee: item.accessoryFee || undefined,
        })),
      });
      setFeedback({
        tone: 'success',
        message: 'Đã ghi nhận nhận trả. Mở thanh toán để quyết toán.',
      });
      router.push(`/admin/payments?booking=${active.id}`);
      return response.data;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.settleFailed'));
    } finally {
      setBusyAction(null);
    }
  };
  const headerAction = !active
    ? 'none'
    : reviewMode
      ? 'review'
    : isSettlementFollowUp(active)
      ? 'follow_up'
      : !inspectionSaved
        ? 'inspect'
        : canSettle
          ? 'confirm'
          : 'none';

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />

      <PageHeader
        eyebrow={t('returnOps.eyebrow')}
        title={t('return.title')}
        subtitle={t('return.subtitle')}
        nextStep={active
          ? `${active.code}: ${reviewMode ? t('booking.reviewReturn') : isSettlementFollowUp(active) ? t('return.actions.open_payment') : preview.totalDeductions > 0 ? t('returnOps.next.reviewFees') : t('returnOps.next.issueRefund')}`
          : t('returnOps.next.selectReturn')}
        actions={(
          <>
            <AdminButton variant="secondary" onClick={() => void loadReturns()} loading={loading}>{t('common.refresh')}</AdminButton>
            {headerAction === 'review' && active ? (
              <Link href={`/admin/payments?booking=${active.id}`} className="button-secondary">
                {t('booking.reviewPayment')}
              </Link>
            ) : null}
            {headerAction === 'inspect' ? (
              <AdminButton onClick={() => void inspectReturn()} loading={busyAction === 'inspect'} disabled={!active}>
                {t('return.actions.save_inspection')}
              </AdminButton>
            ) : null}
            {headerAction === 'confirm' ? (
              <AdminButton onClick={() => void settleReturn()} loading={busyAction === 'confirm'} disabled={!canSettle}>
                {t('return.actions.confirm_return')}
              </AdminButton>
            ) : null}
            {headerAction === 'follow_up' && active ? (
              <Link href={`/admin/payments?booking=${active.id}`} className="button-primary">
                {t('return.actions.open_payment')}
              </Link>
            ) : null}
            {active ? (
              <ActionMenu
                label={t('common.moreActions')}
                items={[
                  ...(reviewMode
                    ? [
                        { label: t('booking.reviewPickup'), href: `/admin/pickup?booking=${active.id}` },
                        { label: t('booking.reviewReturn'), href: `/admin/returns?booking=${active.id}` },
                      ]
                    : []),
                  { label: t('return.actions.open_booking'), href: `/admin/bookings/${active.id}` },
                  { label: reviewMode ? t('booking.reviewPayment') : t('return.actions.open_payment'), href: `/admin/payments?booking=${active.id}` },
                  { label: t('return.actions.create_dispute'), href: `/admin/disputes?booking=${active.id}` },
                ]}
              />
            ) : null}
          </>
        )}
      />

      <SummaryRow
        items={[
          { label: t('returnOps.stats.queue'), value: rows.length, detail: t('returnOps.stats.queueDetail'), tone: 'warning' },
          { label: t('returnExtra.inspection_progress'), value: `${draftItems.filter((item) => item.returnImages.filter(Boolean).length > 0).length}/${draftItems.length || 0}`, detail: t('return.inspection.title'), tone: draftItems.length ? 'info' : 'neutral' },
          { label: t('returnExtra.total_deductions'), value: <MoneyDisplay value={preview.totalDeductions} strong />, detail: t('returnOps.stats.deductionsDetail'), tone: preview.totalDeductions > 0 ? 'danger' : 'success' },
          { label: t('return.settlement.refund_now'), value: <MoneyDisplay value={preview.refundNow} strong />, detail: t('returnOps.stats.refundDetail'), tone: preview.refundNow > 0 ? 'success' : 'warning' },
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
          title={t('return.queue.title')}
          description={t('return.queue.description')}
          items={rows.map((booking) => ({
            id: booking.id,
            title: `${booking.code} / ${booking.customer}`,
            subtitle: booking.items.map((item) => item.productName).join(', ') || '-',
            meta: `${t('return.queue.expected_return')}: ${formatDateTime(booking.returnDate)}`,
            helper: booking.status === 'settlement_pending'
              ? t('return.actions.open_payment')
              : booking.status === 'completed'
                ? t('booking.reviewReturn')
              : estimateLateFee(booking, actualReturnDate).lateDays > 0
                ? t('return.queue.late_helper', { count: estimateLateFee(booking, actualReturnDate).lateDays })
                : t('return.queue.on_time_helper'),
            badges: [
              { label: estimateLateFee(booking, actualReturnDate).lateDays > 0 ? t('return.queue.late') : t('return.queue.on_time'), tone: estimateLateFee(booking, actualReturnDate).lateDays > 0 ? 'warning' : 'success' },
              { label: `${booking.items.length} ${t('pickup.missing_products')}`, tone: 'info' },
            ],
            nextStep: booking.status === 'completed' ? t('booking.reviewReturn') : booking.status === 'settlement_pending' ? t('return.actions.open_payment') : t('return.actions.confirm_return'),
            status: booking.status,
            statusTone: queueTone(booking),
          }))}
          activeId={active?.id}
          onSelect={setActiveId}
          emptyState={loading ? (
            <div className="flex items-center gap-2 rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-5 text-sm text-[rgb(var(--text-secondary))]">
              <AdminSpinner />
              {t('common.loading')}
            </div>
          ) : undefined}
        />

        {active ? (
          <div className="space-y-6">
            <BookingContextCard
              eyebrow={t('return.inspection.title')}
              title={`${active.code} / ${active.customer}`}
              subtitle={active.items.map((item) => item.productName).join(', ') || '-'}
              status={active.status}
              statusTone={queueTone(active)}
              badges={[
                { label: reviewMode ? t('booking.reviewReturn') : inspectionSaved ? t('return.badges.inspected') : t('return.badges.pending_inspection'), tone: reviewMode ? 'info' : inspectionSaved ? 'success' : 'warning' },
                { label: `${draftItems.length} ${t('pickup.scan_progress')}`, tone: 'info' },
              ]}
              details={[
                { label: t('common.rental_order_code'), value: active.code },
                { label: t('return.context.customer'), value: active.customer },
                { label: t('return.context.deposit'), value: <MoneyDisplay value={active.securityDepositPaid} tone="info" strong /> },
                { label: t('return.context.pickup'), value: formatDateTime(active.pickupDate) },
                { label: t('return.context.return'), value: formatDateTime(active.returnDate) },
                { label: t('return.context.actual_return'), value: formatDateTime(new Date(actualReturnDate).toISOString()) },
                { label: t('return.context.late_days'), value: preview.lateDays },
                { label: t('returnExtra.returned_product'), value: `${draftItems.length} ${t('booking.products.title')}` },
              ]}
              actions={(
                <FlowActions
                  links={[
                    { href: `/admin/payments?booking=${active.id}`, label: reviewMode ? t('booking.reviewPayment') : t('return.actions.open_payment'), variant: 'secondary' },
                    { href: `/admin/pickup?booking=${active.id}`, label: t('booking.reviewPickup'), variant: 'secondary' },
                    { href: `/admin/disputes?booking=${active.id}`, label: t('return.actions.create_dispute'), variant: 'secondary' },
                    { href: `/admin/bookings/${active.id}`, label: t('return.actions.open_booking'), variant: 'secondary' },
                  ]}
                />
              )}
            />

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-6">
                <SectionCard title={t('return.inspection.title')} description={t('return.inspection.notes')}>
                  <div className="grid gap-3 md:grid-cols-4">
                    <QuickStateRow
                      label={t('return.context.late_days')}
                      value={<span className={cn('font-semibold', preview.lateDays > 0 ? 'text-[rgb(var(--warning))]' : 'text-[rgb(var(--success))]')}>{preview.lateDays}</span>}
                    />
                    <QuickStateRow
                      label={t('returnExtra.total_deductions')}
                      value={<MoneyDisplay value={preview.totalDeductions} strong tone={preview.totalDeductions > 0 ? 'danger' : 'success'} />}
                    />
                    <QuickStateRow
                      label={t('return.settlement.refund_now')}
                      value={<MoneyDisplay value={preview.refundNow} strong tone={preview.refundNow > 0 ? 'success' : 'neutral'} />}
                    />
                    <QuickStateRow
                      label={t('return.badges.pending_inspection')}
                      value={<span className={cn('font-semibold', inspectionSaved ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warning))]')}>{inspectionSaved ? t('return.badges.inspected') : t('return.badges.pending_inspection')}</span>}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {reviewMode ? <InlineAlert tone="success">{t('return.feedback.return_completed')}</InlineAlert> : null}
                    {!reviewMode && !canProcessReturn(active) && !isSettlementFollowUp(active) ? <InlineAlert tone="warning">{t('returnOps.validation.notReady')}</InlineAlert> : null}
                    {isSettlementFollowUp(active) ? <InlineAlert tone="warning">{t('return.actions.open_payment')}</InlineAlert> : null}
                    {!reviewMode && requiresEvidence ? <InlineAlert tone="warning">{t('return.validation.evidence_required')}</InlineAlert> : null}
                    {!reviewMode && requiresManagerOverride && !managerOverride ? <InlineAlert tone="warning">{t('return.validation.manager_override')}</InlineAlert> : null}
                    {!reviewMode && !requiresEvidence && inspectionSaved && (!requiresManagerOverride || managerOverride) ? <InlineAlert tone="success">{t('return.feedback.inspection_saved')}</InlineAlert> : null}
                  </div>
                </SectionCard>

                <SectionCard title={t('return.inspection.title')} description={t('return.subtitle')}>
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                      {t('return.inspection.actual_return')}
                      <AdminInput type="datetime-local" value={actualReturnDate} onChange={(event) => setActualReturnDate(event.target.value)} disabled={reviewMode} />
                    </label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('return.fees.late_fee')}
                        <AdminInput
                          type="text"
                          inputMode="numeric"
                          value={String(lateFee)}
                          disabled={reviewMode}
                          onChange={(event) => setLateFee(Number(event.target.value.replace(/[^\d]/g, '') || 0))}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('paymentOps.ui.dirtyFee')}
                        <AdminInput
                          type="text"
                          inputMode="numeric"
                          value={String(dirtyFee)}
                          disabled={reviewMode}
                          onChange={(event) => setDirtyFee(Number(event.target.value.replace(/[^\d]/g, '') || 0))}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {t('paymentOps.ui.otherFee')}
                        <AdminInput
                          type="text"
                          inputMode="numeric"
                          value={String(otherFee)}
                          disabled={reviewMode}
                          onChange={(event) => setOtherFee(Number(event.target.value.replace(/[^\d]/g, '') || 0))}
                        />
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                      {t('return.inspection.notes')}
                      <textarea className="field h-24 py-3" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={reviewMode} />
                    </label>

                    <label className="flex items-start gap-3 rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 px-4 py-3.5 text-sm text-[rgb(var(--text-primary))]">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={applyRentalToDeposit}
                        disabled={reviewMode}
                        onChange={(event) => setApplyRentalToDeposit(event.target.checked)}
                      />
                      <span>
                        <span className="block font-semibold">{t('paymentOps.ui.applyRentalToDeposit')}</span>
                        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-secondary))]">
                          {applyRentalToDeposit ? t('paymentOps.ui.applyRentalToDepositHelp') : t('paymentOps.ui.keepRentalSeparateHelp')}
                        </span>
                      </span>
                    </label>
                  </div>
                </SectionCard>

                <SectionCard title={t('returnExtra.returned_product')} description={t('return.items.description')}>
                  <div className="space-y-4">
                    {draftItems.map((item) => (
                      <div key={item.inventoryItemId} className="rounded-[24px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/58 p-4">
                        <div className="grid gap-4 xl:grid-cols-[96px_minmax(0,1fr)]">
                          <div className="overflow-hidden rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/70">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="h-24 w-full object-cover" />
                            ) : (
                              <div className="grid h-24 w-full place-items-center text-xs text-[rgb(var(--text-muted))]">{t('return.context.expected_item')}</div>
                            )}
                          </div>

                          <div className="grid gap-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.productName}</p>
                                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{item.qrCode ?? '-'}</p>
                              </div>
                              <StatusBadge value={t(`return.condition.${item.condition}`)} tone={conditionTone(item.condition)} />
                            </div>

                            {active.handoverImages.length ? (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {active.handoverImages.slice(0, 4).map((image, index) => (
                                  <div key={`${item.inventoryItemId}-handover-${index}`} className="overflow-hidden rounded-[16px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/65">
                                    <img src={image} alt={`${item.productName} handover ${index + 1}`} className="h-24 w-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              {(['good', 'dirty', 'damaged', 'missing_accessory', 'missing_item'] as ReturnConditionUi[]).map((condition) => {
                                const activeCondition = item.condition === condition;
                                return (
                                  <button
                                    key={`${item.inventoryItemId}-${condition}`}
                                    type="button"
                                    disabled={reviewMode}
                                    onClick={() => updateItem(item.inventoryItemId, (current) => ({ ...current, condition }))}
                                    className={cn(
                                      'rounded-full px-3.5 py-2 text-sm font-semibold transition duration-200',
                                      activeCondition
                                        ? 'bg-[rgb(var(--accent-strong))] text-[rgb(var(--button-primary-text))]'
                                        : 'border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))]',
                                    )}
                                  >
                                    {t(`return.condition.${condition}`)}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                                {t('return.fees.damage_fee')}
                                <AdminInput
                                  type="text"
                                  inputMode="numeric"
                                  value={String(item.damageFee)}
                                  placeholder={t('return.inspection.amountPlaceholder')}
                                  disabled={reviewMode}
                                  onChange={(event) => updateItem(item.inventoryItemId, (current) => ({
                                    ...current,
                                    damageFee: Number(event.target.value.replace(/[^\d]/g, '') || 0),
                                  }))}
                                />
                                <span className="text-xs font-medium text-[rgb(var(--text-secondary))]">
                                  {t('return.inspection.damageFeeHelper')}
                                </span>
                              </label>
                              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                                {t('return.fees.accessory_fee')}
                                <AdminInput
                                  type="text"
                                  inputMode="numeric"
                                  value={String(item.accessoryFee)}
                                  disabled={reviewMode}
                                  onChange={(event) => updateItem(item.inventoryItemId, (current) => ({
                                    ...current,
                                    accessoryFee: Number(event.target.value.replace(/[^\d]/g, '') || 0),
                                  }))}
                                />
                              </label>
                              {[0, 1].map((slot) => (
                                <label key={`${item.inventoryItemId}-image-${slot}`} className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                                  {`${t('return.inspection.title')} ${slot + 1}`}
                                  <AdminInput
                                    value={item.returnImages[slot] ?? ''}
                                    disabled={reviewMode}
                                    onChange={(event) => updateItem(item.inventoryItemId, (current) => {
                                      const nextImages = [...current.returnImages];
                                      nextImages[slot] = event.target.value;
                                      return { ...current, returnImages: nextImages };
                                    })}
                                    placeholder={t('return.inspection.imagePlaceholder')}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {!reviewMode ? (
                      <>
                        <AdminButton onClick={() => void inspectReturn()} loading={busyAction === 'inspect'} disabled={!canProcessReturn(active)}>
                          {t('return.actions.save_inspection')}
                        </AdminButton>
                        <AdminButton variant="secondary" onClick={() => setManagerOverride((current) => !current)} disabled={!requiresManagerOverride}>
                          {managerOverride ? t('return.actions.manager_override_enabled') : t('return.actions.manager_override')}
                        </AdminButton>
                      </>
                    ) : null}
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-6">
                <FeeBreakdown
                  title={t('return.fees.title')}
                  description={t('return.fees.description')}
                  rows={[
                    { label: t('return.fees.late_fee'), value: preview.lateFee, tone: preview.lateFee > 0 ? 'danger' : 'neutral', helper: preview.lateDays > 0 ? t('return.fees.late_days', { count: preview.lateDays }) : undefined },
                    { label: t('paymentOps.ui.dirtyFee'), value: preview.dirtyFee, tone: preview.dirtyFee > 0 ? 'danger' : 'neutral' },
                    { label: t('return.fees.damage_fee'), value: preview.damageFee, tone: preview.damageFee > 0 ? 'danger' : 'neutral' },
                    { label: t('return.fees.accessory_fee'), value: preview.accessoryFee, tone: preview.accessoryFee > 0 ? 'danger' : 'neutral' },
                    { label: t('paymentOps.ui.otherFee'), value: preview.otherFee, tone: preview.otherFee > 0 ? 'danger' : 'neutral' },
                  ]}
                />

                <RefundBreakdown
                  title={t('return.refund.title')}
                  description={t('return.refund.description')}
                  rows={[
                    { label: t('return.refund.security_deposit'), value: active.securityDepositPaid, tone: 'info' },
                    { label: t('returnExtra.total_deductions'), value: preview.totalDeductions, tone: preview.totalDeductions > 0 ? 'danger' : 'neutral', strong: true },
                    { label: t('payment.rental.remaining'), value: active.rentalOutstandingAtReturn, tone: active.rentalOutstandingAtReturn > 0 ? 'warning' : 'neutral' },
                    { label: t('paymentOps.ui.rentalDeductedFromDeposit'), value: preview.rentalCoveredByDeposit, tone: preview.rentalCoveredByDeposit > 0 ? 'warning' : 'neutral' },
                    { label: t('paymentOps.ui.rentalCustomerTopUp'), value: preview.rentalCustomerTopUp, tone: preview.rentalCustomerTopUp > 0 ? 'warning' : 'neutral' },
                    { label: t('return.settlement.refund_now'), value: preview.refundNow, tone: preview.refundNow > 0 ? 'success' : 'neutral', strong: true },
                    { label: t('return.settlement.amount_due_from_customer'), value: preview.amountDueFromCustomer, tone: preview.amountDueFromCustomer > 0 ? 'danger' : 'neutral', strong: preview.amountDueFromCustomer > 0 },
                  ]}
                  actions={!reviewMode ? (
                    <>
                      <AdminButton onClick={() => void settleReturn()} loading={busyAction === 'confirm'} disabled={!canSettle}>
                        {t('return.actions.confirm_return')}
                      </AdminButton>
                    </>
                  ) : undefined}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner />...</div>}>
      <ReturnsPageContent />
    </Suspense>
  );
}

function QuickStateRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-2 text-sm text-[rgb(var(--text-primary))]">{value}</div>
    </div>
  );
}
