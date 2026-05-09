'use client';

import { useI18n } from '@/hooks/useI18n';
import type { Tone } from '@/lib/admin/demo-data';

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  const { t } = useI18n();

  return (
    <div className="group relative overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/70 bg-[linear-gradient(135deg,rgb(var(--surface-2))/95,rgb(var(--surface))/90)] p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.1)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[rgb(var(--accent-solid))]/10 blur-3xl opacity-0 transition group-hover:opacity-100" />
      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-[rgb(var(--text-primary))]">{value}</p>
        <span className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--text-secondary))]">{t('common.live')}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{detail}</p>
    </div>
  );
}
