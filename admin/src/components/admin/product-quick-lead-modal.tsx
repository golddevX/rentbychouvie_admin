'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { leadsApi } from '@/lib/api';
import { MoneyInput } from './lead-ui';
import { InlineAlert } from './ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect } from './primitives';

type QuickLeadDraft = {
  name: string;
  phone: string;
  pickupDate: string;
  returnDate: string;
  appointmentIntent: 'FITTING' | 'PICKUP' | 'DELIVERY';
  depositType: 'percent' | 'custom_amount';
  depositRate: 30 | 50 | 100;
  customDepositAmount: number | null;
  note: string;
};

type QuickLeadDepositChoice = {
  key: string;
  labelKey: string;
  helperKey: string;
  amount: number;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function leadDepositChoices(productValue: number): {
  defaultAmount: number;
  policyHelperKey: string;
  options: QuickLeadDepositChoice[];
} {
  const normalizedValue = Math.max(Number(productValue || 0), 0);
  if (normalizedValue <= 300000) {
    return {
      defaultAmount: 0,
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

export function ProductQuickLeadModal({
  open,
  product,
  source = 'walk_in',
  onClose,
  onCreated,
}: {
  open: boolean;
  product: { id: string; name: string; productValue: number } | null;
  source?: string;
  onClose: () => void;
  onCreated?: (leadId: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const depositPolicy = useMemo(() => leadDepositChoices(product?.productValue ?? 0), [product?.productValue]);
  const [draft, setDraft] = useState<QuickLeadDraft>({
    name: '',
    phone: '',
    pickupDate: '',
    returnDate: '',
    appointmentIntent: 'FITTING',
    depositType: 'percent',
    depositRate: 50,
    customDepositAmount: null,
    note: '',
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft({
      name: '',
      phone: '',
      pickupDate: '',
      returnDate: '',
      appointmentIntent: 'FITTING',
      depositType: 'custom_amount',
      depositRate: 50,
      customDepositAmount: leadDepositChoices(product?.productValue ?? 0).defaultAmount,
      note: '',
    });
  }, [open, product?.id]);

  const depositPreview = useMemo(() => {
    if (!product) return 0;
    return Number(draft.customDepositAmount ?? depositPolicy.defaultAmount ?? 0);
  }, [depositPolicy.defaultAmount, draft.customDepositAmount, product]);

  const submit = async () => {
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      const phoneDigits = draft.phone.replace(/[^\d]/g, '');
      const fallbackEmail = phoneDigits
        ? `walkin-${phoneDigits}@local.invalid`
        : `walkin-${Date.now()}@local.invalid`;
      const response = await leadsApi.create({
        email: fallbackEmail,
        name: draft.name,
        phone: draft.phone,
        source,
        productIds: [product.id],
        pickupDate: draft.pickupDate ? new Date(draft.pickupDate).toISOString() : undefined,
        returnDate: draft.returnDate ? new Date(draft.returnDate).toISOString() : undefined,
        appointmentIntent: draft.appointmentIntent,
        depositType: 'custom_amount',
        customDepositAmount: draft.customDepositAmount ?? depositPolicy.defaultAmount,
        notes: draft.note || undefined,
      });
      onCreated?.(response.data.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('leadOps.errors.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title={t('inventory.actions.quick_lead')}
      onClose={onClose}
      footer={(
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </AdminButton>
          <AdminButton
            onClick={() => void submit()}
            loading={busy}
            disabled={busy || !product || !draft.name || !draft.phone || !draft.pickupDate || !draft.returnDate}
          >
            {t('leadOps.createLead')}
          </AdminButton>
        </>
      )}
    >
      <div className="grid gap-4">
        {product ? (
          <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
            <span className="font-semibold text-[rgb(var(--text-primary))]">{product.name}</span>
          </div>
        ) : null}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('leadOps.form.name')}
          <AdminInput value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('lead.phone')}
          <AdminInput value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('leadFlow.form.pickupDate')}
            <AdminInput type="datetime-local" value={draft.pickupDate} onChange={(event) => setDraft((current) => ({ ...current, pickupDate: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('leadFlow.form.returnDate')}
            <AdminInput type="datetime-local" value={draft.returnDate} onChange={(event) => setDraft((current) => ({ ...current, returnDate: event.target.value }))} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('leadFlow.form.appointmentIntent')}
          <AdminSelect value={draft.appointmentIntent} onChange={(event) => setDraft((current) => ({ ...current, appointmentIntent: event.target.value as QuickLeadDraft['appointmentIntent'] }))}>
            <option value="FITTING">{t('leadFlow.intent.fitting')}</option>
            <option value="PICKUP">{t('leadFlow.intent.pickup')}</option>
            <option value="DELIVERY">{t('leadFlow.intent.delivery')}</option>
          </AdminSelect>
        </label>

        <div className="grid gap-3">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('leadOps.deposit.policyTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {depositPolicy.options.map((option) => (
              <button
                key={`quick-lead-deposit-${option.key}`}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, depositType: 'custom_amount', customDepositAmount: option.amount }))}
                className={(draft.customDepositAmount ?? depositPolicy.defaultAmount) === option.amount
                  ? 'rounded-full bg-[rgb(var(--accent-solid))] px-4 py-2 text-sm font-semibold text-[rgb(var(--button-primary-text))]'
                  : 'rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))]'}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <InlineAlert tone="info">{t(depositPolicy.policyHelperKey)}</InlineAlert>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('paymentExtra.custom_amount')}
          <MoneyInput value={draft.customDepositAmount} onValueChange={(value) => setDraft((current) => ({ ...current, customDepositAmount: value }))} />
        </label>

        <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
          <span className="font-semibold text-[rgb(var(--text-primary))]">{t('payment.deposit.required')}:</span> {formatVnd(depositPreview)}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
          {t('lead.notes')}
          <textarea className="field h-24 py-3" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
        </label>
      </div>
    </AdminModal>
  );
}
