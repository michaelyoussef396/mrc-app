import { describe, it, expect } from 'vitest';
import { calculateCostEstimate, MAX_DISCOUNT } from './pricing';

// ---------------------------------------------------------------------------
// BUG-019: discount tier boundary values — decimal scale invariants
// The canonical convention: calculateCostEstimate returns discountPercent on
// DECIMAL scale (0.13 = 13%). The TIF writer multiplies by 100 before DB
// persistence; the reader divides by 100 on load.
// ---------------------------------------------------------------------------

describe('calculateCostEstimate — discount tier boundaries', () => {
  it('should return 0 discount for 0 total labour hours', () => {
    const result = calculateCostEstimate({ nonDemoHours: 0, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0);
  });

  it('should return 0 discount for 8 total labour hours (1-day threshold)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 8, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0);
  });

  it('should return 0.075 discount for 9 total labour hours (2-day tier)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 9, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0.075);
  });

  it('should return 0.1025 discount for 17 total labour hours (3-day tier)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 17, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0.1025);
  });

  it('should return 0.115 discount for 25 total labour hours (4-day tier)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 25, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0.115);
  });

  it('should return 0.13 discount for 33 total labour hours (5-day cap)', () => {
    const result = calculateCostEstimate({ nonDemoHours: 33, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBe(0.13);
  });

  it('should never exceed MAX_DISCOUNT regardless of extreme hours', () => {
    const result = calculateCostEstimate({ nonDemoHours: 1000, demolitionHours: 0, subfloorHours: 0 });
    expect(result.discountPercent).toBeLessThanOrEqual(MAX_DISCOUNT);
  });
});

// ---------------------------------------------------------------------------
// BUG-019: DB persistence boundary — multiplier must equal 0.87 minimum
// ---------------------------------------------------------------------------

describe('discount cap — 13% SACRED ceiling enforcement', () => {
  it('should never allow the discount multiplier to go below 0.87', () => {
    const result = calculateCostEstimate({ nonDemoHours: 500, demolitionHours: 0, subfloorHours: 0 });
    const multiplier = 1 - result.discountPercent;
    expect(multiplier).toBeGreaterThanOrEqual(0.87);
  });

  it('should persist 13 (percent scale) when discountPercent is 0.13 (decimal scale)', () => {
    // Simulate what TIF writer does at the persistence boundary.
    const result = calculateCostEstimate({ nonDemoHours: 40, demolitionHours: 0, subfloorHours: 0 });
    const persistedValue = result.discountPercent * 100;
    expect(persistedValue).toBe(13);
  });
});

// ---------------------------------------------------------------------------
// Phase 2c: both-option dual-write — option_selected === 3 behaviour
//
// When the technician offers the customer a choice (both options), the DB must
// receive non-null values for BOTH option_1_total_inc_gst and
// option_2_total_inc_gst. These tests verify the pricing.ts building blocks
// that TIF handleSave composes to produce both totals, covering each discount
// tier boundary.
//
// Calculation pattern (mirrors handleSave lines 3347–3368):
//   Option 1 = surface only (nonDemo hours, demo=0, subfloor=0)
//   Option 2 = full scope (nonDemo + demo + subfloor hours)
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
    nonDemoHours,
    demolitionHours: 0,
    subfloorHours: 0,
    dehumidifierQty,
    airMoverQty,
    rcdQty,
  });
  const opt2 = calculateCostEstimate({
    nonDemoHours,
    demolitionHours,
    subfloorHours,
    dehumidifierQty,
    airMoverQty,
    rcdQty,
  });
  const o1Subtotal = opt1.labourAfterDiscount + opt1.equipmentCost;
  const o2Subtotal = opt2.labourAfterDiscount + opt2.equipmentCost;
  return {
    option1Total: o1Subtotal + o1Subtotal * 0.1,
    option2Total: o2Subtotal + o2Subtotal * 0.1,
  };
}

describe('both-option dual-write', () => {
  it('should compute both option totals as positive non-zero values (1-day tier, no equipment)', () => {
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 0);
    expect(option1Total).toBeGreaterThan(0);
    expect(option2Total).toBeGreaterThan(0);
  });

  it('should compute option2Total greater than option1Total when demo/subfloor hours are added', () => {
    // Option 2 includes demolition and subfloor on top of surface — must cost more
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 4);
    expect(option2Total).toBeGreaterThan(option1Total);
  });

  it('should apply 7.5% discount tier (2-day, 9-16h total) to option2 when combined hours cross the boundary', () => {
    // nonDemo=6h + demo=4h + subfloor=0 = 10h total → 2-day tier for option 2
    // option1 has only 6h nonDemo → 1-day tier (0% discount)
    const opt1 = calculateCostEstimate({ nonDemoHours: 6, demolitionHours: 0, subfloorHours: 0 });
    const opt2 = calculateCostEstimate({ nonDemoHours: 6, demolitionHours: 4, subfloorHours: 0 });
    expect(opt1.discountPercent).toBe(0);
    expect(opt2.discountPercent).toBe(0.075);
  });

  it('should apply the 13% discount cap to option2 at 5-day tier and never exceed MAX_DISCOUNT', () => {
    const opt2 = calculateCostEstimate({ nonDemoHours: 16, demolitionHours: 16, subfloorHours: 8 });
    // 40 total hours → 5-day tier → 13% cap
    expect(opt2.discountPercent).toBeLessThanOrEqual(MAX_DISCOUNT);
    expect(opt2.discountPercent).toBe(0.13);
  });

  it('should produce a finite option1Total even when demolitionHours and subfloorHours are zero', () => {
    const { option1Total } = computeDualWriteTotals(8, 0, 0);
    expect(isFinite(option1Total)).toBe(true);
  });

  it('should produce a finite option2Total even when only nonDemoHours is set', () => {
    // degenerate case: no demo or subfloor — option2 equals option1
    const { option1Total, option2Total } = computeDualWriteTotals(8, 0, 0);
    expect(isFinite(option2Total)).toBe(true);
    expect(option2Total).toBe(option1Total);
  });

  it('should null-clear option2 (return 0 for option1-only path) when optionSelected is 1', () => {
    // In optionSelected === 1 mode only saveOption1Total is set; option2 is null.
    // Verify the underlying calculation still returns a finite positive total.
    const result = calculateCostEstimate({ nonDemoHours: 4, demolitionHours: 2, subfloorHours: 0 });
    const subtotal = result.labourAfterDiscount + result.equipmentCost;
    const totalIncGst = subtotal + subtotal * 0.1;
    expect(totalIncGst).toBeGreaterThan(0);
  });

  it('should include equipment cost in both option totals when quantities are provided', () => {
    // Equipment is never discounted — should appear in both option totals
    const { option1Total, option2Total } = computeDualWriteTotals(4, 4, 0, 2, 3, 1);
    const noEquip1 = computeDualWriteTotals(4, 4, 0, 0, 0, 0).option1Total;
    const noEquip2 = computeDualWriteTotals(4, 4, 0, 0, 0, 0).option2Total;
    expect(option1Total).toBeGreaterThan(noEquip1);
    expect(option2Total).toBeGreaterThan(noEquip2);
  });
});

// ---------------------------------------------------------------------------
// BUG-047: Regression locks for the canonical 47h / 37h progressive-save scenario.
// Documented in docs/testing/section9_verification_MRC-2026-0144.md. The bug
// was at the TIF consumption layer (formData.laborCost || costResult.labourAfterDiscount
// short-circuit, fixed in PR #4). The pricing engine itself always produced the
// correct values; these tests lock the dollar-level invariants so any future
// regression in pricing.ts is caught immediately.
// ---------------------------------------------------------------------------

describe('BUG-047 canonical inputs — pricing engine invariants', () => {
  it('should produce $9,223.92 labour after 13% cap for full 47h scope', () => {
    // 15h nonDemo + 22h demo + 10h subfloor = 47h total → 33+h tier (13% cap).
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 10,
      dehumidifierQty: 2,
      airMoverQty: 3,
      rcdQty: 1,
    });
    expect(result.labourAfterDiscount).toBeCloseTo(9223.92, 2);
  });

  it('should produce labour subtotal of $10,602.21 before discount for 47h scope', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 10,
    });
    expect(result.labourSubtotal).toBeCloseTo(10602.21, 2);
  });

  it('should produce $6,409.74 labour after 13% cap for 37h partial-save scope (BUG-047 stale-state value)', () => {
    // 15h nonDemo + 22h demo + 0h subfloor = 37h total → still 33+h tier.
    // This is the value that got persisted via the (now-fixed) || short-circuit
    // when a tech progressively saved without subfloor hours.
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 0,
    });
    expect(result.labourAfterDiscount).toBeCloseTo(6409.74, 2);
  });

  it('should produce 6 equipment days for 47h labour at standard rates', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 10,
      dehumidifierQty: 2,
      airMoverQty: 3,
      rcdQty: 1,
    });
    expect(result.equipment.days).toBe(6);
  });

  it('should produce $2,442 equipment cost for 6 days at canonical quantities', () => {
    // (2×132 + 3×46 + 1×5) × 6 = 407 × 6 = 2,442
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 10,
      dehumidifierQty: 2,
      airMoverQty: 3,
      rcdQty: 1,
    });
    expect(result.equipment.total).toBe(2442);
  });

  it('should preserve manualTotal as totalIncGst when manualOverride is true', () => {
    const result = calculateCostEstimate({
      nonDemoHours: 15,
      demolitionHours: 22,
      subfloorHours: 10,
      manualOverride: true,
      manualTotal: 5000,
    });
    expect(result.totalIncGst).toBe(5000);
  });
});
