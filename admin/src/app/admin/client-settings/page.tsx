'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminBadge, AdminButton, AdminCard, AdminInput, AdminSelect, cn } from '@/components/admin/primitives';
import { PageHeader, SectionCard, SummaryRow } from '@/components/admin/ui';
import {
  clientSettingsDefaults,
  clientSettingsGroups,
  clientSourceMap,
  defaultClientSettingsVersions,
  sectionKeyBySlug,
  type ClientSettings,
  type ClientSettingsSection,
  type ClientSettingsSectionKey,
  type ClientSettingsVersion,
  type ClientPreviewDevice,
  type FooterLinkSetting,
  type NavItemSetting,
} from '@/lib/admin/client-settings';
import { siteSettingsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

const STORAGE_DRAFT_KEY = 'rental-fashion.client-settings.draft.v1';
const STORAGE_PUBLISHED_KEY = 'rental-fashion.client-settings.published.v1';
const STORAGE_HISTORY_KEY = 'rental-fashion.client-settings.history.v1';
const flatSections = clientSettingsGroups.flatMap((group) => group.items) as Array<{
  slug: ClientSettingsSection;
  label: string;
  description: string;
}>;

function cloneSettings(settings: ClientSettings = clientSettingsDefaults): ClientSettings {
  return JSON.parse(JSON.stringify(settings)) as ClientSettings;
}

function compactIso(value?: string) {
  if (!value) return 'Chưa xuất bản';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sameSettings(a: ClientSettings, b: ClientSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sectionLabel(slug: ClientSettingsSection) {
  return flatSections.find((item) => item.slug === slug)?.label ?? slug;
}

function changedSectionSlugs(a: ClientSettings, b: ClientSettings) {
  return Object.entries(sectionKeyBySlug)
    .filter(([, key]) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map(([slug]) => slug as ClientSettingsSection);
}

function makeVersion({
  settings,
  previous,
  version,
  label,
  status = 'published',
  note,
}: {
  settings: ClientSettings;
  previous?: ClientSettings;
  version: number;
  label: string;
  status?: ClientSettingsVersion['status'];
  note?: string;
}): ClientSettingsVersion {
  const publishedAt = settings.publishedAt ?? new Date().toISOString();
  return {
    id: `client-settings-v${version}-${publishedAt}`,
    version,
    label,
    status,
    settings: cloneSettings(settings),
    createdBy: settings.updatedBy,
    createdAt: new Date().toISOString(),
    publishedAt,
    changedSections: previous ? changedSectionSlugs(previous, settings) : Object.keys(sectionKeyBySlug) as ClientSettingsSection[],
    note,
  };
}

const previewDeviceConfig: Record<ClientPreviewDevice, { label: string; frame: string; widthClass: string; minHeight: string; scale: string }> = {
  desktop: {
    label: 'Desktop',
    frame: '1440 wide',
    widthClass: 'w-full',
    minHeight: 'min-h-[540px]',
    scale: 'Full preview',
  },
  tablet: {
    label: 'Tablet',
    frame: '768 wide',
    widthClass: 'mx-auto w-[320px]',
    minHeight: 'min-h-[520px]',
    scale: 'Scaled tablet',
  },
  mobile: {
    label: 'Mobile',
    frame: '390 wide',
    widthClass: 'mx-auto w-[230px]',
    minHeight: 'min-h-[520px]',
    scale: 'Scaled phone',
  },
};

function TextField({
  label,
  value,
  onChange,
  help,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</span>
      <AdminInput className="mt-2" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {help ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{help}</p> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  help,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</span>
      <AdminInput
        className="mt-2"
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {help ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{help}</p> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</span>
      <textarea
        rows={rows}
        className="mt-2 w-full rounded-[var(--radius-sm)] border border-[rgb(var(--input-border))]/90 bg-[rgb(var(--input-bg))]/95 px-3.5 py-3 text-sm leading-6 text-[rgb(var(--input-text))] shadow-[var(--shadow-soft)] outline-none placeholder:text-[rgb(var(--input-placeholder))] focus:border-[rgb(var(--input-focus-ring))] focus:ring-2 focus:ring-[rgb(var(--input-focus-ring))/14]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{help}</p> : null}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</span>
      <AdminSelect className="mt-2" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </AdminSelect>
      {help ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{help}</p> : null}
    </label>
  );
}

function ListField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  help?: string;
}) {
  const { t } = useI18n();
  return (
    <TextAreaField
      label={label}
      value={value.join('\n')}
      rows={Math.max(3, value.length + 1)}
      onChange={(next) => onChange(splitLines(next))}
      help={help ?? t('clientSettings.oneItemPerLine')}
    />
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-5 rounded-[18px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/55 px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</span>
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition',
          checked
            ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--accent-solid))]'
            : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}

function MultiChoice({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                'rounded-full border px-3 py-2 text-xs font-semibold',
                active
                  ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--accent-solid))] text-white'
                  : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))]',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderedRows<T extends NavItemSetting | FooterLinkSetting>({
  rows,
  onChange,
  hrefLabel = 'URL',
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  hrefLabel?: string;
}) {
  const { t } = useI18n();
  const updateRow = (index: number, patch: Partial<T>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="rounded-[18px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/55 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1.35fr_auto] md:items-end">
            <TextField label={t('clientSettings.rowLabel')} value={row.label} onChange={(value) => updateRow(index, { label: value } as Partial<T>)} />
            <TextField label={hrefLabel} value={row.href} onChange={(value) => updateRow(index, { href: value } as Partial<T>)} />
            <div className="flex items-center gap-2">
              <AdminButton variant="secondary" size="sm" className="h-10 w-10 p-0" disabled={index === 0} onClick={() => move(index, -1)}>
                {t('clientSettings.moveUp')}
              </AdminButton>
              <AdminButton variant="secondary" size="sm" className="h-10 w-10 p-0" disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                {t('clientSettings.moveDown')}
              </AdminButton>
              <AdminButton
                variant={row.visible ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => updateRow(index, { visible: !row.visible } as Partial<T>)}
              >
                {row.visible ? t('clientSettings.visible') : t('clientSettings.hidden')}
              </AdminButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewPanel({
  settings,
  active,
  device,
  onDeviceChange,
  source,
  onSourceChange,
  changedSections,
}: {
  settings: ClientSettings;
  active: ClientSettingsSection;
  device: ClientPreviewDevice;
  onDeviceChange: (device: ClientPreviewDevice) => void;
  source: 'draft' | 'published';
  onSourceChange: (source: 'draft' | 'published') => void;
  changedSections: ClientSettingsSection[];
}) {
  const { t } = useI18n();
  const branding = settings.brandingJson;
  const homepage = settings.homepageJson;
  const catalog = settings.catalogJson;
  const product = settings.productDetailJson;
  const inquiry = settings.inquiryJson;
  const preview = settings.previewJson;
  const navItems = settings.navigationJson.topNavItems.filter((item) => item.visible);

  const previewMode =
    active === 'catalog'
      ? 'catalog'
      : active === 'product-detail'
        ? 'product'
        : active === 'inquiry'
          ? 'inquiry'
          : active === 'preview'
            ? 'preview'
            : active === 'footer'
              ? 'footer'
              : 'home';

  const deviceConfig = previewDeviceConfig[device];

  return (
    <AdminCard className="h-fit overflow-hidden p-0 lg:sticky lg:top-24">
      <div className="border-b border-[rgb(var(--surface-border))] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('clientSettings.livePreview')}</p>
            <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--text-primary))]">{sectionLabel(active)} impact</h3>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{deviceConfig.frame} / {deviceConfig.scale}</p>
          </div>
          <AdminBadge tone={source === 'draft' ? 'accent' : 'success'}>{source === 'draft' ? t('clientSettings.draft') : t('clientSettings.published')}</AdminBadge>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 rounded-[16px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-1">
            {(['draft', 'published'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSourceChange(item)}
                className={cn(
                  'rounded-[12px] px-3 py-2 text-xs font-semibold capitalize',
                  source === item ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-primary))] shadow-[var(--shadow-soft)]' : 'text-[rgb(var(--text-muted))]',
                )}
              >
                {item === 'draft' ? t('clientSettings.draft') : t('clientSettings.published')}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 rounded-[16px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-1">
            {(['desktop', 'tablet', 'mobile'] as ClientPreviewDevice[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onDeviceChange(item)}
                className={cn(
                  'rounded-[12px] px-2 py-2 text-xs font-semibold',
                  device === item ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-primary))] shadow-[var(--shadow-soft)]' : 'text-[rgb(var(--text-muted))]',
                )}
              >
                {t(`clientSettings.device.${item}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface-3))]/70 p-4">
        {/* Intentional storefront preview surface: uses paper-like white/black values to simulate the client-facing site, not the admin chrome. */}
        <div className={cn('overflow-hidden rounded-[22px] border border-[rgb(var(--surface-border))] bg-white shadow-[var(--shadow-panel)] transition-all duration-300', deviceConfig.widthClass)}>
          <div className="flex items-center gap-1.5 border-b border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-4))] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--danger))]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--warning))]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--success))]/60" />
            <span className="ml-2 truncate text-[11px] font-semibold text-[rgb(var(--text-muted))]">{t('clientSettings.storefront')}</span>
          </div>

          <div className={cn('bg-[#f7f5f0] text-[#171717]', deviceConfig.minHeight)}>
            <div className="flex h-16 items-center justify-between border-b border-black/10 px-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-black/42">{t('clientSettings.rentalAtelier')}</p>
                <p className="text-sm font-semibold tracking-[0.1em]">{branding.brandName}</p>
              </div>
              <div className="hidden gap-4 text-[10px] font-semibold text-black/48 sm:flex">
                {navItems.slice(0, 3).map((item) => (
                  <span key={item.href}>{item.label}</span>
                ))}
              </div>
            </div>

            {previewMode === 'home' && (
              <div>
                {homepage.announcementEnabled ? (
                  <div className="border-b border-black/10 bg-[#1d2d29] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/78">
                    {homepage.announcementText}
                  </div>
                ) : null}
                <div className="relative h-[310px] overflow-hidden">
                  <img src={branding.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute bottom-7 left-6 right-6 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/62">{branding.tagline}</p>
                    <h2 className="mt-4 text-5xl font-semibold leading-[0.88] tracking-[-0.045em]">{homepage.heroTitle}</h2>
                    <p className="mt-4 max-w-xs text-xs leading-5 text-white/70">{homepage.heroSubtitle}</p>
                    <span className="mt-5 inline-flex rounded-full border border-white/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                      {homepage.ctaText}
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 p-5">
                  {homepage.editorialBlocks.slice(0, 2).map((block) => (
                    <div key={block} className="rounded-[18px] bg-white/70 p-4">
                      <p className="text-lg font-semibold leading-tight">{block}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewMode === 'catalog' && (
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/42">{t('clientSettings.collection')}</p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.92] tracking-[-0.04em]">{t('clientSettings.collectionHeadline')}</h2>
                <div className="mt-5 grid gap-2 rounded-[18px] bg-white/80 p-3">
                  <div className="flex flex-wrap gap-2">
                    {catalog.visibleFilters.map((filter) => (
                      <span key={filter} className="rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-semibold text-black/55">{filter}</span>
                    ))}
                  </div>
                  <p className="text-xs text-black/50">{t('clientSettings.fields.defaultSort')}: {catalog.defaultSort}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {catalog.categoryOrder.slice(0, 4).map((category, index) => (
                    <div key={category} className="overflow-hidden rounded-[18px] bg-white">
                      <div className="h-32 bg-[#d8cfc3]" />
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/42">{category}</p>
                        <p className="mt-2 text-sm font-semibold">{t('clientSettings.editorialPiece', { index: index + 1 })}</p>
                        <p className="mt-2 text-[11px] text-black/45">{catalog.badgeLogic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewMode === 'product' && (
              <div className="grid gap-4 p-5">
                <div className="h-64 overflow-hidden rounded-[22px] bg-[#d8cfc3]">
                  <img src={branding.heroImage} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="rounded-[22px] bg-white/80 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/42">{t('clientSettings.eveningGown')}</p>
                  <h2 className="mt-2 text-4xl font-semibold leading-none tracking-[-0.04em]">{t('clientSettings.productHeadline')}</h2>
                  <p className="mt-4 text-xs leading-5 text-black/52">{product.rentalNoteBlock}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {product.showStylistNote ? <span className="rounded-full bg-black px-3 py-1.5 text-[10px] text-white">{t('clientSettings.stylistNote')}</span> : null}
                    {product.showMeasurements ? <span className="rounded-full bg-black/8 px-3 py-1.5 text-[10px]">{t('clientSettings.measurements')}</span> : null}
                    {product.showFabrics ? <span className="rounded-full bg-black/8 px-3 py-1.5 text-[10px]">{t('clientSettings.fabrics')}</span> : null}
                  </div>
                </div>
              </div>
            )}

            {previewMode === 'inquiry' && (
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/42">{t('clientSettings.concierge')}</p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.92] tracking-[-0.04em]">{t('clientSettings.inquiryHeadline')}</h2>
                <div className="mt-5 grid gap-3 rounded-[22px] bg-white/86 p-4">
                  {inquiry.enabledFields.map((field) => (
                    <div key={field} className="rounded-[14px] border border-black/10 px-3 py-2 text-xs text-black/52">
                      {field}{inquiry.requiredFields.includes(field) ? ' *' : ''}
                    </div>
                  ))}
                  <p className="text-xs leading-5 text-black/48">{inquiry.helperText}</p>
                </div>
                <div className="mt-4 rounded-[18px] bg-[#1d2d29] p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/48">{t('clientSettings.trust')}</p>
                  <p className="mt-2 text-sm leading-5">{inquiry.trustBlock.join(' / ')}</p>
                </div>
              </div>
            )}

            {previewMode === 'preview' && (
              <div className="bg-[#141414] p-5 text-white">
                <div className="grid min-h-[430px] gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/8 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/44">{t('clientSettings.portraitInput')}</p>
                    <h2 className="mt-4 text-3xl font-semibold leading-none">{preview.enabled ? t('clientSettings.previewDrop') : t('clientSettings.previewDisabled')}</h2>
                    <p className="mt-4 text-xs leading-5 text-white/56">{preview.acceptedFileInfo}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/44">{t('clientSettings.stylistRead')}</p>
                    <p className="mt-4 text-sm leading-6 text-white/70">{preview.reviewCopy}</p>
                    <p className="mt-4 text-xs leading-5 text-white/42">{preview.disclaimer}</p>
                  </div>
                </div>
              </div>
            )}

            {previewMode === 'footer' && (
              <div className="flex min-h-[470px] flex-col justify-end p-5">
                <div className="rounded-[22px] border border-black/10 bg-white/86 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/42">{t('clientSettings.footer')}</p>
                  <p className="mt-3 text-2xl font-semibold leading-tight">{branding.tagline}</p>
                  <div className="mt-5 space-y-2 text-xs text-black/52">
                    <p>{settings.footerJson.contactEmail}</p>
                    <p>{settings.footerJson.hotline} / {settings.footerJson.zalo}</p>
                    <p>{settings.footerJson.address}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {settings.footerJson.footerLinks.filter((item) => item.visible).map((item) => (
                      <span key={item.href} className="rounded-full bg-black/8 px-3 py-1.5 text-[10px]">{item.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-[18px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{t('clientSettings.previewConfidence')}</p>
            <AdminBadge tone={source === 'draft' && changedSections.length ? 'warning' : 'success'}>
              {source === 'draft' && changedSections.length ? t('clientSettings.needsPublish') : t('clientSettings.inSync')}
            </AdminBadge>
          </div>
          <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">
            {source === 'draft'
              ? changedSections.length
                ? t('clientSettings.draftDiffers', { count: changedSections.length })
                : t('clientSettings.draftMatches')
              : t('clientSettings.viewingPublished')}
          </p>
        </div>
      </div>
    </AdminCard>
  );
}

function VersionHistoryDrawer({
  open,
  versions,
  currentPublishedId,
  onClose,
  onRestore,
}: {
  open: boolean;
  versions: ClientSettingsVersion[];
  currentPublishedId?: string;
  onClose: () => void;
  onRestore: (version: ClientSettingsVersion) => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t('clientSettings.closeVersionHistory')}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgb(var(--overlay) / 0.52)' }}
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] shadow-[var(--shadow-float)]">
        <div className="border-b border-[rgb(var(--surface-border))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('clientSettings.versionHistory')}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{t('clientSettings.safeRollback')}</h2>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                {t('clientSettings.versionHistoryDesc')}
              </p>
            </div>
            <AdminButton variant="ghost" className="h-10 w-10 p-0" onClick={onClose}>
              x
            </AdminButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {versions.map((version) => {
              const live = version.id === currentPublishedId;
              return (
                <article key={version.id} className="rounded-[22px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('clientSettings.versionNumber', { version: version.version })}</p>
                        {live ? <AdminBadge tone="success">{t('clientSettings.live')}</AdminBadge> : null}
                        {version.status === 'restored' ? <AdminBadge tone="accent">{t('clientSettings.restored')}</AdminBadge> : null}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">{version.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                        {t('clientSettings.publishedBy', { date: compactIso(version.publishedAt), user: version.createdBy })}
                      </p>
                    </div>
                    <AdminButton variant="secondary" size="sm" onClick={() => onRestore(version)}>
                      {t('clientSettings.restoreDraft')}
                    </AdminButton>
                  </div>

                  {version.note ? <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{version.note}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {version.changedSections.slice(0, 6).map((section) => (
                      <span key={section} className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--text-secondary))]">
                        {sectionLabel(section)}
                      </span>
                    ))}
                    {version.changedSections.length > 6 ? (
                      <span className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--text-muted))]">
                        +{version.changedSections.length - 6} more
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function ClientSettingsPage() {
  const { t } = useI18n();
  const [active, setActive] = useState<ClientSettingsSection>('branding');
  const [draft, setDraft] = useState<ClientSettings>(() => cloneSettings());
  const [savedDraft, setSavedDraft] = useState<ClientSettings>(() => cloneSettings());
  const [published, setPublished] = useState<ClientSettings>(() => cloneSettings());
  const [versionHistory, setVersionHistory] = useState<ClientSettingsVersion[]>(defaultClientSettingsVersions);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<ClientPreviewDevice>('desktop');
  const [previewSource, setPreviewSource] = useState<'draft' | 'published'>('draft');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const storedDraft = window.localStorage.getItem(STORAGE_DRAFT_KEY);
      const storedPublished = window.localStorage.getItem(STORAGE_PUBLISHED_KEY);
      const storedHistory = window.localStorage.getItem(STORAGE_HISTORY_KEY);
      const localDraft = storedDraft ? (JSON.parse(storedDraft) as ClientSettings) : cloneSettings();
      const localPublished = storedPublished ? (JSON.parse(storedPublished) as ClientSettings) : cloneSettings();
      const nextHistory = storedHistory ? (JSON.parse(storedHistory) as ClientSettingsVersion[]) : defaultClientSettingsVersions;

      try {
        const response = await siteSettingsApi.getClient();
        const remotePublished = cloneSettings(response.data as ClientSettings);
        setDraft(storedDraft ? localDraft : remotePublished);
        setSavedDraft(storedDraft ? localDraft : remotePublished);
        setPublished(remotePublished);
        setVersionHistory(nextHistory);
        window.localStorage.setItem(STORAGE_PUBLISHED_KEY, JSON.stringify(remotePublished));
      } catch (error) {
        console.error(error);
        setDraft(localDraft);
        setSavedDraft(localDraft);
        setPublished(localPublished);
        setVersionHistory(nextHistory);
      }
    };

    void bootstrap();
  }, []);

  const hasUnsavedChanges = useMemo(() => !sameSettings(draft, savedDraft), [draft, savedDraft]);
  const hasUnpublishedChanges = useMemo(() => !sameSettings(savedDraft, published), [published, savedDraft]);
  const changedSections = useMemo(() => changedSectionSlugs(published, savedDraft), [published, savedDraft]);
  const latestVersion = versionHistory[0];
  const currentPublishedVersion = useMemo(
    () => versionHistory.find((version) => sameSettings(version.settings, published) || version.publishedAt === published.publishedAt),
    [published, versionHistory],
  );

  const updateSection = <K extends ClientSettingsSectionKey>(key: K, patch: Partial<ClientSettings[K]>) => {
    setDraft((current) => ({
      ...current,
      [key]: {
        ...(current[key] as Record<string, unknown>),
        ...patch,
      },
    }));
    setNotice(null);
  };

  const saveDraft = () => {
    const next = {
      ...draft,
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    setDraft(next);
    setSavedDraft(next);
    window.localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(next));
    setNotice(t('clientSettings.savedNotice'));
  };

  const publish = async () => {
    const previousPublished = cloneSettings(published);
    const next = {
      ...draft,
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    const nextVersion = makeVersion({
      settings: next,
      previous: previousPublished,
      version: (versionHistory[0]?.version ?? 0) + 1,
      label: `${sectionLabel(active)} update`,
      note: changedSectionSlugs(previousPublished, next).length
        ? t('clientSettings.publishedSections', { sections: changedSectionSlugs(previousPublished, next).map(sectionLabel).join(', ') })
        : t('clientSettings.publishedNoDifferences'),
    });
    const nextHistory = [nextVersion, ...versionHistory].slice(0, 20);

    try {
      await siteSettingsApi.updateClient(next);
      setDraft(next);
      setSavedDraft(next);
      setPublished(next);
      setVersionHistory(nextHistory);
      window.localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(next));
      window.localStorage.setItem(STORAGE_PUBLISHED_KEY, JSON.stringify(next));
      window.localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(nextHistory));
      setNotice(t('clientSettings.publishedNotice'));
    } catch (error) {
      console.error(error);
      setNotice('Publish failed. Please retry.');
    }
  };

  const restoreDefaults = () => {
    const next = cloneSettings({
      ...clientSettingsDefaults,
      updatedAt: new Date().toISOString(),
      publishedAt: savedDraft.publishedAt,
    });
    setDraft(next);
    setNotice(t('clientSettings.restoredNotice'));
  };

  const restoreVersionAsDraft = (version: ClientSettingsVersion) => {
    const restored = {
      ...cloneSettings(version.settings),
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
      publishedAt: savedDraft.publishedAt,
    };
    setDraft(restored);
    setPreviewSource('draft');
    setHistoryOpen(false);
    setNotice(t('clientSettings.versionRestoredNotice', { version: version.version }));
  };

  const activeKey = sectionKeyBySlug[active];
  const activeSource = clientSourceMap.find((item) => item.section.toLowerCase().replace(/\s/g, '-').startsWith(active.split('-')[0]));

  const renderSection = () => {
    switch (active) {
      case 'branding':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsBranding.title')} description={t('clientSettings.sectionsBranding.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField label={t('clientSettings.fields.brandName')} value={draft.brandingJson.brandName} onChange={(brandName) => updateSection('brandingJson', { brandName })} />
                <TextField label={t('clientSettings.fields.tagline')} value={draft.brandingJson.tagline} onChange={(tagline) => updateSection('brandingJson', { tagline })} />
                <TextField label={t('clientSettings.fields.logoUrl')} value={draft.brandingJson.logoUrl} onChange={(logoUrl) => updateSection('brandingJson', { logoUrl })} help={t('clientSettings.help.logo')} />
                <TextField label={t('clientSettings.fields.faviconUrl')} value={draft.brandingJson.faviconUrl} onChange={(faviconUrl) => updateSection('brandingJson', { faviconUrl })} />
                <SelectField
                  label={t('clientSettings.fields.accentPreset')}
                  value={draft.brandingJson.accentPreset}
                  options={['atelier green', 'champagne black', 'rose editorial', 'quiet navy']}
                  onChange={(accentPreset) => updateSection('brandingJson', { accentPreset })}
                />
                <TextField label={t('clientSettings.fields.heroImage')} value={draft.brandingJson.heroImage} onChange={(heroImage) => updateSection('brandingJson', { heroImage })} />
              </div>
            </SectionCard>
          </div>
        );

      case 'homepage':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsHomepage.title')} description={t('clientSettings.sectionsHomepage.description')}>
              <div className="space-y-5">
                <ToggleRow
                  label={t('clientSettings.fields.announcementEnabled')}
                  description={t('clientSettings.sectionsHomepage.announcementHelp')}
                  checked={draft.homepageJson.announcementEnabled}
                  onChange={(announcementEnabled) => updateSection('homepageJson', { announcementEnabled })}
                />
                <TextField label={t('clientSettings.fields.announcementText')} value={draft.homepageJson.announcementText} onChange={(announcementText) => updateSection('homepageJson', { announcementText })} />
                <div className="grid gap-5 md:grid-cols-2">
                  <TextField label={t('clientSettings.fields.heroTitle')} value={draft.homepageJson.heroTitle} onChange={(heroTitle) => updateSection('homepageJson', { heroTitle })} />
                  <TextField label={t('clientSettings.fields.ctaText')} value={draft.homepageJson.ctaText} onChange={(ctaText) => updateSection('homepageJson', { ctaText })} />
                </div>
                <TextAreaField label={t('clientSettings.fields.heroSubtitle')} value={draft.homepageJson.heroSubtitle} onChange={(heroSubtitle) => updateSection('homepageJson', { heroSubtitle })} />
              </div>
            </SectionCard>
            <SectionCard title={t('clientSettings.sectionsHomepage.editorialTitle')} description={t('clientSettings.sectionsHomepage.editorialDesc')}>
              <div className="grid gap-5 md:grid-cols-2">
                <ListField label={t('clientSettings.fields.featuredSections')} value={draft.homepageJson.featuredSections} onChange={(featuredSections) => updateSection('homepageJson', { featuredSections })} />
                <ListField label={t('clientSettings.fields.editorialBlocks')} value={draft.homepageJson.editorialBlocks} onChange={(editorialBlocks) => updateSection('homepageJson', { editorialBlocks })} />
              </div>
            </SectionCard>
          </div>
        );

      case 'catalog':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsCatalog.title')} description={t('clientSettings.sectionsCatalog.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  label={t('clientSettings.fields.defaultSort')}
                  value={draft.catalogJson.defaultSort}
                  options={['editorial', 'newest', 'price-low', 'price-high', 'availability']}
                  onChange={(defaultSort) => updateSection('catalogJson', { defaultSort })}
                />
                <TextField label={t('clientSettings.fields.badgeLogic')} value={draft.catalogJson.badgeLogic} onChange={(badgeLogic) => updateSection('catalogJson', { badgeLogic })} />
                <ListField label={t('clientSettings.fields.categoryOrder')} value={draft.catalogJson.categoryOrder} onChange={(categoryOrder) => updateSection('catalogJson', { categoryOrder })} />
                <MultiChoice
                  label={t('clientSettings.fields.visibleFilters')}
                  options={['Search', 'Category', 'Start date', 'End date', 'Size', 'Color', 'Price band', 'Availability']}
                  selected={draft.catalogJson.visibleFilters}
                  onChange={(visibleFilters) => updateSection('catalogJson', { visibleFilters })}
                />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <ToggleRow
                  label={t('clientSettings.fields.showUnavailable')}
                  description={t('clientSettings.sectionsCatalog.unavailableHelp')}
                  checked={draft.catalogJson.showUnavailableItems}
                  onChange={(showUnavailableItems) => updateSection('catalogJson', { showUnavailableItems })}
                />
                <ToggleRow
                  label={t('clientSettings.fields.quickActions')}
                  description={t('clientSettings.sectionsCatalog.quickActionsHelp')}
                  checked={draft.catalogJson.quickActionsEnabled}
                  onChange={(quickActionsEnabled) => updateSection('catalogJson', { quickActionsEnabled })}
                />
              </div>
            </SectionCard>
          </div>
        );

      case 'product-detail':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsProduct.title')} description={t('clientSettings.sectionsProduct.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <ListField label={t('clientSettings.fields.sectionOrder')} value={draft.productDetailJson.sectionOrder} onChange={(sectionOrder) => updateSection('productDetailJson', { sectionOrder })} />
                <div className="space-y-3">
                  <ToggleRow label={t('clientSettings.fields.stylistNote')} description={t('clientSettings.sectionsProduct.stylistHelp')} checked={draft.productDetailJson.showStylistNote} onChange={(showStylistNote) => updateSection('productDetailJson', { showStylistNote })} />
                  <ToggleRow label={t('clientSettings.fields.measurements')} description={t('clientSettings.sectionsProduct.measurementsHelp')} checked={draft.productDetailJson.showMeasurements} onChange={(showMeasurements) => updateSection('productDetailJson', { showMeasurements })} />
                  <ToggleRow label={t('clientSettings.fields.fabrics')} description={t('clientSettings.sectionsProduct.fabricsHelp')} checked={draft.productDetailJson.showFabrics} onChange={(showFabrics) => updateSection('productDetailJson', { showFabrics })} />
                </div>
              </div>
            </SectionCard>
            <SectionCard title={t('clientSettings.sectionsProduct.relatedTitle')} description={t('clientSettings.sectionsProduct.relatedDesc')}>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  label={t('clientSettings.fields.relatedProducts')}
                  value={draft.productDetailJson.relatedProductsMode}
                  options={['same category', 'editorial picks', 'recently viewed']}
                  onChange={(relatedProductsMode) => updateSection('productDetailJson', { relatedProductsMode })}
                />
                <NumberField label={t('clientSettings.fields.relatedLimit')} value={draft.productDetailJson.relatedProductsLimit} min={1} onChange={(relatedProductsLimit) => updateSection('productDetailJson', { relatedProductsLimit })} />
                <div className="md:col-span-2">
                  <TextAreaField label={t('clientSettings.fields.rentalNote')} value={draft.productDetailJson.rentalNoteBlock} onChange={(rentalNoteBlock) => updateSection('productDetailJson', { rentalNoteBlock })} />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case 'inquiry':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsInquiry.title')} description={t('clientSettings.sectionsInquiry.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <MultiChoice
                  label={t('clientSettings.fields.enabledFields')}
                  options={['Name', 'Phone', 'Email', 'Styling notes', 'Event date', 'Budget', 'Preferred fitting window']}
                  selected={draft.inquiryJson.enabledFields}
                  onChange={(enabledFields) => updateSection('inquiryJson', { enabledFields })}
                />
                <MultiChoice
                  label={t('clientSettings.fields.requiredFields')}
                  options={draft.inquiryJson.enabledFields}
                  selected={draft.inquiryJson.requiredFields}
                  onChange={(requiredFields) => updateSection('inquiryJson', { requiredFields })}
                />
                <TextAreaField label={t('clientSettings.fields.helperText')} value={draft.inquiryJson.helperText} onChange={(helperText) => updateSection('inquiryJson', { helperText })} />
                <ListField label={t('clientSettings.fields.trustBlock')} value={draft.inquiryJson.trustBlock} onChange={(trustBlock) => updateSection('inquiryJson', { trustBlock })} />
              </div>
            </SectionCard>
            <SectionCard title={t('clientSettings.sectionsInquiry.notesTitle')} description={t('clientSettings.sectionsInquiry.notesDesc')}>
              <div className="grid gap-5 md:grid-cols-3">
                <TextAreaField label={t('clientSettings.fields.pickupNote')} value={draft.inquiryJson.pickupNote} onChange={(pickupNote) => updateSection('inquiryJson', { pickupNote })} />
                <TextAreaField label={t('clientSettings.fields.depositNote')} value={draft.inquiryJson.depositNote} onChange={(depositNote) => updateSection('inquiryJson', { depositNote })} />
                <TextAreaField label={t('clientSettings.fields.shippingNote')} value={draft.inquiryJson.shippingNote} onChange={(shippingNote) => updateSection('inquiryJson', { shippingNote })} />
              </div>
            </SectionCard>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsPreview.title')} description={t('clientSettings.sectionsPreview.description')}>
              <div className="space-y-5">
                <ToggleRow label={t('clientSettings.fields.previewEnabled')} description={t('clientSettings.sectionsPreview.enableHelp')} checked={draft.previewJson.enabled} onChange={(enabled) => updateSection('previewJson', { enabled })} />
                <div className="grid gap-5 md:grid-cols-2">
                  <TextAreaField label={t('clientSettings.fields.acceptedFiles')} value={draft.previewJson.acceptedFileInfo} onChange={(acceptedFileInfo) => updateSection('previewJson', { acceptedFileInfo })} />
                  <TextAreaField label={t('clientSettings.fields.turnaroundNote')} value={draft.previewJson.turnaroundNote} onChange={(turnaroundNote) => updateSection('previewJson', { turnaroundNote })} />
                  <TextAreaField label={t('clientSettings.fields.reviewCopy')} value={draft.previewJson.reviewCopy} onChange={(reviewCopy) => updateSection('previewJson', { reviewCopy })} />
                  <TextAreaField label={t('clientSettings.fields.disclaimer')} value={draft.previewJson.disclaimer} onChange={(disclaimer) => updateSection('previewJson', { disclaimer })} />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case 'navigation':
        return (
          <SectionCard title={t('clientSettings.sectionsNavigation.title')} description={t('clientSettings.sectionsNavigation.description')}>
            <OrderedRows rows={draft.navigationJson.topNavItems} onChange={(topNavItems) => updateSection('navigationJson', { topNavItems })} hrefLabel={t('clientSettings.route')} />
          </SectionCard>
        );

      case 'footer':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsFooter.title')} description={t('clientSettings.sectionsFooter.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField label={t('clientSettings.fields.contactInfo')} value={draft.footerJson.contactEmail} onChange={(contactEmail) => updateSection('footerJson', { contactEmail })} />
                <TextField label={t('clientSettings.fields.hotline')} value={draft.footerJson.hotline} onChange={(hotline) => updateSection('footerJson', { hotline })} />
                <TextField label={t('clientSettings.fields.zalo')} value={draft.footerJson.zalo} onChange={(zalo) => updateSection('footerJson', { zalo })} />
                <TextField label={t('clientSettings.fields.address')} value={draft.footerJson.address} onChange={(address) => updateSection('footerJson', { address })} />
              </div>
            </SectionCard>
            <SectionCard title={t('clientSettings.footerLinks')} description={t('clientSettings.sectionsFooter.linksDesc')}>
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold">{t('clientSettings.socialLinks')}</p>
                  <OrderedRows rows={draft.footerJson.socialLinks} onChange={(socialLinks) => updateSection('footerJson', { socialLinks })} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold">{t('clientSettings.footerLinks')}</p>
                  <OrderedRows rows={draft.footerJson.footerLinks} onChange={(footerLinks) => updateSection('footerJson', { footerLinks })} />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case 'seo':
        return (
          <SectionCard title={t('clientSettings.sectionsSeo.title')} description={t('clientSettings.sectionsSeo.description')}>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label={t('clientSettings.fields.siteTitleTemplate')} value={draft.seoJson.siteTitleTemplate} onChange={(siteTitleTemplate) => updateSection('seoJson', { siteTitleTemplate })} help={t('clientSettings.sectionsSeo.titleHelp')} />
              <TextField label={t('clientSettings.fields.ogImage')} value={draft.seoJson.ogImage} onChange={(ogImage) => updateSection('seoJson', { ogImage })} />
              <div className="md:col-span-2">
                <TextAreaField label={t('clientSettings.fields.metaDescription')} value={draft.seoJson.metaDescription} onChange={(metaDescription) => updateSection('seoJson', { metaDescription })} />
              </div>
            </div>
          </SectionCard>
        );

      case 'i18n':
        return (
          <SectionCard title={t('clientSettings.sectionsI18n.title')} description={t('clientSettings.sectionsI18n.description')}>
            <div className="grid gap-5 md:grid-cols-2">
              <MultiChoice label={t('clientSettings.fields.enabledLocales')} options={['en', 'vi']} selected={draft.i18nJson.enabledLocales} onChange={(enabledLocales) => updateSection('i18nJson', { enabledLocales })} />
              <SelectField label={t('clientSettings.fields.defaultLocale')} value={draft.i18nJson.defaultLocale} options={['en', 'vi']} onChange={(defaultLocale) => updateSection('i18nJson', { defaultLocale })} />
              <SelectField label={t('clientSettings.fields.fallbackLocale')} value={draft.i18nJson.fallbackLocale} options={['en', 'vi']} onChange={(fallbackLocale) => updateSection('i18nJson', { fallbackLocale })} />
            </div>
          </SectionCard>
        );

      case 'policies':
        return (
          <div className="space-y-5">
            <SectionCard title={t('clientSettings.sectionsPolicies.title')} description={t('clientSettings.sectionsPolicies.description')}>
              <div className="grid gap-5 md:grid-cols-2">
                <TextAreaField label={t('clientSettings.fields.rentalPolicy')} value={draft.policiesJson.rentalPolicy} onChange={(rentalPolicy) => updateSection('policiesJson', { rentalPolicy })} />
                <TextAreaField label={t('clientSettings.fields.depositPolicy')} value={draft.policiesJson.depositPolicy} onChange={(depositPolicy) => updateSection('policiesJson', { depositPolicy })} />
                <TextAreaField label={t('clientSettings.fields.pickupPolicy')} value={draft.policiesJson.pickupPolicy} onChange={(pickupPolicy) => updateSection('policiesJson', { pickupPolicy })} />
                <TextAreaField label={t('clientSettings.fields.returnPolicy')} value={draft.policiesJson.returnPolicy} onChange={(returnPolicy) => updateSection('policiesJson', { returnPolicy })} />
                <TextAreaField label={t('clientSettings.fields.shippingPolicy')} value={draft.policiesJson.shippingPolicy} onChange={(shippingPolicy) => updateSection('policiesJson', { shippingPolicy })} />
                <TextAreaField label={t('clientSettings.fields.damagePolicy')} value={draft.policiesJson.damagePolicy} onChange={(damagePolicy) => updateSection('policiesJson', { damagePolicy })} />
              </div>
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('clientSettings.title')}
        title={t('nav.clientSettings')}
        subtitle={t('clientSettings.subtitle')}
        meta={
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={hasUnsavedChanges ? 'warning' : hasUnpublishedChanges ? 'info' : 'success'}>
              {hasUnsavedChanges ? t('clientSettings.unsavedDraft') : hasUnpublishedChanges ? t('clientSettings.draftReady') : t('clientSettings.publishedSynced')}
            </AdminBadge>
            <AdminBadge tone="neutral">{t('clientSettings.updatedAt', { date: compactIso(savedDraft.updatedAt) })}</AdminBadge>
          </div>
        }
        actions={
          <>
            <Link href="http://localhost:3000" target="_blank" className="button-secondary">
              {t('clientSettings.previewClient')}
            </Link>
            <AdminButton variant="secondary" onClick={saveDraft} disabled={!hasUnsavedChanges}>
              {t('clientSettings.saveDraft')}
            </AdminButton>
            <AdminButton onClick={publish} disabled={!hasUnsavedChanges && !hasUnpublishedChanges}>
              {t('clientSettings.publish')}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setHistoryOpen(true)}>
              {t('clientSettings.versionHistory')}
            </AdminButton>
            <AdminButton variant="ghost" onClick={restoreDefaults}>
              {t('clientSettings.restoreDefault')}
            </AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('clientSettings.draftState'), value: hasUnsavedChanges ? t('clientSettings.unsaved') : t('clientSettings.saved'), detail: hasUnsavedChanges ? t('clientSettings.saveBeforePublishing') : t('clientSettings.draftStored'), tone: hasUnsavedChanges ? 'warning' : 'success' },
          { label: t('clientSettings.publishState'), value: hasUnpublishedChanges ? t('clientSettings.pending') : t('clientSettings.live'), detail: t('clientSettings.publishedAt', { date: compactIso(published.publishedAt) }), tone: hasUnpublishedChanges ? 'info' : 'success' },
          { label: t('clientSettings.changedSections'), value: changedSections.length, detail: changedSections.length ? changedSections.map(sectionLabel).join(', ') : t('clientSettings.noPendingLiveChanges'), tone: changedSections.length ? 'accent' : 'neutral' },
          { label: t('clientSettings.liveVersion'), value: currentPublishedVersion ? `v${currentPublishedVersion.version}` : t('clientSettings.customVersion'), detail: latestVersion ? t('clientSettings.rollbackSnapshots', { count: versionHistory.length }) : t('clientSettings.historyStartsOnPublish'), tone: 'neutral' },
        ]}
      />

      {notice ? (
        <div className="rounded-[20px] border border-[rgb(var(--accent-solid))/20] bg-[rgb(var(--accent-solid))/7] px-4 py-3 text-sm font-medium text-[rgb(var(--accent-solid))]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[282px_minmax(0,1fr)_460px]">
        <AdminCard className="h-fit p-3 xl:sticky xl:top-24">
          <div className="px-2 pb-3 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('clientSettings.sections')}</p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{t('clientSettings.sectionsDesc')}</p>
          </div>
          <div className="space-y-5">
            {clientSettingsGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const itemKey = sectionKeyBySlug[item.slug];
                    const activeItem = active === item.slug;
                    const changed = JSON.stringify(savedDraft[itemKey]) !== JSON.stringify(published[itemKey]);
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => setActive(item.slug)}
                        className={cn(
                          'relative w-full rounded-[16px] px-3 py-3 text-left',
                          activeItem ? 'bg-[rgb(var(--surface-4))] shadow-[var(--shadow-soft)]' : 'hover:bg-[rgb(var(--surface-3))]',
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">{item.label}</span>
                          {changed ? <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent-solid))]" /> : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <main className="min-w-0 space-y-5">
          <AdminCard className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('clientSettings.currentSection')}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[rgb(var(--text-primary))]">{sectionLabel(active)}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">
                  {t('clientSettings.editingSectionPrefix')} <span className="font-semibold text-[rgb(var(--text-primary))]">{activeKey}</span>. {t('clientSettings.editingSectionSuffix')}
                </p>
              </div>
              <div className="flex gap-2">
                <AdminBadge tone={hasUnsavedChanges ? 'warning' : 'neutral'}>{hasUnsavedChanges ? t('clientSettings.unsaved') : t('clientSettings.savedDraft')}</AdminBadge>
                {changedSections.includes(active) ? <AdminBadge tone="accent">{t('clientSettings.pendingPublish')}</AdminBadge> : null}
              </div>
            </div>
          </AdminCard>

          {renderSection()}
        </main>

        <aside className="space-y-5">
          <PreviewPanel
            settings={previewSource === 'draft' ? draft : published}
            active={active}
            device={previewDevice}
            onDeviceChange={setPreviewDevice}
            source={previewSource}
            onSourceChange={setPreviewSource}
            changedSections={changedSections}
          />
          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('clientSettings.sourceAudit')}</p>
            <h3 className="mt-2 text-sm font-semibold">{t('clientSettings.clientMapping')}</h3>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
              {activeSource?.clientSource ?? t('clientSettings.defaultSourceMapping')}
            </p>
            <div className="mt-4 space-y-2">
              {clientSourceMap.slice(0, 4).map((item) => (
                <div key={item.section} className="rounded-[14px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/55 px-3 py-2">
                  <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{item.section}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[rgb(var(--text-muted))]">{item.settings}</p>
                </div>
              ))}
            </div>
          </AdminCard>
        </aside>
      </div>

      <VersionHistoryDrawer
        open={historyOpen}
        versions={versionHistory}
        currentPublishedId={currentPublishedVersion?.id}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreVersionAsDraft}
      />
    </>
  );
}
