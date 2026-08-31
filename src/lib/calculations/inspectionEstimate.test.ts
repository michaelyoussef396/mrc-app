import { describe, it, expect } from 'vitest';

import {
  computeInspectionEstimate,
  deriveInspectionHours,
  type EstimateEquipmentInput,
} from './inspectionEstimate';

const NO_EQUIPMENT: EstimateEquipmentInput = {
  dehumidifierQty: 0,
  airMoverQty: 0,
  rcdQty: 0,
  hepaAirScrubberQty: 0,
};

const area = (jobMinutes: number, demoMinutes = 0, demoRequired = false) => ({
  job_time_minutes: jobMinutes,
  demolition_time_minutes: demoMinutes,
  demolition_required: demoRequired,
});

describe('deriveInspectionHours — non-demolition hours', () => {
  it('should convert job minutes to hours', () => {
    expect(deriveInspectionHours([area(150)]).nonDemo).toBe(2.5);
  });

  it('should sum job minutes across areas', () => {
    expect(deriveInspectionHours([area(60), area(90)]).nonDemo).toBe(2.5);
  });

  it('should return zero when there are no areas', () => {
    expect(deriveInspectionHours([]).nonDemo).toBe(0);
  });

  it('should treat null job minutes as zero', () => {
    expect(deriveInspectionHours([{ job_time_minutes: null }]).nonDemo).toBe(0);
  });
});

describe('deriveInspectionHours — demolition hours', () => {
  it('should count demolition minutes when the area requires demolition', () => {
    expect(deriveInspectionHours([area(60, 120, true)]).demolition).toBe(2);
  });

  it('should ignore demolition minutes when the area does not require demolition', () => {
    expect(deriveInspectionHours([area(60, 120, false)]).demolition).toBe(0);
  });
});

describe('deriveInspectionHours — subfloor hours', () => {
  it('should convert subfloor treatment minutes to hours', () => {
    expect(deriveInspectionHours([], 240).subfloor).toBe(4);
  });

  it('should return zero when subfloor treatment time is absent', () => {
    expect(deriveInspectionHours([]).subfloor).toBe(0);
  });
});

describe('computeInspectionEstimate — current pricing anchors', () => {
  it('should price 2.5h of surface treatment at the corrected 2h anchor', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.labourAfterDiscount).toBe(667.78);
  });

  it('should charge the flat 2-hour minimum below two hours', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(60)],
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.labourAfterDiscount).toBe(615.27);
  });

  it('should charge the full day rate at exactly eight hours', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(480)],
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.labourAfterDiscount).toBe(1245.33);
  });
});

describe('computeInspectionEstimate — Option 1 basis', () => {
  it('should exclude demolition hours from the Option 1 sub-quote', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150, 120, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.option1.labourAfterDiscount).toBe(667.78);
  });

  it('should include demolition hours in the full estimate', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150, 120, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.full.demolitionCost).toBeGreaterThan(0);
  });

  it('should keep every area\'s surface time as the Option 1 basis, demolished areas included', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(60, 120, true), area(60, 180, false), area(30, 60, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.hours.surface).toBe(2.5);
  });

  it('should exclude subfloor hours from the Option 1 sub-quote', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      subfloorTreatmentMinutes: 240,
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.option1.subfloorCost).toBe(0);
  });

  it('should never bill waste disposal on the Option 1 sub-quote', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: NO_EQUIPMENT,
      wasteDisposalCost: 550,
      optionSelected: 1,
    });

    expect(estimate.option1.wasteDisposalCost).toBe(0);
  });
});

describe('computeInspectionEstimate — waste disposal in Both mode', () => {
  it('should exclude waste from the full estimate when both options are quoted', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: NO_EQUIPMENT,
      wasteDisposalCost: 550,
      optionSelected: 3,
    });

    expect(estimate.full.wasteDisposalCost).toBe(0);
  });

  it('should include waste in the full estimate for a single-option quote', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: NO_EQUIPMENT,
      wasteDisposalCost: 550,
      optionSelected: 1,
    });

    expect(estimate.full.wasteDisposalCost).toBe(550);
  });
});

describe('computeInspectionEstimate — equipment', () => {
  it('should bill a dehumidifier for one day on a sub-8h job', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1 },
      optionSelected: 1,
    });

    expect(estimate.full.equipmentCost).toBe(119);
  });

  it('should bill the HEPA scrubber over its own hire period when one is given', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: { ...NO_EQUIPMENT, hepaAirScrubberQty: 2, hepaAirScrubberDays: 3 },
      optionSelected: 1,
    });

    expect(estimate.full.equipment.hepaAirScrubber.cost).toBe(600);
  });

  it('should bill drying equipment over the explicit shared days', () => {
    // (2×119 + 4×46) × 4 = 1,688 on a job that derives a single labour day
    const estimate = computeInspectionEstimate({
      areas: [area(150)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 2, airMoverQty: 4, equipmentDays: 4 },
      optionSelected: 1,
    });

    expect(estimate.full.equipmentCost).toBe(1688);
  });

  it('should apply the explicit shared days to the Option 1 sub-quote too', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150, 120, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 3 },
      optionSelected: 3,
    });

    expect(estimate.option1.equipmentCost).toBe(357);
  });

  it('should treat a legacy equipment_days of 1 on a multi-day job as auto', () => {
    // 16h derives 2 days; the column default 1 must not shorten the hire: 2 × 119 × 2
    const estimate = computeInspectionEstimate({
      areas: [area(960)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 2, equipmentDays: 1 },
      optionSelected: 1,
    });

    expect(estimate.full.equipmentCost).toBe(476);
  });

  it('should let the Option 1 sub-quote derive its own days when the stored days are the full quote\'s auto days', () => {
    // Full 4h surface + 6h demolition → 2 days stored; Option 1 is 4h of surface → 1 day
    const estimate = computeInspectionEstimate({
      areas: [area(240), area(0, 360, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 2 },
      optionSelected: 3,
    });

    expect(estimate.option1.equipmentCost).toBe(119);
  });

  it('should keep the full quote on its stored auto days', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(240), area(0, 360, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 2 },
      optionSelected: 3,
    });

    expect(estimate.full.equipmentCost).toBe(238);
  });
});

describe('computeInspectionEstimate — multi-area and multi-day', () => {
  it('should count demolition only for the areas flagged for it', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(60, 120, true), area(60, 180, false), area(30, 60, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.hours.demolition).toBe(3);
  });

  it('should count surface time only for the areas not flagged for demolition', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(60, 120, true), area(60, 180, false), area(30, 60, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.hours.nonDemo).toBe(1);
  });

  it('should hand off to the per-day rates beyond a single eight-hour day', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(960)],
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.labourAfterDiscount).toBe(2305.67);
  });

  it('should report total labour hours as demolition plus subfloor when the only area is demolished', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150, 120, true)],
      subfloorTreatmentMinutes: 240,
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.full.totalLabourHours).toBe(6);
  });
});

// Owner decision 2026-08-31: an area getting demolition does NOT also get surface
// treatment time — Comprehensive is the sum across areas with no area counted twice.
describe('computeInspectionEstimate — each option carries only its own scope', () => {
  // The reported screenshot: one area, 2h surface + 2h demolition, Both mode.
  const SCREENSHOT_JOB = {
    areas: [area(120, 120, true)],
    equipment: NO_EQUIPMENT,
    optionSelected: 3,
  };

  it('should price Option 2 at the demolition rate only for a demolished area', () => {
    expect(computeInspectionEstimate(SCREENSHOT_JOB).full.labourAfterDiscount).toBe(715.73);
  });

  it('should carry no surface labour on Option 2 for a demolished area', () => {
    expect(computeInspectionEstimate(SCREENSHOT_JOB).full.nonDemoCost).toBe(0);
  });

  it('should still price Option 1 at the surface rate for the same area', () => {
    expect(computeInspectionEstimate(SCREENSHOT_JOB).option1.labourAfterDiscount).toBe(615.27);
  });

  it('should not stack Option 1 onto Option 2', () => {
    const estimate = computeInspectionEstimate(SCREENSHOT_JOB);
    expect(estimate.full.labourAfterDiscount).toBeLessThan(
      estimate.option1.labourAfterDiscount + estimate.full.demolitionCost
    );
  });

  it('should keep surface time for the areas that are not demolished on Option 2', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(120, 120, true), area(60)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.full.totalLabourHours).toBe(3);
  });

  it('should apply the same rule to a single Option 2 quote', () => {
    const estimate = computeInspectionEstimate({ ...SCREENSHOT_JOB, optionSelected: 2 });
    expect(estimate.full.labourAfterDiscount).toBe(715.73);
  });

  it('should price a single Option 1 quote at the surface rate for a flagged area', () => {
    const estimate = computeInspectionEstimate({ ...SCREENSHOT_JOB, optionSelected: 1 });
    expect(estimate.full.labourAfterDiscount).toBe(615.27);
  });

  it('should carry no demolition labour on a single Option 1 quote', () => {
    const estimate = computeInspectionEstimate({ ...SCREENSHOT_JOB, optionSelected: 1 });
    expect(estimate.full.demolitionCost).toBe(0);
  });

  it('should keep subfloor on a single Option 1 quote', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(120)],
      subfloorTreatmentMinutes: 120,
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.subfloorCost).toBe(905.84);
  });
});

describe('computeInspectionEstimate — equipment days classified against the saved hours', () => {
  it('should read an old-rule auto equipment_days as auto when today\'s hours derive fewer days', () => {
    // Saved under the old rule: 4h + 6h on one area = 10h → 2 auto days. Today: 6h → 1 day.
    const estimate = computeInspectionEstimate({
      areas: [area(240, 360, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 2 },
      storedLabourHours: 10,
      optionSelected: 2,
    });

    expect(estimate.full.equipmentCost).toBe(119);
  });

  it('should still recover an explicit hire period that exceeds the saved hours', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(240, 360, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 4 },
      storedLabourHours: 10,
      optionSelected: 2,
    });

    expect(estimate.full.equipmentCost).toBe(476);
  });
});
