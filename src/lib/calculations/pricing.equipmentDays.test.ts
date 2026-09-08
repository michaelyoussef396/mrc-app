import { describe, it, expect } from 'vitest';
import { calculateCostEstimate, deriveEquipmentDays, EQUIPMENT_RATES, round2 } from './pricing';

// ---------------------------------------------------------------------------
// Invariants for the explicit shared hire period (equipmentDays).
//
// PARITY IS PROVED AGAINST FIXED PRE-CHANGE OUTPUT, NOT AGAINST THIS ENGINE.
// Comparing calculateCostEstimate({...s, equipmentDays: 0}) with
// calculateCostEstimate(s) only shows the modified engine agrees with itself; it
// cannot show that either matches what shipped. The literals in PRE_CHANGE were
// captured by running calculateCostEstimate from pricing.ts at commit 63dca6b —
// the last commit before equipmentDays existed — over the shapes below, via
// vite-node. Re-capture the same way if a deliberate pricing change lands.
//
// SCOPE: this is SELECTED-FIELD parity over the six fields in toQuoteSnapshot, not complete
// output parity. A change confined to a field outside that set would pass these tests.
// ---------------------------------------------------------------------------

const BASE = {
  nonDemoHours: 4,
  demolitionHours: 0,
  subfloorHours: 0,
  dehumidifierQty: 2,
  airMoverQty: 4,
  rcdQty: 1,
};

const toQuoteSnapshot = (r: ReturnType<typeof calculateCostEstimate>) => ({
  labourAfterDiscount: r.labourAfterDiscount,
  equipmentDays: r.equipment.days,
  equipmentTotal: r.equipment.total,
  equipmentCost: r.equipmentCost,
  subtotalExGst: r.subtotalExGst,
  totalIncGst: r.totalIncGst,
});

// Captured from pricing.ts @ 63dca6b. Do not hand-edit to make a test pass.
const PRE_CHANGE = {
  hepa: { labourAfterDiscount: 825.29, equipmentDays: 1, equipmentTotal: 627, equipmentCost: 627, subtotalExGst: 1452.29, totalIncGst: 1597.52 },
  hepaOwnDays: { labourAfterDiscount: 825.29, equipmentDays: 1, equipmentTotal: 1027, equipmentCost: 1027, subtotalExGst: 1852.29, totalIncGst: 2037.52 },
  subfloor: { labourAfterDiscount: 2710.71, equipmentDays: 2, equipmentTotal: 854, equipmentCost: 854, subtotalExGst: 3564.71, totalIncGst: 3921.18 },
  demolition: { labourAfterDiscount: 2096.09, equipmentDays: 2, equipmentTotal: 854, equipmentCost: 854, subtotalExGst: 2950.09, totalIncGst: 3245.1 },
  waste: { labourAfterDiscount: 825.29, equipmentDays: 1, equipmentTotal: 427, equipmentCost: 427, subtotalExGst: 1702.29, totalIncGst: 1872.52 },
  manualOverride: { labourAfterDiscount: 0, equipmentDays: 1, equipmentTotal: 427, equipmentCost: 427, subtotalExGst: 4545.45, totalIncGst: 5000 },
  directEquipment: { labourAfterDiscount: 825.29, equipmentDays: 1, equipmentTotal: 427, equipmentCost: 1234.56, subtotalExGst: 2059.85, totalIncGst: 2265.84 },
};

describe('equipmentDays 0 reproduces the engine as it shipped at 63dca6b', () => {
  it('should match pre-change output for a HEPA job', () => {
    const r = calculateCostEstimate({ ...BASE, hepaAirScrubberQty: 2, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.hepa);
  });

  it('should match pre-change output when HEPA carries its own hire period', () => {
    const r = calculateCostEstimate({ ...BASE, hepaAirScrubberQty: 2, hepaAirScrubberDays: 3, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.hepaOwnDays);
  });

  it('should match pre-change output for a job with subfloor hours', () => {
    const r = calculateCostEstimate({ ...BASE, subfloorHours: 6, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.subfloor);
  });

  it('should match pre-change output for a job with demolition hours', () => {
    const r = calculateCostEstimate({ ...BASE, demolitionHours: 5, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.demolition);
  });

  it('should match pre-change output for a job carrying waste disposal', () => {
    const r = calculateCostEstimate({ ...BASE, wasteDisposalCost: 450, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.waste);
  });

  it('should match pre-change output in manual-override mode', () => {
    const r = calculateCostEstimate({ ...BASE, manualOverride: true, manualTotal: 5000, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.manualOverride);
  });

  it('should match pre-change output when a direct equipment cost overrides the quantities', () => {
    const r = calculateCostEstimate({ ...BASE, equipmentCost: 1234.56, equipmentDays: 0 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.directEquipment);
  });

  it('should match pre-change output when equipmentDays is absent entirely', () => {
    const r = calculateCostEstimate({ ...BASE, hepaAirScrubberQty: 2 });
    expect(toQuoteSnapshot(r)).toEqual(PRE_CHANGE.hepa);
  });
});

// ---------------------------------------------------------------------------
// Unusable day counts fall back to the labour-derived days — the same behaviour
// absent/0 has. Asserted rather than left implicit, because the fallback is the
// difference between a quote and a NaN total.
// ---------------------------------------------------------------------------

const AUTO_DAYS = deriveEquipmentDays(4);

describe('unusable explicit day counts fall back to the labour-derived days', () => {
  it('should fall back when the day count is Infinity', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: Infinity }).equipment.days).toBe(AUTO_DAYS);
  });

  it('should keep the total finite when the day count is Infinity', () => {
    expect(Number.isFinite(calculateCostEstimate({ ...BASE, equipmentDays: Infinity }).totalIncGst)).toBe(true);
  });

  it('should fall back when the day count is Number.MAX_VALUE', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: Number.MAX_VALUE }).equipment.days).toBe(AUTO_DAYS);
  });

  it('should fall back when the day count is NaN', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: NaN }).equipment.days).toBe(AUTO_DAYS);
  });

  it('should fall back when the day count is negative', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: -3 }).equipment.days).toBe(AUTO_DAYS);
  });

  it('should fall back beyond the overflow sentinel', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: 3651 }).equipment.days).toBe(AUTO_DAYS);
  });

  it('should accept the largest quotable hire period', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: 3650 }).equipment.days).toBe(3650);
  });

  // DECIDED, not incidental: a fractional day is charged as given. Rounding a hire period
  // is a pricing rule, and pricing rules are Glen's or Clayton's — the same reason the
  // 4-day cap is unimplemented (P2-24). The UI stepper only ever emits integers.
  it('should charge a fractional hire period unrounded', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: 2.5 }).equipment.days).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// Equipment is a pass-through: an explicit hire period may scale equipment only.
//
// NOTE: calculateCostEstimate applies no discount at all — the per-day DAY_RATES
// encode it and discountPercent is hard-zero. The manual 13% invoice discount
// lives in src/lib/api/invoices.ts, so "equipment survives a discount" is only
// testable there, not against this engine.
// ---------------------------------------------------------------------------

describe('explicit equipment days cannot move labour or the rates', () => {
  it('should price every drying item at qty x rate x the explicit days', () => {
    const perDay = 2 * EQUIPMENT_RATES.dehumidifier + 4 * EQUIPMENT_RATES.airMover + 1 * EQUIPMENT_RATES.rcd;
    expect(calculateCostEstimate({ ...BASE, equipmentDays: 4 }).equipment.total).toBe(round2(perDay * 4));
  });

  it('should leave labour identical to the same job with no explicit days', () => {
    expect(calculateCostEstimate({ ...BASE, equipmentDays: 4 }).labourAfterDiscount)
      .toBe(PRE_CHANGE.waste.labourAfterDiscount);
  });

  it('should add the explicit-days equipment cost to the subtotal undiminished', () => {
    const r = calculateCostEstimate({ ...BASE, equipmentDays: 4, wasteDisposalCost: 450 });
    expect(r.subtotalExGst).toBe(round2(r.labourAfterDiscount + r.equipmentCost + r.wasteDisposalCost));
  });
});
