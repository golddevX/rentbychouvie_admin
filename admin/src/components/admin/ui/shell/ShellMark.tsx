'use client';

import { useI18n } from '@/hooks/useI18n';
import { AnimatePresence, motion } from 'framer-motion';

export function ShellMark({
  collapsed,
  title,
  subtitle,
}: {
  collapsed?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('shell.brandTitle');
  const resolvedSubtitle = subtitle ?? t('shell.brandSubtitle');

  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--accent-solid))] shadow-[0_16px_34px_rgba(15,23,42,0.14)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_48%,rgba(0,0,0,0.08))]" />
        <span className="relative text-sm font-black tracking-[-0.08em] text-[rgb(var(--button-primary-text))]">RF</span>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0, x: -8, width: 0 }} animate={{ opacity: 1, x: 0, width: 'auto' }} exit={{ opacity: 0, x: -8, width: 0 }} transition={{ duration: 0.18 }} className="min-w-0 overflow-hidden">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[rgb(var(--text-muted))]">{resolvedTitle}</p>
            <h2 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.045em] text-[rgb(var(--text-primary))]">{resolvedSubtitle}</h2>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
