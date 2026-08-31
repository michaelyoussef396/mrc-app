/**
 * Auto-calculated estimate for a saved inspection.
 *
 * Derives labour hours from inspection_areas and runs them through the pricing engine.
 * The report preview's cost editor could not recompute at all and served a frozen
 * snapshot instead, so a pricing-constant correction never reached already-saved
 * inspections; ViewReportPDF is currently the only consumer.
 *
 * The option split is still written out independently in
 * TechnicianInspectionForm.handleSave and InspectionDataDisplay's CostEstimateSection.
 * Both are intended to migrate here — until they do, all three derive their hours from
 * labourHours.ts so the per-area rule cannot drift between them.
 */

import { reconcileLoadedEquipmentDays } from './estimate-override';
import {
  areaRowToLabourInput,
  deriveQuoteHours,
  deriveSurfaceHours,
} from './labourHours';
import {
  calculateCostEstimate,
  deriveEquipmentDays,
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
  /**
   * inspections.equipment_days as stored — the full quote's EFFECTIVE days. It counts as
   * an explicit hire period only when it exceeds the labour-derived days
   * (reconcileLoadedEquipmentDays); null / absent / anything at or below = auto.
   */
  equipmentDays?: number | null;
  /** 0 / absent = share the (explicit or labour-derived) equipment days. */
  hepaAirScrubberDays?: number;
}

export interface InspectionEstimateInput {
  areas: EstimateAreaInput[];
  subfloorTreatmentMinutes?: number | null;
  equipment: EstimateEquipmentInput;
  wasteDisposalCost?: number | null;
  optionSelected?: number | null;
  /**
   * Sum of the row's stored hour columns (see storedLabourHours) — the basis
   * equipment_days was written against. Absent = classify against the hours derived now.
   */
  storedLabourHours?: number | null;
}

export interface InspectionEstimateHours {
  /** Quote scope: surface time of the areas priced as surface treatment. */
  nonDemo: number;
  /** Quote scope: demolition time of the areas priced as demolition. */
  demolition: number;
  subfloor: number;
  /** Option 1 basis: every area's surface time, demolished areas included. */
  surface: number;
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
 * Per area, demolition replaces surface treatment, except on a single Option 1 quote
 * (see labourHours.deriveQuoteHours); the Option 1 basis keeps every area's surface time.
 */
export function deriveInspectionHours(
  areas: EstimateAreaInput[],
  subfloorTreatmentMinutes?: number | null,
  optionSelected?: number | null
): InspectionEstimateHours {
  const inputs = areas.map(areaRowToLabourInput);
  const quote = deriveQuoteHours(
    inputs,
    (subfloorTreatmentMinutes || 0) / MINUTES_PER_HOUR,
    optionSelected
  );

  return {
    nonDemo: quote.nonDemo,
    demolition: quote.demolition,
    subfloor: quote.subfloor,
    surface: deriveSurfaceHours(inputs),
  };
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
  const hours = deriveInspectionHours(
    input.areas,
    input.subfloorTreatmentMinutes,
    input.optionSelected
  );
  const { equipment } = input;

  // The stored days are the full quote's effective value, so only a period beyond the
  // days the row's saved hours derive is explicit — and only then does it reach the
  // Option 1 sub-quote, which otherwise derives its own days from surface hours exactly
  // as the form's save does.
  const explicitEquipmentDays =
    reconcileLoadedEquipmentDays(
      equipment.equipmentDays,
      deriveEquipmentDays(
        input.storedLabourHours ?? hours.nonDemo + hours.demolition + hours.subfloor
      )
    ) || undefined;

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
    equipmentDays: explicitEquipmentDays,
    hepaAirScrubberQty: equipment.hepaAirScrubberQty,
    hepaAirScrubberDays: equipment.hepaAirScrubberDays,
    wasteDisposalCost,
  });

  // Option 1 is surface treatment only — every area's surface time, no demolition, no
  // subfloor, and never waste.
  const option1 = calculateCostEstimate({
    nonDemoHours: hours.surface,
    demolitionHours: 0,
    subfloorHours: 0,
    dehumidifierQty: equipment.dehumidifierQty,
    airMoverQty: equipment.airMoverQty,
    rcdQty: equipment.rcdQty,
    equipmentDays: explicitEquipmentDays,
    hepaAirScrubberQty: equipment.hepaAirScrubberQty,
    hepaAirScrubberDays: equipment.hepaAirScrubberDays,
  });

  return { hours, full, option1 };
}
