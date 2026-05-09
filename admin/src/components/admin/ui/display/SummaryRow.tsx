'use client';

import type { ReactNode } from 'react';
import { cn } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

export function SummaryRow({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; detail?: string; tone?: Tone }>;
}) {
  const toneBar: Record<Tone, string> = {
    neutral: 'bg-[rgb(var(--surface-border))]',
    info: 'bg-[rgb(var(--info))]',
    success: 'bg-[rgb(var(--success))]',
    warning: 'bg-[rgb(var(--warning))]',
    danger: 'bg-[rgb(var(--danger))]',
    accent: 'bg-[rgb(var(--accent-strong))]',
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="group relative overflow-hidden rounded-[24px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-2))]/90 p-4 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
          <div className="absolute left-0 top-0 h-full w-1 rounded-r-full opacity-80 transition group-hover:opacity-100">
            <span className={cn('block h-full w-full', toneBar[item.tone ?? 'neutral'])} />
          </div>
          <p className="pl-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-3 pl-2 text-2xl font-semibold tracking-[-0.045em] text-[rgb(var(--text-primary))]">{item.value}</div>
          {item.detail ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
