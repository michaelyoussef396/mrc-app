// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate professional MRC inspection report sections

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
  section?: 'whatWeFound' | 'whatWeWillDo' | 'whatYouGet' | 'detailedAnalysis' | 'demolitionDetails'
  structured?: boolean
  customPrompt?: string
  currentContent?: string
}

interface StructuredSummary {
  what_we_found: string
  what_we_will_do: string
  what_you_get: string
  detailed_analysis: string
  demolition_details: string
}

// ============================================================================
// MRC SYSTEM PROMPT
// ============================================================================
const MRC_SYSTEM_PROMPT = `You are an expert mould inspection report writer for Mould & Restoration Co. (MRC), Melbourne's leading mould remediation company.

You create professional, comprehensive inspection reports using MRC's proven template format.

Style requirements:
- Specific with locations, measurements, and actual inspection data (temperatures, humidity %, moisture readings)
- Professional but accessible language
- Australian English spelling and terminology (mould, colour, vapour)
- Evidence-based recommendations
- Include specific timelines and outcomes
- Reference actual findings from inspection data
- Each section is thorough but concise - no filler
- Build confidence through detailed analysis and clear action plans

You will generate content for THREE report sections when provided inspection data:

1. VALUE PROPOSITION - concise summary (what found, what we do, benefits)
2. DETAILED ANALYSIS - comprehensive inspection findings, causes, and recommendations
3. DEMOLITION DETAILS - specifications for material removal (if applicable)

Match the professional tone and structure of the provided examples exactly.`

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

  lines.push(`PROPERTY ADDRESS: ${fullAddress || 'Not specified'}`)
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
      lines.push(`\nArea: ${area.areaName}`)
      if (area.mouldDescription) lines.push(`- Mould Description: ${area.mouldDescription}`)
      if (area.temperature) lines.push(`- Temperature: ${area.temperature}°C`)
      if (area.humidity) lines.push(`- Humidity: ${area.humidity}%`)
      if (area.dewPoint) lines.push(`- Dew Point: ${area.dewPoint}°C`)

      if (area.moistureReadings && area.moistureReadings.length > 0) {
        area.moistureReadings.forEach(r => {
          lines.push(`- Internal Moisture (${r.title}): ${r.reading}%`)
        })
      }

      if (area.externalMoisture) lines.push(`- External Moisture: ${area.externalMoisture}%`)
      if (area.commentsForReport) lines.push(`- Comments: ${area.commentsForReport}`)
      lines.push(`- Time Without Demolition: ${area.timeWithoutDemo} hours`)
      lines.push(`- Demolition Required: ${area.demolitionRequired ? 'Yes' : 'No'}`)

      if (area.demolitionRequired) {
        lines.push(`- Demolition Time: ${area.demolitionTime} hours`)
        if (area.demolitionDescription) lines.push(`- Demolition Description: ${area.demolitionDescription}`)
      }

      if (area.infraredEnabled && area.infraredObservations && area.infraredObservations.length > 0) {
        lines.push(`- Infrared Observations: ${area.infraredObservations.join(', ')}`)
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
      formData.subfloorReadings.forEach(r => {
        lines.push(`- Moisture Reading: ${r.reading}% at ${r.location}`)
      })
    }
  }

  // Environmental Data
  lines.push('\nENVIRONMENTAL CONDITIONS:')
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
// CALL OPENROUTER API
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
      const demolitionInstruction = hasDemolition
        ? `"demolition_details": "Generate DEMOLITION DETAILS section. For each area requiring demolition, write: [Area Name] followed by specific dimensions and materials to be removed, description of affected areas. Cover all demolition areas from the inspection data."`
        : `"demolition_details": ""`

      const structuredUserPrompt = `Generate professional inspection report sections for this property.

${userDataPrompt}

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "VALUE PROPOSITION - WHAT WE FOUND subsection. Write 1-2 concise sentences describing the main issue and its impact. Keep it brief — this is a summary for the cover page.",
  "what_we_will_do": "VALUE PROPOSITION - WHAT WE'RE GOING TO DO subsection. Write 1-2 concise sentences describing the remediation approach. Keep it brief — this is a summary for the cover page.",
  "what_you_get": "VALUE PROPOSITION - WHAT YOU GET subsection. Write exactly these 4 bullet points separated by \\n:\\n- 12 Month warranty on all treated areas\\n- Professional material removal where required\\n- Complete airborne spore elimination\\n- Detailed documentation for insurance / resale",
  "detailed_analysis": "Generate the FULL DETAILED ANALYSIS section with these subsections separated by \\n\\n:\\n\\nWHAT WE DISCOVERED\\n[Comprehensive paragraph: specific address, what was found, severity, impact. Reference inspection data: temp, humidity, moisture readings, areas affected.]\\n\\nIDENTIFIED CAUSES\\n\\nThe primary cause is [single clear statement]\\n\\nCONTRIBUTING FACTORS\\n[List each factor with specific data, one per line starting with - ]\\n\\nWHY THIS HAPPENED\\n[Paragraph explaining mechanism: how this type of failure occurs, why moisture persists, consequences]\\n\\nRECOMMENDATIONS\\n\\nIMMEDIATE ACTIONS WEEK 1\\n[Numbered list of actions, one per line starting with 1. 2. 3. etc.]\\n\\nLONG-TERM PROTECTION\\n[List each measure, one per line starting with - ]\\n\\nWHAT SUCCESS LOOKS LIKE\\n[Paragraph describing expected outcomes and restoration]\\n\\nTIMELINE\\n[Specific timeline for each phase and total project duration]",
  ${demolitionInstruction}
}

CRITICAL RULES:
- what_we_found: 1-2 sentences ONLY (cover page summary)
- what_we_will_do: 1-2 sentences ONLY (cover page summary)
- what_you_get: Always the same 4 bullet points listed above
- detailed_analysis: Comprehensive multi-subsection analysis using the exact format specified
- Reference specific room names, actual temperature/humidity/moisture readings from the data
- Australian English (mould, colour, vapour)
- Do NOT leave any placeholder brackets — use real data from the inspection
- Use \\n\\n to separate subsections within detailed_analysis
- Use \\n for line breaks within lists

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

    // Regeneration preamble
    const regenPreamble = (sectionName: string, formatNote: string) => `You previously generated this "${sectionName}" content for a mould inspection report:

"${currentContent}"

The user wants you to regenerate it with this specific change:
"${customPrompt}"

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

    if (section === 'whatWeFound') {
      if (isRegeneration) {
        userPrompt = regenPreamble('What We Found', 'Keep it to 1-2 concise sentences — this is a cover page summary')
      } else {
        userPrompt = `Generate the VALUE PROPOSITION "WHAT WE FOUND" subsection for this mould inspection report.

${userDataPrompt}

Write 1-2 concise sentences describing the main issue found and its impact.
This appears on the cover/summary page so keep it brief but impactful.
Reference specific areas and severity.
Return ONLY the 1-2 sentences, nothing else.`
      }
    } else if (section === 'whatWeWillDo') {
      if (isRegeneration) {
        userPrompt = regenPreamble("What We're Going To Do", 'Keep it to 1-2 concise sentences — this is a cover page summary')
      } else {
        userPrompt = `Generate the VALUE PROPOSITION "WHAT WE'RE GOING TO DO" subsection for this mould inspection report.

${userDataPrompt}

Write 1-2 concise sentences describing the remediation approach.
This appears on the cover/summary page so keep it brief but reassuring.
Mention key treatment methods and expected outcome.
Return ONLY the 1-2 sentences, nothing else.`
      }
    } else if (section === 'whatYouGet') {
      if (isRegeneration) {
        userPrompt = regenPreamble('What You Get', 'Keep bullet point format with - prefix for each line')
      } else {
        userPrompt = `Generate the VALUE PROPOSITION "WHAT YOU GET" subsection. Return exactly these 4 bullet points:

- 12 Month warranty on all treated areas
- Professional material removal where required
- Complete airborne spore elimination
- Detailed documentation for insurance / resale

Return ONLY the 4 bullet points, nothing else.`
      }
    } else if (section === 'detailedAnalysis') {
      maxTokens = 3000
      if (isRegeneration) {
        userPrompt = regenPreamble('Detailed Analysis', 'Maintain the multi-subsection format with WHAT WE DISCOVERED, IDENTIFIED CAUSES, CONTRIBUTING FACTORS, WHY THIS HAPPENED, RECOMMENDATIONS, WHAT SUCCESS LOOKS LIKE, TIMELINE')
      } else {
        userPrompt = `Generate the FULL DETAILED ANALYSIS section for this mould inspection report.

${userDataPrompt}

Use this exact format with these subsections:

WHAT WE DISCOVERED
[Comprehensive paragraph: specific address, what was found, severity, impact. Reference temp, humidity, moisture readings, areas affected.]

IDENTIFIED CAUSES

The primary cause is [single clear statement based on inspection evidence]

CONTRIBUTING FACTORS
- [Factor 1 with specific data from inspection]
- [Factor 2 with specific data]
- [Factor 3 with specific data]
- [Continue as needed based on data]

WHY THIS HAPPENED
[Paragraph explaining mechanism: how this type of failure occurs, why moisture persists, consequences]

RECOMMENDATIONS

IMMEDIATE ACTIONS WEEK 1
1. [Action 1]
2. [Action 2]
3. [Action 3]
4. [Action 4]

LONG-TERM PROTECTION
- [Protection measure 1]
- [Protection measure 2]
- [Protection measure 3]

WHAT SUCCESS LOOKS LIKE
[Paragraph describing expected outcomes and restoration]

TIMELINE
[Specific timeline for each phase and total project duration]

CRITICAL: Use real data from the inspection — temperatures, humidity, moisture readings, room names. Do NOT use placeholder brackets. Australian English.
Return ONLY the formatted analysis text, no JSON wrapping.`
      }
    } else if (section === 'demolitionDetails') {
      if (isRegeneration) {
        userPrompt = regenPreamble('Demolition Details', 'Use the format: area name, then specifications for material removal')
      } else {
        userPrompt = `Generate the DEMOLITION DETAILS section for this mould inspection report.

${userDataPrompt}

Use this format:

Specifications for Material Removal

[For each area requiring demolition]:
[Area Name]
[Specific dimensions and materials to be removed]
[Description of affected areas]

[Continue for all demolition areas]

Reference specific rooms, materials (plasterboard, carpet, timber), and demolition hours from the data.
Return ONLY the formatted demolition details, no JSON wrapping.`
      }
    } else {
      userPrompt = `Generate a brief professional mould inspection summary based on this data:
${userDataPrompt}

Write 2 paragraphs in flowing prose. Australian English.`
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
