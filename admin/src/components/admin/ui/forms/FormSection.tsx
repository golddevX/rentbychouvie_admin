'use client';

import type { ReactNode } from 'react';

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/85 p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}
