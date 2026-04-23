'use client';

import Link from 'next/link';
import { InventoryIntakeFlow } from '@/components/admin/flow';
import { inventory } from '@/lib/admin/demo-data';
import { useI18n } from '@/hooks/useI18n';
import { ControlSurface, DataTable, SectionCard, StatusBadge, SummaryRow } from '@/components/admin/ui';
import { AdminInput, AdminSelect } from '@/components/admin/primitives';

export default function InventoryPage() {
  const { t } = useI18n();
  const available = inventory.filter((item) => item.status === 'available').length;
  const rented = inventory.filter((item) => item.status === 'rented').length;
  const care = inventory.filter((item) => ['maintenance', 'damaged'].includes(item.status)).length;
  const retired = inventory.filter((item) => item.status === 'retired').length;

  return (
    <>
      <InventoryIntakeFlow />
      <SummaryRow
        items={[
          { label: t('inventory.status.available'), value: available, detail: t('inventory.readyForBooking'), tone: 'success' },
          { label: t('inventory.status.rented'), value: rented, detail: t('inventory.trackReturn'), tone: 'info' },
          { label: t('inventory.maintenanceStatus'), value: care, detail: t('inventory.reviewMaintenance'), tone: care ? 'warning' : 'success' },
          { label: t('inventory.status.retired'), value: retired, detail: t('inventory.retireItem'), tone: 'neutral' },
        ]}
      />
      <SectionCard
        className="mt-6"
        title={t('inventory.operations')}
        description={t('inventory.operationsDesc')}
      >
        <ControlSurface label={t('inventory.inventoryControls')}>
          <AdminInput className="md:col-span-2" placeholder={t('inventory.searchPlaceholder')} />
          <AdminSelect defaultValue="all">
            <option value="all">{t('inventory.allStatuses')}</option>
            <option value="available">{t('inventory.status.available')}</option>
            <option value="rented">{t('inventory.status.rented')}</option>
            <option value="maintenance">{t('inventory.status.maintenance')}</option>
            <option value="damaged">{t('inventory.status.damaged')}</option>
          </AdminSelect>
          <AdminSelect defaultValue="product">
            <option value="product">{t('inventory.groupByProduct')}</option>
            <option value="variant">{t('inventory.groupByVariant')}</option>
            <option value="status">{t('common.status')}</option>
          </AdminSelect>
        </ControlSurface>
        <div className="mt-5" />
        <DataTable
          columns={[t('booking.item'), t('inventory.product'), t('inventory.variant'), t('inventory.qrCode'), t('common.status'), t('booking.nextStep'), t('booking.action')]}
          rows={inventory.map((item) => [
            <div key={`item-${item.id}`}><p className="font-semibold">{item.itemCode}</p><p className="text-xs text-[rgb(var(--text-muted))]">{item.location}</p></div>,
            <div key={`product-${item.id}`}><p className="font-semibold">{item.product}</p><p className="text-xs text-[rgb(var(--text-muted))]">{t('inventory.product')}</p></div>,
            <div key={`variant-${item.id}`}><p>{item.variant}</p><p className="text-xs text-[rgb(var(--text-muted))]">{item.size}</p></div>,
            <span key={`qr-${item.id}`} className="font-mono text-xs">{item.qrCode}</span>,
            <StatusBadge key="status" value={item.status} />,
            item.status === 'available' ? t('inventory.readyForBooking') : item.status === 'rented' ? t('inventory.trackReturn') : t('inventory.reviewMaintenance'),
            <Link key="action" className="text-sm font-semibold text-[rgb(var(--accent-solid))]" href={`/admin/inventory/${item.id}`}>{t('booking.open')}</Link>,
          ])}
        />
      </SectionCard>
    </>
  );
}
