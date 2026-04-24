'use client';

import {
  createPortal,
} from 'react-dom';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useI18n } from '@/hooks/useI18n';

export type SearchableSelectOption = {
  id: string;
  label: string;
  helper?: string;
  meta?: ReactNode;
  disabled?: boolean;
};

type MenuPosition = React.CSSProperties & {
  maxListHeight?: number;
};

type SearchableSelectProps<T extends SearchableSelectOption = SearchableSelectOption> = {
  options: T[];
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  clearable?: boolean;
  searchable?: boolean;
  className?: string;
  menuId?: string;
  getOptionLabel?: (option: T) => string;
  getOptionValue?: (option: T) => string;
  invalid?: boolean;
  name?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cx(
        'h-4 w-4 text-[rgb(var(--text-muted))] transition-transform duration-200',
        open && 'rotate-180',
      )}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M13.5 13.5L17 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 10.5L8.5 14L15 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 6L6 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
  );
}

function OptionRow({
  label,
  helper,
  meta,
  selected,
  active,
  disabled,
  onClick,
}: {
  label: string;
  helper?: string;
  meta?: ReactNode;
  selected: boolean;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex w-full items-start justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition-all duration-150',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : selected
            ? 'bg-[rgb(var(--surface-4))] text-[rgb(var(--text-primary))]'
            : active
              ? 'bg-[rgb(var(--surface-3))] text-[rgb(var(--text-primary))]'
              : 'text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-3))]',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-6">{label}</div>
        {helper ? (
          <div className="mt-0.5 truncate text-xs leading-5 text-[rgb(var(--text-secondary))]">
            {helper}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-5 items-center gap-2">
        {meta ? <div className="shrink-0 text-xs text-[rgb(var(--text-muted))]">{meta}</div> : null}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center text-[rgb(var(--accent-solid))]">
          {selected ? <CheckIcon /> : null}
        </div>
      </div>
    </button>
  );
}

function nextEnabledIndex(
  options: SearchableSelectOption[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) return -1;

  let cursor = currentIndex;
  for (let step = 0; step < options.length; step += 1) {
    cursor = (cursor + direction + options.length) % options.length;
    if (!options[cursor]?.disabled) {
      return cursor;
    }
  }

  return -1;
}

export function SearchableSelect<T extends SearchableSelectOption = SearchableSelectOption>({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  title,
  description,
  emptyTitle,
  emptyDescription,
  clearable = false,
  searchable = true,
  className,
  menuId,
  getOptionLabel,
  getOptionValue,
  invalid = false,
  name,
}: SearchableSelectProps<T>) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<MenuPosition>({});

  const resolvedMenuId = menuId ?? useId().replace(/:/g, '');
  const resolvedPlaceholder = placeholder ?? t('common.select.placeholder');
  const resolvedEmptyTitle = emptyTitle ?? t('common.select.no_results');
  const resolvedEmptyDescription = emptyDescription ?? t('common.select.no_results_description');

  const optionLabel = (option: T) => getOptionLabel?.(option) ?? option.label;
  const optionValue = (option: T) => getOptionValue?.(option) ?? option.id;

  const normalizedValue = value == null ? '' : String(value);

  const selectedOption = useMemo(
    () => options.find((option) => String(optionValue(option)) === normalizedValue) ?? null,
    [normalizedValue, options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const label = optionLabel(option).toLowerCase();
      const helper = String(option.helper ?? '').toLowerCase();
      return label.includes(normalizedQuery) || helper.includes(normalizedQuery);
    });
  }, [optionLabel, options, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = filteredOptions.findIndex((option) => String(optionValue(option)) === normalizedValue && !option.disabled);
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }

    setActiveIndex(nextEnabledIndex(filteredOptions, -1, 1));
  }, [filteredOptions, normalizedValue, open, optionValue]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 8;
      const viewportHeight = window.innerHeight;
      const preferredListHeight = 320;
      const minListHeight = 140;
      const reservedHeight = (title || description ? 62 : 0) + (searchable ? 68 : 16);

      const spaceBelow = viewportHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(120, (openUp ? spaceAbove : spaceBelow) - 8);
      const maxListHeight = Math.max(
        minListHeight,
        Math.min(preferredListHeight, availableHeight - reservedHeight),
      );

      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 100000,
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? viewportHeight - rect.top + gap : undefined,
        maxListHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [description, open, searchable, title]);

  useEffect(() => {
    if (!open || !searchable) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, searchable]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElement = document.getElementById(resolvedMenuId);
      if (rootRef.current?.contains(target) || menuElement?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [resolvedMenuId]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((current) => nextEnabledIndex(filteredOptions, current, event.key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => {
        if (!current) {
          setQuery('');
        }
        return !current;
      });
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => nextEnabledIndex(filteredOptions, current, event.key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option && !option.disabled) {
        handleSelect(String(optionValue(option)));
      }
    }
  };

  const triggerLabel = selectedOption ? optionLabel(selectedOption) : resolvedPlaceholder;
  const triggerHelper = selectedOption?.helper;

  const menu = open ? (
    <div
      id={resolvedMenuId}
      role="listbox"
      aria-label={name ?? title ?? resolvedPlaceholder}
      style={menuStyle}
      className={cx(
        'overflow-hidden rounded-[22px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]',
        'shadow-[var(--shadow-float)] backdrop-blur',
      )}
    >
      {title || description ? (
        <div className="border-b border-[rgb(var(--surface-border))] bg-[rgb(var(--surface))] px-4 py-3">
          {title ? <div className="text-sm font-semibold text-[rgb(var(--text-primary))]">{title}</div> : null}
          {description ? <div className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-secondary))]">{description}</div> : null}
        </div>
      ) : null}

      {searchable ? (
        <div className="border-b border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-3 py-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[rgb(var(--text-muted))]">
              <SearchIcon />
            </div>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('common.select.search')}
              className={cx(
                'h-11 w-full rounded-[var(--radius-sm)] border border-[rgb(var(--input-border))]/90 bg-[rgb(var(--input-bg))]/95 pl-10 pr-3 text-sm text-[rgb(var(--input-text))] outline-none',
                'placeholder:text-[rgb(var(--input-placeholder))] focus:border-[rgb(var(--input-focus-ring))] focus:ring-2 focus:ring-[rgb(var(--input-focus-ring))/14]',
              )}
            />
          </div>
        </div>
      ) : null}

      <div
        className="overflow-y-auto p-2"
        style={{
          maxHeight:
            typeof menuStyle.maxListHeight === 'number'
              ? menuStyle.maxListHeight
              : 320,
        }}
      >
        {loading ? (
          <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-4 text-sm text-[rgb(var(--text-secondary))]">
            <SpinnerIcon />
            <span>{t('common.select.loading')}</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-5">
            <div className="text-sm font-semibold text-[rgb(var(--text-primary))]">{resolvedEmptyTitle}</div>
            <div className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{resolvedEmptyDescription}</div>
          </div>
        ) : (
          <div className="space-y-1">
            {clearable && normalizedValue ? (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[rgb(var(--text-secondary))] transition-colors hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--text-primary))]"
              >
                <span>{t('common.select.clear')}</span>
                <span className="text-[rgb(var(--text-muted))]">
                  <ClearIcon />
                </span>
              </button>
            ) : null}
            {filteredOptions.map((option, index) => {
              const currentValue = String(optionValue(option));
              const isSelected = currentValue === normalizedValue;
              const helper = option.helper ?? (isSelected ? t('common.select.selected') : undefined);
              return (
                <OptionRow
                  key={currentValue}
                  label={optionLabel(option)}
                  helper={helper}
                  meta={option.meta}
                  selected={isSelected}
                  active={index === activeIndex}
                  disabled={option.disabled}
                  onClick={() => !option.disabled && handleSelect(currentValue)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      {name ? <input type="hidden" name={name} value={normalizedValue} /> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={resolvedMenuId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          'flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] border bg-[rgb(var(--input-bg))]/95 px-3.5 py-2 text-left shadow-[var(--shadow-soft)]',
          invalid
            ? 'border-[rgb(var(--danger))/40] ring-2 ring-[rgb(var(--danger))/12]'
            : 'border-[rgb(var(--input-border))]/90 focus:border-[rgb(var(--input-focus-ring))] focus:ring-2 focus:ring-[rgb(var(--input-focus-ring))/14]',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className={cx('truncate text-sm font-medium', selectedOption ? 'text-[rgb(var(--input-text))]' : 'text-[rgb(var(--input-placeholder))]')}>
            {triggerLabel}
          </div>
          {triggerHelper ? (
            <div className="truncate text-xs leading-5 text-[rgb(var(--text-secondary))]">{triggerHelper}</div>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center justify-center">
          <ChevronIcon open={open} />
        </span>
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
