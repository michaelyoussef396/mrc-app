import { formatDateTimeAU } from '@/lib/dateUtils';

const SEPARATOR = '\n\n---\n\n';

export interface NoteAttribution {
  authorName: string;
  context?: string;
}

/**
 * Append a new entry to a lead's internal_notes log.
 * Newest entry on top; legacy un-structured values preserved verbatim below.
 *
 * Format:
 *   [DD/MM/YYYY at h:mm am/pm] {note}
 *   — {author}{context ? ' (' + context + ')' : ''}
 *
 *   ---
 *
 *   [previous entries...]
 *
 * Pure function — caller computes authorName via the project's
 * profile?.full_name → user?.email → 'Unknown user' fallback chain.
 */
export function appendInternalNote(
  existing: string | null | undefined,
  newEntry: string,
  attribution: NoteAttribution,
): string {
  const trimmed = newEntry.trim();
  if (!trimmed) return existing ?? '';

  const stamp = formatDateTimeAU(new Date());
  const ctx = attribution.context ? ` (${attribution.context})` : '';
  const formatted = `[${stamp}] ${trimmed}\n— ${attribution.authorName}${ctx}`;

  if (!existing || !existing.trim()) return formatted;
  return `${formatted}${SEPARATOR}${existing}`;
}
