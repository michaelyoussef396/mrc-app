import { describe, it, expect } from 'vitest';
import {
  calculateCostEstimate,
  calculateLabourCost,
  calculateLabourCostWithBreakdown,
  calculateWasteDisposalCost,
  deriveEquipmentDays,
  interpolateCost,
  EQUIPMENT_RATES,
  LABOUR_RATES,
  MAX_DISCOUNT,
  round2,
} from './pricing';

// ---------------------------------------------------------------------------
// Per-day DAY_RATES labour model (replaces the volume-discount tiers).
// Day 1 = full rate; each subsequent day is lower; Day 5 === Day 6 floor; days
// beyond 6 extrapolate at the Day-6 rate. The per-day decline encodes the discount.
// Values are dayRates-authoritative (the indicative chart is ≤1¢ off at 40h/48h).
// ---------------------------------------------------------------------------

describe('calculateLabourCost — nonDemo per-day anchors', () => {
  it('should pro-rate $307.64 for 1h (below the 2-hour minimum extrapolation)', () => {
    expect(calculateLabourCost(1, 'nonDemo')).toBe(307.64);
  });

  it('should charge tier8h $1,245.33 at 8h (Day 1)', () => {
    expect(calculateLabourCost(8, 'nonDemo')).toBe(1245.33);
  });

  it('should sum to $2,305.67 at 16h (Days 1–2)', () => {
    expect(calculateLabourCost(16, 'nonDemo')).toBe(2305.67);
  });

  it('should sum to $3,360.19 at 24h (Days 1–3)', () => {
    expect(calculateLabourCost(24, 'nonDemo')).toBe(3360.19);
  });

  it('should sum to $4,367.37 at 32h (Days 1–4)', () => {
    expect(calculateLabourCost(32, 'nonDemo')).toBe(4367.37);
  });

  it('should sum to $5,288.94 at 40h (Days 1–5)', () => {
    expect(calculateLabourCost(40, 'nonDemo')).toBe(5288.94);
  });

  it('should sum to $6,210.51 at 48h (Days 1–6)', () => {
    expect(calculateLabourCost(48, 'nonDemo')).toBe(6210.51);
  });
});

describe('calculateLabourCost — demolition and subfloor anchors', () => {
  it('should charge tier8h $1,825.87 at 8h demolition', () => {
    expect(calculateLabourCost(8, 'demolition')).toBe(1825.87);
  });

  it('should sum to $9,095.44 at 48h demolition', () => {
    expect(calculateLabourCost(48, 'demolition')).toBe(9095.44);
  });

  it('should charge tier8h $2,375.21 at 8h subfloor', () => {
    expect(calculateLabourCost(8, 'subfloor')).toBe(2375.21);
  });

  it('should sum to $11,820.77 at 48h subfloor', () => {
    expect(calculateLabourCost(48, 'subfloor')).toBe(11820.77);
  });
});

describe('calculateLabourCost — Day-6 floor (beyond 48h)', () => {
  it('should extrapolate the 7th day at the Day-6 floor rate', () => {
    // 56h = 7 full days → Days 1–6 sum (6210.51) + Day-6 floor rate (921.57)
    expect(calculateLabourCost(56, 'nonDemo')).toBeCloseTo(6210.51 + 921.57, 2);
  });
});

describe('calculateLabourCost — sub-8h band unchanged', () => {
  it('should interpolate 4h nonDemo between tier2h and tier8h', () => {
    expect(calculateLabourCost(4, 'nonDemo')).toBeCloseTo(
      615.27 + (2 / 6) * (1245.33 - 615.27),
      2
    );
  });
});

// ---------------------------------------------------------------------------
// 2-hour anchor rates — 2026-08-25 rate card correction (owner-supplied).
// The previous anchors ($1,019.40 / $1,062.00 / $1,322.62) over-quoted every
// job under 8 hours. 8h/16h anchors and the interpolation band are unchanged.
// ---------------------------------------------------------------------------

describe('2-hour anchor rates (2026-08-25 rate card)', () => {
  it('should charge exactly $615.27 for 2h surface (nonDemo)', () => {
    expect(calculateLabourCost(2, 'nonDemo')).toBe(615.27);
  });

  it('should charge exactly $715.73 for 2h demolition', () => {
    expect(calculateLabourCost(2, 'demolition')).toBe(715.73);
  });

  it('should charge exactly $905.84 for 2h subfloor', () => {
    expect(calculateLabourCost(2, 'subfloor')).toBe(905.84);
  });
});

describe('8-hour anchor rates unchanged', () => {
  it('should charge exactly $1,245.33 for 8h surface (nonDemo)', () => {
    expect(calculateLabourCost(8, 'nonDemo')).toBe(1245.33);
  });

  it('should charge exactly $1,825.87 for 8h demolition', () => {
    expect(calculateLabourCost(8, 'demolition')).toBe(1825.87);
  });

  it('should charge exactly $2,375.21 for 8h subfloor', () => {
    expect(calculateLabourCost(8, 'subfloor')).toBe(2375.21);
  });
});

describe('interpolation boundary continuity at 8h', () => {
  it('should return tier8h when interpolating to exactly 8h for nonDemo', () => {
    const { tier2h, tier8h } = LABOUR_RATES.nonDemo;
    expect(interpolateCost(8, tier2h, tier8h)).toBeCloseTo(tier8h, 2);
  });

  it('should return tier8h when interpolating to exactly 8h for demolition', () => {
    const { tier2h, tier8h } = LABOUR_RATES.demolition;
    expect(interpolateCost(8, tier2h, tier8h)).toBeCloseTo(tier8h, 2);
  });

  it('should return tier8h when interpolating to exactly 8h for subfloor', () => {
    const { tier2h, tier8h } = LABOUR_RATES.subfloor;
    expect(interpolateCost(8, tier2h, tier8h)).toBeCloseTo(tier8h, 2);
  });
});

describe('4-hour interpolated rates (2026-08-25 rate card)', () => {
  it('should charge $825.29 within 1 cent for 4h surface (nonDemo)', () => {
    expect(calculateLabourCost(4, 'nonDemo')).toBeCloseTo(825.29, 2);
  });

  it('should charge $1,085.78 within 1 cent for 4h demolition', () => {
    expect(calculateLabourCost(4, 'demolition')).toBeCloseTo(1085.78, 2);
  });

  it('should charge $1,395.63 within 1 cent for 4h subfloor', () => {
    expect(calculateLabourCost(4, 'subfloor')).toBeCloseTo(1395.63, 2);
  });
});

describe('sub-2h minimum charge floor (real charging path)', () => {
  it('should charge the flat 2h rate $615.27 for 1h surface (nonDemo)', () => {
    expect(calculateLabourCostWithBreakdown(1, 'nonDemo').cost).toBe(615.27);
  });

  it('should charge the flat 2h rate $715.73 for 1h demolition', () => {
    expect(calculateLabourCostWithBreakdown(1, 'demolition').cost).toBe(715.73);
  });

  it('should charge the flat 2h rate $905.84 for 1h subfloor', () => {
    expect(calculateLabourCostWithBreakdown(1, 'subfloor').cost).toBe(905.84);
  });
});

describe('16-hour totals (dayRates[0] + dayRates[1])', () => {
  it('should sum to $2,305.67 at 16h surface (nonDemo)', () => {
    expect(calculateLabourCost(16, 'nonDemo')).toBe(2305.67);
  });

  it('should sum to $3,375.92 at 16h demolition', () => {
    expect(calculateLabourCost(16, 'demolition')).toBe(3375.92);
  });

  it('should sum to $4,390.68 at 16h subfloor', () => {
    expect(calculateLabourCost(16, 'subfloor')).toBe(4390.68);
  });
});

describe('DAY_RATES table invariants', () => {
  it('should have dayRates[0] === tier8h for all three active labour types', () => {
    expect(LABOUR_RATES.nonDemo.dayRates[0]).toBe(LABOUR_RATES.nonDemo.tier8h);
    expect(LABOUR_RATES.demolition.dayRates[0]).toBe(LABOUR_RATES.demolition.tier8h);
    expect(LABOUR_RATES.subfloor.dayRates[0]).toBe(LABOUR_RATES.subfloor.tier8h);
  });

  it('should keep Day 5 === Day 6 (clean floor) for all three active types', () => {
    expect(LABOUR_RATES.nonDemo.dayRates[4]).toBe(LABOUR_RATES.nonDemo.dayRates[5]);
    expect(LABOUR_RATES.demolition.dayRates[4]).toBe(LABOUR_RATES.demolition.dayRates[5]);
    expect(LABOUR_RATES.subfloor.dayRates[4]).toBe(LABOUR_RATES.subfloor.dayRates[5]);
  });
});

describe('estimate path (calculateLabourCostWithBreakdown) uses DAY_RATES', () => {
  it('should produce labourSubtotal $6,210.51 for a 48h nonDemo estimate', () => {
    const result = calculateCostEstimate({ nonDemoHours: 48, demolitionHours: 0, subfloorHours: 0 });
    expect(result.labourSubtotal).toBeCloseTo(6210.51, 2);
  });

  it('should set labourAfterDiscount equal to labourSubtotal (no separate discount)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 16, demolitionHours: 8, subfloorHours: 4 });
    expect(result.labourAfterDiscount).toBe(result.labourSubtotal);
    expect(result.discountPercent).toBe(0);
    expect(result.discountAmount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Equipment rates (qty × rate × days, never discounted).
// ---------------------------------------------------------------------------

describe('EQUIPMENT_RATES', () => {
  it('should set the dehumidifier rate to $119/day', () => {
    expect(EQUIPMENT_RATES.dehumidifier).toBe(119);
  });

  it('should set the air mover rate to $46/day', () => {
    expect(EQUIPMENT_RATES.airMover).toBe(46);
  });

  it('should set the HEPA Air Scrubber rate to $100/day', () => {
    expect(EQUIPMENT_RATES.hepaAirScrubber).toBe(100);
  });

  it('should set the RCD rate to $5/day', () => {
    expect(EQUIPMENT_RATES.rcd).toBe(5);
  });

  it('should produce 6 equipment days for a 47h job', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1,
    });
    expect(result.equipment.days).toBe(6);
  });

  it('should compute $2,286 equipment cost for 6 days at canonical quantities', () => {
    // (2×119 + 3×46 + 1×5) × 6 = 381 × 6 = 2,286
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1,
    });
    expect(result.equipment.total).toBe(2286);
  });

  it('should charge HEPA at $100/unit/day over the shared equipment days by default', () => {
    // 47h job → 6 shared days; 2 scrubbers × $100 × 6 = 1,200
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      hepaAirScrubberQty: 2,
    });
    expect(result.equipment.hepaAirScrubber.cost).toBe(1200);
    expect(result.equipment.hepaAirScrubber.days).toBe(6);
  });

  it('should add HEPA on top of the canonical equipment total', () => {
    // 2,286 + (2×100×6) = 3,486
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1, hepaAirScrubberQty: 2,
    });
    expect(result.equipment.total).toBe(3486);
  });

  it('should use the explicit HEPA days without changing the shared equipment days', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      hepaAirScrubberQty: 2, hepaAirScrubberDays: 3,
    });
    expect(result.equipment.hepaAirScrubber.cost).toBe(600);
    expect(result.equipment.hepaAirScrubber.days).toBe(3);
    expect(result.equipment.days).toBe(6);
  });

  it('should leave the canonical total unchanged when HEPA fields are absent', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1,
    });
    expect(result.equipment.total).toBe(2286);
    expect(result.equipment.hepaAirScrubber.qty).toBe(0);
    expect(result.equipment.hepaAirScrubber.cost).toBe(0);
  });

  it('should charge $0 HEPA when qty is 0 even with days set', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1,
      hepaAirScrubberQty: 0, hepaAirScrubberDays: 5,
    });
    expect(result.equipment.hepaAirScrubber.cost).toBe(0);
    expect(result.equipment.total).toBe(2286);
  });

  it('should charge one minimum HEPA day when there are no labour hours', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 0, demolitionHours: 0, subfloorHours: 0,
      hepaAirScrubberQty: 1,
    });
    expect(result.equipment.hepaAirScrubber.cost).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Labour-derived equipment days — one hire day per started 8h labour day, min 1.
// ---------------------------------------------------------------------------

describe('deriveEquipmentDays', () => {
  it('should charge one day when there are no labour hours', () => {
    expect(deriveEquipmentDays(0)).toBe(1);
  });

  it('should charge one day for a sub-8h job', () => {
    expect(deriveEquipmentDays(4)).toBe(1);
  });

  it('should charge one day for exactly eight hours', () => {
    expect(deriveEquipmentDays(8)).toBe(1);
  });

  it('should start a second day past eight hours', () => {
    expect(deriveEquipmentDays(8.5)).toBe(2);
  });

  it('should agree with the shared days the engine reports for a 47h job', () => {
    const result = calculateCostEstimate({ nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10 });
    expect(result.equipment.days).toBe(deriveEquipmentDays(47));
  });
});

// ---------------------------------------------------------------------------
// Explicit shared equipment days — multiplies every drying item. Absent/0 derives
// from labour hours exactly as before, so existing quotes are byte-identical.
// ---------------------------------------------------------------------------

// The owner's worked example: "four days for two dehumidifiers and four blowers".
const OWNER_DAYS_EXAMPLE = {
  nonDemoHours: 4, demolitionHours: 0, subfloorHours: 0,
  dehumidifierQty: 2, airMoverQty: 4, rcdQty: 0,
};

describe('calculateCostEstimate — explicit equipment days', () => {
  it('should multiply every drying item by the explicit day count', () => {
    // (2×119 + 4×46) × 4 = 422 × 4 = 1,688
    const result = calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, equipmentDays: 4 });
    expect(result.equipment.total).toBe(1688);
  });

  it('should report the explicit day count as the shared equipment days', () => {
    const result = calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, equipmentDays: 4 });
    expect(result.equipment.days).toBe(4);
  });

  it('should multiply the RCD box by the explicit day count', () => {
    const result = calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, rcdQty: 1, equipmentDays: 4 });
    expect(result.equipment.rcd.cost).toBe(20);
  });

  it('should apply the explicit days to HEPA when HEPA has no days of its own', () => {
    const result = calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, hepaAirScrubberQty: 1, equipmentDays: 4 });
    expect(result.equipment.hepaAirScrubber.cost).toBe(400);
  });

  it('should keep HEPA on its own hire period when both are set', () => {
    const result = calculateCostEstimate({
      ...OWNER_DAYS_EXAMPLE, hepaAirScrubberQty: 1, hepaAirScrubberDays: 2, equipmentDays: 4,
    });
    expect(result.equipment.hepaAirScrubber.cost).toBe(200);
  });

  it('should override the labour-derived days even when the explicit count is shorter', () => {
    // 47h job derives 6 days; the explicit 2 wins: 381 × 2 = 762
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1, equipmentDays: 2,
    });
    expect(result.equipment.total).toBe(762);
  });

  it('should leave the labour work days labour-derived when equipment days are explicit', () => {
    const result = calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, equipmentDays: 4 });
    expect(result.totalDays).toBe(1);
  });

  it('should apply the explicit days in manual-override mode', () => {
    const result = calculateCostEstimate({
      ...OWNER_DAYS_EXAMPLE, equipmentDays: 4, manualOverride: true, manualTotal: 5000,
    });
    expect(result.equipment.days).toBe(4);
  });

  it('should be identical to the labour-derived engine when equipmentDays is 0', () => {
    expect(calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, equipmentDays: 0 }))
      .toEqual(calculateCostEstimate(OWNER_DAYS_EXAMPLE));
  });

  it('should be identical to the labour-derived engine when equipmentDays is absent', () => {
    expect(calculateCostEstimate({ ...OWNER_DAYS_EXAMPLE, equipmentDays: undefined }))
      .toEqual(calculateCostEstimate(OWNER_DAYS_EXAMPLE));
  });
});

describe('multi-day equipment flows into subtotal without being discounted', () => {
  const base = { nonDemoHours: 4, demolitionHours: 0, subfloorHours: 0 };

  it('should raise the subtotal by exactly the multi-day equipment cost', () => {
    const withEquipment = calculateCostEstimate({ ...base, dehumidifierQty: 2, airMoverQty: 4, equipmentDays: 4 });
    const without = calculateCostEstimate(base);
    expect(round2(withEquipment.subtotalExGst - without.subtotalExGst)).toBe(1688);
  });

  it('should charge GST on the multi-day equipment cost', () => {
    const withEquipment = calculateCostEstimate({ ...base, dehumidifierQty: 2, airMoverQty: 4, equipmentDays: 4 });
    const without = calculateCostEstimate(base);
    expect(round2(withEquipment.totalIncGst - without.totalIncGst)).toBe(1856.8);
  });
});

// ---------------------------------------------------------------------------
// MAX_DISCOUNT retained as the manual invoice-discount cap (not a volume tier).
// ---------------------------------------------------------------------------

describe('MAX_DISCOUNT', () => {
  it('should remain the 13% cap (0.13 decimal scale)', () => {
    expect(MAX_DISCOUNT).toBe(0.13);
  });
});

// ---------------------------------------------------------------------------
// Full estimate — GST applied last, equipment not discounted.
// ---------------------------------------------------------------------------

describe('calculateCostEstimate — GST last, equipment not discounted', () => {
  it('should produce labour $1,245.33, GST 10%, total inc GST for an 8h nonDemo job', () => {
    const result = calculateCostEstimate({ nonDemoHours: 8, demolitionHours: 0, subfloorHours: 0 });
    expect(result.labourAfterDiscount).toBe(1245.33);
    expect(result.gstAmount).toBeCloseTo(round2(1245.33 * 0.10), 2);
    expect(result.totalIncGst).toBe(round2(1245.33 * 1.10));
  });

  it('should preserve manualTotal as totalIncGst when manualOverride is true', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10,
      manualOverride: true, manualTotal: 5000,
    });
    expect(result.totalIncGst).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Both-option dual-write — both totals positive; equipment in both; never discounted.
// (Mirrors TIF handleSave: option 1 = surface only, option 2 = full scope.)
// ---------------------------------------------------------------------------

function computeDualWriteTotals(
  nonDemoHours: number,
  demolitionHours: number,
  subfloorHours: number,
  dehumidifierQty = 0,
  airMoverQty = 0,
  rcdQty = 0,
  hepaAirScrubberQty = 0
): { option1Total: number; option2Total: number } {
  const opt1 = calculateCostEstimate({
    nonDemoHours, demolitionHours: 0, subfloorHours: 0,
    dehumidifierQty, airMoverQty, rcdQty, hepaAirScrubberQty,
  });
  const opt2 = calculateCostEstimate({
    nonDemoHours, demolitionHours, subfloorHours,
    dehumidifierQty, airMoverQty, rcdQty, hepaAirScrubberQty,
  });
  const o1Subtotal = opt1.labourAfterDiscount + opt1.equipmentCost;
  const o2Subtotal = opt2.labourAfterDiscount + opt2.equipmentCost;
  return {
    option1Total: o1Subtotal + o1Subtotal * 0.1,
    option2Total: o2Subtotal + o2Subtotal * 0.1,
  };
}

describe('both-option dual-write', () => {
  it('should compute both option totals as positive non-zero values', () => {
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 0);
    expect(option1Total).toBeGreaterThan(0);
    expect(option2Total).toBeGreaterThan(0);
  });

  it('should compute option2Total greater than option1Total when demo/subfloor hours are added', () => {
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 4);
    expect(option2Total).toBeGreaterThan(option1Total);
  });

  it('should equal option1Total for option2 when only nonDemoHours is set', () => {
    const { option1Total, option2Total } = computeDualWriteTotals(8, 0, 0);
    expect(isFinite(option2Total)).toBe(true);
    expect(option2Total).toBe(option1Total);
  });

  it('should include (undiscounted) equipment cost in both option totals', () => {
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 0, 2, 3, 1);
    const noEquip1 = computeDualWriteTotals(4, 4, 0, 0, 0, 0).option1Total;
    const noEquip2 = computeDualWriteTotals(4, 4, 0, 0, 0, 0).option2Total;
    expect(option1Total).toBeGreaterThan(noEquip1);
    expect(option2Total).toBeGreaterThan(noEquip2);
  });

  it('should raise both option totals by the HEPA cost plus GST', () => {
    // 8h total → 1 shared day; 2 scrubbers × $100 × 1 = 200; ×1.1 = 220 inc GST.
    const base = computeDualWriteTotals(4, 4, 0);
    const withHepa = computeDualWriteTotals(4, 4, 0, 0, 0, 0, 2);
    expect(round2(withHepa.option1Total - base.option1Total)).toBe(220);
    expect(round2(withHepa.option2Total - base.option2Total)).toBe(220);
  });
});

// ---------------------------------------------------------------------------
// Waste disposal cubic-metre pricing — interpolated price anchors.
// Anchors at 2/4/6/8/10/12 m³; pro-rate below 2; extrapolate above 12 at $145/m³.
// ---------------------------------------------------------------------------

describe('calculateWasteDisposalCost', () => {
  it('should return $0 for 0 m³', () => {
    expect(calculateWasteDisposalCost(0)).toBe(0);
  });

  it('should pro-rate $175 for 1 m³ (below first anchor)', () => {
    expect(calculateWasteDisposalCost(1)).toBe(175);
  });

  it('should return $350 at the 2 m³ anchor', () => {
    expect(calculateWasteDisposalCost(2)).toBe(350);
  });

  it('should interpolate $400 for 3 m³ (between 2 and 4)', () => {
    expect(calculateWasteDisposalCost(3)).toBe(400);
  });

  it('should return $450 at the 4 m³ anchor', () => {
    expect(calculateWasteDisposalCost(4)).toBe(450);
  });

  it('should interpolate $626.50 for 7 m³ (between 6 and 8)', () => {
    expect(calculateWasteDisposalCost(7)).toBe(626.5);
  });

  it('should return $1,190 at the 12 m³ anchor', () => {
    expect(calculateWasteDisposalCost(12)).toBe(1190);
  });

  it('should extrapolate $1,480 for 14 m³ (above top anchor at $145/m³)', () => {
    expect(calculateWasteDisposalCost(14)).toBe(1480);
  });

  it('should return $0 for negative m³', () => {
    expect(calculateWasteDisposalCost(-5)).toBe(0);
  });
});

describe('waste disposal cost flows into subtotal without being discounted', () => {
  it('should add the confirmed waste cost on top of the labour subtotal', () => {
    const base = { nonDemoHours: 40, demolitionHours: 0, subfloorHours: 0 };
    const withoutWaste = calculateCostEstimate(base);
    const withWaste = calculateCostEstimate({ ...base, wasteDisposalCost: 550 });

    expect(withWaste.wasteDisposalCost).toBe(550);
    expect(withWaste.subtotalExGst).toBe(
      round2(withWaste.labourAfterDiscount + withWaste.equipmentCost + 550)
    );
    // Waste is not discounted: the subtotal delta equals exactly the waste cost.
    expect(round2(withWaste.subtotalExGst - withoutWaste.subtotalExGst)).toBe(550);
  });

  it('should default wasteDisposalCost to 0 when not provided (backward compatible)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 5, demolitionHours: 0, subfloorHours: 0 });
    expect(result.wasteDisposalCost).toBe(0);
  });
});

describe('HEPA cost flows into subtotal without being discounted', () => {
  it('should raise the subtotal by exactly the HEPA cost (no discount applied)', () => {
    // 40h → 5 shared days; 2 scrubbers × $100 × 5 = 1,000; GST makes the total delta 1,100.
    const base = { nonDemoHours: 40, demolitionHours: 0, subfloorHours: 0 };
    const withoutHepa = calculateCostEstimate(base);
    const withHepa = calculateCostEstimate({ ...base, hepaAirScrubberQty: 2 });

    expect(round2(withHepa.subtotalExGst - withoutHepa.subtotalExGst)).toBe(1000);
    expect(round2(withHepa.totalIncGst - withoutHepa.totalIncGst)).toBe(1100);
  });
});

// ---------------------------------------------------------------------------
// All money values must be rounded to exactly 2 decimal places.
// ---------------------------------------------------------------------------

describe('round2 utility', () => {
  it('should round 3269.378429166667 to 3269.38', () => {
    expect(round2(3269.378429166667)).toBe(3269.38);
  });

  it('should round 0.005 up to 0.01', () => {
    expect(round2(0.005)).toBe(0.01);
  });

  it('should leave exact 2dp values unchanged', () => {
    expect(round2(1245.33)).toBe(1245.33);
  });

  it('should handle zero', () => {
    expect(round2(0)).toBe(0);
  });
});

describe('calculateCostEstimate — 2dp precision on all money fields', () => {
  it('should return labourSubtotal with exactly 2 decimal places', () => {
    const result = calculateCostEstimate({ nonDemoHours: 5, demolitionHours: 3, subfloorHours: 2 });
    expect(result.labourSubtotal).toBe(round2(result.labourSubtotal));
  });

  it('should return labourAfterDiscount with exactly 2 decimal places', () => {
    const result = calculateCostEstimate({ nonDemoHours: 10, demolitionHours: 5, subfloorHours: 2 });
    expect(result.labourAfterDiscount).toBe(round2(result.labourAfterDiscount));
  });

  it('should return subtotalExGst with exactly 2 decimal places', () => {
    const result = calculateCostEstimate({ nonDemoHours: 10, demolitionHours: 5, subfloorHours: 2, dehumidifierQty: 1, airMoverQty: 2, rcdQty: 1 });
    expect(result.subtotalExGst).toBe(round2(result.subtotalExGst));
  });

  it('should return gstAmount with exactly 2 decimal places', () => {
    const result = calculateCostEstimate({ nonDemoHours: 10, demolitionHours: 5, subfloorHours: 2, dehumidifierQty: 1, airMoverQty: 2, rcdQty: 1 });
    expect(result.gstAmount).toBe(round2(result.gstAmount));
  });

  it('should return totalIncGst with exactly 2 decimal places', () => {
    const result = calculateCostEstimate({ nonDemoHours: 10, demolitionHours: 5, subfloorHours: 2, dehumidifierQty: 1, airMoverQty: 2, rcdQty: 1 });
    expect(result.totalIncGst).toBe(round2(result.totalIncGst));
  });

  it('should return nonDemoCost with exactly 2 decimal places for interpolated hours', () => {
    const result = calculateCostEstimate({ nonDemoHours: 5.5, demolitionHours: 0, subfloorHours: 0 });
    expect(result.nonDemoCost).toBe(round2(result.nonDemoCost));
  });

  it('should produce stable values on repeated calculation (no float drift)', () => {
    const input = { nonDemoHours: 15, demolitionHours: 22, subfloorHours: 10, dehumidifierQty: 2, airMoverQty: 3, rcdQty: 1 };
    const r1 = calculateCostEstimate(input);
    const r2 = calculateCostEstimate(input);
    expect(r1.totalIncGst).toBe(r2.totalIncGst);
    expect(r1.subtotalExGst).toBe(r2.subtotalExGst);
    expect(r1.gstAmount).toBe(r2.gstAmount);
  });
});
