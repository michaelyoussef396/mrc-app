// Supabase Edge Function: generate-inspection-pdf
// Generates PDF report by populating HTML template with inspection data
// Template is fetched from Supabase Storage (pdf-templates bucket)
// Returns: Populated HTML for client-side PDF generation OR stored HTML URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Static PDF assets hosted in Supabase Storage (public bucket)
const ASSET_BASE = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-assets'
const TEMPLATE_URL = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-templates/inspection-report-template-final.html'

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
  mould_description: string
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
  external_moisture: number | null
}

interface Photo {
  id: string
  storage_path: string
  photo_type: string
  caption: string
  area_id?: string
  subfloor_id?: string
}

interface SubfloorData {
  id: string
  inspection_id: string
  observations: string | null
  comments: string | null
  landscape: string | null
  sanitation_required: boolean
  racking_required: boolean
  treatment_time_minutes: number | null
}

interface SubfloorReading {
  id: string
  subfloor_id: string
  reading_order: number
  moisture_percentage: number | null
  location: string | null
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
  problem_analysis_content?: string
  demolition_content?: string
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
  subfloor_required: boolean
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
  if (area.mould_description && area.mould_description.trim()) {
    return area.mould_description.trim()
  }

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
  const invalidValues = ['attention to', 'requested by', 'directed to', 'not specified', 'n/a', '']

  if (primary && !invalidValues.includes(primary.toLowerCase().trim())) {
    return primary
  }

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

// Convert markdown to HTML for PDF display
function markdownToHtml(text: string | null | undefined): string {
  if (!text) return ''

  let html = text

  // Convert bold **text** to <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Convert italic *text* to <em>text</em> (but not if part of bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')

  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight: 600; margin-top: 12px; margin-bottom: 4px;">$1</div>')
  html = html.replace(/^## (.+)$/gm, '<div style="font-weight: 600; font-size: 16px; margin-top: 16px; margin-bottom: 6px;">$1</div>')
  html = html.replace(/^# (.+)$/gm, '<div style="font-weight: 700; font-size: 18px; margin-top: 20px; margin-bottom: 8px;">$1</div>')

  // Convert bullet points
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
  html = html.replace(/<p style="margin: 8px 0;"><\/p>/g, '')

  return html
}

// Strip all markdown to plain text
function stripMarkdown(text: string | null | undefined): string {
  if (!text) return ''

  let plain = text
  plain = plain.replace(/\*\*([^*]+)\*\*/g, '$1')
  plain = plain.replace(/\*([^*]+)\*/g, '$1')
  plain = plain.replace(/^#{1,3}\s+/gm, '')
  plain = plain.replace(/^[-*•]\s+/gm, '• ')
  plain = plain.replace(/\n{3,}/g, '\n\n')

  return plain.trim()
}

// Photo signed URLs map (populated during request processing)
let photoSignedUrls: Map<string, string> = new Map()

// Get photo URL from storage path (uses pre-generated signed URLs)
function getPhotoUrl(storagePath: string): string {
  if (!storagePath) return ''
  return photoSignedUrls.get(storagePath) || ''
}

// Parse problem_analysis_content markdown into individual sub-sections
// The AI generates one big markdown blob with **BOLD HEADERS** separating sections
function parseProblemAnalysis(content: string | null | undefined): Record<string, string> {
  const sections: Record<string, string> = {
    what_we_discovered: '',
    identified_causes: '',
    contributing_factors: '',
    why_this_happened: '',
    immediate_actions: '',
    long_term_protection: '',
    what_success_looks_like: '',
    timeline_text: '',
  }

  if (!content) return sections

  // Split by bold headers (with or without emoji prefixes)
  const headerPatterns: [RegExp, string][] = [
    [/\*\*(?:🔍\s*)?WHAT WE DISCOVERED\*\*/i, 'what_we_discovered'],
    [/\*\*(?:🔍\s*)?IDENTIFIED CAUSES\*\*/i, 'identified_causes'],
    [/\*\*(?:📋\s*)?CONTRIBUTING FACTORS\*\*/i, 'contributing_factors'],
    [/\*\*(?:WHY THIS HAPPENED)\*\*/i, 'why_this_happened'],
    [/\*\*(?:📋\s*)?RECOMMENDATIONS\*\*/i, '_recommendations'], // parent header, skip
    [/\*\*(?:IMMEDIATE ACTIONS(?:\s+WEEK\s*\d*)?)\*\*/i, 'immediate_actions'],
    [/\*\*(?:LONG[\s-]*TERM PROTECTION)\*\*/i, 'long_term_protection'],
    [/\*\*(?:WHAT SUCCESS LOOKS LIKE)\*\*/i, 'what_success_looks_like'],
    [/\*\*(?:TIMELINE)\*\*/i, 'timeline_text'],
  ]

  // Find positions of all headers
  const positions: { index: number; end: number; key: string }[] = []
  for (const [pattern, key] of headerPatterns) {
    const match = content.match(pattern)
    if (match && match.index !== undefined) {
      positions.push({ index: match.index, end: match.index + match[0].length, key })
    }
  }

  // Sort by position
  positions.sort((a, b) => a.index - b.index)

  // Extract content between headers
  for (let i = 0; i < positions.length; i++) {
    const current = positions[i]
    const nextStart = i + 1 < positions.length ? positions[i + 1].index : content.length
    const sectionContent = content.slice(current.end, nextStart).trim()

    if (current.key !== '_recommendations' && sectionContent) {
      sections[current.key] = sectionContent
    }
  }

  // If no headers found, put everything in what_we_discovered
  if (positions.length === 0 && content.trim()) {
    sections.what_we_discovered = content.trim()
  }

  return sections
}

// ===================================================================
// TEMPLATE POPULATION FUNCTIONS
// ===================================================================

// Extract the Areas Inspected page block from the template
// The template has a single Area page with {{area_*}} placeholders
// We duplicate it once per inspected area
function duplicateAreaPages(html: string, areas: InspectionArea[] | undefined, photos: Photo[] | undefined): string {
  // Find the Area page block: between "Page 8: Areas Inspected" comment and "Page 9:" comment
  const areaPageRegex = /(<!-- Page 8: Areas Inspected[\s\S]*?<\/div>\s*<\/div>)\s*(?=\s*<!-- Page 9)/
  const match = html.match(areaPageRegex)

  if (!match) {
    console.warn('Could not find Areas Inspected page block in template')
    return html
  }

  const areaTemplate = match[1]

  if (!areas || areas.length === 0) {
    // No areas — replace with a "None" page
    const emptyPage = areaTemplate
      .replace(/\{\{area_name\}\}/g, 'None')
      .replace(/\{\{area_temperature\}\}/g, '-')
      .replace(/\{\{area_humidity\}\}/g, '-')
      .replace(/\{\{area_dew_point\}\}/g, '-')
      .replace(/\{\{visible_mould\}\}/g, 'N/A')
      .replace(/\{\{internal_moisture\}\}/g, '-')
      .replace(/\{\{external_moisture\}\}/g, '-')
      .replace(/\{\{area_photo_[1-4]\}\}/g, '')
      .replace(/\{\{area_infrared_photo\}\}/g, '')
      .replace(/\{\{area_natural_infrared_photo\}\}/g, '')
      .replace(/\{\{area_notes\}\}/g, 'No areas were inspected during this assessment.')
      .replace(/\{\{extra_notes\}\}/g, '')

    return html.replace(areaPageRegex, emptyPage + '\n\n')
  }

  // Generate one page per area
  const areaPages = areas.map(area => {
    let page = areaTemplate
    const areaPhotos = photos?.filter(p => p.area_id === area.id) || []

    // Environmental readings
    page = page.replace(/\{\{area_name\}\}/g, area.area_name || 'Unnamed Area')
    page = page.replace(/\{\{area_temperature\}\}/g, `${area.temperature || 0}°C`)
    page = page.replace(/\{\{area_humidity\}\}/g, `${area.humidity || 0}%`)
    page = page.replace(/\{\{area_dew_point\}\}/g, `${area.dew_point || 0}°C`)

    // Mould description
    const mouldLocations = getMouldDescription(area)
    page = page.replace(/\{\{visible_mould\}\}/g, mouldLocations)

    // Moisture readings
    const moistureReadings = area.moisture_readings?.sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0)) || []
    const internalMoisture = moistureReadings.find(r => r.title?.toLowerCase().includes('internal')) || moistureReadings[0]
    page = page.replace(/\{\{internal_moisture\}\}/g, internalMoisture?.moisture_percentage != null ? `${internalMoisture.moisture_percentage}%` : '-')
    page = page.replace(/\{\{external_moisture\}\}/g, area.external_moisture != null ? `${area.external_moisture}%` : '-')

    // Area photos (regular, non-infrared)
    const regularPhotos = areaPhotos.filter(p => p.caption !== 'infrared' && p.caption !== 'natural_infrared')
    for (let i = 1; i <= 4; i++) {
      const photo = regularPhotos[i - 1]
      const url = photo?.storage_path ? getPhotoUrl(photo.storage_path) : ''
      page = page.replace(new RegExp(`\\{\\{area_photo_${i}\\}\\}`, 'g'), url)
    }

    // Infrared photos
    const infraredPhoto = areaPhotos.find(p => p.caption === 'infrared')
    const naturalInfraredPhoto = areaPhotos.find(p => p.caption === 'natural_infrared')
    page = page.replace(/\{\{area_infrared_photo\}\}/g, infraredPhoto?.storage_path ? getPhotoUrl(infraredPhoto.storage_path) : '')
    page = page.replace(/\{\{area_natural_infrared_photo\}\}/g, naturalInfraredPhoto?.storage_path ? getPhotoUrl(naturalInfraredPhoto.storage_path) : '')

    // Notes
    page = page.replace(/\{\{area_notes\}\}/g, area.comments || 'No notes recorded for this area.')
    page = page.replace(/\{\{extra_notes\}\}/g, infraredPhoto || naturalInfraredPhoto
      ? 'Thermal imaging reveals moisture patterns not visible to the naked eye.'
      : '')

    return page
  }).join('\n\n')

  return html.replace(areaPageRegex, areaPages + '\n\n')
}

// Handle the Subfloor page — remove if not required, populate if present
function handleSubfloorPage(
  html: string,
  inspection: Inspection,
  subfloorData: SubfloorData | null,
  subfloorReadings: SubfloorReading[],
  subfloorPhotos: Photo[]
): string {
  // Find the Subfloor page block: between "Page 9: Subfloor" and "Page 10:"
  const subfloorPageRegex = /\s*<!-- Page 9: Subfloor[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 10)/

  if (!inspection.subfloor_required || !subfloorData) {
    // Remove the entire subfloor page
    return html.replace(subfloorPageRegex, '\n\n')
  }

  // Populate subfloor placeholders
  // Photos (up to 10)
  for (let i = 1; i <= 10; i++) {
    const photo = subfloorPhotos[i - 1]
    const url = photo?.storage_path ? getPhotoUrl(photo.storage_path) : ''
    html = html.replace(new RegExp(`\\{\\{subfloor_photo_${i}\\}\\}`, 'g'), url)
  }

  // Text fields
  html = html.replace(/\{\{subfloor_observation\}\}/g, subfloorData.observations || 'No observations recorded.')
  html = html.replace(/\{\{subfloor_landscape\}\}/g, subfloorData.landscape
    ? subfloorData.landscape.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : 'Not specified')
  html = html.replace(/\{\{subfloor_comments\}\}/g, subfloorData.comments || 'No comments recorded.')

  // Moisture levels - format from readings
  const moistureLevels = subfloorReadings.length > 0
    ? subfloorReadings
        .sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0))
        .map(r => `${r.location || 'Location ' + (r.reading_order + 1)}: ${r.moisture_percentage ?? '-'}%`)
        .join('\n')
    : 'No moisture readings recorded.'
  html = html.replace(/\{\{subfloor_moisture_levels\}\}/g, moistureLevels)

  return html
}

// Generate the full populated HTML report
function generateReportHtml(
  inspection: Inspection,
  templateHtml: string,
  inspectorName: string,
  subfloorData: SubfloorData | null,
  subfloorReadings: SubfloorReading[],
  subfloorPhotos: Photo[]
): string {
  const lead = inspection.lead

  // Build full property address
  const propertyAddress = lead ? [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode
  ].filter(Boolean).join(', ') : 'Address not available'

  // Build examined areas list
  const examinedAreas = inspection.areas?.map(a => a.area_name).join(', ') || 'None'

  // Get cover photo - prioritize front_house, then general, then first outdoor photo
  const frontHousePhoto = inspection.photos?.find(p => p.caption === 'front_house')
  const generalPhoto = inspection.photos?.find(p => p.photo_type === 'general')
  const firstOutdoorPhoto = inspection.photos?.find(p => p.photo_type === 'outdoor')
  const coverPhoto = frontHousePhoto || generalPhoto || firstOutdoorPhoto
  const coverPhotoUrl = coverPhoto?.storage_path ? getPhotoUrl(coverPhoto.storage_path) : ''

  // Outdoor photos
  const outdoorPhotos = inspection.photos?.filter(p => p.photo_type === 'outdoor') || []

  // Treatment plan
  const treatmentMethods = getTreatmentMethods(inspection)
  const equipmentList = getEquipmentList(inspection)

  // Problem analysis content — parse into sub-sections for template placeholders
  const problemSections = parseProblemAnalysis(
    inspection.problem_analysis_content || inspection.ai_summary_text
  )
  const defaultAnalysis = `During our comprehensive inspection at ${propertyAddress}, we identified mould growth in the examined areas requiring professional treatment.`

  // Demolition content — use AI-generated field, fall back to area descriptions
  const demolitionAreas = inspection.areas?.filter(a => a.demolition_required) || []
  const demolitionContent = inspection.demolition_content
    ? markdownToHtml(inspection.demolition_content)
    : demolitionAreas.length > 0
      ? demolitionAreas.map(a => `<strong>${a.area_name}:</strong> ${a.demolition_description || 'Demolition work required.'}`).join('<br/><br/>')
      : 'No demolition work required for this inspection.'

  // Equipment pricing
  const dehumidifierPrice = inspection.commercial_dehumidifier_qty > 0 ? `$132/day × ${inspection.commercial_dehumidifier_qty}` : '$132/day'
  const airMoverPrice = inspection.air_movers_qty > 0 ? `$46/day × ${inspection.air_movers_qty}` : '$46/day'
  const rcdBoxPrice = inspection.rcd_box_qty > 0 ? `$5/day × ${inspection.rcd_box_qty}` : '$5/day'

  // Start replacing placeholders in template
  let html = templateHtml

  // Replace asset paths with absolute Supabase Storage URLs
  html = html.replace(/\.\/assets\//g, `${ASSET_BASE}/assets/`)
  html = html.replace(/\.\/fonts\//g, `${ASSET_BASE}/fonts/`)
  // Template uses /pages/ and /assets/ for static backgrounds, logos, SVGs
  html = html.replace(/src="\/pages\//g, `src="${ASSET_BASE}/pages/`)
  html = html.replace(/src="\/assets\//g, `src="${ASSET_BASE}/assets/`)
  html = html.replace(/url\('\/pages\//g, `url('${ASSET_BASE}/pages/`)

  // ===== PAGE 1: COVER =====
  html = html.replace(/\{\{ordered_by\}\}/g, getValidValue(inspection.requested_by, lead?.full_name, 'Property Owner'))
  html = html.replace(/\{\{inspector\}\}/g, inspectorName)
  html = html.replace(/\{\{inspection_date\}\}/g, formatDate(inspection.inspection_date))
  html = html.replace(/\{\{directed_to\}\}/g, getValidValue(inspection.attention_to, lead?.full_name, 'Property Owner'))
  html = html.replace(/\{\{property_type\}\}/g, lead?.property_type || inspection.dwelling_type || 'Residential')
  html = html.replace(/\{\{examined_areas\}\}/g, examinedAreas)
  html = html.replace(/\{\{cover_photo_url\}\}/g, coverPhotoUrl)
  html = html.replace(/\{\{property_address\}\}/g, propertyAddress)

  // ===== PAGE 2: VALUE PROPOSITION =====
  html = html.replace(/\{\{what_we_found_text\}\}/g,
    markdownToHtml(inspection.what_we_found_text) ||
    markdownToHtml(inspection.ai_summary_text) ||
    'Summary not yet generated.')
  html = html.replace(/\{\{what_we_will_do_text\}\}/g,
    markdownToHtml(inspection.what_we_will_do_text) ||
    `We'll set up professional equipment including ${equipmentList || 'air scrubbers'}. Treatment will include ${treatmentMethods || 'standard mould removal procedures'}.`)
  html = html.replace(/\{\{what_you_get_text\}\}/g,
    markdownToHtml(inspection.what_you_get_text) ||
    `Professional mould remediation with ${treatmentMethods}. Equipment deployment: ${equipmentList}. 12-month warranty on all treated areas.`)

  // ===== PROBLEM ANALYSIS (sub-sections) =====
  html = html.replace(/\{\{what_we_discovered\}\}/g, stripMarkdown(problemSections.what_we_discovered) || defaultAnalysis)
  html = html.replace(/\{\{identified_causes\}\}/g, stripMarkdown(problemSections.identified_causes) || 'Causes to be determined after full analysis.')
  html = html.replace(/\{\{contributing_factors\}\}/g, stripMarkdown(problemSections.contributing_factors) || '')
  html = html.replace(/\{\{why_this_happened\}\}/g, stripMarkdown(problemSections.why_this_happened) || '')
  html = html.replace(/\{\{immediate_actions\}\}/g, stripMarkdown(problemSections.immediate_actions) || 'Professional mould treatment recommended.')
  html = html.replace(/\{\{long_term_protection\}\}/g, stripMarkdown(problemSections.long_term_protection) || '')
  html = html.replace(/\{\{what_success_looks_like\}\}/g, stripMarkdown(problemSections.what_success_looks_like) || '')
  html = html.replace(/\{\{timeline_text\}\}/g, stripMarkdown(problemSections.timeline_text) || '')

  // ===== DEMOLITION =====
  html = html.replace(/\{\{demolition_content\}\}/g, demolitionContent)

  // ===== PAGE 7: OUTDOOR ENVIRONMENT =====
  html = html.replace(/\{\{outdoor_temperature\}\}/g, String(inspection.outdoor_temperature || 0))
  html = html.replace(/\{\{outdoor_humidity\}\}/g, String(inspection.outdoor_humidity || 0))
  html = html.replace(/\{\{outdoor_dew_point\}\}/g, String(inspection.outdoor_dew_point || 0))
  html = html.replace(/\{\{outdoor_photo_1\}\}/g, outdoorPhotos[0]?.storage_path ? getPhotoUrl(outdoorPhotos[0].storage_path) : '')
  html = html.replace(/\{\{outdoor_photo_2\}\}/g, outdoorPhotos[1]?.storage_path ? getPhotoUrl(outdoorPhotos[1].storage_path) : '')
  html = html.replace(/\{\{outdoor_photo_3\}\}/g, outdoorPhotos[2]?.storage_path ? getPhotoUrl(outdoorPhotos[2].storage_path) : '')

  // ===== PAGE 8: AREAS INSPECTED (duplicate per area) =====
  html = duplicateAreaPages(html, inspection.areas, inspection.photos)

  // ===== PAGE 9: SUBFLOOR (conditional) =====
  html = handleSubfloorPage(html, inspection, subfloorData, subfloorReadings, subfloorPhotos)

  // ===== PAGE 10: VISUAL MOULD CLEANING ESTIMATE =====
  html = html.replace(/\{\{option_1_price\}\}/g, formatCurrency(inspection.subtotal_ex_gst))
  html = html.replace(/\{\{option_2_price\}\}/g, formatCurrency(inspection.total_inc_gst))
  html = html.replace(/\{\{equipment_dehumidifier\}\}/g, dehumidifierPrice)
  html = html.replace(/\{\{equipment_air_mover\}\}/g, airMoverPrice)
  html = html.replace(/\{\{equipment_rcd_box\}\}/g, rcdBoxPrice)
  html = html.replace(/\{\{equipment_max_days\}\}/g, '5 days')

  // Clean up any remaining unreplaced placeholders
  html = html.replace(/\{\{[^}]+\}\}/g, '')

  return html
}

// ===================================================================
// MAIN REQUEST HANDLER
// ===================================================================

Deno.serve(async (req) => {
  console.log('Request received:', req.method, req.url)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
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

    // ===== STEP 1: Fetch inspection data with all related tables =====
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

    // ===== STEP 2: Fetch subfloor data if required =====
    let subfloorData: SubfloorData | null = null
    let subfloorReadings: SubfloorReading[] = []
    let subfloorPhotos: Photo[] = []

    if (inspection.subfloor_required) {
      console.log('Subfloor required — fetching subfloor data...')

      const { data: sfData } = await supabase
        .from('subfloor_data')
        .select('*')
        .eq('inspection_id', inspectionId)
        .single()

      if (sfData) {
        subfloorData = sfData as SubfloorData

        // Fetch subfloor moisture readings
        const { data: sfReadings } = await supabase
          .from('subfloor_readings')
          .select('*')
          .eq('subfloor_id', sfData.id)
          .order('reading_order', { ascending: true })

        subfloorReadings = (sfReadings || []) as SubfloorReading[]

        // Fetch subfloor photos — try by subfloor_id first, fall back to photo_type
        // Photos are already fetched in the main query, so also check those
        const { data: sfPhotos } = await supabase
          .from('photos')
          .select('*')
          .eq('subfloor_id', sfData.id)

        if (sfPhotos && sfPhotos.length > 0) {
          subfloorPhotos = sfPhotos as Photo[]
        } else {
          // Fallback: photos may have null subfloor_id but photo_type='subfloor'
          subfloorPhotos = (inspection.photos || []).filter(
            (p: any) => p.photo_type === 'subfloor'
          ) as Photo[]
        }
        console.log(`Subfloor: ${subfloorReadings.length} readings, ${subfloorPhotos.length} photos`)
      } else {
        console.log('No subfloor data found despite subfloor_required=true')
      }
    }

    // ===== STEP 3: Generate signed URLs for all photos =====
    const inspectorName = inspection.inspector_name || 'Inspector'
    const allPhotos = [
      ...(inspection.photos || []),
      ...subfloorPhotos
    ]

    photoSignedUrls = new Map()
    if (allPhotos.length > 0) {
      console.log(`Generating signed URLs for ${allPhotos.length} photos...`)

      for (const photo of allPhotos) {
        if (photo.storage_path && !photoSignedUrls.has(photo.storage_path)) {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('inspection-photos')
              .createSignedUrl(photo.storage_path, 3600)

            if (signedUrlData?.signedUrl && !signedUrlError) {
              photoSignedUrls.set(photo.storage_path, signedUrlData.signedUrl)
            } else {
              console.error(`Failed signed URL for ${photo.storage_path}:`, signedUrlError)
            }
          } catch (err) {
            console.error(`Error signed URL for ${photo.storage_path}:`, err)
          }
        }
      }

      console.log(`Generated ${photoSignedUrls.size} signed URLs`)
    }

    // ===== STEP 4: Fetch the HTML template from Storage =====
    console.log('Fetching template from Storage...')
    const templateResponse = await fetch(TEMPLATE_URL)

    if (!templateResponse.ok) {
      console.error(`Failed to fetch template: ${templateResponse.status}`)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch PDF template from storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const templateHtml = await templateResponse.text()
    console.log(`Template fetched: ${(templateHtml.length / 1024).toFixed(1)} KB`)

    // ===== STEP 5: Populate the template =====
    const populatedHtml = generateReportHtml(
      inspection as Inspection,
      templateHtml,
      inspectorName,
      subfloorData,
      subfloorReadings,
      subfloorPhotos
    )

    // ===== STEP 6: Save and return =====
    const newVersion = regenerate ? (inspection.pdf_version || 0) + 1 : (inspection.pdf_version || 1)

    if (returnHtml) {
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

    // Store populated HTML to inspection-reports bucket
    const timestamp = Date.now()
    const filename = `inspection-${inspectionId}-v${newVersion}-${timestamp}.html`

    const { error: uploadError } = await supabase.storage
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

    const { data: urlData } = supabase.storage
      .from('inspection-reports')
      .getPublicUrl(filename)

    const reportUrl = urlData.publicUrl

    // Update inspection record
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
