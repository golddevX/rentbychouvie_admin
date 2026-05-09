'use client';

import type { ReactNode } from 'react';
import { cn } from '../../primitives';

export function FormActions({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
}) {
  const alignment = align === 'start' ? 'justify-start' : align === 'center' ? 'justify-center' : align === 'between' ? 'justify-between' : 'justify-end';
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', alignment, className)}>{children}</div>;
}
