import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

interface PreviousAppointment {
  ends_at: string
  location: string
  suburb: string
  client_name: string
  travel_time_minutes: number
}

interface DayScheduleItem {
  time: string
  client_name: string
  suburb: string
  ends_at: string
}

export interface AvailabilityResult {
  available: boolean
  technician_name: string
  technician_home: string | null
  previous_appointment: PreviousAppointment | null
  earliest_start: string
  requested_time_works: boolean
  buffer_minutes: number
  suggestions: string[]
  day_schedule: DayScheduleItem[]
  travel_time_minutes: number
  travel_distance_km: number | null
  travel_origin_address: string
  is_feasible: boolean
  error?: 'no_starting_address'  // Error flag when starting address is missing
  message?: string  // Error message for user display
  used_override_address?: boolean  // Flag indicating manual address was used
}

interface CheckAvailabilityParams {
  technicianId: string
  date: Date
  requestedTime: string
  destinationAddress: string
  overrideStartAddress?: string  // Manual override for starting location
}

interface GetRecommendedDatesParams {
  technicianId: string
  destinationAddress: string
  destinationSuburb: string
  daysAhead?: number
  durationMinutes?: number
  preferredDate?: string  // YYYY-MM-DD — customer's preferred date to boost in recommendations
  preferredTime?: string  // HH:MM — customer's preferred time to prioritize in slots
}

export interface DateRecommendation {
  date: string  // YYYY-MM-DD
  day_name: string  // "Mon", "Tue", etc.
  display_date: string  // "16 Jan"
  score: number
  rating: 'best' | 'good' | 'available' | 'unknown'
  reason: string
  appointment_count: number
  travel_from_home_minutes: number | null
  available_slots: string[]
  needs_manual_address?: boolean  // True when no starting address for empty days
  preferred_time_feasible?: boolean  // True if customer's preferred time slot is available
}

/** Wire shape returned by the calculate-travel-time Edge Function. */
export interface RecommendedDatesResult {
  recommendations: DateRecommendation[]
  technician_name: string
  technician_home: string | null
  has_missing_address_warning?: boolean  // True if any day has unknown travel due to missing address
}

/** Why a recommended-dates lookup failed. Drives the user-facing copy below. */
export type RecommendedDatesFailureReason =
  | 'auth'        // no Supabase session — token expired or signed out in another tab
  | 'network'     // fetch itself rejected (offline, DNS, CORS, aborted)
  | 'server'      // reached the function, got a non-2xx or an unparseable body
  | 'bad_params'  // caller passed no technician or no destination address

export const RECOMMENDED_DATES_FAILURE_MESSAGES: Record<RecommendedDatesFailureReason, string> = {
  auth: 'Your session expired — refresh the page to see suggested days',
  network: "Couldn't reach the scheduling service — pick a date manually",
  server: "Couldn't reach the scheduling service — pick a date manually",
  bad_params: 'Missing technician or property address — pick a date manually',
}

/** Fields carried by BOTH successful variants. */
interface RecommendedDatesPayload {
  recommendations: DateRecommendation[]
  technician_name: string
  technician_home: string | null
  has_missing_address_warning: boolean
}

/**
 * Three-way outcome. Never rejects, never returns null — a failed lookup must stay
 * distinguishable from a genuine "no free days", because the two mean opposite things
 * to the admin doing the booking.
 *
 *  - 'ok'     → at least one recommended day
 *  - 'empty'  → the service answered, genuinely no free days. Still carries the
 *               technician fields: the panel renders "Travelling from: X" from them
 *               even when there are zero days.
 *  - 'failed' → we do not know whether there are free days.
 */
export type RecommendedDatesOutcome =
  | ({ status: 'ok' } & RecommendedDatesPayload)
  | ({ status: 'empty' } & RecommendedDatesPayload)
  | {
      status: 'failed'
      reason: RecommendedDatesFailureReason
      userMessage: string   // safe to render verbatim
      detail: string        // diagnostics for Sentry — never rendered
    }

function recsFailure(
  reason: RecommendedDatesFailureReason,
  detail: string
): RecommendedDatesOutcome {
  return { status: 'failed', reason, userMessage: RECOMMENDED_DATES_FAILURE_MESSAGES[reason], detail }
}

/** Best-effort body read for diagnostics. Must never throw. */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 200)
  } catch {
    return '<unreadable body>'
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useBookingValidation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AvailabilityResult | null>(null)

  const checkAvailability = useCallback(async (params: CheckAvailabilityParams): Promise<AvailabilityResult | null> => {
    const { technicianId, date, requestedTime, destinationAddress, overrideStartAddress } = params

    if (!technicianId || !date || !requestedTime || !destinationAddress) {
      setError('Missing required parameters')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Format date as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0]

      // Build request body, optionally including override address
      const requestBody: Record<string, string> = {
        action: 'check_availability',
        technician_id: technicianId,
        date: dateStr,
        requested_time: requestedTime,
        destination_address: destinationAddress,
      }

      if (overrideStartAddress) {
        requestBody.override_start_address = overrideStartAddress
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-travel-time`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability')
      }

      setResult(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Availability check error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  const getRecommendedDates = useCallback(async (params: GetRecommendedDatesParams): Promise<RecommendedDatesOutcome> => {
    const { technicianId, destinationAddress, destinationSuburb, daysAhead = 7, durationMinutes = 60, preferredDate, preferredTime } = params

    if (!technicianId || !destinationAddress) {
      setError('Missing required parameters')
      return recsFailure('bad_params', 'Missing technicianId or destinationAddress')
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return recsFailure('auth', 'No active Supabase session')
      }

      let response: Response
      try {
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-travel-time`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'get_recommended_dates',
              technician_id: technicianId,
              destination_address: destinationAddress,
              destination_suburb: destinationSuburb,
              days_ahead: daysAhead,
              duration_minutes: durationMinutes,
              ...(preferredDate && { preferred_date: preferredDate }),
              ...(preferredTime && { preferred_time: preferredTime }),
            }),
          }
        )
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        setError(detail)
        console.error('Recommended dates network error:', err)
        return recsFailure('network', detail)
      }

      // Status is checked BEFORE the body is parsed: an undeployed function returns a
      // 404 with an HTML body, which would otherwise surface as a JSON parse error and
      // hide the real cause.
      if (!response.ok) {
        const detail = `HTTP ${response.status}: ${await readErrorDetail(response)}`
        setError(detail)
        console.error('Recommended dates server error:', detail)
        return recsFailure('server', detail)
      }

      let data: RecommendedDatesResult
      try {
        data = (await response.json()) as RecommendedDatesResult
      } catch (err) {
        const detail = `Malformed JSON body: ${err instanceof Error ? err.message : String(err)}`
        setError(detail)
        console.error('Recommended dates parse error:', err)
        return recsFailure('server', detail)
      }

      const payload: RecommendedDatesPayload = {
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        technician_name: data.technician_name,
        technician_home: data.technician_home ?? null,
        has_missing_address_warning: data.has_missing_address_warning ?? false,
      }

      return payload.recommendations.length > 0
        ? { status: 'ok', ...payload }
        : { status: 'empty', ...payload }
    } catch (err) {
      // Only reachable if supabase.auth.getSession() itself rejects, which it does on
      // transport failure.
      const detail = err instanceof Error ? err.message : String(err)
      setError(detail)
      console.error('Recommended dates error:', err)
      return recsFailure('network', detail)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    checkAvailability,
    getRecommendedDates,
    clearResult,
    isLoading,
    error,
    result,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format time string (HH:MM) to display format (9:00 AM)
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Get relative time description
 */
export function getRelativeTime(bufferMinutes: number): string {
  if (bufferMinutes < 5) return 'Right on time'
  if (bufferMinutes < 15) return `${bufferMinutes} min buffer`
  if (bufferMinutes < 30) return `${bufferMinutes} min buffer - plenty of time`
  return `${bufferMinutes} min buffer - comfortable gap`
}
