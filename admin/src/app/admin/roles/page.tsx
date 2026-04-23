'use client';

import Link from 'next/link';
import { AdminBadge, AdminCard } from '@/components/admin/primitives';
import { PageHeader, SummaryRow } from '@/components/admin/ui';
import { RoleCapabilityPanel } from '@/components/admin/rbac';
import { criticalPermissionCount, defaultRbacRoles, rbacUsers, userCountsByRole } from '@/lib/admin/rbac';
import { useI18n } from '@/hooks/useI18n';

export default function RolesPage() {
  const { t } = useI18n();
  const counts = userCountsByRole(rbacUsers);
  const totalPermissions = defaultRbacRoles.reduce((sum, role) => sum + role.permissions.length, 0);
  const privilegedRoles = defaultRbacRoles.filter((role) => criticalPermissionCount(role.permissions) > 0);

  return (
    <>
      <PageHeader
        eyebrow={t('rbac.roles.control')}
        title={t('rbac.roles.title')}
        subtitle={t('rbac.roles.subtitle')}
        actions={
          <>
            <Link href="/admin/users" className="button-secondary">{t('rbac.roles.users')}</Link>
            <Link href="/admin/permissions" className="button-secondary">{t('rbac.roles.permissionCatalog')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('rbac.roles.roles'), value: defaultRbacRoles.length, detail: t('rbac.roles.rolesDetail'), tone: 'info' },
          { label: t('rbac.roles.assignedUsers'), value: rbacUsers.filter((user) => user.status === 'active').length, detail: t('rbac.roles.assignedUsersDetail'), tone: 'success' },
          { label: t('rbac.roles.permissionGrants'), value: totalPermissions, detail: t('rbac.roles.permissionGrantsDetail'), tone: 'accent' },
          { label: t('rbac.roles.privilegedRoles'), value: privilegedRoles.length, detail: t('rbac.roles.privilegedRolesDetail'), tone: 'warning' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {defaultRbacRoles.map((role) => (
            <RoleCapabilityPanel key={role.id} role={role.id} userCount={counts[role.id]} />
          ))}
        </div>

        <aside className="space-y-5">
          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('rbac.roles.accessPolicy')}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{t('rbac.roles.carefulTitle')}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {t('rbac.roles.carefulCopy')}
            </p>
            <div className="mt-5 space-y-2">
              {privilegedRoles.map((role) => (
                <Link key={role.id} href={`/admin/roles/${role.id}`} className="flex items-center justify-between rounded-[16px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))]/60 px-4 py-3">
                  <span className="text-sm font-semibold">{role.label}</span>
                  <AdminBadge tone="warning">{t('rbac.roles.criticalCount', { count: criticalPermissionCount(role.permissions) })}</AdminBadge>
                </Link>
              ))}
            </div>
          </AdminCard>
        </aside>
      </div>
    </>
  );
}
