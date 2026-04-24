'use client';

import {
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function AdminSpinner({ className }: { className?: string }) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} aria-hidden="true" />;
}

type AdminCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'soft' | 'elevated' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function AdminCard({
  className,
  variant = 'default',
  padding = 'md',
  ...props
}: AdminCardProps) {
  const variants: Record<NonNullable<AdminCardProps['variant']>, string> = {
    default: 'surface-card',
    soft: 'surface-panel',
    elevated: 'surface-card shadow-[var(--shadow-float)]',
    ghost: 'rounded-[var(--radius-xl)] border border-[rgb(var(--surface-border))] bg-transparent',
  };
  const paddings: Record<NonNullable<AdminCardProps['padding']>, string> = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-7',
  };
  return <div className={cn(variants[variant], paddings[padding], className)} {...props} />;
}

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function AdminButton({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: AdminButtonProps) {
  const isDisabled = disabled || loading;
  const variants = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    ghost: 'button-ghost',
  };
  const sizes = {
    sm: 'min-h-9 px-3 text-sm',
    md: 'min-h-11 px-4 text-sm',
    lg: 'min-h-12 px-5 text-base',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--input-focus-ring))/18]',
        variants[variant],
        sizes[size],
        'disabled:pointer-events-none',
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <AdminSpinner className="h-3.5 w-3.5" /> : leftIcon}
      <span className="truncate">{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputClassName?: string;
};

export function AdminInput({
  className,
  inputClassName,
  error = false,
  leftIcon,
  rightIcon,
  ...props
}: AdminInputProps) {
  return (
    <div
      className={cn(
        'group relative flex min-h-11 w-full items-center border bg-[rgb(var(--input-bg))]/95 px-3.5 text-[rgb(var(--input-text))] transition-all duration-200',
        'rounded-[var(--radius-sm)] shadow-[var(--shadow-soft)]',
        error ? 'border-[rgb(var(--danger))/40] ring-2 ring-[rgb(var(--danger))/12]' : 'border-[rgb(var(--input-border))]/90 focus-within:border-[rgb(var(--input-focus-ring))] focus-within:ring-2 focus-within:ring-[rgb(var(--input-focus-ring))/14]',
        className,
      )}
    >
      {leftIcon ? <span className="mr-2 inline-flex shrink-0 text-[rgb(var(--text-muted))]">{leftIcon}</span> : null}
      <input
        className={cn(
          'h-10 w-full bg-transparent text-sm outline-none placeholder:text-[rgb(var(--input-placeholder))]',
          inputClassName,
        )}
        {...props}
      />
      {rightIcon ? <span className="ml-2 inline-flex shrink-0 text-[rgb(var(--text-muted))]">{rightIcon}</span> : null}
    </div>
  );
}

type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  loading?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  clearable?: boolean;
};

function flattenOptionText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      if (isValidElement(child)) {
        return flattenOptionText(child.props.children);
      }
      return '';
    })
    .join('')
    .trim();
}

function parseSelectOptions(children: ReactNode) {
  const options: SearchableSelectOption[] = [];
  let placeholderLabel: string | undefined;
  let hasEmptyValueOption = false;

  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;

      if (child.type === 'option') {
        const optionValue = String(child.props.value ?? flattenOptionText(child.props.children));
        const label = flattenOptionText(child.props.children);
        if (optionValue === '') {
          hasEmptyValueOption = true;
          placeholderLabel = label || placeholderLabel;
          return;
        }

        options.push({
          id: optionValue,
          label,
          disabled: Boolean(child.props.disabled),
        });
        return;
      }

      if (child.props?.children) {
        visit(child.props.children);
      }
    });
  };

  visit(children);

  return {
    options,
    placeholderLabel,
    hasEmptyValueOption,
  };
}

export function AdminSelect({
  className,
  error = false,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  loading = false,
  title,
  description,
  emptyTitle,
  emptyDescription,
  searchable,
  clearable,
  name,
  ...props
}: AdminSelectProps) {
  const parsed = parseSelectOptions(children);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''));

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(String(defaultValue ?? ''));
    }
  }, [defaultValue, isControlled]);

  const resolvedValue = isControlled ? String(value ?? '') : internalValue;

  const emitChange = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    if (!onChange) return;

    const syntheticEvent = {
      target: { value: nextValue, name } as EventTarget & HTMLSelectElement,
      currentTarget: { value: nextValue, name } as EventTarget & HTMLSelectElement,
    } as ChangeEvent<HTMLSelectElement>;

    onChange(syntheticEvent);
  };

  return (
    <SearchableSelect
      options={parsed.options}
      value={resolvedValue}
      onChange={emitChange}
      placeholder={parsed.placeholderLabel}
      disabled={disabled}
      loading={loading}
      title={title}
      description={description}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      clearable={clearable ?? parsed.hasEmptyValueOption}
      searchable={searchable ?? true}
      className={className}
      invalid={error}
      name={name}
      menuId={props.id ? `${props.id}-menu` : undefined}
    />
  );
}

export function AdminBadge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  children: ReactNode;
}) {
  return <span className={cn('status-badge-base', `status-badge-${tone}`, className)}>{children}</span>;
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export function AdminModal({
  open,
  title,
  children,
  onClose,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: ModalSize;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const sizeClass: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 p-4">
      <button type="button" aria-label="Close overlay" className="absolute inset-0 bg-[rgb(var(--overlay))] backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid h-full place-items-center">
        <div className={cn('surface-card relative flex w-full flex-col overflow-hidden', sizeClass[size])}>
          <div className="border-b border-[rgb(var(--surface-border))] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))]">{title}</h2>
              <AdminButton variant="ghost" className="h-9 w-9 p-0" onClick={onClose}>
                x
              </AdminButton>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
          <div className="border-t border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/70 px-5 py-4">
            <div className="flex justify-end gap-2">{footer}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
