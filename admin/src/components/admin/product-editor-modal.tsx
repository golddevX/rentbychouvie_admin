'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { MoneyInput } from './lead-ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect } from './primitives';

type ProductEditorValue = {
  code: string;
  name: string;
  category: string;
  description: string;
  productValue: number | null;
  rentalPrice: number | null;
  size: string;
  color: string;
  accessories: string;
  images: string[];
  status: 'available' | 'maintenance' | 'damaged' | 'retired';
};

export type ProductEditorInitialValue = Partial<ProductEditorValue> & {
  qrCode?: string | null;
};

function parseImages(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function ProductEditorModal({
  open,
  title,
  initialValue,
  busy = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initialValue?: ProductEditorInitialValue | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (value: ProductEditorValue) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<ProductEditorValue>({
    code: '',
    name: '',
    category: '',
    description: '',
    productValue: null,
    rentalPrice: null,
    size: '',
    color: '',
    accessories: '',
    images: [],
    status: 'available',
  });
  const [imageDraft, setImageDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    const nextImages = parseImages(initialValue?.images);
    setForm({
      code: initialValue?.code ?? '',
      name: initialValue?.name ?? '',
      category: initialValue?.category ?? '',
      description: initialValue?.description ?? '',
      productValue: initialValue?.productValue ?? null,
      rentalPrice: initialValue?.rentalPrice ?? null,
      size: initialValue?.size ?? '',
      color: initialValue?.color ?? '',
      accessories: initialValue?.accessories ?? '',
      images: nextImages,
      status: (initialValue?.status as ProductEditorValue['status']) ?? 'available',
    });
    setImageDraft(nextImages.join('\n'));
  }, [initialValue, open]);

  const colorSwatch = useMemo(() => {
    const value = form.color.trim();
    if (!value) return null;
    return value;
  }, [form.color]);

  const canSubmit = Boolean(form.name.trim() && form.category.trim() && form.productValue !== null && form.rentalPrice !== null);

  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </AdminButton>
          <AdminButton
            onClick={() => void onSubmit({
              ...form,
              images: imageDraft
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean),
            })}
            loading={busy}
            disabled={busy || !canSubmit}
          >
            {t('common.save')}
          </AdminButton>
        </>
      )}
    >
      <div className="grid gap-6">
        <section className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.main.title')}</p>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('inventory.form.main.description')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('inventory.form.fields.name')}
              <AdminInput value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('inventory.form.fields.code')}
              <AdminInput value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('inventory.form.fields.category')}
              <AdminInput value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('inventory.form.fields.description')}
              <textarea className="field h-28 py-3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.pricing.title')}</p>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('inventory.form.pricing.description')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('product.value')}
              <MoneyInput value={form.productValue} onValueChange={(value) => setForm((current) => ({ ...current, productValue: value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('product.rental_price')}
              <MoneyInput value={form.rentalPrice} onValueChange={(value) => setForm((current) => ({ ...current, rentalPrice: value }))} />
            </label>
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.attributes.title')}</p>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('inventory.form.attributes.description')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('inventory.form.fields.size')}
              <AdminInput value={form.size} onChange={(event) => setForm((current) => ({ ...current, size: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
              {t('inventory.form.fields.color')}
              <div className="flex items-center gap-3">
                <AdminInput className="flex-1" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
                {colorSwatch ? (
                  <span
                    className="h-10 w-10 rounded-full border border-[rgb(var(--surface-border))]"
                    style={{ backgroundColor: colorSwatch }}
                    aria-hidden
                  />
                ) : null}
              </div>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('inventory.form.fields.accessories')}
              <AdminInput value={form.accessories} onChange={(event) => setForm((current) => ({ ...current, accessories: event.target.value }))} />
            </label>
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.images.title')}</p>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('inventory.form.images.description')}</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('inventory.form.fields.images')}
            <textarea className="field h-28 py-3" value={imageDraft} onChange={(event) => setImageDraft(event.target.value)} placeholder={t('inventory.form.images.placeholder')} />
          </label>
          {imageDraft.trim() ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {imageDraft.split('\n').map((entry) => entry.trim()).filter(Boolean).map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60">
                  <img src={image} alt={`${form.name || 'product'}-${index + 1}`} className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.qr.title')}</p>
            <p className="text-sm text-[rgb(var(--text-secondary))]">{t('inventory.form.qr.description')}</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
            {t('common.status')}
            <AdminSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProductEditorValue['status'] }))}>
              <option value="available">{t('product.status.available')}</option>
              <option value="maintenance">{t('product.status.maintenance')}</option>
              <option value="damaged">{t('product.status.damaged')}</option>
              <option value="retired">{t('product.status.retired')}</option>
            </AdminSelect>
          </label>
        </section>
      </div>
    </AdminModal>
  );
}
