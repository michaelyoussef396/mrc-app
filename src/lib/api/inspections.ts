import { supabase } from '@/integrations/supabase/client'

export interface InspectionData {
  lead_id: string
  inspector_id: string
  inspection_date: string
  inspection_start_time?: string
  job_number?: string

  // Property & Client Info
  triage_description?: string
  requested_by?: string
  attention_to?: string
  property_occupation?: string
  dwelling_type?: string

  // Outdoor Conditions
  outdoor_temperature?: number
  outdoor_humidity?: number
  outdoor_dew_point?: number
  outdoor_comments?: string

  // Flags
  subfloor_required?: boolean
  waste_disposal_required?: boolean
  direction_photos_enabled?: boolean

  // Cost Estimates
  total_time_minutes?: number
  estimated_cost_ex_gst?: number
  estimated_cost_inc_gst?: number
  selected_job_type?: string
  equipment_cost_ex_gst?: number
  equipment_cost_inc_gst?: number
  waste_disposal_cost?: number

  // Additional Info
  recommended_dehumidifier?: string
  cause_of_mould?: string
  additional_info_technician?: string
  additional_equipment_comments?: string
  parking_option?: string
}

export interface InspectionAreaData {
  inspection_id: string
  area_order: number
  area_name: string

  // Mould Location Checklist (12 boolean fields)
  mould_ceiling?: boolean
  mould_cornice?: boolean
  mould_windows?: boolean
  mould_window_furnishings?: boolean
  mould_walls?: boolean
  mould_skirting?: boolean
  mould_flooring?: boolean
  mould_wardrobe?: boolean
  mould_cupboard?: boolean
  mould_contents?: boolean
  mould_grout_silicone?: boolean
  mould_none_visible?: boolean

  // Comments
  comments?: string
  comments_approved?: boolean

  // Environmental Readings
  temperature?: number
  humidity?: number
  dew_point?: number

  // Moisture Detection
  moisture_readings_enabled?: boolean
  internal_office_notes?: string

  // Infrared Observations
  infrared_enabled?: boolean
  infrared_observation_no_active?: boolean
  infrared_observation_water_infiltration?: boolean
  infrared_observation_past_ingress?: boolean
  infrared_observation_condensation?: boolean
  infrared_observation_missing_insulation?: boolean

  // Job Time & Demolition
  job_time_minutes?: number
  demolition_required?: boolean
  demolition_time_minutes?: number
  demolition_description?: string
}

/**
 * Generate a unique job number for an inspection
 * Format: MRC-YYYYMMDD-XXXX
 */
function generateJobNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

  return `MRC-${year}${month}${day}-${random}`
}

/**
 * Create a new inspection record
 * @param data Inspection data
 * @returns Promise with created inspection
 */
export async function createInspection(data: InspectionData) {
  const jobNumber = data.job_number || generateJobNumber()

  const { data: inspection, error } = await supabase
    .from('inspections')
    .insert({
      ...data,
      job_number: jobNumber,
      inspection_date: data.inspection_date || new Date().toISOString().split('T')[0],
      inspection_start_time: data.inspection_start_time || new Date().toTimeString().split(' ')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create inspection:', error)
    throw new Error(`Failed to create inspection: ${error.message}`)
  }

  return inspection
}

/**
 * Update an existing inspection record
 * @param inspectionId The inspection ID
 * @param data Partial inspection data to update
 * @returns Promise<void>
 */
export async function updateInspection(
  inspectionId: string,
  data: Partial<InspectionData>
): Promise<void> {
  const { data: result, error } = await supabase
    .from('inspections')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', inspectionId)
    .select()

  console.log('📊 Update inspection result:', {
    inspectionId,
    rowsAffected: result?.length || 0,
    error: error?.message || null,
    fields: Object.keys(data)
  })

  if (error) {
    console.error('Failed to update inspection:', error)
    throw new Error(`Failed to update inspection: ${error.message}`)
  }

  if (!result || result.length === 0) {
    console.error('Update succeeded but affected 0 rows - RLS policy may be blocking')
    throw new Error('Update failed: No rows were affected. This may be due to Row Level Security policies. Please check your permissions.')
  }
}

/**
 * Get an inspection by ID
 * @param inspectionId The inspection ID
 * @returns Promise with inspection data
 */
export async function getInspection(inspectionId: string) {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', inspectionId)
    .single()

  if (error) {
    throw new Error(`Failed to get inspection: ${error.message}`)
  }

  // Sanitize enum values in case of invalid/old data
  if (data) {
    data.dwelling_type = sanitizeEnumValue(data.dwelling_type, 'dwelling_type')
    data.property_occupation = sanitizeEnumValue(data.property_occupation, 'property_occupation')
  }

  return data
}

/**
 * Save or update an inspection area
 * @param areaData Area data to save
 * @returns Promise with area ID
 */
export async function saveInspectionArea(
  areaData: InspectionAreaData
): Promise<string> {
  // Check if area already exists
  const { data: existing, error: fetchError } = await supabase
    .from('inspection_areas')
    .select('id')
    .eq('inspection_id', areaData.inspection_id)
    .eq('area_name', areaData.area_name)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to check existing area:', fetchError)
    throw new Error(`Failed to check existing area: ${fetchError.message}`)
  }

  if (existing) {
    // Update existing area
    const { error: updateError } = await supabase
      .from('inspection_areas')
      .update({
        ...areaData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update area:', updateError)
      throw new Error(`Failed to update area: ${updateError.message}`)
    }

    return existing.id
  } else {
    // Insert new area
    const { data: newArea, error: insertError } = await supabase
      .from('inspection_areas')
      .insert({
        ...areaData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert area:', insertError)
      throw new Error(`Failed to insert area: ${insertError.message}`)
    }

    return newArea.id
  }
}

/**
 * Delete an inspection area
 * @param areaId The area ID
 * @returns Promise<void>
 */
export async function deleteInspectionArea(areaId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_areas')
    .delete()
    .eq('id', areaId)

  if (error) {
    throw new Error(`Failed to delete area: ${error.message}`)
  }
}

/**
 * Load all areas for an inspection
 * @param inspectionId The inspection ID
 * @returns Promise with array of areas
 */
export async function loadInspectionAreas(inspectionId: string) {
  const { data, error } = await supabase
    .from('inspection_areas')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('area_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to load inspection areas: ${error.message}`)
  }

  return data || []
}

/**
 * Save complete inspection with all areas
 * @param inspectionData Inspection metadata
 * @param areas Array of area data
 * @returns Promise with inspection ID
 */
export async function saveCompleteInspection(
  inspectionData: Partial<InspectionData>,
  inspectionId?: string
): Promise<string> {
  if (inspectionId) {
    // Update existing inspection
    await updateInspection(inspectionId, inspectionData)
    return inspectionId
  } else {
    // Create new inspection
    const inspection = await createInspection(inspectionData as InspectionData)
    return inspection.id
  }
}

/**
 * Get inspection by lead ID (for checking if inspection exists)
 * @param leadId The lead ID
 * @returns Promise with inspection or null
 */
export async function getInspectionByLeadId(leadId: string) {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (error) {
    console.error('Failed to get inspection by lead:', error)
    throw new Error(`Failed to get inspection by lead: ${error.message}`)
  }

  // Sanitize enum values in case of invalid/old data
  if (data) {
    data.dwelling_type = sanitizeEnumValue(data.dwelling_type, 'dwelling_type')
    data.property_occupation = sanitizeEnumValue(data.property_occupation, 'property_occupation')
  }

  return data
}

/**
 * Sanitize enum values to match database enum types
 * Handles invalid/old data by converting to valid enum values or undefined
 */
function sanitizeEnumValue(value: string | null | undefined, enumType: 'dwelling_type' | 'property_occupation'): string | undefined {
  if (!value) return undefined

  const validDwellingTypes = ['house', 'units', 'apartment', 'duplex', 'townhouse', 'commercial', 'construction', 'industrial']
  const validPropertyOccupation = ['tenanted', 'vacant', 'owner_occupied', 'tenants_vacating']

  // Convert to lowercase and replace spaces with underscores
  const normalized = value.toLowerCase().replace(/\s+/g, '_')

  if (enumType === 'dwelling_type') {
    // Handle old invalid values like "residential" by returning undefined
    return validDwellingTypes.includes(normalized) ? normalized : undefined
  } else if (enumType === 'property_occupation') {
    return validPropertyOccupation.includes(normalized) ? normalized : undefined
  }

  return undefined
}

/**
 * Load complete inspection with all areas and photos
 * @param inspectionId The inspection ID
 * @returns Promise with complete inspection data
 */
export async function loadCompleteInspection(inspectionId: string) {
  // Load inspection metadata
  const inspection = await getInspection(inspectionId)

  // Sanitize enum values in case of invalid/old data
  if (inspection) {
    inspection.dwelling_type = sanitizeEnumValue(inspection.dwelling_type, 'dwelling_type')
    inspection.property_occupation = sanitizeEnumValue(inspection.property_occupation, 'property_occupation')
  }

  // Load all areas
  const areas = await loadInspectionAreas(inspectionId)

  // Load all photos
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('order_index', { ascending: true })

  if (photosError) {
    console.error('Failed to load photos:', photosError)
    // Continue without photos rather than failing
  }

  return {
    inspection,
    areas: areas || [],
    photos: photos || []
  }
}
