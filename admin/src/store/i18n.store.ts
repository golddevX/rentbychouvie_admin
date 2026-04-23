import { create } from 'zustand';

export type Locale = 'en' | 'vi';

interface I18nStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('i18n-locale');
    if (stored === 'en' || stored === 'vi') return stored;
  }
  return 'vi';
};

export const useI18nStore = create<I18nStore>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    set({ locale });
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18n-locale', locale);
    }
  },
}));
