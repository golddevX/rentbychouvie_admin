'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminBadge, AdminButton, AdminCard, cn } from './primitives';
import {
  criticalPermissionCount,
  getRole,
  moduleLabel,
  permissionById,
  permissionsByModule,
  riskTone,
  roleTone,
  type RbacModule,
  type RbacPermission,
} from '@/lib/admin/rbac';
import type { Role } from '@/lib/admin/permissions';
import { useI18n } from '@/hooks/useI18n';

export function RbacRoleBadge({ role }: { role: Role | string }) {
  const resolved = getRole(role);
  return <AdminBadge tone={roleTone(resolved.id)}>{resolved.label}</AdminBadge>;
}

export function PermissionRiskBadge({ permission }: { permission: RbacPermission }) {
  const { t } = useI18n();
  return <AdminBadge tone={riskTone(permission.risk)}>{t(`rbac.permissions.${permission.risk}`)}</AdminBadge>;
}

export function AccessSummaryCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  return (
    <AdminCard className={cn('p-4', tone !== 'neutral' && `summary-tile-${tone}`)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[rgb(var(--text-primary))]">{value}</div>
      <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{detail}</p>
    </AdminCard>
  );
}

export function PermissionModuleSummary({
  module,
  selectedIds,
}: {
  module: RbacModule;
  selectedIds: string[];
}) {
  const permissions = permissionsByModule().find((item) => item.module === module)?.permissions ?? [];
  const granted = permissions.filter((permission) => selectedIds.includes(permission.id));
  return (
    <div className="rounded-[16px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{moduleLabel(module)}</p>
        <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{granted.length}/{permissions.length}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-5))]">
        <div
          className="h-full rounded-full bg-[rgb(var(--accent-solid))]"
          style={{ width: `${permissions.length ? (granted.length / permissions.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

export function PermissionMatrixModule({
  module,
  permissions,
  selectedIds,
  readOnly,
  onToggle,
  onSelectAll,
}: {
  module: RbacModule;
  permissions: RbacPermission[];
  selectedIds: string[];
  readOnly?: boolean;
  onToggle: (permissionId: string) => void;
  onSelectAll: (module: RbacModule, checked: boolean) => void;
}) {
  const { t } = useI18n();
  const allSelected = permissions.every((permission) => selectedIds.includes(permission.id));
  const selectedCount = permissions.filter((permission) => selectedIds.includes(permission.id)).length;

  return (
    <section className="rounded-[22px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 border-b border-[rgb(var(--surface-border))] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{module}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{moduleLabel(module)}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('rbac.roles.permissionsGranted', { selected: selectedCount, total: permissions.length })}</p>
        </div>
        <AdminButton
          variant={allSelected ? 'primary' : 'secondary'}
          size="sm"
          disabled={readOnly}
          onClick={() => onSelectAll(module, !allSelected)}
        >
          {allSelected ? t('rbac.roles.allSelected') : t('rbac.roles.selectAll')}
        </AdminButton>
      </div>

      <div className="mt-4 grid gap-3">
        {permissions.map((permission) => {
          const checked = selectedIds.includes(permission.id);
          return (
            <button
              key={permission.id}
              type="button"
              disabled={readOnly}
              onClick={() => onToggle(permission.id)}
              className={cn(
                'flex w-full items-start justify-between gap-4 rounded-[18px] border px-4 py-3 text-left',
                checked ? 'border-[rgb(var(--accent-solid))/28] bg-[rgb(var(--accent-solid))/7]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/50',
                readOnly && 'cursor-default opacity-80',
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">{permission.title}</span>
                <span className="mt-1 block font-mono text-[11px] font-semibold text-[rgb(var(--text-muted))]">{permission.id}</span>
                <span className="mt-2 block text-xs leading-5 text-[rgb(var(--text-secondary))]">{permission.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <PermissionRiskBadge permission={permission} />
                <span className={cn('grid h-6 w-6 place-items-center rounded-full border', checked ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--accent-solid))] text-[rgb(var(--button-primary-text))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface))] text-transparent')}>
                  on
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RoleCapabilityPanel({ role, userCount }: { role: Role; userCount?: number }) {
  const { t } = useI18n();
  const model = getRole(role);
  const critical = criticalPermissionCount(model.permissions);
  const topModules = permissionsByModule()
    .filter((module) => module.permissions.some((permission) => model.permissions.includes(permission.id)))
    .slice(0, 6);

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <RbacRoleBadge role={role} />
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{model.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{model.description}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{model.permissions.length}</p>
          <p className="text-xs font-semibold text-[rgb(var(--text-muted))]">{t('rbac.roles.permissions')}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[16px] bg-[rgb(var(--surface-3))] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('rbac.roles.usersLabel')}</p>
          <p className="mt-1 text-lg font-semibold">{userCount ?? 0}</p>
        </div>
        <div className="rounded-[16px] bg-[rgb(var(--surface-3))] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('rbac.roles.critical')}</p>
          <p className="mt-1 text-lg font-semibold">{critical}</p>
        </div>
        <div className="rounded-[16px] bg-[rgb(var(--surface-3))] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('rbac.roles.model')}</p>
          <p className="mt-1 text-sm font-semibold">{role === 'super_admin' ? t('rbac.roles.full') : t('rbac.roles.scoped')}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">{model.operatingModel}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topModules.map((item) => (
          <span key={item.module} className="rounded-full border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--text-secondary))]">
            {item.label}
          </span>
        ))}
      </div>
      <Link href={`/admin/roles/${role}`} className="button-secondary mt-5 w-full">
        {t('rbac.roles.openControlCenter')}
      </Link>
    </AdminCard>
  );
}

export function PermissionCatalogRow({ permission }: { permission: RbacPermission }) {
  return (
    <div className="rounded-[18px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{permission.title}</p>
          <p className="mt-1 font-mono text-[11px] font-semibold text-[rgb(var(--text-muted))]">{permission.id}</p>
          <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{permission.description}</p>
        </div>
        <PermissionRiskBadge permission={permission} />
      </div>
    </div>
  );
}

export function PermissionSummaryList({ permissionIds, limit = 12 }: { permissionIds: string[]; limit?: number }) {
  const { t } = useI18n();
  const permissions = permissionIds.map(permissionById).filter(Boolean) as RbacPermission[];
  return (
    <div className="grid gap-2">
      {permissions.slice(0, limit).map((permission) => (
        <div key={permission.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[rgb(var(--text-primary))]">{permission.title}</p>
            <p className="truncate font-mono text-[10px] text-[rgb(var(--text-muted))]">{permission.id}</p>
          </div>
          <PermissionRiskBadge permission={permission} />
        </div>
      ))}
      {permissions.length > limit ? (
        <div className="rounded-[14px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-3 py-2 text-xs font-semibold text-[rgb(var(--text-muted))]">
          {t('rbac.roles.moreInheritedPermissions', { count: permissions.length - limit })}
        </div>
      ) : null}
    </div>
  );
}
