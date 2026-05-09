'use client';

import type { ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/75 bg-[linear-gradient(135deg,rgb(var(--surface-2))/95,rgb(var(--surface))/88)] p-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent-via))]/35 to-transparent" />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">{children}</div>
    </div>
  );
}
