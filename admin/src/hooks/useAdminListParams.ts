'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type ListDefaults = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

type UpdateOptions = {
  resetPage?: boolean;
};

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useAdminListParams(defaults: ListDefaults) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => ({
    page: positiveInt(searchParams.get('page'), defaults.page ?? 1),
    limit: positiveInt(searchParams.get('limit'), defaults.limit ?? 20),
    sortBy: searchParams.get('sortBy') ?? defaults.sortBy ?? 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? defaults.sortOrder ?? 'desc',
    search: searchParams.get('search') ?? defaults.search ?? '',
    status: searchParams.get('status') ?? defaults.status ?? '',
    dateFrom: searchParams.get('dateFrom') ?? defaults.dateFrom ?? '',
    dateTo: searchParams.get('dateTo') ?? defaults.dateTo ?? '',
  }), [defaults.dateFrom, defaults.dateTo, defaults.limit, defaults.page, defaults.search, defaults.sortBy, defaults.sortOrder, defaults.status, searchParams]);

  const updateParams = useCallback((patch: Record<string, string | number | null | undefined>, options?: UpdateOptions) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        next.delete(key);
        return;
      }
      next.set(key, String(value));
    });
    if (options?.resetPage) {
      next.set('page', '1');
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    params,
    updateParams,
    setPage: (page: number) => updateParams({ page }),
    setLimit: (limit: number) => updateParams({ limit, page: 1 }),
    setSearch: (search: string) => updateParams({ search }, { resetPage: true }),
    setStatus: (status: string) => updateParams({ status }, { resetPage: true }),
    setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => updateParams({ sortBy, sortOrder, page: 1 }),
    clearListParams: () => router.replace(pathname, { scroll: false }),
  };
}
