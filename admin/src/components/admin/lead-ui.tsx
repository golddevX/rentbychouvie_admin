'use client';

import { useEffect, useMemo, useState, type InputHTMLAttributes } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { AdminButton, AdminCard, AdminInput, AdminModal, cn } from './primitives';

export type LeadProductVariantOption = {
  id: string;
  name: string;
  size?: string | null;
  color?: string | null;
  imageUrls?: string[];
};

export type LeadProductOption = {
  id: string;
  name: string;
  price: number;
  productValue?: number;
  rentalPrice?: number;
  imageUrl?: string;
  qrCode?: string;
  status?: string;
  variants: LeadProductVariantOption[];
};

const COLOR_MAP: Record<string, string> = {
  black: '#161616',
  white: '#f5f5f1',
  ivory: '#f2eadc',
  cream: '#f7f2df',
  beige: '#c7b9a6',
  nude: '#d6b89a',
  tan: '#af8b62',
  brown: '#6f4e37',
  gold: '#b88a2a',
  silver: '#b7bcc8',
  grey: '#8d93a1',
  gray: '#8d93a1',
  blue: '#496fb3',
  navy: '#243a73',
  green: '#3d7b65',
  emerald: '#1d7c63',
  red: '#b34747',
  burgundy: '#7e3040',
  pink: '#d686a1',
  rose: '#d5969d',
  orange: '#d88743',
  yellow: '#d5ac3d',
  purple: '#6d5c8c',
};

export function formatVndAmount(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return `${Math.max(0, Math.trunc(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`;
}

export function parseImageList(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeKey(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function hashHue(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = input.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function resolveColorSwatch(color?: string | null) {
  const normalized = normalizeKey(color);
  if (!normalized) return 'linear-gradient(135deg, rgba(48,104,96,0.16), rgba(48,104,96,0.38))';
  if (normalized.startsWith('#') || normalized.startsWith('rgb') || normalized.startsWith('hsl')) return normalized;
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  const hue = hashHue(normalized);
  return `hsl(${hue} 42% 62%)`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M13.75 13.75L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M3 6.5L10 3l7 3.5M3 6.5V14l7 3 7-3V6.5M3 6.5l7 3.5m7-3.5L10 10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwatchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 3.25a5.75 5.75 0 1 0 0 11.5c.88 0 1.55-.72 1.55-1.6 0-.36-.12-.7-.33-.97-.25-.32-.4-.72-.4-1.14 0-1.04.84-1.89 1.88-1.89H14a2.75 2.75 0 0 0 0-5.5h-4Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.4" cy="8.1" r="0.9" fill="currentColor" />
      <circle cx="8.85" cy="6.15" r="0.9" fill="currentColor" />
      <circle cx="11.7" cy="6.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 13.75 13.75 4a1.768 1.768 0 0 1 2.5 2.5L6.5 16.25a1.768 1.768 0 1 1-2.5-2.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11 6.75 2.25 2.25M8.75 9l2.25 2.25M6.5 11.25l2.25 2.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MoneyInput({
  value,
  onValueChange,
  placeholder,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value?: number | null;
  onValueChange: (value: number | null) => void;
}) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [rawValue, setRawValue] = useState('');

  useEffect(() => {
    if (focused) return;
    setRawValue(value ? formatVndAmount(value) : '');
  }, [focused, value]);

  return (
    <AdminInput
      {...props}
      className={className}
      inputClassName="text-right tabular-nums"
      inputMode="numeric"
      placeholder={placeholder ?? t('leadUi.moneyInputPlaceholder')}
      value={focused ? rawValue : (value ? formatVndAmount(value) : '')}
      onFocus={(event) => {
        setFocused(true);
        setRawValue(value ? String(Math.trunc(value)) : '');
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        const digits = rawValue.replace(/[^\d]/g, '');
        const nextValue = digits ? Number(digits) : null;
        onValueChange(nextValue);
        setFocused(false);
        props.onBlur?.(event);
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/[^\d]/g, '');
        setRawValue(digits);
        onValueChange(digits ? Number(digits) : null);
      }}
    />
  );
}

export function ColorPicker({
  label,
  helperText,
  options,
  value,
  onChange,
}: {
  label: string;
  helperText?: string;
  options: Array<{ value: string; disabled?: boolean }>;
  value?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{label}</p>
          {helperText ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{helperText}</p> : null}
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))]">
          <SwatchIcon />
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {options.length ? options.map((option) => {
          const active = normalizeKey(option.value) === normalizeKey(value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              title={option.value}
              className={cn(
                'group relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition duration-200',
                'hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.12)]',
                active
                  ? 'border-[rgb(var(--accent-strong))] bg-[rgb(var(--surface-2))] shadow-[0_0_0_3px_rgba(48,104,96,0.12)]'
                  : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
                option.disabled && 'cursor-not-allowed opacity-35 shadow-none',
              )}
            >
              <span
                className="h-7 w-7 rounded-full border border-black/5"
                style={{ background: resolveColorSwatch(option.value) }}
              />
            </button>
          );
        }) : (
          <div className="rounded-[18px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
            {t('leadUi.emptyColors')}
          </div>
        )}
      </div>
    </div>
  );
}

export function SizeSelector({
  label,
  helperText,
  options,
  value,
  onChange,
}: {
  label: string;
  helperText?: string;
  options: Array<{ value: string; disabled?: boolean }>;
  value?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{label}</p>
          {helperText ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{helperText}</p> : null}
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))]">
          <RulerIcon />
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {options.length ? options.map((option) => {
          const active = normalizeKey(option.value) === normalizeKey(value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              className={cn(
                'min-w-[52px] rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200',
                active
                  ? 'bg-[rgb(var(--accent-strong))] text-white shadow-[0_12px_24px_rgba(48,104,96,0.2)]'
                  : 'border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))] hover:-translate-y-0.5 hover:border-[rgb(var(--accent-strong))]/25 hover:text-[rgb(var(--text-primary))]',
                option.disabled && 'cursor-not-allowed opacity-35 shadow-none',
              )}
            >
              {option.value}
            </button>
          );
        }) : (
          <div className="rounded-[18px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">
            {t('leadUi.emptySizes')}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductStatusBadge({ status }: { status?: string }) {
  const normalized = normalizeKey(status) || 'available';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]',
        normalized === 'available' && 'border-[rgb(var(--success))]/18 bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]',
        normalized === 'reserved' && 'border-[rgb(var(--warning))]/18 bg-[rgb(var(--warning))]/11 text-[rgb(var(--warning))]',
        normalized === 'rented' && 'border-[rgb(var(--info))]/18 bg-[rgb(var(--info))]/10 text-[rgb(var(--info))]',
        (normalized === 'maintenance' || normalized === 'damaged') && 'border-[rgb(var(--danger))]/18 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]',
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {normalized}
    </span>
  );
}

export function ProductCardSelect({
  products,
  selectedProductId,
  onSelectProduct,
  buttonLabel,
  title,
  description,
  modalTitle,
  disabled = false,
}: {
  products: LeadProductOption[];
  selectedProductId?: string;
  selectedVariantId?: string;
  selectedColor?: string;
  selectedSize?: string;
  onSelectProduct: (productId: string) => void;
  buttonLabel?: string;
  title?: string;
  description?: string;
  modalTitle?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  const visibleProducts = useMemo(() => {
    const normalized = normalizeKey(query);
    return products.filter((product) => !normalized || normalizeKey(product.name).includes(normalized));
  }, [products, query]);

  const productValue = selectedProduct?.productValue ?? selectedProduct?.price ?? 0;
  const rentalPrice = selectedProduct?.rentalPrice ?? selectedProduct?.price ?? 0;
  const resolvedButtonLabel = buttonLabel ?? t('leadUi.changeProduct');
  const resolvedTitle = title ?? t('leadUi.productTitle');
  const resolvedDescription = description ?? t('leadFlow.helper.productOnlySelection');
  const resolvedModalTitle = modalTitle ?? t('leadUi.productModalTitle');

  return (
    <>
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{resolvedTitle}</p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{resolvedDescription}</p>
          </div>
          <AdminButton variant="secondary" type="button" onClick={() => setOpen(true)} disabled={disabled}>
            {resolvedButtonLabel}
          </AdminButton>
        </div>

        {selectedProduct ? (
          <AdminCard
            padding="sm"
            className="overflow-hidden rounded-[28px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/95 shadow-[0_20px_44px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative aspect-[1/1] w-full overflow-hidden rounded-[24px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))] md:w-[144px]">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[rgb(var(--text-muted))]">
                    <PackageIcon />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('leadUi.selectedProduct')}</p>
                    <h3 className="mt-2 truncate text-2xl font-semibold tracking-[-0.035em] text-[rgb(var(--text-primary))]">
                      {selectedProduct.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                      {t('leadUi.productValue')} {formatVndAmount(productValue)}
                    </p>
                    <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">
                      {t('leadUi.rentalPrice')} {formatVndAmount(rentalPrice)}
                    </p>
                  </div>
                  <ProductStatusBadge status={selectedProduct.status} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('scan.qrCode')}</p>
                    <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{selectedProduct.qrCode || selectedProduct.id}</p>
                  </div>
                  <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('leadUi.rentalPrice')}</p>
                    <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{formatVndAmount(rentalPrice)}</p>
                  </div>
                  <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('leadUi.productValue')}</p>
                    <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{formatVndAmount(productValue)}</p>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))]">
                <PackageIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('leadUi.emptySelectionTitle')}</p>
                <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                  {t('leadUi.emptySelectionDescription')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={resolvedModalTitle}
        size="xl"
        footer={(
          <AdminButton variant="secondary" type="button" onClick={() => setOpen(false)}>
            {t('common.close')}
          </AdminButton>
        )}
      >
        <div className="space-y-5">
          <AdminInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('leadUi.searchPlaceholder')}
            leftIcon={<SearchIcon />}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {visibleProducts.map((product) => {
              const active = product.id === selectedProductId;
              const productValueValue = product.productValue ?? product.price;
              const rentalPriceValue = product.rentalPrice ?? product.price;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(product.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'group overflow-hidden rounded-[28px] border bg-[rgb(var(--surface-2))] text-left shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition duration-200',
                    'hover:-translate-y-0.5 hover:border-[rgb(var(--accent-strong))]/32 hover:shadow-[0_22px_44px_rgba(15,23,42,0.1)]',
                    active ? 'border-[rgb(var(--accent-strong))]/42 ring-1 ring-[rgb(var(--accent-strong))]/18' : 'border-[rgb(var(--surface-border))]/80',
                  )}
                >
                  <div className="grid gap-4 p-4 md:grid-cols-[132px_minmax(0,1fr)]">
                    <div className="relative aspect-[1/1] overflow-hidden rounded-[22px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[rgb(var(--text-muted))]">
                          <PackageIcon />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">{product.name}</p>
                          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('leadUi.productValue')} {formatVndAmount(productValueValue)}</p>
                          <p className="text-sm text-[rgb(var(--text-secondary))]">{t('leadUi.rentalPrice')} {formatVndAmount(rentalPriceValue)}</p>
                        </div>
                        <ProductStatusBadge status={product.status} />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-3.5 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('scan.qrCode')}</p>
                          <p className="mt-2 text-xs font-semibold text-[rgb(var(--text-primary))]">{product.qrCode || product.id}</p>
                        </div>
                        <div className="rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/72 px-3.5 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('common.status')}</p>
                          <p className="mt-2 text-xs font-semibold capitalize text-[rgb(var(--text-primary))]">{product.status || 'available'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!visibleProducts.length ? (
            <div className="rounded-[24px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/72 p-8 text-center">
              <p className="text-base font-semibold text-[rgb(var(--text-primary))]">{t('leadUi.noResultsTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                {t('leadUi.noResultsDescription')}
              </p>
            </div>
          ) : null}
        </div>
      </AdminModal>
    </>
  );
}
