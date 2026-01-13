import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface ErrorResponse {
  error: string
  details?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Google Maps API not configured' } as ErrorResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { origin, destination, departure_time = 'now' }: TravelTimeRequest = await req.json()

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination are required' } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
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
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const element = data.rows?.[0]?.elements?.[0]

    if (!element || element.status !== 'OK') {
      return new Response(
        JSON.stringify({
          error: 'Could not calculate route',
          details: element?.status || 'No route found'
        } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
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
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error calculating travel time:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
