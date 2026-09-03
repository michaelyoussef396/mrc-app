/**
 * Section 4 subfloor toggle → billable subfloor hours.
 *
 * Answering "No" unmounts the Treatment Time input but leaves the entered hours in
 * component state, and the save path skips the subfloor_data upsert rather than
 * clearing the row. Both mean stale hours outlive the toggle, so every consumer must
 * resolve them through here before they reach the pricing engine.
 *
 * Shared by the two independent Section 9 implementations (TechnicianInspectionForm's
 * live estimate + save path, and InspectionDataDisplay's read-side re-render) so the
 * tristate rule is stated once.
 */

/**
 * `subfloorRequired === false` only — a null toggle means "not yet determined", and
 * the report still renders the subfloor page for those legacy rows (ViewReportPDF,
 * generate-inspection-pdf). Zeroing null would bill no subfloor work against a report
 * that still shows it.
 */
export function resolveSubfloorHours(
  subfloorRequired: boolean | null | undefined,
  rawHours: number | null | undefined
): number {
  if (subfloorRequired === false) return 0;
  return rawHours || 0;
}
