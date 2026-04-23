'use client';

import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

interface InventoryItem {
  id: string;
  qrCode: string;
  product: { name: string };
  status: string;
}

export default function InventoryPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrInput, setQrInput] = useState('');

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await inventoryApi.getItems();
        setItems(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  const handleQRScan = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrInput) {
      try {
        const response = await inventoryApi.scanQR(qrInput);
        alert(`${t('inventory.itemCode')}: ${response.data.product.name}\n${t('common.status')}: ${response.data.status}`);
        setQrInput('');
      } catch (err) {
        alert(t('inventory.itemNotFound'));
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('nav.inventory')}</h1>

      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <label className="block text-sm font-medium mb-2">{t('scan.scanInput')}</label>
        <input
          type="text"
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          onKeyDown={handleQRScan}
          placeholder={t('scan.placeholder')}
          className="w-full border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium">{t('inventory.product')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('inventory.qrCode')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('common.status')}</th>
                <th className="px-6 py-3 text-left font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{item.product.name}</td>
                  <td className="px-6 py-3 font-mono text-xs">
                    {item.qrCode.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge-status ${
                      item.status === 'AVAILABLE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <a
                      href={`/dashboard/inventory/${item.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t('crud.details')}
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
