'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminBadge, AdminButton, AdminCard, AdminInput, AdminModal, AdminSelect } from '@/components/admin/primitives';
import { DataTable, PageHeader, SectionCard, SummaryRow } from '@/components/admin/ui';
import { AccessSummaryCard, PermissionSummaryList, RbacRoleBadge } from '@/components/admin/rbac';
import { defaultRbacRoles, getRole, rbacUsers, type RbacUser } from '@/lib/admin/rbac';
import type { Role } from '@/lib/admin/permissions';
import { usersApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

const roleOptions = defaultRbacRoles.map((role) => role.id);

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<RbacUser[]>(rbacUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RbacUser['status']>('all');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'sales' as Role });

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery = [user.fullName, user.email, user.phone, user.role].join(' ').toLowerCase().includes(query.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? filtered[0] ?? users[0];
  const activeUsers = users.filter((user) => user.status === 'active');
  const privilegedUsers = users.filter((user) => ['super_admin', 'manager'].includes(user.role) && user.status === 'active');

  const createUser = async () => {
    const next: RbacUser = {
      id: `u${Date.now()}`,
      fullName: form.fullName || t('rbac.users.newUser'),
      email: form.email || 'new.user@test.com',
      phone: form.phone || '0900000000',
      role: form.role,
      status: 'active',
      lastActiveAt: t('rbac.users.notSignedIn'),
      createdAt: '2026-04-23',
      workload: 0,
      activity: [{ time: t('rbac.users.now'), title: t('rbac.users.userCreated'), detail: t('rbac.users.assignedRole', { role: getRole(form.role).label }) }],
    };
    setUsers((current) => [next, ...current]);
    setSelectedUserId(next.id);
    setModalOpen(false);
    setForm({ fullName: '', email: '', phone: '', role: 'sales' });
    setNotice(t('rbac.users.noticeCreated'));
    try {
      await usersApi.create({ fullName: next.fullName, email: next.email, phone: next.phone, role: next.role.toUpperCase(), password: 'temporary-password' });
    } catch {
      // Local fallback keeps the UI usable until the API is connected in this environment.
    }
  };

  const updateUserRole = async (id: string, role: Role) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, role, activity: [{ time: t('rbac.users.now'), title: t('rbac.users.roleChanged'), detail: t('rbac.users.assignedRole', { role: getRole(role).label }) }, ...user.activity] } : user)));
    setNotice(t('rbac.users.noticeRoleUpdated'));
    try {
      await usersApi.update(id, { role: role.toUpperCase() });
    } catch {
      // Local fallback.
    }
  };

  const archiveUser = async (id: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, status: 'disabled', activity: [{ time: t('rbac.users.now'), title: t('rbac.users.userArchived'), detail: t('rbac.users.accessDisabled') }, ...user.activity] } : user)));
    setNotice(t('rbac.users.noticeArchived'));
    try {
      await usersApi.archive(id);
    } catch {
      // Local fallback.
    }
  };

  const resetPassword = async (id: string) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, activity: [{ time: t('rbac.users.now'), title: t('rbac.users.passwordReset'), detail: t('rbac.users.temporaryCredential') }, ...user.activity] } : user)));
    setNotice(t('rbac.users.noticePasswordReset'));
    try {
      await usersApi.resetPassword(id);
    } catch {
      // Local fallback.
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('rbac.accessManagement')}
        title={t('rbac.users.title')}
        subtitle={t('rbac.users.subtitle')}
        actions={
          <>
            <Link href="/admin/roles" className="button-secondary">{t('rbac.users.roles')}</Link>
            <Link href="/admin/permissions" className="button-secondary">{t('rbac.users.permissions')}</Link>
            <AdminButton onClick={() => setModalOpen(true)}>{t('rbac.users.createUser')}</AdminButton>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('rbac.users.activeUsers'), value: activeUsers.length, detail: t('rbac.users.activeUsersDetail'), tone: 'success' },
          { label: t('rbac.users.privilegedUsers'), value: privilegedUsers.length, detail: t('rbac.users.privilegedUsersDetail'), tone: 'accent' },
          { label: t('rbac.users.disabled'), value: users.filter((user) => user.status === 'disabled').length, detail: t('rbac.users.disabledDetail'), tone: 'neutral' },
          { label: t('rbac.users.roles'), value: defaultRbacRoles.length, detail: t('rbac.users.rolesDetail'), tone: 'info' },
        ]}
      />

      {notice ? <div className="inline-alert-base inline-alert-info">{notice}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title={t('rbac.users.directory')} description={t('rbac.users.directoryDesc')}>
          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
            <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('rbac.users.searchPlaceholder')} />
            <AdminSelect value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}>
              <option value="all">{t('rbac.users.allRoles')}</option>
              {roleOptions.map((role) => <option key={role} value={role}>{getRole(role).label}</option>)}
            </AdminSelect>
            <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | RbacUser['status'])}>
              <option value="all">{t('rbac.users.allStatus')}</option>
              <option value="active">{t('rbac.users.active')}</option>
              <option value="disabled">{t('rbac.users.disabled')}</option>
            </AdminSelect>
          </div>

          <DataTable
            columns={[t('rbac.users.user'), t('rbac.users.role'), t('common.status'), t('rbac.users.lastActive'), t('common.actions')]}
            rows={filtered.map((user) => [
              <Link key={`${user.id}-user`} href={`/admin/users/${user.id}`} className="block">
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-xs text-[rgb(var(--text-muted))]">{user.email}</p>
              </Link>,
              <div key={`${user.id}-role`} className="min-w-[180px]">
                <AdminSelect value={user.role} onChange={(event) => updateUserRole(user.id, event.target.value as Role)}>
                  {roleOptions.map((role) => <option key={role} value={role}>{getRole(role).label}</option>)}
                </AdminSelect>
              </div>,
              <AdminBadge key={`${user.id}-status`} tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</AdminBadge>,
              <span key={`${user.id}-last`}>{user.lastActiveAt}</span>,
              <div key={`${user.id}-actions`} className="flex flex-wrap gap-2">
                <AdminButton variant="secondary" size="sm" onClick={() => setSelectedUserId(user.id)}>{t('rbac.users.inspect')}</AdminButton>
                <AdminButton variant="secondary" size="sm" onClick={() => resetPassword(user.id)}>{t('rbac.users.reset')}</AdminButton>
                <AdminButton variant="ghost" size="sm" disabled={user.status === 'disabled'} onClick={() => archiveUser(user.id)}>{t('rbac.users.archive')}</AdminButton>
              </div>,
            ])}
            empty={t('rbac.users.empty')}
          />
        </SectionCard>

        <aside className="space-y-4">
          {selectedUser ? (
            <AdminCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">{t('rbac.users.accessProfile')}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{selectedUser.fullName}</h2>
                  <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{selectedUser.email}</p>
                </div>
                <RbacRoleBadge role={selectedUser.role} />
              </div>
              <div className="mt-5 grid gap-3">
                <AccessSummaryCard label={t('rbac.users.inherited')} value={getRole(selectedUser.role).permissions.length} detail={t('rbac.users.inheritedDetail')} tone="info" />
                <AccessSummaryCard label={t('rbac.users.workload')} value={selectedUser.workload} detail={t('rbac.users.workloadDetail')} />
              </div>
              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold">{t('rbac.users.permissionPreview')}</p>
                <PermissionSummaryList permissionIds={getRole(selectedUser.role).permissions} limit={8} />
              </div>
              <Link href={`/admin/users/${selectedUser.id}`} className="button-primary mt-5 w-full">{t('rbac.users.openUserDetail')}</Link>
            </AdminCard>
          ) : null}
        </aside>
      </div>

      <AdminModal
        open={modalOpen}
        title={t('rbac.users.createOperationalUser')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={createUser}>{t('rbac.users.createUser')}</AdminButton>
          </>
        }
      >
        <div className="grid gap-4">
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('rbac.users.fullName')}</span>
            <AdminInput className="mt-2" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('rbac.users.email')}</span>
            <AdminInput className="mt-2" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('rbac.users.phone')}</span>
            <AdminInput className="mt-2" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('rbac.users.role')}</span>
            <AdminSelect className="mt-2" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
              {roleOptions.map((role) => <option key={role} value={role}>{getRole(role).label}</option>)}
            </AdminSelect>
          </label>
        </div>
      </AdminModal>
    </>
  );
}
