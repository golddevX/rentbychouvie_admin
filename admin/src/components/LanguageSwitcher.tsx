'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-24 rounded-[18px] bg-[rgb(var(--surface-3))]" />;
  }

  return (
    <div className="flex items-center rounded-[18px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/90 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setLocale('vi')}
        className={`rounded-[14px] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.02em] font-mono transition ${locale === 'vi' ? 'bg-[rgb(var(--accent-solid))] text-[rgb(var(--button-primary-text))] shadow-sm' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'}`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-[14px] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.02em] font-mono transition ${locale === 'en' ? 'bg-[rgb(var(--accent-solid))] text-[rgb(var(--button-primary-text))] shadow-sm' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'}`}
      >
        EN
      </button>
    </div>
  );
}
