import { describe, it, expect } from 'vitest';

import {
  parseOverrideInput,
  reconcileLoadedEquipmentDays,
  reconcileLoadedOverride,
  resolveOverridableValue,
  resolveStoredEquipmentDays,
  storedLabourHours,
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

// equipment_days persists the EFFECTIVE hire period (explicit or labour-derived)
// and legacy rows carry the column default 1, so only a value that EXCEEDS the
// labour-derived days is an explicit one.
describe('reconcileLoadedEquipmentDays — rehydrating the shared hire period', () => {
  it('should return auto when the saved days equal the labour-derived days', () => {
    expect(reconcileLoadedEquipmentDays(2, 2)).toBe(0);
  });

  it('should return the saved days when they exceed the labour-derived days', () => {
    expect(reconcileLoadedEquipmentDays(4, 1)).toBe(4);
  });

  it('should treat the legacy column default of 1 on a multi-day job as auto', () => {
    expect(reconcileLoadedEquipmentDays(1, 2)).toBe(0);
  });

  it('should treat any saved value below the labour-derived days as auto', () => {
    expect(reconcileLoadedEquipmentDays(2, 3)).toBe(0);
  });

  it('should return auto for a legacy row with no equipment_days', () => {
    expect(reconcileLoadedEquipmentDays(null, 1)).toBe(0);
  });

  it('should return auto for a non-positive saved value', () => {
    expect(reconcileLoadedEquipmentDays(0, 1)).toBe(0);
  });
});

describe('storedLabourHours — the hour columns a row was saved with', () => {
  it('should sum the three stored hour columns', () => {
    expect(storedLabourHours({ no_demolition_hours: 4, demolition_hours: 6, subfloor_hours: 0 })).toBe(10);
  });

  it('should accept the numeric strings PostgREST returns', () => {
    expect(storedLabourHours({ no_demolition_hours: '2.5', demolition_hours: '1', subfloor_hours: null })).toBe(3.5);
  });

  it('should return null when the row never stored hours', () => {
    expect(storedLabourHours({})).toBeNull();
  });
});

// A row saved under the old stacking rule stored 10h (4h surface + 6h demolition on the
// same area) and equipment_days = 2 (auto). The either/or rule derives 6h → 1 day today;
// the stored 2 must still read as auto, not as an explicit 2-day hire.
describe('resolveStoredEquipmentDays — classify against the saved hours, not today\'s', () => {
  const OLD_RULE_ROW = { no_demolition_hours: 4, demolition_hours: 6, subfloor_hours: 0, equipment_days: 2 };

  it('should read an old auto value as auto even though today\'s hours derive fewer days', () => {
    expect(resolveStoredEquipmentDays(OLD_RULE_ROW, 6)).toBe(0);
  });

  it('should still recover an explicit hire period that exceeds the saved hours', () => {
    expect(resolveStoredEquipmentDays({ ...OLD_RULE_ROW, equipment_days: 4 }, 6)).toBe(4);
  });

  it('should fall back to the derived hours for a row that never stored hours', () => {
    expect(resolveStoredEquipmentDays({ equipment_days: 3 }, 4)).toBe(3);
  });

  it('should read a legacy column default of 1 as auto', () => {
    expect(resolveStoredEquipmentDays({ ...OLD_RULE_ROW, equipment_days: 1 }, 6)).toBe(0);
  });
});
