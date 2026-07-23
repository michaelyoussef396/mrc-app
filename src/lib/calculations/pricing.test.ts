import { describe, it, expect } from 'vitest';
import {
  calculateCostEstimate,
  calculateLabourCost,
  calculateWasteDisposalCost,
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
  it('should pro-rate $509.70 for 1h (below the 2-hour minimum extrapolation)', () => {
    expect(calculateLabourCost(1, 'nonDemo')).toBe(509.70);
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
      1019.40 + (2 / 6) * (1245.33 - 1019.40),
      2
    );
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
  rcdQty = 0
): { option1Total: number; option2Total: number } {
  const opt1 = calculateCostEstimate({
    nonDemoHours, demolitionHours: 0, subfloorHours: 0,
    dehumidifierQty, airMoverQty, rcdQty,
  });
  const opt2 = calculateCostEstimate({
    nonDemoHours, demolitionHours, subfloorHours,
    dehumidifierQty, airMoverQty, rcdQty,
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
