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
    // Full 10h → 2 days stored; Option 1 is 4h of surface → 1 day, as the form saves it
    const estimate = computeInspectionEstimate({
      areas: [area(240, 360, true)],
      equipment: { ...NO_EQUIPMENT, dehumidifierQty: 1, equipmentDays: 2 },
      optionSelected: 3,
    });

    expect(estimate.option1.equipmentCost).toBe(119);
  });

  it('should keep the full quote on its stored auto days', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(240, 360, true)],
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

  it('should sum non-demolition time across every area regardless of the demolition flag', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(60, 120, true), area(60, 180, false), area(30, 60, true)],
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.hours.nonDemo).toBe(2.5);
  });

  it('should hand off to the per-day rates beyond a single eight-hour day', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(960)],
      equipment: NO_EQUIPMENT,
      optionSelected: 1,
    });

    expect(estimate.full.labourAfterDiscount).toBe(2305.67);
  });

  it('should report total labour hours across all three labour types', () => {
    const estimate = computeInspectionEstimate({
      areas: [area(150, 120, true)],
      subfloorTreatmentMinutes: 240,
      equipment: NO_EQUIPMENT,
      optionSelected: 3,
    });

    expect(estimate.full.totalLabourHours).toBe(8.5);
  });
})
