import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://esm.sh/zod@3.22.4'

import { redactAddress, reportEdgeErrorInBackground } from '../_shared/errorReporting.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiter: IP → { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Every minute of every hour is valid — booking is no longer on a 1-hour grid —
 * but the shape stays strict: "99:99" and "24:00" are still rejected.
 */
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const TIME_OF_DAY_MESSAGE = 'Time must be HH:MM in 24-hour form'

const TriageLeadSchema = z.object({
  action: z.literal('triage_lead'),
  lead_id: z.string().uuid(),
})

const CheckAvailabilitySchema = z.object({
  action: z.literal('check_availability'),
  technician_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  requested_time: z.string().regex(TIME_OF_DAY_PATTERN, TIME_OF_DAY_MESSAGE),
  destination_address: z.string().min(1),
  override_start_address: z.string().optional(),
  duration_minutes: z.number().positive().optional(),
})

const RecommendedDatesSchema = z.object({
  action: z.literal('get_recommended_dates'),
  technician_id: z.string().uuid(),
  destination_address: z.string().min(1),
  destination_suburb: z.string().optional(),
  days_ahead: z.number().positive().optional(),
  duration_minutes: z.number().positive().optional(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  preferred_time: z.string().regex(TIME_OF_DAY_PATTERN, TIME_OF_DAY_MESSAGE).optional(),
  slot_interval_minutes: z.number().int().positive().max(60).optional(),
})

const TravelTimeSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departure_time: z.union([z.number(), z.literal('now')]).optional(),
})

const RequestBodySchema = z.union([
  TriageLeadSchema,
  CheckAvailabilitySchema,
  RecommendedDatesSchema,
  TravelTimeSchema,
])

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
  preferred_date?: string  // YYYY-MM-DD — customer's preferred date to boost in scoring
  preferred_time?: string  // HH:MM — customer's preferred time to prioritize in slots
  slot_interval_minutes?: number  // Default 60 — granularity of the suggested slots
}

/**
 * Where a travel figure came from — or why there isn't one.
 *
 * This function used to answer with a number no matter what: a 30-minute stand-in when
 * Google didn't reply, a zero when the technician had no starting address. Both rendered
 * as fact in the booking panel, indistinguishable from a real measurement. Every response
 * that carries — or withholds — a travel figure now says which of these it is.
 *
 *   google_api   Distance Matrix answered. The number is real.
 *   haversine    Straight-line postcode estimate. Approximate, but honestly derived.
 *   unavailable  A Maps call was made and produced no answer. Retryable.
 *   no_origin    No Maps call was possible: there is no starting address. Not retryable.
 */
type TravelTimeSource = 'google_api' | 'haversine' | 'unavailable' | 'no_origin'

interface DateRecommendation {
  date: string  // YYYY-MM-DD
  day_name: string  // "Mon", "Tue", etc.
  display_date: string  // "16 Jan"
  score: number  // Higher is better
  rating: 'best' | 'good' | 'available' | 'unknown'
  reason: string  // "Free all day, 20 min from home"
  appointment_count: number
  /** null whenever travel_from_home_source is not 'google_api'. */
  travel_from_home_minutes: number | null
  /**
   * Mirrors the response-level field. One Maps call feeds every day, so this holds the
   * same value on every item today; it lives here so a row that renders a travel number
   * carries the provenance of that number right next to it.
   */
  travel_from_home_source: TravelTimeSource
  available_slots: string[]  // ["08:00", "09:00", etc.]
  needs_manual_address?: boolean  // True when no starting address for empty days
  preferred_time_feasible?: boolean  // True if customer's preferred time slot is available
}

interface RecommendedDatesResponse {
  recommendations: DateRecommendation[]
  technician_name: string
  technician_home: string | null
  /**
   * ONE Distance Matrix call (home -> destination) is made per request and shared by
   * every day. This is its provenance, and unlike the per-day copy it survives when
   * `recommendations` is empty — which is exactly when a caller most needs to tell
   * "no free days" apart from "we never worked out the travel time".
   */
  travel_from_home_source: TravelTimeSource
  has_missing_address_warning?: boolean  // True if any day has unknown travel due to missing address
}

interface PreviousAppointment {
  ends_at: string
  location: string
  suburb: string
  client_name: string
  /**
   * null when this leg was never measured — either Maps failed, or an override address
   * replaced this appointment as the travel origin, so the measured leg starts somewhere
   * else entirely. It used to ship as a hardcoded 0.
   */
  travel_time_minutes: number | null
}

interface DayScheduleEntry {
  time: string
  client_name: string
  suburb: string
  ends_at: string
}

/** True regardless of whether travel could be computed. */
interface AvailabilityResponseBase {
  technician_name: string
  technician_home: string | null
  day_schedule: DayScheduleEntry[]
  used_override_address: boolean
}

/** Travel was measured. Every derived field is meaningful. */
interface ResolvedAvailabilityResponse extends AvailabilityResponseBase {
  source: 'google_api'
  available: boolean
  previous_appointment: PreviousAppointment | null
  earliest_start: string
  requested_time_works: boolean
  buffer_minutes: number
  suggestions: string[]
  travel_time_minutes: number
  travel_distance_km: number
  travel_origin_address: string
  is_feasible: boolean
}

/**
 * Travel is unknown. Every derived field below is typed as the literal `null`, so
 * `deno check` REJECTS any attempt to put a number, a time or a boolean here — a
 * stronger guard than a test, and the reason this is a union rather than a bag of
 * optionals. `suggestions` is the empty-tuple type for the same reason: only `[]`
 * assigns to it, so a suggestion list computed from an assumed start time cannot be
 * emitted. Do not "fix" it to `string[]` or `never[]`.
 */
interface UnknownAvailabilityResponse extends AvailabilityResponseBase {
  source: 'unavailable' | 'no_origin'
  available: null
  previous_appointment: PreviousAppointment | null
  earliest_start: null
  requested_time_works: null
  buffer_minutes: null
  suggestions: []
  travel_time_minutes: null
  travel_distance_km: null
  travel_origin_address: string | null
  is_feasible: null
  /**
   * Back-compat. useBookingValidation.ts gates on this exact literal, and a frontend
   * deployment that predates the `source` guard is the only thing standing between an
   * admin and a fabricated answer. Only the no_origin variant sets it. Do not remove.
   */
  error?: 'no_starting_address'
  message?: string  // Error message for user display
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
  source: TravelTimeSource
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

/** Identifies which caller a Maps failure came from, for the error report. */
interface MapsCallContext {
  action: 'check_availability' | 'get_recommended_dates' | 'triage_lead' | 'direct'
  technician_id?: string
  lead_id?: string
  date?: string
  origin: string
  destination: string
}

// Calculate travel time using Google Maps Distance Matrix API
async function calculateTravelTime(
  origin: string,
  destination: string,
  apiKey: string,
  ctx: MapsCallContext
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
      // Google's own error_message, verbatim — the string that actually says
      // "REQUEST_DENIED / The provided API key is expired". It used to reach a
      // console.error nobody reads while the caller invented 30 minutes.
      reportEdgeErrorInBackground({
        message: `Google Distance Matrix returned ${data.status}${data.error_message ? `: ${data.error_message}` : ''}`,
        severity: 'error',
        exceptionType: 'GoogleMapsDistanceMatrixError',
        logger: 'calculate-travel-time',
        transaction: `calculate-travel-time/${ctx.action}`,
        fingerprint: ['calculate-travel-time', ctx.action, String(data.status)],
        dedupeKey: `maps-api:${ctx.action}:${data.status}`,
        tags: {
          function: 'calculate-travel-time',
          action: ctx.action,
          google_status: String(data.status),
          failure_stage: 'api',
        },
        extra: {
          google_status: data.status,
          google_error_message: data.error_message ?? null,
          address_hint: redactAddress(ctx.destination),
        },
        context: {
          function: 'calculate-travel-time',
          ...ctx,
          google_status: data.status,
          google_error_message: data.error_message ?? null,
        },
      })
      return null
    }

    const element = data.rows?.[0]?.elements?.[0]
    if (!element || element.status !== 'OK') {
      // No error_message exists at element level — element.status is the whole story
      // (ZERO_RESULTS, NOT_FOUND, MAX_ROUTE_LENGTH_EXCEEDED). Warning, not error: this
      // is almost always a bad address on the lead, not a broken integration.
      reportEdgeErrorInBackground({
        message: `Google Distance Matrix route element failed: ${element?.status ?? 'MISSING_ELEMENT'}`,
        severity: 'warning',
        exceptionType: 'GoogleMapsRouteUnavailable',
        logger: 'calculate-travel-time',
        transaction: `calculate-travel-time/${ctx.action}`,
        fingerprint: ['calculate-travel-time', ctx.action, 'element', String(element?.status ?? 'MISSING_ELEMENT')],
        dedupeKey: `maps-element:${ctx.action}:${element?.status ?? 'MISSING_ELEMENT'}`,
        tags: {
          function: 'calculate-travel-time',
          action: ctx.action,
          element_status: String(element?.status ?? 'MISSING_ELEMENT'),
          failure_stage: 'element',
        },
        extra: {
          top_status: data.status,  // 'OK' — the row is what failed
          element_status: element?.status ?? null,
          google_error_message: null,  // none exists at this level
          origin_hint: redactAddress(ctx.origin),
          address_hint: redactAddress(ctx.destination),
        },
        context: {
          function: 'calculate-travel-time',
          ...ctx,
          top_status: data.status,
          element_status: element?.status ?? null,
        },
      })
      return null
    }

    return {
      duration_minutes: Math.ceil(
        (element.duration_in_traffic?.value || element.duration.value) / 60
      ),
      distance_km: Math.round((element.distance.value / 1000) * 10) / 10
    }
  } catch (error) {
    // Network failure, DNS, non-JSON body. Unlike the two above, this one has a stack.
    reportEdgeErrorInBackground({
      message: `Distance Matrix request threw: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
      exceptionType: 'GoogleMapsRequestFailed',
      stack: error instanceof Error ? (error.stack ?? null) : null,
      logger: 'calculate-travel-time',
      transaction: `calculate-travel-time/${ctx.action}`,
      fingerprint: ['calculate-travel-time', ctx.action, 'threw'],
      dedupeKey: `maps-threw:${ctx.action}`,
      tags: { function: 'calculate-travel-time', action: ctx.action, failure_stage: 'transport' },
      extra: { address_hint: redactAddress(ctx.destination) },
      context: { function: 'calculate-travel-time', ...ctx },
    })
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
      reportEdgeErrorInBackground({
        message: `Google Distance Matrix (multi-origin) returned ${data.status}${data.error_message ? `: ${data.error_message}` : ''}`,
        severity: 'error',
        exceptionType: 'GoogleMapsDistanceMatrixError',
        logger: 'calculate-travel-time',
        transaction: 'calculate-travel-time/triage_lead',
        fingerprint: ['calculate-travel-time', 'triage_lead', 'multi_origin', String(data.status)],
        dedupeKey: `maps-multi:${data.status}`,
        tags: {
          function: 'calculate-travel-time',
          action: 'triage_lead',
          google_status: String(data.status),
          failure_stage: 'api',
        },
        extra: {
          google_status: data.status,
          google_error_message: data.error_message ?? null,
          origin_count: origins.length,
          address_hint: redactAddress(destination),
        },
        context: {
          function: 'calculate-travel-time',
          action: 'triage_lead',
          destination,
          origin_count: origins.length,
          google_status: data.status,
          google_error_message: data.error_message ?? null,
        },
      })
      return origins.map(() => null)
    }

    const results = data.rows.map((row: any) => {
      const element = row.elements?.[0]
      if (!element || element.status !== 'OK') return null
      return {
        duration_minutes: Math.ceil(
          (element.duration_in_traffic?.value || element.duration.value) / 60
        ),
        distance_km: Math.round((element.distance.value / 1000) * 10) / 10
      }
    })

    // One aggregate report, not one per technician — a batch of N unroutable origins is
    // a single fact about the destination address, not N separate incidents.
    const failedCount = results.filter((result: unknown) => result === null).length
    if (failedCount > 0) {
      reportEdgeErrorInBackground({
        message: `Distance Matrix returned no route for ${failedCount}/${origins.length} technician origins`,
        severity: 'warning',
        exceptionType: 'GoogleMapsRouteUnavailable',
        logger: 'calculate-travel-time',
        transaction: 'calculate-travel-time/triage_lead',
        fingerprint: ['calculate-travel-time', 'triage_lead', 'multi_origin_partial'],
        dedupeKey: 'maps-multi-partial',
        tags: {
          function: 'calculate-travel-time',
          action: 'triage_lead',
          failure_stage: 'element',
        },
        extra: {
          failed_count: failedCount,
          origin_count: origins.length,
          address_hint: redactAddress(destination),
        },
        context: {
          function: 'calculate-travel-time',
          action: 'triage_lead',
          destination,
          failed_count: failedCount,
          origin_count: origins.length,
        },
      })
    }

    return results
  } catch (error) {
    reportEdgeErrorInBackground({
      message: `Distance Matrix (multi-origin) request threw: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
      exceptionType: 'GoogleMapsRequestFailed',
      stack: error instanceof Error ? (error.stack ?? null) : null,
      logger: 'calculate-travel-time',
      transaction: 'calculate-travel-time/triage_lead',
      fingerprint: ['calculate-travel-time', 'triage_lead', 'multi_origin', 'threw'],
      dedupeKey: 'maps-multi-threw',
      tags: { function: 'calculate-travel-time', action: 'triage_lead', failure_stage: 'transport' },
      extra: { origin_count: origins.length, address_hint: redactAddress(destination) },
      context: { function: 'calculate-travel-time', action: 'triage_lead', destination, origin_count: origins.length },
    })
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

const MELBOURNE_TZ = 'Australia/Melbourne'
const MINUTES_PER_DAY = 24 * 60
const DEFAULT_APPOINTMENT_MINUTES = 60
const DEFAULT_SLOT_INTERVAL_MINUTES = 60
const BUSINESS_START_MINUTES = 8 * 60
const BUSINESS_END_MINUTES = 18 * 60
const TRAVEL_BUFFER_MINUTES = 15

/** Bookings are stored as timestamptz; the schedule grid is Melbourne wall-clock. */
const melbourneFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MELBOURNE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function toMelbourneDateAndMinutes(iso: string): { date: string; minutes: number } | null {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null

  const parts = melbourneFormatter.formatToParts(parsed)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const year = read('year')
  const month = read('month')
  const day = read('day')
  const hour = Number(read('hour'))
  const minute = Number(read('minute'))

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { date: `${year}-${month}-${day}`, minutes: hour * 60 + minute }
}

/** No generated Database types ship with the Edge Functions, so rows come back loose. */
// deno-lint-ignore no-explicit-any
type ServiceClient = SupabaseClient<any, 'public', any>

interface NormalizedBooking {
  leadId: string | null
  date: string
  startMinutes: number
  endMinutes: number
}

/**
 * A technician's real booked windows over the given Melbourne dates.
 *
 * Reads calendar_bookings.start_datetime/end_datetime — the actual stored end —
 * rather than deriving one as leads.scheduled_time + 60 minutes. Under the old
 * derivation an eight-hour remediation job read as a one-hour block, so this
 * engine recommended slots on top of work already scheduled.
 */
async function fetchMelbourneBookings(
  supabase: ServiceClient,
  technicianId: string,
  dateStrings: string[],
): Promise<NormalizedBooking[]> {
  if (dateStrings.length === 0) return []

  // Widen the UTC window a day either side so each Melbourne-local date is fully
  // covered whatever the current offset is.
  const sorted = [...dateStrings].sort()
  const from = new Date(`${sorted[0]}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - 1)
  const to = new Date(`${sorted[sorted.length - 1]}T00:00:00Z`)
  to.setUTCDate(to.getUTCDate() + 2)

  const { data, error } = await supabase
    .from('calendar_bookings')
    .select('lead_id, start_datetime, end_datetime')
    .eq('assigned_to', technicianId)
    .neq('status', 'cancelled')
    .gte('start_datetime', from.toISOString())
    .lt('start_datetime', to.toISOString())

  if (error) {
    console.error('Error fetching calendar bookings:', error)
    return []
  }

  const wanted = new Set(dateStrings)
  const bookings: NormalizedBooking[] = []

  for (const row of data || []) {
    const start = toMelbourneDateAndMinutes(row.start_datetime as string)
    const end = toMelbourneDateAndMinutes(row.end_datetime as string)
    if (!start || !end || !wanted.has(start.date)) continue

    bookings.push({
      leadId: (row.lead_id as string | null) ?? null,
      date: start.date,
      startMinutes: start.minutes,
      // A booking running past midnight blocks the remainder of its starting day.
      endMinutes: end.date === start.date ? end.minutes : MINUTES_PER_DAY,
    })
  }

  return bookings
}

/** Half-open overlap: touching intervals do not conflict. */
function overlapsAny(start: number, end: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart)
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`)
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

    // Validate request body with Zod
    const parseResult = RequestBodySchema.safeParse(body)
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: JSON.stringify(parseResult.error.flatten())
        } satisfies ErrorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: triage_lead
    // ========================================================================
    if (body.action === 'triage_lead') {
      const { lead_id } = body as TriageLeadRequest

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
            // Google failed AND the postcode is missing from MELBOURNE_POSTCODE_COORDS,
            // so no estimate of any kind was produced. This used to claim 'haversine'
            // next to two nulls — the same laundering of uncertainty this change removes.
            rankedTechnicians.push({
              technician_id: tech.id,
              technician_name: tech.name,
              travel_time_minutes: null,
              distance_km: null,
              source: 'unavailable'
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
          // No starting address at all, and no usable postcode to fall back on. Nothing
          // was measured or estimated; 'haversine' here was never true.
          rankedTechnicians.push({
            technician_id: tech.id,
            technician_name: tech.name,
            travel_time_minutes: null,
            distance_km: null,
            source: 'no_origin'
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

      // Validation already handled by Zod schema above

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

      // leads.scheduled_time records only a start. The real end lives on
      // calendar_bookings; fall back to a nominal hour when a lead has no booking row.
      const dayBookings = await fetchMelbourneBookings(supabase, technician_id, [date])
      const endMinutesByLead: Record<string, number> = {}
      for (const booking of dayBookings) {
        if (booking.leadId) endMinutesByLead[booking.leadId] = booking.endMinutes
      }

      const daySchedule = (appointments || []).map(apt => {
        const startTime = apt.scheduled_time || '09:00'
        const bookedEnd = endMinutesByLead[apt.id as string]
        return {
          time: startTime,
          client_name: apt.full_name,
          suburb: apt.property_address_suburb || '',
          ends_at: minutesToTime(
            bookedEnd ?? timeToMinutes(startTime) + DEFAULT_APPOINTMENT_MINUTES
          ),
        }
      })

      // 3. Determine previous appointment (the one ending just before requested time)
      const requestedMinutes = timeToMinutes(requested_time)
      let previousAppointment: PreviousAppointment | null = null
      let travelOrigin: string | null = null
      let usedOverrideAddress = false

      // Find the appointment that ends closest to (but before) the requested time
      const sortedAppts = [...daySchedule].sort((a, b) =>
        timeToMinutes(a.ends_at) - timeToMinutes(b.ends_at)
      )

      for (const apt of sortedAppts) {
        const aptEndMinutes = timeToMinutes(apt.ends_at)
        if (aptEndMinutes <= requestedMinutes) {
          // This appointment ends before our requested time
          // Find the matching raw appointment to get full address
          const rawApt = (appointments || []).find(a =>
            (a.scheduled_time || '09:00') === apt.time && a.full_name === apt.client_name
          )
          const fullAddress = rawApt
            ? [rawApt.property_address_street, rawApt.property_address_suburb, rawApt.property_address_state || 'VIC', rawApt.property_address_postcode].filter(Boolean).join(', ')
            : `${apt.suburb}, VIC, Australia`

          previousAppointment = {
            ends_at: apt.ends_at,
            location: fullAddress,
            suburb: apt.suburb,
            client_name: apt.client_name,
            // Not measured yet. A `0 // Will be calculated below` used to sit here and
            // survived to the wire on the override path, where nothing overwrote it.
            travel_time_minutes: null
          }
          travelOrigin = fullAddress
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

      // No travel origin means nothing downstream of a travel time can be computed. This
      // used to answer 200 with travel 0 / buffer 0 / earliest 08:00 and three booking
      // suggestions — every one of them derived from an assumed zero-minute drive.
      //
      // previousAppointment is almost always null here, since setting it also sets
      // travelOrigin — but not quite always: a lead whose address columns are all empty
      // joins to `''`, which is falsy. So report whatever is actually there rather than
      // hardcoding null, which is how the placeholder zeroes got here in the first place.
      if (!travelOrigin) {
        const noAddressResponse: UnknownAvailabilityResponse = {
          source: 'no_origin',
          available: null,
          technician_name: technicianName,
          technician_home: technicianHome,
          previous_appointment: previousAppointment,
          earliest_start: null,
          requested_time_works: null,
          buffer_minutes: null,
          suggestions: [],
          day_schedule: daySchedule,
          travel_time_minutes: null,
          travel_distance_km: null,
          travel_origin_address: null,
          is_feasible: null,
          used_override_address: usedOverrideAddress,
          error: 'no_starting_address',
          message: `Cannot calculate travel time - ${technicianName}'s starting address is not set. Please set their address in Profile, or provide a manual starting location.`
        }

        reportEdgeErrorInBackground({
          message: `No starting address for technician ${technicianName} — travel time not computable`,
          severity: 'warning',
          exceptionType: 'TravelOriginMissing',
          logger: 'calculate-travel-time',
          transaction: 'calculate-travel-time/check_availability',
          fingerprint: ['calculate-travel-time', 'check_availability', 'no_origin'],
          // The booking form re-fires this on every date/time change, so without a
          // dedupe window one address-less technician writes an error_logs row per keystroke.
          dedupeKey: `no_origin:${technician_id}`,
          tags: {
            function: 'calculate-travel-time',
            action: 'check_availability',
            travel_source: 'no_origin',
          },
          extra: { technician_id, date, requested_time },
          context: {
            function: 'calculate-travel-time',
            action: 'check_availability',
            technician_id,
            technician_name: technicianName,
            date,
            requested_time,
            destination_address,
          },
        })

        return new Response(
          JSON.stringify(noAddressResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 4. Calculate travel time from origin to destination.
      //
      // There is no fallback. `let travelTimeMinutes = 30 // Default 30 min if API fails`
      // used to open this block, and its 30 flowed into earliest_start, buffer_minutes,
      // is_feasible, the suggestion list and previous_appointment.travel_time_minutes —
      // all returned as HTTP 200 with nothing to mark them as invented.
      const travelResult = await calculateTravelTime(travelOrigin, destination_address, apiKey, {
        action: 'check_availability',
        technician_id,
        date,
        origin: travelOrigin,
        destination: destination_address,
      })

      if (!travelResult) {
        // calculateTravelTime has already reported the specific Google status and
        // error_message. Everything downstream of a travel time is withheld, not guessed.
        const unknownTravelResponse: UnknownAvailabilityResponse = {
          source: 'unavailable',
          available: null,
          technician_name: technicianName,
          technician_home: technicianHome,
          previous_appointment: previousAppointment,
          earliest_start: null,
          requested_time_works: null,
          buffer_minutes: null,
          suggestions: [],
          day_schedule: daySchedule,
          travel_time_minutes: null,
          travel_distance_km: null,
          travel_origin_address: travelOrigin,
          is_feasible: null,
          used_override_address: usedOverrideAddress,
          message: 'Travel time could not be calculated - the mapping service did not respond. Try again, or book without a travel estimate.'
        }
        return new Response(
          JSON.stringify(unknownTravelResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const travelTimeMinutes = travelResult.duration_minutes
      const travelDistanceKm = travelResult.distance_km

      let earliestStartMinutes = BUSINESS_START_MINUTES
      if (previousAppointment && !usedOverrideAddress) {
        // Previous appointment takes priority unless we're using an override
        earliestStartMinutes = timeToMinutes(previousAppointment.ends_at) + travelTimeMinutes
      } else if (usedOverrideAddress || technicianHome) {
        // Using override address or home - business start + travel from that point
        earliestStartMinutes = BUSINESS_START_MINUTES + travelTimeMinutes
      }

      // 5. Check if requested time works
      const requestedTimeWorks = requestedMinutes >= earliestStartMinutes
      const bufferMinutes = requestedMinutes - earliestStartMinutes  // Can be negative

      // 6. Generate suggestions if time doesn't work
      const suggestions = requestedTimeWorks
        ? []
        : generateSuggestions(earliestStartMinutes, 3)

      const response: ResolvedAvailabilityResponse = {
        source: 'google_api',
        available: requestedTimeWorks,
        technician_name: technicianName,
        technician_home: technicianHome,
        previous_appointment: previousAppointment
          ? {
              ...previousAppointment,
              // The measured leg is travelOrigin -> destination. With an override the
              // origin is the override address, so this appointment's own leg was never
              // measured and must not claim a number.
              travel_time_minutes: usedOverrideAddress ? null : travelTimeMinutes,
            }
          : null,
        earliest_start: minutesToTime(earliestStartMinutes),
        requested_time_works: requestedTimeWorks,
        buffer_minutes: bufferMinutes,
        suggestions,
        day_schedule: daySchedule,
        travel_time_minutes: travelTimeMinutes,
        travel_distance_km: travelDistanceKm,
        travel_origin_address: travelOrigin,
        is_feasible: bufferMinutes >= 0,
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
        duration_minutes = DEFAULT_APPOINTMENT_MINUTES,
        slot_interval_minutes = DEFAULT_SLOT_INTERVAL_MINUTES,
        preferred_date,
        preferred_time
      } = body as RecommendedDatesRequest

      // Validation already handled by Zod schema above

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

      // 2. Travel time from home to destination. ONE Distance Matrix call, shared by
      // every day scored below — which is why its provenance is a property of the whole
      // response, not of an individual day.
      let travelFromHomeMinutes: number | null = null
      let travelFromHomeSource: TravelTimeSource = 'no_origin'
      if (technicianHome) {
        const homeTravel = await calculateTravelTime(technicianHome, destination_address, apiKey, {
          action: 'get_recommended_dates',
          technician_id,
          origin: technicianHome,
          destination: destination_address,
        })
        if (homeTravel) {
          travelFromHomeMinutes = homeTravel.duration_minutes
          travelFromHomeSource = 'google_api'
        } else {
          // Already reported by calculateTravelTime. Days keep their appointment-based
          // score below; they just stop claiming a travel time.
          travelFromHomeSource = 'unavailable'
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
      // Real booked windows, keyed by Melbourne date. The leads rows above still
      // drive the suburb/count scoring; only the busy ranges come from here.
      const bookings = await fetchMelbourneBookings(supabase, technician_id, dateStrings)
      const busyByDate: Record<string, Array<[number, number]>> = {}
      for (const booking of bookings) {
        if (!busyByDate[booking.date]) busyByDate[booking.date] = []
        busyByDate[booking.date].push([booking.startMinutes, booking.endMinutes])
      }
      const bookedLeadIds = new Set(
        bookings.map((booking) => booking.leadId).filter((id): id is string => Boolean(id))
      )

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

        // A lead scheduled without a calendar_bookings row would otherwise be invisible
        // here. None exist today; this keeps the coverage the leads-only version had.
        const orphanRanges = dayAppts
          .filter((apt) => apt.scheduled_time && !bookedLeadIds.has(apt.id as string))
          .map((apt) => {
            const startMin = timeToMinutes(apt.scheduled_time as string)
            return [startMin, startMin + DEFAULT_APPOINTMENT_MINUTES] as [number, number]
          })

        // Each window padded with a travel buffer so the engine never recommends a
        // back-to-back arrival.
        const bookedRanges = [...(busyByDate[dateStr] || []), ...orphanRanges].map(
          ([startMin, endMin]) => [startMin, endMin + TRAVEL_BUFFER_MINUTES] as [number, number]
        )

        // Candidates step by slot_interval_minutes, so the grid is a parameter rather
        // than a hardcoded hour.
        const durationMins = duration_minutes
        const availableSlots: string[] = []
        const lastCandidateStart = BUSINESS_END_MINUTES - durationMins
        for (
          let candidateStart = BUSINESS_START_MINUTES;
          candidateStart <= lastCandidateStart;
          candidateStart += slot_interval_minutes
        ) {
          if (!overlapsAny(candidateStart, candidateStart + durationMins, bookedRanges)) {
            availableSlots.push(minutesToTime(candidateStart))
          }
        }

        // The customer's exact preferred time, not the hour it happens to fall in.
        // Truncating to HH:00 used to promote a slot the customer never asked for and
        // to report a 09:07 preference as feasible whenever 09:00 was free.
        let preferredTimeFeasible: boolean | undefined = undefined
        if (preferred_date && dateStr === preferred_date && preferred_time) {
          const preferredStart = timeToMinutes(preferred_time)
          const preferredEnd = preferredStart + durationMins
          preferredTimeFeasible =
            preferredStart >= BUSINESS_START_MINUTES &&
            preferredEnd <= BUSINESS_END_MINUTES &&
            !overlapsAny(preferredStart, preferredEnd, bookedRanges)

          if (preferredTimeFeasible) {
            const exactSlot = minutesToTime(preferredStart)
            const existingIndex = availableSlots.indexOf(exactSlot)
            if (existingIndex >= 0) availableSlots.splice(existingIndex, 1)
            availableSlots.unshift(exactSlot)
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
          } else if (travelFromHomeMinutes !== null) {
            score = 100 - travelFromHomeMinutes
            reason = `Free all day, ${travelFromHomeMinutes} min from home`
            rating = travelFromHomeMinutes <= 25 ? 'best' : 'good'
          } else {
            // Maps did not answer. `100 - (travelFromHomeMinutes || 30)` used to sit on
            // the line above: a second, hidden 30-minute drive that quietly demoted every
            // empty day by 30 points whenever Google was unreachable. The day keeps its
            // appointment-based score and simply makes no travel claim.
            score = 100
            reason = 'Free all day'
            rating = 'good'
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

        // Boost score if this is the customer's preferred date
        if (preferred_date && dateStr === preferred_date) {
          score += 30

          if (preferred_time) {
            reason = preferredTimeFeasible
              ? `Customer's preferred time available · ${reason}`
              : `Customer's preferred time conflicts — alternatives available`
          } else {
            reason = `Customer's preferred date · ${reason}`
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
          travel_from_home_source: travelFromHomeSource,
          available_slots: availableSlots,
          needs_manual_address: needsManualAddress,
          preferred_time_feasible: preferredTimeFeasible,
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
        travel_from_home_source: travelFromHomeSource,
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

    // Validation already handled by Zod schema above

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
      // This path already tells the caller the truth (HTTP 400 carrying error_message),
      // but it has never been recorded anywhere the team can see after the fact.
      reportEdgeErrorInBackground({
        message: `Google Distance Matrix returned ${data.status}${data.error_message ? `: ${data.error_message}` : ''}`,
        severity: 'error',
        exceptionType: 'GoogleMapsDistanceMatrixError',
        logger: 'calculate-travel-time',
        transaction: 'calculate-travel-time/direct',
        fingerprint: ['calculate-travel-time', 'direct', String(data.status)],
        dedupeKey: `maps-api:direct:${data.status}`,
        tags: {
          function: 'calculate-travel-time',
          action: 'direct',
          google_status: String(data.status),
          failure_stage: 'api',
        },
        extra: {
          google_status: data.status,
          google_error_message: data.error_message ?? null,
          address_hint: redactAddress(destination),
        },
        context: {
          function: 'calculate-travel-time',
          action: 'direct',
          origin,
          destination,
          google_status: data.status,
          google_error_message: data.error_message ?? null,
        },
      })
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
      reportEdgeErrorInBackground({
        message: `Google Distance Matrix route element failed: ${element?.status ?? 'MISSING_ELEMENT'}`,
        severity: 'warning',
        exceptionType: 'GoogleMapsRouteUnavailable',
        logger: 'calculate-travel-time',
        transaction: 'calculate-travel-time/direct',
        fingerprint: ['calculate-travel-time', 'direct', 'element', String(element?.status ?? 'MISSING_ELEMENT')],
        dedupeKey: `maps-element:direct:${element?.status ?? 'MISSING_ELEMENT'}`,
        tags: {
          function: 'calculate-travel-time',
          action: 'direct',
          element_status: String(element?.status ?? 'MISSING_ELEMENT'),
          failure_stage: 'element',
        },
        extra: {
          top_status: data.status,
          element_status: element?.status ?? null,
          google_error_message: null,
          origin_hint: redactAddress(origin),
          address_hint: redactAddress(destination),
        },
        context: {
          function: 'calculate-travel-time',
          action: 'direct',
          origin,
          destination,
          top_status: data.status,
          element_status: element?.status ?? null,
        },
      })
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
        details: error instanceof Error ? error.message : String(error)
      } satisfies ErrorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
