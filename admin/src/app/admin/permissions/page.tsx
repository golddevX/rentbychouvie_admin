'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AdminBadge, AdminInput, AdminSelect } from '@/components/admin/primitives';
import { PageHeader, SectionCard, SummaryRow } from '@/components/admin/ui';
import { PermissionCatalogRow } from '@/components/admin/rbac';
import { permissionCatalog, permissionsByModule, riskTone, type PermissionRisk, type RbacModule } from '@/lib/admin/rbac';
import { useI18n } from '@/hooks/useI18n';

export default function PermissionsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | RbacModule>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | PermissionRisk>('all');

  const filtered = useMemo(() => {
    return permissionCatalog.filter((permission) => {
      const matchesQuery = [permission.id, permission.title, permission.description, permission.module].join(' ').toLowerCase().includes(query.toLowerCase());
      const matchesModule = moduleFilter === 'all' || permission.module === moduleFilter;
      const matchesRisk = riskFilter === 'all' || permission.risk === riskFilter;
      return matchesQuery && matchesModule && matchesRisk;
    });
  }, [moduleFilter, query, riskFilter]);

  const grouped = permissionsByModule(filtered).filter((group) => group.permissions.length > 0);
  const critical = permissionCatalog.filter((permission) => permission.risk === 'critical').length;
  const high = permissionCatalog.filter((permission) => permission.risk === 'high').length;

  return (
    <>
      <PageHeader
        eyebrow={t('rbac.permissions.title')}
        title={t('rbac.users.permissions')}
        subtitle={t('rbac.permissions.subtitle')}
        actions={
          <>
            <Link href="/admin/users" className="button-secondary">{t('rbac.permissions.users')}</Link>
            <Link href="/admin/roles" className="button-primary">{t('rbac.permissions.roles')}</Link>
          </>
        }
      />

      <SummaryRow
        items={[
          { label: t('rbac.users.permissions'), value: permissionCatalog.length, detail: t('rbac.permissions.catalogDetail'), tone: 'info' },
          { label: t('rbac.permissions.modules'), value: permissionsByModule().length, detail: t('rbac.permissions.modulesDetail'), tone: 'accent' },
          { label: t('rbac.permissions.critical'), value: critical, detail: t('rbac.permissions.criticalDetail'), tone: 'danger' },
          { label: t('rbac.permissions.highRisk'), value: high, detail: t('rbac.permissions.highRiskDetail'), tone: 'warning' },
        ]}
      />

      <SectionCard title={t('rbac.permissions.controls')} description={t('rbac.permissions.controlsDesc')}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('rbac.permissions.searchPlaceholder')} />
          <AdminSelect value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as 'all' | RbacModule)}>
            <option value="all">{t('rbac.permissions.allModules')}</option>
            {permissionsByModule().map((group) => <option key={group.module} value={group.module}>{group.label}</option>)}
          </AdminSelect>
          <AdminSelect value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | PermissionRisk)}>
            <option value="all">{t('rbac.permissions.allRisk')}</option>
            <option value="low">{t('rbac.permissions.low')}</option>
            <option value="medium">{t('rbac.permissions.medium')}</option>
            <option value="high">{t('rbac.permissions.high')}</option>
            <option value="critical">{t('rbac.permissions.critical')}</option>
          </AdminSelect>
        </div>
      </SectionCard>

      <div className="grid gap-5">
        {grouped.map((group) => (
          <SectionCard
            key={group.module}
            title={group.label}
            description={t('rbac.permissions.groupDescription', { count: group.permissions.length, module: group.label })}
            actions={
              <div className="flex flex-wrap gap-2">
                {(['low', 'medium', 'high', 'critical'] as PermissionRisk[]).map((risk) => {
                  const count = group.permissions.filter((permission) => permission.risk === risk).length;
                  return count ? <AdminBadge key={risk} tone={riskTone(risk)}>{count} {t(`rbac.permissions.${risk}`)}</AdminBadge> : null;
                })}
              </div>
            }
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {group.permissions.map((permission) => (
                <PermissionCatalogRow key={permission.id} permission={permission} />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </>
  );
}
