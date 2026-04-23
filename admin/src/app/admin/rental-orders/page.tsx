'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inventoryApi, paymentsApi, rentalOrdersApi } from '@/lib/api';
import { apiUrl } from '@/lib/api-client';
import { DataTable, PageHeader, SectionCard, StatusBadge } from '@/components/admin/ui';
import { AdminButton, AdminInput, AdminModal, AdminSelect } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';

const orderStatusOptions = [
  'draft',
  'pending_confirmation',
  'confirmed',
  'preparing',
  'picked_up',
  'rented_out',
  'returned',
  'overdue',
  'cancelled',
];

const paymentStatusOptions = [
  'unpaid',
  'partially_paid',
  'paid',
  'refunded',
  'failed',
];

function toIsoLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function RentalOrdersPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initializingPay, setInitializingPay] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<'unknown' | 'available' | 'blocked'>('unknown');
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<Array<{ id: string; serialNumber: string; productName: string }>>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    startDateTime: toIsoLocal(new Date(Date.now() + 24 * 3600000)),
    endDateTime: toIsoLocal(new Date(Date.now() + 72 * 3600000)),
    quantity: 1,
    subtotal: 0,
    depositAmount: 200000,
    additionalFees: 0,
    discountAmount: 0,
    notes: '',
    status: 'draft',
    paymentStatus: 'unpaid',
  });

  const totalAmount = useMemo(
    () => Number(form.subtotal) + Number(form.depositAmount) + Number(form.additionalFees) - Number(form.discountAmount),
    [form.subtotal, form.depositAmount, form.additionalFees, form.discountAmount],
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, itemsRes] = await Promise.all([
        rentalOrdersApi.getAll(),
        inventoryApi.getItems('AVAILABLE'),
      ]);
      setOrders(ordersRes.data ?? []);
      setItems((itemsRes.data ?? []).map((item: any) => ({
        id: item.id,
        serialNumber: item.serialNumber,
        productName: item.product?.name ?? t('rentalOrders.unknownProduct'),
      })));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!form.startDateTime || !form.endDateTime || selectedItemIds.length === 0) {
      setAvailability('unknown');
      return;
    }

    let active = true;
    rentalOrdersApi
      .checkAvailability({
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
        inventoryItemIds: selectedItemIds,
      })
      .then(() => {
        if (active) setAvailability('available');
      })
      .catch(() => {
        if (active) setAvailability('blocked');
      });
    return () => {
      active = false;
    };
  }, [form.startDateTime, form.endDateTime, selectedItemIds]);

  const submitCreate = async () => {
    if (!selectedItemIds.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
        quantity: Number(form.quantity),
        depositAmount: Number(form.depositAmount),
        additionalFees: Number(form.additionalFees),
        discountAmount: Number(form.discountAmount),
        notes: form.notes,
        status: form.status,
        paymentStatus: form.paymentStatus,
        items: selectedItemIds.map((id) => ({
          inventoryItemId: id,
          quantity: 1,
          unitPrice: Math.max(0, Number(form.subtotal) / selectedItemIds.length),
        })),
      };

      const created = await rentalOrdersApi.create(payload);
      setOpenCreate(false);
      await loadData();

      setInitializingPay(true);
      try {
        const returnUrl = `${window.location.origin}/admin/confirmations/payment-pending/${created.data.id}`;
        const callbackUrl = apiUrl('/api/payments/webhooks/payos');
        const paymentInit = await paymentsApi.initializeRentalOrder(created.data.id, {
          provider: 'PAYOS',
          returnUrl,
          callbackUrl,
        });
        if (paymentInit.data?.checkoutUrl) {
          window.open(paymentInit.data.checkoutUrl, '_blank', 'noopener,noreferrer');
        }
      } finally {
        setInitializingPay(false);
      }
      router.push(`/admin/confirmations/rental-order-created/${created.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('rentalOrders.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('rentalOrders.title')}
        title={t('rentalOrders.manageTitle')}
        subtitle={t('rentalOrders.subtitle')}
        nextStep={t('rentalOrders.nextStep')}
        actions={<AdminButton onClick={() => setOpenCreate(true)}>{t('rentalOrders.create')}</AdminButton>}
      />

      <SectionCard title={t('rentalOrders.queueTitle')} description={t('rentalOrders.queueDesc')}>
        {loading ? (
          <p className="text-sm text-[rgb(var(--text-secondary))]">{t('rentalOrders.loading')}</p>
        ) : (
          <DataTable
            columns={[t('rentalOrders.order'), t('ui.customer'), t('rentalOrders.dateTime'), t('rentalOrders.orderStatus'), t('rentalOrders.payment'), t('rentalOrders.total'), t('common.actions')]}
            rows={orders.map((order) => [
              order.orderCode,
              order.customer?.name ?? '-',
              `${new Date(order.startDateTime).toLocaleString('vi-VN')} - ${new Date(order.endDateTime).toLocaleString('vi-VN')}`,
              <StatusBadge key={`status-${order.id}`} value={order.status} />,
              <StatusBadge key={`payment-${order.id}`} value={order.paymentStatus} />,
              new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(order.totalAmount ?? 0),
              <Link key={`link-${order.id}`} className="font-semibold text-[rgb(var(--accent-solid))]" href={`/admin/rental-orders/${order.id}`}>{t('common.open')}</Link>,
            ])}
          />
        )}
      </SectionCard>

      <AdminModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title={t('rentalOrders.create')}
        size="xl"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setOpenCreate(false)}>{t('common.cancel')}</AdminButton>
            <AdminButton onClick={submitCreate} loading={submitting || initializingPay} disabled={availability === 'blocked' || selectedItemIds.length === 0}>
              {t('rentalOrders.createOrder')}
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            {t('leadOps.form.name')}
            <AdminInput value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('leadOps.form.email')}
            <AdminInput value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('leadOps.form.phone')}
            <AdminInput value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('payment.fromBooking.quantity')}
            <AdminInput type="number" value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value || 1) }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.startDateTime')}
            <AdminInput type="datetime-local" value={form.startDateTime} onChange={(e) => setForm((s) => ({ ...s, startDateTime: e.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.endDateTime')}
            <AdminInput type="datetime-local" value={form.endDateTime} onChange={(e) => setForm((s) => ({ ...s, endDateTime: e.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.orderStatus')}
            <AdminSelect value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              {orderStatusOptions.map((status) => <option key={status} value={status}>{t(`rentalOrders.status.${status}`)}</option>)}
            </AdminSelect>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.paymentStatus')}
            <AdminSelect value={form.paymentStatus} onChange={(e) => setForm((s) => ({ ...s, paymentStatus: e.target.value }))}>
              {paymentStatusOptions.map((status) => <option key={status} value={status}>{t(`rentalOrders.paymentStatusValue.${status}`)}</option>)}
            </AdminSelect>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.subtotal')}
            <AdminInput type="number" value={form.subtotal} onChange={(e) => setForm((s) => ({ ...s, subtotal: Number(e.target.value || 0) }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.deposit')}
            <AdminInput type="number" value={form.depositAmount} onChange={(e) => setForm((s) => ({ ...s, depositAmount: Number(e.target.value || 0) }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.additionalFees')}
            <AdminInput type="number" value={form.additionalFees} onChange={(e) => setForm((s) => ({ ...s, additionalFees: Number(e.target.value || 0) }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            {t('rentalOrders.discount')}
            <AdminInput type="number" value={form.discountAmount} onChange={(e) => setForm((s) => ({ ...s, discountAmount: Number(e.target.value || 0) }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">
            {t('leadOps.form.notes')}
            <textarea className="field h-24 py-3" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4">
          <p className="mb-2 text-sm font-semibold">{t('rentalOrders.itemSelection')}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm ${selectedItemIds.includes(item.id) ? 'border-[rgb(var(--accent-solid))] bg-[rgb(var(--surface-4))]' : 'border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-2))]'}`}
                onClick={() =>
                  setSelectedItemIds((prev) =>
                    prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                  )
                }
              >
                <p className="font-semibold">{item.serialNumber}</p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">{item.productName}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm">
          <div className="flex justify-between"><span>{t('rentalOrders.totalAmount')}</span><b>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(totalAmount)}</b></div>
          <p className={`mt-2 text-xs ${availability === 'available' ? 'text-[rgb(var(--success))]' : availability === 'blocked' ? 'text-[rgb(var(--danger))]' : 'text-[rgb(var(--text-secondary))]'}`}>
            {availability === 'available'
              ? t('rentalOrders.availabilityPassed')
              : availability === 'blocked'
                ? t('rentalOrders.availabilityBlocked')
                : t('rentalOrders.availabilityUnknown')}
          </p>
        </div>
        {error && <p className="mt-3 text-sm text-[rgb(var(--danger))]">{error}</p>}
      </AdminModal>
    </>
  );
}
