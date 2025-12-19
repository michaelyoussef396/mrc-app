// Supabase Edge Function: generate-inspection-summary
// Calls Google Gemini AI to generate a professional inspection summary

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

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { formData, feedback }: RequestBody = await req.json()

    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing formData in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format the inspection data for the prompt
    const formattedData = formatFormDataForPrompt(formData)

    // Build the prompt
    let prompt = `You are a professional mould inspection report writer for Mould & Restoration Co., a Melbourne-based restoration company.

Your task is to generate a professional, comprehensive job summary based on the following inspection data. The summary should:

1. Be written in professional Australian English
2. Summarize the key findings from all inspected areas
3. Explain the cause of mould if identified
4. Outline the recommended treatment plan
5. Mention the equipment that will be used
6. Include the estimated cost
7. Be suitable for presenting to the client or property manager
8. Be concise but thorough (aim for 200-400 words)

INSPECTION DATA:
${formattedData}

Generate a professional job summary report:`

    // If feedback is provided, modify the prompt for regeneration
    if (feedback && feedback.trim()) {
      prompt = `You are a professional mould inspection report writer for Mould & Restoration Co., a Melbourne-based restoration company.

You previously generated a job summary, and the user has requested changes. Please regenerate the summary with the following feedback incorporated:

USER FEEDBACK: "${feedback}"

INSPECTION DATA:
${formattedData}

Generate an updated professional job summary report that addresses the user's feedback:`
    }

    // Call Gemini API - using gemini-1.5-flash for stability
    console.log('Calling Gemini API...')
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.95,
            topK: 40
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)

      // Parse error to provide more helpful message
      let errorMessage = 'Failed to generate summary. Please try again.'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson?.error?.message) {
          errorMessage = `Gemini API error: ${errorJson.error.message}`
          // Check for common issues
          if (errorJson.error.message.includes('API key')) {
            errorMessage = 'Invalid or expired GEMINI_API_KEY. Please update the secret in Supabase.'
          }
        }
      } catch {
        // Keep default error message
      }

      return new Response(
        JSON.stringify({ error: errorMessage, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiResult = await geminiResponse.json()

    // Extract the generated text from Gemini response
    const generatedText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      console.error('No text in Gemini response:', JSON.stringify(geminiResult))
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
