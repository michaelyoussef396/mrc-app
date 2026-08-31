import { z } from 'zod'

/**
 * Zod schema for validating inspection form completion.
 * Used by both admin (InspectionForm) and technician (TechnicianInspectionForm)
 * to gate the "Complete Inspection" action.
 */

const inspectionAreaSchema = z.object({
  areaName: z.string().min(1, 'Area name is required'),
  demolitionRequired: z.boolean().optional(),
  demolitionTime: z.number().optional(),
})

// Demolition replaces the surface time for a flagged area, so a flagged area with no
// demolition time would price at $0 while looking complete.
const requireDemolitionTimeWhenFlagged = (
  areas: z.infer<typeof inspectionAreaSchema>[],
  ctx: z.RefinementCtx
) => {
  areas.forEach((area, index) => {
    if (area.demolitionRequired && !((area.demolitionTime ?? 0) > 0)) {
      ctx.addIssue({
        code: 'custom',
        message: `${area.areaName}: enter the Demolition Time — it replaces the surface time when Demolition Required is on`,
        path: [index, 'demolitionTime'],
      })
    }
  })
}

/**
 * Waste disposal cubic-metre pricing shape (Brief 1 foundation).
 * Standalone — not wired into inspectionCompletionSchema (the completion gate).
 * Brief 2 consumes this when the cubic-metre UI replaces the dropdown.
 */
export const wasteDisposalSchema = z.object({
  enabled: z.boolean(),
  cubicMeters: z.number().min(0).max(50).nullable(),
  calculatedCost: z.number().min(0).nullable(),
  confirmedCost: z.number().min(0).nullable(),
  isOverridden: z.boolean(),
})

export const inspectionCompletionSchema = z.object({
  inspectionDate: z.string().min(1, 'Inspection date is required'),

  areas: z
    .array(inspectionAreaSchema)
    .min(1, 'At least one area with a name is required')
    .superRefine(requireDemolitionTimeWhenFlagged),

  // Treatment option and methods
  selectedTreatmentMethods: z.array(z.string()),

  // Hours
  noDemolitionHours: z.number(),
  demolitionHours: z.number(),
  subfloorHours: z.number(),
  manualPriceOverride: z.boolean(),
}).refine(
  (data) => data.selectedTreatmentMethods.length > 0,
  {
    message: 'At least one treatment method must be selected',
    path: ['selectedTreatmentMethods'],
  }
).refine(
  (data) => data.manualPriceOverride ||
            (data.noDemolitionHours + data.demolitionHours + data.subfloorHours) > 0,
  {
    message: 'At least one hour type must be greater than 0',
    path: ['noDemolitionHours'],
  }
)

export interface ValidationError {
  section: number
  label: string
  message: string
}

// Map Zod error paths to user-friendly section info
const FIELD_SECTION_MAP: Record<string, { section: number; label: string }> = {
  inspectionDate: { section: 1, label: 'Basic Information' },
  areas: { section: 3, label: 'Area Inspection' },
  selectedTreatmentMethods: { section: 7, label: 'Work Procedure' },
  noDemolitionHours: { section: 9, label: 'Cost Estimate' },
}

export function validateInspectionCompletion(formData: {
  inspectionDate: string
  areas: { areaName: string; demolitionRequired?: boolean; demolitionTime?: number }[]
  selectedTreatmentMethods: string[]
  noDemolitionHours: number
  demolitionHours: number
  subfloorHours: number
  manualPriceOverride: boolean
}): { valid: boolean; errors: ValidationError[] } {
  // Filter out areas with empty names before validation (matching existing behaviour)
  const input = {
    ...formData,
    areas: formData.areas.filter((a) => a.areaName?.trim()),
  }

  const result = inspectionCompletionSchema.safeParse(input)

  if (result.success) {
    return { valid: true, errors: [] }
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => {
    const fieldKey = String(issue.path[0])
    const mapping = FIELD_SECTION_MAP[fieldKey] || { section: 0, label: 'Unknown' }
    return {
      section: mapping.section,
      label: mapping.label,
      message: issue.message,
    }
  })

  return { valid: false, errors }
}
