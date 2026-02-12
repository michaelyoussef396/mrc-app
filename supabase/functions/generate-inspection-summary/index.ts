// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate 4 professional inspection report sections

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
  section?: 'whatWeFound' | 'whatWeWillDo' | 'problemAnalysis' | 'demolitionDetails'
  structured?: boolean
  customPrompt?: string
  currentContent?: string
}

interface StructuredSummary {
  what_we_found: string
  what_we_will_do: string
  problem_analysis: string
  demolition_details: string
}

function formatFormDataForPrompt(formData: InspectionFormData): string {
  const lines: string[] = []

  // Property Information
  lines.push('=== PROPERTY INFORMATION ===')
  if (formData.clientName) lines.push(`Client Name: ${formData.clientName}`)
  if (formData.propertyAddress) {
    const fullAddress = [
      formData.propertyAddress,
      formData.propertySuburb,
      formData.propertyState,
      formData.propertyPostcode
    ].filter(Boolean).join(', ')
    lines.push(`Property Address: ${fullAddress}`)
  }
  if (formData.propertyOccupation) lines.push(`Occupation Status: ${formData.propertyOccupation}`)
  if (formData.dwellingType) lines.push(`Dwelling Type: ${formData.dwellingType}`)

  // Lead Context (from admin notes / client complaint)
  if (formData.issueDescription || formData.internalNotes) {
    lines.push('')
    lines.push('=== CLIENT COMPLAINT / LEAD CONTEXT ===')
    if (formData.issueDescription) lines.push(`Client Issue Description: ${formData.issueDescription}`)
    if (formData.internalNotes) lines.push(`Internal Notes: ${formData.internalNotes}`)
  }

  // Inspection Details
  lines.push('')
  lines.push('=== INSPECTION DETAILS ===')
  if (formData.inspectionDate) lines.push(`Inspection Date: ${formData.inspectionDate}`)
  if (formData.requestedBy) lines.push(`Requested By: ${formData.requestedBy}`)
  if (formData.attentionTo) lines.push(`Attention To: ${formData.attentionTo}`)
  if (formData.triage) lines.push(`Initial Triage: ${formData.triage}`)

  // Outdoor Conditions
  lines.push('')
  lines.push('=== OUTDOOR CONDITIONS ===')
  if (formData.outdoorTemperature) lines.push(`Temperature: ${formData.outdoorTemperature}C`)
  if (formData.outdoorHumidity) lines.push(`Humidity: ${formData.outdoorHumidity}%`)
  if (formData.outdoorDewPoint) lines.push(`Dew Point: ${formData.outdoorDewPoint}C`)
  if (formData.outdoorComments) lines.push(`Comments: ${formData.outdoorComments}`)

  // Areas Inspected
  if (formData.areas && formData.areas.length > 0) {
    lines.push('')
    lines.push('=== AREAS INSPECTED ===')
    formData.areas.forEach((area, index) => {
      lines.push(``)
      lines.push(`--- Area ${index + 1}: ${area.areaName} ---`)

      if (area.mouldDescription) {
        lines.push(`Mould Description: ${area.mouldDescription}`)
      }

      if (area.mouldVisibility && area.mouldVisibility.length > 0) {
        lines.push(`Mould Visible On: ${area.mouldVisibility.join(', ')}`)
      }

      if (area.temperature) lines.push(`Temperature: ${area.temperature}C`)
      if (area.humidity) lines.push(`Humidity: ${area.humidity}%`)
      if (area.dewPoint) lines.push(`Dew Point: ${area.dewPoint}C`)

      if (area.commentsForReport) {
        lines.push(`Comments: ${area.commentsForReport}`)
      }

      lines.push(`Estimated Treatment Time: ${area.timeWithoutDemo} hours`)

      if (area.demolitionRequired) {
        lines.push(`Demolition Required: Yes (${area.demolitionTime} hours)`)
        if (area.demolitionDescription) {
          lines.push(`Demolition Details: ${area.demolitionDescription}`)
        }
      }

      if (area.moistureReadings && area.moistureReadings.length > 0) {
        lines.push('Moisture Readings:')
        area.moistureReadings.forEach(reading => {
          lines.push(`  - ${reading.title}: ${reading.reading}%`)
        })
      }

      if (area.infraredEnabled && area.infraredObservations && area.infraredObservations.length > 0) {
        lines.push(`Infrared Observations: ${area.infraredObservations.join(', ')}`)
      }
    })
  }

  // Subfloor (always include if data exists)
  const hasSubfloorData = formData.subfloorObservations || formData.subfloorComments ||
    formData.subfloorLandscape || formData.subfloorSanitation || formData.subfloorRacking ||
    (formData.subfloorReadings && formData.subfloorReadings.length > 0)
  if (hasSubfloorData) {
    lines.push('')
    lines.push('=== SUBFLOOR INSPECTION ===')
    if (formData.subfloorLandscape) lines.push(`Landscape: ${formData.subfloorLandscape}`)
    if (formData.subfloorObservations) lines.push(`Observations: ${formData.subfloorObservations}`)
    if (formData.subfloorComments) lines.push(`Comments: ${formData.subfloorComments}`)
    if (formData.subfloorSanitation) lines.push('Sanitation Required: Yes')
    if (formData.subfloorRacking) lines.push('Racking Required: Yes')
    if (formData.subfloorTreatmentTime) lines.push(`Treatment Time: ${formData.subfloorTreatmentTime} hours`)
    if (formData.subfloorReadings && formData.subfloorReadings.length > 0) {
      lines.push('Subfloor Moisture Readings:')
      formData.subfloorReadings.forEach(reading => {
        lines.push(`  - ${reading.location}: ${reading.reading}%`)
      })
    }
  }

  // Waste Disposal
  if (formData.wasteDisposalEnabled) {
    lines.push('')
    lines.push('=== WASTE DISPOSAL ===')
    if (formData.wasteDisposalAmount) lines.push(`Waste Amount: ${formData.wasteDisposalAmount}`)
  }

  // Work Procedure / Treatment Plan
  lines.push('')
  lines.push('=== TREATMENT PLAN ===')
  const treatments: string[] = []
  if (formData.hepaVac) treatments.push('HEPA Vacuum')
  if (formData.antimicrobial) treatments.push('Antimicrobial Treatment')
  if (formData.stainRemovingAntimicrobial) treatments.push('Stain-Removing Antimicrobial')
  if (formData.homeSanitationFogging) treatments.push('Home Sanitation/Fogging')
  if (treatments.length > 0) {
    lines.push(`Treatments: ${treatments.join(', ')}`)
  }

  // Drying Equipment
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
    lines.push(`Drying Equipment: ${equipment.join(', ')}`)
  }

  // Cause and Additional Info
  if (formData.causeOfMould) {
    lines.push('')
    lines.push('=== CAUSE OF MOULD ===')
    lines.push(formData.causeOfMould)
  }

  if (formData.additionalInfoForTech) {
    lines.push('')
    lines.push('=== ADDITIONAL INFORMATION ===')
    lines.push(formData.additionalInfoForTech)
  }

  if (formData.additionalEquipmentComments) {
    lines.push('')
    lines.push('=== EQUIPMENT COMMENTS ===')
    lines.push(formData.additionalEquipmentComments)
  }

  // Cost Estimate
  if (formData.totalIncGst && formData.totalIncGst > 0) {
    lines.push('')
    lines.push('=== COST ESTIMATE ===')
    lines.push(`Labor: $${(formData.laborCost || 0).toFixed(2)} (ex GST)`)
    lines.push(`Equipment: $${(formData.equipmentCost || 0).toFixed(2)} (ex GST)`)
    lines.push(`Subtotal: $${(formData.subtotalExGst || 0).toFixed(2)} (ex GST)`)
    lines.push(`GST (10%): $${(formData.gstAmount || 0).toFixed(2)}`)
    lines.push(`Total: $${(formData.totalIncGst || 0).toFixed(2)} (inc GST)`)
  }

  return lines.join('\n')
}

// Helper: call OpenRouter and return the response text
async function callOpenRouter(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mrc-app.vercel.app',
        'X-Title': 'MRC Inspection App'
      },
      body: JSON.stringify({
        model: 'mistralai/devstral-2512:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 0.95
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenRouter API error:', response.status, errorText)
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const result = await response.json()
  const text = result?.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('No text in OpenRouter response')
  }
  return text.trim()
}

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

    const formattedData = formatFormDataForPrompt(formData)

    // Check if any area requires demolition (for conditional demolition section)
    const hasDemolition = formData.areas?.some(a => a.demolitionRequired) || false

    // ================================================================
    // STRUCTURED MODE — generate all 4 sections as JSON
    // ================================================================
    if (structured) {
      const demolitionInstruction = hasDemolition
        ? `"demolition_details": "Detailed description of all demolition work required across all areas. For each area needing demolition, describe what will be removed/demolished and why. Include total demolition hours. Be specific about materials being removed (e.g., plasterboard, carpet, timber)."`
        : `"demolition_details": ""`

      const prompt = `You are creating a professional mould inspection report for Mould & Restoration Co. (MRC), a Melbourne-based mould remediation company.

Based on the inspection data below, generate content for the 4 report sections.

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "2-3 paragraphs (150-200 words) summarising what the inspection discovered. Describe where mould was found, severity, moisture levels, affected surfaces, and any infrared or subfloor findings. Reference specific rooms/areas by name. Mention temperature, humidity and moisture readings where relevant.",
  "what_we_will_do": "2-3 paragraphs (150-200 words) explaining the complete treatment plan. Cover all treatment methods being used (HEPA vacuuming, antimicrobial treatment, etc.), drying equipment deployment, and expected timeline. Mention specific equipment quantities. If subfloor treatment is needed, include it. End with expected outcomes.",
  "problem_analysis": "3-4 paragraphs (200-300 words) providing deep analysis. Paragraph 1: Root cause analysis - what caused the mould and why. Paragraph 2: Contributing environmental factors (humidity, ventilation, building issues). Paragraph 3: Recommendations for preventing recurrence (ongoing ventilation, dehumidifier use, maintenance). Paragraph 4: Expected outcomes if recommendations are followed.",
  ${demolitionInstruction}
}

FORMATTING RULES:
- Use Australian English (mould, colour, etc.)
- Use \\n for line breaks within fields
- Be professional but customer-friendly
- Be specific to the actual inspection data — reference real room names, readings, and findings
- Do NOT use generic filler text
- Each section should be unique content, not repeating the same information

CRITICAL PLAIN TEXT RULE:
- Return ONLY plain text within each JSON field
- No asterisks (**bold**), no bullet points (* or -), no headers (#)
- No HTML tags — use \\n for line breaks
- Write in clear sentences and paragraphs only

INSPECTION DATA:
${formattedData}

Return ONLY the JSON object, no other text:`

      console.log('Calling OpenRouter API for STRUCTURED output (4 sections)...')

      try {
        const generatedText = await callOpenRouter(openrouterApiKey, prompt, 3000)

        // Clean up markdown code blocks if present
        let cleanedText = generatedText
        if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7)
        if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3)
        if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3)
        cleanedText = cleanedText.trim()

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
        console.error('Structured generation failed:', parseError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to generate AI summary. Please try again.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ================================================================
    // SECTION-SPECIFIC REGENERATION
    // ================================================================
    const isRegeneration = customPrompt && currentContent
    let prompt: string
    let maxTokens = 500

    const regenPreamble = (sectionName: string) => `You previously generated this "${sectionName}" content for a mould inspection report:

"${currentContent}"

The user wants you to regenerate it with this specific change:
"${customPrompt}"

CRITICAL INSTRUCTIONS:
1. Follow the user's instruction EXACTLY
2. If they say "make it shorter" → reduce word count by 30-50%
3. If they say "make it more detailed" → expand with more specifics from the data
4. If they say "add detail about X" → expand that specific topic
5. Keep the same format unless they ask to change it
6. Use Australian English (mould not mold)
7. Maintain professional tone for customer-facing report

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks, no bullet points, no headers. Write in clear sentences and paragraphs only.

[Inspection data for reference]:
${formattedData}

Now regenerate following their instruction. Return ONLY the regenerated text:`

    if (section === 'whatWeFound') {
      if (isRegeneration) {
        prompt = regenPreamble('What We Found')
      } else {
        prompt = `You are writing the "What We Found" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a customer-friendly summary (2-3 paragraphs, 150-200 words) of what the inspection found. Focus on:
- Where mould was found and its severity (reference specific rooms)
- Moisture readings and what they indicate
- Any infrared findings
- Subfloor conditions if applicable
- Temperature and humidity comparisons (indoor vs outdoor)

Use Australian English (mould not mold). Write in a professional but approachable tone suitable for homeowners.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks, no bullet points, no headers. Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "What We Found" section:`
      }
    } else if (section === 'whatWeWillDo') {
      if (isRegeneration) {
        prompt = regenPreamble("What We're Going To Do")
      } else {
        prompt = `You are writing the "What We're Going To Do" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a clear treatment plan summary (2-3 paragraphs, 150-200 words) explaining what remediation work will be performed. Focus on:
- Treatment methods (HEPA vacuuming, antimicrobial treatment, stain removal, fogging)
- Any demolition or material removal required
- Drying equipment to be deployed (specific quantities)
- Subfloor treatment if applicable
- Approximate timeline and expected outcomes

Use Australian English. Write in a reassuring, professional tone that builds confidence.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks, no bullet points, no headers. Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "What We're Going To Do" section:`
      }
    } else if (section === 'problemAnalysis') {
      maxTokens = 800
      if (isRegeneration) {
        prompt = regenPreamble('Problem Analysis & Recommendations')
      } else {
        prompt = `You are writing the "Problem Analysis & Recommendations" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a detailed analysis (3-4 paragraphs, 200-300 words):
- Paragraph 1: Root cause analysis — what caused the mould growth based on the inspection evidence
- Paragraph 2: Contributing environmental factors (humidity levels, ventilation issues, building characteristics)
- Paragraph 3: Specific recommendations for preventing recurrence (ventilation improvements, dehumidifier use, maintenance schedule)
- Paragraph 4: Expected outcomes if recommendations are followed, and warranty information

Use Australian English. Write in a professional, authoritative tone suitable for a technical report.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks, no bullet points, no headers. Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "Problem Analysis & Recommendations" section:`
      }
    } else if (section === 'demolitionDetails') {
      if (isRegeneration) {
        prompt = regenPreamble('Demolition Details')
      } else {
        prompt = `You are writing the "Demolition Details" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a detailed description (1-2 paragraphs, 100-150 words) of all demolition work required. Focus on:
- Which areas/rooms require demolition
- What materials will be removed (plasterboard, carpet, timber, etc.)
- Why demolition is necessary in each area
- Total demolition hours
- How the area will be prepared after demolition

Use Australian English. Write in a professional, clear tone.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks, no bullet points, no headers. Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "Demolition Details" section:`
      }
    } else {
      // Default fallback — should not normally reach here
      prompt = `Generate a brief professional mould inspection summary based on this data:
${formattedData}

Use Australian English. Plain text only, no markdown.`
    }

    console.log(`Calling OpenRouter API for section: ${section || 'default'}...`)
    const generatedText = await callOpenRouter(openrouterApiKey, prompt, maxTokens)

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
