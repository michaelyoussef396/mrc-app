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
}

export interface RecommendedDatesResult {
  recommendations: DateRecommendation[]
  technician_name: string
  technician_home: string | null
  has_missing_address_warning?: boolean  // True if any day has unknown travel due to missing address
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

  const getRecommendedDates = useCallback(async (params: GetRecommendedDatesParams): Promise<RecommendedDatesResult | null> => {
    const { technicianId, destinationAddress, destinationSuburb, daysAhead = 7, durationMinutes = 60 } = params

    if (!technicianId || !destinationAddress) {
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

      const response = await fetch(
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
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommended dates')
      }

      return data as RecommendedDatesResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Recommended dates error:', err)
      return null
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
