'use client';

import type { ReactNode } from 'react';
import { cn } from '../../primitives';

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('space-y-6', className)}>{children}</section>;
}
