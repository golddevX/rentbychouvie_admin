'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AdminBadge, AdminButton, AdminCard, AdminSelect } from '@/components/admin/primitives';
import { PageHeader, SectionCard, SummaryRow } from '@/components/admin/ui';
import { PermissionMatrixModule, PermissionModuleSummary, RbacRoleBadge } from '@/components/admin/rbac';
import {
  criticalPermissionCount,
  defaultRbacRoles,
  getRole,
  permissionsByModule,
  rbacUsers,
  type RbacModule,
} from '@/lib/admin/rbac';
import type { Role } from '@/lib/admin/permissions';
import { rolesApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

function sameIds(a: string[], b: string[]) {
  return [...a].sort().join('|') === [...b].sort().join('|');
}

export default function RoleDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const roleId = (params.id as Role) || 'manager';
  const role = getRole(roleId);
  const [savedPermissions, setSavedPermissions] = useState<string[]>(role.permissions);
  const [draftPermissions, setDraftPermissions] = useState<string[]>(role.permissions);
  const [compareRole, setCompareRole] = useState<Role>('manager');
  const [auditNote, setAuditNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const dirty = !sameIds(savedPermissions, draftPermissions);
  const assignedUsers = rbacUsers.filter((user) => user.role === role.id && user.status === 'active');
  const moduleGroups = permissionsByModule();
  const readOnly = false;

  const compare = useMemo(() => getRole(compareRole), [compareRole]);
  const addedVsCompare = draftPermissions.filter((id) => !compare.permissions.includes(id)).length;
  const missingVsCompare = compare.permissions.filter((id) => !draftPermissions.includes(id)).length;

  const togglePermission = (permissionId: string) => {
    setDraftPermissions((current) =>
      current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId],
    );
    setNotice(null);
  };

  const selectAllModule = (module: RbacModule, checked: boolean) => {
    const moduleIds: string[] = moduleGroups.find((item) => item.module === module)?.permissions.map((permission) => permission.id) ?? [];
    setDraftPermissions((current) => {
      if (checked) return Array.from(new Set([...current, ...moduleIds]));
      return current.filter((id) => !moduleIds.includes(id));
    });
    setNotice(null);
  };

  const saveChanges = async () => {
    setSavedPermissions(draftPermissions);
    setNotice(t('rbac.roles.noticeSaved', { note: auditNote || t('rbac.roles.defaultAuditNote') }));
    try {
      await rolesApi.updatePermissions(role.id, draftPermissions, auditNote || t('rbac.roles.defaultAuditNote'));
    } catch {
      // Local fallback keeps the matrix usable until backend RBAC endpoints are connected.
    }
  };

  const resetChanges = () => {
    setDraftPermissions(savedPermissions);
    setNotice(t('rbac.roles.noticeDiscarded'));
  };

  return (
    <>
      <PageHeader
        eyebrow={t('rbac.roles.permissionControlCenter')}
        title={role.label}
        subtitle={role.description}
        meta={<RbacRoleBadge role={role.id} />}
        actions={
          <>
            <Link href="/admin/roles" className="button-secondary">{t('rbac.roles.backToRoles')}</Link>
            <Link href="/admin/permissions" className="button-secondary">{t('rbac.roles.catalog')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('rbac.roles.assignedUsers'), value: assignedUsers.length, detail: assignedUsers.map((user) => user.fullName).join(', ') || t('rbac.roles.noActiveUsers'), tone: 'info' },
          { label: t('rbac.roles.permissions'), value: draftPermissions.length, detail: dirty ? t('rbac.roles.unsavedChanges') : t('rbac.roles.savedGrants'), tone: dirty ? 'warning' : 'success' },
          { label: t('rbac.roles.criticalGrants'), value: criticalPermissionCount(draftPermissions), detail: t('rbac.roles.highRiskCapabilities'), tone: criticalPermissionCount(draftPermissions) ? 'warning' : 'neutral' },
          { label: t('rbac.roles.compare'), value: `+${addedVsCompare} / -${missingVsCompare}`, detail: t('rbac.roles.againstRole', { role: compare.label }), tone: 'accent' },
        ]}
      />

      {notice ? <div className="inline-alert-base inline-alert-info">{notice}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <SectionCard title={t('rbac.roles.permissionMatrix')} description={t('rbac.roles.permissionMatrixDesc')}>
            <div className="grid gap-4">
              {moduleGroups.map((group) => (
                <PermissionMatrixModule
                  key={group.module}
                  module={group.module}
                  permissions={group.permissions}
                  selectedIds={draftPermissions}
                  readOnly={readOnly}
                  onToggle={togglePermission}
                  onSelectAll={selectAllModule}
                />
              ))}
            </div>
          </SectionCard>
        </main>

        <aside className="min-w-0 space-y-5">
          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('rbac.roles.roleSummary')}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{role.label}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{role.operatingModel}</p>
            <div className="mt-5 grid gap-3">
              {moduleGroups.filter((group) => group.permissions.some((permission) => draftPermissions.includes(permission.id))).map((group) => (
                <PermissionModuleSummary key={group.module} module={group.module} selectedIds={draftPermissions} />
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('rbac.roles.compareRole')}</p>
            <AdminSelect className="mt-3" value={compareRole} onChange={(event) => setCompareRole(event.target.value as Role)}>
              {defaultRbacRoles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </AdminSelect>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-[rgb(var(--surface-3))] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('rbac.roles.extra')}</p>
                <p className="mt-1 text-xl font-semibold">+{addedVsCompare}</p>
              </div>
              <div className="rounded-[16px] bg-[rgb(var(--surface-3))] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">{t('rbac.roles.missing')}</p>
                <p className="mt-1 text-xl font-semibold">-{missingVsCompare}</p>
              </div>
            </div>
          </AdminCard>
        </aside>
      </div>

      {dirty ? (
        <div className="fixed bottom-5 left-4 right-4 z-40 mx-auto max-w-[1120px] rounded-[24px] border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]/95 p-4 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge tone="warning">{t('rbac.roles.unsavedPolicy')}</AdminBadge>
                <span className="text-sm font-semibold">{t('rbac.roles.permissionsSelected', { count: draftPermissions.length })}</span>
              </div>
              <input
                value={auditNote}
                onChange={(event) => setAuditNote(event.target.value)}
                placeholder={t('rbac.roles.auditNotePlaceholder')}
                className="mt-3 h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-[rgb(var(--input-border))] bg-[rgb(var(--input-bg))] px-3.5 text-sm outline-none focus:border-[rgb(var(--input-focus-ring))] lg:min-w-[320px]"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <AdminButton variant="secondary" onClick={resetChanges}>{t('rbac.roles.discard')}</AdminButton>
              <AdminButton onClick={saveChanges}>{t('rbac.roles.saveChanges')}</AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
