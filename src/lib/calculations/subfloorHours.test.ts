import { describe, it, expect } from 'vitest';

import { calculateCostEstimate } from './pricing';
import { resolveSubfloorHours } from './subfloorHours';

describe('resolveSubfloorHours', () => {
  it('should return 0 when the toggle is off even though hours were entered', () => {
    expect(resolveSubfloorHours(false, 6)).toBe(0);
  });

  it('should return the entered hours when the toggle is on', () => {
    expect(resolveSubfloorHours(true, 6)).toBe(6);
  });

  it('should return the entered hours when the toggle is undetermined', () => {
    expect(resolveSubfloorHours(null, 6)).toBe(6);
  });

  it('should return the entered hours when the toggle is absent', () => {
    expect(resolveSubfloorHours(undefined, 6)).toBe(6);
  });

  it('should return 0 when the toggle is on but no hours were entered', () => {
    expect(resolveSubfloorHours(true, 0)).toBe(0);
  });

  it('should return 0 when the toggle is on but hours are null', () => {
    expect(resolveSubfloorHours(true, null)).toBe(0);
  });

  it('should return 0 for a fractional entry once the toggle is off', () => {
    expect(resolveSubfloorHours(false, 0.5)).toBe(0);
  });
});

describe('subfloor toggle off, applied to the cost estimate', () => {
  const SURFACE_HOURS = 6;
  const STALE_SUBFLOOR_HOURS = 6;

  const estimateWithToggleOff = calculateCostEstimate({
    nonDemoHours: SURFACE_HOURS,
    demolitionHours: 0,
    subfloorHours: resolveSubfloorHours(false, STALE_SUBFLOOR_HOURS),
  });

  const estimateWithToggleOn = calculateCostEstimate({
    nonDemoHours: SURFACE_HOURS,
    demolitionHours: 0,
    subfloorHours: resolveSubfloorHours(true, STALE_SUBFLOOR_HOURS),
  });

  it('should charge no subfloor labour', () => {
    expect(estimateWithToggleOff.subfloorCost).toBe(0);
  });

  it('should produce an empty subfloor breakdown', () => {
    expect(estimateWithToggleOff.subfloorBreakdown).toEqual([]);
  });

  it('should exclude the stale hours from total labour hours', () => {
    expect(estimateWithToggleOff.totalLabourHours).toBe(SURFACE_HOURS);
  });

  it('should not inflate the equipment day count', () => {
    expect(estimateWithToggleOff.equipment.days).toBe(1);
  });

  it('should charge subfloor labour while the toggle is on', () => {
    expect(estimateWithToggleOn.subfloorCost).toBeGreaterThan(0);
  });

  it('should quote less than the same job with the toggle on', () => {
    expect(estimateWithToggleOff.totalIncGst).toBeLessThan(estimateWithToggleOn.totalIncGst);
  });
});

describe('both Section 9 options with the subfloor toggle off', () => {
  const SURFACE_HOURS = 10;
  const STALE_SUBFLOOR_HOURS = 8;

  // Option 1 is surface-only by construction (a literal 0 at every call site);
  // Option 2 resolves the toggle. With the toggle off the two must agree.
  const option1 = calculateCostEstimate({
    nonDemoHours: SURFACE_HOURS,
    demolitionHours: 0,
    subfloorHours: 0,
    dehumidifierQty: 1,
  });

  const option2 = calculateCostEstimate({
    nonDemoHours: SURFACE_HOURS,
    demolitionHours: 0,
    subfloorHours: resolveSubfloorHours(false, STALE_SUBFLOOR_HOURS),
    dehumidifierQty: 1,
  });

  it('should give Option 2 the same total as Option 1', () => {
    expect(option2.totalIncGst).toBe(option1.totalIncGst);
  });

  it('should give Option 2 the same equipment days as Option 1', () => {
    expect(option2.equipment.days).toBe(option1.equipment.days);
  });

  it('should charge no subfloor labour in Option 2', () => {
    expect(option2.subfloorCost).toBe(0);
  });
});
