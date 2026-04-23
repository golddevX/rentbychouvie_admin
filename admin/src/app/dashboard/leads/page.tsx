'use client';

import React, { useEffect, useState } from 'react';
import { leadsApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

interface Lead {
  id: string;
  customer: { name: string; email: string };
  status: string;
  createdAt: string;
}

export default function LeadsPage() {
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeads = async () => {
      try {
        const response = await leadsApi.getAll();
        setLeads(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('nav.leads')}</h1>
        <a
          href="/dashboard/leads/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + {t('leadOps.createLead')}
        </a>
      </div>

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium">{t('lead.customer')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('lead.email')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('paymentOps.history.created')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">
                    {lead.customer.name}
                  </td>
                  <td className="px-6 py-3">{lead.customer.email}</td>
                  <td className="px-6 py-3">
                    <span className="badge-status bg-blue-100 text-blue-800">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <a
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t('common.open')}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
