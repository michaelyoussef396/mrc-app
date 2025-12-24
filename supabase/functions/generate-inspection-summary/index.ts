// Supabase Edge Function: generate-inspection-summary
// Calls OpenRouter AI to generate a professional inspection summary

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
  subfloorEnabled?: boolean
  subfloorObservations?: string
  subfloorComments?: string
  subfloorLandscape?: string
  subfloorSanitation?: boolean
  subfloorRacking?: boolean
  subfloorTreatmentTime?: number

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
  section?: 'whatWeFound' | 'whatWeWillDo' | 'whatYouGet'
  structured?: boolean  // When true, returns all 11 fields as JSON
}

interface StructuredSummary {
  // Page 2 fields
  what_we_found: string
  what_we_will_do: string
  what_you_get: string
  // Page 5 fields (Job Summary sections)
  what_we_discovered: string
  identified_causes: string
  contributing_factors: string
  why_this_happened: string
  immediate_actions: string
  long_term_protection: string
  what_success_looks_like: string
  timeline_text: string
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

      if (area.mouldVisibility && area.mouldVisibility.length > 0) {
        lines.push(`Mould Visible On: ${area.mouldVisibility.join(', ')}`)
      }

      if (area.temperature) lines.push(`Temperature: ${area.temperature}C`)
      if (area.humidity) lines.push(`Humidity: ${area.humidity}%`)
      if (area.dewPoint) lines.push(`Dew Point: ${area.dewPoint}C`)

      if (area.commentsForReport) {
        lines.push(`Comments: ${area.commentsForReport}`)
      }

      lines.push(`Estimated Time: ${area.timeWithoutDemo} minutes`)

      if (area.demolitionRequired) {
        lines.push(`Demolition Required: Yes (${area.demolitionTime} minutes)`)
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

  // Subfloor
  if (formData.subfloorEnabled) {
    lines.push('')
    lines.push('=== SUBFLOOR INSPECTION ===')
    if (formData.subfloorLandscape) lines.push(`Landscape: ${formData.subfloorLandscape}`)
    if (formData.subfloorObservations) lines.push(`Observations: ${formData.subfloorObservations}`)
    if (formData.subfloorComments) lines.push(`Comments: ${formData.subfloorComments}`)
    if (formData.subfloorSanitation) lines.push('Sanitation Required: Yes')
    if (formData.subfloorRacking) lines.push('Racking Required: Yes')
    if (formData.subfloorTreatmentTime) lines.push(`Treatment Time: ${formData.subfloorTreatmentTime} minutes`)
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
    lines.push('=== ADDITIONAL INFORMATION FOR TECHNICIAN ===')
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OpenRouter API key from environment
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { formData, feedback, section, structured }: RequestBody = await req.json()

    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing formData in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format the inspection data for the prompt
    const formattedData = formatFormDataForPrompt(formData)

    let prompt: string
    let maxTokens = 1500

    // Handle STRUCTURED mode - returns all 11 fields as JSON
    if (structured) {
      maxTokens = 3000
      prompt = `You are creating a professional mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Based on the inspection data below, generate content for ALL sections of the PDF report.

IMPORTANT: Return ONLY valid JSON with no additional text. Use this exact structure:

{
  "what_we_found": "2-3 paragraphs summarising mould findings for the customer (Page 2)",
  "what_we_will_do": "2-3 paragraphs explaining treatment plan (Page 2)",
  "what_you_get": "12 Month warranty on all treated areas\\nProfessional material removal where required\\nComplete airborne spore elimination\\nDetailed documentation for insurance / resale",
  "what_we_discovered": "2-3 sentences summarising what was discovered during inspection",
  "identified_causes": "2-3 sentences describing the primary cause of mould growth",
  "contributing_factors": "- Indoor humidity levels at X%\n- Internal moisture readings of X%\n- Additional contributing factors",
  "why_this_happened": "2-3 sentences explaining root cause and how it occurred",
  "immediate_actions": "1. First immediate action required\n2. Second immediate action\n3. Additional actions as needed",
  "long_term_protection": "- First long-term protection measure\n- Second protection measure\n- Additional measures",
  "what_success_looks_like": "2-3 sentences describing expected outcomes after treatment",
  "timeline_text": "1-2 sentences with treatment timeline (e.g., MRC treatment: 1 day onsite + 3 days air scrubber)"
}

FORMATTING RULES:
- Use Australian English (mould, colour, etc.)
- Use \\n for line breaks within fields
- Be professional but customer-friendly
- Be specific to the actual inspection data provided

CRITICAL PLAIN TEXT RULE:
- Return ONLY plain text. Do NOT use any markdown formatting.
- No asterisks (**bold**), no bullet points (* or -), no headers (#).
- No HTML tags (<br/>, <span>, etc.) - use \\n for line breaks instead.
- Write in clear sentences and paragraphs only.
- For lists, use simple lines with \\n between items.

INSPECTION DATA:
${formattedData}

Return ONLY the JSON object, no other text:`

      console.log('Calling OpenRouter API for STRUCTURED output...')
      const openrouterResponse = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': 'https://mrc-app.vercel.app',
            'X-Title': 'MRC Inspection App'
          },
          body: JSON.stringify({
            model: 'mistralai/devstral-2512:free',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            top_p: 0.95
          })
        }
      )

      if (!openrouterResponse.ok) {
        const errorText = await openrouterResponse.text()
        console.error('OpenRouter API error (structured):', openrouterResponse.status, errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to generate structured summary. Please try again.', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const openrouterResult = await openrouterResponse.json()
      const generatedText = openrouterResult?.choices?.[0]?.message?.content

      if (!generatedText) {
        console.error('No text in OpenRouter response (structured):', JSON.stringify(openrouterResult))
        return new Response(
          JSON.stringify({ error: 'No structured summary generated. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Parse the JSON response
      try {
        // Clean up the response - remove any markdown code blocks if present
        let cleanedText = generatedText.trim()
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.slice(7)
        }
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.slice(3)
        }
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.slice(0, -3)
        }
        cleanedText = cleanedText.trim()

        const structuredData: StructuredSummary = JSON.parse(cleanedText)

        // Return the structured response
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
        console.error('Failed to parse structured JSON:', parseError, 'Raw text:', generatedText)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to parse AI response as JSON. Please try again.',
            raw_response: generatedText
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Handle section-specific prompts for PDF sections
    if (section === 'whatWeFound') {
      maxTokens = 400
      prompt = `You are writing the "What We Found" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a customer-friendly summary (2-3 paragraphs, 100-150 words) of what the inspection found. Focus on:
- Where mould was found and its severity
- Any moisture issues discovered
- Key areas of concern

Use Australian English (mould not mold). Write in a professional but approachable tone suitable for homeowners.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks (**bold**), no bullet points (* or -), no headers (#). Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "What We Found" section:`
    } else if (section === 'whatWeWillDo') {
      maxTokens = 400
      prompt = `You are writing the "What We're Going To Do" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Write a clear treatment plan summary (2-3 paragraphs, 100-150 words) explaining what remediation work will be performed. Focus on:
- Treatment methods (HEPA vacuuming, antimicrobial treatment, etc.)
- Any demolition or removal work required
- Drying equipment to be used (dehumidifiers, air movers)
- Approximate timeline

Use Australian English. Write in a reassuring, professional tone that builds confidence.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. No markdown formatting. No asterisks (**bold**), no bullet points (* or -), no headers (#). Write in clear sentences and paragraphs only.

INSPECTION DATA:
${formattedData}

Generate the "What We're Going To Do" section:`
    } else if (section === 'whatYouGet') {
      maxTokens = 350
      prompt = `You are writing the "What You Get" section for a mould inspection report for Mould & Restoration Co. (MRC), Melbourne.

Generate a simple list of benefits the client receives. Write each benefit on a new line.
Start with "12 Month warranty on all treated areas" as the first benefit.

Include benefits like:
- Professional material removal where required
- Complete airborne spore elimination
- Detailed documentation for insurance / resale
- Peace of mind from professional remediation
- Certificate of completion

Use Australian English. Write in an upbeat, positive tone.

CRITICAL PLAIN TEXT RULE: Return ONLY plain text. NO HTML tags, NO markdown formatting. Write each benefit on a separate line. Write 4-6 benefits total.

Example format:
12 Month warranty on all treated areas
Professional material removal where required
Complete airborne spore elimination

INSPECTION DATA:
${formattedData}

Generate the "What You Get" benefits list:`
    } else {
      // Default: Full comprehensive report
      prompt = `You are creating a professional mould inspection summary report for Mould & Restoration Co. (MRC), a Melbourne-based mould remediation company.

Use this exact structure:

Mould and Restoration Co. Inspection Report Summary - Causes and Prevention

[Full Property Address]

---

Summary of Findings

[Single comprehensive paragraph: What was found + primary cause + immediate risks + context]

---

Identified Causes

Primary Cause:
[Single clear statement of main issue]

Contributing Factors:
1. [First contributing factor]
2. [Second contributing factor]
3. [Additional factors as needed - usually 3-6 total]

---

Recommendations

Immediate Actions:
1. [Urgent action 1] - [explanation]
2. [Urgent action 2] - [explanation]

Ongoing Prevention:
1. [Important prevention measure] - [explanation]
2. [Maintenance measure] - [explanation]
3. [Additional prevention] - [explanation]

---

Overview and Conclusion

[Comprehensive closing paragraph: Restate cause, summarize interventions, emphasize benefits, end positively]

WRITING STYLE:
- Use "as there is" (for evidence), "On the other hand", "However", "It is recommended"
- Australian English (mould not mold)
- Be comprehensive but every line must add value

CRITICAL PLAIN TEXT RULE:
- Return ONLY plain text. No markdown formatting.
- No asterisks (**bold**), no bullet points (* or -), no headers (#).
- No emojis (⚠️, ✅, 🧱, 🔍, 📋, 📌).
- Write in clear sentences and paragraphs only.
- Use simple numbered lists (1. 2. 3.) where appropriate.
- Use "---" section dividers if needed for structure.

INSPECTION DATA:
${formattedData}

Generate the full inspection summary report:`

      // If feedback is provided, modify the prompt for regeneration (only for full report)
      if (feedback && feedback.trim()) {
        prompt = `You are creating a professional mould inspection summary report for Mould & Restoration Co. (MRC).

The user has requested changes. Please regenerate with this feedback incorporated:

USER FEEDBACK: "${feedback}"

Use the same structure (Summary of Findings, Identified Causes, Recommendations, Conclusion) but address the user's feedback.

INSPECTION DATA:
${formattedData}

Generate the updated inspection summary report:`
      }
    }

    // Call OpenRouter API with mistralai/devstral-2512:free (free model)
    console.log('Calling OpenRouter API with mistralai/devstral-2512:free...')
    const openrouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://mrc-app.vercel.app',
          'X-Title': 'MRC Inspection App'
        },
        body: JSON.stringify({
          model: 'mistralai/devstral-2512:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          top_p: 0.95
        })
      }
    )

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text()
      console.error('OpenRouter API error:', openrouterResponse.status, errorText)

      // Parse error to provide more helpful message
      let errorMessage = 'Failed to generate summary. Please try again.'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson?.error?.message) {
          errorMessage = `OpenRouter API error: ${errorJson.error.message}`
        }
      } catch {
        // Keep default error message
      }

      return new Response(
        JSON.stringify({ error: errorMessage, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openrouterResult = await openrouterResponse.json()

    // Extract the generated text from OpenRouter response
    const generatedText = openrouterResult?.choices?.[0]?.message?.content

    if (!generatedText) {
      console.error('No text in OpenRouter response:', JSON.stringify(openrouterResult))
      return new Response(
        JSON.stringify({ error: 'No summary generated. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the generated summary
    return new Response(
      JSON.stringify({
        success: true,
        summary: generatedText.trim(),
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
