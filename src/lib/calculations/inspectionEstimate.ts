/**
 * Auto-calculated estimate for a saved inspection.
 *
 * Derives labour hours from inspection_areas and runs them through the pricing engine.
 * The report preview's cost editor could not recompute at all and served a frozen
 * snapshot instead, so a pricing-constant correction never reached already-saved
 * inspections; ViewReportPDF is currently the only consumer.
 *
 * The same rules are still written out independently in
 * TechnicianInspectionForm.handleSave and InspectionDataDisplay's CostEstimateSection.
 * Both are intended to migrate here — until they do, this is a third implementation of
 * the same rules, kept deliberately identical to handleSave (the canonical save path).
 */

import {
  calculateCostEstimate,
  type CostEstimateResult,
} from './pricing';

const MINUTES_PER_HOUR = 60;

/** option_selected === 3 means both options were quoted ("Both" mode). */
export const BOTH_OPTIONS = 3;

export interface EstimateAreaInput {
  job_time_minutes?: number | null;
  demolition_time_minutes?: number | null;
  demolition_required?: boolean | null;
}

export interface EstimateEquipmentInput {
  dehumidifierQty: number;
  airMoverQty: number;
  rcdQty: number;
  hepaAirScrubberQty: number;
  /** Explicit shared hire period; 0 / absent = derive from labour hours. */
  equipmentDays?: number;
  /** 0 / absent = share the (explicit or labour-derived) equipment days. */
  hepaAirScrubberDays?: number;
}

export interface InspectionEstimateInput {
  areas: EstimateAreaInput[];
  subfloorTreatmentMinutes?: number | null;
  equipment: EstimateEquipmentInput;
  wasteDisposalCost?: number | null;
  optionSelected?: number | null;
}

export interface InspectionEstimateHours {
  nonDemo: number;
  demolition: number;
  subfloor: number;
}

export interface InspectionEstimate {
  hours: InspectionEstimateHours;
  /** All labour types. Option 2 / single-option pricing. */
  full: CostEstimateResult;
  /** Surface treatment only — the Option 1 sub-quote. */
  option1: CostEstimateResult;
}

/**
 * Derive labour hours from area records and the subfloor treatment time.
 * Demolition minutes only count when the area is flagged for demolition.
 */
export function deriveInspectionHours(
  areas: EstimateAreaInput[],
  subfloorTreatmentMinutes?: number | null
): InspectionEstimateHours {
  const nonDemo = areas.reduce(
    (sum, area) => sum + (area.job_time_minutes || 0) / MINUTES_PER_HOUR,
    0
  );
  const demolition = areas.reduce(
    (sum, area) =>
      area.demolition_required
        ? sum + (area.demolition_time_minutes || 0) / MINUTES_PER_HOUR
        : sum,
    0
  );
  const subfloor = (subfloorTreatmentMinutes || 0) / MINUTES_PER_HOUR;

  return { nonDemo, demolition, subfloor };
}

/**
 * Auto-calculated estimate at the CURRENT pricing.ts rates.
 *
 * Callers compare these against the stored columns to tell a deliberate manual override
 * apart from a stale snapshot (see estimate-override.ts).
 */
export function computeInspectionEstimate(
  input: InspectionEstimateInput
): InspectionEstimate {
  const hours = deriveInspectionHours(input.areas, input.subfloorTreatmentMinutes);
  const { equipment } = input;

  // Waste is a single job-level cost billed once whichever option proceeds, so in Both
  // mode it is excluded from the per-option totals and invoiced separately.
  const wasteDisposalCost =
    input.optionSelected === BOTH_OPTIONS ? 0 : input.wasteDisposalCost ?? 0;

  const full = calculateCostEstimate({
    nonDemoHours: hours.nonDemo,
    demolitionHours: hours.demolition,
    subfloorHours: hours.subfloor,
    dehumidifierQty: equipment.dehumidifierQty,
    airMoverQty: equipment.airMoverQty,
    rcdQty: equipment.rcdQty,
    equipmentDays: equipment.equipmentDays,
    hepaAirScrubberQty: equipment.hepaAirScrubberQty,
    hepaAirScrubberDays: equipment.hepaAirScrubberDays,
    wasteDisposalCost,
  });

  // Option 1 is surface treatment only — no demolition, no subfloor, and never waste.
  const option1 = calculateCostEstimate({
    nonDemoHours: hours.nonDemo,
    demolitionHours: 0,
    subfloorHours: 0,
    dehumidifierQty: equipment.dehumidifierQty,
    airMoverQty: equipment.airMoverQty,
    rcdQty: equipment.rcdQty,
    equipmentDays: equipment.equipmentDays,
    hepaAirScrubberQty: equipment.hepaAirScrubberQty,
    hepaAirScrubberDays: equipment.hepaAirScrubberDays,
  });

  return { hours, full, option1 };
}
