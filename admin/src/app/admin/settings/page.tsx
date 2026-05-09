'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AdminBadge, AdminButton, AdminInput, cn } from '@/components/admin/primitives';
import { PageHeader, SectionCard, SummaryRow } from '@/components/admin/ui';
import { siteSettingsApi } from '@/lib/api';
import { getResolvedThemeKey, getThemePreset, type ResolvedThemeKey, type ThemeKey, type ThemeMode } from '@/lib/theme/theme';
import { getTenantThemeFromLocalFallback, saveTenantThemeLocalFallback, type TenantThemeSettings } from '@/lib/theme/tenantTheme';
import { useTheme } from '@/lib/theme/useTheme';
import { useI18n } from '@/hooks/useI18n';

type HomepageSettings = {
  heroImage: string;
  editorial1Image: string;
  editorial2Image: string;
  breakImage: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroCopy?: string;
  heroCta?: string;
  editorial1Eyebrow?: string;
  editorial1Title?: string;
  editorial1Copy?: string;
  editorialCta?: string;
  storyTitle?: string;
  storyCta?: string;
  editorial2Eyebrow?: string;
  editorial2Title?: string;
  editorial2Copy?: string;
  breakEyebrow?: string;
  breakTitle?: string;
  breakCta?: string;
};

type PreviewVars = CSSProperties & {
  '--preview-surface': string;
  '--preview-panel': string;
  '--preview-border': string;
  '--preview-text': string;
  '--preview-muted': string;
  '--preview-accent': string;
  '--preview-accent-from': string;
  '--preview-accent-via': string;
  '--preview-accent-to': string;
};

const defaultSettings: HomepageSettings = {
  heroImage:
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=2200&q=92',
  editorial1Image:
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1500&q=90',
  editorial2Image:
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1500&q=90',
  breakImage:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2200&q=90',
};

const THEME_FAMILIES: Array<{
  key: ThemeKey;
  label: string;
  description: string;
}> = [
  { key: 'ocean', label: 'Ocean', description: 'Calm teal-blue studio neutral.' },
  { key: 'emerald', label: 'Emerald', description: 'Trust-heavy operational green.' },
  { key: 'violet', label: 'Violet', description: 'Editorial cool with measured contrast.' },
  { key: 'rose', label: 'Rose', description: 'Warm clienteling tone without noise.' },
  { key: 'amber', label: 'Amber', description: 'Soft bronze for premium operations.' },
  { key: 'zhengGold', label: 'Zheng Gold', description: 'Executive luxury, controlled and quiet.' },
];

function toPreviewVars(themeKey: ResolvedThemeKey): PreviewVars {
  const preset = getThemePreset(themeKey);
  return {
    '--preview-surface': preset.tokens['--surface'],
    '--preview-panel': preset.tokens['--surface-2'],
    '--preview-border': preset.tokens['--surface-border'],
    '--preview-text': preset.tokens['--text-primary'],
    '--preview-muted': preset.tokens['--text-secondary'],
    '--preview-accent': preset.tokens['--accent-solid'],
    '--preview-accent-from': preset.tokens['--accent-from'],
    '--preview-accent-via': preset.tokens['--accent-via'],
    '--preview-accent-to': preset.tokens['--accent-to'],
  };
}

function ThemePreviewCard({
  themeKey,
  title,
  description,
  selected = false,
  compact = false,
  badge,
  onClick,
  onMouseEnter,
  onFocus,
}: {
  themeKey: ResolvedThemeKey;
  title: string;
  description: string;
  selected?: boolean;
  compact?: boolean;
  badge?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  const { t } = useI18n();
  const preset = getThemePreset(themeKey);

  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-[24px] border p-3 text-left transition duration-200',
        selected
          ? 'border-[rgb(var(--accent-solid))]/28 bg-[rgb(var(--accent-solid))]/7 shadow-[var(--shadow-panel)]'
          : 'border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/75 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-solid))]/20 hover:shadow-[var(--shadow-soft)]',
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{description}</p>
        </div>
        {badge ? <AdminBadge tone={selected ? 'accent' : 'neutral'}>{badge}</AdminBadge> : null}
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-[20px] border border-[rgb(var(--surface-border))]/70',
          compact ? 'h-[136px]' : 'h-[168px]',
        )}
        style={toPreviewVars(themeKey)}
      >
          <div className="flex h-full flex-col bg-[rgb(var(--preview-surface))] text-[rgb(var(--preview-text))]">
            <div className="flex items-center justify-between border-b border-[rgb(var(--preview-border))]/80 bg-[rgb(var(--preview-panel))]/96 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-7 w-7 rounded-[10px] border border-[rgb(var(--preview-border))]/80"
                  style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--preview-accent-from)), rgb(var(--preview-accent-via)), rgb(var(--preview-accent-to)))' }}
                />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--preview-muted))]">{t('nav.admin')}</p>
                  <p className="text-[11px] font-semibold">{preset.label}</p>
              </div>
            </div>
            <span className="rounded-full border border-[rgb(var(--preview-border))]/75 bg-[rgb(var(--preview-panel))] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--preview-muted))]">
              {preset.mode}
            </span>
          </div>

          <div className="grid flex-1 grid-cols-[54px_minmax(0,1fr)] gap-3 p-3">
            <div className="rounded-[14px] border border-[rgb(var(--preview-border))]/75 bg-[rgb(var(--preview-panel))]/94 p-2">
              <div className="h-2 w-7 rounded-full bg-[rgb(var(--preview-accent))]/78" />
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 rounded-full bg-[rgb(var(--preview-border))]/85" />
                <div className="h-1.5 rounded-full bg-[rgb(var(--preview-border))]/60" />
                <div className="h-1.5 rounded-full bg-[rgb(var(--preview-border))]/45" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-[14px] border border-[rgb(var(--preview-border))]/75 bg-[rgb(var(--preview-panel))]/96 p-2.5"
                  >
                    <div className="h-1.5 w-10 rounded-full bg-[rgb(var(--preview-border))]/72" />
                    <div className="mt-3 h-4 w-14 rounded-full bg-[rgb(var(--preview-accent))]/18" />
                  </div>
                ))}
              </div>

              <div className="rounded-[16px] border border-[rgb(var(--preview-border))]/75 bg-[rgb(var(--preview-panel))]/96 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="h-2 w-20 rounded-full bg-[rgb(var(--preview-text))]/14" />
                  <div
                    className="h-5 w-16 rounded-full"
                    style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--preview-accent-from)), rgb(var(--preview-accent-via)), rgb(var(--preview-accent-to)))' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded-full bg-[rgb(var(--preview-border))]/80" />
                  <div className="h-1.5 w-4/5 rounded-full bg-[rgb(var(--preview-border))]/55" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function ThemeModeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/60 p-1">
      {(['light', 'dark'] as ThemeMode[]).map((option) => {
        const active = option === mode;
        return (
          <button
            key={option}
            type="button"
            className={cn(
              'rounded-[14px] px-3 py-2 text-sm font-semibold transition duration-150',
              active
                ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-primary))] shadow-[var(--shadow-soft)]'
                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]',
            )}
            onClick={() => onChange(option)}
          >
            {option === 'light' ? t('themeSwitcher.mode.light') : t('themeSwitcher.mode.dark')}
          </button>
        );
      })}
    </div>
  );
}

export default function HomepageSettingsPage() {
  const { t } = useI18n();
  const {
    themeKey: effectiveThemeKey,
    userThemeKey,
    previewThemeKey,
    setThemeKey,
    previewTheme,
    clearPreview,
    tenantTheme,
    isTenantLocked,
  } = useTheme();
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [themeNotice, setThemeNotice] = useState<string | null>(null);
  const [tenantNotice, setTenantNotice] = useState<string | null>(null);
  const [draftThemeKey, setDraftThemeKey] = useState<ResolvedThemeKey>(userThemeKey);
  const [tenantDraft, setTenantDraft] = useState<TenantThemeSettings>(() =>
    getTenantThemeFromLocalFallback() ?? {
      themeKey: 'ocean-light',
      allowUserOverride: true,
    },
  );

  useEffect(() => {
    if (!previewThemeKey) {
      setDraftThemeKey(userThemeKey);
    }
  }, [previewThemeKey, userThemeKey]);

  useEffect(() => {
    if (tenantTheme) {
      setTenantDraft(tenantTheme);
      return;
    }
    setTenantDraft({
      themeKey: 'ocean-light',
      allowUserOverride: true,
    });
  }, [tenantTheme]);

  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await siteSettingsApi.getHomepage();
        setSettings((prev) => ({ ...prev, ...(response.data as HomepageSettings) }));
      } catch {
        setMessage(t('settings.saveFailed'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [t]);

  const draftThemePreset = useMemo(() => getThemePreset(draftThemeKey), [draftThemeKey]);
  const draftMode = draftThemePreset.mode;
  const draftBaseTheme = draftThemePreset.base;
  const themeDirty = draftThemeKey !== userThemeKey;
  const tenantDirty =
    tenantDraft.themeKey !== (tenantTheme?.themeKey ?? 'ocean-light') ||
    tenantDraft.allowUserOverride !== (tenantTheme?.allowUserOverride ?? true);

  const update = (key: keyof HomepageSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveHomepageSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await siteSettingsApi.updateHomepage(settings);
      setMessage(t('settings.saveSuccess'));
    } catch {
      setMessage(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleThemePreview = (nextThemeKey: ResolvedThemeKey) => {
    setDraftThemeKey(nextThemeKey);
    previewTheme(nextThemeKey);
  };

  const saveThemeSelection = () => {
    setThemeKey(draftThemeKey);
    setThemeNotice(
      isTenantLocked
        ? 'Đã lưu theme cá nhân. Tenant hiện đang khóa giao diện nên shell vẫn dùng theme tenant.'
        : 'Đã lưu theme quản trị.',
    );
  };

  const resetThemeSelection = () => {
    clearPreview();
    setDraftThemeKey('ocean-light');
    setThemeKey('ocean-light');
    setThemeNotice('Đã khôi phục theme mặc định Ocean Light.');
  };

  const saveTenantBranding = () => {
    const nextSettings: TenantThemeSettings = {
      ...tenantDraft,
      updatedAt: new Date().toISOString(),
    };
    saveTenantThemeLocalFallback(nextSettings);
    setTenantDraft(nextSettings);
    setTenantNotice('Đã lưu theme tenant cục bộ cho admin.');
  };

  const draftThemeOptions = THEME_FAMILIES.map((family) => ({
    ...family,
    themeKey: getResolvedThemeKey(family.key, draftMode),
  }));

  return (
    <>
      <PageHeader
        eyebrow={t('settings.title')}
        title={t('settings.title')}
        subtitle={t('settings.homepageSubtitle')}
        nextStep={isTenantLocked ? 'Tenant đang khóa giao diện người dùng.' : 'Có thể preview live trước khi lưu theme.'}
      />

      <SummaryRow
        items={[
          {
            label: 'Theme hiệu lực',
            value: getThemePreset(effectiveThemeKey).label,
            detail: getThemePreset(effectiveThemeKey).description,
            tone: 'accent',
          },
          {
            label: 'Theme cá nhân',
            value: getThemePreset(userThemeKey).label,
            detail: themeDirty ? 'Bạn đang preview thay đổi chưa lưu.' : 'Đã đồng bộ với lựa chọn đã lưu.',
            tone: themeDirty ? 'warning' : 'neutral',
          },
          {
            label: 'Theme tenant',
            value: tenantTheme ? getThemePreset(tenantTheme.themeKey).label : 'Chưa cấu hình',
            detail: tenantTheme
              ? tenantTheme.allowUserOverride
                ? 'Tenant có default theme nhưng cho phép user override.'
                : 'Tenant khóa theme toàn cục.'
              : 'Đang dùng fallback Ocean Light.',
            tone: tenantTheme ? 'info' : 'neutral',
          },
          {
            label: t('settings.theme.livePreview'),
            value: previewThemeKey ? t('settings.theme.enabled') : t('settings.theme.disabled'),
            detail: previewThemeKey ? t('settings.theme.previewAutoReverts') : t('settings.theme.noTemporaryPreview'),
            tone: previewThemeKey ? 'warning' : 'success',
          },
        ]}
      />

      <SectionCard
        title={t('settings.theme.appearanceTitle')}
        description={t('settings.theme.appearanceDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton variant="secondary" onClick={() => clearPreview()} disabled={!previewThemeKey}>
              {t('settings.theme.cancelPreview')}
            </AdminButton>
            <AdminButton variant="secondary" onClick={resetThemeSelection}>
              {t('settings.theme.resetDefault')}
            </AdminButton>
            <AdminButton onClick={saveThemeSelection} disabled={!themeDirty}>
              {t('settings.theme.saveTheme')}
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-6">
          {themeNotice ? (
            <div className="rounded-[20px] border border-[rgb(var(--accent-solid))]/20 bg-[rgb(var(--accent-solid))]/8 px-4 py-3 text-sm text-[rgb(var(--text-primary))]">
              {themeNotice}
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <ThemePreviewCard
                  themeKey={draftThemeKey}
                  title={t('settings.theme.currentPreview')}
                  description={t('settings.theme.currentPreviewDescription')}
                  badge={themeDirty ? t('settings.theme.previewBadge') : t('settings.theme.savedBadge')}
                  compact={false}
                />

                <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/55 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('settings.theme.mode')}</p>
                  <div className="mt-3">
                    <ThemeModeToggle
                      mode={draftMode}
                      onChange={(nextMode) => handleThemePreview(getResolvedThemeKey(draftBaseTheme, nextMode))}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/80 px-4 py-3">
                      <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{t('settings.theme.savedTheme')}</p>
                      <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{getThemePreset(userThemeKey).label}</p>
                    </div>
                    <div className="rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/80 px-4 py-3">
                      <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{t('settings.theme.activeTheme')}</p>
                      <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{getThemePreset(effectiveThemeKey).label}</p>
                    </div>
                    {isTenantLocked ? (
                      <div className="rounded-[18px] border border-[rgb(var(--warning))]/24 bg-[rgb(var(--warning))]/10 px-4 py-3 text-xs leading-5 text-[rgb(var(--text-primary))]">
                        {t('settings.theme.tenantOverrideNotice')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {draftThemeOptions.map((item) => (
                  <ThemePreviewCard
                    key={item.themeKey}
                    themeKey={item.themeKey}
                    title={item.label}
                    description={item.description}
                    selected={draftThemeKey === item.themeKey}
                    compact
                    badge={draftThemeKey === item.themeKey ? t('settings.theme.selectedBadge') : undefined}
                    onClick={() => handleThemePreview(item.themeKey)}
                    onMouseEnter={() => previewTheme(item.themeKey)}
                    onFocus={() => previewTheme(item.themeKey)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-3))]/55 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('settings.theme.tenantBranding')}</p>
                <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))]">{t('settings.theme.tenantDefaultTheme')}</h3>
                <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">
                  {t('settings.theme.tenantDescription')}
                </p>

                <div className="mt-4 space-y-4">
                  <ThemeModeToggle
                    mode={getThemePreset(tenantDraft.themeKey).mode}
                    onChange={(nextMode) =>
                      setTenantDraft((current) => ({
                        ...current,
                        themeKey: getResolvedThemeKey(getThemePreset(current.themeKey).base, nextMode),
                      }))
                    }
                  />

                  <div className="grid gap-2">
                    {THEME_FAMILIES.map((family) => {
                      const familyThemeKey = getResolvedThemeKey(family.key, getThemePreset(tenantDraft.themeKey).mode);
                      const active = tenantDraft.themeKey === familyThemeKey;
                      return (
                        <button
                          key={family.key}
                          type="button"
                          className={cn(
                            'rounded-[18px] border px-3 py-3 text-left transition duration-150',
                            active
                              ? 'border-[rgb(var(--accent-solid))]/28 bg-[rgb(var(--accent-solid))]/8 shadow-[var(--shadow-soft)]'
                              : 'border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/70 hover:border-[rgb(var(--accent-solid))]/18 hover:bg-[rgb(var(--surface-2))]/92',
                          )}
                          onClick={() => setTenantDraft((current) => ({ ...current, themeKey: familyThemeKey }))}
                        >
                          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{family.label}</p>
                          <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{family.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex items-start gap-3 rounded-[18px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/80 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={tenantDraft.allowUserOverride}
                      onChange={(event) =>
                        setTenantDraft((current) => ({
                          ...current,
                          allowUserOverride: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-[rgb(var(--surface-border))] bg-[rgb(var(--input-bg))]"
                      style={{ accentColor: 'rgb(var(--accent-solid))' }}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">{t('settings.theme.allowUserOverride')}</span>
                      <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-secondary))]">
                        {t('settings.theme.allowUserOverrideDescription')}
                      </span>
                    </span>
                  </label>

                  <ThemePreviewCard
                    themeKey={tenantDraft.themeKey}
                    title={t('settings.theme.tenantPreview')}
                    description={t('settings.theme.tenantPreviewDescription')}
                    compact
                    badge={tenantDirty ? t('settings.theme.unsavedBadge') : t('settings.theme.savedBadge')}
                  />

                  {tenantNotice ? (
                    <div className="rounded-[18px] border border-[rgb(var(--accent-solid))]/18 bg-[rgb(var(--accent-solid))]/8 px-4 py-3 text-xs leading-5 text-[rgb(var(--text-primary))]">
                      {tenantNotice}
                    </div>
                  ) : null}

                  <AdminButton onClick={saveTenantBranding} disabled={!tenantDirty}>
                    {t('settings.theme.saveTenantBranding')}
                  </AdminButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('settings.homepageContent')} description={t('settings.homepageContentDesc')}>
        {loading ? (
          <div className="text-sm text-[rgb(var(--text-secondary))]">{t('common.loading')}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ['heroImage', 'settings.homepageFields.heroImage'],
                ['editorial1Image', 'settings.homepageFields.editorial1Image'],
                ['editorial2Image', 'settings.homepageFields.editorial2Image'],
                ['breakImage', 'settings.homepageFields.breakImage'],
                ['heroEyebrow', 'settings.homepageFields.heroEyebrow'],
                ['heroTitle', 'settings.homepageFields.heroTitle'],
                ['heroCta', 'settings.homepageFields.heroCta'],
                ['editorial1Eyebrow', 'settings.homepageFields.editorial1Eyebrow'],
                ['editorial1Title', 'settings.homepageFields.editorial1Title'],
                ['editorialCta', 'settings.homepageFields.editorialCta'],
                ['storyTitle', 'settings.homepageFields.storyTitle'],
                ['storyCta', 'settings.homepageFields.storyCta'],
                ['editorial2Eyebrow', 'settings.homepageFields.editorial2Eyebrow'],
                ['editorial2Title', 'settings.homepageFields.editorial2Title'],
                ['breakEyebrow', 'settings.homepageFields.breakEyebrow'],
                ['breakTitle', 'settings.homepageFields.breakTitle'],
                ['breakCta', 'settings.homepageFields.breakCta'],
              ] as Array<[keyof HomepageSettings, string]>
            ).map(([key, label]) => (
              <label key={key} className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                {t(label)}
                <AdminInput value={settings[key] ?? ''} onChange={(event) => update(key, event.target.value)} />
              </label>
            ))}

            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('settings.heroCopy')}
              <textarea
                rows={4}
                className="field h-auto min-h-[124px] py-3"
                value={settings.heroCopy ?? ''}
                onChange={(event) => update('heroCopy', event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('settings.editorialOneCopy')}
              <textarea
                rows={4}
                className="field h-auto min-h-[124px] py-3"
                value={settings.editorial1Copy ?? ''}
                onChange={(event) => update('editorial1Copy', event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))] md:col-span-2">
              {t('settings.editorialTwoCopy')}
              <textarea
                rows={4}
                className="field h-auto min-h-[124px] py-3"
                value={settings.editorial2Copy ?? ''}
                onChange={(event) => update('editorial2Copy', event.target.value)}
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <AdminButton onClick={saveHomepageSettings} loading={saving} disabled={saving || loading}>
            {saving ? t('common.saving') : t('common.save')}
          </AdminButton>
          {message ? <span className="text-sm text-[rgb(var(--text-secondary))]">{message}</span> : null}
        </div>
      </SectionCard>
    </>
  );
}
