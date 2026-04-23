'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { bookings, currency, inventory, leads } from '@/lib/admin/demo-data';
import { inventoryApi, pickupApi, productsApi, returnsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { ActionQueue, DataTable, FormSection, InlineAlert, KeyValueList, PageHeader, PermissionButton, QrPreviewCard, RailSection, SectionCard, StatusBadge, SummaryRow, WorkspaceLayout } from './ui';
import { AdminButton, AdminInput, AdminSelect } from './primitives';

export function ImageManager({ label }: { label?: string }) {
  const { t } = useI18n();
  const [images, setImages] = useState([
    'front-view.jpg',
    'detail-shot.jpg',
  ]);

  return (
    <FormSection title={label ?? t('inventory.itemImages')} description={t('inventory.itemDetailsDesc')}>
      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <div key={image} className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] p-3">
            <div className="aspect-square rounded-lg bg-white" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="truncate">{image}</span>
              <button
                className="font-semibold text-[rgb(var(--accent-solid))]"
                onClick={() => setImages((current) => {
                  const selected = current[index];
                  if (!selected) return current;
                  return [selected, ...current.filter((_, i) => i !== index)];
                })}
              >
                {t('common.active')}
              </button>
            </div>
          </div>
        ))}
        <button
          className="grid aspect-square place-items-center rounded-xl border border-dashed border-[rgb(var(--surface-border))] text-sm font-semibold text-[rgb(var(--text-secondary))]"
          onClick={() => setImages((current) => [...current, `image-${current.length + 1}.jpg`])}
        >
          {t('common.create')}
        </button>
      </div>
    </FormSection>
  );
}

export function InventoryIntakeFlow() {
  const { t } = useI18n();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [condition, setCondition] = useState('excellent');
  const [location, setLocation] = useState('Rack A1');
  const [itemCode, setItemCode] = useState('AUTO-GENERATED');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const selectedProduct = products.find((product) => product.id === productId);
  const variants = selectedProduct?.variants ?? [];
  const qrCode = useMemo(() => `RF-${(selectedProduct?.name ?? 'ITEM').replace(/\W+/g, '-').slice(0, 18).toUpperCase()}-${Date.now().toString().slice(-4)}`, [selectedProduct?.name]);

  useEffect(() => {
    let active = true;
    productsApi.getAll()
      .then((response) => {
        if (!active) return;
        const rows = response.data ?? [];
        setProducts(rows);
        setProductId(rows[0]?.id ?? '');
        setVariantId(rows[0]?.variants?.[0]?.id ?? '');
      })
      .catch(() => {
        if (active) setFeedback({ tone: 'danger', message: 'Unable to load products for intake.' });
      });
    return () => {
      active = false;
    };
  }, []);

  const saveItem = async () => {
    if (!productId) {
      setFeedback({ tone: 'danger', message: 'Select a product before saving.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const created = await inventoryApi.createItem({
        productId,
        variantId: variantId || undefined,
        condition,
        imageUrls: [],
      });
      setItemCode(created.data?.serialNumber ?? 'AUTO-GENERATED');
      setFeedback({ tone: 'success', message: 'Inventory item created and QR generated.' });
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? 'Unable to create inventory item.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('inventory.intake')}
        title={t('inventory.addRentableItem')}
        subtitle={t('inventory.addRentableItemSubtitle')}
        nextStep={t('inventory.addRentableItemNextStep')}
        actions={<PermissionButton permission="manage_inventory" onClick={saveItem} disabled={saving}>{saving ? t('common.saving') : t('inventory.saveItem')}</PermissionButton>}
      />
      {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title={t('inventory.itemSetup')} description={t('inventory.itemSetupDesc')}>
          <div className="space-y-4">
            <FormSection title={t('inventory.productSelection')} description={t('inventory.productSelectionDesc')}>
              <AdminSelect value={productId} onChange={(event) => setProductId(event.target.value)}>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </AdminSelect>
              <AdminSelect value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                <option value="">{t('inventory.default')}</option>
                {variants.map((variant: any) => (
                  <option key={variant.id} value={variant.id}>{variant.name} / {variant.size ?? '-'} / {variant.color ?? '-'}</option>
                ))}
              </AdminSelect>
              <p className="text-xs text-[rgb(var(--text-muted))]">{t('inventory.productSelectionDesc')}</p>
            </FormSection>
            <FormSection title={t('inventory.itemDetails')} description={t('inventory.itemDetailsDesc')}>
              <AdminInput value={itemCode} onChange={(event) => setItemCode(event.target.value)} />
              <AdminSelect value={condition} onChange={(event) => setCondition(event.target.value)}>
                <option value="excellent">{t('inventory.condition.excellent')}</option>
                <option value="good">{t('inventory.condition.good')}</option>
                <option value="fair">{t('inventory.condition.fair')}</option>
              </AdminSelect>
              <AdminInput placeholder={t('inventory.rackLocation')} value={location} onChange={(event) => setLocation(event.target.value)} />
            </FormSection>
            <ImageManager label={t('inventory.itemImages')} />
          </div>
        </SectionCard>

        <div className="space-y-6">
          <QrPreviewCard code={qrCode} />
          <SectionCard title={t('inventory.intakeChecklist')} description={t('inventory.intakeChecklistDesc')}>
            <div className="space-y-3 text-sm">
              {[
                t('inventory.checklist.productSelected'),
                t('inventory.checklist.variantConfirmed'),
                t('inventory.checklist.imagesAttached'),
                t('inventory.checklist.qrGenerated'),
                t('inventory.checklist.labelPrinted'),
              ].map((step, index) => (
                <div key={step} className="flex items-center justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3">
                  <span>{step}</span>
                  <StatusBadge value={index < 4 ? 'ready' : 'next'} tone={index < 4 ? 'success' : 'warning'} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export function BookingCreateFlow() {
  const { t } = useI18n();
  const [customer, setCustomer] = useState(leads[0].customer);
  const [itemCode, setItemCode] = useState(inventory[0].itemCode);
  const [days, setDays] = useState(2);
  const selectedItem = inventory.find((item) => item.itemCode === itemCode) ?? inventory[0];
  const pricePerDay = selectedItem.product.includes('Gown') || selectedItem.product.includes('Hoi') ? 450000 : 250000;
  const rentalFee = days * pricePerDay;
  const deposit = 200000;

  return (
    <>
      <PageHeader
        eyebrow={t('booking.flow')}
        title={t('booking.flowTitle')}
        subtitle={t('booking.flowSubtitle')}
        nextStep={t('booking.flowNextStep')}
        actions={<Link href="/admin/bookings/new" className="button-primary">{t('booking.createBooking')}</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title={t('booking.bookingDetails')} description={t('booking.bookingDetailsDesc')}>
          <div className="space-y-4">
            <FormSection title={t('booking.customer')} description={t('booking.bookingDetailsDesc')}>
              <AdminSelect value={customer} onChange={(event) => setCustomer(event.target.value)}>
                {leads.map((lead) => <option key={lead.id}>{lead.customer}</option>)}
              </AdminSelect>
            </FormSection>
            <FormSection title={t('booking.inventoryItem')} description={t('booking.inventoryItemDesc')}>
              <AdminSelect value={itemCode} onChange={(event) => setItemCode(event.target.value)}>
                {inventory.filter((item) => item.status === 'available').map((item) => <option key={item.id}>{item.itemCode}</option>)}
              </AdminSelect>
              <div className="rounded-xl bg-[rgb(var(--surface-3))] p-4 text-sm">
                <p className="font-semibold">{selectedItem.product}</p>
                <p className="mt-1 text-[rgb(var(--text-secondary))]">{selectedItem.variant} / {selectedItem.size}</p>
              </div>
            </FormSection>
            <FormSection title={t('booking.datesPricing')} description={t('booking.datesPricingDesc')}>
              <AdminInput type="date" defaultValue="2026-05-01" />
              <AdminInput type="date" defaultValue="2026-05-03" />
              <AdminInput type="number" value={days} onChange={(event) => setDays(Number(event.target.value))} />
            </FormSection>
          </div>
        </SectionCard>

        <SectionCard title={t('booking.availabilityPrice')} description={t('booking.availabilityPriceDesc')}>
          <div className="space-y-3">
            <div className="rounded-xl bg-[rgb(var(--surface-3))] p-4">
              <p className="text-sm text-[rgb(var(--text-secondary))]">{t('booking.availability')}</p>
              <div className="mt-2"><StatusBadge value="available" tone="success" /></div>
            </div>
            <div className="rounded-xl bg-[rgb(var(--surface-3))] p-4 text-sm">
              <div className="flex justify-between"><span>{t('booking.rentalFee')}</span><b>{currency(rentalFee)}</b></div>
              <div className="mt-3 flex justify-between"><span>{t('booking.deposit')}</span><b>{currency(deposit)}</b></div>
              <div className="mt-3 border-t border-[rgb(var(--surface-border))] pt-3 flex justify-between"><span>{t('booking.totalDue')}</span><b>{currency(rentalFee + deposit)}</b></div>
            </div>
            <Link href="/admin/payments" className="button-primary w-full">{t('booking.continueToPayment')}</Link>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function PickupDeskFlow() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState(bookings[1].id);
  const active = bookings.find((booking) => booking.id === activeId) ?? bookings[1];
  const [scanned, setScanned] = useState(active.itemCode);
  const [conditionNotes, setConditionNotes] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const match = scanned === active.itemCode;
  const queue = bookings.filter((b) => ['deposit_received', 'confirmed', 'scheduled_pickup', 'picked_up'].includes(b.status));
  const paymentWarning = active.paid < active.rentalFee + active.deposit;

  const scanBooking = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await pickupApi.scan(active.id, scanned);
      setFeedback({ tone: match ? 'success' : 'danger', message: match ? t('pickup.match') : t('pickup.mismatch') });
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('scan.resolveFailed') });
    } finally {
      setBusy(false);
    }
  };

  const confirmPickup = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await pickupApi.confirm(active.id, [scanned], conditionNotes || undefined);
      setFeedback({ tone: 'success', message: t('pickup.confirmed') });
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('pickup.confirmFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('pickup.desk')}
        title={t('pickup.validateHandOff')}
        subtitle={t('pickup.validateHandOffSubtitle')}
        nextStep={t('pickup.validateHandOffNextStep')}
        meta={<StatusBadge value={`${queue.length} ${t('pickup.inQueue')}`} tone="info" />}
        actions={<AdminButton onClick={confirmPickup} disabled={!match || busy} loading={busy}>{t('pickup.confirmPickup')}</AdminButton>}
      />
      <SummaryRow
        items={[
          { label: t('pickup.bookingQueue'), value: queue.length, detail: t('pickup.queueDesc'), tone: 'info' },
          { label: t('pickup.activePickup'), value: active.id, detail: active.customer, tone: paymentWarning ? 'warning' : 'success' },
          { label: t('pickup.match'), value: match ? t('common.yes') : t('common.no'), detail: scanned, tone: match ? 'success' : 'danger' },
          { label: t('payment.status.pending'), value: paymentWarning ? currency(active.rentalFee + active.deposit - active.paid) : currency(0), detail: t('pickup.paymentGuard'), tone: paymentWarning ? 'warning' : 'success' },
        ]}
      />
      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('booking.actionsPanel')}>
              <AdminButton className="w-full" onClick={scanBooking} loading={busy}>{t('scan.resolveQr')}</AdminButton>
              <AdminButton className="w-full" onClick={confirmPickup} disabled={!match || busy || paymentWarning} loading={busy}>{t('pickup.confirmPickup')}</AdminButton>
              <Link href={`/admin/bookings/${active.id}`} className="button-secondary w-full text-center">{t('booking.open')}</Link>
              <Link href={`/admin/scan/${encodeURIComponent(scanned)}`} className="button-secondary w-full text-center">{t('booking.openScanResult')}</Link>
            </RailSection>
            <RailSection title={t('pickup.operatorNotes')}>
              <textarea className="field h-24 w-full py-3" value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} />
            </RailSection>
          </>
        }
      >
        <SectionCard title={t('pickup.bookingQueue')}>
          <ActionQueue
            items={queue.map((booking) => ({
              id: booking.id,
              title: `${booking.id} / ${booking.customer}`,
              detail: `${booking.pickupAt} / ${booking.itemCode}`,
              status: booking.status,
              tone: booking.id === activeId ? 'accent' : 'info',
              onClick: () => { setActiveId(booking.id); setScanned(booking.itemCode); },
              action: booking.id === activeId ? t('pickup.activePickup') : t('common.open'),
            }))}
          />
        </SectionCard>
        <SectionCard title={t('pickup.activePickup')} description={t('pickup.activePickupDesc')}>
          {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}
          {paymentWarning ? <InlineAlert tone="warning">{t('pickup.paymentWarning')}</InlineAlert> : null}
          <div className="mt-4">
            <DataTable
              columns={[t('pickup.expectedItem'), t('pickup.scannedItem'), t('common.status')]}
              rows={[
                [
                  <div key="expected"><p className="font-semibold">{active.itemCode}</p><p className="text-xs text-[rgb(var(--text-muted))]">{active.product}</p></div>,
                  scanned,
                  <StatusBadge key="match" value={match ? t('pickup.match') : t('pickup.mismatch')} tone={match ? 'success' : 'danger'} />,
                ],
              ]}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormSection title={t('pickup.scannedItem')} description={t('pickup.scannedItemDesc')}>
              <AdminInput value={scanned} onChange={(event) => setScanned(event.target.value)} />
            </FormSection>
            <FormSection title={t('booking.nextStep')} description={t('pickup.validateHandOffNextStep')}>
              <AdminButton onClick={scanBooking} loading={busy}>{t('scan.resolveQr')}</AdminButton>
            </FormSection>
          </div>
        </SectionCard>
        <SectionCard title={t('pickup.expectedItem')} description={t('pickup.expectedItemDesc')}>
          <InlineAlert tone={match ? 'success' : 'danger'}>
            {match ? t('pickup.match') : t('pickup.mismatch')}
          </InlineAlert>
          <div className="mt-4">
            <KeyValueList
              items={[
                { label: t('pickup.expectedItem'), value: active.itemCode },
                { label: t('booking.product'), value: active.product },
                { label: t('booking.customer'), value: active.customer },
                { label: t('pickup.scannedItem'), value: scanned },
              ]}
            />
          </div>
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}

export function ReturnDeskFlow() {
  const { t } = useI18n();
  const [condition, setCondition] = useState('good');
  const [lateDays, setLateDays] = useState(0);
  const [lostAccessoryValue, setLostAccessoryValue] = useState(0);
  const [affectsNextBooking, setAffectsNextBooking] = useState(false);
  const [scanned, setScanned] = useState('AODAI-RED-002');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const active = bookings.find((booking) => booking.status === 'damage_review') ?? bookings[2];
  const dirtyHold = condition === 'dirty' ? 500000 : 0;
  const repairFee = condition === 'damaged' ? 150000 : condition === 'incomplete' ? 250000 : 0;
  const lateFee = lateDays * Math.ceil(active.rentalFee / 3);
  const nextBookingFee = affectsNextBooking ? active.rentalFee : 0;
  const fees = dirtyHold + repairFee + lateFee + lostAccessoryValue + nextBookingFee;
  const deposit = 500000;
  const returnQueue = bookings.filter((booking) => ['picked_up', 'return_pending', 'damage_review'].includes(booking.status));

  const settleReturn = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await returnsApi.settle(active.id, {
        qrCodes: [scanned],
        condition: condition === 'good' ? 'clean' : condition as 'dirty' | 'damaged' | 'incomplete',
        damageFee: repairFee,
        accessoryLostValues: lostAccessoryValue ? [lostAccessoryValue] : [],
        affectsNextBooking,
      });
      setFeedback({ tone: 'success', message: t('return.settled') });
    } catch (err: any) {
      setFeedback({ tone: 'danger', message: err?.response?.data?.message ?? t('return.settleFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('return.desk')}
        title={t('return.inspectReturn')}
        subtitle={t('return.inspectReturnSubtitle')}
        nextStep={t('return.inspectReturnNextStep')}
        meta={<StatusBadge value={`${returnQueue.length} ${t('return.inQueue')}`} tone="warning" />}
        actions={<AdminButton onClick={settleReturn} loading={busy}>{t('return.completeReturn')}</AdminButton>}
      />
      <SummaryRow
        items={[
          { label: t('return.returnedItem'), value: active.itemCode, detail: active.customer, tone: 'info' },
          { label: t('return.condition'), value: condition, detail: t('return.conditionDesc'), tone: fees > 0 ? 'warning' : 'success' },
          { label: t('return.totalDeduction'), value: currency(fees), detail: t('return.refundPreviewDesc'), tone: fees > 0 ? 'warning' : 'success' },
          { label: t('return.refundAmount'), value: currency(Math.max(deposit - fees, 0)), detail: t('return.depositHeld'), tone: 'accent' },
        ]}
      />
      <WorkspaceLayout
        rail={
          <>
            <RailSection title={t('return.refundPreview')}>
              <div className="rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3 text-sm">
                <div className="flex justify-between"><span>{t('return.depositHeld')}</span><b>{currency(deposit)}</b></div>
                <div className="mt-2 flex justify-between"><span>{t('return.totalDeduction')}</span><b>{currency(fees)}</b></div>
                <div className="mt-2 border-t border-[rgb(var(--surface-border))] pt-2 flex justify-between"><span>{t('return.refundAmount')}</span><b>{currency(Math.max(deposit - fees, 0))}</b></div>
              </div>
              {dirtyHold > 0 && <InlineAlert tone="warning">{t('return.dirtyHoldHint')}</InlineAlert>}
              <AdminButton className="w-full" onClick={settleReturn} loading={busy}>{t('return.completeReturn')}</AdminButton>
              <Link href={`/admin/bookings/${active.id}`} className="button-secondary w-full text-center">{t('booking.open')}</Link>
            </RailSection>
          </>
        }
      >
        {feedback ? <InlineAlert tone={feedback.tone}>{feedback.message}</InlineAlert> : null}
        <SectionCard title={t('return.desk')} description={t('return.inspectReturnSubtitle')}>
          <ActionQueue
            items={returnQueue.map((booking) => ({
              id: booking.id,
              title: `${booking.id} / ${booking.customer}`,
              detail: `${booking.returnAt} / ${booking.itemCode}`,
              status: booking.status,
              tone: booking.status === 'damage_review' ? 'danger' : 'warning',
              href: `/admin/returns?booking=${booking.id}`,
              action: t('return.inspection'),
            }))}
          />
        </SectionCard>
        <SectionCard title={t('return.inspection')}>
          <InlineAlert tone={fees > 0 ? 'warning' : 'success'}>
            {fees > 0 ? t('return.conditionDesc') : t('return.refundPreviewDesc')}
          </InlineAlert>
          <div className="mt-4 space-y-4">
            <FormSection title={t('return.returnedItem')} description={t('return.returnedItemDesc')}>
              <AdminInput value={scanned} onChange={(event) => setScanned(event.target.value)} />
            </FormSection>
            <FormSection title={t('return.condition')} description={t('return.conditionDesc')}>
              <AdminSelect value={condition} onChange={(event) => setCondition(event.target.value)}>
                <option value="good">{t('inventory.condition.good')}</option>
                <option value="dirty">{t('inventory.condition.dirty')}</option>
                <option value="damaged">{t('inventory.condition.damaged')}</option>
                <option value="incomplete">{t('inventory.condition.incomplete')}</option>
              </AdminSelect>
            </FormSection>
            <FormSection title={t('return.feeInputs')} description={t('return.feeInputsDesc')}>
              <AdminInput type="number" min={0} value={lateDays} onChange={(event) => setLateDays(Number(event.target.value || 0))} />
              <AdminInput type="number" min={0} value={lostAccessoryValue} onChange={(event) => setLostAccessoryValue(Number(event.target.value || 0))} />
              <label className="flex items-center justify-between rounded-xl border border-[rgb(var(--surface-border))] bg-[rgb(var(--surface-3))] px-4 py-3 text-sm font-semibold">
                {t('returnOps.inspection.affectsNextBooking')}
                <input type="checkbox" checked={affectsNextBooking} onChange={(event) => setAffectsNextBooking(event.target.checked)} />
              </label>
            </FormSection>
            <ImageManager label={t('return.inspectionImages')} />
          </div>
        </SectionCard>
        <SectionCard title={t('return.refundPreview')} description={t('return.refundPreviewDesc')}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.depositHeld')}</span><b>{currency(deposit)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.dirtyHold')}</span><b>{currency(dirtyHold)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.lateReturn')}</span><b>{currency(lateFee)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.accessoryLost')}</span><b>{currency(lostAccessoryValue)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.nextBookingImpact')}</span><b>{currency(nextBookingFee)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.totalDeduction')}</span><b>{currency(fees)}</b></div>
            <div className="flex justify-between rounded-xl bg-[rgb(var(--surface-3))] px-4 py-3"><span>{t('return.refundAmount')}</span><b>{currency(Math.max(deposit - fees, 0))}</b></div>
          </div>
        </SectionCard>
      </WorkspaceLayout>
    </>
  );
}
