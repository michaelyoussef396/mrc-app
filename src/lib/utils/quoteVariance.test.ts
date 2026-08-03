import { describe, it, expect } from 'vitest';
import { findQuoteVariances } from './quoteVariance';

/** A job whose actuals match its quote exactly. */
const matching = {
  actual_dehumidifier_qty: 1,
  actual_dehumidifier_days: 4,
  actual_air_mover_qty: 2,
  actual_air_mover_days: 4,
  actual_afd_qty: 0,
  actual_afd_days: 0,
  actual_rcd_qty: 1,
  actual_rcd_days: 4,
  quoted_dehumidifier_qty: 1,
  quoted_air_mover_qty: 2,
  quoted_afd_qty: 0,
  quoted_rcd_qty: 1,
  quoted_equipment_days: 4,
};

describe('findQuoteVariances', () => {
  it('should return an empty array when every line matches the quote', () => {
    expect(findQuoteVariances(matching)).toEqual([]);
  });

  it('should return an empty array when the job completion is null', () => {
    expect(findQuoteVariances(null)).toEqual([]);
  });

  it('should report a line whose quantity exceeds the quote', () => {
    const result = findQuoteVariances({ ...matching, actual_dehumidifier_qty: 6 });
    expect(result).toEqual([
      { label: 'Dehumidifier', quoted: '1 × 4 days', actual: '6 × 4 days' },
    ]);
  });

  it('should report a line whose quantity falls short of the quote', () => {
    const result = findQuoteVariances({ ...matching, actual_rcd_qty: 0 });
    expect(result).toEqual([
      { label: 'RCD', quoted: '1 × 4 days', actual: 'none' },
    ]);
  });

  it('should stay silent on a line hired on neither side', () => {
    // actual_afd_qty and quoted_afd_qty are both 0 in the fixture, while the
    // shared quoted days are 4 — that must not read as a divergence.
    expect(findQuoteVariances(matching)).toEqual([]);
  });

  it('should report a line whose day count differs from the quote', () => {
    const result = findQuoteVariances({ ...matching, actual_air_mover_days: 3 });
    expect(result).toEqual([
      { label: 'Air Mover', quoted: '2 × 4 days', actual: '2 × 3 days' },
    ]);
  });

  it('should report every diverging line', () => {
    const result = findQuoteVariances({
      ...matching,
      actual_dehumidifier_qty: 6,
      actual_dehumidifier_days: 5,
      actual_rcd_qty: 2,
    });
    expect(result.map((v) => v.label)).toEqual(['Dehumidifier', 'RCD']);
  });

  it('should stay silent on a line that was never quoted', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_dehumidifier_qty: null,
      actual_dehumidifier_qty: 6,
    });
    expect(result).toEqual([]);
  });

  it('should treat a zero shared day count as never quoted rather than zero days', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_equipment_days: 0,
      actual_dehumidifier_days: 9,
    });
    expect(result).toEqual([]);
  });

  it('should prefer the HEPA-specific day count over the shared one', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_afd_qty: 2,
      quoted_afd_days: 3,
      actual_afd_qty: 2,
      actual_afd_days: 3,
    });
    expect(result).toEqual([]);
  });

  it('should report waste volume that differs from the quote', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_waste_disposal_m3: 6,
      actual_waste_disposal_m3: 8,
    });
    expect(result).toEqual([
      { label: 'Waste disposal', quoted: '6 m³', actual: '8 m³' },
    ]);
  });

  it('should stay silent on waste that was never quoted', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_waste_disposal_m3: null,
      actual_waste_disposal_m3: 8,
    });
    expect(result).toEqual([]);
  });

  it('should singularise a one-day quote', () => {
    const result = findQuoteVariances({
      ...matching,
      quoted_equipment_days: 1,
      actual_dehumidifier_days: 1,
      actual_air_mover_days: 1,
      actual_rcd_days: 1,
      actual_dehumidifier_qty: 2,
    });
    expect(result[0]).toEqual({
      label: 'Dehumidifier',
      quoted: '1 × 1 day',
      actual: '2 × 1 day',
    });
  });
});
