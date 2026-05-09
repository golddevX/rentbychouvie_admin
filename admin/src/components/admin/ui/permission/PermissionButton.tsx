'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { can, type Permission } from '@/lib/admin/permissions';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '../../primitives';

export function PermissionButton({
  permission,
  children,
  className,
  disabledLabel,
  disabled,
  type = 'button',
  ...props
}: {
  permission: Permission;
  children: ReactNode;
  className?: string;
  disabledLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { t } = useI18n();
  const resolvedDisabledLabel = disabledLabel || t('ui.notAllowed');
  const user = useAuthStore((state) => state.user);
  const allowed = can(user?.role, permission);

  return (
    <button type={type} className={cn(className ?? 'button-primary')} disabled={!allowed || disabled} title={allowed ? undefined : resolvedDisabledLabel} {...props}>
      {children}
    </button>
  );
}
