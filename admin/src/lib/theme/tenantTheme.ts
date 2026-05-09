import { type ResolvedThemeKey, isResolvedThemeKey } from './theme';

const TENANT_THEME_STORAGE_KEY = 'tenant_theme_settings';
export const TENANT_THEME_EVENT = 'tenant-theme-settings-changed';

export type TenantThemeSettings = {
  themeKey: ResolvedThemeKey;
  allowUserOverride: boolean;
  updatedAt?: string;
};

export function getTenantThemeFromLocalFallback(): TenantThemeSettings | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(TENANT_THEME_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TenantThemeSettings>;
    if (!isResolvedThemeKey(parsed.themeKey)) return null;

    return {
      themeKey: parsed.themeKey,
      allowUserOverride: parsed.allowUserOverride ?? true,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveTenantThemeLocalFallback(settings: TenantThemeSettings): void {
  if (typeof window === 'undefined') return;

  // TODO: Replace local fallback with tenant settings API when backend endpoint is available.
  window.localStorage.setItem(TENANT_THEME_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(TENANT_THEME_EVENT, { detail: settings }));
}

export function resolveEffectiveTheme({
  tenantTheme,
  userThemeKey,
}: {
  tenantTheme?: TenantThemeSettings | null;
  userThemeKey?: ResolvedThemeKey | null;
}): ResolvedThemeKey {
  if (tenantTheme && tenantTheme.allowUserOverride === false) {
    return tenantTheme.themeKey;
  }

  return userThemeKey && isResolvedThemeKey(userThemeKey) ? userThemeKey : 'ocean-light';
}
