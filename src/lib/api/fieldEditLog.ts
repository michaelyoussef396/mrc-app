import { supabase } from '@/integrations/supabase/client';
import { captureBusinessError } from '@/lib/sentry';

export type FieldChange = {
  field: string;
  old: string | number | boolean | null;
  new: string | number | boolean | null;
};

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
}

/**
 * Logs one activities row describing a set of field edits.
 * Version = (count of existing 'field_edit' activities on this lead) + 1.
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

    const fieldLabels = opts.changes.map((c) => c.field).join(', ');
    const title =
      opts.changes.length === 1
        ? `v${version} — edited ${fieldLabels}`
        : `v${version} — edited ${opts.changes.length} fields`;

    // Attribute the activity to the current user so the timeline can render an actor name.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    await supabase.from('activities').insert({
      lead_id: opts.leadId,
      activity_type: 'field_edit',
      title,
      description: fieldLabels,
      user_id: userId,
      metadata: {
        version,
        entity_type: opts.entityType,
        entity_id: opts.entityId,
        changes: opts.changes,
      },
    });
  } catch (err) {
    captureBusinessError('Failed to log field edits', {
      leadId: opts.leadId,
      entityType: opts.entityType,
      error: (err as Error).message,
    });
  }
}

/**
 * Diff helper: given oldRow + newRow + fieldMap (DB col → display label),
 * return only the fields that actually changed.
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
    // Handle deep equality for arrays / objects by JSON comparison
    if (typeof before === 'object' || typeof after === 'object') {
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
    }
    changes.push({ field: label, old: before, new: after });
  }
  return changes;
}
