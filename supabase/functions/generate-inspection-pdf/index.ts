// Supabase Edge Function: generate-inspection-pdf
// Generates PDF report by populating HTML template with inspection data
// Template is fetched from Supabase Storage (pdf-templates bucket)
// Returns: Populated HTML for client-side PDF generation OR stored HTML URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

// Static PDF assets hosted in Supabase Storage (public bucket)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ASSET_BASE = `${SUPABASE_URL}/storage/v1/object/public/pdf-assets`
const TEMPLATE_URL = `${SUPABASE_URL}/storage/v1/object/public/pdf-templates/inspection-report-template-final.html`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, baggage, sentry-trace',
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
}

interface InspectionArea {
  id: string
  area_name: string
  area_order: number
  mould_description: string
  mould_visible_locations: string[]
  mould_visible_custom: string
  comments: string
  extra_notes: string | null
  temperature: number
  humidity: number
  dew_point: number
  job_time_minutes: number
  demolition_required: boolean
  demolition_time_minutes: number
  demolition_description: string
  moisture_readings?: MoistureReading[]
  external_moisture: number | null
  primary_photo_id?: string | null
  // Infrared block — single toggle gates both photos AND observations
  // (matches lead view InspectionDataDisplay.tsx:247, :314, :352).
  infrared_enabled: boolean | null
  infrared_observation_no_active: boolean | null
  infrared_observation_water_infiltration: boolean | null
  infrared_observation_past_ingress: boolean | null
  infrared_observation_condensation: boolean | null
  infrared_observation_missing_insulation: boolean | null
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
  labour_cost_ex_gst: number
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
  hepa_air_scrubber_qty: number | null
  hepa_air_scrubber_days: number | null
  waste_disposal_m3: number | null
  waste_disposal_confirmed_cost: number | null
  treatment_methods: string[] | null
  option_selected: number | null
  option_1_total_inc_gst: number | null
  option_2_total_inc_gst: number | null
  // Both-mode Option 1 ex-GST breakdown. Null on rows saved before these columns existed.
  option_1_labour_ex_gst: number | null
  option_1_equipment_ex_gst: number | null
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

const RequestBodySchema = z.object({
  inspectionId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false),
  returnHtml: z.boolean().optional().default(false),
  // previewOnly: render HTML and return it with ZERO persistence side
  // effects — no inspections UPDATE, no inspection-reports bucket upload, no
  // pdf_versions INSERT. Used by the send-time mismatch guard and by
  // /api/render-pdf's hard_save mode to fetch fresh HTML without bumping the
  // legacy version counter. Implies returnHtml=true.
  previewOnly: z.boolean().optional().default(false),
})
type RequestBody = z.infer<typeof RequestBodySchema>

// Escape user-controlled strings before HTML template interpolation to prevent XSS
function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

// Get mould description - returns comma-separated locations for PDF template
// Template already has "VISIBLE MOULD: " prefix, so we only return the value part
// Mirrors the lead-view fallback shape at
// src/components/leads/InspectionDataDisplay.tsx:259-280:
//   locations (badges) → custom (italic under badges OR sole value) → description.
// 4c4ca0c missed the mould_visible_custom tier entirely, so areas with only
// a custom location (e.g. "Under the ceiling", no checkboxes, no legacy
// description) rendered "VISIBLE MOULD: None observed" while the lead view
// correctly showed the custom text.
function getMouldDescription(area: InspectionArea): string {
  if (area.mould_visible_locations?.length > 0) {
    return area.mould_visible_locations.join(', ')
  }
  if (area.mould_visible_custom?.trim()) {
    return area.mould_visible_custom.trim()
  }
  if (area.mould_description?.trim()) {
    return area.mould_description.trim()
  }
  return 'None observed'
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

// Step descriptions for PDF scope of work — keyed by treatment_methods toggle value
// Option 1 (surface) and Option 2 (comprehensive) have different descriptions for some methods
const STEP_DESCRIPTIONS: Record<string, { label1: string; desc1: string; label2: string; desc2: string }> = {
  'HEPA Vacuuming': {
    label1: 'HEPA Vacuuming',
    desc1: 'All visible mould areas are pre-treated using HEPA-certified vacuuming equipment to reduce surface spore density.',
    label2: 'HEPA Vacuuming',
    desc2: 'All visible mould areas are pre-treated using HEPA-certified vacuuming equipment to reduce surface spore density.',
  },
  'Surface Remediation Treatment': {
    label1: 'Surface Remediation Treatment',
    desc1: 'A specialised surface-level antimicrobial solution is applied to neutralise active mould colonies and inhibit regrowth.',
    label2: 'Deep Penetration Antimicrobial Treatment',
    desc2: 'A commercial-strength antimicrobial solution is injected or applied to penetrate porous substrates and eliminate embedded mould growth within the material.',
  },
  'ULV Fogging - Property': {
    label1: 'ULV Fogging',
    desc1: 'Ultra-Low Volume (ULV) fogging disperses a fine antimicrobial mist into all areas of the affected space, targeting airborne spores and settling into hard-to-reach crevices.',
    label2: 'ULV Fogging (Full Cycle)',
    desc2: 'Comprehensive ULV fogging is carried out in multiple passes, ensuring deep penetration into wall cavities, ceiling voids, and subfloor areas (where accessible).',
  },
  'ULV Fogging - Subfloor': {
    label1: 'ULV Fogging — Subfloor',
    desc1: 'ULV fogging is extended to subfloor areas, treating concealed mould growth and preventing re-contamination from below.',
    label2: 'ULV Fogging — Subfloor',
    desc2: 'ULV fogging is extended to subfloor areas, treating concealed mould growth and preventing re-contamination from below.',
  },
  'Subfloor Remediation': {
    label1: 'Subfloor Remediation',
    desc1: 'Complete subfloor treatment including sanitation, antimicrobial application, and assessment of underfloor timbers and supports.',
    label2: 'Subfloor Remediation',
    desc2: 'Complete subfloor treatment including sanitation, antimicrobial application, and structural assessment of underfloor timbers and supports.',
  },
  // Renamed key (AFD → HEPA Air Scrubber). The legacy 'AFD Installation' key is kept
  // below as a backward-compat alias so inspections persisted before the
  // treatment_methods data migration still render this scope step.
  'HEPA Air Scrubber Installation': {
    label1: 'Air Scrubbing',
    desc1: 'HEPA air scrubbers are deployed to purify the air within the treatment zone, capturing remaining airborne mould spores and particulates.',
    label2: 'Air Scrubbing (Extended)',
    desc2: 'HEPA air scrubbers run for an extended period (minimum 24 hours) post-treatment to ensure all airborne spores are captured and indoor air quality is restored.',
  },
  'AFD Installation': {
    label1: 'Air Scrubbing',
    desc1: 'HEPA air scrubbers are deployed to purify the air within the treatment zone, capturing remaining airborne mould spores and particulates.',
    label2: 'Air Scrubbing (Extended)',
    desc2: 'HEPA air scrubbers run for an extended period (minimum 24 hours) post-treatment to ensure all airborne spores are captured and indoor air quality is restored.',
  },
  'Drying Equipment': {
    label1: 'Drying Equipment',
    desc1: 'Professional drying equipment including commercial dehumidifiers and air movers is installed to reduce moisture levels and prevent mould recurrence.',
    label2: 'Drying Equipment',
    desc2: 'Professional drying equipment including commercial dehumidifiers and air movers is installed to reduce moisture levels and prevent mould recurrence.',
  },
  'Containment and Prep': {
    label1: 'Containment &amp; Preparation',
    desc1: 'Containment and preparation of treatment areas including plastic sheeting barriers and protection of unaffected contents.',
    label2: 'Containment &amp; Preparation',
    desc2: 'Full containment and preparation of treatment areas including plastic sheeting barriers, negative air pressure setup, and protection of unaffected contents.',
  },
  'Material Demolition': {
    label1: 'Material Demolition',
    desc1: 'Controlled removal of mould-affected building materials including plasterboard, insulation, and other compromised substrates.',
    label2: 'Material Demolition',
    desc2: 'Controlled removal of mould-affected building materials including plasterboard, insulation, and other compromised substrates that cannot be effectively treated in-situ.',
  },
  'Cavity Treatment': {
    label1: 'Cavity Treatment',
    desc1: 'Exposed wall cavities and ceiling voids are treated with antimicrobial solution to eliminate hidden mould growth.',
    label2: 'Cavity Treatment',
    desc2: 'Exposed wall cavities and ceiling voids are treated with antimicrobial solution to eliminate hidden mould growth within the building structure.',
  },
  'Debris Removal': {
    label1: 'Debris Removal',
    desc1: 'Safe removal and disposal of all demolished materials and contaminated debris.',
    label2: 'Debris Removal',
    desc2: 'Safe removal and disposal of all demolished materials and contaminated debris in accordance with environmental guidelines.',
  },
}

// Generate numbered scope-of-work steps HTML for the PDF estimate page.
// Type scales with step count so long method lists stay inside the fixed
// description areas on Page 8 (~186px for Option 1, ~194px for Option 2).
function generateScopeStepsHtml(methods: string[], optionType: 1 | 2): string {
  if (!methods || methods.length === 0) return ''
  const known = methods.filter(m => STEP_DESCRIPTIONS[m])
  if (known.length === 0) return ''
  const [fontSize, lineHeight] = known.length <= 3 ? [14, 19] : known.length <= 5 ? [12, 16] : [10, 13]
  const steps = known.map((m, i) => {
    const desc = STEP_DESCRIPTIONS[m]
    const label = optionType === 1 ? desc.label1 : desc.label2
    const text = optionType === 1 ? desc.desc1 : desc.desc2
    const isLast = i === known.length - 1
    return `<div${isLast ? '' : ' style="margin-bottom: 3px;"'}><span style="font-weight: 700;">${i + 1}. ${label} —</span> ${text}</div>`
  })
  return `<div style="font-size: ${fontSize}px; line-height: ${lineHeight}px;">${steps.join('')}</div>`
}

// Get treatment methods as a list
function getTreatmentMethods(inspection: Inspection): string {
  // Prefer the pre-computed array if available
  if (inspection.treatment_methods && inspection.treatment_methods.length > 0) {
    return inspection.treatment_methods.join(', ')
  }
  // Fallback for older inspections without treatment_methods populated
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
  if ((inspection.hepa_air_scrubber_qty ?? 0) > 0) {
    equipment.push(`${inspection.hepa_air_scrubber_qty}x HEPA Air Scrubber`)
  }
  if (inspection.rcd_box_qty > 0) {
    equipment.push(`${inspection.rcd_box_qty}x RCD Safety Box`)
  }
  return equipment.join(', ') || 'None required'
}

// Convert markdown to HTML for PDF display
function markdownToHtml(text: string | null | undefined): string {
  if (!text) return ''

  // Escape HTML entities in the raw text first to prevent injection,
  // but preserve markdown syntax characters (*, #, -, etc.)
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

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

// ===================================================================
// VALUE PROPOSITION MULTI-PAGE OVERFLOW
// ===================================================================

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'spacing'
  html?: string
  text?: string
  height: number
}

// Strip HTML tags for text length estimation
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}

// Estimate the rendered height of an HTML block
// Based on: font-size 20px, line-height 29.7px, width 720px
// Calibrated against actual browser measurements (Feb 2026)
function estimateBlockHeight(html: string): number {
  const LINE_HEIGHT = 29.7
  const CHARS_PER_LINE = 63 // Measured: actual rendering fits ~60-68 chars/line at 720px width
  const PARAGRAPH_MARGIN = 16 // 8px top + 8px bottom from markdownToHtml styles
  const LI_HEIGHT = 34 // line-height + margin-bottom

  // Count <li> elements for list items
  const liMatches = html.match(/<li[^>]*>/g)
  if (liMatches) {
    const listMargin = 16 // ul margin 8px top + 8px bottom
    return liMatches.length * LI_HEIGHT + listMargin
  }

  // For paragraphs and other blocks
  const text = stripHtmlTags(html).trim()
  if (!text) return 0
  const lines = Math.ceil(text.length / CHARS_PER_LINE)
  return Math.max(lines, 1) * LINE_HEIGHT + PARAGRAPH_MARGIN
}

// Split HTML content into block-level elements (<p>, <ul>, <div>)
function splitIntoBlocks(html: string): string[] {
  const blocks: string[] = []
  // Match <p>...</p>, <ul>...</ul>, <div>...</div> blocks
  const blockRegex = /<(?:p|ul|div|ol)[^>]*>[\s\S]*?<\/(?:p|ul|div|ol)>/gi
  let match
  while ((match = blockRegex.exec(html)) !== null) {
    blocks.push(match[0])
  }
  // If no blocks found, wrap entire content as single block
  if (blocks.length === 0 && html.trim()) {
    blocks.push(`<p style="margin: 8px 0;">${html}</p>`)
  }
  return blocks
}

// Generate the VP page header (background + titles + logo)
function vpPageHeader(bgUrl: string, logoUrl: string, isContinuation: boolean): string {
  const titleHtml = isContinuation
    ? `<!-- VALUE PROPOSITION title -->
            <div style="width: 550px; left: 26.5px; top: 28px; position: absolute; color: #000000; font-size: 48px; font-family: 'Garet Heavy'; font-weight: 800; line-height: normal; text-transform: uppercase; letter-spacing: 1.6px; z-index: 10;">VALUE</div>
            <div style="width: 550px; left: 30.65px; top: 80px; position: absolute; color: #121D73; font-size: 48px; font-family: 'Garet Heavy'; font-weight: 800; line-height: normal; text-transform: uppercase; letter-spacing: 1.6px; z-index: 10;">PROPOSITION</div>`
    : `<!-- VALUE / PROPOSITION title -->
            <div style="width: 300px; left: 26.5px; top: 28px; position: absolute; color: #000000; font-size: 70px; font-family: 'Garet Heavy'; font-weight: 800; line-height: normal; text-transform: uppercase; letter-spacing: 1.6px; z-index: 10;">VALUE</div>
            <div style="width: 550px; left: 30.65px; top: 87.5px; position: absolute; color: #121D73; font-size: 67px; font-family: 'Garet Heavy'; font-weight: 800; line-height: normal; text-transform: uppercase; letter-spacing: 1.6px; z-index: 10;">PROPOSITION</div>`

  return `<!-- Background shape -->
            <img src="${bgUrl}" style="width: 906.498px; height: 1162.014px; left: -23.91px; top: -17.35px; position: absolute; display: block;" alt="" />
            ${titleHtml}
            <!-- Logo (top right) -->
            <img style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; object-fit: contain; z-index: 10;" src="${logoUrl}" alt="MRC Logo" />`
}

// Split a paragraph into two parts at the given available height
// Returns fitting (what fits on current page) and remaining (overflow for next page)
function splitParagraphAtHeight(html: string, availableHeight: number): { fitting: string; remaining: string } {
  const LINE_HEIGHT = 29.7
  const CHARS_PER_LINE = 63
  const PARAGRAPH_MARGIN = 16

  const availableForText = availableHeight - PARAGRAPH_MARGIN
  if (availableForText < LINE_HEIGHT * 2) return { fitting: '', remaining: html } // Need at least 2 lines

  const maxLines = Math.floor(availableForText / LINE_HEIGHT)
  const text = stripHtmlTags(html).trim()
  const maxChars = maxLines * CHARS_PER_LINE

  if (maxChars >= text.length) {
    return { fitting: html, remaining: '' } // Entire paragraph fits
  }

  // Find best split point — prefer sentence boundaries
  const searchText = text.substring(0, maxChars)
  let splitAt = -1

  // Try sentence boundary (". " followed by uppercase or text)
  const lastSentence = searchText.lastIndexOf('. ')
  if (lastSentence > maxChars * 0.4) {
    splitAt = lastSentence + 2
  }

  // If no good sentence boundary, try comma or semicolon
  if (splitAt === -1) {
    const lastComma = Math.max(searchText.lastIndexOf(', '), searchText.lastIndexOf('; '))
    if (lastComma > maxChars * 0.4) {
      splitAt = lastComma + 2
    }
  }

  // Last resort: split at word boundary
  if (splitAt === -1) {
    const lastSpace = searchText.lastIndexOf(' ')
    if (lastSpace > maxChars * 0.3) {
      splitAt = lastSpace + 1
    } else {
      splitAt = maxChars
    }
  }

  const fittingText = text.substring(0, splitAt).trim()
  const remainingText = text.substring(splitAt).trim()

  // Extract style from original HTML <p> tag
  const styleMatch = html.match(/<p\s+style="([^"]*)"/)
  const style = styleMatch ? styleMatch[1] : 'margin: 8px 0;'

  return {
    fitting: fittingText ? `<p style="${style}">${fittingText}</p>` : '',
    remaining: remainingText ? `<p style="${style}">${remainingText}</p>` : ''
  }
}

// Fill a single page with as many blocks as possible, splitting paragraphs when needed
function fillPage(blocks: ContentBlock[], maxHeight: number): { pageBlocks: ContentBlock[]; leftover: ContentBlock[] } {
  const pageBlocks: ContentBlock[] = []
  let currentHeight = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (currentHeight + block.height <= maxHeight) {
      // Block fits entirely
      pageBlocks.push(block)
      currentHeight += block.height
    } else if (block.type === 'paragraph' && block.html) {
      // Paragraph doesn't fit — try to split it
      const remainingSpace = maxHeight - currentHeight
      if (remainingSpace >= 80) { // At least ~2-3 lines of space
        const { fitting, remaining } = splitParagraphAtHeight(block.html, remainingSpace)
        if (fitting) {
          pageBlocks.push({ type: 'paragraph', html: fitting, height: estimateBlockHeight(fitting) })
        }
        // Build leftover: remaining text (if any) + rest of blocks
        const leftover: ContentBlock[] = []
        if (remaining) {
          leftover.push({ type: 'paragraph', html: remaining, height: estimateBlockHeight(remaining) })
        }
        leftover.push(...blocks.slice(i + 1))
        return { pageBlocks, leftover }
      } else {
        // Not enough space for meaningful text — push entire block to next page
        return { pageBlocks, leftover: blocks.slice(i) }
      }
    } else {
      // Non-paragraph block doesn't fit — push to next page
      return { pageBlocks, leftover: blocks.slice(i) }
    }
  }

  return { pageBlocks, leftover: [] }
}

// Generate multi-page Value Proposition HTML
function generateValuePropositionPages(
  whatWeFoundHtml: string,
  whatWeWillDoHtml: string,
  bgUrl: string,
  logoUrl: string
): string {
  // Layout constants
  const CONTENT_TOP_FIRST = 195    // Below VALUE/PROPOSITION title on first page
  const CONTENT_TOP_CONT = 140     // Below smaller title on continuation pages (no "continued" label)
  const CONTENT_BOTTOM_MARGIN = 50 // Bottom margin
  const PAGE_HEIGHT = 1123
  const AVAILABLE_FIRST = PAGE_HEIGHT - CONTENT_TOP_FIRST - CONTENT_BOTTOM_MARGIN   // ~878px
  const AVAILABLE_CONT = PAGE_HEIGHT - CONTENT_TOP_CONT - CONTENT_BOTTOM_MARGIN     // ~933px

  const HEADING_HEIGHT = 55    // Section heading (33px font + margins)
  const SECTION_SPACING = 25   // Space between sections

  // Build all content blocks in order
  const allBlocks: ContentBlock[] = []

  // "WHAT WE FOUND" section
  allBlocks.push({ type: 'heading', text: 'WHAT WE FOUND', height: HEADING_HEIGHT })
  for (const block of splitIntoBlocks(whatWeFoundHtml)) {
    allBlocks.push({ type: 'paragraph', html: block, height: estimateBlockHeight(block) })
  }

  // Spacing
  allBlocks.push({ type: 'spacing', height: SECTION_SPACING })

  // "WHAT WE'RE GOING TO DO" section
  allBlocks.push({ type: 'heading', text: "WHAT WE'RE GOING TO DO", height: HEADING_HEIGHT })
  for (const block of splitIntoBlocks(whatWeWillDoHtml)) {
    allBlocks.push({ type: 'paragraph', html: block, height: estimateBlockHeight(block) })
  }

  // Paginate using fillPage (splits paragraphs to fill pages completely)
  const pages: ContentBlock[][] = []
  let remaining = allBlocks
  let isFirstPage = true

  while (remaining.length > 0) {
    const maxHeight = isFirstPage ? AVAILABLE_FIRST : AVAILABLE_CONT
    const { pageBlocks, leftover } = fillPage(remaining, maxHeight)
    if (pageBlocks.length > 0) {
      pages.push(pageBlocks)
    }
    remaining = leftover
    isFirstPage = false
  }

  // Generate HTML for each page
  const pagesHtml: string[] = []
  for (let i = 0; i < pages.length; i++) {
    const isFirst = i === 0
    const isContinuation = !isFirst
    const pageBlocks = pages[i]
    const contentTop = isFirst ? CONTENT_TOP_FIRST : CONTENT_TOP_CONT

    // Build content HTML from blocks
    let contentHtml = ''
    for (const block of pageBlocks) {
      switch (block.type) {
        case 'heading':
          contentHtml += `\n                <div style="color: #000000; font-size: 33px; font-family: 'Garet Heavy'; font-weight: 800; line-height: normal; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">${block.text}</div>`
          break
        case 'paragraph':
          contentHtml += `\n                ${block.html}`
          break
        case 'spacing':
          contentHtml += `\n                <div style="height: ${block.height}px;"></div>`
          break
      }
    }

    const pageComment = isContinuation
      ? `<!-- Page 2${String.fromCharCode(97 + i)}: Value Proposition -->`
      : `<!-- Page 2: Value Proposition -->`

    pagesHtml.push(`${pageComment}
    <div class="report-page page-break">
        <div style="width: 100%; height: 100%; position: relative; background: #FFFFFF; overflow: hidden">
            ${vpPageHeader(bgUrl, logoUrl, isContinuation)}
            <!-- Content container -->
            <div style="position: absolute; left: 30px; top: ${contentTop}px; width: 720px; z-index: 10; color: #252525; font-size: 20px; font-family: 'Galvji'; font-weight: 400; line-height: 29.7px; letter-spacing: 0.5px;">${contentHtml}
            </div>
        </div>
    </div>`)
  }

  return pagesHtml.join('\n\n    ')
}

// Replace the static VP page in the template with dynamically generated multi-page VP
function handleValuePropositionOverflow(html: string, whatWeFoundHtml: string, whatWeWillDoHtml: string): string {
  // Find the VP page block: between "Page 2: Value Proposition" and "Page 3: Areas Inspected"
  const vpPageRegex = /<!-- Page 2: Value Proposition[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 3)/
  const match = html.match(vpPageRegex)

  if (!match) {
    // Fallback: if regex doesn't match, just do placeholder replacement (original behavior)
    return html
  }

  // Extract asset URLs from the matched page (they've already been replaced with absolute URLs)
  const bgMatch = match[0].match(/src="([^"]*background-shape-page2\.svg[^"]*)"/)
  const logoMatch = match[0].match(/src="([^"]*logo-mrc\.png[^"]*)"/)
  const bgUrl = bgMatch ? bgMatch[1] : `${ASSET_BASE}/assets/backgrounds/background-shape-page2.svg`
  const logoUrl = logoMatch ? logoMatch[1] : `${ASSET_BASE}/assets/logos/logo-mrc.png`

  // Generate the multi-page VP HTML
  const vpPagesHtml = generateValuePropositionPages(whatWeFoundHtml, whatWeWillDoHtml, bgUrl, logoUrl)

  // Replace the original VP page with the generated pages
  return html.replace(vpPageRegex, vpPagesHtml + '\n\n    ')
}

// ===================================================================
// NAVY-BOX SECTION MULTI-PAGE OVERFLOW (Problem Analysis, Demolition)
// These sections have: navy blue background box, white text, 17px font
// ===================================================================

interface SectionConfig {
  pageComment: string
  titleHtml: string
  contentTop: number
  navyBoxTop: number
  logoUrl: string
}

// Height estimation for navy-box sections (font-size 17px, line-height 26px, width 674px)
function estimateNavyBoxBlockHeight(html: string): number {
  const LINE_HEIGHT = 26
  const CHARS_PER_LINE = 70
  const PARAGRAPH_MARGIN = 16
  const LI_HEIGHT = 30

  const liMatches = html.match(/<li[^>]*>/g)
  if (liMatches) {
    return liMatches.length * LI_HEIGHT + 16
  }

  const text = stripHtmlTags(html).trim()
  if (!text) return 0
  const lines = Math.ceil(text.length / CHARS_PER_LINE)
  return Math.max(lines, 1) * LINE_HEIGHT + PARAGRAPH_MARGIN
}

// Split paragraph for navy-box sections (17px font, 26px line-height, 674px width)
function splitNavyBoxParagraphAtHeight(html: string, availableHeight: number): { fitting: string; remaining: string } {
  const LINE_HEIGHT = 26
  const CHARS_PER_LINE = 70
  const PARAGRAPH_MARGIN = 16

  const availableForText = availableHeight - PARAGRAPH_MARGIN
  if (availableForText < LINE_HEIGHT * 2) return { fitting: '', remaining: html }

  const maxLines = Math.floor(availableForText / LINE_HEIGHT)
  const text = stripHtmlTags(html).trim()
  const maxChars = maxLines * CHARS_PER_LINE

  if (maxChars >= text.length) return { fitting: html, remaining: '' }

  const searchText = text.substring(0, maxChars)
  let splitAt = -1

  const lastSentence = searchText.lastIndexOf('. ')
  if (lastSentence > maxChars * 0.4) splitAt = lastSentence + 2

  if (splitAt === -1) {
    const lastComma = Math.max(searchText.lastIndexOf(', '), searchText.lastIndexOf('; '))
    if (lastComma > maxChars * 0.4) splitAt = lastComma + 2
  }

  if (splitAt === -1) {
    const lastSpace = searchText.lastIndexOf(' ')
    if (lastSpace > maxChars * 0.3) splitAt = lastSpace + 1
    else splitAt = maxChars
  }

  const fittingText = text.substring(0, splitAt).trim()
  const remainingText = text.substring(splitAt).trim()

  const styleMatch = html.match(/<p\s+style="([^"]*)"/)
  const style = styleMatch ? styleMatch[1] : 'margin: 8px 0;'

  return {
    fitting: fittingText ? `<p style="${style}">${fittingText}</p>` : '',
    remaining: remainingText ? `<p style="${style}">${remainingText}</p>` : ''
  }
}

// Fill a page for navy-box sections (same logic as VP fillPage but using navy-box estimation)
function fillNavyBoxPage(blocks: ContentBlock[], maxHeight: number): { pageBlocks: ContentBlock[]; leftover: ContentBlock[] } {
  const pageBlocks: ContentBlock[] = []
  let currentHeight = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (currentHeight + block.height <= maxHeight) {
      pageBlocks.push(block)
      currentHeight += block.height
    } else if (block.type === 'paragraph' && block.html) {
      const remainingSpace = maxHeight - currentHeight
      if (remainingSpace >= 60) {
        const { fitting, remaining } = splitNavyBoxParagraphAtHeight(block.html, remainingSpace)
        if (fitting) {
          pageBlocks.push({ type: 'paragraph', html: fitting, height: estimateNavyBoxBlockHeight(fitting) })
        }
        const leftover: ContentBlock[] = []
        if (remaining) {
          leftover.push({ type: 'paragraph', html: remaining, height: estimateNavyBoxBlockHeight(remaining) })
        }
        leftover.push(...blocks.slice(i + 1))
        return { pageBlocks, leftover }
      } else {
        return { pageBlocks, leftover: blocks.slice(i) }
      }
    } else {
      return { pageBlocks, leftover: blocks.slice(i) }
    }
  }

  return { pageBlocks, leftover: [] }
}

// Generate multi-page HTML for a navy-box section
function generateNavyBoxSectionPages(contentHtml: string, config: SectionConfig): string {
  const CONTENT_BOTTOM = 65 // 30px page bottom for box + 35px internal padding
  const PAGE_HEIGHT = 1123
  const AVAILABLE = PAGE_HEIGHT - config.contentTop - CONTENT_BOTTOM

  // Build content blocks
  const allBlocks: ContentBlock[] = []
  for (const block of splitIntoBlocks(contentHtml)) {
    allBlocks.push({ type: 'paragraph', html: block, height: estimateNavyBoxBlockHeight(block) })
  }

  // If no content, create single page with default message
  if (allBlocks.length === 0) {
    allBlocks.push({
      type: 'paragraph',
      html: '<p style="margin: 8px 0;">Content not yet generated.</p>',
      height: estimateNavyBoxBlockHeight('<p>Content not yet generated.</p>')
    })
  }

  // Paginate using fillPage with paragraph splitting
  const pages: ContentBlock[][] = []
  let remaining = allBlocks

  while (remaining.length > 0) {
    const { pageBlocks, leftover } = fillNavyBoxPage(remaining, AVAILABLE)
    if (pageBlocks.length > 0) {
      pages.push(pageBlocks)
    }
    remaining = leftover
  }

  // Generate HTML for each page
  const pagesHtml: string[] = []
  for (let i = 0; i < pages.length; i++) {
    const pageBlocks = pages[i]

    let bodyHtml = ''
    for (const block of pageBlocks) {
      if (block.html) bodyHtml += `\n                ${block.html}`
    }

    const comment = i > 0
      ? `${config.pageComment.replace('-->', ` (Page ${i + 1}) -->`)}`
      : config.pageComment

    pagesHtml.push(`${comment}
    <div class="report-page page-break">
        <div style="width: 100%; height: 100%; position: relative; background: #FFFFFF; overflow: hidden">
            ${config.titleHtml}
            <img style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; object-fit: contain; z-index: 10;"
                src="${config.logoUrl}" alt="MRC Logo" />
            <div style="width: 734px; left: 30px; top: ${config.navyBoxTop}px; position: absolute; background: #121D73; border-radius: 20px; bottom: 30px; z-index: 5;"></div>
            <div style="width: 674px; left: 60px; top: ${config.contentTop}px; position: absolute; color: #FFFFFF; font-size: 17px; font-family: 'Galvji'; font-weight: 400; line-height: 26px; letter-spacing: 0.5px; z-index: 10;">${bodyHtml}
            </div>
        </div>
    </div>`)
  }

  return pagesHtml.join('\n\n    ')
}

// Handle PROBLEM ANALYSIS & RECOMMENDATIONS overflow
function handleProblemAnalysisOverflow(html: string, problemContentHtml: string): string {
  // Lookahead Page 7 = Demolition (was Cleaning before page-order restructure)
  const regex = /<!-- Page 6: Problem Analysis[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 7)/
  const match = html.match(regex)

  if (!match) return html

  const logoMatch = match[0].match(/src="([^"]*logo-mrc\.png[^"]*)"/)
  const logoUrl = logoMatch ? logoMatch[1] : `${ASSET_BASE}/assets/logos/logo-mrc.png`

  const config: SectionConfig = {
    pageComment: '<!-- Page 6: Problem Analysis & Recommendations -->',
    titleHtml: `<!-- PROBLEM title -->
            <div style="width: 400px; left: 41px; top: 25px; position: absolute; color: #000000; font-size: 56px; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; line-height: normal; z-index: 10;">PROBLEM</div>
            <div style="width: 650px; left: 40px; top: 85px; position: absolute; color: #121D73; font-size: 23px; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; line-height: normal; z-index: 10;">ANALYSIS &amp; RECOMMENDATIONS</div>`,
    contentTop: 175,
    navyBoxTop: 140,
    logoUrl
  }

  const pagesHtml = generateNavyBoxSectionPages(problemContentHtml, config)
  return html.replace(regex, pagesHtml + '\n\n    ')
}

// Handle DEMOLITION section overflow
function handleDemolitionOverflow(html: string, demolitionContentHtml: string): string {
  const regex = /<!-- Page 7: Demolition[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 8)/
  const match = html.match(regex)

  if (!match) return html

  const logoMatch = match[0].match(/src="([^"]*logo-mrc\.png[^"]*)"/)
  const logoUrl = logoMatch ? logoMatch[1] : `${ASSET_BASE}/assets/logos/logo-mrc.png`

  const config: SectionConfig = {
    pageComment: '<!-- Page 7: Demolition Page -->',
    titleHtml: `<!-- DEMOLITION title -->
            <div style="width: 600px; left: 41px; top: 25px; position: absolute; color: #000000; font-size: 56px; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; line-height: normal; z-index: 10;">DEMOLITION</div>`,
    contentTop: 145,
    navyBoxTop: 110,
    logoUrl
  }

  const pagesHtml = generateNavyBoxSectionPages(demolitionContentHtml, config)
  return html.replace(regex, pagesHtml + '\n\n    ')
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

// Rebuild problem_analysis_content markdown from individual section values
// Used when individual columns (what_we_discovered, etc.) override the blob
function rebuildProblemAnalysisMarkdown(sections: Record<string, string>): string {
  const sectionOrder: [string, string][] = [
    ['what_we_discovered', 'WHAT WE DISCOVERED'],
    ['identified_causes', 'IDENTIFIED CAUSES'],
    ['contributing_factors', 'CONTRIBUTING FACTORS'],
    ['why_this_happened', 'WHY THIS HAPPENED'],
    ['immediate_actions', 'IMMEDIATE ACTIONS'],
    ['long_term_protection', 'LONG-TERM PROTECTION'],
    ['what_success_looks_like', 'WHAT SUCCESS LOOKS LIKE'],
    ['timeline_text', 'TIMELINE'],
  ]

  let md = ''
  for (const [key, header] of sectionOrder) {
    if (sections[key]) {
      md += `**${header}**\n${sections[key]}\n\n`
    }
  }
  return md.trim()
}

// ===================================================================
// TEMPLATE POPULATION FUNCTIONS
// ===================================================================

// Build the INFRARED OBSERVATIONS server-side block. Mirrors the lead-view
// tag set + label mapping at InspectionDataDisplay.tsx:318-322.
// Returns '' when toggle is on but no observations checked, OR when toggle
// is off (caller handles the off path by stripping the container div).
function buildInfraredObservationsBlock(area: InspectionArea): string {
  const tags: { label: string; bg: string; fg: string }[] = []
  if (area.infrared_observation_no_active)          tags.push({ label: 'No Active Water',     bg: '#f1f5f9', fg: '#334155' })
  if (area.infrared_observation_water_infiltration) tags.push({ label: 'Water Infiltration',  bg: '#fee2e2', fg: '#991b1b' })
  if (area.infrared_observation_past_ingress)       tags.push({ label: 'Past Water Ingress',  bg: '#fef3c7', fg: '#92400e' })
  if (area.infrared_observation_condensation)       tags.push({ label: 'Condensation',        bg: '#dbeafe', fg: '#1e40af' })
  if (area.infrared_observation_missing_insulation) tags.push({ label: 'Missing Insulation',  bg: '#ffedd5', fg: '#9a3412' })
  if (tags.length === 0) return ''
  const tagSpans = tags.map(t =>
    `<span style="display:inline-block; padding:3px 9px; border-radius:9999px; background:${t.bg}; color:${t.fg}; font-size:11px; font-family:'Galvji',sans-serif; margin-right:4px; margin-bottom:4px;">${escapeHtml(t.label)}</span>`
  ).join('')
  return `<div style="color:#111; font-size:13px; font-family:'Garet Heavy',sans-serif; font-weight:400; margin-bottom:6px;">INFRARED OBSERVATIONS</div><div style="display:flex; flex-wrap:wrap;">${tagSpans}</div>`
}

// AREA INSPECTED heading fit. Layout contract on the Area page:
// heading box absolute at top:40.5px (width 650px, line-height 1.2,
// letter-spacing 0.195px), intro paragraph absolute at top:165px, navy
// readings box at top:241.11px — so heading height + 8px clearance must fit
// in 165 - 40.5 = 124.5px. Fills the {{area_heading_style}} /
// {{area_intro_style}} style-tail placeholders; empty string = template
// defaults (48px heading, intro at 165px).
// Glyph advances measured from Garet-Heavy.otf at 48px via canvas
// measureText in Chromium (calibrated against rendered pages 2026-08-24).
// Unknown chars use the widest glyph ('W'): they can only wrap earlier.
const GARET_WIDTHS_48: Record<string, number> = {
  '0': 34.08, '1': 22.464, '2': 31.2, '3': 30.768, '4': 33.264, '5': 30.768,
  '6': 31.536, '7': 28.608, '8': 31.152, '9': 31.536, ' ': 10.704, '!': 15.264,
  '"': 24.48, '#': 38.544, '$': 31.392, '%': 47.856, '&': 36.672, "'": 12.48,
  '(': 24.384, ')': 24.384, '*': 23.952, '+': 27.792, ',': 14.448, '-': 21.408,
  '.': 13.728, '/': 29.616, ':': 13.728, ';': 14.448, '<': 29.28, '=': 29.616,
  '>': 29.28, '?': 27.888, '@': 50.64, 'A': 37.392, 'B': 34.704, 'C': 38.4,
  'D': 37.824, 'E': 29.568, 'F': 27.792, 'G': 38.832, 'H': 37.152, 'I': 17.616,
  'J': 25.104, 'K': 37.488, 'L': 28.608, 'M': 45.792, 'N': 37.632, 'O': 39.744,
  'P': 33.936, 'Q': 39.744, 'R': 35.472, 'S': 31.392, 'T': 33.744, 'U': 36.432,
  'V': 36.48, 'W': 55.056, 'X': 38.448, 'Y': 35.76, 'Z': 30.672, '[': 22.368,
  '\\': 29.616, ']': 22.368, '^': 28.944, '_': 22.848, '`': 16.032, 'a': 31.392,
  'b': 34.416, 'c': 32.016, 'd': 34.416, 'e': 32.016, 'f': 23.184, 'g': 33.84,
  'h': 33.024, 'i': 16.416, 'j': 16.56, 'k': 32.976, 'l': 16.416, 'm': 49.44,
  'n': 33.024, 'o': 32.832, 'p': 34.416, 'q': 34.416, 'r': 23.616, 's': 27.456,
  't': 23.952, 'u': 32.928, 'v': 31.68, 'w': 47.424, 'x': 32.256, 'y': 31.68,
  'z': 26.352, '{': 25.056, '|': 17.136, '}': 25.056, '~': 32.304,
}
const GARET_FALLBACK_WIDTH_48 = 55.056

const HEADING_PREFIX = 'AREA INSPECTED: '
const HEADING_BOX_WIDTH = 650
const HEADING_TOP = 40.5
const HEADING_LINE_HEIGHT_RATIO = 1.2
const HEADING_LETTER_SPACING = 0.195 // px, absolute — does not scale with font-size
const HEADING_CLEARANCE = 8
const INTRO_TOP = 165
const INTRO_MAX_TOP = 176 // intro bottom must stay clear of the navy box at top:241.11
const HEADING_FONT_SIZES = [48, 44, 40, 36, 32, 28, 24, 21]

function glyphAdvance(ch: string, fontSize: number): number {
  const w48 = GARET_WIDTHS_48[ch] ?? GARET_FALLBACK_WIDTH_48
  return (w48 * fontSize) / 48 + HEADING_LETTER_SPACING
}

// Greedy line-break simulation of the browser's wrapping for
// `word-wrap: break-word` text: break at spaces and after '-' or '/',
// with char-level splitting only for fragments wider than the box.
// Line counts verified against rendered pages for 1-11-line names.
function countHeadingLines(text: string, fontSize: number): number {
  const atoms: { frag: string; spaceBefore: boolean }[] = []
  for (const word of text.split(' ')) {
    if (word === '') continue
    const fragments = word.match(/[^/-]*[/-]|[^/-]+/g) || [word]
    fragments.forEach((frag, i) => atoms.push({ frag, spaceBefore: i === 0 }))
  }

  let lines = 1
  let lineWidth = 0
  const spaceWidth = glyphAdvance(' ', fontSize)

  for (const { frag, spaceBefore } of atoms) {
    const fragWidth = [...frag].reduce((w, ch) => w + glyphAdvance(ch, fontSize), 0)
    const joinWidth = lineWidth > 0 && spaceBefore ? spaceWidth : 0

    if (lineWidth === 0 || lineWidth + joinWidth + fragWidth <= HEADING_BOX_WIDTH) {
      lineWidth += joinWidth + fragWidth
      if (lineWidth <= HEADING_BOX_WIDTH) continue
    } else {
      lines++
      lineWidth = fragWidth
      if (lineWidth <= HEADING_BOX_WIDTH) continue
    }

    // fragment alone overflows the box: break-word splits it char by char
    let w = 0
    for (const ch of frag) {
      const a = glyphAdvance(ch, fontSize)
      if (w + a > HEADING_BOX_WIDTH && w > 0) {
        lines++
        w = 0
      }
      w += a
    }
    lineWidth = w
  }
  return lines
}

// Default is 48px; step down only when the measured wrap breaks the 165px
// budget — names that render without overlap at 48px today keep 48px.
function computeAreaHeadingLayout(areaName: string): { headingStyle: string; introStyle: string } {
  const text = (HEADING_PREFIX + areaName).replace(/\s+/g, ' ').trim()

  for (const size of HEADING_FONT_SIZES) {
    const height = countHeadingLines(text, size) * size * HEADING_LINE_HEIGHT_RATIO
    if (HEADING_TOP + height + HEADING_CLEARANCE <= INTRO_TOP) {
      return { headingStyle: size === 48 ? '' : `font-size: ${size}px;`, introStyle: '' }
    }
  }

  // Floor size still overflows (~190+ char names): shift the intro down as far
  // as the navy box allows; beyond that the layout degrades gracefully.
  const floor = HEADING_FONT_SIZES[HEADING_FONT_SIZES.length - 1]
  const height = countHeadingLines(text, floor) * floor * HEADING_LINE_HEIGHT_RATIO
  const introTop = Math.min(Math.round(HEADING_TOP + height + HEADING_CLEARANCE), INTRO_MAX_TOP)
  return { headingStyle: `font-size: ${floor}px;`, introStyle: `top: ${introTop}px;` }
}

// VISIBLE MOULD fit inside the navy readings box. Layout contract on the
// Area page: the VISIBLE MOULD cell is absolute at top:304px (width 250px)
// and EXTERNAL MOISTURE sits at top:348.5px — a 44.5px budget. The navy box
// ends at 377.92px and cannot grow (photo grid at 402px, AREA NOTES heading
// at 409px). When the mould list wraps past one line, all six reading cells
// shrink together via {{env_reading_style}} (a lone shrunken cell would sit
// beside DEW POINT on the same row and look wrong); past the 11px floor the
// mould cell is clamped via {{visible_mould_clamp}} so it clips instead of
// painting over EXTERNAL MOISTURE. Empty strings = template defaults, so
// single-line values render exactly as before this change.
// Glyph advances measured from Galvji.ttc at 15px via canvas measureText in
// Chromium (calibrated against rendered pages 2026-08-24). Unknown chars use
// the widest glyph ('m'): they can only wrap earlier.
const GALVJI_WIDTHS_15: Record<string, number> = {
  '0': 9.8657, '1': 7.3462, '2': 9.0527, '3': 9.2065, '4': 9.4482, '5': 9.4336,
  '6': 9.6826, '7': 8.6426, '8': 9.6167, '9': 9.646, ' ': 3.7061, '!': 4.4971,
  '"': 6.6138, '#': 9.8657, '$': 8.9941, '%': 11.5869, '&': 10.7153, "'": 3.6401,
  '(': 5.1343, ')': 5.1343, '*': 7.8369, '+': 8.9941, ',': 4.021, '-': 6.6943,
  '.': 4.7241, '/': 5.9473, ':': 5.0317, ';': 5.0317, '<': 8.9941, '=': 8.9941,
  '>': 8.9941, '?': 7.9248, '@': 13.6743, 'A': 9.9097, 'B': 10.1221, 'C': 10.3345,
  'D': 10.6714, 'E': 9.1333, 'F': 8.584, 'G': 10.5322, 'H': 11.25, 'I': 4.3579,
  'J': 7.9907, 'K': 9.7705, 'L': 8.2617, 'M': 13.0005, 'N': 11.25, 'O': 10.8398,
  'P': 9.5288, 'Q': 10.8545, 'R': 10.0269, 'S': 9.5581, 'T': 8.7012, 'U': 10.9937,
  'V': 9.895, 'W': 13.6743, 'X': 9.3018, 'Y': 9.0088, 'Z': 9.5288, '[': 5.3687,
  '\\': 5.9473, ']': 5.3687, '^': 6.3135, '_': 7.1191, '`': 7.9761, 'a': 8.8257,
  'b': 9.5435, 'c': 8.5693, 'd': 9.5581, 'e': 8.855, 'f': 6.2988, 'g': 9.2505,
  'h': 9.668, 'i': 4.6069, 'j': 4.6069, 'k': 8.3716, 'l': 4.27, 'm': 14.1943,
  'n': 9.6021, 'o': 9.2065, 'p': 9.5435, 'q': 9.5288, 'r': 6.2622, 's': 8.2031,
  't': 6.0059, 'u': 9.5581, 'v': 8.1738, 'w': 11.9238, 'x': 8.4009, 'y': 8.5986,
  'z': 8.0786, '{': 5.8813, '|': 5.6543, '}': 5.8813, '~': 9.3018,
}
const GALVJI_FALLBACK_WIDTH_15 = 14.1943

const ENV_MOULD_PREFIX = 'VISIBLE MOULD: '
const ENV_CELL_WIDTH = 250
const ENV_LETTER_SPACING = 0.0252 // px, absolute — does not scale with font-size
const ENV_LINE_HEIGHT_RATIO = 1.2
const ENV_MAX_HEIGHT = 40.5 // 44.5px budget minus 4px clearance
const ENV_CLAMP_HEIGHT = 40 // fits 3 lines at the 11px floor, clips the 4th
const ENV_FONT_SIZES = [15, 14, 13, 12, 11]

function envGlyphAdvance(ch: string, fontSize: number): number {
  const w15 = GALVJI_WIDTHS_15[ch] ?? GALVJI_FALLBACK_WIDTH_15
  return (w15 * fontSize) / 15 + ENV_LETTER_SPACING
}

// Same greedy `word-wrap: break-word` simulation as countHeadingLines,
// against the Galvji table and the 250px reading cell.
function countEnvLines(text: string, fontSize: number): number {
  const atoms: { frag: string; spaceBefore: boolean }[] = []
  for (const word of text.split(' ')) {
    if (word === '') continue
    const fragments = word.match(/[^/-]*[/-]|[^/-]+/g) || [word]
    fragments.forEach((frag, i) => atoms.push({ frag, spaceBefore: i === 0 }))
  }

  let lines = 1
  let lineWidth = 0
  const spaceWidth = envGlyphAdvance(' ', fontSize)

  for (const { frag, spaceBefore } of atoms) {
    const fragWidth = [...frag].reduce((w, ch) => w + envGlyphAdvance(ch, fontSize), 0)
    const joinWidth = lineWidth > 0 && spaceBefore ? spaceWidth : 0

    if (lineWidth === 0 || lineWidth + joinWidth + fragWidth <= ENV_CELL_WIDTH) {
      lineWidth += joinWidth + fragWidth
      if (lineWidth <= ENV_CELL_WIDTH) continue
    } else {
      lines++
      lineWidth = fragWidth
      if (lineWidth <= ENV_CELL_WIDTH) continue
    }

    // fragment alone overflows the cell: break-word splits it char by char
    let w = 0
    for (const ch of frag) {
      const a = envGlyphAdvance(ch, fontSize)
      if (w + a > ENV_CELL_WIDTH && w > 0) {
        lines++
        w = 0
      }
      w += a
    }
    lineWidth = w
  }
  return lines
}

// Single-line values return empty tails — same substitution result as before
// this change. Multi-line values pin line-height 1.2 (Galvji's `normal`
// metrics vary by renderer) and step the whole grid down until the wrapped
// height fits the budget.
function computeEnvReadingsLayout(mouldValue: string): { envReadingStyle: string; visibleMouldClamp: string } {
  const text = (ENV_MOULD_PREFIX + mouldValue).replace(/\s+/g, ' ').trim()

  if (countEnvLines(text, ENV_FONT_SIZES[0]) <= 1) {
    return { envReadingStyle: '', visibleMouldClamp: '' }
  }

  for (const size of ENV_FONT_SIZES) {
    const height = countEnvLines(text, size) * size * ENV_LINE_HEIGHT_RATIO
    if (height <= ENV_MAX_HEIGHT) {
      return {
        envReadingStyle: `font-size: ${size}px; line-height: ${ENV_LINE_HEIGHT_RATIO};`,
        visibleMouldClamp: '',
      }
    }
  }

  // Floor size still overflows (~130+ char lists or free text): clamp the
  // mould cell so it clips at the cell boundary instead of overlapping.
  const floor = ENV_FONT_SIZES[ENV_FONT_SIZES.length - 1]
  return {
    envReadingStyle: `font-size: ${floor}px; line-height: ${ENV_LINE_HEIGHT_RATIO};`,
    visibleMouldClamp: `max-height: ${ENV_CLAMP_HEIGHT}px; overflow: hidden;`,
  }
}

// Extract the Areas Inspected page block from the template
// The template has a single Area page with {{area_*}} placeholders
// We duplicate it once per inspected area
function duplicateAreaPages(html: string, areas: InspectionArea[] | undefined, photos: Photo[] | undefined): string {
  // Find the Area page block: between "Page 5: Areas Inspected" comment and "Page 6:" comment
  const areaPageRegex = /(<!-- Page 3: Areas Inspected[\s\S]*?<\/div>\s*<\/div>)\s*(?=\s*<!-- Page 4)/
  const match = html.match(areaPageRegex)

  if (!match) {
    console.warn('Could not find Areas Inspected page block in template')
    return html
  }

  const areaTemplate = match[1]

  if (!areas || areas.length === 0) {
    // No areas — replace with a "None" page
    const emptyPage = areaTemplate
      .replace(/\{\{area_heading_style\}\}/g, '')
      .replace(/\{\{area_intro_style\}\}/g, '')
      .replace(/\{\{env_reading_style\}\}/g, '')
      .replace(/\{\{visible_mould_clamp\}\}/g, '')
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
      .replace(/\{\{infrared_observations_block\}\}/g, '')
      .replace(/\{\{area_notes\}\}/g, 'No areas were inspected during this assessment.')
      .replace(/\{\{extra_notes\}\}/g, '')

    return html.replace(areaPageRegex, emptyPage + '\n\n')
  }

  const EMPTY_CELL = '<div style="width: 100%; height: 100%; background: #f3f4f6; border-radius: 8px;"></div>'

  // Generate one page per area
  const areaPages = areas.map(area => {
    let page = areaTemplate
    // If area has a primary_photo_id override, put that photo first
    let areaPhotos = photos?.filter(p => p.area_id === area.id) || []
    if (area.primary_photo_id) {
      const primaryPhoto = photos?.find(p => p.id === area.primary_photo_id)
      if (primaryPhoto) {
        // Put primary photo first, then any other area photos (excluding the primary to avoid dupes)
        const others = areaPhotos.filter(p => p.id !== primaryPhoto.id)
        areaPhotos = [primaryPhoto, ...others]
      }
    }

    // Heading fit (ordered before {{area_name}} so a name containing literal
    // placeholder text can never be re-substituted)
    const headingLayout = computeAreaHeadingLayout(area.area_name || 'Unnamed Area')
    page = page.replace(/\{\{area_heading_style\}\}/g, headingLayout.headingStyle)
    page = page.replace(/\{\{area_intro_style\}\}/g, headingLayout.introStyle)

    // Environmental readings
    page = page.replace(/\{\{area_name\}\}/g, escapeHtml(area.area_name || 'Unnamed Area'))
    page = page.replace(/\{\{area_temperature\}\}/g, `${area.temperature || 0}°C`)
    page = page.replace(/\{\{area_humidity\}\}/g, `${area.humidity || 0}%`)
    page = page.replace(/\{\{area_dew_point\}\}/g, `${area.dew_point || 0}°C`)

    // Mould description (style tails ordered before {{visible_mould}} so a
    // value containing literal placeholder text can never be re-substituted)
    const mouldLocations = getMouldDescription(area)
    const envLayout = computeEnvReadingsLayout(mouldLocations)
    page = page.replace(/\{\{env_reading_style\}\}/g, envLayout.envReadingStyle)
    page = page.replace(/\{\{visible_mould_clamp\}\}/g, envLayout.visibleMouldClamp)
    page = page.replace(/\{\{visible_mould\}\}/g, escapeHtml(mouldLocations))

    // Moisture readings
    const moistureReadings = area.moisture_readings?.sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0)) || []
    const internalMoisture = moistureReadings.find(r => r.title?.toLowerCase().includes('internal')) || moistureReadings[0]
    page = page.replace(/\{\{internal_moisture\}\}/g, internalMoisture?.moisture_percentage != null ? `${internalMoisture.moisture_percentage}%` : '-')
    page = page.replace(/\{\{external_moisture\}\}/g, area.external_moisture != null ? `${area.external_moisture}%` : '-')

    // Area photos (regular, non-infrared)
    const regularPhotos = areaPhotos.filter(p => p.caption !== 'infrared' && p.caption !== 'natural_infrared')
    for (let i = 1; i <= 4; i++) {
      const photo = regularPhotos[i - 1]
      if (photo?.storage_path) {
        page = page.replace(new RegExp(`\\{\\{area_photo_${i}\\}\\}`, 'g'), getPhotoUrl(photo.storage_path))
      } else {
        page = page.replace(new RegExp(`<img[^>]*src="\\{\\{area_photo_${i}\\}\\}"[^>]*\\/>`, ''), EMPTY_CELL)
      }
    }

    // Infrared block — single toggle `area.infrared_enabled` gates BOTH the
    // photo grid AND the new INFRARED OBSERVATIONS block (matches lead view
    // InspectionDataDisplay.tsx where the same flag gates :247 badge, :314
    // observations, :352/:355 photo grids). EXTRA NOTES is completely
    // decoupled — it ALWAYS renders the real `area.extra_notes` DB column
    // (the inspector's free-text), never the hardcoded thermal-imaging
    // sentence that 4c4ca0c was emitting.
    //
    // Template anchors (verified against pdf-templates/inspection-report-template-final.html):
    //   <!-- Extra photos grid (bottom left) -->          div: left:35  top:856  width:416  height:167
    //   <!-- INFRARED OBSERVATIONS -->                    div: left:35  top:1030 width:416  (added in this commit)
    //   <!-- EXTRA NOTES heading -->                      div: left:482 top:864  width:134
    //   <!-- EXTRA NOTES content -->                      div: left:483 top:893  width:260
    //   AREA NOTES content above ends at top:817.
    //
    // Behaviour:
    //   irOn = true,  has both photos → photo grid + observations + (right-side) EXTRA NOTES
    //   irOn = true,  one photo only  → strip the missing <img> tag, keep grid + observations
    //   irOn = true,  no obs ticked   → observations container renders empty (no heading, no tags)
    //   irOn = false                  → strip photo grid + observations container + original
    //                                   EXTRA NOTES heading/content, then emit a full-width
    //                                   EXTRA NOTES at left:35 width:730 occupying the freed band.
    //
    // UNVERIFIED — coordinate math + regex strips need visual confirmation on a
    // rendered PDF (preferred via local `supabase functions serve` previewOnly
    // before any deploy; otherwise post-deploy previewOnly grep).
    const irOn = !!area.infrared_enabled
    const infraredPhoto = areaPhotos.find(p => p.caption === 'infrared')
    const naturalInfraredPhoto = areaPhotos.find(p => p.caption === 'natural_infrared')

    if (!irOn) {
      // Toggle OFF — strip the infrared block AND the original EXTRA NOTES
      // divs, then emit a fresh full-width EXTRA NOTES at the freed location.
      page = page.replace(/<!-- Extra photos grid \(bottom left\)[\s\S]*?<\/div>\s*\n/, '')
      page = page.replace(/<!-- INFRARED OBSERVATIONS[\s\S]*?<\/div>\s*\n/, '')
      page = page.replace(/<!-- EXTRA NOTES heading -->[\s\S]*?<\/div>\s*\n/, '')
      page = page.replace(/<!-- EXTRA NOTES content -->[\s\S]*?<\/div>\s*\n/, '')
      const widenedExtraNotes = `<!-- EXTRA NOTES heading (full-width, infrared OFF) -->\n            <div style="width: 730px; left: 35px; top: 856px; position: absolute; color: black; font-size: 17px; font-family: 'Garet Heavy', sans-serif; font-weight: 400; line-height: normal; letter-spacing: 0.0372px;">EXTRA NOTES</div>\n            <!-- EXTRA NOTES content (full-width, infrared OFF) -->\n            <div style="width: 730px; left: 35px; top: 885px; position: absolute; color: black; font-size: 13px; font-family: 'Galvji', sans-serif; font-weight: 400; line-height: normal; letter-spacing: 0.0197px; word-wrap: break-word; white-space: pre-wrap;">${escapeHtml(area.extra_notes || '')}</div>\n`
      // Inject the widened block before the closing </div></div> of the area page.
      page = page.replace(/(\s*<\/div>\s*<\/div>\s*)$/, `\n            ${widenedExtraNotes}$1`)
    } else {
      // Toggle ON — photo-slot safety net + render the observations block.
      if (!infraredPhoto?.storage_path) {
        page = page.replace(/<img[^>]*src="\{\{area_infrared_photo\}\}"[^>]*\/>/, EMPTY_CELL)
      }
      if (!naturalInfraredPhoto?.storage_path) {
        page = page.replace(/<img[^>]*src="\{\{area_natural_infrared_photo\}\}"[^>]*\/>/, EMPTY_CELL)
      }
    }

    // Placeholder substitutions — no-ops on the OFF path (their containing
    // divs were stripped above).
    page = page.replace(/\{\{area_infrared_photo\}\}/g, infraredPhoto?.storage_path ? getPhotoUrl(infraredPhoto.storage_path) : '')
    page = page.replace(/\{\{area_natural_infrared_photo\}\}/g, naturalInfraredPhoto?.storage_path ? getPhotoUrl(naturalInfraredPhoto.storage_path) : '')
    // INFRARED OBSERVATIONS rendering is temporarily disabled by product decision.
    // The template still has the {{infrared_observations_block}} container (added
    // alongside the EF in ba366f9), and buildInfraredObservationsBlock() is kept
    // intact below — to re-enable, change the '' here to
    // `irOn ? buildInfraredObservationsBlock(area) : ''`. No template / Storage
    // upload needed. The OFF-path container strip above still runs (so the
    // empty div doesn't sit in the rendered HTML when infrared is off).
    page = page.replace(/\{\{infrared_observations_block\}\}/g, '')

    // Notes — AREA NOTES (area.comments) is the right-column block above the
    // infrared band; EXTRA NOTES (area.extra_notes) is the inspector's per-area
    // free-text, rendered in the bottom-right on the ON path or in the widened
    // block on the OFF path.
    page = page.replace(/\{\{area_notes\}\}/g, escapeHtml(area.comments || 'No notes recorded for this area.'))
    page = page.replace(/\{\{extra_notes\}\}/g, escapeHtml(area.extra_notes || ''))

    return page
  }).join('\n\n')

  return html.replace(areaPageRegex, areaPages + '\n\n')
}

// Estimate text height for subfloor panel (13px font, 20px line-height, 290px width)
function estimateSubfloorTextHeight(text: string): number {
  if (!text) return 20
  const CHARS_PER_LINE = 35
  const LINE_HEIGHT = 20
  const segments = text.split('\n')
  let totalLines = 0
  for (const segment of segments) {
    totalLines += Math.max(Math.ceil(segment.length / CHARS_PER_LINE), 1)
  }
  return totalLines * LINE_HEIGHT
}

// Handle the Subfloor page — remove if not required, generate dynamic multi-page if present
function handleSubfloorPage(
  html: string,
  inspection: Inspection,
  subfloorData: SubfloorData | null,
  subfloorReadings: SubfloorReading[],
  subfloorPhotos: Photo[]
): string {
  const subfloorPageRegex = /\s*<!-- Page 5: Subfloor[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 6)/

  if (!subfloorData) {
    return html.replace(subfloorPageRegex, '\n\n')
  }

  // Extract asset URLs from template before replacing
  const match = html.match(subfloorPageRegex)
  if (!match) return html

  const bgMatch = match[0].match(/src="([^"]*Subfloor[^"]*\.png[^"]*)"/)
  const bgUrl = bgMatch ? bgMatch[1] : `${ASSET_BASE}/assets/backgrounds/Subfloor%20Background%20P9%20(1).png`
  const logoMatch = match[0].match(/src="([^"]*logo-mrc\.png[^"]*)"/)
  const logoUrl = logoMatch ? logoMatch[1] : `${ASSET_BASE}/assets/logos/logo-mrc.png`

  // Build text sections
  const landscapeText = subfloorData.landscape
    ? subfloorData.landscape.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : 'Not specified'

  const moistureLevels = subfloorReadings.length > 0
    ? subfloorReadings
        .sort((a, b) => (a.reading_order || 0) - (b.reading_order || 0))
        .map(r => `${r.location || 'Location ' + (r.reading_order + 1)}: ${r.moisture_percentage ?? '-'}%`)
        .join('\n')
    : 'No moisture readings recorded.'

  const textSections = [
    { heading: 'SUBFLOOR OBSERVATION', body: subfloorData.observations || 'No observations recorded.' },
    { heading: 'SUBFLOOR LANDSCAPE', body: landscapeText },
    { heading: 'SUBFLOOR COMMENTS', body: subfloorData.comments || 'No comments recorded.' },
    { heading: 'MOISTURE LEVELS', body: moistureLevels },
  ]

  // Pagination constants for navy panel text layout
  const PANEL_TEXT_START = 150
  const PANEL_TEXT_END = 1100
  const HEADING_HEIGHT = 28
  const SECTION_GAP = 30

  // Distribute text sections across pages based on estimated heights
  interface TextPlacement { heading: string; body: string; headingTop: number; bodyTop: number }
  const textPages: TextPlacement[][] = [[]]
  let currentTop = PANEL_TEXT_START
  let currentPageIndex = 0

  for (const section of textSections) {
    const bodyHeight = estimateSubfloorTextHeight(section.body)
    const totalHeight = HEADING_HEIGHT + bodyHeight

    if (currentTop + totalHeight > PANEL_TEXT_END && textPages[currentPageIndex].length > 0) {
      currentPageIndex++
      textPages.push([])
      currentTop = PANEL_TEXT_START
    }

    textPages[currentPageIndex].push({
      heading: section.heading,
      body: section.body,
      headingTop: currentTop,
      bodyTop: currentTop + HEADING_HEIGHT,
    })

    currentTop += totalHeight + SECTION_GAP
  }

  // Chunk photos into groups of 10
  const photoChunks: Photo[][] = []
  for (let i = 0; i < subfloorPhotos.length; i += 10) {
    photoChunks.push(subfloorPhotos.slice(i, i + 10))
  }
  if (photoChunks.length === 0) photoChunks.push([])

  // Total pages = max of text pages and photo chunks
  const totalPages = Math.max(textPages.length, photoChunks.length)

  // Generate HTML for each page
  const pagesHtml: string[] = []
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const isFirstPage = pageIdx === 0
    const titleText = 'SUBFLOOR'
    const titleFontSize = isFirstPage ? '56px' : '40px'

    // Photo grid for this page
    const chunk = photoChunks[pageIdx] || []
    let photoGridHtml = ''
    if (chunk.length > 0) {
      const rows = Math.ceil(chunk.length / 2)
      const photoImgs = chunk.map((photo, i) => {
        const url = photo.storage_path ? getPhotoUrl(photo.storage_path) : ''
        return url
          ? `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Subfloor photo ${pageIdx * 10 + i + 1}" />`
          : ''
      }).filter(Boolean).join('\n                ')

      photoGridHtml = `
            <div style="width: 440px; left: 12px; top: 140px; position: absolute; display: grid; grid-template-columns: 214px 214px; grid-template-rows: repeat(${rows}, 153px); gap: 10px; z-index: 10;">
                ${photoImgs}
            </div>`
    }

    // Text sections for this page
    const placements = textPages[pageIdx] || []
    const textHtml = placements.map(tp =>
      `
            <div style="width: 290px; left: 484px; top: ${tp.headingTop}px; position: absolute; color: #FFFFFF; font-size: 16px; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; line-height: normal; z-index: 10;">${tp.heading}</div>
            <div style="width: 290px; left: 484px; top: ${tp.bodyTop}px; position: absolute; color: #FFFFFF; font-size: 13px; font-family: 'Galvji'; font-weight: 400; line-height: 20px; letter-spacing: 0.5px; z-index: 10; white-space: pre-wrap;">${tp.body}</div>`
    ).join('')

    pagesHtml.push(`<!-- Page 5: Subfloor${isFirstPage ? '' : ' (continued)'} -->
    <div class="report-page page-break">
        <div style="width: 794px; height: 1123px; position: relative; background: #FFFFFF; overflow: hidden">
            <img src="${bgUrl}" style="width: 794px; height: 1123px; left: 0; top: 0; position: absolute; display: block; object-fit: cover; z-index: 0;" alt="" />
            <div style="left: 463px; top: 111px; width: 331px; height: 1012px; position: absolute; background: #121D73; border-radius: 10px 0 0 0; z-index: 1;"></div>
            <div style="width: 400px; left: 46px; top: 37px; position: absolute; color: #000000; font-size: ${titleFontSize}; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; line-height: normal; z-index: 10;">${titleText}</div>
            <img style="width: 57px; height: 56px; left: 709px; top: 29px; position: absolute; object-fit: contain; z-index: 10;" src="${logoUrl}" alt="MRC Logo" />${photoGridHtml}${textHtml}
        </div>
    </div>`)
  }

  return html.replace(subfloorPageRegex, '\n\n    ' + pagesHtml.join('\n\n    ') + '\n\n    ')
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

  // Outdoor photos — sort by preferred caption order: street, front_house, front_door first
  const outdoorCaptionOrder = ['street', 'front_house', 'front_door', 'direction', 'mailbox']
  const outdoorPhotos = (inspection.photos?.filter(p => p.photo_type === 'outdoor') || [])
    .sort((a, b) => {
      const ai = outdoorCaptionOrder.indexOf(a.caption)
      const bi = outdoorCaptionOrder.indexOf(b.caption)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })

  // Treatment plan
  const treatmentMethods = getTreatmentMethods(inspection)
  const equipmentList = getEquipmentList(inspection)

  // Problem analysis content — parse into sub-sections for template placeholders
  const problemSections = parseProblemAnalysis(
    inspection.problem_analysis_content || inspection.ai_summary_text
  )
  const defaultAnalysis = `During our comprehensive inspection at ${escapeHtml(propertyAddress)}, we identified mould growth in the examined areas requiring professional treatment.`

  // Demolition content — use AI-generated field, fall back to area descriptions
  const demolitionAreas = inspection.areas?.filter(a => a.demolition_required) || []
  const demolitionContent = inspection.demolition_content?.trim()
    ? markdownToHtml(inspection.demolition_content)
    : demolitionAreas.length > 0
      ? demolitionAreas.map(a => `<strong>${escapeHtml(a.area_name)}:</strong> ${escapeHtml(a.demolition_description || 'Demolition work required.')}`).join('<br/><br/>')
      : ''

  // Equipment pricing — literals must match EQUIPMENT_RATES in src/lib/calculations/pricing.ts
  // (dehumidifier 119, airMover 46, hepaAirScrubber 100, rcd 5); no shared constant across
  // the Deno boundary, so keep them in sync by hand.
  const dehumidifierPrice = inspection.commercial_dehumidifier_qty > 0 ? `$119/day × ${inspection.commercial_dehumidifier_qty}` : '$119/day'
  const airMoverPrice = inspection.air_movers_qty > 0 ? `$46/day × ${inspection.air_movers_qty}` : '$46/day'
  const rcdBoxPrice = inspection.rcd_box_qty > 0 ? `$5/day × ${inspection.rcd_box_qty}` : '$5/day'
  const hepaQty = inspection.hepa_air_scrubber_qty ?? 0
  const hepaPrice = hepaQty > 0
    ? `$100/day × ${hepaQty}${inspection.hepa_air_scrubber_days ? ` (${inspection.hepa_air_scrubber_days} days)` : ''}`
    : '$100/day'

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
  html = html.replace(/\{\{ordered_by\}\}/g, escapeHtml(getValidValue(inspection.requested_by, lead?.full_name, 'Property Owner')))
  html = html.replace(/\{\{inspector\}\}/g, escapeHtml(inspectorName))
  html = html.replace(/\{\{inspection_date\}\}/g, formatDate(inspection.inspection_date))
  html = html.replace(/\{\{directed_to\}\}/g, escapeHtml(getValidValue(inspection.attention_to, lead?.full_name, 'Property Owner')))
  html = html.replace(/\{\{property_type\}\}/g, escapeHtml(lead?.property_type || inspection.dwelling_type || 'Residential'))
  html = html.replace(/\{\{examined_areas\}\}/g, escapeHtml(examinedAreas))
  html = html.replace(/\{\{cover_photo_url\}\}/g, coverPhotoUrl)
  html = html.replace(/\{\{property_address\}\}/g, escapeHtml(propertyAddress))

  // Increase Page 1 label font size from 17px → 19px (ORDERED BY, INSPECTOR, DATE, etc.)
  html = html.replace(
    /color: #252525; font-size: 17px; font-family: 'Garet Heavy'; font-weight: 800; text-transform: uppercase; letter-spacing: 0\.0[45]px;/g,
    (match) => match.replace('font-size: 17px', 'font-size: 19px')
  )

  // ===== REMOVE PAGE 2: TABLE OF CONTENTS =====
  html = html.replace(/<!-- Page 2: Table of Contents[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 3)/, '')

  // ===== REMOVE PAGE 3: OUR SERVICES =====
  html = html.replace(/<!-- Page 3: Our Services[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 4)/, '')

  // ===== PAGE 4: VALUE PROPOSITION (multi-page overflow) =====
  const whatWeFoundHtml = markdownToHtml(inspection.what_we_found_text) ||
    markdownToHtml(inspection.ai_summary_text) ||
    '<p style="margin: 8px 0;">Summary not yet generated.</p>'
  const whatWeWillDoHtml = markdownToHtml(inspection.what_we_will_do_text) ||
    `<p style="margin: 8px 0;">We'll set up professional equipment including ${equipmentList || 'air scrubbers'}. Treatment will include ${treatmentMethods || 'standard mould removal procedures'}.</p>`

  html = handleValuePropositionOverflow(html, whatWeFoundHtml, whatWeWillDoHtml)

  // Clean up any remaining VP placeholders (in case fallback was used)
  html = html.replace(/\{\{what_we_found_text\}\}/g, whatWeFoundHtml)
  html = html.replace(/\{\{what_we_will_do_text\}\}/g, whatWeWillDoHtml)
  html = html.replace(/\{\{what_you_get_text\}\}/g, '')

  // ===== PAGE 5: AREAS INSPECTED (duplicate per area) =====
  html = duplicateAreaPages(html, inspection.areas, inspection.photos)

  // ===== PAGE 6: OUTDOOR ENVIRONMENT =====
  html = html.replace(/\{\{outdoor_temperature\}\}/g, String(inspection.outdoor_temperature || 0))
  html = html.replace(/\{\{outdoor_humidity\}\}/g, String(inspection.outdoor_humidity || 0))
  html = html.replace(/\{\{outdoor_dew_point\}\}/g, String(inspection.outdoor_dew_point || 0))
  html = html.replace(/\{\{outdoor_photo_1\}\}/g, outdoorPhotos[0]?.storage_path ? getPhotoUrl(outdoorPhotos[0].storage_path) : '')
  html = html.replace(/\{\{outdoor_photo_2\}\}/g, outdoorPhotos[1]?.storage_path ? getPhotoUrl(outdoorPhotos[1].storage_path) : '')
  html = html.replace(/\{\{outdoor_photo_3\}\}/g, outdoorPhotos[2]?.storage_path ? getPhotoUrl(outdoorPhotos[2].storage_path) : '')

  // ===== PAGE 7: SUBFLOOR (conditional) =====
  // Gate: suppress when explicitly set to false. null = legacy rows → render (back-compat).
  if (inspection.subfloor_required !== false) {
    html = handleSubfloorPage(html, inspection, subfloorData, subfloorReadings, subfloorPhotos)
  } else {
    // subfloor_required === false: strip the Subfloor page block entirely (template page + photo grid).
    const subfloorPageRegex = /\s*<!-- Page 5: Subfloor[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 6)/
    html = html.replace(subfloorPageRegex, '\n\n')
  }

  // ===== PAGE 8: PROBLEM ANALYSIS (multi-page overflow) =====
  // Override sections with individual column values when user has edited them
  let problemMarkdown = inspection.problem_analysis_content || inspection.ai_summary_text || ''
  if (inspection.what_we_discovered || inspection.identified_causes || inspection.why_this_happened) {
    const overrideSections = parseProblemAnalysis(problemMarkdown)
    if (inspection.what_we_discovered) overrideSections.what_we_discovered = inspection.what_we_discovered
    if (inspection.identified_causes) overrideSections.identified_causes = inspection.identified_causes
    if (inspection.why_this_happened) overrideSections.why_this_happened = inspection.why_this_happened
    problemMarkdown = rebuildProblemAnalysisMarkdown(overrideSections)
  }
  const problemContentHtml = markdownToHtml(problemMarkdown) || defaultAnalysis
  // IMPORTANT: handleProblemAnalysisOverflow MUST run before the demolition
  // strip below. Its lookahead regex `(?=\s*<!-- Page 7)` anchors on the
  // Demolition placeholder block, which the strip may delete. Reordering
  // these calls will silently break Problem Analysis pagination on
  // non-demolition inspections.
  html = handleProblemAnalysisOverflow(html, problemContentHtml)

  // Reparse sections after overrides for template placeholder compat
  const finalProblemSections = (inspection.what_we_discovered || inspection.identified_causes || inspection.why_this_happened)
    ? parseProblemAnalysis(problemMarkdown)
    : problemSections

  // Clean up any remaining problem analysis placeholders (old template compat)
  html = html.replace(/\{\{what_we_discovered\}\}/g, stripMarkdown(finalProblemSections.what_we_discovered) || defaultAnalysis)
  html = html.replace(/\{\{identified_causes\}\}/g, stripMarkdown(finalProblemSections.identified_causes) || 'Causes to be determined after full analysis.')
  html = html.replace(/\{\{contributing_factors\}\}/g, stripMarkdown(finalProblemSections.contributing_factors) || '')
  html = html.replace(/\{\{why_this_happened\}\}/g, stripMarkdown(finalProblemSections.why_this_happened) || '')
  html = html.replace(/\{\{immediate_actions\}\}/g, stripMarkdown(problemSections.immediate_actions) || 'Professional mould treatment recommended.')
  html = html.replace(/\{\{long_term_protection\}\}/g, stripMarkdown(problemSections.long_term_protection) || '')
  html = html.replace(/\{\{what_success_looks_like\}\}/g, stripMarkdown(problemSections.what_success_looks_like) || '')
  html = html.replace(/\{\{timeline_text\}\}/g, stripMarkdown(problemSections.timeline_text) || '')
  html = html.replace(/\{\{problem_analysis_content\}\}/g, '') // Already handled by overflow

  // ===== PAGE 7: DEMOLITION (conditional + multi-page overflow) =====
  const hasDemolition = demolitionAreas.length > 0 || !!inspection.demolition_content?.trim()
  if (hasDemolition) {
    html = handleDemolitionOverflow(html, demolitionContent)
  } else {
    // Remove demolition page entirely when no areas require it
    const demolitionRemoveRegex = /\s*<!-- Page 7: Demolition[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 8)/
    html = html.replace(demolitionRemoveRegex, '\n\n')
  }

  // ===== PAGE 8: VISUAL MOULD CLEANING ESTIMATE =====
  // Use pre-computed option_selected if available, fall back to algorithmic derivation
  const hasSubfloor = subfloorData != null
  const optionSelected = inspection.option_selected
    ?? ((hasDemolition || hasSubfloor) ? 2 : 1)

  // Scope-of-work steps: the template carries {{option_1_steps}} / {{option_2_steps}}
  // placeholders inside the fixed description areas; render the selected treatment
  // methods into them, falling back to the historic static descriptions for legacy
  // inspections with no treatment_methods. (Replaces the old indexOf position-marker
  // surgery, which silently no-oped once the template's geometry changed.)
  const OPTION_2_ONLY = ['Material Demolition', 'Cavity Treatment', 'Debris Removal']
  const selectedMethods = inspection.treatment_methods && inspection.treatment_methods.length > 0
    ? inspection.treatment_methods
    : []
  // Option 1 never includes Option 2-only methods
  const opt1Methods = selectedMethods.filter(m => !OPTION_2_ONLY.includes(m))

  const DEFAULT_OPTION_1_STEPS =
    'A. Eradication of visible mould from all impacted zones as detailed in the prior report.<br/><br/>B. Diminishment of airborne mould spores within the property through sanitisation.'
  const DEFAULT_OPTION_2_STEPS =
    'A. Eradication of visible mould from all impacted zones as detailed in the prior report.<br/><br/>B. Removal of mould-affected materials and infrastructural components.<br/><br/>C. Diminishment of airborne mould spores within the property through sanitisation.<br/><br/>D. Proper Disposal and handling of removed mould-affected materials.'

  const opt1StepsHtml = generateScopeStepsHtml(opt1Methods, 1) || DEFAULT_OPTION_1_STEPS
  const opt2StepsHtml = generateScopeStepsHtml(selectedMethods, 2) || DEFAULT_OPTION_2_STEPS
  html = html.replace(/\{\{option_1_steps\}\}/g, opt1StepsHtml)
  html = html.replace(/\{\{option_2_steps\}\}/g, opt2StepsHtml)

  // Quoted prices are shown EX GST with an explicit "+GST" suffix, matching the waste line
  // below. The suffix sits INSIDE each ternary so the option that was not quoted renders a
  // bare 'N/A' and never "N/A +GST" — which is why it cannot live in the template.
  const withGst = (exGst: number) => `${formatCurrency(exGst)} +GST`

  if (optionSelected === 3) {
    // "Both" mode: Option 1 carries its own stored ex-GST breakdown; Option 2 is the whole
    // job, so it is the job subtotal. There is no option_1 subtotal column, so the two
    // components are summed here — null-safe, because rows saved before those columns
    // existed leave them empty. A stored column is the right fix; see docs/TODO.md.
    const opt1ExGst = Number(inspection.option_1_labour_ex_gst ?? 0)
      + Number(inspection.option_1_equipment_ex_gst ?? 0)
    const opt1Price = opt1ExGst > 0 ? withGst(opt1ExGst) : 'N/A'
    const opt2Price = inspection.subtotal_ex_gst ? withGst(inspection.subtotal_ex_gst) : 'N/A'
    html = html.replace(/\{\{option_1_price\}\}/g, opt1Price)
    html = html.replace(/\{\{option_2_price\}\}/g, opt2Price)
  } else {
    // Single option: one price, one N/A
    const price = inspection.subtotal_ex_gst ? withGst(inspection.subtotal_ex_gst) : 'N/A'
    html = html.replace(/\{\{option_1_price\}\}/g, optionSelected === 2 ? 'N/A' : price)
    html = html.replace(/\{\{option_2_price\}\}/g, optionSelected === 2 ? price : 'N/A')
  }
  // Waste disposal — job-level pass-through. In Both mode the option totals deliberately
  // exclude it (billed once, whichever option proceeds), so the line says so explicitly.
  const wasteCost = Number(inspection.waste_disposal_confirmed_cost ?? 0)
  const wasteM3 = inspection.waste_disposal_m3
  const wasteLine = wasteCost > 0
    ? optionSelected === 3
      ? `Waste disposal — billed once: ${formatCurrency(wasteCost)} +GST`
      : `Waste disposal: ${wasteM3 ? `${wasteM3} m³ — ` : ''}${formatCurrency(wasteCost)} +GST`
    : 'Waste disposal: Not required'

  html = html.replace(/\{\{equipment_dehumidifier\}\}/g, dehumidifierPrice)
  html = html.replace(/\{\{equipment_air_mover\}\}/g, airMoverPrice)
  html = html.replace(/\{\{equipment_rcd_box\}\}/g, rcdBoxPrice)
  html = html.replace(/\{\{equipment_hepa\}\}/g, hepaPrice)
  html = html.replace(/\{\{equipment_max_days\}\}/g, '5 days')
  html = html.replace(/\{\{waste_disposal\}\}/g, wasteLine)

  // Clean up any remaining unreplaced placeholders
  html = html.replace(/\{\{[^}]+\}\}/g, '')

  // Update heading text color only (not background boxes)
  html = html.replace(/color: #121D73/gi, 'color: #150db9')

  // Template already has pages in correct order:
  // Cover → VP → Areas → Outdoor → Subfloor → Problem → Demolition → Cleaning → T&C → Contact

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service-role client for cross-row reads (template fetch, full inspection
    // join). Used for SELECTs only.
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // JWT-bound client for audited writes. The Authorization header is
    // forwarded so auth.uid() captures the calling admin inside the
    // audit_log_trigger() — see docs/edge-function-attribution-manifest.md.
    // Falls back to the service-role client if no Authorization header is
    // present (which would be unexpected for this EF; logged below).
    const authHeader = req.headers.get('Authorization')
    const supabaseAudited = authHeader
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
      : supabase
    if (!authHeader) {
      console.warn('[generate-inspection-pdf] No Authorization header — audit attribution will be NULL')
    }

    // Parse and validate request body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = RequestBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parsed.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { inspectionId, regenerate, returnHtml: returnHtmlRaw, previewOnly } = parsed.data
    // previewOnly is the dominant flag — it implies returnHtml semantically.
    const returnHtml = returnHtmlRaw || previewOnly

    // previewOnly bypasses ALL persistence (no inspections UPDATE, no audit
    // trail), so it must be gated on admin role. Without this, any JWT
    // holder (technician etc.) could exfiltrate full inspection HTML for any
    // inspection UUID with zero forensic trace. Default path keeps its
    // existing posture (JWT verified, audit trail written via supabaseAudited).
    if (previewOnly) {
      const { data: { user: previewCaller }, error: previewAuthError } = await supabaseAudited.auth.getUser()
      if (previewAuthError || !previewCaller) {
        return new Response(
          JSON.stringify({ error: 'previewOnly requires an authenticated caller' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { data: isAdmin, error: roleError } = await supabaseAudited.rpc('has_role', {
        _user_id: previewCaller.id,
        _role_name: 'admin',
      })
      if (roleError) {
        console.error('[generate-inspection-pdf] previewOnly has_role lookup failed', { callerId: previewCaller.id, err: roleError })
        return new Response(
          JSON.stringify({ error: 'Role lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!isAdmin) {
        console.warn('[generate-inspection-pdf] previewOnly blocked — non-admin caller', { callerId: previewCaller.id, inspectionId })
        return new Response(
          JSON.stringify({ error: 'Admin role required for previewOnly' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Generating PDF for inspection: ${inspectionId}, regenerate: ${regenerate}, previewOnly: ${previewOnly}`)

    // ===== STEP 1: Fetch inspection data with all related tables =====
    // Stage 4.3: photos are fetched via a separate query so we can filter
    // soft-deleted rows (.is('deleted_at', null)). PostgREST embedded
    // filters on non-inner joins are awkward; the split is cheaper than
    // wrestling with !inner semantics (which would drop inspections that
    // legitimately have no photos).
    const { data: inspection, error: fetchError } = await supabase
      .from('inspections')
      .select(`
        *,
        lead:leads(*),
        areas:inspection_areas(*,moisture_readings(*))
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

    // Stage 4.3: separate active-photos query (replaces relational select)
    const { data: activePhotos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('inspection_id', inspectionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (photosError) {
      console.error('Failed to fetch photos:', photosError)
      return new Response(
        JSON.stringify({ error: 'Photos fetch failed', details: photosError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    ;(inspection as Record<string, unknown>).photos = activePhotos ?? []

    // Stage 3.4.5: AI summary content lives in ai_summary_versions; read the
    // canonical version via the latest_ai_summary view and merge onto the
    // inspection object. Falls back to the legacy inspections column values
    // for inspections that pre-date the Stage 3.5 backfill (after Stage 3.5
    // those columns are dropped and only the view's values remain).
    const { data: latestSummary } = await supabase
      .from('latest_ai_summary')
      .select('ai_summary_text, what_we_found_text, what_we_will_do_text, what_you_get_text, problem_analysis_content, demolition_content')
      .eq('inspection_id', inspectionId)
      .maybeSingle()

    if (latestSummary) {
      ;(inspection as Record<string, unknown>).ai_summary_text = latestSummary.ai_summary_text ?? (inspection as Record<string, unknown>).ai_summary_text
      ;(inspection as Record<string, unknown>).what_we_found_text = latestSummary.what_we_found_text ?? (inspection as Record<string, unknown>).what_we_found_text
      ;(inspection as Record<string, unknown>).what_we_will_do_text = latestSummary.what_we_will_do_text ?? (inspection as Record<string, unknown>).what_we_will_do_text
      ;(inspection as Record<string, unknown>).what_you_get_text = latestSummary.what_you_get_text ?? (inspection as Record<string, unknown>).what_you_get_text
      ;(inspection as Record<string, unknown>).problem_analysis_content = latestSummary.problem_analysis_content ?? (inspection as Record<string, unknown>).problem_analysis_content
      ;(inspection as Record<string, unknown>).demolition_content = latestSummary.demolition_content ?? (inspection as Record<string, unknown>).demolition_content
    }

    // Validate lead status — PDF only allowed for completed inspections
    const validPdfStatuses = [
      'inspection_completed', 'inspection_ai_summary', 'approve_inspection_report',
      'inspection_report_pdf_completed', 'inspection_email_approval',
      'job_scheduled', 'job_waiting', 'job_completed', 'job_report_pdf_sent',
      'invoicing_sent', 'paid', 'google_review', 'finished',
      'closed', 'not_landed',
    ]
    const leadStatus = inspection.lead?.status
    if (leadStatus && !validPdfStatuses.includes(leadStatus)) {
      console.error(`PDF generation blocked: lead status is '${leadStatus}'`)
      return new Response(
        JSON.stringify({
          error: 'Inspection not complete. Complete all sections before generating PDF.',
          currentStatus: leadStatus,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Always fetch subfloor data regardless of subfloor_required; the render gate
    // at generateReportHtml handles suppression when subfloor_required === false.
    // Fetching unconditionally avoids a DB round-trip ordering dependency.
    console.log('Fetching subfloor data...')

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
      // Photos are already fetched in the main query, so also check those.
      // Stage 4.3: filter soft-deleted rows.
      const { data: sfPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('subfloor_id', sfData.id)
        .is('deleted_at', null)

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
      console.log('No subfloor data found — subfloor page will be omitted from PDF')
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

      // Deduplicate storage paths
      const uniquePaths = [...new Set(
        allPhotos.map(p => p.storage_path).filter(Boolean) as string[]
      )]

      // Process in batches of 10 with Promise.all for parallelism
      const BATCH_SIZE = 10
      for (let i = 0; i < uniquePaths.length; i += BATCH_SIZE) {
        const batch = uniquePaths.slice(i, i + BATCH_SIZE)
        const results = await Promise.all(
          batch.map(async (storagePath) => {
            try {
              const { data, error } = await supabase.storage
                .from('inspection-photos')
                .createSignedUrl(storagePath, 3600)
              if (data?.signedUrl && !error) {
                return { path: storagePath, url: data.signedUrl }
              }
              console.error(`Failed signed URL for ${storagePath}:`, error)
              return null
            } catch (err) {
              console.error(`Error signed URL for ${storagePath}:`, err)
              return null
            }
          })
        )
        for (const result of results) {
          if (result) photoSignedUrls.set(result.path, result.url)
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

    // Validate template has all required comment markers for regex-based section replacement.
    // Markers must match the current template structure
    // (pdf-templates/inspection-report-template-final.html in Supabase Storage).
    const requiredMarkers = [
      '<!-- Page 1: Cover',
      '<!-- Page 2: Value Proposition',
      '<!-- Page 3: Areas Inspected',
      '<!-- Page 4: Outdoor Environment',
      '<!-- Page 5: Subfloor',
      '<!-- Page 6: Problem Analysis',
      '<!-- Page 7: Demolition',
      '<!-- Page 8: Visual Mould Cleaning',
    ]
    const missingMarkers = requiredMarkers.filter(marker => !templateHtml.includes(marker))
    if (missingMarkers.length > 0) {
      console.error('Template validation failed. Missing markers:', missingMarkers)
      return new Response(
        JSON.stringify({
          error: 'PDF template is missing required comment markers',
          missingMarkers,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ===== STEP 5: Populate the template =====
    let populatedHtml = generateReportHtml(
      inspection as Inspection,
      templateHtml,
      inspectorName,
      subfloorData,
      subfloorReadings,
      subfloorPhotos
    )

    // Safety net: strip any unrendered {{placeholder}} tokens so the customer never sees raw template syntax.
    populatedHtml = populatedHtml.replace(/\{\{[a-zA-Z_]+\}\}/g, '')

    // ===== STEP 6: Save and return =====
    const newVersion = regenerate ? (inspection.pdf_version || 0) + 1 : (inspection.pdf_version || 1)

    // previewOnly: render HTML and return it with ZERO persistence side
    // effects — no inspections UPDATE, no bucket upload, no pdf_versions
    // INSERT. version + generatedAt are nulled to signal "not persisted".
    if (previewOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          html: populatedHtml,
          version: null,
          inspectionId,
          generatedAt: null,
          previewOnly: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (returnHtml) {
      await supabaseAudited
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

    // Update inspection record (audited write — uses JWT-bound client so
    // audit_log_trigger() captures the calling admin's UUID)
    const { error: updateError } = await supabaseAudited
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

    // pdf_versions.created_by has no default and no trigger, so a row is only
    // attributed if this insert sets it. Every row this function has ever
    // written is therefore NULL, which the Inspection Report History panel
    // renders as "Unknown". Resolve the caller from the JWT-bound client, the
    // same way the previewOnly branch above does.
    let callerId: string | null = null
    const { data: callerData, error: callerError } = await supabaseAudited.auth.getUser()
    if (callerError) {
      // Not fatal — the PDF is already written. Attribution degrades to NULL
      // rather than failing the render, but say so rather than swallowing it.
      console.warn('[generate-inspection-pdf] Caller lookup failed — pdf_versions.created_by will be NULL', callerError.message)
    } else {
      callerId = callerData?.user?.id ?? null
    }

    // Log to pdf_versions for audit trail
    const { error: versionError } = await supabase
      .from('pdf_versions')
      .insert({
        inspection_id: inspectionId,
        version_number: newVersion,
        created_by: callerId,
        // Anything outside 'hard_save' / 'manual_upload_fallback' still renders
        // as the "Legacy" badge, so naming the writer costs nothing visually.
        generation_type: 'legacy_ef',
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

    // Log to error_logs table (fire-and-forget)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const logClient = createClient(supabaseUrl, supabaseServiceKey)
        await logClient.from('error_logs').insert({
          error_type: 'edge_function_error',
          severity: 'critical',
          message: `PDF generation failed: ${errorMessage}`,
          stack_trace: error instanceof Error ? error.stack : null,
          context: { function: 'generate-inspection-pdf' },
          source: 'edge_function',
        })
      }
    } catch { /* non-blocking */ }

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
