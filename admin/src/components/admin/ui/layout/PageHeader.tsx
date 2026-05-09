'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '../../primitives';

function SurfaceGlow({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-solid))]/6 blur-3xl" />
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--surface-border))] to-transparent" />
    </div>
  );
}

function MiniDot({ active = false }: { active?: boolean }) {
  return <span className={cn('h-1.5 w-1.5 rounded-full transition', active ? 'bg-[rgb(var(--accent-solid))] shadow-[0_0_0_4px_rgb(var(--accent-solid))/12]' : 'bg-[rgb(var(--text-muted))]/35')} aria-hidden="true" />;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  nextStep,
  meta,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  nextStep?: string;
  meta?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="relative mb-8 overflow-hidden rounded-[34px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-2))]/92 px-5 py-6 shadow-[0_22px_48px_rgba(15,23,42,0.06)] backdrop-blur-2xl md:px-8 md:py-8">
      <SurfaceGlow />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {eyebrow ? <p className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface))]/72 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] shadow-sm"><MiniDot active />{eyebrow}</p> : null}
            {meta}
          </div>
          <h1 className="max-w-5xl text-[30px] font-semibold leading-[1.04] tracking-[-0.055em] text-[rgb(var(--text-primary))] md:text-[42px] 2xl:text-[48px]">{title}</h1>
          {subtitle ? <p className="mt-4 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))] md:text-[15px]">{subtitle}</p> : null}
          {nextStep ? <div className="mt-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface))]/78 px-4 py-2.5 text-xs font-semibold text-[rgb(var(--text-secondary))] shadow-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--accent-solid))]" /><span className="shrink-0 text-[rgb(var(--text-muted))]">{t('ui.nextPrefix')}:</span><span className="truncate text-[rgb(var(--text-primary))]">{nextStep}</span></div> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2.5 xl:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}
