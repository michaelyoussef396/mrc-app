// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate professional inspection report sections (MRC style)

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
  }>

  // Subfloor
  subfloorObservations?: string
  subfloorComments?: string
  subfloorLandscape?: string
  subfloorSanitation?: boolean
  subfloorRacking?: boolean
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
  feedback?: string
  section?: 'whatWeFound' | 'whatWeWillDo' | 'problemAnalysis' | 'demolitionDetails' | 'overviewConclusion'
  structured?: boolean
  customPrompt?: string
  currentContent?: string
}

interface StructuredSummary {
  what_we_found: string
  what_we_will_do: string
  problem_analysis: string
  overview_conclusion: string
  demolition_details: string
}

// ============================================================================
// MRC SYSTEM PROMPT — defines the report writing style
// ============================================================================
const MRC_SYSTEM_PROMPT = `You are a professional mould inspection report writer for Mould & Restoration Co. (MRC), a Melbourne-based mould remediation company. You follow the MRC reporting template style.

Your writing style:
- Use phrases like "as there is", "on the other hand", "however", "it is recommended"
- Be specific with locations, measurements, and observations
- Reference actual inspection data (temperatures, humidity, moisture readings)
- Professional but accessible language
- Australian English spelling (mould, colour, vapour, etc.)
- Be comprehensive but concise
- Each section exactly 2 paragraphs maximum
- Write in flowing prose paragraphs — do NOT use bullet points, numbered lists, or emoji headers
- Do NOT use markdown formatting (no **, no #, no - bullets)
- Write as if composing a formal inspection report for a homeowner`

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
  ].filter(Boolean).join(', ')

  lines.push(`PROPERTY: ${fullAddress || 'Not specified'}`)
  if (formData.clientName) lines.push(`CUSTOMER: ${formData.clientName}`)
  if (formData.inspectionDate) lines.push(`INSPECTION DATE: ${formData.inspectionDate}`)
  if (formData.inspector) lines.push(`INSPECTOR: ${formData.inspector}`)
  if (formData.dwellingType) lines.push(`DWELLING TYPE: ${formData.dwellingType}`)
  if (formData.propertyOccupation) lines.push(`OCCUPATION: ${formData.propertyOccupation}`)

  // Initial issue from lead
  if (formData.issueDescription) {
    lines.push(`\nINITIAL ISSUE: ${formData.issueDescription}`)
  }

  // Areas Inspected
  if (formData.areas && formData.areas.length > 0) {
    lines.push('\nAREAS INSPECTED:')
    formData.areas.forEach((area) => {
      lines.push(`\n- Area: ${area.areaName}`)
      if (area.mouldDescription) lines.push(`  Mould Description: ${area.mouldDescription}`)
      if (area.temperature) lines.push(`  Temperature: ${area.temperature}°C`)
      if (area.humidity) lines.push(`  Humidity: ${area.humidity}%`)
      if (area.dewPoint) lines.push(`  Dew Point: ${area.dewPoint}°C`)

      if (area.moistureReadings && area.moistureReadings.length > 0) {
        const readings = area.moistureReadings.map(r => `${r.title}: ${r.reading}%`).join(', ')
        lines.push(`  Moisture Readings: ${readings}`)
      }

      if (area.commentsForReport) lines.push(`  Comments: ${area.commentsForReport}`)
      lines.push(`  Treatment Time: ${area.timeWithoutDemo} hours`)

      if (area.demolitionRequired) {
        lines.push(`  Demolition Required: Yes (${area.demolitionTime} hours)`)
        if (area.demolitionDescription) lines.push(`  Demolition Description: ${area.demolitionDescription}`)
      }

      if (area.infraredEnabled && area.infraredObservations && area.infraredObservations.length > 0) {
        lines.push(`  Infrared Observations: ${area.infraredObservations.join(', ')}`)
      }
    })
  }

  // Subfloor
  const hasSubfloorData = formData.subfloorObservations || formData.subfloorComments ||
    formData.subfloorLandscape || (formData.subfloorReadings && formData.subfloorReadings.length > 0)
  if (hasSubfloorData) {
    lines.push('\nSUBFLOOR DATA:')
    if (formData.subfloorObservations) lines.push(`- Observation: ${formData.subfloorObservations}`)
    if (formData.subfloorLandscape) lines.push(`- Landscape: ${formData.subfloorLandscape}`)
    if (formData.subfloorComments) lines.push(`- Comments: ${formData.subfloorComments}`)
    if (formData.subfloorSanitation) lines.push('- Sanitation Required: Yes')
    if (formData.subfloorRacking) lines.push('- Racking Required: Yes')
    if (formData.subfloorTreatmentTime) lines.push(`- Treatment Time: ${formData.subfloorTreatmentTime} hours`)
    if (formData.subfloorReadings && formData.subfloorReadings.length > 0) {
      const readings = formData.subfloorReadings.map(r => `${r.reading}% at ${r.location}`).join(', ')
      lines.push(`- Moisture Readings: ${readings}`)
    }
  }

  // Environmental Data
  lines.push('\nENVIRONMENTAL DATA:')
  if (formData.outdoorTemperature) lines.push(`- Outdoor Temp: ${formData.outdoorTemperature}°C`)
  if (formData.outdoorHumidity) lines.push(`- Outdoor Humidity: ${formData.outdoorHumidity}%`)
  if (formData.outdoorDewPoint) lines.push(`- Outdoor Dew Point: ${formData.outdoorDewPoint}°C`)
  if (formData.outdoorComments) lines.push(`- Outdoor Comments: ${formData.outdoorComments}`)

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
    lines.push(`\nIDENTIFIED CAUSE OF MOULD: ${formData.causeOfMould}`)
  }

  // Additional context
  if (formData.additionalInfoForTech) lines.push(`ADDITIONAL INFO: ${formData.additionalInfoForTech}`)
  if (formData.additionalEquipmentComments) lines.push(`EQUIPMENT NOTES: ${formData.additionalEquipmentComments}`)
  if (formData.internalNotes) lines.push(`\nINTERNAL NOTES: ${formData.internalNotes}`)

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
// CALL OPENROUTER API — now with system + user messages
// ============================================================================
async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
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
        model: 'google/gemini-2.0-flash-001',
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
    console.error('OpenRouter API error:', response.status, errorText)
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText.slice(0, 200)}`)
  }

  const result = await response.json()
  const text = result?.choices?.[0]?.message?.content
  if (!text) {
    console.error('OpenRouter response had no content:', JSON.stringify(result).slice(0, 500))
    throw new Error('No text in OpenRouter response')
  }
  return text.trim()
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
  return text
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

    const { formData, section, structured, customPrompt, currentContent }: RequestBody = await req.json()

    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing formData in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userDataPrompt = buildUserPrompt(formData)
    const hasDemolition = formData.areas?.some(a => a.demolitionRequired) || false

    // ================================================================
    // STRUCTURED MODE — generate all sections as JSON
    // ================================================================
    if (structured) {
      const demolitionField = hasDemolition
        ? `"demolition_details": "1-2 paragraphs detailing all demolition work required. For each area, describe what materials will be removed (plasterboard, carpet, timber), why demolition is necessary, and how the area will be prepared after removal. Include total demolition hours."`
        : `"demolition_details": ""`

      const structuredUserPrompt = `Generate the inspection report sections for this property.

${userDataPrompt}

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "WHAT WE FOUND section. Exactly 2 paragraphs describing: what mould/moisture issues were identified, where they were found, severity, underlying causes, and structural concerns. Use specific inspection data — temperatures, humidity percentages, moisture readings, room names.",
  "what_we_will_do": "WHAT WE'RE GOING TO DO section. Exactly 2 paragraphs describing: the remediation approach, step-by-step process, timeline, equipment to be deployed, and expected outcomes. Be specific about demolition if required, equipment quantities, and treatment methods.",
  "problem_analysis": "IDENTIFIED CAUSES section. Exactly 2 paragraphs. First paragraph: the primary root cause of the mould growth based on evidence (moisture readings, humidity levels, building characteristics). Second paragraph: contributing environmental factors and how they interact to create conditions for mould growth.",
  "overview_conclusion": "OVERVIEW & CONCLUSION section. Exactly 2 paragraphs. First paragraph: summary of the inspection findings, number of areas affected, overall severity. Second paragraph: the recommended treatment plan, expected timeline, estimated cost, and expected outcomes. End with a recommendation for ongoing prevention.",
  ${demolitionField}
}

CRITICAL RULES:
- Write in flowing prose paragraphs ONLY — no bullet points, no numbered lists, no emoji, no markdown
- Use phrases like "as there is", "on the other hand", "however", "it is recommended"
- Reference specific room names, actual temperature/humidity/moisture readings from the data
- Australian English (mould, colour, vapour)
- Each field must be exactly 2 paragraphs separated by \\n\\n
- Do NOT leave any placeholder brackets — use real data from the inspection
- Use \\n\\n to separate paragraphs within each field

Return ONLY the JSON object:`

      console.log('Calling OpenRouter API for STRUCTURED output...')

      try {
        const generatedText = await callOpenRouter(openrouterApiKey, MRC_SYSTEM_PROMPT, structuredUserPrompt, 4000)
        console.log('Raw AI response (first 300 chars):', generatedText.slice(0, 300))

        const cleanedText = extractJson(generatedText)
        const structuredData: StructuredSummary = JSON.parse(cleanedText)

        return new Response(
          JSON.stringify({
            success: true,
            structured: true,
            ...structuredData,
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
    const isRegeneration = customPrompt && currentContent
    let userPrompt: string
    let maxTokens = 800

    // Regeneration preamble — used when user provides feedback to refine a section
    const regenPreamble = (sectionName: string) => `You previously generated this "${sectionName}" content for a mould inspection report:

"${currentContent}"

The user wants you to regenerate it with this specific change:
"${customPrompt}"

CRITICAL INSTRUCTIONS:
1. Follow the user's instruction EXACTLY
2. If they say "make it shorter" — reduce word count by 30-50%
3. If they say "make it more detailed" — expand with more specifics from the data
4. If they say "add detail about X" — expand that specific topic
5. Keep the same flowing prose style — 2 paragraphs, no bullet points, no markdown
6. Use Australian English (mould not mold)
7. Maintain professional tone for a customer-facing report

[Inspection data for reference]:
${userDataPrompt}

Now regenerate following their instruction. Return ONLY the regenerated text (2 paragraphs, no JSON wrapping):`

    if (section === 'whatWeFound') {
      if (isRegeneration) {
        userPrompt = regenPreamble('What We Found')
      } else {
        userPrompt = `Generate the "WHAT WE FOUND" section for this mould inspection report.

${userDataPrompt}

Write exactly 2 paragraphs describing:
- What mould/moisture issues were identified
- Where they were found (reference specific rooms by name)
- Severity of the contamination
- Underlying causes based on the evidence
- Any structural concerns or infrared findings

Use specific data: temperatures, humidity percentages, moisture readings, dew points.
Write in flowing prose — no bullet points, no lists, no markdown.
Return ONLY the 2 paragraphs, nothing else.`
      }
    } else if (section === 'whatWeWillDo') {
      if (isRegeneration) {
        userPrompt = regenPreamble("What We're Going To Do")
      } else {
        userPrompt = `Generate the "WHAT WE'RE GOING TO DO" section for this mould inspection report.

${userDataPrompt}

Write exactly 2 paragraphs describing:
- The complete remediation approach and step-by-step process
- Treatment methods (HEPA vacuuming, antimicrobial, stain removal, fogging)
- Equipment to be deployed (specific quantities of dehumidifiers, air movers)
- Any demolition or material removal required
- Expected timeline and outcomes

Write in flowing prose — no bullet points, no lists, no markdown.
Be reassuring and professional. Return ONLY the 2 paragraphs, nothing else.`
      }
    } else if (section === 'problemAnalysis') {
      if (isRegeneration) {
        userPrompt = regenPreamble('Identified Causes')
      } else {
        userPrompt = `Generate the "IDENTIFIED CAUSES" section for this mould inspection report.

${userDataPrompt}

Write exactly 2 paragraphs:
Paragraph 1: The primary root cause of the mould growth based on inspection evidence — reference specific humidity levels, moisture readings, and building characteristics.
Paragraph 2: Contributing environmental factors and how they interact to create conditions for mould growth.

Write in flowing prose — no bullet points, no lists, no markdown.
Return ONLY the 2 paragraphs, nothing else.`
      }
    } else if (section === 'overviewConclusion') {
      if (isRegeneration) {
        userPrompt = regenPreamble('Overview & Conclusion')
      } else {
        userPrompt = `Generate the "OVERVIEW & CONCLUSION" section for this mould inspection report.

${userDataPrompt}

Write exactly 2 paragraphs:
Paragraph 1: Summary of the overall inspection findings — number of areas affected, overall severity, key concerns.
Paragraph 2: The recommended treatment plan, expected timeline, estimated cost (if available), expected outcomes, and a recommendation for ongoing prevention.

Write in flowing prose — no bullet points, no lists, no markdown.
Return ONLY the 2 paragraphs, nothing else.`
      }
    } else if (section === 'demolitionDetails') {
      if (isRegeneration) {
        userPrompt = regenPreamble('Demolition Details')
      } else {
        userPrompt = `Generate the "DEMOLITION DETAILS" section for this mould inspection report.

${userDataPrompt}

Write 1-2 paragraphs describing:
- Which areas/rooms require demolition
- What materials will be removed (plasterboard, carpet, timber, etc.) and why
- Total demolition hours required
- How the area will be prepared after demolition

Write in flowing prose — no bullet points, no lists, no markdown.
Return ONLY the paragraph(s), nothing else.`
      }
    } else {
      userPrompt = `Generate a brief professional mould inspection summary based on this data:
${userDataPrompt}

Write 2 paragraphs in flowing prose. Australian English. No markdown.`
    }

    console.log(`Calling OpenRouter API for section: ${section || 'default'}...`)
    const generatedText = await callOpenRouter(openrouterApiKey, MRC_SYSTEM_PROMPT, userPrompt, maxTokens)

    return new Response(
      JSON.stringify({
        success: true,
        summary: generatedText,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-inspection-summary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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
