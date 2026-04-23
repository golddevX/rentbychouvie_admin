'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { EmptyState, InlineAlert, PageHeader, PermissionButton, SectionCard, StatusBadge, Timeline } from '@/components/admin/ui';
import { AdminSpinner } from '@/components/admin/primitives';

export default function LeadDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLead = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.getById(params.id);
      setLead(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.generic'));
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const runMutation = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await loadLead();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('errors.statusFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
        <AdminSpinner />
        {t('common.loading')}
      </div>
    );
  }

  if (!lead) {
    return <EmptyState title={t('errors.notFound')} description={error ?? t('errors.generic')} />;
  }

  const customer = lead.customer ?? {};
  const status = String(lead.status ?? 'new').toLowerCase();

  return (
    <>
      <PageHeader
        eyebrow={t('lead.detail')}
        title={customer.name ?? lead.id}
        subtitle={`${lead.notes ?? 'Rental request'}. ${t('lead.salesOwner')}: ${lead.assignedTo?.fullName ?? 'Unassigned'}.`}
        actions={
          <>
            <PermissionButton
              permission="manage_leads"
              className="button-secondary"
              onClick={() => runMutation(() => leadsApi.markContacted(lead.id))}
              disabled={busy}
            >
              {t('lead.status.contacted')}
            </PermissionButton>
            <PermissionButton
              permission="manage_leads"
              className="button-secondary"
              onClick={() => runMutation(() => leadsApi.requestDeposit(lead.id, { quotedPrice: lead.quotedPrice }))}
              disabled={busy}
            >
              {t('lead.status.deposit_requested')}
            </PermissionButton>
            <Link href="/admin/appointments" className="button-secondary">{t('lead.createAppointment')}</Link>
            <Link href={`/admin/bookings/new?lead=${lead.id}`} className="button-primary">{t('lead.convertToBooking')}</Link>
          </>
        }
      />

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title={t('lead.customerProfile')} description={t('lead.customerProfileDesc')}>
          <div className="space-y-4 text-sm">
            {[
              [t('lead.email'), customer.email ?? '-'],
              [t('lead.phone'), customer.phone ?? '-'],
              [t('lead.source'), lead.source ?? '-'],
              [t('lead.budget'), new Intl.NumberFormat('vi-VN').format(Number(lead.quotedPrice ?? 0))],
              [t('common.status'), <StatusBadge key="status" value={status} />],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-[rgb(var(--surface-3))]/70 px-4 py-3">
                <span className="text-[rgb(var(--text-secondary))]">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('lead.workflow')} description={t('lead.workflowDesc')}>
          <Timeline items={['Lead captured', `Assigned to ${lead.assignedTo?.fullName ?? 'Unassigned'}`, 'Contact within 1 hour', status === 'booking_created' ? 'Converted to booking' : 'Request 50% deposit']} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('lead.notes')}>
          <p className="leading-7 text-[rgb(var(--text-secondary))]">{lead.notes ?? '-'}</p>
        </SectionCard>
        <SectionCard title={t('lead.suggestedAppointments')} description={t('lead.suggestedAppointmentsDesc')}>
          <div className="space-y-3">
            {['consultation', 'fitting', 'pickup'].map((type) => (
              <Link href="/admin/appointments" key={type} className="block rounded-2xl border border-[rgb(var(--surface-border))] bg-white/60 p-4 hover:bg-[rgb(var(--surface-3))]/60">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{type}</p>
                  <StatusBadge value="scheduled" />
                </div>
                <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{t('lead.createAppointment')}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
