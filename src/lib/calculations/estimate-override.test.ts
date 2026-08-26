import { describe, it, expect } from 'vitest';

import {
  parseOverrideInput,
  reconcileLoadedOverride,
  resolveOverridableValue,
} from './estimate-override';

describe('resolveOverridableValue — override precedence', () => {
  it('should return the override when one is present', () => {
    expect(resolveOverridableValue(900, 1094.71)).toBe(900);
  });

  it('should fall back to auto-calc when the override is null', () => {
    expect(resolveOverridableValue(null, 1094.71)).toBe(1094.71);
  });

  it('should fall back to auto-calc when the override is undefined', () => {
    expect(resolveOverridableValue(undefined, 825.29)).toBe(825.29);
  });

  it('should revert to auto-calc after an override is cleared', () => {
    const cleared = parseOverrideInput('');
    expect(resolveOverridableValue(cleared, 825.29)).toBe(825.29);
  });
});

describe('parseOverrideInput — empty means auto-calc, not zero', () => {
  it('should return null for an empty field', () => {
    expect(parseOverrideInput('')).toBeNull();
  });

  it('should return null for whitespace', () => {
    expect(parseOverrideInput('   ')).toBeNull();
  });

  it('should return null for zero', () => {
    expect(parseOverrideInput('0')).toBeNull();
  });

  it('should return null for negative input', () => {
    expect(parseOverrideInput('-50')).toBeNull();
  });

  it('should return null for non-numeric input', () => {
    expect(parseOverrideInput('abc')).toBeNull();
  });

  it('should parse a positive decimal value', () => {
    expect(parseOverrideInput('987.65')).toBe(987.65);
  });
});

// Rate-card migration guard (2026-08-25 2h anchor correction): rows saved
// before a rate change recompute to a DIFFERENT auto value, so the persisted
// manual_labour_override flag — not the value difference — must decide whether
// a saved figure is an override. A 4h surface job saved pre-correction stored
// $1,094.71 (old-rate auto); the same inputs recompute to $825.29 today.
describe('reconcileLoadedOverride — rate-card migration guard', () => {
  it('should ignore a differing saved value when the flag is false (old-rate snapshot, auto-calc wins)', () => {
    expect(reconcileLoadedOverride(false, 1094.71, 825.29)).toBeNull();
  });

  it('should detect an override when the flag is true and the saved value differs', () => {
    expect(reconcileLoadedOverride(true, 1094.71, 825.29)).toBe(1094.71);
  });

  it('should detect no override when the flag is true but the saved value matches auto', () => {
    expect(reconcileLoadedOverride(true, 825.29, 825.29)).toBeNull();
  });
});

describe('reconcileLoadedOverride — rehydrating from a saved row', () => {
  it('should return null when the override flag is off', () => {
    expect(reconcileLoadedOverride(false, 900, 1094.71)).toBeNull();
  });

  it('should return null when the saved value is null', () => {
    expect(reconcileLoadedOverride(true, null, 1094.71)).toBeNull();
  });

  it('should return null when the saved value equals the recomputed auto value', () => {
    expect(reconcileLoadedOverride(true, 1094.71, 1094.71)).toBeNull();
  });

  it('should return null when the saved value is within half a cent of auto', () => {
    expect(reconcileLoadedOverride(true, 1094.712, 1094.71)).toBeNull();
  });

  it('should return the saved value when it differs from auto', () => {
    expect(reconcileLoadedOverride(true, 900, 1094.71)).toBe(900);
  });

  it('should return null for a non-positive saved value', () => {
    expect(reconcileLoadedOverride(true, 0, 1094.71)).toBeNull();
  });
});
