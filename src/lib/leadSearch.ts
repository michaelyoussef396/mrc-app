/**
 * Server-side lead search shared by the admin topbar (useLeadSearch) and the
 * Leads Management page. Both surfaces must produce the same result set for
 * the same query, so the filter is built in exactly one place.
 *
 * Runs against the DB-side `search_text` generated column (GIN pg_trgm
 * indexed) — one chained ILIKE per word gives AND semantics in Postgres.
 */

export const MIN_SEARCH_LENGTH = 2;
export const LEAD_SEARCH_COLUMN = 'search_text';

interface IlikeFilterable<Q> {
  ilike(column: string, pattern: string): Q;
}

/** Escape LIKE/ILIKE wildcards so user input is treated as literal text. */
export function escapeIlike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function toSearchWords(searchQuery: string): string[] {
  const normalized = searchQuery.trim();
  if (normalized.length < MIN_SEARCH_LENGTH) return [];
  return normalized.split(/\s+/).filter(word => word.length > 0);
}

export function hasSearchQuery(searchQuery: string): boolean {
  return toSearchWords(searchQuery).length > 0;
}

export function applyLeadSearch<Q extends IlikeFilterable<Q>>(query: Q, searchQuery: string): Q {
  return toSearchWords(searchQuery).reduce(
    (filtered, word) => filtered.ilike(LEAD_SEARCH_COLUMN, `%${escapeIlike(word)}%`),
    query,
  );
}
