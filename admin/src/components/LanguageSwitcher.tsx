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
    return <div className="h-8 w-24 rounded-lg bg-[rgb(var(--surface-3))]" />;
  }

  return (
    <div className="flex items-center rounded-lg border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-1">
      <button
        onClick={() => setLocale('vi')}
        className={`px-2 py-1 text-[11px] font-bold tracking-[0.02em] font-mono rounded ${locale === 'vi' ? 'bg-[rgb(var(--accent-solid))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'}`}
      >
        VI
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 text-[11px] font-bold tracking-[0.02em] font-mono rounded ${locale === 'en' ? 'bg-[rgb(var(--accent-solid))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'}`}
      >
        EN
      </button>
    </div>
  );
}
