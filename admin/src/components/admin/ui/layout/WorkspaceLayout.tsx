'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { CommandPanel } from './CommandPanel';

export function DecisionWorkspace({
  hero,
  status,
  actions,
  timeline,
  related,
  children,
}: {
  hero: ReactNode;
  status: ReactNode;
  actions: ReactNode;
  timeline?: ReactNode;
  related?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <div className="rounded-[30px] border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/85 p-5 shadow-[var(--shadow-panel)] backdrop-blur-xl">{hero}</div>
        {children}
      </div>
      <aside className="min-w-0 space-y-4 xl:self-start 2xl:sticky 2xl:top-24">
        <CommandPanel title={t('ui.currentStatus')}>{status}</CommandPanel>
        <CommandPanel title={t('ui.actionPanel')}>{actions}</CommandPanel>
        {timeline ? <CommandPanel title={t('crud.timeline')}>{timeline}</CommandPanel> : null}
        {related ? <CommandPanel title={t('crud.relatedData')}>{related}</CommandPanel> : null}
      </aside>
    </div>
  );
}

export function WorkspaceLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  if (!rail) return <div className="grid gap-6">{children}</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,320px)] 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="min-w-0 space-y-4 xl:self-start 2xl:sticky 2xl:top-24">{rail}</aside>
    </div>
  );
}

export function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return <CommandPanel title={title}>{children}</CommandPanel>;
}
