'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AdminBadge, AdminButton, cn } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';
import { getResolvedThemeKey, listThemePresets, type ThemeKey, type ThemeMode } from '@/lib/theme/theme';
import { useTheme } from '@/lib/theme/useTheme';

const FAMILY_ORDER: ThemeKey[] = ['ocean', 'emerald', 'violet', 'rose', 'amber', 'zhengGold'];
const PANEL_WIDTH = 392;
const SAFE_GAP = 12;

const BASE_LABELS: Record<ThemeKey, string> = {
  ocean: 'Ocean',
  emerald: 'Emerald',
  violet: 'Violet',
  rose: 'Rose',
  amber: 'Amber',
  zhengGold: 'Zheng Gold',
};

function ThemeDot({
  accent,
  gradient,
  large = false,
}: {
  accent: string;
  gradient: string;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 rounded-full border border-white/40 shadow-sm',
        large ? 'h-9 w-9' : 'h-4 w-4',
      )}
      style={{
        background: gradient,
      }}
    >
      <span className="absolute inset-[2px] rounded-full border border-white/25" />
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeSwitcher() {
  const { t } = useI18n();
  const {
    themeKey,
    baseTheme,
    mode,
    preset,
    setThemeKey,
    setMode,
    previewTheme,
    clearPreview,
    tenantTheme,
    isTenantLocked,
  } = useTheme();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const presetMap = useMemo(() => {
    const allPresets = listThemePresets();

    return Object.fromEntries(allPresets.map((item) => [item.key, item])) as Record<
      string,
      (typeof allPresets)[number]
    >;
  }, []);

  const familyOptions = useMemo(
    () =>
      FAMILY_ORDER.map((family) => {
        const resolvedKey = getResolvedThemeKey(family, mode);
        return presetMap[resolvedKey];
      }).filter(Boolean),
    [mode, presetMap],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const closePanel = useCallback(() => {
    clearPreview();
    setOpen(false);
    setPosition(null);
  }, [clearPreview]);

  const syncPosition = useCallback(() => {
    const trigger = buttonRef.current?.getBoundingClientRect();
    if (!trigger || typeof window === 'undefined') return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(PANEL_WIDTH, viewportWidth - SAFE_GAP * 2);
    const panelHeight = Math.min(panelRef.current?.offsetHeight ?? 560, viewportHeight - SAFE_GAP * 2);

    const spaceBelow = viewportHeight - trigger.bottom - SAFE_GAP;
    const spaceAbove = trigger.top - SAFE_GAP;
    const shouldPlaceTop = spaceBelow < 420 && spaceAbove > spaceBelow;

    const left = Math.max(
      SAFE_GAP,
      Math.min(trigger.right - width, viewportWidth - width - SAFE_GAP),
    );

    const top = shouldPlaceTop
      ? Math.max(SAFE_GAP, trigger.top - panelHeight - SAFE_GAP)
      : Math.min(trigger.bottom + SAFE_GAP, viewportHeight - panelHeight - SAFE_GAP);

    const availableHeight = shouldPlaceTop
      ? trigger.top - SAFE_GAP * 2
      : viewportHeight - trigger.bottom - SAFE_GAP * 2;

    setPosition({
      top,
      left,
      maxHeight: Math.max(320, availableHeight),
      placement: shouldPlaceTop ? 'top' : 'bottom',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    syncPosition();

    const frame = window.requestAnimationFrame(() => {
      syncPosition();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, syncPosition]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;

      closePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePanel, open, syncPosition]);

  const currentLabel = `${BASE_LABELS[baseTheme]} / ${
    mode === 'light' ? t('themeSwitcher.mode.light') : t('themeSwitcher.mode.dark')
  }`;

  if (!mounted) {
    return (
      <div
        className="h-11 w-[188px] rounded-full bg-[rgb(var(--surface-3))]/85 shadow-sm"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="relative inline-flex min-w-0">
      <AdminButton
        ref={buttonRef}
        type="button"
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('themeSwitcher.open')}
        className={cn(
          'group h-11 w-[188px] max-w-[188px] justify-between gap-2 rounded-full border px-3.5',
          'border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/80',
          'shadow-[0_12px_36px_rgb(15_23_42/0.08)] backdrop-blur-xl',
          'transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-solid))]/30',
          'hover:bg-[rgb(var(--surface-3))]/85 hover:shadow-[0_18px_52px_rgb(15_23_42/0.12)]',
          open && 'border-[rgb(var(--accent-solid))]/35 bg-[rgb(var(--surface-3))]/90',
        )}
        onClick={(event) => {
          event.stopPropagation();

          if (open) {
            closePanel();
            return;
          }

          setOpen(true);
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          <ThemeDot accent={preset.preview.accent} gradient={preset.preview.gradient} />

          <span className="grid min-w-0 flex-1 text-left leading-none">
            <span className="mt-1 truncate text-xs font-bold text-[rgb(var(--text-primary))]">
              {currentLabel}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {isTenantLocked ? (
            <AdminBadge tone="warning" className="hidden xl:inline-flex">
              {t('themeSwitcher.tenant')}
            </AdminBadge>
          ) : null}

          <span className="text-[rgb(var(--text-muted))]">
            <ChevronIcon open={open} />
          </span>
        </span>
      </AdminButton>

      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className={cn(
                'fixed z-[160] rounded-[30px]',
                'border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/95',
                'shadow-[0_28px_90px_rgb(15_23_42/0.20)] backdrop-blur-2xl',
                'transition-opacity duration-150',
                position ? 'opacity-100' : 'pointer-events-none opacity-0',
                position?.placement === 'top'
                  ? 'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200'
                  : 'animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200',
              )}
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                width: `min(${PANEL_WIDTH}px, calc(100vw - ${SAFE_GAP * 2}px))`,
                maxHeight: position?.maxHeight ?? 'min(80vh, 720px)',
              }}
              onMouseLeave={() => clearPreview()}
            >
              <div className="relative max-h-[inherit] overflow-y-auto rounded-[30px] p-3">
                <div
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background: `radial-gradient(circle at 20% 0%, rgb(${preset.preview.accent} / 0.18), transparent 34%),
                                 radial-gradient(circle at 100% 18%, rgb(${preset.preview.accent} / 0.10), transparent 30%)`,
                  }}
                />

                <div className="relative">
                  <div className="rounded-[24px] border border-white/10 bg-[rgb(var(--surface-3))]/62 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.10)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[rgb(var(--text-muted))]">
                          {t('themeSwitcher.title')}
                        </p>

                        <p className="mt-1 truncate text-base font-black tracking-[-0.02em] text-[rgb(var(--text-primary))]">
                          {preset.label}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                          {preset.description}
                        </p>
                      </div>

                      <ThemeDot accent={preset.preview.accent} gradient={preset.preview.gradient} large />
                    </div>

                    {tenantTheme ? (
                      <div className="mt-4 rounded-[18px] border border-[rgb(var(--surface-border))]/65 bg-[rgb(var(--surface-2))]/65 px-3 py-2">
                        <p className="text-[11px] leading-5 text-[rgb(var(--text-muted))]">
                          {isTenantLocked
                            ? t('themeSwitcher.tenantLocked')
                            : t('themeSwitcher.tenantConfigurable')}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1 rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/55 p-1">
                    {(['light', 'dark'] as ThemeMode[]).map((option) => {
                      const active = mode === option;
                      const previewKey = getResolvedThemeKey(baseTheme, option);

                      return (
                        <button
                          key={option}
                          type="button"
                          className={cn(
                            'h-10 rounded-[16px] px-3 text-xs font-bold transition-all duration-200',
                            active
                              ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-primary))] shadow-[0_10px_28px_rgb(15_23_42/0.10)]'
                              : 'text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]/55 hover:text-[rgb(var(--text-primary))]',
                          )}
                          onMouseEnter={() => previewTheme(previewKey)}
                          onFocus={() => previewTheme(previewKey)}
                          onClick={() => {
                            setMode(option);
                            requestAnimationFrame(syncPosition);
                          }}
                        >
                          {option === 'light' ? t('themeSwitcher.mode.light') : t('themeSwitcher.mode.dark')}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {familyOptions.map((option) => {
                      const selected = option.key === themeKey;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={cn(
                            'group flex w-full items-start gap-3 rounded-[22px] border px-3.5 py-3.5 text-left',
                            'transition-all duration-200 hover:-translate-y-0.5',
                            selected
                              ? 'border-[rgb(var(--accent-solid))]/35 bg-[rgb(var(--accent-solid))]/10 shadow-[0_16px_42px_rgb(15_23_42/0.10)]'
                              : 'border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-3))]/42 hover:border-[rgb(var(--accent-solid))]/25 hover:bg-[rgb(var(--surface-3))]/76',
                          )}
                          onMouseEnter={() => previewTheme(option.key)}
                          onFocus={() => previewTheme(option.key)}
                          onClick={() => {
                            setThemeKey(option.key);
                            closePanel();
                          }}
                        >
                          <ThemeDot accent={option.preview.accent} gradient={option.preview.gradient} />

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-black tracking-[-0.01em] text-[rgb(var(--text-primary))]">
                                {BASE_LABELS[option.base]}
                              </span>

                              {selected ? (
                                <AdminBadge tone="accent">{t('themeSwitcher.current')}</AdminBadge>
                              ) : (
                                <span className="text-[11px] font-bold text-[rgb(var(--text-muted))] opacity-0 transition-opacity group-hover:opacity-100">
                                  Preview
                                </span>
                              )}
                            </span>

                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                              {option.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}