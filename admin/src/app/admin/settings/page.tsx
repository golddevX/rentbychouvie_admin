'use client';

import { useEffect, useState } from 'react';
import { PageHeader, SectionCard } from '@/components/admin/ui';
import { siteSettingsApi } from '@/lib/api';
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

export default function HomepageSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await siteSettingsApi.getHomepage();
        setSettings((prev) => ({ ...prev, ...(response.data as HomepageSettings) }));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const update = (key: keyof HomepageSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await siteSettingsApi.updateHomepage(settings);
      setMessage(t('settings.saveSuccess'));
    } catch (error) {
      console.error(error);
      setMessage(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('settings.title')}
        title={t('settings.title')}
        subtitle={t('settings.homepageSubtitle')}
      />

      <SectionCard title={t('settings.homepageContent')} description={t('settings.homepageContentDesc')}>
        {loading ? (
          <div className="text-sm text-[rgb(var(--text-secondary))]">{t('common.loading')}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
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
              <label key={key} className="field">
                <span>{t(label)}</span>
                <input
                  value={settings[key] ?? ''}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}

            <label className="field md:col-span-2">
              <span>{t('settings.heroCopy')}</span>
              <textarea
                rows={4}
                value={settings.heroCopy ?? ''}
                onChange={(event) => update('heroCopy', event.target.value)}
              />
            </label>

            <label className="field md:col-span-2">
              <span>{t('settings.editorialOneCopy')}</span>
              <textarea
                rows={4}
                value={settings.editorial1Copy ?? ''}
                onChange={(event) => update('editorial1Copy', event.target.value)}
              />
            </label>

            <label className="field md:col-span-2">
              <span>{t('settings.editorialTwoCopy')}</span>
              <textarea
                rows={4}
                value={settings.editorial2Copy ?? ''}
                onChange={(event) => update('editorial2Copy', event.target.value)}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button className="button-primary" onClick={save} disabled={saving || loading}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          {message ? <span className="text-sm text-[rgb(var(--text-secondary))]">{message}</span> : null}
        </div>
      </SectionCard>
    </>
  );
}
