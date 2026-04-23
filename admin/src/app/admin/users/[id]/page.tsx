'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminBadge, AdminButton, AdminCard } from '@/components/admin/primitives';
import { KeyValueList, PageHeader, SectionCard, SummaryRow, TimelineList } from '@/components/admin/ui';
import { PermissionModuleSummary, PermissionSummaryList, RbacRoleBadge } from '@/components/admin/rbac';
import { getRole, permissionsByModule, rbacUsers } from '@/lib/admin/rbac';
import { useI18n } from '@/hooks/useI18n';

export default function UserDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const userId = params.id as string;
  const user = rbacUsers.find((item) => item.id === userId) ?? rbacUsers[0];
  const role = getRole(user.role);
  const grantedModules = permissionsByModule().filter((module) => module.permissions.some((permission) => role.permissions.includes(permission.id)));

  return (
    <>
      <PageHeader
        eyebrow={t('rbac.users.userAccess')}
        title={user.fullName}
        subtitle={t('rbac.users.detailSubtitle')}
        meta={
          <div className="flex flex-wrap gap-2">
            <RbacRoleBadge role={user.role} />
            <AdminBadge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</AdminBadge>
          </div>
        }
        actions={
          <>
            <Link href="/admin/users" className="button-secondary">{t('rbac.users.backToUsers')}</Link>
            <Link href={`/admin/roles/${user.role}`} className="button-primary">{t('rbac.users.openRole')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('rbac.users.inheritedPermissions'), value: role.permissions.length, detail: t('rbac.users.modulesGranted', { count: grantedModules.length }), tone: 'info' },
          { label: t('rbac.users.criticalPermissions'), value: role.permissions.filter((id) => ['payment.refund', 'return.settle', 'role.permissions_update', 'client_settings.publish'].includes(id)).length, detail: t('rbac.users.highImpactAccess'), tone: 'warning' },
          { label: t('rbac.users.lastActive'), value: user.lastActiveAt, detail: t('rbac.users.latestActivity'), tone: 'neutral' },
          { label: t('rbac.users.workload'), value: user.workload, detail: t('rbac.users.openAssignments'), tone: 'accent' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <SectionCard title={t('rbac.users.profileSummary')} description={t('rbac.users.profileSummaryDesc')}>
            <KeyValueList
              items={[
                { label: t('rbac.users.email'), value: user.email },
                { label: t('rbac.users.phone'), value: user.phone },
                { label: t('paymentOps.history.created'), value: user.createdAt },
                { label: t('common.status'), value: <AdminBadge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</AdminBadge> },
              ]}
            />
          </SectionCard>

          <SectionCard title={t('rbac.users.inheritedPermissionMap')} description={t('rbac.users.inheritedPermissionMapDesc')}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grantedModules.map((module) => (
                <PermissionModuleSummary key={module.module} module={module.module} selectedIds={role.permissions} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('rbac.users.permissionSummary')} description={t('rbac.users.permissionSummaryDesc')}>
            <PermissionSummaryList permissionIds={role.permissions} limit={20} />
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('rbac.users.roleContext')}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{role.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{role.operatingModel}</p>
            <div className="mt-5 grid gap-2">
              <Link href={`/admin/roles/${role.id}`} className="button-secondary w-full">{t('rbac.users.reviewRoleMatrix')}</Link>
              <Link href={`/admin/audit?entity=user&entityId=${user.id}`} className="button-ghost w-full">{t('rbac.users.openAuditTrail')}</Link>
            </div>
          </AdminCard>

          <SectionCard title={t('rbac.users.activitySnapshot')} description={t('rbac.users.activitySnapshotDesc')}>
            <TimelineList
              items={user.activity.map((item) => ({
                time: item.time,
                title: item.title,
                detail: item.detail,
                tone: 'info' as const,
              }))}
            />
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
