import { create } from 'zustand';

interface FilterState {
  /** { [pageId]: { [filterKey]: selectedValues[] } } */
  filters: Record<string, Record<string, string[]>>;
  setFilter: (pageId: string, key: string, values: string[]) => void;
  toggleFilter: (pageId: string, key: string, value: string) => void;
  clearFilter: (pageId: string, key: string) => void;
  clearAll: (pageId: string) => void;
  getActiveCount: (pageId: string) => number;
  getFilters: (pageId: string) => Record<string, string[]>;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: {},

  setFilter: (pageId, key, values) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [pageId]: {
          ...state.filters[pageId],
          [key]: values,
        },
      },
    })),

  toggleFilter: (pageId, key, value) =>
    set((state) => {
      const current = state.filters[pageId]?.[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        filters: {
          ...state.filters,
          [pageId]: {
            ...state.filters[pageId],
            [key]: next,
          },
        },
      };
    }),

  clearFilter: (pageId, key) =>
    set((state) => {
      const page = { ...state.filters[pageId] };
      delete page[key];
      return {
        filters: { ...state.filters, [pageId]: page },
      };
    }),

  clearAll: (pageId) =>
    set((state) => ({
      filters: { ...state.filters, [pageId]: {} },
    })),

  getActiveCount: (pageId) => {
    const page = get().filters[pageId] ?? {};
    return Object.values(page).reduce((sum, arr) => sum + arr.length, 0);
  },

  getFilters: (pageId) => get().filters[pageId] ?? {},
}));
