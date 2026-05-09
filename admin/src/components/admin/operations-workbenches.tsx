'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { leadsApi, paymentsApi } from '@/lib/api';
import { leads as demoLeads, payments as demoPayments, currency } from '@/lib/admin/demo-data';
import { DataTable, InlineAlert, KeyValueList, PageHeader, RailSection, SectionCard, StatusBadge, WorkspaceLayout } from './ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect, AdminSpinner } from './primitives';
import { useI18n } from '@/hooks/useI18n';

type LeadRow = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  request: string;
  budget: number;
  owner: string;
  notes?: string;
  createdAt?: string;
  contactDeadlineAt?: string;
  depositDeadlineAt?: string;
};

type PaymentRow = {
  id: string;
  bookingId: string;
  customer: string;
  type: string;
  method: string;
  status: string;
  amount: number;
  paidAt?: string;
  receiptId?: string;
};

function normalizeStatus(value?: string) {
  return String(value ?? 'new').toLowerCase();
}

function leadNextStepKey(status: string) {
  if (status === 'new') return 'leadOps.next.call';
  if (status === 'contacted') return 'leadOps.next.selectProduct';
  if (status === 'product_selected') return 'leadOps.next.requestDeposit';
  if (status === 'deposit_requested') return 'leadOps.next.receiveDeposit';
  if (status === 'deposit_received') return 'leadOps.next.reviewAppointment';
  if (status === 'appointment_created') return 'leadOps.next.completeAppointment';
  if (status === 'appointment_completed') return 'leadOps.next.convertBooking';
  if (status === 'booking_created') return 'leadOps.next.done';
  return 'leadOps.next.recover';
}

function deadlineText(value: string | undefined, fallbackMs: number, overdueLabel: string) {
  const target = value ? new Date(value).getTime() : Date.now() + fallbackMs;
  const diff = target - Date.now();
  const absMinutes = Math.ceil(Math.abs(diff) / 60000);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return diff >= 0 ? label : `${label} ${overdueLabel}`;
}

function leadFromApi(row: any, labels: { unknownCustomer: string; unassigned: string; fallbackRequest: string }): LeadRow {
  return {
    id: row.id,
    customer: row.customer?.name ?? row.customer ?? row.title ?? labels.unknownCustomer,
    email: row.customer?.email ?? row.email ?? '-',
    phone: row.customer?.phone ?? row.phone ?? '-',
    source: row.source ?? 'web',
    status: normalizeStatus(row.status),
    request: row.notes ?? row.requestedLook ?? row.request ?? labels.fallbackRequest,
    budget: Number(row.quotedPrice ?? row.budget ?? 0),
    owner: row.assignedTo?.fullName ?? row.staff ?? labels.unassigned,
    notes: row.notes,
    createdAt: row.createdAt,
    contactDeadlineAt: row.contactDeadlineAt,
    depositDeadlineAt: row.depositDeadlineAt,
  };
}

function paymentFromApi(row: any): PaymentRow {
  const booking = row.rental?.booking;
  return {
    id: row.id,
    bookingId: booking?.id ?? row.bookingId ?? '-',
    customer: booking?.customer?.name ?? row.customer ?? '-',
    type: normalizeStatus(row.type ?? (row.depositAmount > 0 ? 'booking_deposit' : 'rental_payment')),
    method: normalizeStatus(row.paymentMethod ?? row.method ?? 'pending'),
    status: normalizeStatus(row.status),
    amount: Number(row.amount ?? 0),
    paidAt: row.paidAt ?? row.createdAt ?? row.paidAt,
    receiptId: row.receipts?.[0]?.receiptNumber ?? row.receiptId,
  };
}

export function LeadOperationsWorkbench() {
  const { t } = useI18n();
  const leadLabels = useMemo(() => ({
    unknownCustomer: t('leadOps.fallback.unknownCustomer'),
    unassigned: t('lead.unassigned'),
    fallbackRequest: t('lead.rentalRequest'),
  }), [t]);
  const [rows, setRows] = useState<LeadRow[]>(demoLeads.map((row) => leadFromApi(row, leadLabels)));
  const [activeId, setActiveId] = useState(demoLeads[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'web',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [rows, activeId]);
  const critical = rows.filter((row) => row.status === 'new' || row.status === 'deposit_requested');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.getAll();
      const next = (response.data ?? []).map((row: any) => leadFromApi(row, leadLabels));
      setRows(next.length ? next : demoLeads.map((row) => leadFromApi(row, leadLabels)));
      setActiveId((current) => next.find((row: LeadRow) => row.id === current)?.id ?? next[0]?.id ?? demoLeads[0]?.id ?? '');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.loadFallback'));
      setRows(demoLeads.map((row) => leadFromApi(row, leadLabels)));
      setActiveId(demoLeads[0]?.id ?? '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateLead = async (status: string) => {
    if (!active) return;
    setActionBusy(true);
    setError(null);
    try {
      if (status === 'deposit_requested') {
        await leadsApi.requestDeposit(active.id, { quotedPrice: active.budget || undefined });
      } else if (status === 'contacted') {
        await leadsApi.markContacted(active.id);
      } else {
        await leadsApi.updateStatus(active.id, status.toUpperCase());
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.updateStatusFailed'));
      setRows((current) => current.map((row) => row.id === active.id ? { ...row, status } : row));
    } finally {
      setActionBusy(false);
    }
  };

  const createLead = async () => {
    setActionBusy(true);
    setError(null);
    try {
      await leadsApi.create(createDraft);
      setCreateOpen(false);
      setCreateDraft({ name: '', email: '', phone: '', source: 'web', notes: '' });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.createFailed'));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('leadOps.eyebrow')}
        title={t('leadOps.title')}
        subtitle={t('leadOps.subtitle')}
        nextStep={critical[0] ? `${critical[0].customer}: ${t(`lead.status.${critical[0].status}`)}` : t('leadOps.noBlockers')}
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setCreateOpen(true)}>{t('leadOps.createLead')}</AdminButton>
            <Link href="/admin/bookings/new" className="button-primary">{t('booking.createBooking')}</Link>
          </>
        }
      />

      <WorkspaceLayout
        rail={active ? (
          <>
            <RailSection title={t('leadOps.actionPanel')}>
              <AdminButton className="w-full" onClick={() => updateLead('contacted')} loading={actionBusy}>{t('leadOps.timeline.callLogged')}</AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={() => updateLead('deposit_requested')} loading={actionBusy}>{t('leadOps.actions.requestDeposit')}</AdminButton>
              <Link className="button-secondary w-full text-center" href="/admin/appointments">{t('lead.createAppointment')}</Link>
                    <Link className="button-primary w-full text-center" href={`/admin/leads/${active.id}`}>{t('leadOps.actions.openFlow')}</Link>
            </RailSection>
            <RailSection title={t('leadOps.deposit.hold')}>
              <div className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm">
                <div className="flex items-center justify-between"><span>{t('leadOps.stats.contactSla')}</span><b>{deadlineText(active.contactDeadlineAt, 60 * 60000, t('leadOps.overdue'))}</b></div>
                <div className="mt-2 flex items-center justify-between"><span>{t('leadOps.deposit.window')}</span><b>{active.depositDeadlineAt ? deadlineText(active.depositDeadlineAt, 0, t('leadOps.overdue')) : t('leadOps.notRequested')}</b></div>
              </div>
            </RailSection>
          </>
        ) : null}
      >
        {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
        <SectionCard title={t('leadOps.table.title')} description={t('leadOps.table.description')}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('leadOps.loading')}</div>
          ) : (
            <DataTable
              columns={[t('leadOps.columns.lead'), t('leadOps.columns.sla'), t('leadOps.columns.deposit'), t('leadOps.columns.status'), t('leadOps.columns.nextStep')]}
              rows={rows.map((lead) => [
                <button key={lead.id} className="text-left font-semibold hover:text-[rgb(var(--accent-solid))]" onClick={() => setActiveId(lead.id)}>
                  <span>{lead.customer}</span>
                  <span className="block text-xs font-medium text-[rgb(var(--text-muted))]">{lead.phone}</span>
                </button>,
                deadlineText(lead.contactDeadlineAt, 60 * 60000, t('leadOps.overdue')),
                lead.depositDeadlineAt ? deadlineText(lead.depositDeadlineAt, 0, t('leadOps.overdue')) : t('leadOps.actions.requestDeposit'),
                <StatusBadge key={`status-${lead.id}`} value={lead.status} />,
                t(leadNextStepKey(lead.status)),
              ])}
            />
          )}
        </SectionCard>

        {active ? (
          <SectionCard title={t('leadOps.detail.title')} description={t('leadOps.detail.description')}>
            <KeyValueList
              items={[
                { label: t('lead.customer'), value: active.customer },
                { label: t('lead.phone'), value: active.phone },
                { label: t('lead.email'), value: active.email },
                { label: t('lead.source'), value: t(`leadOps.source.${active.source}`) },
                { label: t('leadOps.detail.depositStatus'), value: <StatusBadge value={active.status} /> },
                { label: t('leadOps.detail.quote'), value: active.budget ? currency(active.budget) : '-' },
              ]}
            />
            <div className="mt-4 rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {active.request}
            </div>
          </SectionCard>
        ) : null}
      </WorkspaceLayout>

      <AdminModal
        open={createOpen}
        title={t('leadOps.modals.createTitle')}
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={createLead} loading={actionBusy} disabled={!createDraft.name || !createDraft.email || !createDraft.phone}>
              {t('leadOps.createLead')}
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.name')}
            <AdminInput value={createDraft.name} onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.email')}
            <AdminInput type="email" value={createDraft.email} onChange={(event) => setCreateDraft((draft) => ({ ...draft, email: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.phone')}
            <AdminInput value={createDraft.phone} onChange={(event) => setCreateDraft((draft) => ({ ...draft, phone: event.target.value }))} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {t('leadOps.form.source')}
            <AdminSelect value={createDraft.source} onChange={(event) => setCreateDraft((draft) => ({ ...draft, source: event.target.value }))}>
              <option value="web">{t('leadOps.source.web')}</option>
              <option value="walk-in">{t('leadOps.source.walk-in')}</option>
              <option value="facebook">{t('leadOps.source.facebook')}</option>
              <option value="zalo">{t('leadOps.source.zalo')}</option>
              <option value="referral">{t('leadOps.source.referral')}</option>
            </AdminSelect>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            {t('leadOps.form.notes')}
            <textarea className="field h-24 py-3" value={createDraft.notes} onChange={(event) => setCreateDraft((draft) => ({ ...draft, notes: event.target.value }))} />
          </label>
        </div>
      </AdminModal>
    </>
  );
}

export function PaymentOperationsWorkbench() {
  const { t } = useI18n();
  const [rows, setRows] = useState<PaymentRow[]>(demoPayments.map(paymentFromApi));
  const [activeId, setActiveId] = useState(demoPayments[0]?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => rows.find((row) => row.id === activeId) ?? rows[0], [rows, activeId]);
  const filteredRows = filter === 'all' ? rows : rows.filter((row) => row.type === filter);
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + row.amount;
    return acc;
  }, {});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await paymentsApi.getAll();
        const next = (response.data ?? []).map(paymentFromApi);
        setRows(next.length ? next : demoPayments.map(paymentFromApi));
        setActiveId(next[0]?.id ?? demoPayments[0]?.id ?? '');
      } catch (err: any) {
        setError(err?.response?.data?.message ?? t('paymentOps.errors.loadFallback'));
        setRows(demoPayments.map(paymentFromApi));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const processActive = async () => {
    if (!active) return;
    setActionBusy(true);
    setError(null);
    try {
      await paymentsApi.process(active.id, `ADMIN-${Date.now()}`);
      const response = await paymentsApi.getAll();
      const next = (response.data ?? []).map(paymentFromApi);
      setRows(next.length ? next : demoPayments.map(paymentFromApi));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paymentOps.errors.processFailed'));
    } finally {
      setActionBusy(false);
    }
  };

  const printActiveReceipt = async () => {
    if (!active) return;
    setActionBusy(true);
    setError(null);
    try {
      await paymentsApi.generateReceipt(active.id);
      const response = await paymentsApi.getAll();
      const next = (response.data ?? []).map(paymentFromApi);
      setRows(next.length ? next : rows);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paymentOps.errors.receiptFailed'));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('paymentOps.eyebrow')}
        title={t('paymentOps.title')}
        subtitle={t('paymentOps.subtitle')}
        nextStep={active ? `${active.customer}: ${t('paymentOps.next.verifyType', { type: t(`paymentOps.type.${active.type}`) })}` : t('paymentOps.next.noPending')}
      />

      <WorkspaceLayout
        rail={active ? (
          <>
            <RailSection title={t('paymentOps.actions.panel')}>
              <Link className="button-primary w-full text-center" href={`/admin/bookings/${active.bookingId}`}>{t('paymentOps.actions.openBooking')}</Link>
              <Link className="button-secondary w-full text-center" href={`/admin/payments?booking=${active.bookingId}`}>{t('payment.fromBooking.amountDue')}</Link>
              <AdminButton variant="secondary" className="w-full" onClick={processActive} loading={actionBusy}>{t('paymentOps.actions.markCompleted')}</AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={printActiveReceipt} loading={actionBusy}>{t('receipt.printBill')}</AdminButton>
            </RailSection>
            <RailSection title={t('paymentOps.split.title')}>
              <div className="space-y-2 text-sm">
                {['booking_deposit', 'rental_payment', 'security_deposit', 'fee', 'refund'].map((type) => (
                  <div key={type} className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-3 py-2">
                    <span>{t(`paymentOps.type.${type}`)}</span>
                    <b>{currency(totals[type] ?? 0)}</b>
                  </div>
                ))}
              </div>
            </RailSection>
          </>
        ) : null}
      >
        {error ? <InlineAlert tone="warning">{error}</InlineAlert> : null}
        <SectionCard title={t('paymentOps.queue.title')} description={t('paymentOps.queue.description')}>
          <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr]">
            <AdminSelect value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">{t('paymentOps.controls.allTypes')}</option>
              <option value="booking_deposit">{t('paymentOps.type.booking_deposit')}</option>
              <option value="rental_payment">{t('paymentOps.type.rental_payment')}</option>
              <option value="security_deposit">{t('paymentOps.type.security_deposit')}</option>
              <option value="fee">{t('payment.type.extra_fee')}</option>
              <option value="refund">{t('paymentOps.type.refund')}</option>
            </AdminSelect>
            <AdminInput value={active?.bookingId ?? ''} readOnly />
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner /> {t('paymentOps.queue.loading')}</div>
          ) : (
            <DataTable
              columns={[t('paymentOps.columns.payment'), t('paymentOps.columns.booking'), t('paymentOps.columns.type'), t('paymentOps.columns.amount'), t('paymentOps.columns.status'), t('paymentOps.columns.action')]}
              rows={filteredRows.map((payment) => [
                <button key={payment.id} className="text-left font-semibold hover:text-[rgb(var(--accent-solid))]" onClick={() => setActiveId(payment.id)}>{payment.id}</button>,
                payment.bookingId,
                t(`paymentOps.type.${payment.type}`),
                currency(payment.amount),
                <StatusBadge key={`status-${payment.id}`} value={payment.status} />,
                payment.status === 'completed' ? t('receipt.receiptBill') : t('paymentOps.actions.verifyPayment'),
              ])}
            />
          )}
        </SectionCard>

        {active ? (
          <SectionCard title={t('paymentOps.timeline.title')} description={t('paymentOps.timeline.description')}>
            <KeyValueList
              items={[
                { label: t('ui.customer'), value: active.customer },
                { label: t('paymentOps.columns.booking'), value: active.bookingId },
                { label: t('paymentOps.columns.type'), value: t(`paymentOps.type.${active.type}`) },
                { label: t('paymentOps.actions.method'), value: t(`paymentOps.method.${active.method}`) },
                { label: t('paymentOps.columns.amount'), value: currency(active.amount) },
                { label: t('receipt.receiptBill'), value: active.receiptId ?? t('receipt.notPrinted') },
              ]}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                active.type === 'booking_deposit' ? t('paymentOps.timeline.locksInventory') : t('paymentOps.timeline.noInventoryLock'),
                active.type === 'security_deposit' ? t('paymentOps.timeline.refundableUntilSettlement') : t('paymentOps.timeline.postedToLedger'),
                active.status === 'completed' ? t('paymentOps.timeline.readyForNextStep') : t('paymentOps.timeline.needsVerification'),
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </WorkspaceLayout>
    </>
  );
}
