'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AdminBadge, AdminButton, AdminCard, AdminInput, AdminModal, AdminSelect } from '@/components/admin/primitives';
import { DataTable, PageHeader, PaginationControls, SectionCard, SummaryRow } from '@/components/admin/ui';
import { AccessSummaryCard, PermissionSummaryList, RbacRoleBadge } from '@/components/admin/rbac';
import { defaultRbacRoles, getRole, rbacUsers, type RbacUser } from '@/lib/admin/rbac';
import type { Role } from '@/lib/admin/permissions';
import { usersApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';

const roleOptions = defaultRbacRoles.map((role) => role.id);

function mapApiUser(user: any): RbacUser {
  return {
    id: user.id,
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: String(user.role ?? 'sales').toLowerCase() as Role,
    status: user.isActive === false || user.archivedAt ? 'disabled' : 'active',
    lastActiveAt: user.updatedAt ?? user.createdAt ?? '',
    createdAt: user.createdAt ?? '',
    workload: 0,
    activity: [],
  };
}

function UsersPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { params, updateParams, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [users, setUsers] = useState<RbacUser[]>(rbacUsers);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'sales' as Role });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const query = params.search;
  const roleFilter = (searchParams.get('role') ?? 'all') as 'all' | Role;
  const statusFilter = (params.status || 'all') as 'all' | RbacUser['status'];

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await usersApi.list({
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          role: roleFilter === 'all' ? undefined : roleFilter.toUpperCase(),
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        });
        const payload = response.data?.data ?? [];
        const next = Array.isArray(payload) ? payload.map(mapApiUser) : [];
        setUsers(next);
        setMeta(response.data?.meta ?? { page: params.page, limit: params.limit, total: next.length, totalPages: next.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
        setSelectedUserId((current) => next.find((user) => user.id === current)?.id ?? next[0]?.id ?? '');
      } catch {
        setUsers([]);
        setMeta({ page: params.page, limit: params.limit, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [params.limit, params.page, params.search, params.sortBy, params.sortOrder, roleFilter, statusFilter]);

  const filtered = users;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  const activeUsers = users.filter((user) => user.status === 'active');
  const privilegedUsers = users.filter((user) => ['super_admin', 'manager'].includes(user.role) && user.status === 'active');

  const createUser = async () => {
    const next: RbacUser = {
      id: `u${Date.now()}`,
      fullName: form.fullName || t('rbac.users.newUser'),
      email: form.email.trim(),
      phone: form.phone.trim(),
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard title={t('rbac.users.directory')} description={t('rbac.users.directoryDesc')}>
          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
            <AdminInput value={query} onChange={(event) => updateParams({ search: event.target.value }, { resetPage: true })} placeholder={t('rbac.users.searchPlaceholder')} />
            <AdminSelect value={roleFilter} onChange={(event) => updateParams({ role: event.target.value }, { resetPage: true })}>
              <option value="all">{t('rbac.users.allRoles')}</option>
              {roleOptions.map((role) => <option key={role} value={role}>{getRole(role).label}</option>)}
            </AdminSelect>
            <AdminSelect value={statusFilter} onChange={(event) => updateParams({ status: event.target.value }, { resetPage: true })}>
              <option value="all">{t('rbac.users.allStatus')}</option>
              <option value="active">{t('rbac.users.active')}</option>
              <option value="disabled">{t('rbac.users.disabled')}</option>
            </AdminSelect>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">{t('common.loading')}</div>
          ) : (
            <DataTable
              tableClassName="min-w-[960px]"
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
          )}
          <PaginationControls
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            totalPages={meta.totalPages}
            hasNextPage={meta.hasNextPage}
            hasPreviousPage={meta.hasPreviousPage}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </SectionCard>

        <aside className="min-w-0 space-y-4">
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

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageContent />
    </Suspense>
  );
}
