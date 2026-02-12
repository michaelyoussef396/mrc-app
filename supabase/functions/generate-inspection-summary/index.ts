// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate 5 professional inspection report sections (MRC template format)

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

// Helper: call OpenRouter API
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
        model: 'google/gemini-2.0-flash-001',
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
  // Remove markdown code fences
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim()
  }
  // If still not starting with {, try to find the first {
  if (!text.startsWith('{')) {
    const idx = text.indexOf('{')
    if (idx !== -1) text = text.slice(idx)
  }
  // Trim trailing content after last }
  const lastBrace = text.lastIndexOf('}')
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1)
  }
  return text
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
    // STRUCTURED MODE — generate all 5 sections as JSON (MRC template)
    // ================================================================
    if (structured) {
      const demolitionInstruction = hasDemolition
        ? `"demolition_details": "Demolition details formatted as:\\n\\n**Demolition Scope:**\\n- [Area]: [what materials are being removed and why]\\n- ...\\n\\n**Total Demolition Time:** X hours\\n\\n**Post-Demolition:** Brief description of area preparation after demolition."`
        : `"demolition_details": ""`

      const prompt = `You are creating a professional mould inspection report for Mould & Restoration Co. (MRC), a Melbourne-based mould remediation company.

Based on the inspection data below, generate content for 5 report sections using the MRC template format.

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "Use this exact format:\\n\\n🧱 **Summary of Findings**\\n\\nDuring the inspection at [address], the following was observed:\\n\\n**Affected Areas:**\\n1. **[Room Name]** — [description of mould found, severity, surfaces affected]\\n2. **[Room Name]** — [description]\\n...\\n\\n**Environmental Readings:**\\n- Indoor Temperature: [X]°C | Humidity: [X]% | Dew Point: [X]°C\\n- Outdoor Temperature: [X]°C | Humidity: [X]% | Dew Point: [X]°C\\n\\n**Moisture Readings:**\\n- [Location]: [reading]%\\n- ...\\n\\n**Infrared Observations:**\\n- [observations if any]\\n\\nOverall, [brief summary sentence about severity and scope].",

  "problem_analysis": "Use this exact format:\\n\\n🔍 **Identified Causes**\\n\\n**Primary Cause:**\\n[One clear sentence identifying the main cause of mould growth based on inspection evidence]\\n\\n**Contributing Factors:**\\n1. [Factor 1 — e.g., Poor ventilation in affected rooms]\\n2. [Factor 2 — e.g., Elevated moisture levels indicating water ingress]\\n3. [Factor 3 — e.g., Building characteristics contributing to condensation]\\n4. [Factor 4 if applicable]",

  "what_we_will_do": "Use this exact format:\\n\\n📋 **Recommendations**\\n\\n⚠️ **Immediate Actions Required:**\\n1. [Action — e.g., HEPA vacuum all affected surfaces to remove loose spores]\\n2. [Action — e.g., Apply antimicrobial treatment to all mould-affected areas]\\n3. [Action — e.g., Deploy drying equipment: Xq commercial dehumidifiers, Xq air movers]\\n4. [Additional actions as needed]\\n\\n✅ **Ongoing Prevention:**\\n1. [Recommendation — e.g., Maintain indoor humidity below 60%]\\n2. [Recommendation — e.g., Ensure adequate ventilation in affected rooms]\\n3. [Recommendation — e.g., Regular inspection of moisture-prone areas]\\n4. [Additional recommendations as applicable]",

  "overview_conclusion": "Use this exact format:\\n\\n📌 **Overview & Conclusion**\\n\\nThe inspection at [address] revealed [severity level] mould contamination affecting [number] area(s). The primary cause has been identified as [main cause].\\n\\n**Recommended Treatment Plan:**\\nMRC will carry out a comprehensive remediation program including [list key treatments]. The estimated treatment time is [X] hours across all affected areas.\\n\\n**Expected Outcome:**\\nFollowing the recommended treatment and prevention measures, the property should achieve [expected result]. Regular maintenance and monitoring will ensure long-term mould prevention.\\n\\n**Estimated Cost:** $[total] (inc. GST)",

  ${demolitionInstruction}
}

FORMATTING RULES:
- Use Australian English (mould, colour, etc.)
- Use \\n for line breaks within fields
- Use markdown formatting: **bold** for headers and emphasis
- Use numbered lists (1. 2. 3.) and bullet points (-)
- Use emoji markers exactly as shown: 🧱 🔍 📋 📌 ⚠️ ✅
- Be professional but customer-friendly
- Be specific to the actual inspection data — reference real room names, readings, and findings
- Do NOT use generic filler text or placeholder brackets
- Replace all [placeholders] with actual data from the inspection
- Each section should be unique content, not repeating the same information

INSPECTION DATA:
${formattedData}

Return ONLY the JSON object, no other text:`

      console.log('Calling OpenRouter API for STRUCTURED output (5 sections)...')

      try {
        const generatedText = await callOpenRouter(openrouterApiKey, prompt, 4000)
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
5. Keep the same MRC template format (emoji headers, **bold**, numbered/bullet lists)
6. Use Australian English (mould not mold)
7. Maintain professional tone for customer-facing report

FORMATTING: Keep the same markdown format — **bold** headers, numbered lists, bullet points, emoji markers (🧱 🔍 📋 📌 ⚠️ ✅).

[Inspection data for reference]:
${formattedData}

Now regenerate following their instruction. Return ONLY the regenerated text:`

    if (section === 'whatWeFound') {
      if (isRegeneration) {
        prompt = regenPreamble('Summary of Findings')
      } else {
        prompt = `You are writing the "🧱 Summary of Findings" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Use this exact MRC template format:

🧱 **Summary of Findings**

During the inspection at [address], the following was observed:

**Affected Areas:**
1. **[Room Name]** — [description of mould found, severity, surfaces affected]
2. **[Room Name]** — [description]

**Environmental Readings:**
- Indoor Temperature: [X]°C | Humidity: [X]% | Dew Point: [X]°C
- Outdoor Temperature: [X]°C | Humidity: [X]% | Dew Point: [X]°C

**Moisture Readings:**
- [Location]: [reading]%

**Infrared Observations:**
- [observations if any]

Overall, [brief summary sentence about severity and scope].

RULES:
- Use Australian English (mould not mold)
- Replace ALL [placeholders] with actual data from the inspection
- Use **bold** for headers, numbered lists for areas, bullet points for readings
- Be specific — reference real room names, readings, and findings

INSPECTION DATA:
${formattedData}

Generate the "Summary of Findings" section:`
      }
    } else if (section === 'whatWeWillDo') {
      if (isRegeneration) {
        prompt = regenPreamble('Recommendations')
      } else {
        prompt = `You are writing the "📋 Recommendations" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Use this exact MRC template format:

📋 **Recommendations**

⚠️ **Immediate Actions Required:**
1. [Action — e.g., HEPA vacuum all affected surfaces to remove loose spores]
2. [Action — e.g., Apply antimicrobial treatment to all mould-affected areas]
3. [Action — e.g., Deploy drying equipment: Xq commercial dehumidifiers, Xq air movers]
4. [Additional actions as needed]

✅ **Ongoing Prevention:**
1. [Recommendation — e.g., Maintain indoor humidity below 60%]
2. [Recommendation — e.g., Ensure adequate ventilation in affected rooms]
3. [Recommendation — e.g., Regular inspection of moisture-prone areas]

RULES:
- Use Australian English
- Replace ALL [placeholders] with actual data from the inspection
- Use ⚠️ for immediate actions, ✅ for ongoing prevention
- Include specific equipment quantities and treatment methods
- Be professional but reassuring

INSPECTION DATA:
${formattedData}

Generate the "Recommendations" section:`
      }
    } else if (section === 'problemAnalysis') {
      maxTokens = 800
      if (isRegeneration) {
        prompt = regenPreamble('Identified Causes')
      } else {
        prompt = `You are writing the "🔍 Identified Causes" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Use this exact MRC template format:

🔍 **Identified Causes**

**Primary Cause:**
[One clear sentence identifying the main cause of mould growth based on inspection evidence]

**Contributing Factors:**
1. [Factor 1 — e.g., Poor ventilation in affected rooms]
2. [Factor 2 — e.g., Elevated moisture levels indicating water ingress]
3. [Factor 3 — e.g., Building characteristics contributing to condensation]
4. [Factor 4 if applicable]

RULES:
- Use Australian English
- Be specific — use actual data from the inspection (humidity levels, moisture readings, dwelling type)
- Primary cause should be one clear, authoritative sentence
- Contributing factors should be numbered and specific
- Reference actual environmental readings as evidence

INSPECTION DATA:
${formattedData}

Generate the "Identified Causes" section:`
      }
    } else if (section === 'overviewConclusion') {
      maxTokens = 800
      if (isRegeneration) {
        prompt = regenPreamble('Overview & Conclusion')
      } else {
        prompt = `You are writing the "📌 Overview & Conclusion" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Use this exact MRC template format:

📌 **Overview & Conclusion**

The inspection at [address] revealed [severity level] mould contamination affecting [number] area(s). The primary cause has been identified as [main cause].

**Recommended Treatment Plan:**
MRC will carry out a comprehensive remediation program including [list key treatments]. The estimated treatment time is [X] hours across all affected areas.

**Expected Outcome:**
Following the recommended treatment and prevention measures, the property should achieve [expected result]. Regular maintenance and monitoring will ensure long-term mould prevention.

**Estimated Cost:** $[total] (inc. GST)

RULES:
- Use Australian English
- Replace ALL [placeholders] with actual data from the inspection
- Include total treatment hours (sum of all area times)
- Include the total cost from the cost estimate if available
- Be confident and professional — this is the summary the client reads last

INSPECTION DATA:
${formattedData}

Generate the "Overview & Conclusion" section:`
      }
    } else if (section === 'demolitionDetails') {
      if (isRegeneration) {
        prompt = regenPreamble('Demolition Details')
      } else {
        prompt = `You are writing the "Demolition Details" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Use this format:

**Demolition Scope:**
- **[Area/Room]**: [what materials are being removed (plasterboard, carpet, timber) and why]
- **[Area/Room]**: [description]

**Total Demolition Time:** [X] hours

**Post-Demolition:** [Brief description of area preparation after demolition]

RULES:
- Use Australian English
- Be specific about materials being removed and why
- Include total demolition hours
- Reference actual areas from the inspection data

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
