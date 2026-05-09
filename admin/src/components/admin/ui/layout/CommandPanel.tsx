'use client';

import type { ReactNode } from 'react';

export function CommandPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-4 shadow-sm backdrop-blur-xl">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{description}</p> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
