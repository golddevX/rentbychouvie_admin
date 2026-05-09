'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/hooks/useI18n';
import { AdminButton, cn } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

type ActionMenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: Tone;
};

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="4.5" cy="10" r="1.25" fill="currentColor" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.25" fill="currentColor" />
    </svg>
  );
}

function toneClass(tone?: Tone) {
  if (tone === 'danger') return 'text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger))]/10';
  if (tone === 'warning') return 'text-[rgb(var(--warning))] hover:bg-[rgb(var(--warning))]/10';
  if (tone === 'success') return 'text-[rgb(var(--success))] hover:bg-[rgb(var(--success))]/10';
  return 'text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-3))]';
}

export function ActionMenu({
  label,
  items,
  className,
}: {
  label?: string;
  items: ActionMenuItem[];
  className?: string;
}) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number; transformOrigin: string } | null>(null);

  const visibleItems = items.filter((item) => item.href || item.onSelect);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const syncPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menu = menuRef.current;
    const safe = 12;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.min(320, viewportWidth - safe * 2);
    const measuredWidth = Math.min(menu?.offsetWidth ?? 240, maxWidth);
    const measuredHeight = menu?.offsetHeight ?? Math.min(320, viewportHeight - safe * 2);
    const spaceBelow = viewportHeight - rect.bottom - safe;
    const spaceAbove = rect.top - safe;
    const placeAbove = spaceBelow < Math.min(measuredHeight, 260) && spaceAbove > spaceBelow;
    const left = Math.max(safe, Math.min(rect.right - measuredWidth, viewportWidth - measuredWidth - safe));
    const top = placeAbove
      ? Math.max(safe, rect.top - measuredHeight - gap)
      : Math.min(rect.bottom + gap, viewportHeight - measuredHeight - safe);
    const maxHeight = Math.max(160, (placeAbove ? rect.top : viewportHeight - rect.bottom) - gap - safe);

    setPosition({
      top,
      left,
      maxHeight,
      transformOrigin: placeAbove ? 'bottom right' : 'top right',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    syncPosition();
  }, [open, syncPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      closeMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, closeMenu, syncPosition]);

  if (!visibleItems.length) return null;

  return (
    <div className={cn('relative inline-flex', className)}>
      <AdminButton
        ref={buttonRef}
        type="button"
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        leftIcon={<DotsIcon />}
        className={cn(
          'h-10 rounded-full border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/80 px-3',
          'shadow-[0_10px_30px_rgb(15_23_42/0.08)] backdrop-blur-xl transition-all duration-200',
          'hover:-translate-y-0.5 hover:border-[rgb(var(--accent-solid))]/30 hover:bg-[rgb(var(--surface-3))]/80',
          open && 'border-[rgb(var(--accent-solid))]/35 bg-[rgb(var(--surface-3))]/90',
        )}
      >
        {label ?? t('common.menu')}
      </AdminButton>

      {mounted && open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className={cn(
                'fixed z-[120] overflow-y-auto rounded-[24px]',
                'border border-[rgb(var(--surface-border))]/80 bg-[rgb(var(--surface))]/95',
                'p-2 shadow-[0_28px_80px_rgb(15_23_42/0.22)] backdrop-blur-2xl',
                'animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150',
              )}
              style={{
                top: position.top,
                left: position.left,
                minWidth: 220,
                maxWidth: 'min(320px, calc(100vw - 24px))',
                maxHeight: position.maxHeight,
                transformOrigin: position.transformOrigin,
              }}
            >
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const classes = cn(
                    'flex min-h-10 w-full items-center rounded-[16px] px-3.5 text-left text-sm font-semibold',
                    'transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45',
                    toneClass(item.tone),
                  );

                  if (item.href) {
                    return (
                      <Link
                        key={`${item.label}-${item.href}`}
                        href={item.href}
                        role="menuitem"
                        className={classes}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeMenu();
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className={classes}
                      disabled={item.disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (item.disabled) return;
                        closeMenu();
                        item.onSelect?.();
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
