'use client';

import type { ReactNode } from 'react';
import { AdminCard, cn } from '../../primitives';

export function GuidanceCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-2))]/90 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard
      className={cn(
        'group relative overflow-hidden rounded-[30px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-2))]/94 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--surface-border))] to-transparent" />
      {(title || description || actions) ? (
        <div className="mb-6 flex flex-col gap-4 border-b border-[rgb(var(--surface-border))]/50 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))] md:text-xl">{title}</h2> : null}
            {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </AdminCard>
  );
}

export function ControlSurface({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="rounded-[26px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-2))]/86 p-3 shadow-sm backdrop-blur-xl">
      {label ? <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{label}</p> : null}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">{children}</div>
    </div>
  );
}
