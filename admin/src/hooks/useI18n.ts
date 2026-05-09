import { useCallback, useMemo } from 'react';
import { useI18nStore } from '@/store/i18n.store';
import { en } from '@/locales/en';
import { vi } from '@/locales/vi';

const dictionaries = { en, vi };

type Dictionary = typeof vi | typeof en;

// Helper to get nested value from the dictionary object
const getNestedValue = (obj: any, path: string): string | undefined => {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
};

export const useI18n = () => {
  const locale = useI18nStore((state) => state.locale);
  const setLocale = useI18nStore((state) => state.setLocale);
  const dictionary = useMemo(
    () => (dictionaries[locale] || dictionaries.vi) as Dictionary,
    [locale],
  );
  const hasTranslation = useCallback(
    (key: string) => (
      getNestedValue(dictionary, key) !== undefined || getNestedValue(dictionaries.vi, key) !== undefined
    ),
    [dictionary],
  );

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(dictionary, key) || getNestedValue(dictionaries.vi, key);

    if (text === undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return key; // Fallback to key if entirely missing
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text
          ?.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue))
          .replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      });
    }

    return text as string;
  }, [dictionary]);

  return { t, hasTranslation, locale, setLocale };
};
