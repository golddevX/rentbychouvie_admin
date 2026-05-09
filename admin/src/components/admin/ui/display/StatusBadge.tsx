'use client';

import { useI18n } from '@/hooks/useI18n';
import { statusTone, type Tone } from '@/lib/admin/demo-data';
import { normalizeRole, type Role } from '@/lib/admin/permissions';
import { AdminBadge, cn } from '../../primitives';

const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: 'bg-[rgb(var(--text-muted))]',
  info: 'bg-[rgb(var(--info))]',
  success: 'bg-[rgb(var(--success))]',
  warning: 'bg-[rgb(var(--warning))]',
  danger: 'bg-[rgb(var(--danger))]',
  accent: 'bg-[rgb(var(--accent-solid))]',
};

const TONE_RING_CLASS: Record<Tone, string> = {
  neutral: 'shadow-[0_0_0_4px_rgb(var(--text-muted))/0.10]',
  info: 'shadow-[0_0_0_4px_rgb(var(--info))/0.12]',
  success: 'shadow-[0_0_0_4px_rgb(var(--success))/0.12]',
  warning: 'shadow-[0_0_0_4px_rgb(var(--warning))/0.14]',
  danger: 'shadow-[0_0_0_4px_rgb(var(--danger))/0.13]',
  accent: 'shadow-[0_0_0_4px_rgb(var(--accent-solid))/0.13]',
};

function localizeStatus(
  value: string,
  t: (key: string) => string,
  hasTranslation: (key: string) => boolean,
) {
  const normalized = String(value ?? '').trim();
  const isMachineKey = /^[A-Za-z0-9_]+$/.test(normalized);

  if (!isMachineKey) {
    return normalized;
  }

  const candidates = [
    `booking.status.${normalized}`,
    `inventory.status.${normalized}`,
    `payment.status.${normalized}`,
    `maintenance.status.${normalized}`,
    `appointment.status.${normalized}`,
    `lead.status.${normalized}`,
    `user.status.${normalized}`,
    `role.${normalized}`,
  ];

  for (const key of candidates) {
    if (!hasTranslation(key)) continue;
    const text = t(key);
    if (text !== key) return text;
  }

  return normalized.replace(/_/g, ' ');
}

export function StatusBadge({
  value,
  tone,
  compact = false,
  withDot = true,
}: {
  value: string;
  tone?: Tone;
  compact?: boolean;
  withDot?: boolean;
}) {
  const { t, hasTranslation } = useI18n();
  const resolved = tone ?? statusTone(value);
  const localized = localizeStatus(value, t, hasTranslation);

  return (
    <AdminBadge tone={resolved}>
      <span className={cn('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap', compact && 'gap-1')}>
        {withDot ? (
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[resolved], TONE_RING_CLASS[resolved])} aria-hidden="true" />
        ) : null}
        <span className="truncate">{localized}</span>
      </span>
    </AdminBadge>
  );
}

export function RoleBadge({ role, compact = false }: { role: Role | string; compact?: boolean }) {
  const normalized = normalizeRole(role);
  return <StatusBadge value={normalized} tone={normalized === 'super_admin' ? 'accent' : 'neutral'} compact={compact} />;
}
