/**
 * MRC Tier-Based Pricing Calculator
 *
 * Follows COST_CALCULATION_SYSTEM.md specification exactly:
 * - Tier-based labour pricing with linear interpolation (2h-8h range)
 * - 2-hour minimum charge for under 2 hours
 * - Per-day rate table for 8+ hours (DAY_RATES — replaces the volume discount)
 * - Equipment calculated as qty × rate × days
 * - GST at 10%
 */

// Labour rate tiers — Michael's exact pricing (Glen + Clayton approved schedule).
//
// Per-day labour rates (dayRates). Day 1 is the full rate; each subsequent day is lower.
// Day 5 = Day 6 (floor rate — the lowest MRC charges for consecutive days; days beyond 6
// extrapolate at the Day-6 rate). The effective discount at Day 4 is ~12.3% vs Day 1, within
// the historic 13% cap. This per-day model REPLACES the previous volume-discount tier system.
// dayRates[0] === tier8h by construction — Day 1 is always the full 8h rate.
export const LABOUR_RATES = {
  nonDemo: { tier2h: 1019.40, tier8h: 1245.33, dayRates: [1245.33, 1060.34, 1054.52, 1007.18, 921.57, 921.57] },
  demolition: { tier2h: 1062.00, tier8h: 1825.87, dayRates: [1825.87, 1550.05, 1552.23, 1475.57, 1345.86, 1345.86] },
  construction: { tier2h: 661.96, tier8h: 1507.95, dayRates: [1507.95, 1507.95, 1507.95, 1507.95, 1507.95, 1507.95] }, // placeholder — not in use
  subfloor: { tier2h: 1322.62, tier8h: 2375.21, dayRates: [2375.21, 2015.47, 2025.15, 1917.76, 1743.59, 1743.59] },
} as const;

// Equipment daily rates
export const EQUIPMENT_RATES = {
  dehumidifier: 119,
  airMover: 46,
  hepaAirScrubber: 100,
  rcd: 5,
} as const;

// Waste disposal price anchors (ex GST, AUD). Linear interpolation between
// anchors; beyond 12m³ extrapolate from the 10→12 segment at $145/m³.
export const WASTE_DISPOSAL_RATES = [
  { m3: 2, price: 350 },
  { m3: 4, price: 450 },
  { m3: 6, price: 550 },
  { m3: 8, price: 703 },    // midpoint of $657–$750
  { m3: 10, price: 900 },   // midpoint of $850–$950
  { m3: 12, price: 1190 },  // midpoint of $1,060–$1,320
] as const;

// $/m³ beyond the top anchor: (1190 − 900) / (12 − 10)
const WASTE_EXTRAPOLATION_RATE = 145;

// GST rate
export const GST_RATE = 0.10;

// Maximum discount cap - SACRED RULE - NEVER EXCEED.
// NOTE: This is no longer a volume-tier rate (the per-day DAY_RATES model replaced volume
// discounting). MAX_DISCOUNT is retained as the cap for a MANUAL invoice discount applied in
// src/lib/api/invoices.ts, on DECIMAL scale (0.13 = 13%). Never change to percent scale.
export const MAX_DISCOUNT = 0.13;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type LabourType = 'nonDemo' | 'demolition' | 'construction' | 'subfloor';

interface LabourBreakdownItem {
  day: number;
  hours: number;
  cost: number;
  description: string;
}

interface LabourCalculationResult {
  cost: number;
  breakdown: LabourBreakdownItem[];
}

/**
 * Calculate cost for hours using tier pricing
 * - Under 2h: 2-hour minimum charge
 * - 2-8h: Linear interpolation
 * - 8h: Full day rate
 */
export function interpolateCost(hours: number, tier2h: number, tier8h: number): number {
  if (hours <= 0) return 0;
  if (hours <= 2) {
    // 2-hour minimum charge
    return tier2h;
  }
  if (hours <= 8) {
    // Linear interpolation: tier2h + ((hours - 2) / 6) × (tier8h - tier2h)
    return tier2h + ((hours - 2) / 6) * (tier8h - tier2h);
  }
  // For 8+ hours, use day blocks
  return tier8h;
}

/**
 * Calculate labour cost with detailed day-by-day breakdown.
 * - <= 8h: single block (2h minimum / interpolation) — UNCHANGED business rule.
 * - > 8h: per-day DAY_RATES — each full day at its declining rate (Day 6 = floor),
 *   partial remainder at a proportional fraction of the next day's rate.
 * This is the real charging path used by calculateCostEstimate. For hours >= 2 its
 * total equals calculateLabourCost(hours, labourType).
 */
export function calculateLabourCostWithBreakdown(
  hours: number,
  labourType: LabourType
): LabourCalculationResult {
  if (hours <= 0) {
    return { cost: 0, breakdown: [] };
  }

  const rates = LABOUR_RATES[labourType];
  const breakdown: LabourBreakdownItem[] = [];

  // <= 8h: single interpolated / 2h-minimum block (enforces the 2-hour minimum charge).
  if (hours <= 8) {
    const cost = round2(interpolateCost(hours, rates.tier2h, rates.tier8h));
    const description = hours <= 2
      ? `Day 1: ${hours.toFixed(1)}h → $${cost.toFixed(2)} (2h minimum)`
      : hours === 8
        ? `Day 1: 8h → $${cost.toFixed(2)}`
        : `Day 1: ${hours.toFixed(1)}h → $${cost.toFixed(2)} (interpolated)`;
    breakdown.push({ day: 1, hours, cost, description });
    return { cost, breakdown };
  }

  // > 8h: per-day DAY_RATES model.
  const fullDays = Math.floor(hours / 8);
  const remaining = hours % 8;
  let totalCost = 0;

  for (let i = 0; i < fullDays; i++) {
    const dayCost = round2(rates.dayRates[Math.min(i, 5)]);
    totalCost += dayCost;
    breakdown.push({
      day: i + 1,
      hours: 8,
      cost: dayCost,
      description: `Day ${i + 1}: 8h → $${dayCost.toFixed(2)}`
    });
  }

  if (remaining > 0) {
    const nextDayRate = rates.dayRates[Math.min(fullDays, 5)];
    const remainderCost = round2((remaining / 8) * nextDayRate);
    totalCost += remainderCost;
    breakdown.push({
      day: fullDays + 1,
      hours: remaining,
      cost: remainderCost,
      description: `Day ${fullDays + 1}: ${remaining.toFixed(1)}h → $${remainderCost.toFixed(2)} (partial day)`
    });
  }

  return { cost: round2(totalCost), breakdown };
}

/**
 * Calculate labour cost (simple version without breakdown).
 * Mirrors the per-day DAY_RATES model. NOTE: for hours < 2 this pro-rates from the 2h
 * tier (the chart "below 2-hour minimum" extrapolation); the real charging path
 * (calculateLabourCostWithBreakdown) enforces the flat 2-hour minimum instead. The two
 * agree for all hours >= 2.
 */
export function calculateLabourCost(
  hours: number,
  labourType: LabourType
): number {
  if (hours <= 0) return 0;

  const { tier2h, tier8h, dayRates } = LABOUR_RATES[labourType];

  // Under 2h: pro-rate from the 2h tier
  if (hours < 2) return round2((hours / 2) * tier2h);

  // 2h to 8h: linear interpolation
  if (hours <= 8) return round2(tier2h + ((hours - 2) / 6) * (tier8h - tier2h));

  // 8h+: sum per-day rates for full blocks + proportional remainder (Day 6 = floor)
  const fullDays = Math.floor(hours / 8);
  const remaining = hours % 8;
  let cost = 0;
  for (let i = 0; i < fullDays; i++) {
    cost += dayRates[Math.min(i, 5)];
  }
  if (remaining > 0) {
    cost += (remaining / 8) * dayRates[Math.min(fullDays, 5)];
  }
  return round2(cost);
}

/**
 * Get number of days based on total hours
 */
export function calculateDays(totalHours: number): number {
  if (totalHours <= 0) return 0;
  return Math.ceil(totalHours / 8);
}

// ============================================================
// EQUIPMENT CALCULATION
// ============================================================

export interface EquipmentInput {
  dehumidifierQty: number;
  airMoverQty: number;
  rcdQty: number;
}

export interface EquipmentResult {
  days: number;
  dehumidifier: { qty: number; rate: number; cost: number };
  airMover: { qty: number; rate: number; cost: number };
  rcd: { qty: number; rate: number; cost: number };
  total: number;
}

/**
 * Calculate equipment costs based on quantities and days
 * Equipment days = ceil(totalLabourHours / 8)
 */
export function calculateEquipmentCost(
  equipment: EquipmentInput,
  totalLabourHours: number
): EquipmentResult {
  const days = Math.max(1, Math.ceil(totalLabourHours / 8));

  const dehumidifierCost = equipment.dehumidifierQty * EQUIPMENT_RATES.dehumidifier * days;
  const airMoverCost = equipment.airMoverQty * EQUIPMENT_RATES.airMover * days;
  const rcdCost = equipment.rcdQty * EQUIPMENT_RATES.rcd * days;

  return {
    days,
    dehumidifier: {
      qty: equipment.dehumidifierQty,
      rate: EQUIPMENT_RATES.dehumidifier,
      cost: dehumidifierCost
    },
    airMover: {
      qty: equipment.airMoverQty,
      rate: EQUIPMENT_RATES.airMover,
      cost: airMoverCost
    },
    rcd: {
      qty: equipment.rcdQty,
      rate: EQUIPMENT_RATES.rcd,
      cost: rcdCost
    },
    total: dehumidifierCost + airMoverCost + rcdCost
  };
}

// ============================================================
// WASTE DISPOSAL CALCULATION
// ============================================================

/**
 * Calculate waste disposal cost from cubic metres using interpolated price anchors.
 * - m3 <= 0: no charge
 * - 0 < m3 < 2: pro-rated from the first anchor
 * - 2 <= m3 <= 12: linear interpolation between surrounding anchors
 * - m3 > 12: extrapolated from the 10→12 segment at WASTE_EXTRAPOLATION_RATE
 */
export function calculateWasteDisposalCost(m3: number): number {
  if (m3 <= 0) return 0;

  const first = WASTE_DISPOSAL_RATES[0];
  const last = WASTE_DISPOSAL_RATES[WASTE_DISPOSAL_RATES.length - 1];

  if (m3 < first.m3) {
    return round2((m3 / first.m3) * first.price);
  }
  if (m3 > last.m3) {
    return round2(last.price + (m3 - last.m3) * WASTE_EXTRAPOLATION_RATE);
  }

  for (let i = 0; i < WASTE_DISPOSAL_RATES.length - 1; i++) {
    const lo = WASTE_DISPOSAL_RATES[i];
    const hi = WASTE_DISPOSAL_RATES[i + 1];
    if (m3 >= lo.m3 && m3 <= hi.m3) {
      const ratio = (m3 - lo.m3) / (hi.m3 - lo.m3);
      return round2(lo.price + ratio * (hi.price - lo.price));
    }
  }

  return round2(last.price); // unreachable
}

// ============================================================
// MAIN COST ESTIMATE CALCULATION
// ============================================================

export interface CostEstimateInput {
  // Labour hours
  nonDemoHours: number;
  demolitionHours: number;
  subfloorHours: number;

  // Equipment (can be quantities OR direct cost)
  equipmentCost?: number; // Direct entry (legacy support)
  dehumidifierQty?: number;
  airMoverQty?: number;
  rcdQty?: number;

  // Waste disposal — confirmed cost (ex GST), pass-through like equipment, never discounted
  wasteDisposalCost?: number;

  // Manual override (optional)
  manualOverride?: boolean;
  manualTotal?: number;
}

export interface CostEstimateResult {
  // Labour breakdown
  nonDemoCost: number;
  nonDemoBreakdown: LabourBreakdownItem[];
  demolitionCost: number;
  demolitionBreakdown: LabourBreakdownItem[];
  subfloorCost: number;
  subfloorBreakdown: LabourBreakdownItem[];
  labourSubtotal: number;

  totalLabourHours: number;
  totalDays: number;
  labourAfterDiscount: number;

  // TODO(pricing): always 0 / '' — the volume-discount system was replaced by the per-day
  // DAY_RATES model (the per-day decline encodes the discount). Kept (always-zero) so existing
  // consumers compile unchanged; safe to remove once those reads are deleted.
  discountPercent: number;
  discountAmount: number;
  discountTierDescription: string;

  // Equipment
  equipment: EquipmentResult;
  equipmentCost: number;

  // Waste disposal (confirmed cost, ex GST)
  wasteDisposalCost: number;

  // Totals
  subtotalExGst: number;
  gstAmount: number;
  totalIncGst: number;
}

/**
 * Main cost estimate calculation function
 * Returns complete breakdown with all intermediate values
 */
export function calculateCostEstimate(input: CostEstimateInput): CostEstimateResult {
  // Calculate total hours first (needed for equipment days)
  const totalLabourHours = input.nonDemoHours + input.demolitionHours + input.subfloorHours;
  const totalDays = calculateDays(totalLabourHours);

  // Confirmed waste disposal cost — pass-through, never discounted (same as equipment)
  const wasteDisposalCost = input.wasteDisposalCost ?? 0;

  // Handle manual override
  if (input.manualOverride && input.manualTotal !== undefined && input.manualTotal > 0) {
    const manualExGst = round2(input.manualTotal / (1 + GST_RATE));
    const manualGst = round2(input.manualTotal - manualExGst);

    // Calculate equipment for display even in override mode
    const equipment = calculateEquipmentCost(
      {
        dehumidifierQty: input.dehumidifierQty || 0,
        airMoverQty: input.airMoverQty || 0,
        rcdQty: input.rcdQty || 0
      },
      totalLabourHours
    );

    return {
      nonDemoCost: 0,
      nonDemoBreakdown: [],
      demolitionCost: 0,
      demolitionBreakdown: [],
      subfloorCost: 0,
      subfloorBreakdown: [],
      labourSubtotal: 0,
      totalLabourHours,
      totalDays,
      discountPercent: 0,
      discountAmount: 0,
      labourAfterDiscount: 0,
      equipment,
      equipmentCost: input.equipmentCost || equipment.total,
      wasteDisposalCost,
      subtotalExGst: manualExGst,
      gstAmount: manualGst,
      totalIncGst: input.manualTotal,
      discountTierDescription: 'Manual override',
    };
  }

  // Per-day DAY_RATES already encode the multi-day discount — no separate volume discount.

  // Calculate individual labour costs with breakdown
  const nonDemoResult = calculateLabourCostWithBreakdown(input.nonDemoHours, 'nonDemo');
  const demolitionResult = calculateLabourCostWithBreakdown(input.demolitionHours, 'demolition');
  const subfloorResult = calculateLabourCostWithBreakdown(input.subfloorHours, 'subfloor');

  // Labour subtotal — the per-day DAY_RATES already encode the multi-day discount.
  const labourSubtotal = round2(nonDemoResult.cost + demolitionResult.cost + subfloorResult.cost);
  const labourAfterDiscount = labourSubtotal;

  // Calculate equipment
  const equipment = calculateEquipmentCost(
    {
      dehumidifierQty: input.dehumidifierQty || 0,
      airMoverQty: input.airMoverQty || 0,
      rcdQty: input.rcdQty || 0
    },
    totalLabourHours
  );

  // Use direct equipment cost if provided, otherwise use calculated
  const equipmentCost = input.equipmentCost !== undefined ? input.equipmentCost : equipment.total;

  // Calculate totals (waste disposal added after discount — never discounted)
  const subtotalExGst = round2(labourAfterDiscount + equipmentCost + wasteDisposalCost);
  const gstAmount = round2(subtotalExGst * GST_RATE);
  const totalIncGst = round2(subtotalExGst + gstAmount);

  return {
    nonDemoCost: round2(nonDemoResult.cost),
    nonDemoBreakdown: nonDemoResult.breakdown,
    demolitionCost: round2(demolitionResult.cost),
    demolitionBreakdown: demolitionResult.breakdown,
    subfloorCost: round2(subfloorResult.cost),
    subfloorBreakdown: subfloorResult.breakdown,
    labourSubtotal,
    totalLabourHours,
    totalDays,
    discountPercent: 0,
    discountAmount: 0,
    labourAfterDiscount,
    equipment,
    equipmentCost,
    wasteDisposalCost,
    subtotalExGst,
    gstAmount,
    totalIncGst,
    discountTierDescription: '',
  };
}

/**
 * Format currency for Australian display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(decimal === 0 ? 0 : 2)}%`;
}
