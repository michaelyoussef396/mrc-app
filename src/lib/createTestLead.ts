import { supabase } from '@/integrations/supabase/client'

export async function createCompleteTestLead() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    // Create test lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        phone: '0412 345 678',
        property_address_street: '45 Park Avenue',
        property_address_suburb: 'Richmond',
        property_address_postcode: '3121',
        property_address_state: 'VIC',
        property_type: 'House',
        urgency: 'high',
        issue_description: 'Visible mould growth in bathroom and bedroom. Water damage from recent leak.',
        lead_source: 'Website Form',
        status: 'inspection_completed',
        assigned_to: user.id,
        inspection_completed_date: new Date().toISOString().split('T')[0],
        notes: 'TEST LEAD - Complete inspection data ready for PDF generation'
      } as any)
      .select()
      .single()

    if (leadError) throw leadError

    // Create inspection
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .insert({
        lead_id: lead.id,
        inspector_id: user.id,
        inspection_date: new Date().toISOString().split('T')[0],
        inspection_start_time: '10:00:00',
        triage_description: 'Bathroom mould from shower leak. Bedroom mould on ceiling corner.',
        requested_by: 'Sarah Johnson',
        attention_to: 'Sarah Johnson',
        property_occupation: 'owner_occupied' as any,
        dwelling_type: 'house' as any,
        outdoor_temperature: 22.5,
        outdoor_humidity: 65,
        outdoor_dew_point: 15.8,
        outdoor_comments: 'Mild weather conditions. Good ventilation.',
        waste_disposal_required: false,
        subfloor_required: false,
        cause_of_mould: 'Persistent moisture from shower leak and inadequate ventilation',
        parking_option: 'Street parking available',
        job_number: `TEST-${Date.now()}`,
        total_time_minutes: 240,
        estimated_cost_ex_gst: 1850.00,
        estimated_cost_inc_gst: 2035.00,
        equipment_cost_ex_gst: 385.00,
        equipment_cost_inc_gst: 423.50,
        selected_job_type: 'comprehensive' as any
      } as any)
      .select()
      .single()

    if (inspectionError) throw inspectionError

    // Create Area 1: Bathroom
    const { data: area1, error: area1Error } = await supabase
      .from('inspection_areas')
      .insert({
        inspection_id: inspection.id,
        area_name: 'Main Bathroom',
        area_order: 1,
        mould_ceiling: true,
        mould_walls: true,
        mould_grout_silicone: true,
        temperature: 24.0,
        humidity: 68,
        dew_point: 17.5,
        moisture_readings_enabled: true,
        comments: 'Significant mould growth on ceiling and walls around shower area. Grout and silicone heavily affected. Water staining visible.',
        comments_approved: true,
        job_time_minutes: 90,
        demolition_required: true,
        demolition_time_minutes: 60,
        demolition_description: 'Remove affected silicone and re-grout. Clean ceiling and walls.',
        infrared_enabled: false
      } as any)
      .select()
      .single()

    if (area1Error) throw area1Error

    // Create Area 2: Bedroom
    const { data: area2, error: area2Error } = await supabase
      .from('inspection_areas')
      .insert({
        inspection_id: inspection.id,
        area_name: 'Master Bedroom',
        area_order: 2,
        mould_ceiling: true,
        mould_walls: false,
        temperature: 22.0,
        humidity: 62,
        dew_point: 14.2,
        moisture_readings_enabled: true,
        comments: 'Mould present in ceiling corner adjacent to bathroom. Likely condensation issue.',
        comments_approved: true,
        job_time_minutes: 60,
        demolition_required: false,
        infrared_enabled: false
      } as any)
      .select()
      .single()

    if (area2Error) throw area2Error

    // Add moisture readings for bathroom
    await supabase
      .from('moisture_readings')
      .insert([
        {
          area_id: area1.id,
          title: 'Ceiling above shower',
          moisture_percentage: 28.5,
          moisture_status: 'very_wet' as any,
          reading_order: 1
        },
        {
          area_id: area1.id,
          title: 'Wall behind shower',
          moisture_percentage: 22.0,
          moisture_status: 'wet' as any,
          reading_order: 2
        }
      ] as any)

    // Add moisture readings for bedroom
    await supabase
      .from('moisture_readings')
      .insert([
        {
          area_id: area2.id,
          title: 'Ceiling corner',
          moisture_percentage: 16.5,
          moisture_status: 'elevated' as any,
          reading_order: 1
        }
      ] as any)

    // Add equipment bookings
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, name, daily_rate')
      .in('name', ['Commercial Dehumidifier', 'Air Mover', 'RCD Safety Box'])

    if (equipment && equipment.length > 0) {
      const dehumidifier = equipment.find(e => e.name === 'Commercial Dehumidifier')
      const airMover = equipment.find(e => e.name === 'Air Mover')
      const rcdBox = equipment.find(e => e.name === 'RCD Safety Box')

      const bookings = []
      
      if (dehumidifier) {
        bookings.push({
          inspection_id: inspection.id,
          equipment_id: dehumidifier.id,
          quantity: 1,
          duration_days: 3,
          daily_rate: dehumidifier.daily_rate,
          total_cost_ex_gst: dehumidifier.daily_rate * 3,
          total_cost_inc_gst: dehumidifier.daily_rate * 3 * 1.1
        })
      }
      
      if (airMover) {
        bookings.push({
          inspection_id: inspection.id,
          equipment_id: airMover.id,
          quantity: 2,
          duration_days: 3,
          daily_rate: airMover.daily_rate,
          total_cost_ex_gst: airMover.daily_rate * 2 * 3,
          total_cost_inc_gst: airMover.daily_rate * 2 * 3 * 1.1
        })
      }

      if (rcdBox) {
        bookings.push({
          inspection_id: inspection.id,
          equipment_id: rcdBox.id,
          quantity: 1,
          duration_days: 3,
          daily_rate: rcdBox.daily_rate,
          total_cost_ex_gst: rcdBox.daily_rate * 3,
          total_cost_inc_gst: rcdBox.daily_rate * 3 * 1.1
        })
      }

      if (bookings.length > 0) {
        await supabase.from('equipment_bookings').insert(bookings as any)
      }
    }

    return {
      success: true,
      lead,
      inspection,
      message: 'Test lead created successfully with complete inspection data'
    }

  } catch (error: any) {
    console.error('Error creating test lead:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
