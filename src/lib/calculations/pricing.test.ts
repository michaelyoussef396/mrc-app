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
