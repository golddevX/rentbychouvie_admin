'use client';

import React from 'react';
import { useI18n } from '@/hooks/useI18n';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('shell.brand')}
          </h1>
          <p className="text-gray-600 mt-2">{t('auth.staffPortal')}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
