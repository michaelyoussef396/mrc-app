// Supabase Edge Function: generate-inspection-pdf
// Generates PDF report by populating HTML template with inspection data
// Returns: Populated HTML for client-side PDF generation OR direct PDF URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Lead {
  id: string
  full_name: string
  email: string
  phone: string
  property_address_street: string
  property_address_suburb: string
  property_address_state: string
  property_address_postcode: string
  property_type?: string
}

interface MoistureReading {
  id: string
  area_id: string
  reading_order: number
  title: string
  moisture_percentage: number | null
  moisture_status: string | null
}

interface InspectionArea {
  id: string
  area_name: string
  area_order: number
  mould_ceiling: boolean
  mould_cornice: boolean
  mould_windows: boolean
  mould_window_furnishings: boolean
  mould_walls: boolean
  mould_skirting: boolean
  mould_flooring: boolean
  mould_wardrobe: boolean
  mould_cupboard: boolean
  mould_contents: boolean
  mould_grout_silicone: boolean
  mould_none_visible: boolean
  mould_description: string  // Text field for mould visibility
  comments: string
  temperature: number
  humidity: number
  dew_point: number
  job_time_minutes: number
  demolition_required: boolean
  demolition_time_minutes: number
  demolition_description: string
  moisture_readings_enabled: boolean
  moisture_readings?: MoistureReading[]
  external_moisture: number | null  // Dedicated external moisture field
}

interface Photo {
  id: string
  storage_path: string
  photo_type: string
  caption: string
  area_id?: string
}

interface Inspection {
  id: string
  lead_id: string
  job_number: string
  inspector_id: string
  inspector_name?: string
  inspection_date: string
  inspection_start_time: string
  triage_description: string
  requested_by: string
  attention_to: string
  property_occupation: string
  dwelling_type: string
  outdoor_temperature: number
  outdoor_humidity: number
  outdoor_dew_point: number
  outdoor_comments: string
  cause_of_mould: string
  ai_summary_text: string
  labor_cost_ex_gst: number
  equipment_cost_ex_gst: number
  subtotal_ex_gst: number
  gst_amount: number
  total_inc_gst: number
  discount_percent: number
  waste_disposal_amount: string
  hepa_vac: boolean
  antimicrobial: boolean
  stain_removing_antimicrobial: boolean
  home_sanitation_fogging: boolean
  commercial_dehumidifier_qty: number
  air_movers_qty: number
  rcd_box_qty: number
  pdf_url?: string
  pdf_version: number
  // Page 2 AI-generated fields
  what_we_found_text?: string
  what_we_will_do_text?: string
  what_you_get_text?: string
  // Page 5 Job Summary AI-generated fields
  what_we_discovered?: string
  identified_causes?: string
  contributing_factors?: string
  why_this_happened?: string
  immediate_actions?: string
  long_term_protection?: string
  what_success_looks_like?: string
  timeline_text?: string
  lead?: Lead
  areas?: InspectionArea[]
  photos?: Photo[]
}

interface RequestBody {
  inspectionId: string
  regenerate?: boolean
  returnHtml?: boolean
}

// Format currency in Australian format
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Format date in Australian format DD/MM/YYYY
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Get mould description - uses text field first, falls back to legacy checkboxes for old records
function getMouldDescription(area: InspectionArea): string {
  // Primary: Use the mould_description text field if available
  if (area.mould_description && area.mould_description.trim()) {
    return area.mould_description.trim()
  }

  // Fallback: Build from legacy boolean checkboxes (backwards compatibility)
  const locations: string[] = []
  if (area.mould_ceiling) locations.push('Ceiling')
  if (area.mould_cornice) locations.push('Cornice')
  if (area.mould_windows) locations.push('Windows')
  if (area.mould_window_furnishings) locations.push('Window Furnishings')
  if (area.mould_walls) locations.push('Walls')
  if (area.mould_skirting) locations.push('Skirting')
  if (area.mould_flooring) locations.push('Flooring')
  if (area.mould_wardrobe) locations.push('Wardrobe')
  if (area.mould_cupboard) locations.push('Cupboard')
  if (area.mould_contents) locations.push('Contents')
  if (area.mould_grout_silicone) locations.push('Grout/Silicone')
  if (area.mould_none_visible) locations.push('No visible mould')
  return locations.join(', ') || 'Not specified'
}

// Get valid value - filters out placeholder text and empty values
function getValidValue(primary: string | null | undefined, fallback: string | null | undefined, defaultValue: string): string {
  // List of invalid placeholder values to filter out
  const invalidValues = ['attention to', 'requested by', 'directed to', 'not specified', 'n/a', '']

  // Check primary value
  if (primary && !invalidValues.includes(primary.toLowerCase().trim())) {
    return primary
  }

  // Check fallback value
  if (fallback && !invalidValues.includes(fallback.toLowerCase().trim())) {
    return fallback
  }

  return defaultValue
}

// Get treatment methods as a list
function getTreatmentMethods(inspection: Inspection): string {
  const methods: string[] = []
  if (inspection.hepa_vac) methods.push('HEPA Vacuum')
  if (inspection.antimicrobial) methods.push('Antimicrobial Treatment')
  if (inspection.stain_removing_antimicrobial) methods.push('Stain-Removing Antimicrobial')
  if (inspection.home_sanitation_fogging) methods.push('Home Sanitation/Fogging')
  return methods.join(', ') || 'Standard cleaning'
}

// Get equipment list
function getEquipmentList(inspection: Inspection): string {
  const equipment: string[] = []
  if (inspection.commercial_dehumidifier_qty > 0) {
    equipment.push(`${inspection.commercial_dehumidifier_qty}x Commercial Dehumidifier`)
  }
  if (inspection.air_movers_qty > 0) {
    equipment.push(`${inspection.air_movers_qty}x Air Mover`)
  }
  if (inspection.rcd_box_qty > 0) {
    equipment.push(`${inspection.rcd_box_qty}x RCD Safety Box`)
  }
  return equipment.join(', ') || 'None required'
}

// Format "What You Get" section - plain text to HTML with underlined warranty
function formatWhatYouGet(text: string | null | undefined): string {
  if (!text) {
    return '<span style="text-decoration: underline;">12 Month warranty</span> on all treated areas<br/>Professional material removal where required<br/>Complete airborne spore elimination<br/>Detailed documentation for insurance / resale'
  }

  // Split by newlines and filter empty lines
  const lines = text.split(/[\n\r]+/).filter(line => line.trim())

  if (lines.length === 0) {
    return '<span style="text-decoration: underline;">12 Month warranty</span> on all treated areas<br/>Professional material removal where required<br/>Complete airborne spore elimination<br/>Detailed documentation for insurance / resale'
  }

  // Process each line - underline warranty text in first line
  const formattedLines = lines.map((line, index) => {
    const trimmed = line.trim()
    if (index === 0) {
      // First line: underline "12 Month warranty" if present
      if (trimmed.toLowerCase().includes('warranty')) {
        return trimmed.replace(/(12 Month warranty)/i, '<span style="text-decoration: underline;">$1</span>')
      }
    }
    return trimmed
  })

  return formattedLines.join('<br/>')
}

// Convert markdown to HTML for PDF display
function markdownToHtml(text: string | null | undefined): string {
  if (!text) return ''

  let html = text

  // Convert bold **text** to <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Convert italic *text* to <em>text</em> (but not if part of bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')

  // Convert headers (## Header) to styled divs
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight: 600; margin-top: 12px; margin-bottom: 4px;">$1</div>')
  html = html.replace(/^## (.+)$/gm, '<div style="font-weight: 600; font-size: 16px; margin-top: 16px; margin-bottom: 6px;">$1</div>')
  html = html.replace(/^# (.+)$/gm, '<div style="font-weight: 700; font-size: 18px; margin-top: 20px; margin-bottom: 8px;">$1</div>')

  // Convert bullet points - wrap in proper list structure
  // First, identify and wrap consecutive bullet lines
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList) {
        processedLines.push('<ul style="margin: 8px 0; padding-left: 20px;">')
        inList = true
      }
      processedLines.push(`<li style="margin-bottom: 4px;">${bulletMatch[1]}</li>`)
    } else {
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }
      if (line.trim()) {
        processedLines.push(`<p style="margin: 8px 0;">${line}</p>`)
      }
    }
  }
  if (inList) {
    processedLines.push('</ul>')
  }

  html = processedLines.join('\n')

  // Clean up empty paragraphs
  html = html.replace(/<p style="margin: 8px 0;"><\/p>/g, '')

  return html
}

// Strip all markdown to plain text (for simpler sections)
function stripMarkdown(text: string | null | undefined): string {
  if (!text) return ''

  let plain = text

  // Remove bold/italic markers
  plain = plain.replace(/\*\*([^*]+)\*\*/g, '$1')
  plain = plain.replace(/\*([^*]+)\*/g, '$1')

  // Remove headers markers
  plain = plain.replace(/^#{1,3}\s+/gm, '')

  // Convert bullet points to simple format
  plain = plain.replace(/^[-*•]\s+/gm, '• ')

  // Clean up extra whitespace
  plain = plain.replace(/\n{3,}/g, '\n\n')

  return plain.trim()
}

// Photo URLs will be generated as signed URLs after fetching inspection data
// This placeholder will be replaced with actual signed URLs
let photoSignedUrls: Map<string, string> = new Map()

// Get photo URL from storage path (uses pre-generated signed URLs)
function getPhotoUrl(storagePath: string): string {
  if (!storagePath) return ''
  // Return the pre-generated signed URL if available
  return photoSignedUrls.get(storagePath) || ''
}

// Generate photo HTML element
function generatePhotoHtml(photos: Photo[] | undefined, photoType: string, fallbackText: string): string {
  const photo = photos?.find(p => p.photo_type === photoType)
  if (photo?.storage_path) {
    const url = getPhotoUrl(photo.storage_path)
    return `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="${photo.caption || photoType}" />`
  }
  return `<span style="color: #888; font-size: 14px;">${fallbackText}</span>`
}

// Generate dynamic area pages HTML - FLEXIBLE LAYOUT
function generateAreaPagesHtml(areas: InspectionArea[] | undefined, photos: Photo[] | undefined): string {
  if (!areas || areas.length === 0) {
    return `
    <div class="report-page-flex page-break">
      <div class="bg-gradient"></div>
      <div class="content-wrapper">
        <div class="page-header">
          <div style="font-size: 48px; font-family: Inter; font-weight: 400;">
            <span style="color: black;">AREA </span><span style="color: #150DB8;">INSPECTED:</span><span style="color: black;"> None</span>
          </div>
          <div class="logo-box">MRC</div>
        </div>
        <div style="margin-top: 60px; font-size: 18px; color: #666;">No areas were inspected during this assessment.</div>
      </div>
    </div>`
  }

  return areas.map((area, index) => {
    const areaPhotos = photos?.filter(p => p.area_id === area.id) || []
    const mouldLocations = getMouldDescription(area)

    // Get moisture readings - sorted by reading_order
    const moistureReadings = area.moisture_readings?.sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0)) || []
    // Internal moisture: Use first reading from moisture_readings table
    const internalMoisture = moistureReadings.find(r => r.title?.toLowerCase().includes('internal')) || moistureReadings[0]
    // External moisture: Use dedicated area.external_moisture field

    // Separate regular photos from infrared photos
    const regularPhotos = areaPhotos.filter(p => p.caption !== 'infrared' && p.caption !== 'natural_infrared')
    const infraredPhoto = areaPhotos.find(p => p.caption === 'infrared')
    const naturalInfraredPhoto = areaPhotos.find(p => p.caption === 'natural_infrared')
    const hasInfraredPhotos = infraredPhoto || naturalInfraredPhoto

    return `
    <div class="report-page-flex page-break">
      <div class="bg-gradient"></div>
      <div class="content-wrapper">
        <!-- Header with Logo -->
        <div class="page-header">
          <div style="font-size: 42px; font-family: Inter; font-weight: 400; max-width: 650px;">
            <span style="color: black;">AREA </span><span style="color: #150DB8;">INSPECTED:</span><span style="color: black;"> ${area.area_name}</span>
          </div>
          <div class="logo-box">MRC</div>
        </div>

        <!-- Description text -->
        <div class="content-section">
          <div style="color: black; font-size: 15px; line-height: 1.5;">Our thorough inspection assessed various zones of the property, identifying areas with mould presence and others remaining unaffected, ensuring a complete understanding of the situation.</div>
        </div>

        <!-- Environmental readings box (navy blue) -->
        <div style="background: #121D73; border-radius: 20px; padding: 20px 30px; margin: 20px auto; max-width: 600px;">
          <div style="display: flex; flex-wrap: wrap; gap: 15px; color: white; font-size: 15px;">
            <div style="flex: 1; min-width: 150px;">TEMPERATURE: ${area.temperature || 0}°C</div>
            <div style="flex: 1; min-width: 150px;">HUMIDITY: ${area.humidity || 0}%</div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 15px; color: white; font-size: 15px; margin-top: 15px;">
            <div style="flex: 1; min-width: 150px;">DEW POINT: ${area.dew_point || 0}°C</div>
            <div style="flex: 2; min-width: 200px;">VISIBLE MOULD: ${mouldLocations}</div>
          </div>
          ${area.moisture_readings_enabled && (internalMoisture || area.external_moisture) ? `
          <div style="display: flex; flex-wrap: wrap; gap: 15px; color: white; font-size: 15px; margin-top: 15px;">
            <div style="flex: 1; min-width: 200px;">INTERNAL MOISTURE: ${internalMoisture?.moisture_percentage ?? '-'}%</div>
            <div style="flex: 1; min-width: 200px;">EXTERNAL MOISTURE: ${area.external_moisture ?? '-'}%</div>
          </div>
          ` : ''}
        </div>

        <!-- Photos and Notes Row -->
        <div style="display: flex; gap: 20px; margin-top: 20px;">
          <!-- Photo grid (2x2) -->
          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; max-width: 420px;">
            ${regularPhotos.slice(0, 4).map((photo, i) => `
              <div style="width: 100%; aspect-ratio: 1; background: #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${photo.storage_path ? `<img src="${getPhotoUrl(photo.storage_path)}" style="width: 100%; height: 100%; object-fit: cover;" alt="${photo.caption || `Area photo ${i + 1}`}" />` : `<span style="color: #888;">Photo ${i + 1}</span>`}
              </div>
            `).join('')}
            ${Array(Math.max(0, 4 - (regularPhotos.length || 0))).fill(0).map((_, i) => `
              <div style="width: 100%; aspect-ratio: 1; background: #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #888;">No photo</span>
              </div>
            `).join('')}
          </div>

          <!-- Area Notes -->
          <div style="flex: 1; min-width: 250px;">
            <div style="font-size: 17px; font-weight: 400; margin-bottom: 10px;">AREA NOTES</div>
            <div style="font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${area.comments || 'No notes recorded for this area.'}</div>
          </div>
        </div>

        ${hasInfraredPhotos ? `
        <!-- Infrared Photos Row -->
        <div style="display: flex; gap: 20px; margin-top: 20px;">
          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 420px;">
            <div style="width: 100%; aspect-ratio: 1.5; background: #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${infraredPhoto?.storage_path ? `<img src="${getPhotoUrl(infraredPhoto.storage_path)}" style="width: 100%; height: 100%; object-fit: cover;" alt="Infrared view" />` : `<span style="color: #888;">Infrared Photo</span>`}
            </div>
            <div style="width: 100%; aspect-ratio: 1.5; background: #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${naturalInfraredPhoto?.storage_path ? `<img src="${getPhotoUrl(naturalInfraredPhoto.storage_path)}" style="width: 100%; height: 100%; object-fit: cover;" alt="Natural infrared view" />` : `<span style="color: #888;">Natural Infrared</span>`}
            </div>
          </div>
          <div style="flex: 1; min-width: 250px;">
            <div style="font-size: 17px; font-weight: 400; margin-bottom: 10px;">INFRARED NOTES</div>
            <div style="font-size: 13px; line-height: 1.6;">Thermal imaging reveals moisture patterns not visible to the naked eye, helping identify hidden water damage and potential mould growth areas.</div>
          </div>
        </div>
        ` : ''}

        ${area.demolition_required ? `
        <!-- Demolition Info -->
        <div class="content-section" style="margin-top: 30px;">
          <div style="color: #CD0000; font-size: 17px; font-weight: 400; margin-bottom: 10px;">DEMOLITION REQUIRED</div>
          <div style="font-size: 14px; line-height: 1.5;">
            <span style="font-weight: 600;">Demolition List:</span><br/>
            ${area.demolition_description || 'Demolition work required in this area.'}
          </div>
        </div>
        ` : ''}
      </div>
    </div>`
  }).join('')
}

// Generate the HTML report by replacing placeholders
function generateReportHtml(inspection: Inspection, templateHtml: string, inspectorName: string = 'Inspector'): string {
  const lead = inspection.lead

  // Build full property address
  const propertyAddress = lead ? [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode
  ].filter(Boolean).join(', ') : 'Address not available'

  // Areas summary
  const areasSummary = inspection.areas?.map(area =>
    `${area.area_name}: ${getMouldDescription(area)}`
  ).join('\n') || 'No areas inspected'

  // Build examined areas list (for cover page - one per line)
  const examinedAreas = inspection.areas?.map(a => a.area_name).join(', ') || 'None'
  const examinedAreasList = inspection.areas?.map(a => a.area_name).join('<br/>') || 'None'

  // Generate dynamic area pages
  const areasPagesHtml = generateAreaPagesHtml(inspection.areas, inspection.photos)

  // Get outdoor photos
  const outdoorPhotos = inspection.photos?.filter(p => p.photo_type === 'outdoor') || []

  // Debug logging for outdoor photos
  console.log('🏠 OUTDOOR PHOTOS DEBUG:', {
    totalOutdoorPhotos: outdoorPhotos.length,
    photos: outdoorPhotos.map(p => ({
      caption: p.caption,
      photo_type: p.photo_type,
      storage_path: p.storage_path,
      hasSignedUrl: photoSignedUrls.has(p.storage_path)
    }))
  })

  const outdoorPhoto1Html = outdoorPhotos[0]?.storage_path
    ? `<img src="${getPhotoUrl(outdoorPhotos[0].storage_path)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;" alt="Outdoor photo 1" />`
    : '<span style="color: #888; font-size: 14px;">Photo 1</span>'
  const outdoorPhoto2Html = outdoorPhotos[1]?.storage_path
    ? `<img src="${getPhotoUrl(outdoorPhotos[1].storage_path)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;" alt="Outdoor photo 2" />`
    : '<span style="color: #888; font-size: 14px;">Photo 2</span>'
  const outdoorPhoto3Html = outdoorPhotos[2]?.storage_path
    ? `<img src="${getPhotoUrl(outdoorPhotos[2].storage_path)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;" alt="Outdoor photo 3" />`
    : '<span style="color: #888; font-size: 14px;">Photo 3</span>'

  // Get cover photo - prioritize front_house, then general, then first outdoor photo
  const frontHousePhoto = inspection.photos?.find(p => p.caption === 'front_house')
  const generalPhoto = inspection.photos?.find(p => p.photo_type === 'general')
  const firstOutdoorPhoto = inspection.photos?.find(p => p.photo_type === 'outdoor')
  const coverPhoto = frontHousePhoto || generalPhoto || firstOutdoorPhoto

  // Debug logging for cover photo
  console.log('🖼️ COVER PHOTO DEBUG:', {
    totalPhotos: inspection.photos?.length || 0,
    frontHousePhoto: frontHousePhoto ? { caption: frontHousePhoto.caption, storage_path: frontHousePhoto.storage_path } : null,
    generalPhoto: generalPhoto ? { photo_type: generalPhoto.photo_type, storage_path: generalPhoto.storage_path } : null,
    firstOutdoorPhoto: firstOutdoorPhoto ? { photo_type: firstOutdoorPhoto.photo_type, caption: firstOutdoorPhoto.caption, storage_path: firstOutdoorPhoto.storage_path } : null,
    selectedCoverPhoto: coverPhoto ? { storage_path: coverPhoto.storage_path, caption: coverPhoto.caption, photo_type: coverPhoto.photo_type } : null,
    signedUrlExists: coverPhoto?.storage_path ? photoSignedUrls.has(coverPhoto.storage_path) : false,
    signedUrl: coverPhoto?.storage_path ? getPhotoUrl(coverPhoto.storage_path) : 'NO STORAGE PATH'
  })

  const coverPhotoHtml = coverPhoto?.storage_path
    ? `<img src="${getPhotoUrl(coverPhoto.storage_path)}" style="width: 100%; height: 100%; object-fit: cover;" alt="Property" />`
    : '<span style="color: #888; font-size: 16px;">Property Photo</span>'

  // Generate treatment plan from treatment methods and equipment
  const treatmentMethods = getTreatmentMethods(inspection)
  const equipmentList = getEquipmentList(inspection)
  const treatmentPlan = `We'll set up professional equipment including ${equipmentList || 'air scrubbers'}. ` +
    `Treatment will include ${treatmentMethods || 'standard mould removal procedures'}. ` +
    `Cross-contaminated salvageable items will be professionally treated, while non-salvageable materials will be double-bagged and properly disposed of. ` +
    `All work follows strict safety protocols with full PPE and containment procedures.`

  // Problem discovered (based on AI summary or default)
  const problemDiscovered = inspection.ai_summary_text ||
    `During our comprehensive inspection at ${propertyAddress}, we identified mould growth in the examined areas. ` +
    `This has resulted in contamination that requires professional treatment to ensure the health and safety of occupants.`

  // Contributing factors (default list based on inspection data)
  const contributingFactors = [
    inspection.outdoor_humidity > 60 ? `- High outdoor humidity levels at ${inspection.outdoor_humidity}%` : null,
    inspection.areas?.some(a => a.humidity > 60) ? '- Elevated indoor humidity in affected areas' : null,
    '- Potential moisture sources requiring investigation',
    '- Building ventilation may need assessment'
  ].filter(Boolean).join('\n') || '- Environmental conditions require assessment\n- Moisture source investigation needed'

  // Immediate actions
  const immediateActions = `1. Proceed with MRC's surface treatment option to eliminate visible mould and treat cross-contaminated items\n` +
    `2. Address any identified moisture sources\n` +
    `3. Maintain affected areas vacant during treatment and 2 hours post-completion\n` +
    `4. Remove and store personal items as recommended`

  // Long term protection
  const longTermProtection = `- Complete any recommended repairs before warranty activation\n` +
    `- Improve ventilation in affected areas\n` +
    `- Monitor indoor humidity levels, maintaining below 50-55%\n` +
    `- Conduct 6-month post-treatment visual inspection\n` +
    `- Address any new moisture issues immediately to prevent recurrence`

  // Replace all placeholders in the template
  let html = templateHtml
    // Client/Property Info
    .replace(/\{\{client_name\}\}/g, lead?.full_name || 'Client Name')
    .replace(/\{\{client_email\}\}/g, lead?.email || '')
    .replace(/\{\{client_phone\}\}/g, lead?.phone || '')
    .replace(/\{\{property_address\}\}/g, propertyAddress)
    .replace(/\{\{property_type\}\}/g, lead?.property_type || inspection.dwelling_type || 'Residential')
    .replace(/\{\{dwelling_type\}\}/g, inspection.dwelling_type || 'Not specified')
    .replace(/\{\{property_occupation\}\}/g, inspection.property_occupation || 'Not specified')

    // Inspection Details
    .replace(/\{\{job_number\}\}/g, inspection.job_number || 'N/A')
    .replace(/\{\{inspection_date\}\}/g, formatDate(inspection.inspection_date))
    .replace(/\{\{inspection_time\}\}/g, inspection.inspection_start_time || '')
    .replace(/\{\{inspector_name\}\}/g, inspectorName)
    .replace(/\{\{requested_by\}\}/g, getValidValue(inspection.requested_by, lead?.full_name, 'Property Owner'))
    .replace(/\{\{attention_to\}\}/g, getValidValue(inspection.attention_to, lead?.full_name, 'Property Owner'))
    .replace(/\{\{triage_description\}\}/g, inspection.triage_description || '')

    // Outdoor Conditions
    .replace(/\{\{outdoor_temperature\}\}/g, String(inspection.outdoor_temperature || 0))
    .replace(/\{\{outdoor_humidity\}\}/g, String(inspection.outdoor_humidity || 0))
    .replace(/\{\{outdoor_dew_point\}\}/g, String(inspection.outdoor_dew_point || 0))
    .replace(/\{\{outdoor_comments\}\}/g, inspection.outdoor_comments || '')

    // Outdoor Photos
    .replace(/\{\{outdoor_photo_1_html\}\}/g, outdoorPhoto1Html)
    .replace(/\{\{outdoor_photo_2_html\}\}/g, outdoorPhoto2Html)
    .replace(/\{\{outdoor_photo_3_html\}\}/g, outdoorPhoto3Html)

    // Cover Photo
    .replace(/\{\{cover_photo_html\}\}/g, coverPhotoHtml)

    // Dynamic Areas Pages
    .replace(/\{\{areas_pages_html\}\}/g, areasPagesHtml)

    // Findings Summary - Convert markdown to HTML for proper display
    .replace(/\{\{ai_summary\}\}/g, markdownToHtml(inspection.ai_summary_text) || 'Our inspection identified areas requiring professional mould treatment. A detailed assessment of affected zones has been conducted to develop an effective remediation plan.')
    .replace(/\{\{what_we_found\}\}/g, markdownToHtml(inspection.ai_summary_text) || 'Summary not available')
    .replace(/\{\{cause_of_mould\}\}/g, stripMarkdown(inspection.cause_of_mould) || 'Moisture infiltration is the primary cause of mould growth in this property. Further investigation may be required to identify the exact source.')
    .replace(/\{\{examined_areas\}\}/g, examinedAreas)
    .replace(/\{\{examined_areas_list\}\}/g, examinedAreasList)
    .replace(/\{\{areas_summary\}\}/g, areasSummary)

    // Problem Analysis - Convert markdown to HTML
    .replace(/\{\{problem_discovered\}\}/g, markdownToHtml(problemDiscovered))
    .replace(/\{\{contributing_factors\}\}/g, contributingFactors)
    .replace(/\{\{immediate_actions\}\}/g, immediateActions)
    .replace(/\{\{long_term_protection\}\}/g, longTermProtection)

    // Page 2 AI-generated fields (from generate-inspection-summary edge function)
    .replace(/\{\{what_we_found_text\}\}/g, markdownToHtml(inspection.what_we_found_text) || markdownToHtml(inspection.ai_summary_text) || 'Summary not yet generated. Click "Generate AI Summary" in Section 10.')
    .replace(/\{\{what_we_will_do_text\}\}/g, markdownToHtml(inspection.what_we_will_do_text) || treatmentPlan)
    .replace(/\{\{what_you_get_text\}\}/g, formatWhatYouGet(inspection.what_you_get_text))

    // Page 5 Job Summary AI-generated fields
    .replace(/\{\{what_we_discovered\}\}/g, stripMarkdown(inspection.what_we_discovered) || stripMarkdown(problemDiscovered))
    .replace(/\{\{identified_causes\}\}/g, stripMarkdown(inspection.identified_causes) || stripMarkdown(inspection.cause_of_mould) || 'Moisture infiltration is the primary cause of mould growth. Further investigation may be required.')
    .replace(/\{\{contributing_factors\}\}/g, stripMarkdown(inspection.contributing_factors) || contributingFactors)
    .replace(/\{\{why_this_happened\}\}/g, stripMarkdown(inspection.why_this_happened) || 'Mould growth typically occurs when moisture is trapped without proper ventilation. This creates ideal conditions for mould colonization.')
    .replace(/\{\{immediate_actions\}\}/g, stripMarkdown(inspection.immediate_actions) || immediateActions)
    .replace(/\{\{long_term_protection\}\}/g, stripMarkdown(inspection.long_term_protection) || longTermProtection)
    .replace(/\{\{what_success_looks_like\}\}/g, stripMarkdown(inspection.what_success_looks_like) || 'All visible mould eliminated. Airborne spore counts reduced to safe levels. Property protected by 12-month warranty. Indoor air quality restored.')
    .replace(/\{\{timeline_text\}\}/g, stripMarkdown(inspection.timeline_text) || 'MRC treatment: 1 day onsite + 3 days air scrubber operation. Property re-occupancy: 2 hours after final sanitization.')

    // Treatment Plan
    .replace(/\{\{treatment_plan\}\}/g, treatmentPlan)
    .replace(/\{\{treatment_methods\}\}/g, treatmentMethods)
    .replace(/\{\{equipment_list\}\}/g, equipmentList)
    .replace(/\{\{waste_disposal\}\}/g, inspection.waste_disposal_amount || 'None')

    // Cost Estimate
    .replace(/\{\{labor_cost\}\}/g, formatCurrency(inspection.labor_cost_ex_gst))
    .replace(/\{\{equipment_cost\}\}/g, formatCurrency(inspection.equipment_cost_ex_gst))
    .replace(/\{\{subtotal_ex_gst\}\}/g, formatCurrency(inspection.subtotal_ex_gst))
    .replace(/\{\{discount_percent\}\}/g, String(inspection.discount_percent || 0))
    .replace(/\{\{gst_amount\}\}/g, formatCurrency(inspection.gst_amount))
    .replace(/\{\{total_inc_gst\}\}/g, formatCurrency(inspection.total_inc_gst))

    // Meta
    .replace(/\{\{generated_date\}\}/g, formatDate(new Date().toISOString()))
    .replace(/\{\{pdf_version\}\}/g, String(inspection.pdf_version || 1))

  return html
}

Deno.serve(async (req) => {
  console.log('Request received:', req.method, req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method)
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing POST request')

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    let body: RequestBody
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { inspectionId, regenerate = false, returnHtml = false } = body

    if (!inspectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing inspectionId in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating PDF for inspection: ${inspectionId}, regenerate: ${regenerate}`)

    // Fetch inspection with lead, areas (including moisture readings), and photos
    const { data: inspection, error: fetchError } = await supabase
      .from('inspections')
      .select(`
        *,
        lead:leads(*),
        areas:inspection_areas(*,moisture_readings(*)),
        photos:photos(*)
      `)
      .eq('id', inspectionId)
      .single()

    if (fetchError || !inspection) {
      console.error('Failed to fetch inspection:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Inspection not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sort areas by area_order
    if (inspection.areas) {
      inspection.areas.sort((a: InspectionArea, b: InspectionArea) =>
        (a.area_order || 0) - (b.area_order || 0)
      )
    }

    // Get inspector name from denormalized field on inspection
    const inspectorName = inspection.inspector_name || 'Inspector'

    // Generate signed URLs for all photos (valid for 1 hour)
    // This is needed because the inspection-photos bucket is private
    photoSignedUrls = new Map()
    if (inspection.photos && inspection.photos.length > 0) {
      console.log(`Generating signed URLs for ${inspection.photos.length} photos...`)

      for (const photo of inspection.photos) {
        if (photo.storage_path) {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('inspection-photos')
              .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry

            if (signedUrlData?.signedUrl && !signedUrlError) {
              photoSignedUrls.set(photo.storage_path, signedUrlData.signedUrl)
              console.log(`✓ Signed URL generated for: ${photo.storage_path}`)
            } else {
              console.error(`✗ Failed to generate signed URL for ${photo.storage_path}:`, signedUrlError)
            }
          } catch (err) {
            console.error(`✗ Error generating signed URL for ${photo.storage_path}:`, err)
          }
        }
      }

      console.log(`Generated ${photoSignedUrls.size} signed URLs for photos`)
    } else {
      console.log('No photos found for this inspection')
    }

    // Professional 9-page HTML template with FLEXIBLE layouts that expand with content
    const templateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mould & Restoration Co. - Inspection Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: #f5f5f5;
        }

        /* Fixed size pages for cover and special layouts */
        .report-page {
            width: 794px;
            height: 1123px;
            margin: 0 auto;
            background: white;
            position: relative;
            overflow: hidden;
        }

        /* Flexible pages that can grow with content */
        .report-page-flex {
            width: 794px;
            min-height: 1123px;
            margin: 0 auto;
            background: white;
            position: relative;
            padding: 40px;
        }

        .page-break {
            page-break-after: always;
            break-after: page;
        }

        /* Flexible content sections */
        .content-section {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 28px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            color: black;
        }

        .section-title-blue {
            color: #150DB8;
        }

        .section-content {
            font-size: 16px;
            line-height: 1.6;
            color: #333;
        }

        /* Page header with logo */
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
        }

        .logo-box {
            width: 57px;
            height: 56px;
            background: #121D73;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }

        /* Background gradient overlay */
        .bg-gradient {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(180deg, rgba(21, 13, 184, 0.02) 0%, rgba(21, 13, 184, 0.06) 100%);
            z-index: 0;
        }

        .content-wrapper {
            position: relative;
            z-index: 1;
        }

        /* Navy background sections */
        .navy-section {
            background: #121D73;
            color: white;
            padding: 30px 40px;
            margin: 0 -40px;
            margin-bottom: 24px;
        }

        .navy-section .section-title {
            color: white;
        }

        .navy-section .section-content {
            color: white;
        }

        /* Investment pill */
        .investment-pill {
            display: inline-block;
            background: #121D73;
            color: white;
            padding: 10px 24px;
            border-radius: 25px;
            font-size: 20px;
            margin-top: 8px;
        }

        @media print {
            @page {
                margin: 0;
                size: A4;
            }
            html, body { margin: 0 !important; padding: 0 !important; }
            *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .report-page, .report-page-flex {
                margin: 0;
                page-break-after: always;
                background: white !important;
            }
            .navy-section { background: #121D73 !important; }
            .bg-gradient { background: linear-gradient(180deg, rgba(21, 13, 184, 0.02) 0%, rgba(21, 13, 184, 0.06) 100%) !important; }
        }
    </style>
</head>
<body>

    <!-- Page 1: Cover -->
    <div class="report-page page-break">
        <div style="width: 100%; height: 100%; position: relative; background: white; overflow: hidden">
            <!-- Diagonal background - using CSS gradient instead of SVG for reliability -->
            <div style="width: 1800px; height: 1800px; left: -300px; top: 250px; position: absolute; background: linear-gradient(135deg, #121D73 0%, #150DB8 100%); transform: rotate(-15deg); z-index: 1;"></div>

            <div style="width: 628px; left: 48px; top: 66px; position: absolute; color: black; font-size: 160px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.75px; word-wrap: break-word; z-index: 10;">MOULD</div>
            <div style="width: 508.20px; left: 226.40px; top: 167px; position: absolute; color: #150DB8; font-size: 112px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.51px; word-wrap: break-word; text-shadow: -5px 0px 8px rgba(0, 0, 0, 0.29); z-index: 10;">REPORT</div>
            <div style="width: 259px; left: 28px; top: 312.50px; position: absolute; color: black; font-size: 19px; font-family: Inter; font-weight: 400; letter-spacing: 0.05px; word-wrap: break-word; z-index: 10;">ordered by: {{requested_by}}<br/>inspector: {{inspector_name}}<br/>date: {{inspection_date}}</div>
            <div style="width: 172px; left: 27px; top: 415.50px; position: absolute; z-index: 10;"><span style="color: black; font-size: 17px; font-family: Inter; font-weight: 400; text-transform: uppercase; line-height: 20px; letter-spacing: 0.04px; word-wrap: break-word">directed to:<br/>{{attention_to}}<br/><br/><br/>property type:<br/>{{dwelling_type}}<br/><br/><br/></span><span style="color: black; font-size: 17px; font-family: Inter; font-weight: 400; text-transform: uppercase; line-height: 24px; letter-spacing: 0.04px; word-wrap: break-word">examined areas<br/>{{examined_areas_list}}<br/></span></div>

            <!-- Cover photo placeholder -->
            <div style="width: 486.20px; height: 363.79px; left: 273.98px; top: 418.92px; position: absolute; background: white; box-shadow: -16px 0px 57px rgba(0, 0, 0, 0.26); z-index: 2;"></div>
            <div style="width: 468px; height: 350px; left: 283px; top: 426px; position: absolute; background: #e5e5e5; display: flex; align-items: center; justify-content: center; z-index: 3;">
                {{cover_photo_html}}
            </div>

            <div style="width: 377.30px; left: 318.85px; top: 796.50px; position: absolute; color: white; font-size: 23px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.07px; word-wrap: break-word; z-index: 10;">{{property_address}}</div>
            <div style="width: 179px; left: 581px; top: 1014.50px; position: absolute; color: white; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 23.90px; word-wrap: break-word; z-index: 10;">Restoring your spaces,<br/>protecting your health.</div>
            <div style="width: 748.40px; left: 23.30px; top: 1089px; position: absolute; text-align: center; color: white; font-size: 14px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02px; word-wrap: break-word; z-index: 10;">1800 954 117 | mouldandrestoration.com.au | admin@mouldandrestoration.com.au</div>
            <div style="width: 748.38px; height: 1px; left: 23.82px; top: 1076.29px; position: absolute; background: white; z-index: 10;"></div>
        </div>
    </div>

    <!-- Page 2: Value Proposition - FLEXIBLE LAYOUT -->
    <div class="report-page-flex page-break">
        <div class="bg-gradient"></div>
        <div class="content-wrapper">
            <!-- Header with Logo -->
            <div class="page-header">
                <div>
                    <div style="color: black; font-size: 70px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1;">VALUE</div>
                    <div style="color: #150DB8; font-size: 67px; font-family: Inter; font-weight: 400; text-transform: uppercase; letter-spacing: 0.29px; line-height: 1;">PROPOSITION</div>
                </div>
                <div class="logo-box">MRC</div>
            </div>

            <!-- What We Found Section -->
            <div class="content-section">
                <div class="section-title">WHAT WE FOUND</div>
                <div class="section-content">{{what_we_found_text}}</div>
            </div>

            <!-- What We're Going To Do Section -->
            <div class="content-section">
                <div class="section-title">WHAT WE'RE GOING TO DO</div>
                <div class="section-content">{{what_we_will_do_text}}</div>
            </div>

            <!-- What You Get Section -->
            <div class="content-section">
                <div class="section-title">WHAT YOU GET</div>
                <div class="section-content">{{what_you_get_text}}</div>
            </div>

            <!-- Investment Section -->
            <div class="content-section" style="margin-top: 40px;">
                <div class="section-title">INVESTMENT</div>
                <div class="investment-pill">{{subtotal_ex_gst}} + GST</div>
            </div>
        </div>
    </div>

    <!-- Page 3: Outdoor Environment Analysis -->
    <div class="report-page page-break">
        <div style="width: 100%; height: 100%; position: relative; background: white; overflow: hidden">
            <!-- Background shapes -->
            <div style="width: 860px; height: 1080px; left: -39px; top: -7px; position: absolute; background: linear-gradient(180deg, rgba(21, 13, 184, 0.03) 0%, rgba(21, 13, 184, 0.05) 100%); z-index: 0;"></div>
            <div style="width: 1520px; height: 800px; left: -155px; top: 480px; position: absolute; background: #121D73; transform: skewY(-8deg); z-index: 1;"></div>

            <div style="width: 642.6px; left: 21.7px; top: 34px; position: absolute; color: black; font-size: 46px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.182px; word-wrap: break-word; z-index: 10;">OUTDOOR ENVIRONMENT</div>
            <div style="width: 187.4px; left: 24.3px; top: 73px; position: absolute; color: #150DB8; font-size: 34px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.124px; word-wrap: break-word; z-index: 10;">ANALYSIS</div>

            <div style="width: 190px; left: 62px; top: 262.5px; position: absolute; color: black; font-size: 23px; font-family: Inter; font-weight: 400; line-height: 20.8px; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">OUTDOOR<br/>TEMPERATURE</div>
            <div style="width: 74.2px; left: 62.9px; top: 315.5px; position: absolute; color: black; font-size: 22px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">{{outdoor_temperature}}°C</div>

            <!-- Photo 1 placeholder -->
            <div style="width: 372px; height: 259px; left: 342px; top: 181px; position: absolute; background: #e5e5e5; border-radius: 15px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                {{outdoor_photo_1_html}}
            </div>

            <div style="width: 128px; left: 59px; top: 562px; position: absolute; color: black; font-size: 23px; font-family: Inter; font-weight: 400; line-height: 20.8px; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">OUTDOOR<br/>HUMIDITY</div>
            <div style="width: 73.3px; left: 57.85px; top: 615px; position: absolute; color: black; font-size: 23px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">{{outdoor_humidity}}%</div>

            <!-- Photo 2 placeholder -->
            <div style="width: 372px; height: 259px; left: 342px; top: 466px; position: absolute; background: #e5e5e5; border-radius: 15px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                {{outdoor_photo_2_html}}
            </div>

            <div style="width: 143px; left: 59px; top: 846.5px; position: absolute; color: white; font-size: 23px; font-family: Inter; font-weight: 400; line-height: 20.8px; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">OUTDOOR<br/>DEW POINT</div>
            <div style="width: 63.2px; left: 58.9px; top: 904.5px; position: absolute; color: white; font-size: 22px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0682px; word-wrap: break-word; z-index: 10;">{{outdoor_dew_point}}°C</div>

            <!-- Photo 3 placeholder -->
            <div style="width: 370px; height: 257px; left: 343px; top: 752px; position: absolute; background: #e5e5e5; border-radius: 15px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                {{outdoor_photo_3_html}}
            </div>

            <!-- Logo -->
            <div style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; background: #121D73; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; z-index: 10;">MRC</div>
        </div>
    </div>

    <!-- Page 4: Areas Inspected (Dynamic - will be repeated per area) -->
    {{areas_pages_html}}

    <!-- Page 5: Problem Analysis & Recommendations - FLEXIBLE LAYOUT -->
    <div class="report-page-flex page-break" style="padding: 0;">
        <!-- Header section with gradient background -->
        <div style="padding: 30px 40px 20px; background: linear-gradient(180deg, rgba(21, 13, 184, 0.03) 0%, rgba(21, 13, 184, 0.05) 100%);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="color: black; font-size: 57px; font-family: Inter; font-weight: 400; line-height: 1;">PROBLEM</div>
                    <div style="color: #150DB8; font-size: 23px; font-family: Inter; font-weight: 400;">ANALYSIS & RECOMMENDATIONS</div>
                </div>
                <div style="width: 57px; height: 57px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #121D73; font-size: 12px; font-weight: bold;">MRC</div>
            </div>
        </div>

        <!-- Main content with navy background -->
        <div style="background: #121D73; color: white; padding: 30px 40px; min-height: 900px;">
            <!-- What We Discovered -->
            <div class="content-section">
                <div style="font-size: 17px; font-weight: 400; margin-bottom: 8px;">WHAT WE DISCOVERED</div>
                <div style="font-size: 14px; line-height: 20px;">{{problem_discovered}}</div>
            </div>

            <!-- Identified Causes -->
            <div class="content-section">
                <div style="font-size: 17px; font-weight: 400; margin-bottom: 8px;">IDENTIFIED CAUSES</div>
                <div style="font-size: 14px; line-height: 20px;">{{cause_of_mould}}</div>
            </div>

            <!-- Contributing Factors -->
            <div class="content-section">
                <div style="font-size: 17px; font-weight: 400; margin-bottom: 8px;">CONTRIBUTING FACTORS</div>
                <div style="font-size: 13px; line-height: 19px; white-space: pre-wrap;">{{contributing_factors}}</div>
            </div>

            <!-- Recommendations Header -->
            <div style="font-size: 25px; font-weight: 400; margin-top: 30px; margin-bottom: 20px;">RECOMMENDATIONS</div>

            <!-- Immediate Actions -->
            <div class="content-section">
                <div style="font-size: 16px; font-weight: 400; margin-bottom: 8px;">IMMEDIATE ACTIONS</div>
                <div style="font-size: 14px; line-height: 20px; white-space: pre-wrap;">{{immediate_actions}}</div>
            </div>

            <!-- Long-Term Protection -->
            <div class="content-section">
                <div style="font-size: 16px; font-weight: 400; margin-bottom: 8px;">LONG-TERM PROTECTION</div>
                <div style="font-size: 14px; line-height: 20px; white-space: pre-wrap;">{{long_term_protection}}</div>
            </div>

            <!-- What Success Looks Like -->
            <div class="content-section">
                <div style="font-size: 16px; font-weight: 400; margin-bottom: 8px;">WHAT SUCCESS LOOKS LIKE</div>
                <div style="font-size: 14px; line-height: 20px;">All visible mould eliminated from treated surfaces. Airborne spore counts reduced to safe background levels. Property protected by 12-month warranty against mould recurrence in treated areas. Indoor air quality restored to healthy standards.</div>
            </div>

            <!-- Timeline -->
            <div class="content-section">
                <div style="font-size: 16px; font-weight: 400; margin-bottom: 8px;">TIMELINE</div>
                <div style="font-size: 14px; line-height: 20px;">MRC treatment: 1 day onsite + 3 days air scrubber operation. Property re-occupancy: 2 hours after final sanitization phase.</div>
            </div>
        </div>
    </div>

    <!-- Page 6: Visual Mould Cleaning Estimate -->
    <div class="report-page page-break">
        <div style="width: 794px; height: 1123px; position: relative; background: white; overflow: hidden">
            <!-- Background shapes -->
            <div style="width: 850px; height: 1040px; left: -28px; top: -8px; position: absolute; background: linear-gradient(180deg, rgba(21, 13, 184, 0.02) 0%, rgba(21, 13, 184, 0.05) 100%); z-index: 0;"></div>
            <div style="width: 818px; height: 390px; left: -12px; top: 827px; position: absolute; background: #121D73; z-index: 1;"></div>

            <!-- Logo -->
            <div style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; background: #121D73; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; z-index: 10;">MRC</div>

            <div style="left: 37px; top: 32.5px; position: absolute; color: black; font-size: 40px; font-family: Inter; font-weight: 400; line-height: 40px; letter-spacing: 0.1519px; word-wrap: break-word; z-index: 5;">VISUAL MOULD</div>
            <div style="left: 37px; top: 76.5px; position: absolute; color: #150DB8; font-size: 40px; font-family: Inter; font-weight: 400; line-height: 40px; letter-spacing: 0.1519px; word-wrap: break-word; z-index: 5;">CLEANING ESTIMATE</div>

            <div style="left: 37px; top: 145px; position: absolute; color: #252525; font-size: 17px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0393px; word-wrap: break-word; z-index: 5;">OPTION 1: SURFACE TREATMENT ONLY</div>
            <div style="left: 36.4px; top: 180px; position: absolute; color: #252525; font-size: 12px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.015px; word-wrap: break-word; z-index: 5;">TOTAL ESTIMATED COST OF OPTION 1</div>
            <div style="width: 170.579px; height: 27.042px; left: 299.79px; top: 171.31px; position: absolute; background: #121D73; border-radius: 20px; z-index: 5;"></div>
            <div style="left: 320.2px; top: 178.5px; position: absolute; color: white; font-size: 16px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0303px; word-wrap: break-word; z-index: 6;">{{total_inc_gst}}</div>

            <div style="width: 622px; left: 37px; top: 214px; position: absolute; color: #252525; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 19px; letter-spacing: 0.0231px; word-wrap: break-word; z-index: 5;">A. Eradication of visible mould from all impacted zones as detailed in the prior report.<br/><br/>B. Diminishment of airborne mould spores within the property through sanitisation.</div>

            <div style="left: 37px; top: 340px; position: absolute; color: #252525; font-size: 17px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0393px; word-wrap: break-word; z-index: 5;">OPTION 2: COMPREHENSIVE TREATMENT</div>
            <div style="left: 36.4px; top: 374px; position: absolute; color: #252525; font-size: 12px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.015px; word-wrap: break-word; z-index: 5;">TOTAL ESTIMATED COST OF OPTION 2</div>
            <div style="width: 198.412px; height: 28.264px; left: 299.87px; top: 365px; position: absolute; background: #121D73; border-radius: 20px; z-index: 5;"></div>
            <div style="left: 308.2px; top: 373.5px; position: absolute; color: white; font-size: 16px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0342px; word-wrap: break-word; z-index: 6;">Contact for quote</div>

            <div style="width: 622px; left: 37px; top: 416px; position: absolute; color: #252525; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 19px; letter-spacing: 0.0231px; word-wrap: break-word; z-index: 5;">A. Eradication of visible mould from all impacted zones as detailed in the prior report.<br/><br/>B. Removal of mould-affected materials and infrastructural components.<br/><br/>C. Diminishment of airborne mould spores within the property through sanitisation.<br/><br/>D. Proper Disposal and handling of removed mould-affected materials.</div>

            <div style="left: 38px; top: 610px; position: absolute; color: #252525; font-size: 19px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0475px; word-wrap: break-word; z-index: 5;">EQUIPMENT COSTS</div>
            <div style="width: 271px; left: 38px; top: 640px; position: absolute; color: #252525; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 22px; letter-spacing: 0.0231px; word-wrap: break-word; z-index: 5;">
                Commercial dehumidifier: $132/day<br/>
                Air Mover: $46/day<br/>
                RCD Box: $5/day<br/>
                Capped at <span style="text-decoration: underline;">3 days</span>
            </div>

            <div style="width: 309px; left: 450px; top: 610px; position: absolute; color: #CD0000; font-size: 14px; font-family: Inter; font-weight: 400; line-height: 19px; letter-spacing: 0.0231px; word-wrap: break-word; z-index: 5;">PLEASE NOTE: Mould & Restoration CO. specialises in the removal of these materials and does not provide replacement services. Clients are advised to arrange for replacement through other specialised services.</div>

            <!-- Before/After section -->
            <div style="width: 370px; height: 250px; left: 30px; top: 840px; position: absolute; background: rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                <span style="color: white; font-size: 18px;">BEFORE</span>
            </div>
            <div style="width: 370px; height: 250px; left: 410px; top: 840px; position: absolute; background: rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                <span style="color: white; font-size: 18px;">AFTER</span>
            </div>
        </div>
    </div>

    <!-- Page 7: Terms & Conditions -->
    <div class="report-page page-break">
        <div style="width: 794px; height: 1123px; position: relative; background: white; overflow: hidden">
            <div style="width: 800px; height: 1145px; left: 0; top: 0; position: absolute; background: linear-gradient(180deg, rgba(21, 13, 184, 0.02) 0%, rgba(21, 13, 184, 0.05) 100%); z-index: 0;"></div>

            <!-- Logo -->
            <div style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; background: #121D73; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; z-index: 10;">MRC</div>

            <div style="left: 37px; top: 39px; position: absolute; color: black; font-size: 56px; font-family: Inter; font-weight: 400; line-height: 56px; letter-spacing: 0.2309px; word-wrap: break-word; z-index: 5;">TERMS &</div>
            <div style="left: 37px; top: 95px; position: absolute; color: #150DB8; font-size: 56px; font-family: Inter; font-weight: 400; line-height: 56px; letter-spacing: 0.2309px; word-wrap: break-word; z-index: 5;">CONDITIONS</div>

            <div style="width: 687px; left: 39px; top: 211.5px; position: absolute; color: black; font-size: 17px; font-family: Inter; font-weight: 400; line-height: 26px; letter-spacing: 0.04px; word-wrap: break-word; z-index: 5;">The subsequent terms and conditions govern the provision of services by Mould & Restoration Co. By agreeing to and scheduling the services outlined in this report, you, herein referred to as the 'Client', are implicitly agreeing to the stipulated terms and conditions.</div>

            <div style="left: 36.65px; top: 340px; position: absolute; color: #150DB8; font-size: 27px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0869px; text-decoration: underline; word-wrap: break-word; z-index: 5;">WARRANTY</div>

            <div style="width: 689px; left: 39px; top: 385px; position: absolute; color: black; font-size: 17px; font-family: Inter; font-weight: 400; line-height: 26px; letter-spacing: 0.035px; word-wrap: break-word; z-index: 5;">Mould & Restoration Co. provides a 12-month warranty on all services rendered to eradicate mould from affected locations. The warranty holds under the subsequent circumstances:</div>

            <div style="width: 707px; left: 40px; top: 490px; position: absolute; color: black; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 26px; letter-spacing: 0.035px; word-wrap: break-word; z-index: 5;">
                • The root cause of the mould issue has been addressed, and all the recommendations given in the report have been actioned.<br/><br/>
                • No natural disasters or unforeseen events compromising the structure of the premises have occurred after our services.<br/><br/>
                • The areas serviced have not undergone subsequent alterations or repairs.<br/><br/>
                • Should there be any concerns regarding the work performed, the Client should notify us within 5 business days post service completion.<br/><br/>
                • The provided invoice is settled in full within a maximum of 30 days from the invoice date.
            </div>
        </div>
    </div>

    <!-- Page 8: Terms & Conditions - Payment Terms -->
    <div class="report-page page-break">
        <div style="width: 794px; height: 1123px; position: relative; background: white; overflow: hidden">
            <div style="width: 794px; height: 1124px; left: 0; top: 0; position: absolute; background: linear-gradient(180deg, rgba(21, 13, 184, 0.02) 0%, rgba(21, 13, 184, 0.05) 100%); z-index: 0;"></div>

            <!-- Logo -->
            <div style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; background: #121D73; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; z-index: 10;">MRC</div>

            <div style="left: 37px; top: 39px; position: absolute; color: black; font-size: 56px; font-family: Inter; font-weight: 400; line-height: 56px; letter-spacing: 0.2309px; word-wrap: break-word; z-index: 5;">TERMS &</div>
            <div style="left: 37px; top: 95px; position: absolute; color: #150DB8; font-size: 56px; font-family: Inter; font-weight: 400; line-height: 56px; letter-spacing: 0.2309px; word-wrap: break-word; z-index: 5;">CONDITIONS</div>

            <div style="left: 36.6px; top: 204px; position: absolute; color: #150DB8; font-size: 28px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.0918px; text-decoration: underline; word-wrap: break-word; z-index: 5;">PAYMENT TERMS</div>

            <div style="width: 707px; left: 40px; top: 261.5px; position: absolute; color: black; font-size: 16px; font-family: Inter; font-weight: 400; line-height: 24px; letter-spacing: 0.035px; word-wrap: break-word; z-index: 5;">
                Our invoicing procedures and charges are delineated in our Customer Relationship Agreement.<br/><br/>
                Payments are to be made by the due date specified on the invoice. We accept payments in cash, visa, mastercard, and cheque.<br/><br/>
                Any account unsettled for over 60 days will be reported to our credit reporting agency, potentially impacting your credit history for the next five years. Mould & Restoration Co. also reserves the prerogative to initiate legal proceedings for the recovery of any unpaid amounts.<br/><br/>
                In the event of default, the Client will be responsible for covering all collection-related costs, including any legal and court fees should Mould & Restoration Co. pursue the Client for payment.
            </div>

            <div style="width: 347px; left: 48px; top: 550px; position: absolute; color: #E30000; font-size: 17px; font-family: Inter; font-weight: 400; line-height: 26px; letter-spacing: 0.04px; word-wrap: break-word; z-index: 5;">NOTE: Acceptance of the above terms and conditions is inferred upon the scheduling of services as detailed in the provided report.</div>
        </div>
    </div>

    <!-- Page 9: Remember Us - Contact Information -->
    <div class="report-page">
        <div style="width: 794px; height: 1123px; position: relative; background: linear-gradient(135deg, #121D73 0%, #150DB8 50%, #0a0a0a 100%);">
            <div style="width: 100%; left: 0; top: 70px; position: absolute; text-align: center; color: white; font-size: 59px; font-family: Inter; font-weight: 400; line-height: 65px; letter-spacing: 0.25px; word-wrap: break-word; z-index: 5;">REMEMBER US FOR</div>
            <div style="width: 100%; left: 0; top: 140px; position: absolute; text-align: center; color: #7B73FF; font-size: 53px; font-family: Inter; font-weight: 400; line-height: 60px; letter-spacing: 0.22px; word-wrap: break-word; z-index: 5;">MOULD REMEDIATION</div>

            <!-- Contact Info -->
            <div style="position: absolute; left: 147px; top: 309px; z-index: 100; width: 600px;">
                <div style="color: #FFFFFF; font-size: 23px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.069px; margin-bottom: 6px;">BUSINESS HOURS</div>
                <div style="color: #FFFFFF; font-size: 19px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.054px;">MONDAY TO SUNDAY - 7AM TO 7PM</div>
            </div>

            <div style="position: absolute; left: 147px; top: 430px; z-index: 100; width: 600px;">
                <div style="color: #FFFFFF; font-size: 23px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.069px; margin-bottom: 10px;">EMAIL</div>
                <div style="color: #FFFFFF; font-size: 19px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.045px;">admin@mouldandrestoration.com.au</div>
            </div>

            <div style="position: absolute; left: 147px; top: 526px; z-index: 100; width: 600px;">
                <div style="color: #FFFFFF; font-size: 23px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.069px; margin-bottom: 10px;">WEBSITE</div>
                <div style="color: #FFFFFF; font-size: 19px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.045px;">mouldandrestoration.com.au</div>
            </div>

            <div style="position: absolute; left: 147px; top: 632px; z-index: 100; width: 600px;">
                <div style="color: #FFFFFF; font-size: 23px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.069px; margin-bottom: 10px;">PHONE</div>
                <div style="color: #FFFFFF; font-size: 19px; font-family: Inter; font-weight: 400; line-height: normal; letter-spacing: 0.045px;">1800 954 117</div>
            </div>

            <div style="position: absolute; right: 58px; bottom: 100px; color: white; font-size: 24px; font-family: Inter; font-weight: 400; line-height: 36px; text-align: right; z-index: 10;">
                <div>Restoring your spaces,</div>
                <div>protecting your health.</div>
            </div>
        </div>
    </div>

</body>
</html>
`

    // Generate the populated HTML
    const populatedHtml = generateReportHtml(inspection as Inspection, templateHtml, inspectorName)

    // Calculate new version number
    const newVersion = regenerate ? (inspection.pdf_version || 0) + 1 : (inspection.pdf_version || 1)

    // If returnHtml is true, just return the HTML for client-side PDF generation
    if (returnHtml) {
      // Update the inspection record
      await supabase
        .from('inspections')
        .update({
          pdf_version: newVersion,
          pdf_generated_at: new Date().toISOString()
        })
        .eq('id', inspectionId)

      return new Response(
        JSON.stringify({
          success: true,
          html: populatedHtml,
          version: newVersion,
          inspectionId,
          generatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For server-side PDF generation, we'll convert HTML to PDF
    // Using a simple approach: store the HTML and let client handle PDF conversion
    // In production, you could integrate with services like:
    // - Gotenberg (self-hosted)
    // - DocRaptor (API)
    // - Browserless (API)

    // Generate a unique filename
    const timestamp = Date.now()
    const filename = `inspection-${inspectionId}-v${newVersion}-${timestamp}.html`

    // Upload HTML to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspection-reports')
      .upload(filename, populatedHtml, {
        contentType: 'text/html',
        upsert: true
      })

    if (uploadError) {
      console.error('Failed to upload HTML:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to save report', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('inspection-reports')
      .getPublicUrl(filename)

    const reportUrl = urlData.publicUrl

    // Update the inspection record
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        pdf_url: reportUrl,
        pdf_version: newVersion,
        pdf_generated_at: new Date().toISOString()
      })
      .eq('id', inspectionId)

    if (updateError) {
      console.error('Failed to update inspection:', updateError)
    }

    // Log to pdf_versions for audit trail
    const { error: versionError } = await supabase
      .from('pdf_versions')
      .insert({
        inspection_id: inspectionId,
        version_number: newVersion,
        pdf_url: reportUrl,
        file_size_bytes: new TextEncoder().encode(populatedHtml).length,
        changes_made: regenerate ? { type: 'regeneration', timestamp: new Date().toISOString() } : null
      })

    if (versionError) {
      console.error('Failed to log version:', versionError)
    }

    console.log(`PDF generated successfully: ${reportUrl}`)

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: reportUrl,
        version: newVersion,
        inspectionId,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-inspection-pdf:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to generate PDF: ${errorMessage}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
