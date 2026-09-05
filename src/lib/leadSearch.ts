/**
 * Server-side lead search shared by the admin topbar (useLeadSearch) and the
 * Leads Management page. Both surfaces must produce the same result set for
 * the same query, so the filter is built in exactly one place.
 *
 * Each word must match the DB-side `search_text` generated column (GIN pg_trgm
 * indexed) OR `lead_number`, so a Lead ID like MRC-2026-0179 finds its lead
 * (P1-15). Repeated `or=` params are ANDed by PostgREST, which preserves the
 * AND-across-words semantics the chained ILIKE had.
 *
 * NOTE: an OR across two columns cannot use the pg_trgm index the way a single
 * `search_text` ILIKE could. `leads` is small enough that the seq scan is
 * cheaper than the correctness gap it closes; revisit if the table grows.
 */

export const MIN_SEARCH_LENGTH = 2;
export const LEAD_SEARCH_COLUMNS = ['search_text', 'lead_number'] as const;

interface OrFilterable<Q> {
  or(filters: string): Q;
}

/** Escape LIKE/ILIKE wildcards so user input is treated as literal text. */
export function escapeIlike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Wrap a value for PostgREST's `or=` grammar, where bare commas, parentheses
 * and dots are structural — an unquoted `smith, jane` would be read as two
 * filters. Double quotes make the value literal; `\` and `"` inside it must
 * then themselves be backslash-escaped.
 */
export function quoteOrValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function toSearchWords(searchQuery: string): string[] {
  const normalized = searchQuery.trim();
  if (normalized.length < MIN_SEARCH_LENGTH) return [];
  return normalized.split(/\s+/).filter(word => word.length > 0);
}

export function hasSearchQuery(searchQuery: string): boolean {
  return toSearchWords(searchQuery).length > 0;
}

export function applyLeadSearch<Q extends OrFilterable<Q>>(query: Q, searchQuery: string): Q {
  return toSearchWords(searchQuery).reduce((filtered, word) => {
    const pattern = quoteOrValue(`%${escapeIlike(word)}%`);
    return filtered.or(LEAD_SEARCH_COLUMNS.map(column => `${column}.ilike.${pattern}`).join(','));
  }, query);
}
