// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate professional MRC inspection report sections.
// Phase 3 Stage 3.2: writes a versioned snapshot to public.ai_summary_versions
// for every successful generation (Bucket A audited write — JWT-bound client).

import { z } from 'https://esm.sh/zod@3.22.4'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RequestBodySchema = z.object({
  formData: z.record(z.unknown()),
  inspectionId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  section: z.string().optional(),
  structured: z.boolean().optional(),
  regenerationFeedback: z.string().max(2000, 'regenerationFeedback must be 2000 characters or less').optional(),
  currentContent: z.string().optional(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InspectionFormData {
  // Lead/Client Info
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  propertyAddress?: string
  propertySuburb?: string
  propertyState?: string
  propertyPostcode?: string
  issueDescription?: string
  internalNotes?: string

  // Inspection Details
  inspectionDate?: string
  inspector?: string
  triage?: string
  requestedBy?: string
  attentionTo?: string
  propertyOccupation?: string
  dwellingType?: string

  // Areas
  areas?: Array<{
    areaName: string
    mouldDescription?: string
    mouldVisibility: string[]
    commentsForReport: string
    temperature?: string
    humidity?: string
    dewPoint?: string
    timeWithoutDemo: number
    demolitionRequired: boolean
    demolitionTime: number
    demolitionDescription?: string
    moistureReadings?: Array<{
      title: string
      reading: string
    }>
    infraredEnabled?: boolean
    infraredObservations?: string[]
    externalMoisture?: string
  }>

  // Subfloor
  subfloorObservations?: string
  subfloorComments?: string
  subfloorLandscape?: string
  subfloorSanitation?: boolean
  subfloorTreatmentTime?: number
  subfloorReadings?: Array<{
    reading: string
    location: string
  }>

  // Outdoor
  outdoorTemperature?: string
  outdoorHumidity?: string
  outdoorDewPoint?: string
  outdoorComments?: string

  // Waste Disposal
  wasteDisposalEnabled?: boolean
  wasteDisposalAmount?: string

  // Work Procedure
  hepaVac?: boolean
  antimicrobial?: boolean
  stainRemovingAntimicrobial?: boolean
  homeSanitationFogging?: boolean
  commercialDehumidifierEnabled?: boolean
  commercialDehumidifierQty?: number
  airMoversEnabled?: boolean
  airMoversQty?: number
  rcdBoxEnabled?: boolean
  rcdBoxQty?: number

  // Job Summary Section
  recommendDehumidifier?: boolean
  dehumidifierSize?: string
  causeOfMould?: string
  additionalInfoForTech?: string
  additionalEquipmentComments?: string
  parkingOptions?: string

  // Cost Estimate
  laborCost?: number
  equipmentCost?: number
  subtotalExGst?: number
  gstAmount?: number
  totalIncGst?: number
}

interface RequestBody {
  formData: InspectionFormData
  inspectionId: string
  userId?: string
  section?: 'whatWeFound' | 'whatWeWillDo' | 'detailedAnalysis' | 'demolitionDetails'
  structured?: boolean
  regenerationFeedback?: string
  currentContent?: string
}

interface OpenRouterResult {
  text: string
  modelName: string | null
  promptTokens: number | null
  responseTokens: number | null
}

interface StructuredSummary {
  what_we_found: string
  what_we_will_do: string
  detailed_analysis: string
  demolition_details: string
}

// ============================================================================
// MRC SYSTEM PROMPT
// ============================================================================
const MRC_SYSTEM_PROMPT = `You are an expert mould inspection report writer for Mould & Restoration Co. (MRC), Melbourne's leading mould remediation company.

You create professional, comprehensive inspection reports using MRC's proven template format.

The PROBLEM ANALYSIS & RECOMMENDATIONS section is the core of every report. This is where you:
1. Clearly identify what was found with specific data (temperatures, humidity, moisture readings, dimensions)
2. Explain the primary cause in one clear statement
3. List 3-6 contributing factors with specific evidence
4. Explain WHY this happened (mechanism/root cause)
5. Provide specific, actionable recommendations prioritized by urgency
6. Paint a clear picture of success and timeline

Style requirements:
- Use specific addresses, measurements, and actual inspection data throughout
- Reference actual temperatures, humidity percentages, moisture readings from inspection
- Professional but accessible language
- Australian English spelling and terminology (mould, colour, vapour)
- Evidence-based, specific recommendations (not vague)
- Include actual timelines with specific day counts
- Each line adds value - no filler
- Build confidence through detailed analysis and clear action plans

You will generate content for THREE report sections when provided inspection data:

1. VALUE PROPOSITION - concise summary of what was found + detailed treatment plan
2. PROBLEM ANALYSIS & RECOMMENDATIONS - the MAIN section (comprehensive findings, causes, recommendations)
3. DEMOLITION DETAILS - specifications for material removal (if applicable)

Match the professional tone and structure exactly.`

// Helper: sanitize user-provided text before embedding in prompts
// Removes literal newlines, tabs, and collapses whitespace to prevent
// the AI from echoing back control characters inside JSON string values
function sanitizeField(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/\r\n/g, ' ')   // CRLF → space
    .replace(/\n/g, ' ')     // LF → space
    .replace(/\r/g, ' ')     // CR → space
    .replace(/\t/g, ' ')     // Tab → space
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim()
}

// ============================================================================
// FORMAT INSPECTION DATA as structured user prompt
// ============================================================================
function buildUserPrompt(formData: InspectionFormData): string {
  const lines: string[] = []

  // Property & Client
  const fullAddress = [
    formData.propertyAddress,
    formData.propertySuburb,
    formData.propertyState,
    formData.propertyPostcode
  ].filter(Boolean).map(v => sanitizeField(v)).join(', ')

  lines.push(`PROPERTY ADDRESS: ${fullAddress || 'Not specified'}`)
  if (formData.clientName) lines.push(`CUSTOMER: ${sanitizeField(formData.clientName)}`)
  if (formData.inspectionDate) lines.push(`INSPECTION DATE: ${formData.inspectionDate}`)
  if (formData.inspector) lines.push(`INSPECTOR: ${sanitizeField(formData.inspector)}`)
  if (formData.dwellingType) lines.push(`DWELLING TYPE: ${sanitizeField(formData.dwellingType)}`)
  if (formData.propertyOccupation) lines.push(`OCCUPATION: ${sanitizeField(formData.propertyOccupation)}`)

  // Initial issue from lead
  if (formData.issueDescription) {
    lines.push(`\nINITIAL ISSUE: ${sanitizeField(formData.issueDescription)}`)
  }

  // Areas Inspected
  if (formData.areas && formData.areas.length > 0) {
    lines.push('\nAREAS INSPECTED:')
    formData.areas.forEach((area) => {
      lines.push(`\nAREA: ${sanitizeField(area.areaName)}`)
      if (area.mouldDescription) lines.push(`- Mould Description: ${sanitizeField(area.mouldDescription)}`)
      if (area.temperature) lines.push(`- Temperature: ${area.temperature}°C`)
      if (area.humidity) lines.push(`- Humidity: ${area.humidity}%`)
      if (area.dewPoint) lines.push(`- Dew Point: ${area.dewPoint}°C`)

      if (area.moistureReadings && area.moistureReadings.length > 0) {
        area.moistureReadings.forEach(r => {
          lines.push(`- Internal Moisture (${sanitizeField(r.title)}): ${r.reading}%`)
        })
      }

      if (area.externalMoisture) lines.push(`- External Moisture: ${sanitizeField(area.externalMoisture)}%`)
      if (area.commentsForReport) lines.push(`- Comments: ${sanitizeField(area.commentsForReport)}`)
      lines.push(`- Demolition Required: ${area.demolitionRequired ? 'YES' : 'NO'}`)
      lines.push(`- Time Without Demolition: ${area.timeWithoutDemo} hours`)

      if (area.demolitionRequired) {
        lines.push(`- Demolition Time: ${area.demolitionTime} hours`)
        if (area.demolitionDescription) lines.push(`- Demolition Description: ${sanitizeField(area.demolitionDescription)}`)
      }

      if (area.infraredEnabled && area.infraredObservations && area.infraredObservations.length > 0) {
        lines.push(`- Infrared Observations: ${area.infraredObservations.map(o => sanitizeField(o)).join(', ')}`)
      }
    })
  }

  // Subfloor
  const hasSubfloorData = formData.subfloorObservations || formData.subfloorComments ||
    formData.subfloorLandscape || (formData.subfloorReadings && formData.subfloorReadings.length > 0)
  if (hasSubfloorData) {
    lines.push('\nSUBFLOOR ASSESSMENT:')
    if (formData.subfloorObservations) lines.push(`- Observation: ${sanitizeField(formData.subfloorObservations)}`)
    if (formData.subfloorLandscape) lines.push(`- Landscape: ${sanitizeField(formData.subfloorLandscape)}`)
    if (formData.subfloorComments) lines.push(`- Comments: ${sanitizeField(formData.subfloorComments)}`)
    if (formData.subfloorSanitation) lines.push('- Sanitation Required: Yes')
    if (formData.subfloorTreatmentTime) lines.push(`- Treatment Time: ${formData.subfloorTreatmentTime} hours`)
    if (formData.subfloorReadings && formData.subfloorReadings.length > 0) {
      lines.push('- Moisture Readings:')
      formData.subfloorReadings.forEach(r => {
        lines.push(`  • ${r.reading}% at ${sanitizeField(r.location)}`)
      })
    }
  }

  // Environmental Data
  lines.push('\nOUTDOOR CONDITIONS:')
  if (formData.outdoorTemperature) lines.push(`- Temperature: ${formData.outdoorTemperature}°C`)
  if (formData.outdoorHumidity) lines.push(`- Humidity: ${formData.outdoorHumidity}%`)
  if (formData.outdoorDewPoint) lines.push(`- Dew Point: ${formData.outdoorDewPoint}°C`)
  if (formData.outdoorComments) lines.push(`- Comments: ${sanitizeField(formData.outdoorComments)}`)

  // Treatment Plan
  const treatments: string[] = []
  if (formData.hepaVac) treatments.push('HEPA Vacuum')
  if (formData.antimicrobial) treatments.push('Antimicrobial Treatment')
  if (formData.stainRemovingAntimicrobial) treatments.push('Stain-Removing Antimicrobial')
  if (formData.homeSanitationFogging) treatments.push('Home Sanitation/Fogging')
  if (treatments.length > 0) {
    lines.push(`\nTREATMENT METHODS: ${treatments.join(', ')}`)
  }

  // Equipment
  const equipment: string[] = []
  if (formData.commercialDehumidifierEnabled && formData.commercialDehumidifierQty) {
    equipment.push(`${formData.commercialDehumidifierQty}x Commercial Dehumidifier`)
  }
  if (formData.airMoversEnabled && formData.airMoversQty) {
    equipment.push(`${formData.airMoversQty}x Air Mover`)
  }
  if (formData.rcdBoxEnabled && formData.rcdBoxQty) {
    equipment.push(`${formData.rcdBoxQty}x RCD Safety Box`)
  }
  if (equipment.length > 0) {
    lines.push(`DRYING EQUIPMENT: ${equipment.join(', ')}`)
  }

  // Waste
  if (formData.wasteDisposalEnabled && formData.wasteDisposalAmount) {
    lines.push(`WASTE DISPOSAL: ${formData.wasteDisposalAmount}`)
  }

  // Cause
  if (formData.causeOfMould) {
    lines.push(`\nIDENTIFIED CAUSE OF MOULD: ${sanitizeField(formData.causeOfMould)}`)
  }

  // Additional context
  if (formData.additionalInfoForTech) lines.push(`ADDITIONAL INFO: ${sanitizeField(formData.additionalInfoForTech)}`)
  if (formData.additionalEquipmentComments) lines.push(`EQUIPMENT NOTES: ${sanitizeField(formData.additionalEquipmentComments)}`)
  if (formData.internalNotes) lines.push(`\nINTERNAL NOTES: ${sanitizeField(formData.internalNotes)}`)

  // Cost
  if (formData.totalIncGst && formData.totalIncGst > 0) {
    lines.push(`\nCOST ESTIMATE:`)
    lines.push(`- Labor: $${(formData.laborCost || 0).toFixed(2)} (ex GST)`)
    lines.push(`- Equipment: $${(formData.equipmentCost || 0).toFixed(2)} (ex GST)`)
    lines.push(`- Total: $${(formData.totalIncGst || 0).toFixed(2)} (inc GST)`)
  }

  return lines.join('\n')
}

// ============================================================================
// CALL OPENROUTER API (with model fallback)
// ============================================================================
const MODELS = [
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash-preview',
  'google/gemini-2.0-flash-thinking-exp:free',
]

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<OpenRouterResult> {
  const errors: string[] = []

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`)
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://mrc-app.vercel.app',
            'X-Title': 'MRC Inspection Report Generator'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            top_p: 0.95
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        const isRateLimit = response.status === 429 || errorText.toLowerCase().includes('rate')
        console.warn(`Model ${model} failed (${response.status}): ${errorText.slice(0, 150)}`)
        errors.push(`${model}: ${response.status}`)
        if (isRateLimit) continue // try next model
        throw new Error(`OpenRouter API failed: ${errorText.slice(0, 200)}`)
      }

      const result = await response.json()
      const text = result?.choices?.[0]?.message?.content
      if (!text) {
        console.warn(`Model ${model} returned empty content`)
        errors.push(`${model}: empty response`)
        continue
      }
      console.log(`Success with model: ${model}`)
      return {
        text: text.trim(),
        modelName: typeof result?.model === 'string' ? result.model : model,
        promptTokens: typeof result?.usage?.prompt_tokens === 'number' ? result.usage.prompt_tokens : null,
        responseTokens: typeof result?.usage?.completion_tokens === 'number' ? result.usage.completion_tokens : null,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.startsWith('OpenRouter API failed:')) throw err
      console.warn(`Model ${model} error: ${msg}`)
      errors.push(`${model}: ${msg}`)
    }
  }

  throw new Error(`All models rate-limited: ${errors.join(' | ')}`)
}

// SHA-256 hex hash. Used to identify the system prompt that produced a version.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Build a Supabase client. JWT-bound when authHeader present (Bucket A pattern —
// audit_log_trigger captures auth.uid()). Falls back to service role.
function buildAuditedClient(supabaseUrl: string, anonKey: string, serviceKey: string, authHeader: string | null): SupabaseClient {
  if (authHeader) {
    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
  }
  console.warn('[generate-inspection-summary] No Authorization header — falling back to service role; audit attribution will be NULL')
  return createClient(supabaseUrl, serviceKey)
}

interface VersionContent {
  aiSummaryText: string | null
  whatWeFoundText: string | null
  whatWeWillDoText: string | null
  problemAnalysisContent: string | null
  demolitionContent: string | null
}

// Insert a new ai_summary_versions row and supersede the previous active version.
// Race-safe: retries on UNIQUE(inspection_id, version_number) violation.
// Best-effort: any error is logged and returned but does not throw — the
// caller still returns the AI text to the user so a transient DB issue does
// not lose their generated content.
async function persistVersionRow(args: {
  client: SupabaseClient
  inspectionId: string
  userId: string | undefined
  modelName: string | null
  systemPromptHash: string
  userPrompt: string
  promptTokens: number | null
  responseTokens: number | null
  regenerationFeedback: string | null
  content: VersionContent
}): Promise<{ versionId: string | null; versionNumber: number | null; generationType: 'initial' | 'regeneration' | null; error: string | null }> {
  const { client, inspectionId, userId, modelName, systemPromptHash, userPrompt, promptTokens, responseTokens, regenerationFeedback, content } = args

  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data: maxRow, error: maxErr } = await client
      .from('ai_summary_versions')
      .select('version_number')
      .eq('inspection_id', inspectionId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxErr) {
      return { versionId: null, versionNumber: null, generationType: null, error: `version max query failed: ${maxErr.message}` }
    }

    const previousMax = (maxRow?.version_number as number | undefined) ?? 0
    const nextVersion = previousMax + 1
    const generationType: 'initial' | 'regeneration' = previousMax === 0 ? 'initial' : 'regeneration'

    const { data: inserted, error: insertErr } = await client
      .from('ai_summary_versions')
      .insert({
        inspection_id: inspectionId,
        version_number: nextVersion,
        generation_type: generationType,
        generated_by: userId ?? null,
        model_name: modelName,
        system_prompt_hash: systemPromptHash,
        user_prompt: userPrompt,
        prompt_tokens: promptTokens,
        response_tokens: responseTokens,
        regeneration_feedback: regenerationFeedback,
        ai_summary_text: content.aiSummaryText,
        what_we_found_text: content.whatWeFoundText,
        what_we_will_do_text: content.whatWeWillDoText,
        problem_analysis_content: content.problemAnalysisContent,
        demolition_content: content.demolitionContent,
      })
      .select('id')
      .single()

    if (insertErr) {
      // 23505 = unique_violation — concurrent insert took our version_number; retry
      const isUniqueViolation = (insertErr as { code?: string }).code === '23505'
      if (isUniqueViolation && attempt < MAX_ATTEMPTS) {
        console.warn(`[persistVersionRow] version_number ${nextVersion} taken (attempt ${attempt}); retrying`)
        continue
      }
      return { versionId: null, versionNumber: null, generationType: null, error: `version insert failed: ${insertErr.message}` }
    }

    const newId = inserted?.id as string

    // Supersede previous active version(s). Update is best-effort — if it fails,
    // the new row still exists and reflects the latest generation.
    if (previousMax > 0) {
      const { error: supersedeErr } = await client
        .from('ai_summary_versions')
        .update({
          superseded_at: new Date().toISOString(),
          superseded_by_version_id: newId,
        })
        .eq('inspection_id', inspectionId)
        .neq('id', newId)
        .is('superseded_at', null)

      if (supersedeErr) {
        console.warn('[persistVersionRow] supersession update failed:', supersedeErr.message)
      }
    }

    return { versionId: newId, versionNumber: nextVersion, generationType, error: null }
  }

  return { versionId: null, versionNumber: null, generationType: null, error: 'exceeded retry limit on version_number unique violation' }
}

// Prefix injected into the user prompt when the reviewer supplied feedback.
function buildFeedbackPreamble(feedback: string | undefined): string {
  if (!feedback || !feedback.trim()) return ''
  return `Reviewer feedback to incorporate (apply to every section you generate):\n"${sanitizeField(feedback)}"\n\n`
}

// Helper: extract JSON from AI response that may include markdown fencing or preamble
function extractJson(raw: string): string {
  let text = raw.trim()
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim()
  }
  if (!text.startsWith('{')) {
    const idx = text.indexOf('{')
    if (idx !== -1) text = text.slice(idx)
  }
  const lastBrace = text.lastIndexOf('}')
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1)
  }

  // Fix control characters ONLY inside JSON string values (not structural whitespace)
  // Walk char-by-char tracking whether we're inside a quoted string
  const result: string[] = []
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      result.push(ch)
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result.push(ch)
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result.push(ch)
      continue
    }

    if (inString) {
      const code = ch.charCodeAt(0)
      if ((code >= 0x00 && code <= 0x1F) || code === 0x7F) {
        // Replace control chars inside strings with escape sequences
        if (ch === '\n') { result.push('\\n'); continue }
        if (ch === '\r') { result.push('\\r'); continue }
        if (ch === '\t') { result.push('\\t'); continue }
        // Strip other control chars
        continue
      }
    }

    result.push(ch)
  }

  return result.join('')
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
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

    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const rawBody = await req.json()
    const parseResult = RequestBodySchema.safeParse(rawBody)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', issues: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { formData, inspectionId, userId, section, structured, regenerationFeedback, currentContent } = parseResult.data as RequestBody

    const authHeader = req.headers.get('Authorization')
    const supabaseAudited = supabaseUrl
      ? buildAuditedClient(supabaseUrl, supabaseAnonKey, supabaseServiceKey, authHeader)
      : null
    const systemPromptHash = await sha256Hex(MRC_SYSTEM_PROMPT)
    const feedbackPreamble = buildFeedbackPreamble(regenerationFeedback)

    const userDataPrompt = buildUserPrompt(formData)
    const hasDemolition = formData.areas?.some(a => a.demolitionRequired) || false

    // ================================================================
    // STRUCTURED MODE — generate all sections as JSON
    // ================================================================
    if (structured) {
      const demolitionInstruction = hasDemolition
        ? `"demolition_details": "Generate DEMOLITION DETAILS section with header: **Specifications for Material Removal**\\n\\nThen for each area requiring demolition, write:\\n**[Area Name]**\\n[Specific dimensions and materials to be removed — plasterboard, carpet, timber etc.]\\n[Description of affected areas and scope of removal]\\n\\nCover all demolition areas from the inspection data. Include total demolition hours."`
        : `"demolition_details": ""`

      const structuredUserPrompt = `${feedbackPreamble}Generate professional inspection report sections for this property.

${userDataPrompt}

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "VALUE PROPOSITION - WHAT WE FOUND subsection. Write 1-2 concise sentences describing the main issue and its impact on the property. Keep it brief — this is a summary for the cover page.",
  "detailed_analysis": "This is the MAIN SECTION — Problem Analysis & Recommendations. Generate using this EXACT format with subsections separated by \\n\\n:\\n\\n**WHAT WE DISCOVERED**\\n[Comprehensive paragraph: specific address, what was found, severity, impact. Reference inspection data: temp, humidity, moisture readings, areas affected. Be specific with room names and measurements.]\\n\\n**\\ud83d\\udd0d IDENTIFIED CAUSES**\\n\\n**Primary Cause:**\\n- [Single clear statement of main issue]\\n\\n**Contributing Factors:**\\n1. [Factor 1 with specific data from inspection]\\n2. [Factor 2 with specific data]\\n3. [Factor 3 with specific data]\\n4. [Factor 4 if applicable]\\n5. [Factor 5 if applicable]\\n6. [Factor 6 if applicable]\\n\\n**WHY THIS HAPPENED**\\n[Paragraph explaining mechanism: how this type of failure occurs, why moisture persists, consequences if not addressed]\\n\\n**\\ud83d\\udccb RECOMMENDATIONS**\\n\\n**IMMEDIATE ACTIONS WEEK 1**\\n1. [Urgent action 1 with explanation]\\n2. [Urgent action 2 with explanation]\\n3. [Urgent action 3 with explanation]\\n4. [Urgent action 4 with explanation]\\n\\n**LONG-TERM PROTECTION**\\n- [Protection measure 1 with explanation]\\n- [Protection measure 2 with explanation]\\n- [Protection measure 3 with explanation]\\n\\n**WHAT SUCCESS LOOKS LIKE**\\n[Paragraph describing expected outcomes, air quality restoration, timeline for reoccupancy, warranty coverage]\\n\\n**TIMELINE**\\n- MRC treatment: X days\\n- Drying equipment: X days\\n- Specialist work (if needed): X days\\n- Total project: X days\\n- Property reoccupancy: X hours/days after completion",
  "what_we_will_do": "WHAT WE'RE GOING TO DO section — detailed treatment plan. Write 2-3 paragraphs describing: the complete remediation approach, step-by-step treatment process (HEPA vacuuming, antimicrobial application, stain removal, fogging), equipment to be deployed (specific quantities of dehumidifiers, air movers, RCD boxes), any demolition or material removal required, drying period, and expected outcomes. Be specific with quantities and timelines. This is a standalone section, not a 1-2 sentence summary.",
  ${demolitionInstruction}
}

CRITICAL RULES:
- what_we_found: 1-2 sentences ONLY (cover page summary)
- detailed_analysis: This is the MAIN SECTION — must be comprehensive with all subsections using ** bold headers and emoji icons
- what_we_will_do: 2-3 detailed paragraphs about the treatment plan (NOT a short summary)
- Reference specific room names, actual temperature/humidity/moisture readings from the data
- Australian English (mould, colour, vapour)
- Do NOT leave any placeholder brackets — use real data from the inspection
- Use \\n\\n to separate subsections
- Use \\n for line breaks within lists
- Contributing Factors MUST be numbered (1. 2. 3. etc.)
- Include specific timelines with actual day counts calculated from treatment hours

Return ONLY the JSON object:`

      console.log('Calling OpenRouter API for STRUCTURED output...')

      try {
        const aiResult = await callOpenRouter(openrouterApiKey, MRC_SYSTEM_PROMPT, structuredUserPrompt, 5000)
        console.log('Raw AI response (first 300 chars):', aiResult.text.slice(0, 300))

        const cleanedText = extractJson(aiResult.text)
        const structuredData: StructuredSummary = JSON.parse(cleanedText)

        // Persist a new ai_summary_versions row (best-effort — never fails the request)
        let versionMeta: { versionId: string | null; versionNumber: number | null; generationType: string | null } = { versionId: null, versionNumber: null, generationType: null }
        if (supabaseAudited) {
          const persistResult = await persistVersionRow({
            client: supabaseAudited,
            inspectionId,
            userId,
            modelName: aiResult.modelName,
            systemPromptHash,
            userPrompt: structuredUserPrompt,
            promptTokens: aiResult.promptTokens,
            responseTokens: aiResult.responseTokens,
            regenerationFeedback: regenerationFeedback ?? null,
            content: {
              aiSummaryText: structuredData.what_we_found || null,
              whatWeFoundText: structuredData.what_we_found || null,
              whatWeWillDoText: structuredData.what_we_will_do || null,
              problemAnalysisContent: structuredData.detailed_analysis || null,
              demolitionContent: structuredData.demolition_details || null,
            },
          })
          if (persistResult.error) {
            console.warn('[generate-inspection-summary] persistVersionRow failed:', persistResult.error)
          } else {
            versionMeta = persistResult
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            structured: true,
            ...structuredData,
            version_id: versionMeta.versionId,
            version_number: versionMeta.versionNumber,
            generation_type: versionMeta.generationType,
            generated_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (parseError) {
        const errMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error'
        console.error('Structured generation failed:', errMsg)
        return new Response(
          JSON.stringify({
            success: false,
            error: `AI generation failed: ${errMsg}`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ================================================================
    // SECTION-SPECIFIC REGENERATION
    // ================================================================
    const isRegeneration = regenerationFeedback && currentContent
    let userPrompt: string
    let maxTokens = 800

    // Regeneration preamble
    const regenPreamble = (sectionName: string, formatNote: string) => {
      const safeContent = sanitizeField(currentContent)
      const safePrompt = sanitizeField(regenerationFeedback)
      return `You previously generated this "${sectionName}" content for a mould inspection report:

"${safeContent}"

The user wants you to regenerate it with this specific change:
"${safePrompt}"

CRITICAL INSTRUCTIONS:
1. Follow the user's instruction EXACTLY
2. If they say "make it shorter" — reduce word count by 30-50%
3. If they say "make it more detailed" — expand with more specifics from the data
4. If they say "add detail about X" — expand that specific topic
5. ${formatNote}
6. Use Australian English (mould not mold)
7. Maintain professional tone for a customer-facing report

[Inspection data for reference]:
${userDataPrompt}

Now regenerate following their instruction. Return ONLY the regenerated text (no JSON wrapping):`
    }

    if (section === 'whatWeFound') {
      if (isRegeneration) {
        userPrompt = regenPreamble('What We Found', 'Keep it to 1-2 concise sentences — this is a cover page summary')
      } else {
        userPrompt = `Generate the VALUE PROPOSITION "WHAT WE FOUND" subsection for this mould inspection report.

${userDataPrompt}

Write 1-2 concise sentences describing the main issue found and its impact on the property.
This appears on the cover/summary page so keep it brief but impactful.
Reference specific areas and severity.
Return ONLY the 1-2 sentences, nothing else.`
      }
    } else if (section === 'whatWeWillDo') {
      maxTokens = 1500
      if (isRegeneration) {
        userPrompt = regenPreamble("What We're Going To Do", 'Write 2-3 detailed paragraphs about the complete treatment plan including specific equipment quantities, treatment methods, timelines')
      } else {
        userPrompt = `Generate the "WHAT WE'RE GOING TO DO" section for this mould inspection report.

${userDataPrompt}

Write 2-3 detailed paragraphs describing:
- The complete remediation approach and step-by-step treatment process
- Treatment methods: HEPA vacuuming, antimicrobial application, stain removal, fogging
- Equipment to be deployed with specific quantities (dehumidifiers, air movers, RCD boxes)
- Any demolition or material removal required
- Drying period and monitoring
- Expected outcomes and timeline

Be specific with quantities, methods, and timelines. This is a standalone treatment plan section.
Australian English. Professional but reassuring tone.
Return ONLY the paragraphs, nothing else.`
      }
    } else if (section === 'detailedAnalysis') {
      maxTokens = 3500
      if (isRegeneration) {
        userPrompt = regenPreamble('Problem Analysis & Recommendations', 'Maintain the multi-subsection format with **bold headers**, emoji icons (🔍 📋), numbered Contributing Factors, and all subsections: WHAT WE DISCOVERED, IDENTIFIED CAUSES, WHY THIS HAPPENED, RECOMMENDATIONS, WHAT SUCCESS LOOKS LIKE, TIMELINE')
      } else {
        userPrompt = `Generate the PROBLEM ANALYSIS & RECOMMENDATIONS section for this mould inspection report. This is the MAIN section of the report.

${userDataPrompt}

Use this EXACT format with **bold** headers and emoji icons:

**WHAT WE DISCOVERED**
[Comprehensive paragraph: specific address, what was found, severity, impact. Reference temp, humidity, moisture readings, areas affected. Be specific with room names and measurements.]

**🔍 IDENTIFIED CAUSES**

**Primary Cause:**
- [Single clear statement of main issue based on inspection evidence]

**Contributing Factors:**
1. [Factor 1 with specific data from inspection]
2. [Factor 2 with specific data]
3. [Factor 3 with specific data]
4. [Factor 4 if applicable]
5. [Factor 5 if applicable]
6. [Factor 6 if applicable]

**WHY THIS HAPPENED**
[Paragraph explaining mechanism: how this type of failure occurs, why moisture persists, consequences if not addressed]

**📋 RECOMMENDATIONS**

**IMMEDIATE ACTIONS WEEK 1**
1. [Urgent action 1 with explanation]
2. [Urgent action 2 with explanation]
3. [Urgent action 3 with explanation]
4. [Urgent action 4 with explanation]

**LONG-TERM PROTECTION**
- [Protection measure 1 with explanation]
- [Protection measure 2 with explanation]
- [Protection measure 3 with explanation]

**WHAT SUCCESS LOOKS LIKE**
[Paragraph describing expected outcomes, air quality restoration, timeline for reoccupancy, warranty coverage]

**TIMELINE**
- MRC treatment: X days
- Drying equipment: X days
- Specialist work (if needed): X days
- Total project: X days
- Property reoccupancy: X hours/days after completion

CRITICAL: Use real data from the inspection — temperatures, humidity, moisture readings, room names. Do NOT use placeholder brackets. Australian English. Include specific timelines with actual day counts.
Return ONLY the formatted analysis text, no JSON wrapping.`
      }
    } else if (section === 'demolitionDetails') {
      if (isRegeneration) {
        userPrompt = regenPreamble('Demolition Details', 'Use **bold** for area names and the Specifications header. List specific materials and dimensions.')
      } else {
        userPrompt = `Generate the DEMOLITION DETAILS section for this mould inspection report.

${userDataPrompt}

Use this format with **bold** headers:

**Specifications for Material Removal**

**[Area Name]**
[Specific dimensions and materials to be removed — plasterboard, carpet, timber etc.]
[Description of affected areas and scope of removal]

[Continue for all demolition areas]

Reference specific rooms, materials, dimensions, and demolition hours from the data.
Return ONLY the formatted demolition details, no JSON wrapping.`
      }
    } else {
      userPrompt = `Generate a brief professional mould inspection summary based on this data:
${userDataPrompt}

Write 2 paragraphs in flowing prose. Australian English.`
    }

    // Inject reviewer feedback for fresh-generation paths. Regeneration paths
    // already wove regenerationFeedback into the prompt via regenPreamble.
    const userPromptWithFeedback = isRegeneration ? userPrompt : `${feedbackPreamble}${userPrompt}`

    console.log(`Calling OpenRouter API for section: ${section || 'default'}...`)
    const aiResult = await callOpenRouter(openrouterApiKey, MRC_SYSTEM_PROMPT, userPromptWithFeedback, maxTokens)

    // Persist a new ai_summary_versions row carrying forward the other sections
    // from the latest active version, replacing only the regenerated section.
    let versionMeta: { versionId: string | null; versionNumber: number | null; generationType: string | null } = { versionId: null, versionNumber: null, generationType: null }
    if (supabaseAudited) {
      const { data: previous } = await supabaseAudited
        .from('ai_summary_versions')
        .select('ai_summary_text, what_we_found_text, what_we_will_do_text, problem_analysis_content, demolition_content')
        .eq('inspection_id', inspectionId)
        .is('superseded_at', null)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const baseContent: VersionContent = {
        aiSummaryText: (previous?.ai_summary_text as string | null | undefined) ?? null,
        whatWeFoundText: (previous?.what_we_found_text as string | null | undefined) ?? null,
        whatWeWillDoText: (previous?.what_we_will_do_text as string | null | undefined) ?? null,
        problemAnalysisContent: (previous?.problem_analysis_content as string | null | undefined) ?? null,
        demolitionContent: (previous?.demolition_content as string | null | undefined) ?? null,
      }

      const regenContent: VersionContent = { ...baseContent }
      if (section === 'whatWeFound') {
        regenContent.whatWeFoundText = aiResult.text
        regenContent.aiSummaryText = aiResult.text
      } else if (section === 'whatWeWillDo') {
        regenContent.whatWeWillDoText = aiResult.text
      } else if (section === 'detailedAnalysis') {
        regenContent.problemAnalysisContent = aiResult.text
      } else if (section === 'demolitionDetails') {
        regenContent.demolitionContent = aiResult.text
      }

      const persistResult = await persistVersionRow({
        client: supabaseAudited,
        inspectionId,
        userId,
        modelName: aiResult.modelName,
        systemPromptHash,
        userPrompt: userPromptWithFeedback,
        promptTokens: aiResult.promptTokens,
        responseTokens: aiResult.responseTokens,
        regenerationFeedback: regenerationFeedback ?? null,
        content: regenContent,
      })
      if (persistResult.error) {
        console.warn('[generate-inspection-summary] persistVersionRow failed:', persistResult.error)
      } else {
        versionMeta = persistResult
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: aiResult.text,
        version_id: versionMeta.versionId,
        version_number: versionMeta.versionNumber,
        generation_type: versionMeta.generationType,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-inspection-summary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log to error_logs table (fire-and-forget)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            error_type: 'edge_function_error',
            severity: 'critical',
            message: `AI summary generation failed: ${errorMessage}`,
            stack_trace: error instanceof Error ? error.stack : null,
            context: { function: 'generate-inspection-summary' },
            source: 'edge_function',
          }),
        })
      }
    } catch { /* non-blocking */ }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to generate summary: ${errorMessage}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
