import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Types
export interface TravelTimeResult {
  distance_km: number
  duration_minutes: number
  duration_in_traffic_minutes: number | null
  origin_address: string
  destination_address: string
}

export interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface PlaceDetails {
  formatted_address: string
  street_number?: string
  street_name?: string
  suburb?: string
  state?: string
  postcode?: string
  lat: number
  lng: number
}

// MRC base location (Bundoora office)
export const MRC_BASE_ADDRESS = '123 Main Street, Bundoora VIC 3083, Australia'

/**
 * Hook for calculating travel time using Google Maps Distance Matrix API
 */
export function useTravelTime() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateTravelTime = useCallback(async (
    origin: string,
    destination: string,
    departureTime?: number | 'now'
  ): Promise<TravelTimeResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-travel-time', {
        body: {
          origin,
          destination,
          departure_time: departureTime || 'now'
        }
      })

      if (fnError) {
        throw new Error(fnError.message || 'Failed to calculate travel time')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      return data as TravelTimeResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Travel time calculation error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate travel from MRC base to a destination
  const calculateFromBase = useCallback(async (
    destination: string,
    departureTime?: number | 'now'
  ) => {
    return calculateTravelTime(MRC_BASE_ADDRESS, destination, departureTime)
  }, [calculateTravelTime])

  return {
    calculateTravelTime,
    calculateFromBase,
    isLoading,
    error
  }
}

/**
 * Hook for Google Maps address autocomplete
 * Uses the new Places API (AutocompleteSuggestion + Place) instead of
 * the deprecated AutocompleteService + PlacesService.
 */
export function useAddressAutocomplete(_inputRef: React.RefObject<HTMLInputElement | null>) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionTokenRef = useRef<any>(null)
  const initializedRef = useRef(false)

  // Lazily initialize the Places library via importLibrary
  const ensureInitialized = useCallback(async (): Promise<boolean> => {
    if (initializedRef.current) return true
    if (typeof google === 'undefined' || !google.maps) return false

    try {
      // importLibrary returns immediately if already loaded via &libraries=places
      await google.maps.importLibrary('places')
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      initializedRef.current = true
      return true
    } catch {
      console.warn('Failed to load Places library')
      return false
    }
  }, [])

  // Get predictions for input text using AutocompleteSuggestion (new API)
  const getPlacePredictions = useCallback(async (input: string): Promise<PlacePrediction[]> => {
    if (!input || input.length < 3) {
      setPredictions([])
      return []
    }

    if (!await ensureInitialized()) {
      console.warn('Google Maps not loaded yet')
      return []
    }

    setIsLoading(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PlacesNS = google.maps.places as any

      const { suggestions } = await PlacesNS.AutocompleteSuggestion
        .fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ['au'],
          language: 'en',
          sessionToken: sessionTokenRef.current,
        })

      // Map new API response to our PlacePrediction interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: PlacePrediction[] = (suggestions || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.placePrediction)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => {
          const p = s.placePrediction
          return {
            place_id: p.placeId,
            description: p.text.text,
            structured_formatting: {
              main_text: p.mainText?.text || p.text.text,
              secondary_text: p.secondaryText?.text || '',
            },
          }
        })

      setPredictions(mapped)
      return mapped
    } catch (err) {
      console.error('Autocomplete suggestions error:', err)
      setPredictions([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [ensureInitialized])

  // Get details for a selected place using Place.fetchFields (new API)
  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    if (!await ensureInitialized()) {
      console.warn('Google Maps not loaded yet')
      return null
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PlacesNS = google.maps.places as any

      const place = new PlacesNS.Place({ id: placeId })
      await place.fetchFields({
        fields: ['formattedAddress', 'addressComponents', 'location'],
      })

      // Reset session token after fetching details (completes the billing session)
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()

      // New API uses longText instead of long_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getComponent = (type: string): string | undefined =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        place.addressComponents?.find((c: any) => c.types.includes(type))?.longText

      const details: PlaceDetails = {
        formatted_address: place.formattedAddress || '',
        street_number: getComponent('street_number'),
        street_name: getComponent('route'),
        suburb: getComponent('locality') || getComponent('sublocality'),
        state: getComponent('administrative_area_level_1'),
        postcode: getComponent('postal_code'),
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      }

      return details
    } catch (err) {
      console.error('Place details error:', err)
      return null
    }
  }, [ensureInitialized])

  // Clear predictions
  const clearPredictions = useCallback(() => {
    setPredictions([])
  }, [])

  return {
    predictions,
    isLoading,
    getPlacePredictions,
    getPlaceDetails,
    clearPredictions
  }
}

/**
 * Hook to load Google Maps script
 */
export function useLoadGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      setIsLoaded(true)
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true))
      return
    }

    // Create and load script with loading=async to avoid console warning
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      setIsLoaded(true)
    }

    script.onerror = () => {
      setError('Failed to load Google Maps')
    }

    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount as it may be used elsewhere
    }
  }, [])

  return { isLoaded, error }
}

/**
 * Calculate smart booking slots based on existing appointments
 */
export interface ExistingAppointment {
  id: string
  client_name: string
  address: string
  suburb: string
  start_time: string // HH:MM format
  end_time: string   // HH:MM format (start + 1 hour inspection)
}

export interface AvailableSlot {
  time: string       // HH:MM format
  label: string      // "9:00 AM"
  travel_from?: {
    previous_client: string
    previous_suburb: string
    travel_minutes: number
  }
  is_recommended: boolean
}

export function useSmartBookingSlots() {
  const { calculateTravelTime, isLoading } = useTravelTime()
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [calculating, setCalculating] = useState(false)

  const calculateAvailableSlots = useCallback(async (
    newAddress: string,
    existingAppointments: ExistingAppointment[],
    selectedDate: Date
  ): Promise<AvailableSlot[]> => {
    setCalculating(true)

    try {
      // Business hours: 7 AM - 6 PM
      const START_HOUR = 7
      const END_HOUR = 18
      const INSPECTION_DURATION = 60 // minutes
      const SLOT_INTERVAL = 30 // minutes

      // Generate all possible slots
      const allSlots: AvailableSlot[] = []
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
          const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          const h = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const label = `${h}:${String(minute).padStart(2, '0')} ${ampm}`

          allSlots.push({
            time,
            label,
            is_recommended: false
          })
        }
      }

      // If no existing appointments, all slots are available
      if (existingAppointments.length === 0) {
        // Recommend 9 AM as default
        const result = allSlots.map(slot => ({
          ...slot,
          is_recommended: slot.time === '09:00'
        }))
        setSlots(result)
        return result
      }

      // Sort existing appointments by start time
      const sorted = [...existingAppointments].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )

      // Calculate travel times from each existing appointment to new location
      const availableSlots: AvailableSlot[] = []

      for (const slot of allSlots) {
        const slotMinutes = parseInt(slot.time.split(':')[0]) * 60 + parseInt(slot.time.split(':')[1])
        let isAvailable = true
        let travelInfo: AvailableSlot['travel_from'] = undefined

        // Check against each existing appointment
        for (const appt of sorted) {
          const apptStartMinutes = parseInt(appt.start_time.split(':')[0]) * 60 + parseInt(appt.start_time.split(':')[1])
          const apptEndMinutes = apptStartMinutes + INSPECTION_DURATION

          // Check if slot conflicts with existing appointment
          const slotEndMinutes = slotMinutes + INSPECTION_DURATION

          // Conflict if: slot starts before appt ends AND slot ends after appt starts
          if (slotMinutes < apptEndMinutes && slotEndMinutes > apptStartMinutes) {
            isAvailable = false
            break
          }

          // If this slot is after an existing appointment, calculate travel time
          if (slotMinutes >= apptEndMinutes) {
            // Calculate travel time from previous appointment
            const travelResult = await calculateTravelTime(appt.address, newAddress)

            if (travelResult) {
              const travelMinutes = travelResult.duration_in_traffic_minutes || travelResult.duration_minutes
              const earliestArrival = apptEndMinutes + travelMinutes

              // Not enough time to travel
              if (slotMinutes < earliestArrival) {
                isAvailable = false
                break
              }

              travelInfo = {
                previous_client: appt.client_name,
                previous_suburb: appt.suburb,
                travel_minutes: travelMinutes
              }
            }
          }
        }

        if (isAvailable) {
          availableSlots.push({
            ...slot,
            travel_from: travelInfo,
            is_recommended: false
          })
        }
      }

      // Mark first available slot as recommended
      if (availableSlots.length > 0) {
        availableSlots[0].is_recommended = true
      }

      setSlots(availableSlots)
      return availableSlots

    } catch (err) {
      console.error('Error calculating available slots:', err)
      setSlots(allSlots)
      return allSlots
    } finally {
      setCalculating(false)
    }
  }, [calculateTravelTime])

  return {
    slots,
    calculating: calculating || isLoading,
    calculateAvailableSlots
  }
}
