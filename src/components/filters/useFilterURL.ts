'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { useFilterStore } from './useFilterStore';
import type { FilterConfig } from './types';

const EMPTY_FILTERS: Record<string, string[]> = {};

/**
 * Bidirectional sync between URL query params and the filter store.
 *
 * On mount  → reads params and hydrates the store.
 * On change → pushes updated params (shallow).
 * On popstate (back/forward) → re-hydrates the store.
 */
export function useFilterURL(config: FilterConfig) {
  const { pageId, sections } = config;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useFilterStore(
    useShallow((s) => s.filters[pageId] ?? EMPTY_FILTERS),
  );
  const setFilter = useFilterStore((s) => s.setFilter);
  const isHydrating = useRef(true);

  const validKeys = sections.map((s) => s.key);

  // Hydrate store from URL on mount and on popstate
  useEffect(() => {
    isHydrating.current = true;
    for (const key of validKeys) {
      const raw = searchParams.get(key);
      if (raw) {
        const values = raw.split(',').filter(Boolean);
        setFilter(pageId, key, values);
      }
    }
    // Small delay to let the initial hydration settle before we start pushing
    const id = setTimeout(() => {
      isHydrating.current = false;
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Push store changes to URL
  useEffect(() => {
    if (isHydrating.current) return;

    const params = new URLSearchParams();
    for (const key of validKeys) {
      const values = filters[key];
      if (values && values.length > 0) {
        params.set(key, values.join(','));
      }
    }

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
}
