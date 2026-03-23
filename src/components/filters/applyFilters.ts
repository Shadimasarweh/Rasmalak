/**
 * Generic in-memory filter utility.
 *
 * @param items     - The full array of items to filter.
 * @param filters   - Active filter selections: { [filterKey]: selectedValues[] }
 * @param matchers  - Per-key functions that decide whether an item matches.
 *                    If a key has no active values it is skipped (shows all).
 *                    All active matchers must pass (AND logic between keys).
 *
 * @example
 * ```ts
 * const filtered = applyFilters(TOOLS_DATA, filters, {
 *   country: (tool, vals) => tool.countries.some(c => vals.includes(c)),
 *   category: (tool, vals) => vals.includes(tool.category),
 * });
 * ```
 */
export function applyFilters<T>(
  items: T[],
  filters: Record<string, string[]>,
  matchers: Record<string, (item: T, values: string[]) => boolean>,
): T[] {
  const activeEntries = Object.entries(filters).filter(
    ([key, values]) => values.length > 0 && matchers[key],
  );

  if (activeEntries.length === 0) return items;

  return items.filter((item) =>
    activeEntries.every(([key, values]) => matchers[key](item, values)),
  );
}

// ---------------------------------------------------------------------------
// Supabase query builder (future use)
// ---------------------------------------------------------------------------

/**
 * Apply filter selections to a Supabase query builder.
 *
 * Iterates active filters and applies `.in()` or `.eq()` clauses.
 * Column mapping lets you decouple filter keys from DB column names.
 *
 * @example
 * ```ts
 * let query = supabase.from('articles').select('*');
 * query = applyFiltersToSupabaseQuery(query, filters, {
 *   level:       { column: 'level' },
 *   contentType: { column: 'type' },
 * });
 * ```
 */
export function applyFiltersToSupabaseQuery<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Q extends { in: (col: string, values: string[]) => any },
>(
  query: Q,
  filters: Record<string, string[]>,
  columnMap: Record<string, { column: string }>,
): Q {
  let q = query;
  for (const [key, values] of Object.entries(filters)) {
    if (values.length === 0) continue;
    const mapping = columnMap[key];
    if (!mapping) continue;
    q = q.in(mapping.column, values);
  }
  return q;
}
