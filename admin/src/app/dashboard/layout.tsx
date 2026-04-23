'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/admin/ui';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
