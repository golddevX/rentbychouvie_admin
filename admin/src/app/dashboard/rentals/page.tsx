'use client';

import { useI18n } from '@/hooks/useI18n';

export default function RentalsPage() {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('nav.rentals')}</h1>
      <div className="grid grid-cols-2 gap-8">
        <a
          href="/dashboard/rentals/pickup"
          className="bg-blue-50 p-8 rounded-lg text-center hover:bg-blue-100"
        >
          <p className="text-4xl mb-2">📦</p>
          <h2 className="text-xl font-bold">{t('pickup.desk')}</h2>
          <p className="text-gray-600">{t('pickup.validateHandOffNextStep')}</p>
        </a>

        <a
          href="/dashboard/rentals/return"
          className="bg-purple-50 p-8 rounded-lg text-center hover:bg-purple-100"
        >
          <p className="text-4xl mb-2">🔙</p>
          <h2 className="text-xl font-bold">{t('return.desk')}</h2>
          <p className="text-gray-600">{t('return.inspectReturnNextStep')}</p>
        </a>
      </div>
    </div>
  );
}
