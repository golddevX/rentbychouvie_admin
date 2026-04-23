'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { inventoryApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { InventoryQrActions } from '@/components/admin/qr-operations';
import {
  EmptyState,
  InlineAlert,
  KeyValueList,
  LoadingSkeleton,
  PageHeader,
  PermissionButton,
  RailSection,
  SectionCard,
  StatusBadge,
  Timeline,
  WorkspaceLayout,
} from '@/components/admin/ui';
import { AdminButton } from '@/components/admin/primitives';

type InventoryItemDetail = {
  id: string;
  qrCode: string;
  serialNumber: string;
  status: string;
  condition: string | null;
  product: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    name: string;
    size?: string | null;
    color?: string | null;
  } | null;
  rentals: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  archivedAt?: string | null;
};

export default function InventoryDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getItemById(params.id);
      setItem(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.inventoryLoadFailed'));
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [params?.id]);

  const updateStatus = async (status: string, notes?: string) => {
    if (!item) return;
    setMutating(true);
    setError(null);
    try {
      await inventoryApi.updateItemStatus(item.id, status, notes);
      await loadItem();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.statusFailed'));
    } finally {
      setMutating(false);
    }
  };

  const archiveItem = async () => {
    if (!item) return;
    setMutating(true);
    setError(null);
    try {
      await inventoryApi.archiveItem(item.id);
      await loadItem();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.archiveFailed', { entity: t('inventory.itemCode') }));
    } finally {
      setMutating(false);
    }
  };

  const timelineItems = useMemo(() => {
    if (!item) return [];
    const rentalEvents = item.rentals.map((rental) => t('inventory.rentalTimeline', { id: rental.id, status: rental.status }));
    return [t('inventory.createdTimeline', { serialNumber: item.serialNumber }), ...rentalEvents];
  }, [item, t]);

  if (loading) {
    return (
      <SectionCard title={t('inventory.loadingItem')}>
        <LoadingSkeleton />
      </SectionCard>
    );
  }

  if (error || !item) {
    return (
      <EmptyState
        title={t('inventory.itemNotFound')}
        description={error ?? t('inventory.itemNotFoundDesc')}
        action={<Link href="/admin/inventory" className="button-primary">{t('common.backToInventory')}</Link>}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('inventory.detail')}
        title={`${item.product.name} / ${item.serialNumber}`}
        subtitle={t('inventory.detailSubtitle')}
        actions={
          <>
            <PermissionButton permission="manage_inventory" className="button-secondary" onClick={() => updateStatus('MAINTENANCE', 'Marked maintenance from item detail')} disabled={mutating}>{t('inventory.markMaintenance')}</PermissionButton>
            <Link href={`/admin/scan/${encodeURIComponent(item.qrCode)}`} className="button-primary">{t('booking.openScanResult')}</Link>
          </>
        }
      />

      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('inventory.maintenanceStatus')}>
              <AdminButton variant="secondary" className="w-full" onClick={() => updateStatus('MAINTENANCE', 'Sent to cleaning')} loading={mutating}>{t('inventory.sendToCleaning')}</AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={() => updateStatus('MAINTENANCE', 'Repair task opened')} loading={mutating}>{t('inventory.openRepairTask')}</AdminButton>
              <AdminButton variant="secondary" className="w-full" onClick={archiveItem} loading={mutating}>{t('inventory.retireItem')}</AdminButton>
            </RailSection>
            <RailSection title={t('booking.actionsPanel')}>
              <Link href={`/admin/scan/${encodeURIComponent(item.qrCode)}`} className="button-secondary w-full">{t('booking.openScanResult')}</Link>
              <PermissionButton permission="manage_inventory" className="button-secondary w-full" onClick={() => updateStatus('MAINTENANCE', 'Marked maintenance from item detail')} disabled={mutating}>{t('inventory.markMaintenance')}</PermissionButton>
            </RailSection>
          </>
        }
      >
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <SectionCard title={t('inventory.itemDetail')} description={t('inventory.itemDetailDesc')}>
          <InlineAlert tone={item.status === 'AVAILABLE' ? 'success' : 'warning'}>
            {item.status === 'AVAILABLE' ? t('inventory.readyForBooking') : t('inventory.reviewMaintenance')}
          </InlineAlert>
          <div className="mt-4">
            <KeyValueList
              items={[
                { label: t('inventory.product'), value: item.product.name },
                { label: t('inventory.variant'), value: item.variant?.name ?? t('inventory.default') },
                { label: t('inventory.size'), value: item.variant?.size ?? t('inventory.standard') },
                { label: t('inventory.itemCode'), value: item.serialNumber },
                { label: t('inventory.qrCode'), value: item.qrCode },
                { label: t('common.status'), value: <StatusBadge key="status" value={item.status} /> },
                { label: t('return.condition'), value: <StatusBadge key="condition" value={item.condition ?? 'unknown'} tone={item.condition === 'excellent' || item.condition === 'good' ? 'success' : 'warning'} /> },
                { label: t('inventory.archived'), value: item.archivedAt ? t('inventory.yes') : t('inventory.no') },
              ]}
            />
          </div>
        </SectionCard>

        <InventoryQrActions
          itemId={item.id}
          productName={item.product.name}
          sku={item.serialNumber}
          initialCode={item.qrCode}
          onRegenerated={() => {
            void loadItem();
          }}
        />
      

        <SectionCard title={t('inventory.itemHistory')} description={t('inventory.itemHistoryDesc')}>
          <Timeline items={timelineItems} />
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
