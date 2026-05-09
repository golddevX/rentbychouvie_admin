'use client';

import { Menu, Search } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { permissionsFor, type Role } from '@/lib/admin/permissions';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/admin/ThemeSwitcher';
import { RoleBadge, StatusBadge } from '../display/StatusBadge';

export function Topbar({
  role,
  onOpenMobile,
  onOpenCommand,
}: {
  role: Role | string;
  onOpenMobile: () => void;
  onOpenCommand: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="sticky top-0 z-30 border-b border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface))]/82 px-4 py-3 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3">
        <button type="button" className="button-secondary lg:hidden" onClick={onOpenMobile}>
          <Menu className="mr-2 h-4 w-4" />
          {t('common.menu')}
        </button>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('common.today')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{t('ui.topbarHint')}</p>
            <StatusBadge value={t('ui.liveOps')} tone="success" />
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-2.5">
          <button type="button" onClick={onOpenCommand} className="hidden items-center gap-2 rounded-full border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface-2))]/80 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] shadow-sm transition hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))] sm:inline-flex">
            <Search className="h-3.5 w-3.5" />
            {t('shell.commandOpen')}
            <span className="rounded-full border border-[rgb(var(--surface-border))]/70 px-1.5 py-0.5 text-[10px] text-[rgb(var(--text-muted))]">Ctrl K</span>
          </button>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <div className="hidden rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/80 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] shadow-sm xl:block">{permissionsFor(role).length} {t('crud.permissionsActive')}</div>
          <RoleBadge role={role} />
        </div>
      </div>
    </div>
  );
}
