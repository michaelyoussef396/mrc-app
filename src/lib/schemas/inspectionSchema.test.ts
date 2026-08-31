import { describe, it, expect } from 'vitest'

import { validateInspectionCompletion } from './inspectionSchema'

const COMPLETE_FORM = {
  inspectionDate: '2026-08-31',
  areas: [{ areaName: 'Bedroom 1', demolitionRequired: false, demolitionTime: 0 }],
  selectedTreatmentMethods: ['Surface Remediation Treatment'],
  noDemolitionHours: 2,
  demolitionHours: 0,
  subfloorHours: 0,
  manualPriceOverride: false,
}

describe('validateInspectionCompletion — demolition time is required when flagged', () => {
  it('should fail when an area is flagged for demolition with no demolition time', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 0 }],
    })
    expect(valid).toBe(false)
  })

  it('should name the area in the error', () => {
    const { errors } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 0 }],
    })
    expect(errors[0].message).toContain('Bedroom 1')
  })

  it('should point the error at the Area Inspection section', () => {
    const { errors } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 0 }],
    })
    expect(errors[0].section).toBe(3)
  })

  it('should pass when the flagged area has demolition time', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 2 }],
    })
    expect(valid).toBe(true)
  })

  it('should ignore demolition time on an area that is not flagged', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: false, demolitionTime: 0 }],
    })
    expect(valid).toBe(true)
  })

  it('should still accept areas that carry no demolition fields at all', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      areas: [{ areaName: 'Bedroom 1' }],
    })
    expect(valid).toBe(true)
  })

  it('should not require demolition time on a single Option 1 quote', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      optionSelected: 1,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 0 }],
    })
    expect(valid).toBe(true)
  })

  it('should require demolition time on a Both-options quote', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      optionSelected: 3,
      areas: [{ areaName: 'Bedroom 1', demolitionRequired: true, demolitionTime: 0 }],
    })
    expect(valid).toBe(false)
  })
})

describe('validateInspectionCompletion — labour hours', () => {
  it('should fail when every hour type is zero and no manual override is set', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      noDemolitionHours: 0,
    })
    expect(valid).toBe(false)
  })

  it('should pass zero hours when a manual override is set', () => {
    const { valid } = validateInspectionCompletion({
      ...COMPLETE_FORM,
      noDemolitionHours: 0,
      manualPriceOverride: true,
    })
    expect(valid).toBe(true)
  })
})
