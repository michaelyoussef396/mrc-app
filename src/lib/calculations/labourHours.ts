/**
 * Labour-hour derivation shared by every surface that prices an inspection.
 *
 * Per area, demolition REPLACES surface treatment: an area flagged for demolition
 * contributes its demolition time and nothing else, so no area is ever counted twice
 * (owner decision, 2026-08-31). Surface Treatment (Option 1) is the alternative quote
 * in which every area is surface-treated instead.
 */

const MINUTES_PER_HOUR = 60;

/** inspections.option_selected: 1 = Surface Treatment, 2 = Comprehensive, 3 = Both. */
export const OPTION_SURFACE_TREATMENT = 1;

export interface AreaLabourInput {
  surfaceHours: number;
  demolitionHours: number;
  demolitionRequired: boolean;
}

export interface LabourHours {
  /** Surface time of the areas priced as surface treatment. */
  nonDemo: number;
  /** Demolition time of the areas priced as demolition. */
  demolition: number;
  subfloor: number;
  total: number;
}

/**
 * Hours for the quote being priced. A single Option 1 quote is surface treatment for
 * every area (plus subfloor) — demolition is not part of that option, so a flagged area
 * contributes its surface time. Every other mode prices the comprehensive scope; the
 * Both-mode Option 1 sub-quote is derived separately via deriveSurfaceHours.
 */
export function deriveQuoteHours(
  areas: AreaLabourInput[],
  subfloorHours = 0,
  optionSelected?: number | null
): LabourHours {
  if (optionSelected === OPTION_SURFACE_TREATMENT) {
    const nonDemo = deriveSurfaceHours(areas);
    return { nonDemo, demolition: 0, subfloor: subfloorHours, total: nonDemo + subfloorHours };
  }
  return deriveComprehensiveHours(areas, subfloorHours);
}

/**
 * Comprehensive scope (Option 2): each area is either demolished or surface-treated,
 * plus subfloor.
 */
export function deriveComprehensiveHours(
  areas: AreaLabourInput[],
  subfloorHours = 0
): LabourHours {
  const nonDemo = areas.reduce(
    (sum, area) => (area.demolitionRequired ? sum : sum + area.surfaceHours),
    0
  );
  const demolition = areas.reduce(
    (sum, area) => (area.demolitionRequired ? sum + area.demolitionHours : sum),
    0
  );
  return { nonDemo, demolition, subfloor: subfloorHours, total: nonDemo + demolition + subfloorHours };
}

/** Surface Treatment scope (Option 1): every area surface-treated; no demolition, no subfloor. */
export function deriveSurfaceHours(areas: AreaLabourInput[]): number {
  return areas.reduce((sum, area) => sum + area.surfaceHours, 0);
}

/** Adapter for inspection_areas rows (minutes). */
export function areaRowToLabourInput(row: {
  job_time_minutes?: number | null;
  demolition_time_minutes?: number | null;
  demolition_required?: boolean | null;
}): AreaLabourInput {
  return {
    surfaceHours: (row.job_time_minutes || 0) / MINUTES_PER_HOUR,
    demolitionHours: (row.demolition_time_minutes || 0) / MINUTES_PER_HOUR,
    demolitionRequired: !!row.demolition_required,
  };
}

/** Adapter for the technician form's InspectionArea (hours). */
export function areaFormToLabourInput(area: {
  timeWithoutDemo?: number | null;
  demolitionTime?: number | null;
  demolitionRequired?: boolean | null;
}): AreaLabourInput {
  return {
    surfaceHours: area.timeWithoutDemo || 0,
    demolitionHours: area.demolitionTime || 0,
    demolitionRequired: !!area.demolitionRequired,
  };
}
