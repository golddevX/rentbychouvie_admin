'use client';

import type { ReactNode } from 'react';

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-[22px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{item.label}</p>
          <div className="mt-1.5 text-sm font-semibold text-[rgb(var(--text-primary))]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
