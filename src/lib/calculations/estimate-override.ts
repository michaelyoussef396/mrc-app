/**
 * Editable Estimate override precedence (inspection form Section 9).
 *
 * A technician may override the auto-calculated Labour / Equipment (ex GST)
 * figures. Precedence: an override value present wins; an absent override
 * (null) falls back to auto-calc. Clearing the input reverts to auto-calc —
 * never to zero. GST is always computed downstream from the effective values,
 * so an override can never bypass GST.
 */

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
 * labour-derived) because job completion and invoicing read it directly, so
 * a loaded value only counts as an explicit hire period when it differs from
 * the days the saved labour hours derive. Returns 0 (= auto) otherwise.
 */
export function reconcileLoadedEquipmentDays(
  savedDays: number | null | undefined,
  autoDays: number
): number {
  if (savedDays == null || savedDays <= 0 || savedDays === autoDays) return 0;
  return savedDays;
}
