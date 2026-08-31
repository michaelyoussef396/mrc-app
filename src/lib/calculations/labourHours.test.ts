import { describe, it, expect } from 'vitest';

import {
  areaFormToLabourInput,
  areaRowToLabourInput,
  deriveComprehensiveHours,
  deriveQuoteHours,
  deriveSurfaceHours,
  isPricedAsDemolition,
} from './labourHours';

const area = (surfaceHours: number, demolitionHours = 0, demolitionRequired = false) => ({
  surfaceHours,
  demolitionHours,
  demolitionRequired,
});

describe('deriveComprehensiveHours — demolition replaces surface treatment per area', () => {
  it('should count only the demolition time for an area flagged for demolition', () => {
    expect(deriveComprehensiveHours([area(2, 2, true)]).total).toBe(2);
  });

  it('should put a demolished area under demolition, not surface', () => {
    expect(deriveComprehensiveHours([area(2, 2, true)]).nonDemo).toBe(0);
  });

  it('should count the surface time for an area not flagged for demolition', () => {
    expect(deriveComprehensiveHours([area(2, 3, false)]).nonDemo).toBe(2);
  });

  it('should ignore demolition time on an area not flagged for demolition', () => {
    expect(deriveComprehensiveHours([area(2, 3, false)]).demolition).toBe(0);
  });

  it('should never count an area twice across surface and demolition', () => {
    const hours = deriveComprehensiveHours([area(2, 2, true), area(1)]);
    expect(hours.nonDemo + hours.demolition).toBe(3);
  });

  it('should keep pricing a flagged area as surface until a demolition time is entered', () => {
    expect(deriveComprehensiveHours([area(2, 0, true)]).nonDemo).toBe(2);
  });

  it('should charge no demolition for a flagged area until a demolition time is entered', () => {
    expect(deriveComprehensiveHours([area(2, 0, true)]).demolition).toBe(0);
  });

  it('should add subfloor hours to the total', () => {
    expect(deriveComprehensiveHours([area(2)], 4).total).toBe(6);
  });

  it('should return zero hours for no areas', () => {
    expect(deriveComprehensiveHours([]).total).toBe(0);
  });
});

describe('isPricedAsDemolition — a flag alone does not price an area as demolition', () => {
  it('should price a flagged area with demolition time as demolition', () => {
    expect(isPricedAsDemolition(area(2, 3, true))).toBe(true);
  });

  it('should not price a flagged area without demolition time as demolition', () => {
    expect(isPricedAsDemolition(area(2, 0, true))).toBe(false);
  });

  it('should never price an unflagged area as demolition', () => {
    expect(isPricedAsDemolition(area(2, 3, false))).toBe(false);
  });
});

describe('deriveQuoteHours — the quote follows the selected option', () => {
  const FLAGGED_PLUS_PLAIN = [area(2, 2, true), area(1)];

  it('should price a single Option 1 quote as surface treatment for every area', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 0, 1).nonDemo).toBe(3);
  });

  it('should leave demolition out of a single Option 1 quote', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 0, 1).demolition).toBe(0);
  });

  it('should keep subfloor in a single Option 1 quote', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 4, 1).total).toBe(7);
  });

  it('should price a single Option 2 quote on the comprehensive scope', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 0, 2)).toEqual(deriveComprehensiveHours(FLAGGED_PLUS_PLAIN));
  });

  it('should price the Both-mode quote on the comprehensive scope', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 0, 3)).toEqual(deriveComprehensiveHours(FLAGGED_PLUS_PLAIN));
  });

  it('should price the comprehensive scope when no option has been chosen yet', () => {
    expect(deriveQuoteHours(FLAGGED_PLUS_PLAIN, 0, null)).toEqual(deriveComprehensiveHours(FLAGGED_PLUS_PLAIN));
  });
});

describe('deriveSurfaceHours — Option 1 quotes every area as surface treatment', () => {
  it('should include the surface time of a demolished area', () => {
    expect(deriveSurfaceHours([area(2, 2, true)])).toBe(2);
  });

  it('should sum surface time across every area', () => {
    expect(deriveSurfaceHours([area(2, 2, true), area(1.5)])).toBe(3.5);
  });

  it('should never include demolition time', () => {
    expect(deriveSurfaceHours([area(0, 5, true)])).toBe(0);
  });
});

describe('areaRowToLabourInput — inspection_areas rows in minutes', () => {
  it('should convert job minutes to surface hours', () => {
    expect(areaRowToLabourInput({ job_time_minutes: 150 }).surfaceHours).toBe(2.5);
  });

  it('should convert demolition minutes to hours', () => {
    expect(areaRowToLabourInput({ demolition_time_minutes: 90 }).demolitionHours).toBe(1.5);
  });

  it('should treat null minutes as zero', () => {
    expect(areaRowToLabourInput({ job_time_minutes: null }).surfaceHours).toBe(0);
  });

  it('should treat a null demolition flag as not required', () => {
    expect(areaRowToLabourInput({ demolition_required: null }).demolitionRequired).toBe(false);
  });
});

describe('areaFormToLabourInput — technician form areas in hours', () => {
  it('should carry the form hours through unchanged', () => {
    expect(areaFormToLabourInput({ timeWithoutDemo: 2, demolitionTime: 3, demolitionRequired: true })).toEqual(
      { surfaceHours: 2, demolitionHours: 3, demolitionRequired: true }
    );
  });

  it('should treat missing hours as zero', () => {
    expect(areaFormToLabourInput({ demolitionRequired: false }).surfaceHours).toBe(0);
  });
});
