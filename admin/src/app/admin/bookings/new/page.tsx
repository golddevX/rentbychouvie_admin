'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { bookingsApi, leadsApi } from '@/lib/api';
import { DataTable, InlineAlert, KeyValueList, PageHeader, RailSection, SectionCard, StatusBadge, WorkspaceLayout } from '@/components/admin/ui';
import { AdminButton, AdminInput, AdminSelect, AdminSpinner } from '@/components/admin/primitives';
import { useI18n } from '@/hooks/useI18n';

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function priceForDuration(basePrice: number, duration: number) {
  if (duration === 1) return Math.max(0, basePrice - 40000);
  if (duration === 2) return Math.max(0, basePrice - 20000);
  return basePrice;
}

function effectivePickup(date: string, time: string) {
  const value = new Date(`${date}T${time || '10:00'}:00`);
  if (value.getHours() >= 20) {
    value.setDate(value.getDate() + 1);
    value.setHours(0, 0, 0, 0);
  }
  return value;
}

function calendarDays(pickupDate: string, pickupTime: string, returnDate: string, returnTime: string) {
  const pickup = effectivePickup(pickupDate, pickupTime);
  const returned = new Date(`${returnDate}T${returnTime || '17:00'}:00`);
  return Math.max(1, Math.ceil((returned.getTime() - pickup.getTime()) / DAY_MS));
}

function earlyPickupFee(duration: number, actualDays: number) {
  const earlyDays = Math.max(0, actualDays - duration);
  return earlyDays * (duration === 3 ? 10000 : 20000);
}

function securityDepositPolicy(basePrice: number) {
  if (basePrice <= 300000) return { amount: 0, label: 'None', detail: '<=300k: no security deposit' };
  if (basePrice <= 1000000) return { amount: 500000, label: '500k or ID', detail: '350k-1M: hold 500k or customer ID' };
  return { amount: 1000000, label: '1M or 500k + ID', detail: '>1M: hold 1M or 500k plus ID' };
}

function NewBookingPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialLeadId, setInitialLeadId] = useState('');
  const [initialCustomerId, setInitialCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [leadId, setLeadId] = useState(initialLeadId);
  const [customerId, setCustomerId] = useState('');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [pickupDate, setPickupDate] = useState(toDateInput(new Date(Date.now() + DAY_MS)));
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnDate, setReturnDate] = useState(toDateInput(new Date(Date.now() + 3 * DAY_MS)));
  const [returnTime, setReturnTime] = useState('17:00');
  const [durationDays, setDurationDays] = useState(3);
  const [accessories, setAccessories] = useState('veil, jewelry set');

  const hasLeadContext = Boolean(initialLeadId);
  const customerOptions = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; phone?: string; email?: string }>();
    leads.forEach((lead) => {
      const id = lead.customer?.id ?? lead.customerId;
      if (!id || unique.has(id)) return;
      unique.set(id, {
        id,
        name: lead.customer?.name ?? '-',
        phone: lead.customer?.phone ?? undefined,
        email: lead.customer?.email ?? undefined,
      });
    });
    return [...unique.values()];
  }, [leads]);
  const selectedLead = leads.find((lead) => lead.id === leadId);
  const selectedCustomer = customerOptions.find((customer) => customer.id === customerId);
  const selectedItem = items.find((item) => item.id === inventoryItemId);
  const basePrice = Number(selectedItem?.product?.price ?? 0);
  const actualDays = useMemo(() => calendarDays(pickupDate, pickupTime, returnDate, returnTime), [pickupDate, pickupTime, returnDate, returnTime]);
  const rentalFee = priceForDuration(basePrice, durationDays);
  const earlyFee = earlyPickupFee(durationDays, actualDays);
  const totalRental = rentalFee + earlyFee;
  const bookingDeposit = Math.ceil(totalRental * 0.5);
  const securityDeposit = securityDepositPolicy(basePrice);
  const latePickupApplies = Number(pickupTime.split(':')[0] ?? 0) >= 20;

  useEffect(() => {
    setInitialLeadId(searchParams.get('lead') ?? '');
    setInitialCustomerId(searchParams.get('customerId') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadsRes, availabilityRes] = await Promise.all([
          leadsApi.getAll(),
          bookingsApi.getAvailability(
            new Date(`${pickupDate}T${pickupTime}:00`).toISOString(),
            new Date(`${returnDate}T${returnTime}:00`).toISOString(),
          ),
        ]);
        const leadRows = leadsRes.data ?? [];
        const itemRows = availabilityRes.data ?? [];
        setLeads(leadRows);
        setItems(itemRows);
        const preferredLead = leadRows.find((lead: any) => lead.id === initialLeadId) ?? leadRows[0];
        const uniqueCustomers = new Map<string, string>();
        leadRows.forEach((lead: any) => {
          const id = lead.customer?.id ?? lead.customerId;
          if (!id || uniqueCustomers.has(id)) return;
          uniqueCustomers.set(id, id);
        });
        setLeadId(initialLeadId ? (preferredLead?.id ?? '') : '');
        setCustomerId(initialCustomerId || (preferredLead?.customer?.id ?? [...uniqueCustomers.values()][0] ?? ''));
        setInventoryItemId((current) => itemRows.some((item: any) => item.id === current) ? current : (itemRows[0]?.id ?? ''));
      } catch (err: any) {
        setError(err?.response?.data?.message ?? t('booking.loadCreateDataFailed'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [initialCustomerId, initialLeadId, t]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const loadAvailability = async () => {
      try {
        const availabilityRes = await bookingsApi.getAvailability(
          new Date(`${pickupDate}T${pickupTime}:00`).toISOString(),
          new Date(`${returnDate}T${returnTime}:00`).toISOString(),
        );
        if (cancelled) return;
        const itemRows = availabilityRes.data ?? [];
        setItems(itemRows);
        setInventoryItemId((current) => itemRows.some((item: any) => item.id === current) ? current : (itemRows[0]?.id ?? ''));
      } catch (err: any) {
        if (cancelled) return;
        setItems([]);
        setInventoryItemId('');
        setError(err?.response?.data?.message ?? t('booking.loadCreateDataFailed'));
      }
    };
    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [loading, pickupDate, pickupTime, returnDate, returnTime, t]);

  const createBooking = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!customerId || !inventoryItemId) {
        throw new Error('Vui lòng chọn khách hàng và sản phẩm trong kho.');
      }
      if (new Date(`${pickupDate}T${pickupTime}:00`).getTime() >= new Date(`${returnDate}T${returnTime}:00`).getTime()) {
        throw new Error('Ngày trả phải sau ngày lấy.');
      }

      const created = await bookingsApi.create({
        leadId: hasLeadContext ? (leadId || undefined) : undefined,
        customerId,
        pickupDate: new Date(`${pickupDate}T${pickupTime}:00`).toISOString(),
        returnDate: new Date(`${returnDate}T${returnTime}:00`).toISOString(),
        durationDays,
        accessories: accessories.split(',').map((item) => item.trim()).filter(Boolean),
        items: [{ inventoryItemId }],
      });

      router.push(`/admin/payments?booking=${created.data.id}&deposit=${bookingDeposit}`);
    } catch (err: any) {
      setError(err?.message ?? err?.response?.data?.message ?? t('booking.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('bookingOps.eyebrow')}
        title={t('booking.createBooking')}
        subtitle={t('booking.newSubtitle')}
        nextStep={t('booking.newNextStep')}
        actions={<Link href="/admin/bookings" className="button-secondary">{t('booking.backToBookings')}</Link>}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
          <AdminSpinner />
          {t('booking.loadingWorkspace')}
        </div>
      ) : (
        <WorkspaceLayout
          rail={
            <>
              <RailSection title={t('ui.actionPanel')}>
                <div className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-4 text-sm">
                  <div className="flex justify-between"><span>{t('booking.rentalPrice')}</span><b>{currency.format(rentalFee)}</b></div>
                  <div className="mt-2 flex justify-between"><span>{t('booking.earlyPickupFee')}</span><b>{currency.format(earlyFee)}</b></div>
                  <div className="mt-2 flex justify-between"><span>{t('booking.bookingDeposit')}</span><b>{currency.format(bookingDeposit)}</b></div>
                  <div className="mt-2 border-t border-[rgb(var(--surface-border))] pt-2 flex justify-between"><span>{t('booking.security')}</span><b>{securityDeposit.label}</b></div>
                </div>
                <AdminButton className="w-full" onClick={createBooking} loading={submitting}>
                  {t('booking.createAndCollectDeposit')}
                </AdminButton>
              </RailSection>
              <RailSection title={t('booking.ruleChecks')}>
                <InlineAlert tone={latePickupApplies ? 'warning' : 'success'}>
                  {latePickupApplies ? t('booking.pickupAfterEight') : t('booking.pickupCountedNormally')}
                </InlineAlert>
                <InlineAlert tone={securityDeposit.amount > 0 ? 'warning' : 'success'}>
                  {securityDeposit.detail}
                </InlineAlert>
              </RailSection>
            </>
          }
        >
          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

          <SectionCard title={t('booking.formTitle')} description={t('booking.formDesc')}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                {hasLeadContext ? t('booking.leadCustomer') : t('booking.customer')}
                {hasLeadContext ? (
                  <AdminSelect
                    value={leadId}
                    onChange={(event) => {
                      const nextLead = leads.find((lead) => lead.id === event.target.value);
                      setLeadId(event.target.value);
                      setCustomerId(nextLead?.customer?.id ?? '');
                    }}
                  >
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.customer?.name} - {lead.customer?.phone}
                      </option>
                    ))}
                  </AdminSelect>
                ) : (
                  <AdminSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                    {customerOptions.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone ?? customer.email ?? customer.id}
                      </option>
                    ))}
                  </AdminSelect>
                )}
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.productVariantItem')}
                <AdminSelect value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.product?.name} / {item.variant?.size ?? 'standard'} / {item.serialNumber}
                    </option>
                  ))}
                </AdminSelect>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.rentalDuration')}
                <AdminSelect value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>
                  <option value={1}>{t('booking.durationOneDay')}</option>
                  <option value={2}>{t('booking.durationTwoDays')}</option>
                  <option value={3}>{t('booking.durationThreeDays')}</option>
                </AdminSelect>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.accessories')}
                <AdminInput value={accessories} onChange={(event) => setAccessories(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.pickupDate')}
                <AdminInput type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.pickupTime')}
                <AdminInput type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.returnDate')}
                <AdminInput type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t('booking.returnTime')}
                <AdminInput type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} />
              </label>
            </div>
          </SectionCard>

          <SectionCard title={t('booking.previewBreakdown')} description={t('booking.previewBreakdownDesc')}>
            <KeyValueList
              items={[
                { label: t('booking.customer'), value: selectedLead?.customer?.name ?? selectedCustomer?.name ?? '-' },
                { label: t('booking.product'), value: selectedItem?.product?.name ?? '-' },
                { label: t('booking.variant'), value: `${selectedItem?.variant?.size ?? 'standard'} / ${selectedItem?.variant?.color ?? '-'}` },
                { label: t('booking.baseThreeDayPrice'), value: currency.format(basePrice) },
                { label: t('booking.durationRental'), value: currency.format(rentalFee) },
                { label: t('booking.bookingDepositShort'), value: currency.format(bookingDeposit) },
                { label: t('booking.securityDeposit'), value: securityDeposit.label },
                { label: t('booking.inventoryState'), value: <StatusBadge value={String(selectedItem?.status ?? 'available').toLowerCase()} /> },
              ]}
            />
          </SectionCard>

          <SectionCard title={t('booking.availabilityTimeline')} description={t('booking.availabilityTimelineDesc')}>
            <DataTable
              columns={[t('booking.item'), t('booking.product'), t('booking.variant'), t('return.conditionLabel'), t('booking.lockPolicy')]}
              rows={items.map((item) => [
                item.serialNumber,
                item.product?.name ?? '-',
                `${item.variant?.size ?? 'standard'} / ${item.variant?.color ?? '-'}`,
                item.condition ?? '-',
                item.id === inventoryItemId ? t('booking.selectedNotLocked') : t('inventory.status.available'),
              ])}
            />
          </SectionCard>
        </WorkspaceLayout>
      )}
    </>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><AdminSpinner />...</div>}>
      <NewBookingPageContent />
    </Suspense>
  );
}
