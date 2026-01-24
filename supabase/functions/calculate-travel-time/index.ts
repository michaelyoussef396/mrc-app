import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// TYPES
// ============================================================================

interface TravelTimeRequest {
  origin: string
  destination: string
  departure_time?: number | 'now'
}

interface TravelTimeResponse {
  distance_km: number
  duration_minutes: number
  duration_in_traffic_minutes: number | null
  origin_address: string
  destination_address: string
}

interface AvailabilityRequest {
  action: 'check_availability'
  technician_id: string
  date: string  // YYYY-MM-DD
  requested_time: string  // HH:MM
  destination_address: string
  override_start_address?: string  // Manual override for starting location
}

interface RecommendedDatesRequest {
  action: 'get_recommended_dates'
  technician_id: string
  destination_address: string
  destination_suburb: string
  days_ahead?: number  // Default 7
}

interface DateRecommendation {
  date: string  // YYYY-MM-DD
  day_name: string  // "Mon", "Tue", etc.
  display_date: string  // "16 Jan"
  score: number  // Higher is better
  rating: 'best' | 'good' | 'available' | 'unknown'
  reason: string  // "Free all day, 20 min from home"
  appointment_count: number
  travel_from_home_minutes: number | null
  available_slots: string[]  // ["08:00", "09:00", etc.]
  needs_manual_address?: boolean  // True when no starting address for empty days
}

interface RecommendedDatesResponse {
  recommendations: DateRecommendation[]
  technician_name: string
  technician_home: string | null
  has_missing_address_warning?: boolean  // True if any day has unknown travel due to missing address
}

interface PreviousAppointment {
  ends_at: string
  location: string
  suburb: string
  client_name: string
  travel_time_minutes: number
}

interface AvailabilityResponse {
  available: boolean
  technician_name: string
  technician_home: string | null
  previous_appointment: PreviousAppointment | null
  earliest_start: string
  requested_time_works: boolean
  buffer_minutes: number
  suggestions: string[]
  day_schedule: Array<{
    time: string
    client_name: string
    suburb: string
    ends_at: string
  }>
  error?: 'no_starting_address'  // Error flag when starting address is missing
  message?: string  // Error message for user display
  used_override_address?: boolean  // Flag indicating manual address was used
}

interface ErrorResponse {
  error: string
  details?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate travel time using Google Maps Distance Matrix API
async function calculateTravelTime(
  origin: string,
  destination: string,
  apiKey: string
): Promise<{ duration_minutes: number; distance_km: number } | null> {
  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      departure_time: 'now',
      traffic_model: 'best_guess',
      units: 'metric',
      key: apiKey
    })

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data.status, data.error_message)
      return null
    }

    const element = data.rows?.[0]?.elements?.[0]
    if (!element || element.status !== 'OK') {
      console.error('Route calculation failed:', element?.status)
      return null
    }

    return {
      duration_minutes: Math.ceil(
        (element.duration_in_traffic?.value || element.duration.value) / 60
      ),
      distance_km: Math.round((element.distance.value / 1000) * 10) / 10
    }
  } catch (error) {
    console.error('Travel time calculation error:', error)
    return null
  }
}

// Parse time string (HH:MM) to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Convert minutes since midnight to time string (HH:MM)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Format time for display (9:00 AM)
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Generate suggested time slots (30-min intervals)
function generateSuggestions(
  earliestMinutes: number,
  count: number = 3
): string[] {
  const suggestions: string[] = []
  // Round up to next 30-minute slot
  let nextSlot = Math.ceil(earliestMinutes / 30) * 30

  // Business hours: 7:00 AM (420) to 6:00 PM (1080)
  const endOfDay = 18 * 60 // 6:00 PM

  while (suggestions.length < count && nextSlot < endOfDay) {
    suggestions.push(minutesToTime(nextSlot))
    nextSlot += 30
  }

  return suggestions
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Google Maps API not configured' } as ErrorResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()

    // ========================================================================
    // ACTION: check_availability
    // ========================================================================
    if (body.action === 'check_availability') {
      const { technician_id, date, requested_time, destination_address, override_start_address } = body as AvailabilityRequest

      if (!technician_id || !date || !requested_time || !destination_address) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields',
            details: 'technician_id, date, requested_time, and destination_address are required'
          } as ErrorResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' } as ErrorResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // 1. Get technician info (name and home address)
      const { data: techUser, error: techError } = await supabase.auth.admin.getUserById(technician_id)

      if (techError || !techUser?.user) {
        return new Response(
          JSON.stringify({ error: 'Technician not found' } as ErrorResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const techMeta = techUser.user.user_metadata || {}
      const technicianName = `${techMeta.first_name || ''} ${techMeta.last_name || ''}`.trim() || 'Unknown'
      const technicianHome = techMeta.starting_address?.fullAddress || null

      // 2. Get technician's appointments for the date
      // Query leads with inspection_scheduled_date matching the date
      const { data: appointments, error: apptError } = await supabase
        .from('leads')
        .select(`
          id,
          full_name,
          property_address_street,
          property_address_suburb,
          property_address_state,
          property_address_postcode,
          scheduled_time,
          inspection_scheduled_date
        `)
        .eq('inspection_scheduled_date', date)
        .eq('assigned_to', technician_id)
        .order('scheduled_time', { ascending: true })

      if (apptError) {
        console.error('Error fetching appointments:', apptError)
      }

      const daySchedule = (appointments || []).map(apt => ({
        time: apt.scheduled_time || '09:00',
        client_name: apt.full_name,
        suburb: apt.property_address_suburb || '',
        ends_at: minutesToTime(timeToMinutes(apt.scheduled_time || '09:00') + 60) // 1-hour appointments
      }))

      // 3. Determine previous appointment (the one ending just before requested time)
      const requestedMinutes = timeToMinutes(requested_time)
      let previousAppointment: PreviousAppointment | null = null
      let travelOrigin: string | null = null
      let usedOverrideAddress = false
      let earliestStartMinutes = 8 * 60 // 8:00 AM default start

      // Find the appointment that ends closest to (but before) the requested time
      const sortedAppts = [...daySchedule].sort((a, b) =>
        timeToMinutes(a.ends_at) - timeToMinutes(b.ends_at)
      )

      for (const apt of sortedAppts) {
        const aptEndMinutes = timeToMinutes(apt.ends_at)
        if (aptEndMinutes <= requestedMinutes) {
          // This appointment ends before our requested time
          previousAppointment = {
            ends_at: apt.ends_at,
            location: `${apt.suburb}`,
            suburb: apt.suburb,
            client_name: apt.client_name,
            travel_time_minutes: 0 // Will be calculated below
          }
          travelOrigin = `${apt.suburb}, VIC, Australia`
        }
      }

      // Determine travel origin (priority: override > previous appointment > home)
      if (override_start_address) {
        travelOrigin = override_start_address
        usedOverrideAddress = true
      } else if (!travelOrigin && technicianHome) {
        // No previous appointment, use home address
        travelOrigin = technicianHome
      }

      // If no travel origin available, return error (no longer fall back to "Melbourne VIC")
      if (!travelOrigin) {
        const noAddressResponse: AvailabilityResponse = {
          available: false,
          technician_name: technicianName,
          technician_home: null,
          previous_appointment: null,
          earliest_start: '08:00',
          requested_time_works: false,
          buffer_minutes: 0,
          suggestions: generateSuggestions(8 * 60, 3),
          day_schedule: daySchedule,
          error: 'no_starting_address',
          message: `Cannot calculate travel time - ${technicianName}'s starting address is not set. Please set their address in Profile, or provide a manual starting location.`
        }
        return new Response(
          JSON.stringify(noAddressResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 4. Calculate travel time from origin to destination
      let travelTimeMinutes = 30 // Default 30 min if API fails

      const travelResult = await calculateTravelTime(travelOrigin, destination_address, apiKey)
      if (travelResult) {
        travelTimeMinutes = travelResult.duration_minutes
      }

      if (previousAppointment && !usedOverrideAddress) {
        // Previous appointment takes priority unless we're using an override
        previousAppointment.travel_time_minutes = travelTimeMinutes
        earliestStartMinutes = timeToMinutes(previousAppointment.ends_at) + travelTimeMinutes
      } else if (usedOverrideAddress || technicianHome) {
        // Using override address or home - calculate from 8 AM + travel time
        earliestStartMinutes = 8 * 60 + travelTimeMinutes // 8 AM + travel from starting point
      }

      // 5. Check if requested time works
      const requestedTimeWorks = requestedMinutes >= earliestStartMinutes
      const bufferMinutes = requestedTimeWorks ? requestedMinutes - earliestStartMinutes : 0

      // 6. Generate suggestions if time doesn't work
      const suggestions = requestedTimeWorks
        ? []
        : generateSuggestions(earliestStartMinutes, 3)

      const response: AvailabilityResponse = {
        available: requestedTimeWorks,
        technician_name: technicianName,
        technician_home: technicianHome,
        previous_appointment: previousAppointment,
        earliest_start: minutesToTime(earliestStartMinutes),
        requested_time_works: requestedTimeWorks,
        buffer_minutes: bufferMinutes,
        suggestions,
        day_schedule: daySchedule,
        used_override_address: usedOverrideAddress
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: get_recommended_dates
    // ========================================================================
    if (body.action === 'get_recommended_dates') {
      const {
        technician_id,
        destination_address,
        destination_suburb,
        days_ahead = 7
      } = body as RecommendedDatesRequest

      if (!technician_id || !destination_address) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields',
            details: 'technician_id and destination_address are required'
          } as ErrorResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' } as ErrorResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // 1. Get technician info
      const { data: techUser, error: techError } = await supabase.auth.admin.getUserById(technician_id)

      if (techError || !techUser?.user) {
        return new Response(
          JSON.stringify({ error: 'Technician not found' } as ErrorResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const techMeta = techUser.user.user_metadata || {}
      const technicianName = `${techMeta.first_name || ''} ${techMeta.last_name || ''}`.trim() || 'Unknown'
      const technicianHome = techMeta.starting_address?.fullAddress || null

      // 2. Calculate travel time from home to destination (once)
      let travelFromHomeMinutes: number | null = null
      if (technicianHome) {
        const homeTravel = await calculateTravelTime(technicianHome, destination_address, apiKey)
        if (homeTravel) {
          travelFromHomeMinutes = homeTravel.duration_minutes
        }
      }

      // 3. Get dates for the next N days (excluding weekends)
      const today = new Date()
      const datesToCheck: Date[] = []
      let daysChecked = 0
      let currentDate = new Date(today)

      while (datesToCheck.length < days_ahead && daysChecked < 14) {
        currentDate.setDate(currentDate.getDate() + 1)
        daysChecked++
        const dayOfWeek = currentDate.getDay()
        // Skip Saturday (6) and Sunday (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          datesToCheck.push(new Date(currentDate))
        }
      }

      // 4. Get all appointments for these dates
      const dateStrings = datesToCheck.map(d => d.toISOString().split('T')[0])
      const { data: appointments, error: apptError } = await supabase
        .from('leads')
        .select(`
          id,
          full_name,
          property_address_street,
          property_address_suburb,
          scheduled_time,
          inspection_scheduled_date
        `)
        .in('inspection_scheduled_date', dateStrings)
        .eq('assigned_to', technician_id)
        .order('scheduled_time', { ascending: true })

      if (apptError) {
        console.error('Error fetching appointments:', apptError)
      }

      // Group appointments by date
      const appointmentsByDate: Record<string, typeof appointments> = {}
      for (const apt of (appointments || [])) {
        const date = apt.inspection_scheduled_date
        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = []
        }
        appointmentsByDate[date].push(apt)
      }

      // 5. Score each date
      const recommendations: DateRecommendation[] = []
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      for (const date of datesToCheck) {
        const dateStr = date.toISOString().split('T')[0]
        const dayAppts = appointmentsByDate[dateStr] || []
        const appointmentCount = dayAppts.length

        // Calculate available slots (8 AM to 5 PM, excluding booked times)
        const bookedTimes = new Set(dayAppts.map(a => a.scheduled_time))
        const availableSlots: string[] = []
        for (let hour = 8; hour <= 16; hour++) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`
          if (!bookedTimes.has(timeStr)) {
            availableSlots.push(timeStr)
          }
        }

        // Calculate score
        let score = 100
        let reason = ''
        let rating: 'best' | 'good' | 'available' | 'unknown' = 'available'
        let needsManualAddress = false

        if (appointmentCount === 0) {
          // Empty day - check travel from home
          if (!technicianHome) {
            // No home address set - cannot calculate travel time
            score = 40  // Lower score but still show the day
            reason = 'Free all day (set starting address for accurate time)'
            rating = 'unknown'
            needsManualAddress = true
          } else {
            score = 100 - (travelFromHomeMinutes || 30)
            if (travelFromHomeMinutes && travelFromHomeMinutes <= 25) {
              reason = `Free all day, ${travelFromHomeMinutes} min from home`
              rating = 'best'
            } else if (travelFromHomeMinutes) {
              reason = `Free all day, ${travelFromHomeMinutes} min from home`
              rating = 'good'
            } else {
              reason = 'Free all day'
              rating = 'good'
            }
          }
        } else if (appointmentCount >= 6) {
          // Day is nearly full
          score = 20
          reason = `Busy day (${appointmentCount} bookings)`
          rating = 'available'
        } else {
          // Has some appointments - check if nearby
          const lastAppt = dayAppts[dayAppts.length - 1]
          const lastSuburb = lastAppt?.property_address_suburb?.toLowerCase() || ''
          const destSuburbLower = (destination_suburb || '').toLowerCase()

          if (lastSuburb === destSuburbLower) {
            score = 90
            reason = `After ${lastAppt.property_address_suburb} job, same suburb`
            rating = 'good'
          } else if (lastSuburb.includes(destSuburbLower) || destSuburbLower.includes(lastSuburb)) {
            score = 75
            reason = `After ${lastAppt.property_address_suburb} job, nearby`
            rating = 'good'
          } else {
            score = 50 - (appointmentCount * 5)
            reason = `${appointmentCount} booking${appointmentCount > 1 ? 's' : ''}, ${availableSlots.length} slots available`
            rating = 'available'
          }
        }

        // Skip if no slots available
        if (availableSlots.length === 0) continue

        recommendations.push({
          date: dateStr,
          day_name: dayNames[date.getDay()],
          display_date: `${date.getDate()} ${monthNames[date.getMonth()]}`,
          score,
          rating,
          reason,
          appointment_count: appointmentCount,
          travel_from_home_minutes: travelFromHomeMinutes,
          available_slots: availableSlots,
          needs_manual_address: needsManualAddress
        })
      }

      // Sort by score (highest first) and take top 5
      recommendations.sort((a, b) => b.score - a.score)
      const topRecommendations = recommendations.slice(0, 5)

      // Mark the best one (only if it's not 'unknown' due to missing address)
      if (topRecommendations.length > 0 &&
          topRecommendations[0].rating !== 'available' &&
          topRecommendations[0].rating !== 'unknown') {
        topRecommendations[0].rating = 'best'
      }

      // Check if any recommendation has missing address warning
      const hasMissingAddressWarning = topRecommendations.some(r => r.needs_manual_address)

      const dateResponse: RecommendedDatesResponse = {
        recommendations: topRecommendations,
        technician_name: technicianName,
        technician_home: technicianHome,
        has_missing_address_warning: hasMissingAddressWarning
      }

      return new Response(
        JSON.stringify(dateResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // DEFAULT: Simple travel time calculation
    // ========================================================================
    const { origin, destination, departure_time = 'now' }: TravelTimeRequest = body

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination are required' } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the Google Maps Distance Matrix API URL
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      departure_time: String(departure_time),
      traffic_model: 'best_guess',
      units: 'metric',
      key: apiKey
    })

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`

    console.log(`Calculating travel time: ${origin} -> ${destination}`)

    const response = await fetch(url)
    const data = await response.json()

    console.log('Google Maps API response status:', data.status)

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({
          error: 'Google Maps API error',
          details: data.error_message || data.status
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const element = data.rows?.[0]?.elements?.[0]

    if (!element || element.status !== 'OK') {
      return new Response(
        JSON.stringify({
          error: 'Could not calculate route',
          details: element?.status || 'No route found'
        } as ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result: TravelTimeResponse = {
      distance_km: Math.round((element.distance.value / 1000) * 10) / 10,
      duration_minutes: Math.ceil(element.duration.value / 60),
      duration_in_traffic_minutes: element.duration_in_traffic
        ? Math.ceil(element.duration_in_traffic.value / 60)
        : null,
      origin_address: data.origin_addresses[0],
      destination_address: data.destination_addresses[0]
    }

    console.log('Travel time calculated:', result)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error calculating travel time:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      } as ErrorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
