import { useEffect, useRef } from 'react'
import { useBookingValidation, formatTimeDisplay, type AvailabilityResult } from '@/hooks/useBookingValidation'
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Loader2,
  Car,
  Home,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeSlotValidatorProps {
  leadAddress: string
  leadSuburb: string
  technicianId: string | null
  selectedDate: Date | null
  selectedTime: string
  onTimeChange?: (time: string) => void
  onValidationChange?: (isValid: boolean) => void
  className?: string
}

export function TimeSlotValidator({
  leadAddress,
  leadSuburb,
  technicianId,
  selectedDate,
  selectedTime,
  onTimeChange,
  onValidationChange,
  className
}: TimeSlotValidatorProps) {
  const { checkAvailability, isLoading, error, result, clearResult } = useBookingValidation()
  // Use ref instead of state to avoid re-renders that cancel the debounce timeout
  const lastCheckedRef = useRef<string>('')

  // Check availability when inputs change
  useEffect(() => {
    // Create a stable date string for comparison (avoids Date object reference issues)
    const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : ''
    const checkKey = `${technicianId}-${dateStr}-${selectedTime}-${leadAddress}`

    // Skip if already checked or missing required inputs
    if (checkKey === lastCheckedRef.current || !technicianId || !selectedDate || !selectedTime || !leadAddress) {
      if (!technicianId || !selectedDate || !selectedTime || !leadAddress) {
        clearResult()
        onValidationChange?.(false)
      }
      return
    }

    // Update ref immediately (no re-render)
    lastCheckedRef.current = checkKey

    const timeoutId = setTimeout(() => {
      checkAvailability({
        technicianId,
        date: selectedDate,
        requestedTime: selectedTime,
        destinationAddress: `${leadAddress}, ${leadSuburb}, VIC, Australia`
      }).then((result) => {
        if (result) {
          onValidationChange?.(result.requested_time_works)
        }
      })
    }, 500) // Debounce

    return () => clearTimeout(timeoutId)
  }, [technicianId, selectedDate, selectedTime, leadAddress, leadSuburb, checkAvailability, clearResult, onValidationChange])

  // If missing required inputs, show placeholder
  if (!technicianId || !selectedDate || !selectedTime) {
    return (
      <div className={cn('rounded-xl bg-gray-50 border-2 border-gray-200 p-4', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <Clock size={18} />
          <span className="text-sm">Select technician, date, and time to check availability</span>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-xl bg-blue-50 border-2 border-blue-200 p-4', className)}>
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Checking availability...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-xl bg-amber-50 border-2 border-amber-200 p-4', className)}>
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  // No result yet
  if (!result) {
    return null
  }

  // Render availability result
  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      result.requested_time_works
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {result.requested_time_works ? (
          <>
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="font-semibold text-green-800">Available</span>
          </>
        ) : (
          <>
            <XCircle className="text-red-600" size={20} />
            <span className="font-semibold text-red-800">Time Conflict</span>
          </>
        )}
      </div>

      {/* Technician Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <User size={14} className="text-gray-500" />
          <span className="font-medium">{result.technician_name}</span>
        </div>

        {/* Starting Location */}
        {result.technician_home && !result.previous_appointment && (
          <div className="flex items-center gap-2 text-gray-600">
            <Home size={14} className="text-gray-500" />
            <span>Starts from: {result.technician_home.split(',')[0]}</span>
          </div>
        )}

        {/* Previous Appointment */}
        {result.previous_appointment && (
          <div className="bg-white/60 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={14} className="text-gray-500" />
              <span>
                Previous: <strong>{result.previous_appointment.client_name}</strong> ({result.previous_appointment.suburb})
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="ml-5">Ends at {formatTimeDisplay(result.previous_appointment.ends_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Car size={14} className="text-gray-500 ml-0.5" />
              <span>
                Travel to {leadSuburb}: <strong>{result.previous_appointment.travel_time_minutes} mins</strong>
              </span>
            </div>
          </div>
        )}

        {/* Earliest Start */}
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={14} className="text-gray-500" />
          <span>
            Earliest arrival: <strong>{formatTimeDisplay(result.earliest_start)}</strong>
          </span>
        </div>

        {/* Result Message */}
        {result.requested_time_works ? (
          <div className="mt-2 pt-2 border-t border-green-200">
            <p className="text-green-700 font-medium">
              {formatTimeDisplay(selectedTime)} works!
              {result.buffer_minutes > 0 && (
                <span className="font-normal text-green-600 ml-1">
                  ({result.buffer_minutes} min buffer)
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-red-200 space-y-2">
            <p className="text-red-700">
              {formatTimeDisplay(selectedTime)} is too early.
              Can't arrive until {formatTimeDisplay(result.earliest_start)}.
            </p>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm text-gray-600 font-medium">Suggested times:</p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onTimeChange?.(time)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      {formatTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day Schedule Summary */}
      {result.day_schedule.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 font-medium mb-2">
            {result.technician_name}'s schedule for this day:
          </p>
          <div className="space-y-1">
            {result.day_schedule.map((apt, idx) => (
              <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                <span className="font-medium">{formatTimeDisplay(apt.time)}</span>
                <span>-</span>
                <span>{apt.client_name} ({apt.suburb})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeSlotValidator
