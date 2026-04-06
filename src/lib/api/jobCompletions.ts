import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError, addBusinessBreadcrumb } from '@/lib/sentry'
import type { JobCompletionFormData, JobCompletionRow } from '@/types/jobCompletion'

/**
 * Generate a unique job number.
 * Format: JOB-YYYY-XXXX (different from inspection MRC-YYYY-XXXX)
 */
function generateJobNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `JOB-${year}-${random}`
}

/**
 * Map camelCase form data to snake_case database columns.
 * Only includes fields that have changed (partial update safe).
 */
function formDataToRow(data: Partial<JobCompletionFormData>): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  // Section 1
  if (data.attentionTo !== undefined) row.attention_to = data.attentionTo

  // Section 2
  if (data.swmsCompleted !== undefined) row.swms_completed = data.swmsCompleted
  if (data.premisesType !== undefined) row.premises_type = data.premisesType || null
  if (data.remediationCompletedBy !== undefined) row.remediation_completed_by = data.remediationCompletedBy || null
  if (data.completionDate !== undefined) row.completion_date = data.completionDate
  if (data.areasTreated !== undefined) row.areas_treated = data.areasTreated

  // Section 3/4
  if (data.demolitionWorks !== undefined) row.demolition_works = data.demolitionWorks

  // Section 5: Treatment Methods
  if (data.methodHepaVacuuming !== undefined) row.method_hepa_vacuuming = data.methodHepaVacuuming
  if (data.methodSurfaceMouldRemediation !== undefined) row.method_surface_mould_remediation = data.methodSurfaceMouldRemediation
  if (data.methodUlvFoggingProperty !== undefined) row.method_ulv_fogging_property = data.methodUlvFoggingProperty
  if (data.methodUlvFoggingSubfloor !== undefined) row.method_ulv_fogging_subfloor = data.methodUlvFoggingSubfloor
  if (data.methodSubfloorRemediation !== undefined) row.method_subfloor_remediation = data.methodSubfloorRemediation
  if (data.methodAfdInstallation !== undefined) row.method_afd_installation = data.methodAfdInstallation
  if (data.methodDryingEquipment !== undefined) row.method_drying_equipment = data.methodDryingEquipment
  if (data.methodContainmentPrv !== undefined) row.method_containment_prv = data.methodContainmentPrv
  if (data.methodMaterialDemolition !== undefined) row.method_material_demolition = data.methodMaterialDemolition
  if (data.methodCavityTreatment !== undefined) row.method_cavity_treatment = data.methodCavityTreatment
  if (data.methodDebrisRemoval !== undefined) row.method_debris_removal = data.methodDebrisRemoval

  // Section 6: Chemical Toggles
  if (data.chemicalAirFiltration !== undefined) row.chemical_air_filtration = data.chemicalAirFiltration
  if (data.chemicalWaterBased !== undefined) row.chemical_water_based = data.chemicalWaterBased
  if (data.chemicalSodiumHypochlorite !== undefined) row.chemical_sodium_hypochlorite = data.chemicalSodiumHypochlorite
  if (data.chemicalHepaVacuumed !== undefined) row.chemical_hepa_vacuumed = data.chemicalHepaVacuumed
  if (data.chemicalSanitisedPremises !== undefined) row.chemical_sanitised_premises = data.chemicalSanitisedPremises

  // Section 7: Equipment
  if (data.actualDehumidifierQty !== undefined) row.actual_dehumidifier_qty = data.actualDehumidifierQty
  if (data.actualDehumidifierDays !== undefined) row.actual_dehumidifier_days = data.actualDehumidifierDays
  if (data.actualAirMoverQty !== undefined) row.actual_air_mover_qty = data.actualAirMoverQty
  if (data.actualAirMoverDays !== undefined) row.actual_air_mover_days = data.actualAirMoverDays
  if (data.actualAfdQty !== undefined) row.actual_afd_qty = data.actualAfdQty
  if (data.actualAfdDays !== undefined) row.actual_afd_days = data.actualAfdDays
  if (data.actualRcdQty !== undefined) row.actual_rcd_qty = data.actualRcdQty
  if (data.actualRcdDays !== undefined) row.actual_rcd_days = data.actualRcdDays

  // Section 8: Variations
  if (data.scopeChanged !== undefined) row.scope_changed = data.scopeChanged
  if (data.scopeWhatChanged !== undefined) row.scope_what_changed = data.scopeWhatChanged || null
  if (data.scopeWhyChanged !== undefined) row.scope_why_changed = data.scopeWhyChanged || null
  if (data.scopeExtraWork !== undefined) row.scope_extra_work = data.scopeExtraWork || null
  if (data.scopeReduced !== undefined) row.scope_reduced = data.scopeReduced || null

  // Section 9: Job Notes
  if (data.requestReview !== undefined) row.request_review = data.requestReview
  if (data.damagesPresent !== undefined) row.damages_present = data.damagesPresent
  if (data.damagesDetails !== undefined) row.damages_details = data.damagesDetails || null
  if (data.stainingPresent !== undefined) row.staining_present = data.stainingPresent
  if (data.stainingDetails !== undefined) row.staining_details = data.stainingDetails || null
  if (data.additionalNotes !== undefined) row.additional_notes = data.additionalNotes || null

  // Section 10: Office Notes
  if (data.officeNotes !== undefined) row.office_notes = data.officeNotes || null
  if (data.followupRequired !== undefined) row.followup_required = data.followupRequired

  return row
}

/**
 * Create a new job completion draft for a lead.
 * Snapshots quoted equipment from the inspection at creation time.
 */
export async function createJobCompletion(
  leadId: string,
  inspectionId: string | null,
  completedBy: string
): Promise<JobCompletionRow> {
  addBusinessBreadcrumb('Creating job completion', { leadId, inspectionId })

  // Snapshot lead info for Section 1
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('full_name, property_address_street, property_address_suburb, property_address_postcode')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    captureBusinessError('Failed to fetch lead for job completion', { leadId, error: leadError?.message })
    throw new Error(`Failed to fetch lead: ${leadError?.message}`)
  }

  const addressSnapshot = [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_postcode ? `VIC ${lead.property_address_postcode}` : '',
  ].filter(Boolean).join(', ')

  // Snapshot quoted equipment from inspection
  let quotedDehumidifierQty = 0
  let quotedAirMoverQty = 0
  let quotedRcdQty = 0
  let quotedEquipmentDays = 0
  let attentionTo = ''
  let areasTreated: string[] = []

  if (inspectionId) {
    const { data: inspection } = await supabase
      .from('inspections')
      .select('commercial_dehumidifier_qty, air_movers_qty, rcd_box_qty, equipment_days, attention_to, treatment_methods')
      .eq('id', inspectionId)
      .single()

    if (inspection) {
      quotedDehumidifierQty = inspection.commercial_dehumidifier_qty ?? 0
      quotedAirMoverQty = inspection.air_movers_qty ?? 0
      quotedRcdQty = inspection.rcd_box_qty ?? 0
      quotedEquipmentDays = inspection.equipment_days ?? 0
      attentionTo = inspection.attention_to ?? ''
    }

    // Pre-populate areas treated from inspection areas
    const { data: areas } = await supabase
      .from('inspection_areas')
      .select('area_name')
      .eq('inspection_id', inspectionId)
      .order('area_order')

    if (areas) {
      areasTreated = areas.map(a => a.area_name)
    }
  }

  const { data, error } = await supabase
    .from('job_completions')
    .insert({
      lead_id: leadId,
      inspection_id: inspectionId,
      job_number: generateJobNumber(),
      address_snapshot: addressSnapshot,
      requested_by: lead.full_name,
      attention_to: attentionTo,
      completed_by: completedBy,
      completion_date: new Date().toISOString().split('T')[0],
      areas_treated: areasTreated,
      quoted_dehumidifier_qty: quotedDehumidifierQty,
      quoted_air_mover_qty: quotedAirMoverQty,
      quoted_rcd_qty: quotedRcdQty,
      quoted_equipment_days: quotedEquipmentDays,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    captureBusinessError('Failed to create job completion', { leadId, error: error.message, code: error.code })
    throw new Error(`Failed to create job completion: ${error.message}`)
  }

  return data as JobCompletionRow
}

/**
 * Update a job completion with partial form data.
 * Used by auto-save (30-second interval).
 */
export async function updateJobCompletion(
  id: string,
  data: Partial<JobCompletionFormData>
): Promise<void> {
  const row = formDataToRow(data)

  if (Object.keys(row).length === 0) return

  const { data: result, error } = await supabase
    .from('job_completions')
    .update(row)
    .eq('id', id)
    .select('id')

  if (error) {
    captureBusinessError('Failed to update job completion', { id, error: error.message, code: error.code })
    throw new Error(`Failed to update job completion: ${error.message}`)
  }

  if (!result || result.length === 0) {
    captureBusinessError('Job completion update affected 0 rows', { id })
    throw new Error('Update failed: No rows affected. Check permissions.')
  }
}

/**
 * Submit a job completion — marks it as submitted and updates lead status.
 * If request_review is true, lead goes to 'pending_review' instead of 'job_completed'.
 */
export async function submitJobCompletion(id: string): Promise<void> {
  addBusinessBreadcrumb('Submitting job completion', { id })

  // Fetch current state to check request_review flag
  const { data: jc, error: fetchError } = await supabase
    .from('job_completions')
    .select('lead_id, request_review')
    .eq('id', id)
    .single()

  if (fetchError || !jc) {
    captureBusinessError('Failed to fetch job completion for submit', { id, error: fetchError?.message })
    throw new Error(`Failed to fetch job completion: ${fetchError?.message}`)
  }

  // Update job completion status
  const { error: updateError } = await supabase
    .from('job_completions')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    captureBusinessError('Failed to submit job completion', { id, error: updateError.message })
    throw new Error(`Failed to submit: ${updateError.message}`)
  }

  // Update lead status based on request_review flag
  const nextLeadStatus = jc.request_review ? 'pending_review' : 'job_completed'

  const { error: leadError } = await supabase
    .from('leads')
    .update({ status: nextLeadStatus })
    .eq('id', jc.lead_id)

  if (leadError) {
    captureBusinessError('Failed to update lead status after job submit', { leadId: jc.lead_id, error: leadError.message })
    throw new Error(`Failed to update lead status: ${leadError.message}`)
  }
}

/**
 * Get a job completion by lead ID.
 * Returns null if no job completion exists for this lead.
 */
export async function getJobCompletionByLeadId(leadId: string): Promise<JobCompletionRow | null> {
  const { data, error } = await supabase
    .from('job_completions')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    captureBusinessError('Failed to fetch job completion by lead', { leadId, error: error.message })
    throw new Error(`Failed to fetch job completion: ${error.message}`)
  }

  return data as JobCompletionRow | null
}

/**
 * Get a job completion by its own ID.
 */
export async function getJobCompletionById(id: string): Promise<JobCompletionRow> {
  const { data, error } = await supabase
    .from('job_completions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    captureBusinessError('Failed to fetch job completion', { id, error: error.message })
    throw new Error(`Failed to fetch job completion: ${error.message}`)
  }

  return data as JobCompletionRow
}
