'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { InventoryQrActions } from '@/components/admin/qr-operations';
import { ProductEditorModal } from '@/components/admin/product-editor-modal';
import { ProductQuickLeadModal } from '@/components/admin/product-quick-lead-modal';
import {
  ActionMenu,
  DataTable,
  EmptyState,
  FeedbackPopup,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
  SummaryRow,
} from '@/components/admin/ui';
import { MoneyDisplay } from '@/components/admin/order-flow-ui';
import { AdminButton, AdminModal } from '@/components/admin/primitives';
import type { Tone } from '@/lib/admin/demo-data';

type ProductDetail = {
  id: string;
  code: string;
  qrCode: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  image?: string | null;
  productValue: number;
  rentalPrice: number;
  size?: string | null;
  color?: string | null;
  accessories?: string | null;
  status: string;
  nextAction: string;
  nextAvailableDate?: string | null;
  summary: {
    rentalCount: number;
    revenue: number;
    scheduleState: string;
    todayAvailable: boolean;
  };
  availability: {
    todayAvailable: boolean;
    nextAvailableDate?: string | null;
    reservedSlots: Array<{
      sourceType: 'lead' | 'booking' | 'maintenance';
      sourceId: string;
      status: string;
      startDate: string;
      endDate: string;
      customerName?: string | null;
      customerPhone?: string | null;
      leadId?: string | null;
      bookingId?: string | null;
      reason?: string | null;
    }>;
    availableSlots: Array<{ startDate: string; endDate: string }>;
  };
  relatedLeads: Array<{
    id: string;
    status: string;
    customerName: string;
    customerPhone?: string | null;
    pickupDate?: string | null;
    returnDate?: string | null;
  }>;
  relatedBookings: Array<{
    id: string;
    status: string;
    customerName: string;
    customerPhone?: string | null;
    pickupDate?: string | null;
    returnDate?: string | null;
  }>;
  maintenanceBlocks: Array<{
    id: string;
    reason: string;
    startDate: string;
    endDate: string;
  }>;
};

type ConfirmAction =
  | { type: 'status'; status: 'available' | 'maintenance' | 'damaged' | 'retired'; title: string; description: string }
  | { type: 'archive'; title: string; description: string };

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
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

export default function ProductDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: Tone; message: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const loadProduct = async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await productsApi.getById(params.id);
      setProduct(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.load_failed'));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const primaryAction = useMemo(() => {
    if (!product) return null;
    if (product.status === 'available') {
      return (
        <AdminButton onClick={() => setQuickLeadOpen(true)}>
          {t('inventory.actions.quick_lead')}
        </AdminButton>
      );
    }
    if (product.status === 'reserved') {
      const leadId = product.relatedLeads[0]?.id;
      const bookingId = product.relatedBookings[0]?.id;
      if (leadId) {
        return <Link href={`/admin/leads/${leadId}`} className="button-primary">{t('inventory.next.open_lead')}</Link>;
      }
      if (bookingId) {
        return <Link href={`/admin/bookings/${bookingId}`} className="button-primary">{t('inventory.next.open_booking')}</Link>;
      }
    }
    if (product.status === 'rented' && product.relatedBookings[0]?.id) {
      return <Link href={`/admin/bookings/${product.relatedBookings[0].id}`} className="button-primary">{t('inventory.next.open_booking')}</Link>;
    }
    if (product.status === 'maintenance') {
      return (
        <AdminButton onClick={() => setConfirmAction({ type: 'status', status: 'available', title: t('inventory.actions.mark_available'), description: t('inventory.confirm.available') })}>
          {t('inventory.actions.mark_available')}
        </AdminButton>
      );
    }
    return <Link href="/admin/inventory" className="button-primary">{t('common.back')}</Link>;
  }, [product, t]);

  const saveProduct = async (payload: any) => {
    if (!product) return;
    setBusyAction(product.id);
    setError(null);
    try {
      await productsApi.update(product.id, payload);
      setFeedback({ tone: 'success', message: t('inventory.feedback.updated') });
      setEditOpen(false);
      await loadProduct();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.save_failed'));
    } finally {
      setBusyAction(null);
    }
  };

  const runStatusAction = async () => {
    if (!product || !confirmAction) return;
    setBusyAction(product.id);
    setError(null);
    try {
      if (confirmAction.type === 'archive') {
        await productsApi.archive(product.id);
        setFeedback({ tone: 'success', message: t('inventory.feedback.archived') });
        router.push('/admin/inventory');
        return;
      }
      await productsApi.updateStatus(product.id, confirmAction.status.toUpperCase());
      setFeedback({ tone: 'success', message: t('inventory.feedback.status_updated') });
      setConfirmAction(null);
      await loadProduct();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('inventory.feedback.status_failed'));
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <SectionCard title={t('inventory.loading')}>
        <LoadingSkeleton />
      </SectionCard>
    );
  }

  if (error || !product) {
    return (
      <EmptyState
        title={t('inventory.detail.not_found')}
        description={error ?? t('inventory.detail.not_found_description')}
        action={<Link href="/admin/inventory" className="button-primary">{t('common.backToInventory')}</Link>}
      />
    );
  }

  return (
    <>
      <FeedbackPopup feedback={feedback} error={error} onClose={() => { setFeedback(null); setError(null); }} />

      <PageHeader
        eyebrow={t('inventory.detail.title')}
        title={product.name}
        subtitle={t('inventory.detail.subtitle')}
        nextStep={product.relatedLeads[0]?.id ? t('inventory.next.open_lead') : product.relatedBookings[0]?.id ? t('inventory.next.open_booking') : t('inventory.next.quick_lead')}
        actions={(
          <>
            {primaryAction}
            <ActionMenu
              label={t('common.moreActions')}
              items={[
                { label: t('common.edit'), onSelect: () => setEditOpen(true) },
                { label: t('inventory.actions.quick_lead'), onSelect: () => setQuickLeadOpen(true), disabled: product.status !== 'available' },
                { label: t('inventory.actions.mark_available'), onSelect: () => setConfirmAction({ type: 'status', status: 'available', title: t('inventory.actions.mark_available'), description: t('inventory.confirm.available') }) },
                { label: t('inventory.actions.mark_maintenance'), onSelect: () => setConfirmAction({ type: 'status', status: 'maintenance', title: t('inventory.actions.mark_maintenance'), description: t('inventory.confirm.maintenance') }) },
                { label: t('inventory.actions.mark_damaged'), onSelect: () => setConfirmAction({ type: 'status', status: 'damaged', title: t('inventory.actions.mark_damaged'), description: t('inventory.confirm.damaged') }) },
                { label: t('inventory.actions.retire'), onSelect: () => setConfirmAction({ type: 'status', status: 'retired', title: t('inventory.actions.retire'), description: t('inventory.confirm.retired') }) },
                { label: t('common.archive'), onSelect: () => setConfirmAction({ type: 'archive', title: t('common.archive'), description: t('inventory.confirm.archive') }) },
              ]}
            />
          </>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_360px]">
        <div className="grid gap-6">
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[28px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-[320px] place-items-center text-sm text-[rgb(var(--text-muted))]">{product.name}</div>
              )}
            </div>

            <SectionCard title={t('inventory.detail.info_title')} description={t('inventory.detail.info_description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.columns.code')}</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{product.code}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.columns.qr')}</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{product.qrCode}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.fields.category')}</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{product.category}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('common.status')}</p>
                  <div className="mt-2"><StatusBadge value={product.status} tone={statusTone(product.status)} /></div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.columns.attributes')}</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{[product.size, product.color].filter(Boolean).join(' / ') || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.fields.accessories')}</p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">{product.accessories || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.form.fields.description')}</p>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{product.description || '-'}</p>
                </div>
              </div>
            </SectionCard>
          </div>

          <SummaryRow
            items={[
              { label: t('product.value'), value: <MoneyDisplay value={product.productValue} strong />, detail: t('inventory.summary.value_detail'), tone: 'info' },
              { label: t('product.rental_price'), value: <MoneyDisplay value={product.rentalPrice} strong tone="accent" />, detail: t('inventory.summary.rental_detail'), tone: 'accent' },
              { label: t('inventory.summary.rental_count'), value: product.summary.rentalCount, detail: t('inventory.summary.rental_count_detail'), tone: 'neutral' },
              { label: t('inventory.summary.revenue'), value: <MoneyDisplay value={product.summary.revenue} strong />, detail: product.availability.nextAvailableDate ? formatDate(product.availability.nextAvailableDate) : '-', tone: 'success' },
            ]}
          />

          <SectionCard title={t('product.availability.title')} description={t('inventory.detail.schedule_description')}>
            <DataTable
              columns={[
                t('inventory.columns.schedule'),
                t('booking.customer'),
                t('common.status'),
              ]}
              rows={product.availability.reservedSlots.map((slot) => [
                `${formatDate(slot.startDate)} - ${formatDate(slot.endDate)}`,
                slot.customerName ?? slot.reason ?? '-',
                <StatusBadge key={`${slot.sourceType}-${slot.sourceId}`} value={slot.status} />,
              ])}
              empty={t('inventory.detail.schedule_empty')}
              emptyDescription={t('inventory.detail.schedule_empty_description')}
            />
          </SectionCard>

          <SectionCard title={t('inventory.detail.images_title')} description={t('inventory.detail.images_description')}>
            {product.images.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {product.images.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-[24px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60">
                    <img src={image} alt={`${product.name}-${index + 1}`} className="h-56 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--text-secondary))]">{t('inventory.detail.images_empty')}</p>
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title={t('inventory.detail.related_leads')} description={t('inventory.detail.related_leads_description')}>
              <DataTable
                columns={[t('booking.customer'), t('inventory.columns.schedule'), t('common.status')]}
                rows={product.relatedLeads.map((lead) => [
                  <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="font-semibold text-[rgb(var(--accent-strong))]">{lead.customerName}</Link>,
                  `${formatDate(lead.pickupDate)} - ${formatDate(lead.returnDate)}`,
                  <StatusBadge key={`${lead.id}-status`} value={lead.status} />,
                ])}
                empty={t('inventory.detail.related_leads_empty')}
              />
            </SectionCard>

            <SectionCard title={t('inventory.detail.related_bookings')} description={t('inventory.detail.related_bookings_description')}>
              <DataTable
                columns={[t('booking.customer'), t('inventory.columns.schedule'), t('common.status')]}
                rows={product.relatedBookings.map((booking) => [
                  <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="font-semibold text-[rgb(var(--accent-strong))]">{booking.customerName}</Link>,
                  `${formatDate(booking.pickupDate)} - ${formatDate(booking.returnDate)}`,
                  <StatusBadge key={`${booking.id}-status`} value={booking.status} />,
                ])}
                empty={t('inventory.detail.related_bookings_empty')}
              />
            </SectionCard>
          </div>

          <SectionCard title={t('inventory.detail.maintenance_title')} description={t('inventory.detail.maintenance_description')}>
            <DataTable
              columns={[t('inventory.detail.maintenance_reason'), t('inventory.columns.schedule')]}
              rows={product.maintenanceBlocks.map((block) => [
                block.reason,
                `${formatDateTime(block.startDate)} - ${formatDateTime(block.endDate)}`,
              ])}
              empty={t('inventory.detail.maintenance_empty')}
            />
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard title={t('inventory.qr.title')} description={t('inventory.qr.description')}>
            <InventoryQrActions
              productId={product.id}
              productName={product.name}
              sku={product.code}
              initialCode={product.qrCode}
              onRegenerated={() => {
                void loadProduct();
              }}
            />
          </SectionCard>

          <SectionCard title={t('inventory.detail.workspace_title')} description={t('inventory.detail.workspace_description')}>
            <div className="grid gap-3">
              <div className="rounded-[20px] border border-[rgb(var(--surface-border))]/70 bg-[rgb(var(--surface-3))]/60 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--text-muted))]">{t('inventory.next.label')}</p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {product.relatedLeads[0]?.id ? t('inventory.next.open_lead') : product.relatedBookings[0]?.id ? t('inventory.next.open_booking') : t('inventory.next.quick_lead')}
                </p>
              </div>
              <Link href={`/admin/scan/${encodeURIComponent(product.qrCode)}`} className="button-secondary w-full text-center">
                {t('inventory.actions.open_scan')}
              </Link>
              <AdminButton variant="secondary" onClick={() => setEditOpen(true)}>
                {t('common.edit')}
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setConfirmAction({ type: 'status', status: 'maintenance', title: t('inventory.actions.mark_maintenance'), description: t('inventory.confirm.maintenance') })}>
                {t('inventory.actions.mark_maintenance')}
              </AdminButton>
            </div>
          </SectionCard>
        </div>
      </div>

      <ProductEditorModal
        open={editOpen}
        title={t('inventory.form.edit_title')}
        initialValue={{
          code: product.code,
          name: product.name,
          category: product.category,
          description: product.description,
          productValue: product.productValue,
          rentalPrice: product.rentalPrice,
          size: product.size ?? '',
          color: product.color ?? '',
          accessories: product.accessories ?? '',
          images: product.images,
          status: ['available', 'maintenance', 'damaged', 'retired'].includes(product.status)
            ? product.status as 'available' | 'maintenance' | 'damaged' | 'retired'
            : 'available',
        }}
        busy={busyAction === product.id}
        onClose={() => setEditOpen(false)}
        onSubmit={saveProduct}
      />

      <ProductQuickLeadModal
        open={quickLeadOpen}
        product={{ id: product.id, name: product.name, productValue: product.productValue }}
        onClose={() => setQuickLeadOpen(false)}
        onCreated={(leadId) => {
          setFeedback({ tone: 'success', message: t('inventory.feedback.quickLeadCreated') });
          router.push(`/admin/leads/${leadId}`);
        }}
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
            <AdminButton onClick={() => void runStatusAction()} loading={busyAction === product.id}>
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
