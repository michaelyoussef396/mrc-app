/**
 * Editable Estimate override precedence (inspection form Section 9).
 *
 * A technician may override the auto-calculated Labour / Equipment (ex GST)
 * figures. Precedence: an override value present wins; an absent override
 * (null) falls back to auto-calc. Clearing the input reverts to auto-calc —
 * never to zero. GST is always computed downstream from the effective values,
 * so an override can never bypass GST.
 */

import { deriveEquipmentDays } from './pricing';

// Saved values within half a cent of the recomputed auto value are snapshots
// of the auto-calc, not deliberate overrides (see reconcileLoadedOverride).
export const OVERRIDE_EPSILON = 0.005;

/** Effective estimate value: override present wins, otherwise auto-calc. */
export function resolveOverridableValue(
  override: number | null | undefined,
  autoValue: number
): number {
  return override ?? autoValue;
}

/**
 * Parse raw text from an override input.
 * Empty, non-numeric, zero, and negative input all mean "no override —
 * use auto-calc" (a $0 or negative labour/equipment charge is never a
 * legitimate override on a quoted job).
 */
export function parseOverrideInput(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Rehydrate an override from a saved inspection row.
 *
 * The DB stores the EFFECTIVE value (override or auto snapshot) in one column
 * plus a single manual_labour_override flag, so a loaded value only counts as
 * an override when the flag is set AND the value differs from the auto value
 * recomputed from the same saved inputs (hours/quantities are saved
 * atomically with it, so a non-overridden field reloads exactly equal to its
 * recomputed auto value).
 */
export function reconcileLoadedOverride(
  overrideFlag: boolean,
  savedValue: number | null | undefined,
  autoValue: number
): number | null {
  if (!overrideFlag || savedValue == null || savedValue <= 0) return null;
  return Math.abs(savedValue - autoValue) <= OVERRIDE_EPSILON ? null : savedValue;
}

/**
 * Rehydrate the shared equipment hire period from a saved inspection row.
 *
 * inspections.equipment_days stores the EFFECTIVE days (explicit or
 * labour-derived) because job completion and invoicing read it directly, and
 * rows never saved since 2026-07-28 still carry the column default of 1. So a
 * loaded value is an explicit hire period only when it EXCEEDS the days the
 * saved labour hours derive; anything at or below them is auto (0). A hire
 * period can therefore extend past the labour days but never fall short of
 * them — the form's Days stepper enforces the same floor.
 */
export function reconcileLoadedEquipmentDays(
  savedDays: number | null | undefined,
  autoDays: number
): number {
  return savedDays != null && savedDays > autoDays ? savedDays : 0;
}

/** The stored inspections hour columns (numeric — PostgREST may return strings). */
export interface StoredLabourHoursRow {
  no_demolition_hours?: number | string | null;
  demolition_hours?: number | string | null;
  subfloor_hours?: number | string | null;
}

/** Sum of the stored hour columns, or null when the row has never stored hours. */
export function storedLabourHours(row: StoredLabourHoursRow): number | null {
  if (row.no_demolition_hours == null && row.demolition_hours == null && row.subfloor_hours == null) {
    return null;
  }
  return (
    Number(row.no_demolition_hours ?? 0) +
    Number(row.demolition_hours ?? 0) +
    Number(row.subfloor_hours ?? 0)
  );
}

/**
 * Explicit shared equipment days for a saved row. equipment_days is written atomically
 * with the hour columns, so those hours — not the hours derived today — are the basis
 * it must be classified against; otherwise a later change to how hours are derived
 * would re-read an old auto value as an explicit hire period. Rows that never stored
 * hours fall back to the hours derived now.
 */
export function resolveStoredEquipmentDays(
  row: StoredLabourHoursRow & { equipment_days?: number | null },
  derivedLabourHours: number
): number {
  return reconcileLoadedEquipmentDays(
    row.equipment_days,
    deriveEquipmentDays(storedLabourHours(row) ?? derivedLabourHours)
  );
}
