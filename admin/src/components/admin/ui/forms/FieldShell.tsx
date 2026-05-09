'use client';

import type { ReactNode } from 'react';

export function FieldShell({
  label,
  helper,
  error,
  children,
}: {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
      {label}
      {children}
      {error ? <p className="text-xs leading-5 text-[rgb(var(--danger))]">{error}</p> : null}
      {!error && helper ? <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{helper}</p> : null}
    </label>
  );
}
