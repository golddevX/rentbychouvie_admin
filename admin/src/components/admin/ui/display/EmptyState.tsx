'use client';

import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/65 p-8 text-center">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/80 shadow-sm">
        <span className="h-3 w-3 rounded-full bg-[rgb(var(--accent-solid))]" />
      </div>
      <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
