// Supabase Edge Function: export-inspection-context
// Exports full lead + inspection data as JSON for prompt refinement and debugging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { leadId, inspectionId } = await req.json()

    if (!leadId && !inspectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing leadId or inspectionId in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch lead data
    let lead = null
    const targetLeadId = leadId

    if (targetLeadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, full_name, phone, email, property_address_street, property_address_suburb, property_address_state, property_address_postcode, issue_description, internal_notes, status, created_at')
        .eq('id', targetLeadId)
        .single()

      if (leadError) {
        console.error('Lead fetch error:', leadError)
      } else {
        lead = leadData
      }
    }

    // Fetch inspection data
    let inspection = null
    const inspQuery = supabase
      .from('inspections')
      .select('*')

    if (inspectionId) {
      inspQuery.eq('id', inspectionId)
    } else if (targetLeadId) {
      inspQuery.eq('lead_id', targetLeadId)
    }

    const { data: inspectionData, error: inspError } = await inspQuery.order('created_at', { ascending: false }).limit(1).single()

    if (inspError) {
      console.error('Inspection fetch error:', inspError)
    } else {
      inspection = inspectionData
    }

    // Fetch calendar booking if exists
    let booking = null
    if (targetLeadId) {
      const { data: bookingData } = await supabase
        .from('calendar_bookings')
        .select('*')
        .eq('lead_id', targetLeadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      booking = bookingData
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      lead,
      inspection,
      booking,
      // Parse out the form_data JSON from inspection if it exists
      parsed_form_data: inspection?.form_data || null,
    }

    return new Response(
      JSON.stringify(exportData, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in export-inspection-context:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: `Export failed: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
