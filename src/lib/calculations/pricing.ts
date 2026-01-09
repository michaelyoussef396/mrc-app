/**
 * MRC Tier-Based Pricing Calculator
 *
 * Follows COST_CALCULATION_SYSTEM.md specification exactly:
 * - Tier-based labour pricing with linear interpolation (2h-8h range)
 * - 2-hour minimum charge for under 2 hours
 * - Day block calculation for 8+ hours
 * - Volume discount based on total labour hours (max 13%)
 * - Equipment calculated as qty × rate × days
 * - GST at 10%
 */

// Labour rate tiers - Michael's exact pricing
export const LABOUR_RATES = {
  nonDemo: { tier2h: 612.00, tier8h: 1216.99 },
  demolition: { tier2h: 711.90, tier8h: 1798.90 },
  construction: { tier2h: 661.96, tier8h: 1507.95 }, // Future use
  subfloor: { tier2h: 900.00, tier8h: 2334.69 },
} as const;

// Equipment daily rates
export const EQUIPMENT_RATES = {
  dehumidifier: 132,
  airMover: 46,
  rcd: 5,
} as const;

// Volume discount tiers based on TOTAL labour hours
export const DISCOUNT_TIERS = [
  { minHours: 0, maxHours: 8, discount: 0, days: 1 },
  { minHours: 9, maxHours: 16, discount: 0.075, days: 2 },
  { minHours: 17, maxHours: 24, discount: 0.1025, days: 3 },
  { minHours: 25, maxHours: 32, discount: 0.115, days: 4 },
  { minHours: 33, maxHours: Infinity, discount: 0.13, days: 5 },
] as const;

// GST rate
export const GST_RATE = 0.10;

// Maximum discount cap - SACRED RULE - NEVER EXCEED
export const MAX_DISCOUNT = 0.13;

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
 * Calculate labour cost with detailed day-by-day breakdown
 * Uses day blocks for hours > 8 (8h + 8h + remaining)
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
  let totalCost = 0;
  let remainingHours = hours;
  let dayNum = 1;

  // Process full 8-hour days
  while (remainingHours > 8) {
    const dayCost = rates.tier8h;
    totalCost += dayCost;
    breakdown.push({
      day: dayNum,
      hours: 8,
      cost: dayCost,
      description: `Day ${dayNum}: 8h → $${dayCost.toFixed(2)}`
    });
    remainingHours -= 8;
    dayNum++;
  }

  // Process remaining hours (0-8h)
  if (remainingHours > 0) {
    const remainderCost = interpolateCost(remainingHours, rates.tier2h, rates.tier8h);
    totalCost += remainderCost;

    let description: string;
    if (remainingHours <= 2) {
      description = `Day ${dayNum}: ${remainingHours.toFixed(1)}h → $${remainderCost.toFixed(2)} (2h minimum)`;
    } else if (remainingHours === 8) {
      description = `Day ${dayNum}: 8h → $${remainderCost.toFixed(2)}`;
    } else {
      description = `Day ${dayNum}: ${remainingHours.toFixed(1)}h → $${remainderCost.toFixed(2)} (interpolated)`;
    }

    breakdown.push({
      day: dayNum,
      hours: remainingHours,
      cost: remainderCost,
      description
    });
  }

  return { cost: totalCost, breakdown };
}

/**
 * Calculate labour cost (simple version without breakdown)
 */
export function calculateLabourCost(
  hours: number,
  tier2h: number,
  tier8h: number
): number {
  if (hours <= 0) return 0;

  if (hours <= 8) {
    return interpolateCost(hours, tier2h, tier8h);
  }

  // Day block calculation for 8+ hours
  const fullDays = Math.floor(hours / 8);
  const remainingHours = hours % 8;

  // Full days at 8h rate
  const fullDayCost = fullDays * tier8h;

  // Remaining hours interpolated
  const remainingCost = remainingHours > 0
    ? interpolateCost(remainingHours, tier2h, tier8h)
    : 0;

  return fullDayCost + remainingCost;
}

/**
 * Calculate volume discount based on TOTAL labour hours
 * Returns discount as decimal (e.g., 0.075 for 7.5%)
 */
export function calculateDiscount(totalHours: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (totalHours >= tier.minHours && totalHours <= tier.maxHours) {
      return tier.discount;
    }
  }
  // Fallback to max discount (should not reach here)
  return MAX_DISCOUNT;
}

/**
 * Get number of days based on total hours
 */
export function calculateDays(totalHours: number): number {
  if (totalHours <= 0) return 0;
  return Math.ceil(totalHours / 8);
}

/**
 * Format discount tier for display
 */
export function getDiscountTierDescription(totalHours: number): string {
  if (totalHours <= 0) return 'No work';
  if (totalHours <= 8) return 'No discount (1 day or less)';
  if (totalHours <= 16) return '7.5% multi-day discount (2 days)';
  if (totalHours <= 24) return '10.25% multi-day discount (3 days)';
  if (totalHours <= 32) return '11.5% multi-day discount (4 days)';
  return '13% maximum discount (5+ days)';
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

  // Discount
  totalLabourHours: number;
  totalDays: number;
  discountPercent: number;
  discountAmount: number;
  labourAfterDiscount: number;

  // Equipment
  equipment: EquipmentResult;
  equipmentCost: number;

  // Totals
  subtotalExGst: number;
  gstAmount: number;
  totalIncGst: number;

  // Tier info for display
  discountTierDescription: string;
}

/**
 * Main cost estimate calculation function
 * Returns complete breakdown with all intermediate values
 */
export function calculateCostEstimate(input: CostEstimateInput): CostEstimateResult {
  // Calculate total hours first (needed for discount and equipment days)
  const totalLabourHours = input.nonDemoHours + input.demolitionHours + input.subfloorHours;
  const totalDays = calculateDays(totalLabourHours);

  // Handle manual override
  if (input.manualOverride && input.manualTotal !== undefined && input.manualTotal > 0) {
    const manualExGst = input.manualTotal / (1 + GST_RATE);
    const manualGst = input.manualTotal - manualExGst;

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
      subtotalExGst: manualExGst,
      gstAmount: manualGst,
      totalIncGst: input.manualTotal,
      discountTierDescription: 'Manual override',
    };
  }

  // Calculate individual labour costs with breakdown
  const nonDemoResult = calculateLabourCostWithBreakdown(input.nonDemoHours, 'nonDemo');
  const demolitionResult = calculateLabourCostWithBreakdown(input.demolitionHours, 'demolition');
  const subfloorResult = calculateLabourCostWithBreakdown(input.subfloorHours, 'subfloor');

  // Labour subtotal before discount
  const labourSubtotal = nonDemoResult.cost + demolitionResult.cost + subfloorResult.cost;

  // Calculate discount
  const discountPercent = calculateDiscount(totalLabourHours);
  const discountAmount = labourSubtotal * discountPercent;
  const labourAfterDiscount = labourSubtotal - discountAmount;

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

  // Calculate totals
  const subtotalExGst = labourAfterDiscount + equipmentCost;
  const gstAmount = subtotalExGst * GST_RATE;
  const totalIncGst = subtotalExGst + gstAmount;

  return {
    nonDemoCost: nonDemoResult.cost,
    nonDemoBreakdown: nonDemoResult.breakdown,
    demolitionCost: demolitionResult.cost,
    demolitionBreakdown: demolitionResult.breakdown,
    subfloorCost: subfloorResult.cost,
    subfloorBreakdown: subfloorResult.breakdown,
    labourSubtotal,
    totalLabourHours,
    totalDays,
    discountPercent,
    discountAmount,
    labourAfterDiscount,
    equipment,
    equipmentCost,
    subtotalExGst,
    gstAmount,
    totalIncGst,
    discountTierDescription: getDiscountTierDescription(totalLabourHours),
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
