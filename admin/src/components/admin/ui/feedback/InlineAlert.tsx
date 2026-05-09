'use client';

import type { ReactNode } from 'react';
import type { Tone } from '@/lib/admin/demo-data';
import { cn } from '../../primitives';

export function InlineAlert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn('rounded-[22px] border px-4 py-3 text-sm leading-6 shadow-sm', `inline-alert-${tone}`)}>{children}</div>;
}
