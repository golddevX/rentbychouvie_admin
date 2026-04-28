'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { label: t('nav.dashboard'), href: '/dashboard', icon: '📊' },
    { label: t('nav.leads'), href: '/dashboard/leads', icon: '🎯' },
    { label: t('nav.bookings'), href: '/dashboard/bookings', icon: '📅' },
    { label: t('nav.inventory'), href: '/dashboard/inventory', icon: '📦' },
    { label: t('nav.payments'), href: '/dashboard/payments', icon: '💳' },
    { label: t('nav.reports'), href: '/dashboard/reports', icon: '📈' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="font-bold text-xl">{t('shell.legacyBrand')}</h1>
        <p className="text-gray-400 text-sm">{t('nav.admin')}</p>
      </div>

      <nav className="px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-2 rounded hover:bg-gray-800"
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <div className="text-sm mb-4">
          <p className="font-medium">{user?.fullName}</p>
          <p className="text-gray-400">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
        >
          {t('common.logout')}
        </button>
      </div>
    </aside>
  );
}
