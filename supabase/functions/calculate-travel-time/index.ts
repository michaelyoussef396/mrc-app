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
  duration_minutes?: number  // Default 60
}

interface RecommendedDatesRequest {
  action: 'get_recommended_dates'
  technician_id: string
  destination_address: string
  destination_suburb: string
  days_ahead?: number  // Default 7
  duration_minutes?: number  // Default 60
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

interface TriageLeadRequest {
  action: 'triage_lead'
  lead_id: string
}

interface TriageResult {
  technician_id: string
  technician_name: string
  travel_time_minutes: number | null
  distance_km: number | null
  source: 'google_api' | 'haversine'
}

interface TriageLeadResponse {
  lead_id: string
  lead_address: string
  ranked_technicians: TriageResult[]
  recommended_technician_id: string | null
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

// Haversine formula to estimate straight-line distance between two coordinates
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Estimate travel time from haversine distance (assumes avg 40km/h in Melbourne metro)
function estimateTravelMinutes(distanceKm: number): number {
  return Math.ceil(distanceKm / 40 * 60)
}

// Melbourne postcode centroid lookup (common suburbs)
const MELBOURNE_POSTCODE_COORDS: Record<string, [number, number]> = {
  '3000': [-37.8136, 144.9631], // Melbourne CBD
  '3004': [-37.8390, 144.9830], // St Kilda Road
  '3006': [-37.8230, 144.9540], // Southbank
  '3008': [-37.8117, 144.9393], // Docklands
  '3011': [-37.7985, 144.8870], // Footscray
  '3012': [-37.7870, 144.8530], // Brooklyn
  '3013': [-37.7650, 144.8640], // Yarraville
  '3020': [-37.7730, 144.8370], // Albion
  '3021': [-37.7544, 144.7966], // St Albans
  '3031': [-37.7840, 144.9320], // Flemington
  '3032': [-37.7730, 144.9210], // Ascot Vale
  '3040': [-37.7630, 144.9330], // Essendon
  '3042': [-37.7320, 144.8870], // Airport West
  '3046': [-37.7150, 144.9230], // Glenroy
  '3050': [-37.7900, 144.9570], // Royal Park
  '3051': [-37.8000, 144.9490], // North Melbourne
  '3052': [-37.8030, 144.9610], // Parkville
  '3053': [-37.8040, 144.9700], // Carlton
  '3054': [-37.7930, 144.9730], // Carlton North
  '3055': [-37.7830, 144.9560], // Brunswick West
  '3056': [-37.7670, 144.9600], // Brunswick
  '3057': [-37.7840, 144.9770], // Brunswick East
  '3058': [-37.7440, 144.9660], // Coburg
  '3060': [-37.7280, 144.9470], // Fawkner
  '3065': [-37.8000, 144.9820], // Fitzroy
  '3066': [-37.7950, 144.9890], // Collingwood
  '3067': [-37.7920, 144.9980], // Abbotsford
  '3068': [-37.7850, 144.9820], // Clifton Hill
  '3070': [-37.7710, 144.9990], // Northcote
  '3071': [-37.7590, 145.0000], // Thornbury
  '3072': [-37.7430, 145.0070], // Preston
  '3073': [-37.7270, 145.0110], // Reservoir
  '3078': [-37.7700, 145.0210], // Alphington
  '3079': [-37.7560, 145.0310], // Ivanhoe
  '3081': [-37.7340, 145.0360], // Heidelberg
  '3101': [-37.8110, 145.0660], // Kew
  '3103': [-37.8050, 145.0930], // Balwyn
  '3104': [-37.7870, 145.1000], // Balwyn North
  '3121': [-37.8190, 144.9930], // Richmond
  '3122': [-37.8230, 145.0360], // Hawthorn
  '3123': [-37.8320, 145.0590], // Hawthorn East
  '3124': [-37.8450, 145.0830], // Camberwell
  '3125': [-37.8510, 145.1100], // Burwood
  '3126': [-37.8280, 145.0930], // Canterbury
  '3127': [-37.8220, 145.1110], // Mont Albert
  '3128': [-37.8190, 145.1310], // Box Hill
  '3130': [-37.8150, 145.1530], // Blackburn
  '3131': [-37.8250, 145.1720], // Forest Hill
  '3132': [-37.8220, 145.1900], // Mitcham
  '3133': [-37.8320, 145.2060], // Vermont
  '3134': [-37.8060, 145.2040], // Ringwood
  '3141': [-37.8440, 144.9940], // South Yarra
  '3142': [-37.8470, 145.0100], // Toorak
  '3143': [-37.8560, 145.0140], // Armadale
  '3144': [-37.8630, 145.0340], // Malvern
  '3145': [-37.8720, 145.0550], // Caulfield
  '3146': [-37.8780, 145.0830], // Glen Iris
  '3147': [-37.8790, 145.1050], // Ashburton
  '3148': [-37.8870, 145.1210], // Ashwood
  '3150': [-37.8850, 145.1650], // Glen Waverley
  '3161': [-37.8630, 145.0100], // Caulfield North
  '3162': [-37.8760, 145.0160], // Caulfield South
  '3163': [-37.8870, 145.0190], // Carnegie
  '3165': [-37.9030, 145.0460], // Bentleigh East
  '3166': [-37.8960, 145.0870], // Oakleigh
  '3168': [-37.9150, 145.1210], // Clayton
  '3170': [-37.9080, 145.1560], // Mulgrave
  '3171': [-37.9300, 145.1210], // Springvale
  '3172': [-37.9530, 145.1150], // Dingley Village
  '3175': [-37.9530, 145.1620], // Dandenong
  '3178': [-37.8720, 145.2260], // Rowville
  '3180': [-37.8470, 145.2380], // Knox
  '3182': [-37.8670, 144.9920], // St Kilda
  '3183': [-37.8730, 144.9960], // Balaclava
  '3184': [-37.8860, 144.9890], // Elwood
  '3185': [-37.8830, 145.0020], // Elsternwick
  '3186': [-37.8950, 144.9860], // Brighton
  '3188': [-37.9270, 145.0130], // Hampton
  '3189': [-37.9400, 145.0210], // Moorabbin
  '3190': [-37.9520, 145.0370], // Highett
  '3192': [-37.9530, 145.0110], // Cheltenham
  '3193': [-37.9430, 144.9990], // Black Rock
  '3194': [-37.9560, 144.9810], // Mentone
  '3195': [-37.9710, 145.0350], // Mordialloc
  '3196': [-37.9910, 145.0630], // Chelsea
  '3199': [-38.0960, 145.1290], // Frankston
  '3200': [-38.1050, 145.1470], // Frankston North
  '3204': [-37.8930, 144.9990], // Bentleigh
  '3207': [-37.8330, 144.9320], // Port Melbourne
  '3350': [-37.5500, 143.8500], // Ballarat
  '3550': [-36.7570, 144.2790], // Bendigo
  '3630': [-36.3570, 145.3990], // Shepparton
  '3820': [-38.0290, 145.7760], // Warragul
  '3840': [-38.1850, 146.0410], // Traralgon
  '3930': [-38.0200, 145.2640], // Langwarrin
  '3977': [-38.0890, 145.2830], // Cranbourne
}

// Calculate multi-origin travel times using Google Distance Matrix (multi-origin)
async function calculateMultiOriginTravelTimes(
  origins: string[],
  destination: string,
  apiKey: string
): Promise<Array<{ duration_minutes: number; distance_km: number } | null>> {
  try {
    const params = new URLSearchParams({
      origins: origins.join('|'),
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
      return origins.map(() => null)
    }

    return data.rows.map((row: any) => {
      const element = row.elements?.[0]
      if (!element || element.status !== 'OK') return null
      return {
        duration_minutes: Math.ceil(
          (element.duration_in_traffic?.value || element.duration.value) / 60
        ),
        distance_km: Math.round((element.distance.value / 1000) * 10) / 10
      }
    })
  } catch (error) {
    console.error('Multi-origin travel time error:', error)
    return origins.map(() => null)
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
    // ACTION: triage_lead
    // ========================================================================
    if (body.action === 'triage_lead') {
      const { lead_id } = body as TriageLeadRequest

      if (!lead_id) {
        return new Response(
          JSON.stringify({
            error: 'Missing required field',
            details: 'lead_id is required'
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

      // 1. Get lead address
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('property_address_street, property_address_suburb, property_address_state, property_address_postcode')
        .eq('id', lead_id)
        .single()

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ error: 'Lead not found' } as ErrorResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const leadAddress = [
        lead.property_address_street,
        lead.property_address_suburb,
        lead.property_address_state,
        lead.property_address_postcode
      ].filter(Boolean).join(', ')

      const leadPostcode = lead.property_address_postcode || ''

      // 2. Get all technician user IDs via user_roles + roles tables
      const { data: techRoleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'technician')
        .single()

      if (roleError || !techRoleData) {
        return new Response(
          JSON.stringify({ error: 'Technician role not found' } as ErrorResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: techUserRoles, error: techRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role_id', techRoleData.id)

      if (techRolesError || !techUserRoles?.length) {
        return new Response(
          JSON.stringify({ error: 'No technicians found' } as ErrorResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3. Get each technician's name and starting_address from auth user_metadata
      const techsWithAddresses: Array<{
        id: string
        name: string
        address: string | null
        postcode: string | null
      }> = []

      for (const role of techUserRoles) {
        const { data: techUser, error: techErr } = await supabase.auth.admin.getUserById(role.user_id)
        if (techErr || !techUser?.user) continue

        const meta = techUser.user.user_metadata || {}
        const startAddr = meta.starting_address
        techsWithAddresses.push({
          id: role.user_id,
          name: `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'Unknown',
          address: startAddr?.fullAddress || null,
          postcode: startAddr?.postcode || null,
        })
      }

      if (techsWithAddresses.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No technicians found' } as ErrorResponse),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Technicians that have addresses for Google API
      const techsForApi = techsWithAddresses.filter(t => t.address)
      const origins = techsForApi.map(t => t.address!)

      // 4. Try Google Distance Matrix API with multi-origin
      let apiResults: Array<{ duration_minutes: number; distance_km: number } | null> = []

      if (origins.length > 0 && apiKey) {
        apiResults = await calculateMultiOriginTravelTimes(origins, leadAddress, apiKey)
      }

      // 5. Build ranked results combining API and haversine fallback
      const rankedTechnicians: TriageResult[] = []

      // Process technicians with API results
      for (let i = 0; i < techsForApi.length; i++) {
        const tech = techsForApi[i]
        const apiResult = apiResults[i]

        if (apiResult) {
          rankedTechnicians.push({
            technician_id: tech.id,
            technician_name: tech.name,
            travel_time_minutes: apiResult.duration_minutes,
            distance_km: apiResult.distance_km,
            source: 'google_api'
          })
        } else {
          // API failed for this tech, try haversine with postcode
          const techPostcode = tech.postcode
          if (techPostcode && MELBOURNE_POSTCODE_COORDS[techPostcode] && leadPostcode && MELBOURNE_POSTCODE_COORDS[leadPostcode]) {
            const [lat1, lon1] = MELBOURNE_POSTCODE_COORDS[techPostcode]
            const [lat2, lon2] = MELBOURNE_POSTCODE_COORDS[leadPostcode]
            const dist = haversineKm(lat1, lon1, lat2, lon2)
            rankedTechnicians.push({
              technician_id: tech.id,
              technician_name: tech.name,
              travel_time_minutes: estimateTravelMinutes(dist),
              distance_km: Math.round(dist * 10) / 10,
              source: 'haversine'
            })
          } else {
            rankedTechnicians.push({
              technician_id: tech.id,
              technician_name: tech.name,
              travel_time_minutes: null,
              distance_km: null,
              source: 'haversine'
            })
          }
        }
      }

      // Process technicians without addresses (haversine only)
      const techsWithoutAddress = techsWithAddresses.filter(t => !t.address)
      for (const tech of techsWithoutAddress) {
        const techPostcode = tech.postcode
        if (techPostcode && MELBOURNE_POSTCODE_COORDS[techPostcode] && leadPostcode && MELBOURNE_POSTCODE_COORDS[leadPostcode]) {
          const [lat1, lon1] = MELBOURNE_POSTCODE_COORDS[techPostcode]
          const [lat2, lon2] = MELBOURNE_POSTCODE_COORDS[leadPostcode]
          const dist = haversineKm(lat1, lon1, lat2, lon2)
          rankedTechnicians.push({
            technician_id: tech.id,
            technician_name: tech.name,
            travel_time_minutes: estimateTravelMinutes(dist),
            distance_km: Math.round(dist * 10) / 10,
            source: 'haversine'
          })
        } else {
          rankedTechnicians.push({
            technician_id: tech.id,
            technician_name: tech.name,
            travel_time_minutes: null,
            distance_km: null,
            source: 'haversine'
          })
        }
      }

      // 6. Sort by travel time (nulls last)
      rankedTechnicians.sort((a, b) => {
        if (a.travel_time_minutes === null && b.travel_time_minutes === null) return 0
        if (a.travel_time_minutes === null) return 1
        if (b.travel_time_minutes === null) return -1
        return a.travel_time_minutes - b.travel_time_minutes
      })

      const recommendedId = rankedTechnicians.length > 0 && rankedTechnicians[0].travel_time_minutes !== null
        ? rankedTechnicians[0].technician_id
        : null

      const triageResponse: TriageLeadResponse = {
        lead_id,
        lead_address: leadAddress,
        ranked_technicians: rankedTechnicians,
        recommended_technician_id: recommendedId
      }

      return new Response(
        JSON.stringify(triageResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        days_ahead = 7,
        duration_minutes = 60
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

        // Calculate available slots (8 AM to 5 PM)
        // Build booked ranges as [startMinutes, endMinutes] — assume each existing
        // booking is 1 hour unless we have end_datetime info
        const bookedRanges = dayAppts.map(a => {
          const startMin = timeToMinutes(a.scheduled_time || '09:00')
          return [startMin, startMin + 60] as [number, number]
        })

        // A candidate slot [candidateStart, candidateStart + duration] is available
        // only if it doesn't overlap with any booked range
        const durationMins = duration_minutes
        const availableSlots: string[] = []
        for (let hour = 8; hour <= 17; hour++) {
          const candidateStart = hour * 60
          const candidateEnd = candidateStart + durationMins
          // Don't let the inspection run past 6 PM (1080 minutes)
          if (candidateEnd > 18 * 60) break
          const hasOverlap = bookedRanges.some(
            ([bStart, bEnd]) => candidateStart < bEnd && candidateEnd > bStart
          )
          if (!hasOverlap) {
            availableSlots.push(`${hour.toString().padStart(2, '0')}:00`)
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
