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

export interface ParsedInternalNoteEntry {
  timestamp: string | null;
  author: string | null;
  context: string | null;
  body: string;
  isLegacy: boolean;
}

const STRUCTURED_ENTRY_RE = /^\[([^\]]+)\]\s*([\s\S]*?)\n—\s*(.+?)\s*$/;

function parseEntry(raw: string): ParsedInternalNoteEntry {
  const trimmed = raw.trim();
  const m = trimmed.match(STRUCTURED_ENTRY_RE);
  if (!m) {
    return { timestamp: null, author: null, context: null, body: trimmed, isLegacy: true };
  }
  const [, timestamp, body, authorLine] = m;
  const ctxMatch = authorLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (ctxMatch) {
    return {
      timestamp,
      author: ctxMatch[1].trim(),
      context: ctxMatch[2].trim(),
      body: body.trim(),
      isLegacy: false,
    };
  }
  return {
    timestamp,
    author: authorLine.trim(),
    context: null,
    body: body.trim(),
    isLegacy: false,
  };
}

/**
 * Parse a stored `internal_notes` string into structured entries for rendering.
 * Newest entry first (matching the order that `appendInternalNote` writes).
 * Entries that don't match the `[stamp] body\n— author` shape (legacy unstructured
 * values from before Stage B.5) are returned with `isLegacy: true` and the raw body
 * preserved so the renderer can flag them with a "Legacy entry" label.
 */
export function parseInternalNotesLog(
  raw: string | null | undefined,
): ParsedInternalNoteEntry[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(SEPARATOR).map(parseEntry);
}
