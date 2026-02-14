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

  // Job Type Hours (editable)
  no_demolition_hours?: number
  demolition_hours?: number
  construction_hours?: number
  subfloor_hours?: number

  // Equipment Quantities (editable)
  dehumidifier_count?: number
  air_mover_count?: number
  rcd_count?: number
  equipment_days?: number

  // Manual Override
  manual_price_override?: boolean
  manual_total_inc_gst?: number

  // Calculated Pricing Values
  labor_cost_ex_gst?: number
  discount_percent?: number
  subtotal_ex_gst?: number
  gst_amount?: number
  total_inc_gst?: number

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

  // Mould Description (text field - replaces checkbox booleans)
  mould_description?: string

  // Legacy Mould Location Checklist (12 boolean fields - for backwards compatibility)
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
  // Check if area already exists by area_order (unique within inspection)
  // Using area_order instead of area_name to prevent ghost areas when renaming
  const { data: existing, error: fetchError } = await supabase
    .from('inspection_areas')
    .select('id')
    .eq('inspection_id', areaData.inspection_id)
    .eq('area_order', areaData.area_order)
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

// ============================================================================
// COMPLETE INSPECTION DATA (for admin lead view display)
// ============================================================================

export interface PhotoWithUrl {
  id: string
  area_id: string | null
  subfloor_id: string | null
  moisture_reading_id: string | null
  photo_type: string
  storage_path: string
  file_name: string
  caption: string | null
  order_index: number
  signed_url: string
  created_at: string
}

export interface MoistureReadingData {
  id: string
  area_id: string
  reading_order: number
  title: string
  moisture_percentage: number
  moisture_status: string | null
  photos: PhotoWithUrl[]
}

export interface AreaWithDetails {
  id: string
  area_order: number
  area_name: string
  mould_description: string | null
  comments: string | null
  temperature: number | null
  humidity: number | null
  dew_point: number | null
  external_moisture: number | null
  infrared_enabled: boolean
  infrared_observation_no_active: boolean
  infrared_observation_water_infiltration: boolean
  infrared_observation_past_ingress: boolean
  infrared_observation_condensation: boolean
  infrared_observation_missing_insulation: boolean
  job_time_minutes: number | null
  demolition_required: boolean
  demolition_time_minutes: number | null
  demolition_description: string | null
  moisture_readings: MoistureReadingData[]
  photos: PhotoWithUrl[]
}

export interface SubfloorWithDetails {
  id: string
  observations: string | null
  comments: string | null
  landscape: string | null
  sanitation_required: boolean
  racking_required: boolean
  treatment_time_minutes: number | null
  readings: Array<{
    id: string
    reading_order: number
    moisture_percentage: number
    location: string
  }>
  photos: PhotoWithUrl[]
}

export interface CompleteInspectionData {
  inspection: Record<string, any>
  areas: AreaWithDetails[]
  subfloor: SubfloorWithDetails | null
  photos: PhotoWithUrl[]
}

/**
 * Fetch complete inspection data for a lead (for admin display).
 * Includes: inspection metadata, areas with moisture readings,
 * subfloor with readings, and all photos with signed URLs.
 */
export async function fetchCompleteInspectionData(
  leadId: string
): Promise<CompleteInspectionData | null> {
  // 1. Get inspection by lead ID
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (inspError || !inspection) {
    console.error('[fetchCompleteInspectionData] No inspection found:', inspError)
    return null
  }

  const inspectionId = inspection.id

  // 2. First load areas (needed to query moisture readings by area_id)
  const { data: rawAreas } = await supabase
    .from('inspection_areas')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('area_order')

  const areaIds = (rawAreas || []).map(a => a.id)

  // 3. Load moisture readings, subfloor, and photos in parallel
  const [moistureResult, subfloorResult, photosResult] = await Promise.all([
    areaIds.length > 0
      ? supabase
          .from('moisture_readings')
          .select('*')
          .in('area_id', areaIds)
          .order('reading_order')
      : Promise.resolve({ data: [] as any[], error: null }),
    supabase
      .from('subfloor_data')
      .select('*')
      .eq('inspection_id', inspectionId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('order_index'),
  ])

  const rawMoisture = moistureResult.data || []
  const subfloorData = subfloorResult.data
  const rawPhotos = photosResult.data || []

  // 4. Load subfloor readings if subfloor exists
  let subfloorReadings: any[] = []
  if (subfloorData) {
    const { data } = await supabase
      .from('subfloor_readings')
      .select('*')
      .eq('subfloor_id', subfloorData.id)
      .order('reading_order')
    subfloorReadings = data || []
  }

  // 5. Generate signed URLs for all photos
  const photosWithUrls: PhotoWithUrl[] = await Promise.all(
    rawPhotos.map(async (photo) => {
      try {
        const { data } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, signed_url: data?.signedUrl || '' }
      } catch {
        return { ...photo, signed_url: '' }
      }
    })
  )

  // 6. Build area details with their moisture readings and photos
  const areas: AreaWithDetails[] = (rawAreas || []).map(area => {
    const areaReadings = rawMoisture.filter(r => r.area_id === area.id)
    const areaPhotos = photosWithUrls.filter(p => p.area_id === area.id)

    const moistureReadings: MoistureReadingData[] = areaReadings.map(r => ({
      id: r.id,
      area_id: r.area_id,
      reading_order: r.reading_order,
      title: r.title || '',
      moisture_percentage: r.moisture_percentage || 0,
      moisture_status: r.moisture_status || null,
      photos: photosWithUrls.filter(p => p.moisture_reading_id === r.id),
    }))

    return {
      id: area.id,
      area_order: area.area_order,
      area_name: area.area_name,
      mould_description: area.mould_description,
      comments: area.comments,
      temperature: area.temperature,
      humidity: area.humidity,
      dew_point: area.dew_point,
      external_moisture: area.external_moisture,
      infrared_enabled: area.infrared_enabled || false,
      infrared_observation_no_active: area.infrared_observation_no_active || false,
      infrared_observation_water_infiltration: area.infrared_observation_water_infiltration || false,
      infrared_observation_past_ingress: area.infrared_observation_past_ingress || false,
      infrared_observation_condensation: area.infrared_observation_condensation || false,
      infrared_observation_missing_insulation: area.infrared_observation_missing_insulation || false,
      job_time_minutes: area.job_time_minutes,
      demolition_required: area.demolition_required || false,
      demolition_time_minutes: area.demolition_time_minutes,
      demolition_description: area.demolition_description,
      moisture_readings: moistureReadings,
      photos: areaPhotos.filter(p => !p.moisture_reading_id), // area-level photos only
    }
  })

  // 5. Build subfloor — photos may link via subfloor_id OR photo_type='subfloor'
  const subfloor: SubfloorWithDetails | null = subfloorData
    ? {
        id: subfloorData.id,
        observations: subfloorData.observations,
        comments: subfloorData.comments,
        landscape: subfloorData.landscape,
        sanitation_required: subfloorData.sanitation_required || false,
        racking_required: subfloorData.racking_required || false,
        treatment_time_minutes: subfloorData.treatment_time_minutes,
        readings: subfloorReadings.map(r => ({
          id: r.id,
          reading_order: r.reading_order,
          moisture_percentage: r.moisture_percentage || 0,
          location: r.location || '',
        })),
        photos: photosWithUrls.filter(p => p.subfloor_id === subfloorData.id || (p.photo_type === 'subfloor' && !p.subfloor_id)),
      }
    : null

  return {
    inspection,
    areas,
    subfloor,
    photos: photosWithUrls,
  }
}
