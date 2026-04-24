'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { bookingsApi, returnsApi } from '@/lib/api';
import { bookings as demoBookings, currency, type Tone } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import {
  DataTable,
  FeedbackPopup,
  InlineAlert,
  KeyValueList,
  PageHeader,
  SectionCard,
  StatusBadge,
  SummaryRow,
  TimelineList,
} from '@/components/admin/ui';
import { AdminBadge, AdminButton, AdminInput, AdminSelect, AdminSpinner, cn } from '@/components/admin/primitives';

type ReturnCondition = 'clean' | 'dirty' | 'damaged' | 'incomplete';

type ReturnItem = {
  itemId: string;
  qrCode: string;
  serialNumber?: string;
  productName: string;
  variantName?: string | null;
  imageUrl?: string;
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
  totalPrice: number;
  rentalDays: number;
  securityDepositHeld: number;
  items: ReturnItem[];
  latestInspection?: {
    condition: ReturnCondition;
    suggestedFee: number;
    createdAt?: string;
  };
};

type SettlementPreview = {
  lateDays: number;
  lateFee: number;
  damageFee: number;
  cleaningHold: number;
  accessoryLostFee: number;
  nextBookingImpactFee: number;
  totalFees: number;
  refund: number;
};

const CONDITION_OPTIONS: ReturnCondition[] = ['clean', 'dirty', 'damaged', 'incomplete'];

function normalizeStatus(value?: string) {
  return String(value ?? '').toLowerCase();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

function itemImage(item: any) {
  const images = parseImages(item.inventoryItem?.imageUrls);
  return images[0];
}

function conditionTone(condition: ReturnCondition): Tone {
  if (condition === 'clean') return 'success';
  if (condition === 'dirty') return 'warning';
  return 'danger';
}

function bookingFromApi(row: any): ReturnBooking {
  const inspections = row.rental?.returnInspections ?? [];
  return {
    id: row.id,
    code: row.orderCode ?? row.bookingCode ?? row.id,
    customer: row.customer?.name ?? row.customer ?? 'Unknown customer',
    phone: row.customer?.phone ?? row.phone,
    status: normalizeStatus(row.status),
    rentalStatus: normalizeStatus(row.rental?.status),
    pickupDate: row.pickupDate ?? row.startDate ?? row.pickupAt,
    returnDate: row.returnDate ?? row.endDate ?? row.returnAt,
    totalPrice: Number(row.totalPrice ?? row.rentalFee ?? 0),
    rentalDays: Number(row.rentalDays ?? row.durationDays ?? 1),
    securityDepositHeld: Number(row.securityDepositHeld ?? row.refundableDeposit ?? 0),
    items: (row.items ?? []).map((item: any) => ({
      itemId: item.inventoryItemId,
      qrCode: item.inventoryItem?.qrCode ?? item.inventoryItemId,
      serialNumber: item.inventoryItem?.serialNumber,
      productName: item.product?.name ?? '-',
      variantName: [item.variant?.name, item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || null,
      imageUrl: itemImage(item),
    })),
    latestInspection: inspections[0] ? {
      condition: inspections[0].condition,
      suggestedFee: Number(inspections[0].suggestedFee ?? 0),
      createdAt: inspections[0].createdAt,
    } : undefined,
  };
}

function bookingFromDemo(row: any): ReturnBooking {
  return {
    id: row.id,
    code: row.id,
    customer: row.customer,
    phone: row.phone,
    status: row.status,
    rentalStatus: row.status === 'picked_up' ? 'picked_up' : 'in_rental',
    pickupDate: row.pickupAt,
    returnDate: row.returnAt,
    totalPrice: row.rentalFee,
    rentalDays: 3,
    securityDepositHeld: row.refundableDeposit || 500000,
    items: [{
      itemId: row.itemCode,
      qrCode: row.itemCode,
      serialNumber: row.itemCode,
      productName: row.product,
      variantName: row.variant,
    }],
  };
}

function localSuggestion(condition: ReturnCondition, declaredDamageFee: number) {
  if (declaredDamageFee > 0) return declaredDamageFee;
  if (condition === 'dirty') return 500000;
  if (condition === 'damaged') return 1000000;
  if (condition === 'incomplete') return 750000;
  return 0;
}

function estimateLateFee(booking?: ReturnBooking, actualReturnDate?: string) {
  if (!booking?.returnDate || !actualReturnDate) return { lateDays: 0, lateFee: 0 };
  const lateMs = new Date(actualReturnDate).getTime() - new Date(booking.returnDate).getTime();
  const lateDays = Math.max(0, Math.ceil(lateMs / (1000 * 60 * 60 * 24)));
  const dailyLateFee = Math.ceil(booking.totalPrice / Math.max(booking.rentalDays || 1, 1));
  return { lateDays, lateFee: lateDays * dailyLateFee };
}

function buildPreview(params: {
  booking?: ReturnBooking;
  condition: ReturnCondition;
  suggestedFee: number;
  accessoryFee: number;
  dirtyHold: number;
  affectsNextBooking: boolean;
  actualReturnDate: string;
}) {
  const late = estimateLateFee(params.booking, params.actualReturnDate);
  const damageFee = params.condition === 'dirty' ? 0 : params.suggestedFee;
  const cleaningHold = params.condition === 'dirty' ? Math.max(params.dirtyHold, params.suggestedFee) : 0;
  const nextBookingImpactFee = params.affectsNextBooking ? Number(params.booking?.totalPrice ?? 0) : 0;
  const totalFees = late.lateFee + damageFee + cleaningHold + params.accessoryFee + nextBookingImpactFee;
  return {
    lateDays: late.lateDays,
    lateFee: late.lateFee,
    damageFee,
    cleaningHold,
    accessoryLostFee: params.accessoryFee,
    nextBookingImpactFee,
    totalFees,
    refund: Math.max(Number(params.booking?.securityDepositHeld ?? 0) - totalFees, 0),
  };
}

function isReturnReady(booking?: ReturnBooking) {
  return !!booking && ['picked_up', 'return_pending', 'late_return', 'damage_review'].includes(booking.status);
}

function queueTone(booking: ReturnBooking): Tone {
  if (booking.status === 'damage_review' || booking.status === 'late_return') return 'danger';
  if (booking.status === 'return_pending') return 'warning';
  return 'info';
}

function toIsoLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ReturnsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ReturnBooking[]>(demoBookings.map(bookingFromDemo));
  const [activeId, setActiveId] = useState(demoBookings[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [condition, setCondition] = useState<ReturnCondition>('clean');
  const [actualReturnDate, setActualReturnDate] = useState(toIsoLocal(new Date()));
  const [evidenceText, setEvidenceText] = useState('');
  const [notes, setNotes] = useState('');
  const [declaredDamageFee, setDeclaredDamageFee] = useState(0);
  const [accessoryFee, setAccessoryFee] = useState(0);
  const [affectsNextBooking, setAffectsNextBooking] = useState(false);
  const [inspectionFee, setInspectionFee] = useState(0);
  const [settlement, setSettlement] = useState<SettlementPreview | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [activeId, rows]);
  const evidenceImages = useMemo(() => evidenceText.split('\n').map((item) => item.trim()).filter(Boolean), [evidenceText]);
  const suggestedFee = inspectionFee || localSuggestion(condition, declaredDamageFee);
  const dirtyHold = condition === 'dirty' ? 500000 : 0;
  const preview = settlement ?? buildPreview({
    booking: active,
    condition,
    suggestedFee,
    accessoryFee,
    dirtyHold,
    affectsNextBooking,
    actualReturnDate,
  });
  const canSettle = Boolean(active && isReturnReady(active) && active.items.length > 0);

  const loadReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.getAll();
      const next = (response.data ?? []).map(bookingFromApi);
      const queue = next.filter((booking: ReturnBooking) => ['picked_up', 'return_pending', 'late_return', 'damage_review'].includes(booking.status));
      const sourceRows = queue.length ? queue : next;
      setRows(sourceRows.length ? sourceRows : demoBookings.map(bookingFromDemo));
      const queryBooking = new URLSearchParams(window.location.search).get('booking');
      setActiveId((current) =>
        sourceRows.find((booking: ReturnBooking) => booking.id === queryBooking)?.id ??
        sourceRows.find((booking: ReturnBooking) => booking.id === current)?.id ??
        sourceRows[0]?.id ??
        demoBookings[0]?.id ??
        '',
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.loadFallback'));
      setRows(demoBookings.map(bookingFromDemo));
      setActiveId(demoBookings[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSettlement(null);
    setCondition(active?.latestInspection?.condition ?? 'clean');
    setInspectionFee(active?.latestInspection?.suggestedFee ?? 0);
    setNotes('');
    setEvidenceText('');
    setDeclaredDamageFee(0);
    setAccessoryFee(0);
    setAffectsNextBooking(false);
  }, [activeId, active?.latestInspection?.condition, active?.latestInspection?.suggestedFee]);

  const inspectReturn = async () => {
    if (!active) return;
    setBusyAction('inspect');
    setFeedback(null);
    setError(null);
    try {
      const response = await returnsApi.inspect(active.id, {
        condition,
        images: evidenceImages,
        notes,
        declaredDamageFee: declaredDamageFee || undefined,
      });
      setInspectionFee(Number(response.data?.suggestedFee ?? 0));
      setSettlement(null);
      setFeedback({ tone: 'success', message: t('returnOps.success.inspected') });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.inspectFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const settleReturn = async (mode: 'confirm' | 'refund' | 'hold') => {
    if (!active || !canSettle) return;
    setBusyAction(mode);
    setFeedback(null);
    setError(null);
    try {
      const response = await returnsApi.settle(active.id, {
        qrCodes: active.items.map((item) => item.qrCode),
        condition,
        actualReturnDate: new Date(actualReturnDate).toISOString(),
        damageFee: condition === 'dirty' ? undefined : suggestedFee || undefined,
        accessoryLostValues: accessoryFee ? [accessoryFee] : [],
        affectsNextBooking,
        notes,
      });
      setSettlement(response.data?.settlement ?? null);
      setFeedback({ tone: 'success', message: mode === 'refund' ? t('returnOps.success.refundIssued') : mode === 'hold' ? t('returnOps.success.depositHeld') : t('returnOps.success.settled') });
      await loadReturns();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('returnOps.errors.settleFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
      <FeedbackPopup
        feedback={feedback}
        onClose={() => {
          setFeedback(null);
        }}
      />

      <PageHeader
        eyebrow={t('returnOps.eyebrow')}
        title={t('returnOps.title')}
        subtitle={t('returnOps.subtitle')}
        nextStep={active ? `${active.code}: ${preview.totalFees > 0 ? t('returnOps.next.reviewFees') : t('returnOps.next.issueRefund')}` : t('returnOps.next.selectReturn')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={loadReturns} loading={loading}>{t('common.refresh')}</AdminButton>
            <AdminButton variant="secondary" onClick={inspectReturn} loading={busyAction === 'inspect'}>{t('returnOps.actions.runInspection')}</AdminButton>
            <AdminButton onClick={() => settleReturn('confirm')} loading={busyAction === 'confirm'} disabled={!canSettle}>{t('returnOps.actions.confirmReturn')}</AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('returnOps.stats.queue'), value: rows.length, detail: t('returnOps.stats.queueDetail'), tone: 'warning' },
          { label: t('returnOps.stats.condition'), value: t(`returnOps.condition.${condition}`), detail: t('returnOps.stats.conditionDetail'), tone: conditionTone(condition) },
          { label: t('returnOps.stats.deductions'), value: currency(preview.totalFees), detail: t('returnOps.stats.deductionsDetail'), tone: preview.totalFees > 0 ? 'danger' : 'success' },
          { label: t('returnOps.stats.refund'), value: currency(preview.refund), detail: t('returnOps.stats.refundDetail'), tone: preview.refund > 0 ? 'success' : 'warning' },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
        <SectionCard title={t('returnOps.queue.title')} description={t('returnOps.queue.description')}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('common.loading')}</div>
          ) : (
            <div className="space-y-2">
              {rows.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setActiveId(booking.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                    active?.id === booking.id ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[rgb(var(--text-primary))]">{booking.code} / {booking.customer}</p>
                      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTime(booking.returnDate)}</p>
                    </div>
                    <StatusBadge value={booking.status} tone={queueTone(booking)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <AdminBadge tone="info">{booking.items.length} {t('returnOps.queue.items')}</AdminBadge>
                    <AdminBadge tone={booking.securityDepositHeld > 0 ? 'success' : 'warning'}>{currency(booking.securityDepositHeld)}</AdminBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {active ? (
          <div className="space-y-6">
            <SectionCard title={t('returnOps.inspection.title')} description={t('returnOps.inspection.description')}>
              {error ? <div className="mb-4"><InlineAlert tone="warning">{error}</InlineAlert></div> : null}
              {feedback ? <div className="mb-4"><InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert></div> : null}
              {!isReturnReady(active) ? <div className="mb-4"><InlineAlert tone="warning">{t('returnOps.validation.notReady')}</InlineAlert></div> : null}

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('returnOps.context.booking')}</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{active.customer}</h2>
                        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{active.code} / {active.phone ?? '-'}</p>
                      </div>
                      <StatusBadge value={active.status} tone={queueTone(active)} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <ItemPreview item={active.items[0]} />
                    <KeyValueList
                      items={[
                        { label: t('returnOps.context.pickup'), value: formatDateTime(active.pickupDate) },
                        { label: t('returnOps.context.return'), value: formatDateTime(active.returnDate) },
                        { label: t('returnOps.context.deposit'), value: currency(active.securityDepositHeld) },
                        { label: t('returnOps.context.rental'), value: currency(active.totalPrice) },
                      ]}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold">
                      {t('returnOps.inspection.condition')}
                      <AdminSelect value={condition} onChange={(event) => { setCondition(event.target.value as ReturnCondition); setSettlement(null); }}>
                        {CONDITION_OPTIONS.map((option) => <option key={option} value={option}>{t(`returnOps.condition.${option}`)}</option>)}
                      </AdminSelect>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      {t('returnOps.inspection.actualReturn')}
                      <AdminInput type="datetime-local" value={actualReturnDate} onChange={(event) => { setActualReturnDate(event.target.value); setSettlement(null); }} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      {t('returnOps.fees.damageFee')}
                      <AdminInput type="number" min={0} value={declaredDamageFee} onChange={(event) => { setDeclaredDamageFee(Number(event.target.value || 0)); setInspectionFee(0); setSettlement(null); }} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      {t('returnOps.fees.accessoryFee')}
                      <AdminInput type="number" min={0} value={accessoryFee} onChange={(event) => { setAccessoryFee(Number(event.target.value || 0)); setSettlement(null); }} />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-4 py-3 text-sm font-semibold md:col-span-2">
                      {t('returnOps.inspection.affectsNextBooking')}
                      <input type="checkbox" checked={affectsNextBooking} onChange={(event) => { setAffectsNextBooking(event.target.checked); setSettlement(null); }} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                      {t('returnOps.inspection.evidence')}
                      <textarea className="field h-24 py-3" placeholder={t('returnOps.inspection.evidencePlaceholder')} value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold md:col-span-2">
                      {t('returnOps.inspection.notes')}
                      <textarea className="field h-24 py-3" value={notes} onChange={(event) => setNotes(event.target.value)} />
                    </label>
                  </div>
                </div>

                <SectionCard title={t('returnOps.refund.title')} description={t('returnOps.refund.description')} className="shadow-none">
                  <MoneyRow label={t('returnOps.refund.deposit')} value={active.securityDepositHeld} tone="info" />
                  <MoneyRow label={t('returnOps.fees.lateFee')} value={preview.lateFee} tone={preview.lateFee ? 'danger' : 'success'} />
                  <MoneyRow label={t('returnOps.fees.damageFee')} value={preview.damageFee} tone={preview.damageFee ? 'danger' : 'success'} />
                  <MoneyRow label={t('returnOps.fees.accessoryFee')} value={preview.accessoryLostFee} tone={preview.accessoryLostFee ? 'danger' : 'success'} />
                  <MoneyRow label={t('returnOps.fees.dirtyHold')} value={preview.cleaningHold} tone={preview.cleaningHold ? 'warning' : 'success'} />
                  <MoneyRow label={t('returnOps.fees.nextBookingImpact')} value={preview.nextBookingImpactFee} tone={preview.nextBookingImpactFee ? 'danger' : 'success'} />
                  <MoneyRow label={t('returnOps.refund.deductions')} value={preview.totalFees} tone={preview.totalFees ? 'danger' : 'success'} strong />
                  <MoneyRow label={t('returnOps.refund.refund')} value={preview.refund} tone={preview.refund ? 'success' : 'warning'} strong />
                  <MoneyRow label={t('returnOps.refund.hold')} value={Math.max(active.securityDepositHeld - preview.refund, 0)} tone={preview.totalFees ? 'warning' : 'success'} />
                  <div className="mt-5 grid gap-2">
                    <AdminButton variant="secondary" onClick={inspectReturn} loading={busyAction === 'inspect'}>{t('returnOps.actions.runInspection')}</AdminButton>
                    <AdminButton onClick={() => settleReturn('confirm')} loading={busyAction === 'confirm'} disabled={!canSettle}>{t('returnOps.actions.confirmReturn')}</AdminButton>
                    <AdminButton variant="secondary" onClick={() => settleReturn('refund')} loading={busyAction === 'refund'} disabled={!canSettle || preview.refund <= 0}>{t('returnOps.actions.issueRefund')}</AdminButton>
                    <AdminButton variant="secondary" onClick={() => settleReturn('hold')} loading={busyAction === 'hold'} disabled={!canSettle || preview.totalFees <= 0}>{t('returnOps.actions.holdDeposit')}</AdminButton>
                  </div>
                </SectionCard>
              </div>
            </SectionCard>

            <SectionCard title={t('returnOps.items.title')} description={t('returnOps.items.description')}>
              <DataTable
                columns={[t('returnOps.items.item'), t('returnOps.items.product'), t('returnOps.items.qr'), t('returnOps.items.condition')]}
                rows={active.items.map((item) => [
                  <div key={`${item.itemId}-item`}>
                    <p className="font-semibold text-[rgb(var(--text-primary))]">{item.serialNumber ?? item.itemId}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">{item.variantName ?? '-'}</p>
                  </div>,
                  item.productName,
                  <span key={`${item.itemId}-qr`} className="font-mono text-xs">{item.qrCode}</span>,
                  <StatusBadge key={`${item.itemId}-condition`} value={t(`returnOps.condition.${condition}`)} tone={conditionTone(condition)} />,
                ])}
              />
            </SectionCard>

            <SectionCard title={t('returnOps.timeline.title')} description={t('returnOps.timeline.description')}>
              <TimelineList
                items={[
                  { time: formatDateTime(active.pickupDate), title: t('returnOps.timeline.pickedUp'), detail: active.customer, tone: 'info' },
                  { time: formatDateTime(active.returnDate), title: t('returnOps.timeline.dueBack'), detail: active.code, tone: 'warning' },
                  active.latestInspection ? { time: formatDateTime(active.latestInspection.createdAt), title: t('returnOps.timeline.inspected'), detail: currency(active.latestInspection.suggestedFee), tone: conditionTone(active.latestInspection.condition) } : null,
                  settlement ? { time: formatDateTime(new Date().toISOString()), title: t('returnOps.timeline.settled'), detail: currency(settlement.refund), tone: 'success' as Tone } : null,
                ].filter(Boolean) as Array<{ time: string; title: string; detail: string; tone?: Tone }>}
              />
            </SectionCard>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ItemPreview({ item }: { item?: ReturnItem }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4">
      <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-xl bg-[rgb(var(--surface-3))]">
        {item?.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="px-5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('returnOps.inspection.noImage')}</div>
        )}
      </div>
      <p className="mt-3 font-semibold">{item?.productName ?? '-'}</p>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{item?.serialNumber ?? item?.qrCode ?? '-'}</p>
    </div>
  );
}

function MoneyRow({ label, value, tone, strong = false }: { label: string; value: number; tone: Tone; strong?: boolean }) {
  return (
    <div className={cn('mt-2 flex items-center justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3 text-sm', strong && 'border border-[rgb(var(--surface-border))]')}>
      <span className="text-[rgb(var(--text-secondary))]">{label}</span>
      <span className={cn('font-semibold', tone === 'danger' && 'text-[rgb(var(--danger))]', tone === 'warning' && 'text-[rgb(var(--warning))]', tone === 'success' && 'text-[rgb(var(--success))]')}>
        {currency(value)}
      </span>
    </div>
  );
}
