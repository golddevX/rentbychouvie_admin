'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { TENANT_THEME_EVENT, getTenantThemeFromLocalFallback, resolveEffectiveTheme, type TenantThemeSettings } from './tenantTheme';
import { getResolvedThemeKey, getThemePreset, isResolvedThemeKey, type ResolvedThemeKey, type ThemeKey, type ThemeMode } from './theme';

const THEME_STORAGE_KEY = 'admin_theme_key';

type ThemeStoreState = {
  appliedThemeKey: ResolvedThemeKey;
  userThemeKey: ResolvedThemeKey;
  previewThemeKey: ResolvedThemeKey | null;
  tenantTheme: TenantThemeSettings | null;
  initialized: boolean;
};

type ThemeSnapshot = ThemeStoreState & {
  themeKey: ResolvedThemeKey;
};

const defaultThemeKey: ResolvedThemeKey = 'ocean-light';

let storeState: ThemeStoreState = {
  appliedThemeKey: defaultThemeKey,
  userThemeKey: defaultThemeKey,
  previewThemeKey: null,
  tenantTheme: null,
  initialized: false,
};
let storeSnapshot: ThemeSnapshot = {
  ...storeState,
  themeKey: storeState.appliedThemeKey,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function syncSnapshot() {
  storeSnapshot = {
    ...storeState,
    themeKey: storeState.appliedThemeKey,
  };
}

function getPersistedUserTheme(): ResolvedThemeKey {
  if (typeof window === 'undefined') return defaultThemeKey;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isResolvedThemeKey(value) ? value : defaultThemeKey;
}

function persistUserTheme(themeKey: ResolvedThemeKey) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
}

function computeEffectiveThemeKey() {
  if (storeState.previewThemeKey) return storeState.previewThemeKey;
  return resolveEffectiveTheme({
    tenantTheme: storeState.tenantTheme,
    userThemeKey: storeState.userThemeKey,
  });
}

export function applyTheme(themeKey: ResolvedThemeKey): void {
  if (typeof document === 'undefined') return;

  const preset = getThemePreset(themeKey);
  const root = document.documentElement;

  Object.entries(preset.tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  root.dataset.theme = themeKey;
  root.dataset.themeMode = preset.mode;
}

function applyResolvedTheme() {
  const nextThemeKey = computeEffectiveThemeKey();
  storeState = {
    ...storeState,
    appliedThemeKey: nextThemeKey,
  };
  syncSnapshot();
  applyTheme(nextThemeKey);
}

function initializeStore() {
  if (storeState.initialized) return;

  storeState = {
    ...storeState,
    initialized: true,
    userThemeKey: getPersistedUserTheme(),
    tenantTheme: getTenantThemeFromLocalFallback(),
  };

  applyResolvedTheme();
}

function refreshTenantTheme() {
  storeState = {
    ...storeState,
    tenantTheme: getTenantThemeFromLocalFallback(),
  };
  applyResolvedTheme();
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  initializeStore();
  return storeSnapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return storeSnapshot;
}

function updateUserTheme(themeKey: ResolvedThemeKey) {
  initializeStore();
  persistUserTheme(themeKey);
  storeState = {
    ...storeState,
    userThemeKey: themeKey,
    previewThemeKey: null,
  };
  applyResolvedTheme();
  emitChange();
}

function updatePreviewTheme(themeKey: ResolvedThemeKey) {
  initializeStore();
  storeState = {
    ...storeState,
    previewThemeKey: themeKey,
  };
  applyResolvedTheme();
  emitChange();
}

function clearPreviewThemeState() {
  initializeStore();
  if (!storeState.previewThemeKey) return;
  storeState = {
    ...storeState,
    previewThemeKey: null,
  };
  applyResolvedTheme();
  emitChange();
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    initializeStore();
    applyResolvedTheme();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        storeState = {
          ...storeState,
          userThemeKey: getPersistedUserTheme(),
        };
        applyResolvedTheme();
        emitChange();
      }

      if (event.key === 'tenant_theme_settings') {
        refreshTenantTheme();
      }
    };

    const handleTenantTheme = () => {
      refreshTenantTheme();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(TENANT_THEME_EVENT, handleTenantTheme);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(TENANT_THEME_EVENT, handleTenantTheme);
    };
  }, []);

  const themeKey = snapshot.themeKey;
  const preset = useMemo(() => getThemePreset(themeKey), [themeKey]);
  const baseTheme = preset.base;
  const mode = preset.mode;
  const isTenantLocked = Boolean(snapshot.tenantTheme && snapshot.tenantTheme.allowUserOverride === false);
  const setThemeKey = useCallback((nextThemeKey: ResolvedThemeKey) => {
    updateUserTheme(nextThemeKey);
  }, []);
  const previewTheme = useCallback((nextThemeKey: ResolvedThemeKey) => {
    updatePreviewTheme(nextThemeKey);
  }, []);
  const clearPreview = useCallback(() => {
    clearPreviewThemeState();
  }, []);
  const setBaseTheme = useCallback(
    (nextBaseTheme: ThemeKey) => {
      const nextThemeKey = getResolvedThemeKey(nextBaseTheme, mode);
      updateUserTheme(nextThemeKey);
    },
    [mode],
  );
  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      const nextThemeKey = getResolvedThemeKey(baseTheme, nextMode);
      updateUserTheme(nextThemeKey);
    },
    [baseTheme],
  );
  const toggleMode = useCallback(() => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    const nextThemeKey = getResolvedThemeKey(baseTheme, nextMode);
    updateUserTheme(nextThemeKey);
  }, [baseTheme, mode]);

  return useMemo(
    () => ({
      themeKey,
      userThemeKey: snapshot.userThemeKey,
      previewThemeKey: snapshot.previewThemeKey,
      baseTheme,
      mode,
      preset,
      tenantTheme: snapshot.tenantTheme,
      isTenantLocked,
      setThemeKey,
      setBaseTheme,
      setMode,
      toggleMode,
      previewTheme,
      clearPreview,
    }),
    [
      baseTheme,
      clearPreview,
      isTenantLocked,
      mode,
      preset,
      previewTheme,
      setBaseTheme,
      setMode,
      setThemeKey,
      snapshot.previewThemeKey,
      snapshot.tenantTheme,
      snapshot.userThemeKey,
      themeKey,
      toggleMode,
    ],
  );
}
