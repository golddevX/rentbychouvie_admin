'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { productsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { useAdminListParams } from '@/hooks/useAdminListParams';
import { ProductEditorModal } from '@/components/admin/product-editor-modal';
import {
  ActionMenu,
  ControlSurface,
  DataTable,
  FeedbackPopup,
  PageHeader,
  PaginationControls,
  SectionCard,
  StatusBadge,
  SummaryRow,
} from '@/components/admin/ui';
import { MoneyDisplay } from '@/components/admin/order-flow-ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

type ProductRow = {
  id: string;
  code: string;
  qrCode: string;
  name: string;
  category: string;
  description?: string;
  image?: string | null;
  images?: string[];
  productValue: number;
  rentalPrice: number;
  status: string;
  nextAction: string;
  nextAvailableDate?: string | null;
  nearestSchedule?: {
    sourceType: 'lead' | 'booking' | 'maintenance';
    sourceId: string;
    status: string;
    startDate: string;
    endDate: string;
    customerName?: string | null;
    leadId?: string | null;
    bookingId?: string | null;
    reason?: string | null;
  } | null;
  rentalCount?: number;
  revenue?: number;
  size?: string | null;
  color?: string | null;
  accessories?: string | null;
};

type ConfirmAction =
  | { type: 'status'; product: ProductRow; status: 'available' | 'maintenance' | 'damaged' | 'retired'; title: string; description: string }
  | { type: 'archive'; product: ProductRow; title: string; description: string };

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function statusTone(status: string): Tone {
  switch (status) {
    case 'available':
      return 'success';
    case 'reserved':
      return 'info';
    case 'rented':
      return 'warning';
    case 'maintenance':
      return 'warning';
    case 'damaged':
      return 'danger';
    case 'retired':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function InventoryPageContent() {
  const { t } = useI18n();
  const { params, updateParams, setPage, setLimit } = useAdminListParams({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const query = params.search;
  const statusFilter = params.status || 'all';

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productsApi.list({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: query || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setProducts(response.data?.data ?? []);
      setMeta(response.data?.meta ?? { page: params.page, limit: params.limit, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.load_failed'));
      setProducts([]);
      setMeta({ page: params.page, limit: params.limit, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [params.limit, params.page, params.search, params.sortBy, params.sortOrder, statusFilter]);

  const filteredProducts = products;

  const summary = useMemo(() => ({
    available: filteredProducts.filter((product) => product.status === 'available').length,
    reserved: filteredProducts.filter((product) => product.status === 'reserved').length,
    rented: filteredProducts.filter((product) => product.status === 'rented').length,
    care: filteredProducts.filter((product) => ['maintenance', 'damaged'].includes(product.status)).length,
  }), [filteredProducts]);

  const nextStepLabel = (product: ProductRow) => {
    switch (product.nextAction) {
      case 'open_lead':
        return t('inventory.next.open_lead');
      case 'open_booking':
        return t('inventory.next.open_booking');
      case 'review_maintenance':
        return t('inventory.next.review_maintenance');
      case 'retired':
        return t('inventory.next.retired');
      default:
        return t('inventory.next.quick_lead');
    }
  };

  const nextStepDetail = (product: ProductRow) => {
    if (product.nearestSchedule?.customerName) {
      return `${product.nearestSchedule.customerName} • ${formatDate(product.nearestSchedule.endDate)}`;
    }
    if (product.nearestSchedule?.reason) {
      return product.nearestSchedule.reason;
    }
    return product.category;
  };

  const saveProduct = async (payload: any) => {
    setBusyAction(editing?.id ?? 'create');
    setError(null);
    try {
      if (editing) {
        await productsApi.update(editing.id, payload);
        setFeedback({ tone: 'success', message: t('inventory.feedback.updated') });
      } else {
        await productsApi.create(payload);
        setFeedback({ tone: 'success', message: t('inventory.feedback.created') });
      }
      setCreateOpen(false);
      setEditing(null);
      await loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.save_failed'));
    } finally {
      setBusyAction(null);
    }
  };

  const runStatusAction = async () => {
    if (!confirmAction) return;
    setBusyAction(confirmAction.product.id);
    setError(null);
    try {
      if (confirmAction.type === 'archive') {
        await productsApi.archive(confirmAction.product.id);
        setFeedback({ tone: 'success', message: t('inventory.feedback.archived') });
      } else {
        await productsApi.updateStatus(confirmAction.product.id, confirmAction.status.toUpperCase());
        setFeedback({ tone: 'success', message: t('inventory.feedback.status_updated') });
      }
      setConfirmAction(null);
      await loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.status_failed'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />

      <PageHeader
        eyebrow={t('inventory.title')}
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
        nextStep={filteredProducts[0] ? `${filteredProducts[0].code}: ${nextStepLabel(filteredProducts[0])}` : t('inventory.empty')}
        actions={(
          <>
            <AdminButton variant="secondary" onClick={() => void loadProducts()} loading={loading}>
              {t('common.refresh')}
            </AdminButton>
            <AdminButton onClick={() => { setEditing(null); setCreateOpen(true); }}>
              {t('inventory.actions.create')}
            </AdminButton>
          </>
        )}
      />

      <SummaryRow
        items={[
          { label: t('product.status.available'), value: summary.available, detail: t('inventory.next.quick_lead'), tone: 'success' },
          { label: t('product.status.reserved'), value: summary.reserved, detail: t('inventory.next.open_lead'), tone: 'info' },
          { label: t('product.status.rented'), value: summary.rented, detail: t('inventory.next.open_booking'), tone: 'warning' },
          { label: t('inventory.summary.care'), value: summary.care, detail: t('inventory.next.review_maintenance'), tone: summary.care ? 'danger' : 'success' },
        ]}
      />

      <SectionCard className="mt-6" title={t('inventory.title')} description={t('inventory.subtitle')}>
        <ControlSurface label={t('inventory.controls.title')}>
          <AdminInput
            className="md:col-span-2"
            placeholder={t('inventory.controls.search')}
            value={query}
            onChange={(event) => updateParams({ search: event.target.value }, { resetPage: true })}
          />
          <AdminSelect value={statusFilter} onChange={(event) => updateParams({ status: event.target.value }, { resetPage: true })}>
            <option value="all">{t('inventory.controls.all_statuses')}</option>
            <option value="available">{t('product.status.available')}</option>
            <option value="reserved">{t('product.status.reserved')}</option>
            <option value="rented">{t('product.status.rented')}</option>
            <option value="maintenance">{t('product.status.maintenance')}</option>
            <option value="damaged">{t('product.status.damaged')}</option>
            <option value="retired">{t('product.status.retired')}</option>
          </AdminSelect>
          <AdminButton variant="secondary" onClick={() => void loadProducts()} loading={loading}>
            {t('common.refresh')}
          </AdminButton>
        </ControlSurface>

        <div className="mt-5" />

        <DataTable
          tableClassName="min-w-[1160px]"
          rowKeys={filteredProducts.map((product) => product.id)}
          empty={t('inventory.empty')}
          emptyDescription={t('inventory.emptyDetail')}
          columns={[
            t('inventory.columns.image'),
            t('inventory.columns.code'),
            t('inventory.columns.name'),
            t('product.value'),
            t('product.rental_price'),
            t('common.status'),
            t('inventory.columns.schedule'),
            t('booking.nextStep'),
            t('booking.action'),
          ]}
          rows={filteredProducts.map((product) => [
            <div key={`image-${product.id}`} className="overflow-hidden rounded-[18px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-16 w-16 object-cover" />
              ) : (
                <div className="grid h-16 w-16 place-items-center text-[11px] text-[rgb(var(--text-muted))]">{product.code}</div>
              )}
            </div>,
            <div key={`code-${product.id}`}>
              <p className="font-semibold text-[rgb(var(--text-primary))]">{product.code}</p>
              <p className="font-mono text-xs text-[rgb(var(--text-muted))]">{product.qrCode}</p>
            </div>,
            <div key={`name-${product.id}`}>
              <p className="font-semibold text-[rgb(var(--text-primary))]">{product.name}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{[product.size, product.color].filter(Boolean).join(' / ') || product.category}</p>
            </div>,
            <MoneyDisplay key={`value-${product.id}`} value={product.productValue} strong />,
            <MoneyDisplay key={`rent-${product.id}`} value={product.rentalPrice} strong tone="accent" />,
            <StatusBadge key={`status-${product.id}`} value={product.status} tone={statusTone(product.status)} />,
            <div key={`schedule-${product.id}`} className="grid gap-1">
              <span className="font-semibold text-[rgb(var(--text-primary))]">
                {product.nearestSchedule ? `${formatDate(product.nearestSchedule.startDate)} - ${formatDate(product.nearestSchedule.endDate)}` : '-'}
              </span>
              <span className="text-xs text-[rgb(var(--text-muted))]">{nextStepDetail(product)}</span>
            </div>,
            <div key={`next-${product.id}`} className="grid gap-1">
              <span className="font-semibold text-[rgb(var(--text-primary))]">{nextStepLabel(product)}</span>
              <span className="text-xs text-[rgb(var(--text-muted))]">{nextStepDetail(product)}</span>
            </div>,
            <div key={`action-${product.id}`} className="flex flex-wrap items-center justify-end gap-2">
              <Link className="button-primary min-h-9 px-3 text-sm" href={`/admin/inventory/${product.id}`}>
                {t('booking.open')}
              </Link>
              <ActionMenu
                label={t('common.moreActions')}
                items={[
                  { label: t('booking.open'), href: `/admin/inventory/${product.id}` },
                  { label: t('inventory.actions.quick_lead'), href: `/admin/scan/${encodeURIComponent(product.qrCode)}` },
                  { label: t('common.edit'), onSelect: () => setEditing(product) },
                  { label: t('inventory.actions.mark_available'), onSelect: () => setConfirmAction({ type: 'status', product, status: 'available', title: t('inventory.actions.mark_available'), description: t('inventory.confirm.available') }) },
                  { label: t('inventory.actions.mark_maintenance'), onSelect: () => setConfirmAction({ type: 'status', product, status: 'maintenance', title: t('inventory.actions.mark_maintenance'), description: t('inventory.confirm.maintenance') }) },
                  { label: t('inventory.actions.mark_damaged'), onSelect: () => setConfirmAction({ type: 'status', product, status: 'damaged', title: t('inventory.actions.mark_damaged'), description: t('inventory.confirm.damaged') }) },
                  { label: t('inventory.actions.retire'), onSelect: () => setConfirmAction({ type: 'status', product, status: 'retired', title: t('inventory.actions.retire'), description: t('inventory.confirm.retired') }) },
                  { label: t('common.archive'), onSelect: () => setConfirmAction({ type: 'archive', product, title: t('common.archive'), description: t('inventory.confirm.archive') }) },
                ]}
              />
            </div>,
          ])}
        />
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

      <ProductEditorModal
        open={createOpen || Boolean(editing)}
        title={editing ? t('inventory.form.edit_title') : t('inventory.form.create_title')}
        initialValue={editing ? {
          code: editing.code,
          name: editing.name,
          category: editing.category,
          description: editing.description ?? '',
          productValue: editing.productValue,
          rentalPrice: editing.rentalPrice,
          size: editing.size ?? '',
          color: editing.color ?? '',
          accessories: editing.accessories ?? '',
          images: editing.images ?? (editing.image ? [editing.image] : []),
          status: ['available', 'maintenance', 'damaged', 'retired'].includes(editing.status)
            ? editing.status as 'available' | 'maintenance' | 'damaged' | 'retired'
            : 'available',
        } : null}
        busy={busyAction === (editing?.id ?? 'create')}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        onSubmit={saveProduct}
      />

      <AdminModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title ?? t('common.actions')}
        onClose={() => setConfirmAction(null)}
        size="sm"
        footer={(
          <>
            <AdminButton variant="secondary" onClick={() => setConfirmAction(null)} disabled={Boolean(busyAction)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton onClick={() => void runStatusAction()} loading={Boolean(confirmAction && busyAction === confirmAction.product.id)}>
              {t('common.yes')}
            </AdminButton>
          </>
        )}
      >
        <p className="text-sm text-[rgb(var(--text-secondary))]">{confirmAction?.description}</p>
      </AdminModal>
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryPageContent />
    </Suspense>
  );
}
