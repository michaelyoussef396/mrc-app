import { supabase } from '@/integrations/supabase/client';
import { captureBusinessError } from '@/lib/sentry';
import { getFieldLabel, formatDiffValueForDescription } from '@/lib/utils/fieldLabels';

export type FieldChange = {
  field: string;
  old: string | number | boolean | null;
  new: string | number | boolean | null;
};

// 'lead' covers field edits on the leads row itself (LeadDetail saveField,
// saveAddress, handleChangeStatus, bookInspection deltas). The other scopes
// are entity-scoped writes against tables attached to a lead.
export type FieldEditEntityType =
  | 'lead'
  | 'inspection'
  | 'inspection_booking'
  | 'job_booking'
  | 'job_completion';

interface LogFieldEditsOpts {
  leadId: string;
  entityType: FieldEditEntityType;
  entityId: string;
  changes: FieldChange[];
  actorLabel?: string;
  /**
   * Optional per-row metadata merged alongside changes/version/entity_type.
   * Use sparingly — reserved for surface-specific context (reversion details,
   * booking ids cleared, etc.) that doesn't fit the generic diff shape.
   */
  extraMetadata?: Record<string, unknown>;
}

/**
 * Writes one activities row describing a set of field edits.
 * version = (count of existing 'field_edit' activities on this lead) + 1.
 * Empty changes → no-op. Errors swallowed to Sentry — the save already succeeded.
 */
export async function logFieldEdits(opts: LogFieldEditsOpts): Promise<void> {
  if (opts.changes.length === 0) return;

  try {
    const { count } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', opts.leadId)
      .eq('activity_type', 'field_edit');

    const version = (count ?? 0) + 1;

    const description = buildDescription(opts.changes);

    // Attribute the activity to the current user so the timeline can render an actor name.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const metadata: Record<string, unknown> = {
      version,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      changes: opts.changes,
    };
    if (opts.extraMetadata) {
      Object.assign(metadata, opts.extraMetadata);
    }

    await supabase.from('activities').insert({
      lead_id: opts.leadId,
      activity_type: 'field_edit',
      title: `v${version} — ${titleSummary(opts.changes)}`,
      description,
      user_id: userId,
      metadata,
    });
  } catch (err) {
    captureBusinessError('Failed to log field edits', {
      leadId: opts.leadId,
      entityType: opts.entityType,
      error: (err as Error).message,
    });
  }
}

interface LogNoteAddedOpts {
  leadId: string;
  noteText: string;
  authorName: string;
}

/**
 * Append-only structures (internal_notes today) get their own activity_type.
 * The full appended text lives in metadata.note_text. No diff is computed —
 * a note is additive history, not a state mutation.
 */
export async function logNoteAdded(opts: LogNoteAddedOpts): Promise<void> {
  if (!opts.noteText.trim()) return;

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    await supabase.from('activities').insert({
      lead_id: opts.leadId,
      activity_type: 'note_added',
      title: 'Note added',
      description: 'Internal note added',
      user_id: userId,
      metadata: {
        note_text: opts.noteText,
        author: opts.authorName,
      },
    });
  } catch (err) {
    captureBusinessError('Failed to log note added', {
      leadId: opts.leadId,
      error: (err as Error).message,
    });
  }
}

interface LogSectionMilestoneOpts {
  leadId: string;
  inspectionId: string;
  sectionNumber: number;
  sectionName: string;
  changes: FieldChange[];
}

/**
 * Writes one activities row summarising all field changes across the 5 tables
 * touched by TechnicianInspectionForm.handleSave for a single section save.
 *
 * One row per save — not one row per field — so the admin timeline gets a
 * scannable "Section 3 saved — 7 fields changed" entry rather than dozens of
 * individual rows that would flood the view.
 *
 * The full per-field diff lives in metadata.changes for drill-down in the UI.
 * No-op when changes is empty (nothing actually changed during this save).
 * Errors are swallowed to Sentry — the save itself already succeeded.
 */
export async function logSectionMilestone(opts: LogSectionMilestoneOpts): Promise<void> {
  if (opts.changes.length === 0) return;

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const title = `Section ${opts.sectionNumber} (${opts.sectionName}) saved — ${opts.changes.length} field${opts.changes.length === 1 ? '' : 's'} changed`;

    await supabase.from('activities').insert({
      lead_id: opts.leadId,
      activity_type: 'section_milestone',
      title,
      description: title,
      user_id: userId,
      metadata: {
        entity_type: 'inspection',
        entity_id: opts.inspectionId,
        section_number: opts.sectionNumber,
        section_name: opts.sectionName,
        changes: opts.changes,
      },
    });
  } catch (err) {
    captureBusinessError('Failed to log section milestone', {
      leadId: opts.leadId,
      inspectionId: opts.inspectionId,
      sectionNumber: opts.sectionNumber,
      error: (err as Error).message,
    });
  }
}

function buildDescription(changes: FieldChange[]): string {
  if (changes.length === 1) {
    const c = changes[0];
    const label = getFieldLabel(c.field);
    const oldStr = formatDiffValueForDescription(c.old);
    const newStr = formatDiffValueForDescription(c.new);
    return `${label} changed: ${oldStr} → ${newStr}`;
  }
  return `${changes.length} fields changed`;
}

function titleSummary(changes: FieldChange[]): string {
  if (changes.length === 1) {
    return `edited ${getFieldLabel(changes[0].field)}`;
  }
  return `edited ${changes.length} fields`;
}

/**
 * Diff helper: given oldRow + newRow + fieldMap (DB col → display label),
 * return only the fields that actually changed.
 *
 * NOTE: the `fieldMap` parameter is retained for backward compatibility with
 * existing entity-scoped writers that pre-date the global FIELD_LABELS map.
 * For new writers, prefer passing `Object.keys(payload)` directly and letting
 * `getFieldLabel()` resolve labels at render time.
 */
export function diffRows<T extends Record<string, unknown>>(
  oldRow: T | null | undefined,
  newRow: Partial<T>,
  fieldMap: Partial<Record<keyof T, string>>
): FieldChange[] {
  if (!oldRow) return [];
  const changes: FieldChange[] = [];
  for (const key of Object.keys(fieldMap) as (keyof T)[]) {
    const label = fieldMap[key];
    if (!label) continue;
    if (!(key in newRow)) continue;
    const before = (oldRow[key] ?? null) as FieldChange['old'];
    const after = (newRow[key] ?? null) as FieldChange['new'];
    if (before === after) continue;
    if (typeof before === 'object' || typeof after === 'object') {
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
    }
    changes.push({ field: label, old: before, new: after });
  }
  return changes;
}

/**
 * Lean diff helper that uses raw column names as the change `field` value,
 * letting the timeline + description resolve labels via the global map.
 */
export function diffPayload<T extends Record<string, unknown>>(
  oldRow: T | null | undefined,
  newRow: Partial<T>,
): FieldChange[] {
  if (!oldRow) return [];
  const changes: FieldChange[] = [];
  for (const key of Object.keys(newRow)) {
    const before = (oldRow[key] ?? null) as FieldChange['old'];
    const after = (newRow[key as keyof T] ?? null) as FieldChange['new'];
    if (before === after) continue;
    if (typeof before === 'object' || typeof after === 'object') {
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
    }
    changes.push({ field: key, old: before, new: after });
  }
  return changes;
}
