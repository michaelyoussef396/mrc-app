import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, MapPin, Car, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSmartBookingSlots, ExistingAppointment, AvailableSlot } from '@/hooks/useGoogleMaps'
import { cn } from '@/lib/utils'

interface SmartBookingSlotsProps {
  selectedDate: Date
  propertyAddress: string
  propertySuburb: string
  onSelectTime: (time: string) => void
  selectedTime?: string
}

export function SmartBookingSlots({
  selectedDate,
  propertyAddress,
  propertySuburb,
  onSelectTime,
  selectedTime
}: SmartBookingSlotsProps) {
  const { slots, calculating, calculateAvailableSlots } = useSmartBookingSlots()
  const [initialized, setInitialized] = useState(false)

  // Format date for query
  const dateKey = selectedDate.toISOString().split('T')[0]

  // Fetch existing appointments for the selected date
  const { data: existingLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['day-appointments', dateKey],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('inspection_scheduled_date', dateKey)
        .not('scheduled_time', 'is', null)

      if (error) throw error
      return data
    },
    enabled: !!dateKey
  })

  // Convert leads to ExistingAppointment format
  useEffect(() => {
    if (leadsLoading || !propertyAddress) return

    const appointments: ExistingAppointment[] = (existingLeads || []).map(lead => ({
      id: lead.id,
      client_name: lead.full_name || 'Unknown',
      address: `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`,
      suburb: lead.property_address_suburb || '',
      start_time: lead.scheduled_time || '09:00',
      end_time: addHour(lead.scheduled_time || '09:00')
    }))

    // Calculate available slots
    calculateAvailableSlots(propertyAddress, appointments, selectedDate)
    setInitialized(true)
  }, [existingLeads, leadsLoading, propertyAddress, selectedDate, calculateAvailableSlots])

  // Add 1 hour to time string
  function addHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const newHours = hours + 1
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Format time for display
  function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const h = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`
  }

  const isLoading = leadsLoading || calculating || !initialized

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">
              {calculating ? 'Calculating travel times...' : 'Loading appointments...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show existing appointments summary
  const existingAppointments = existingLeads?.length || 0

  return (
    <div className="space-y-4">
      {/* Existing Appointments Summary */}
      {existingAppointments > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {existingAppointments} existing inspection{existingAppointments !== 1 ? 's' : ''} on this day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingLeads?.map(lead => (
                <div key={lead.id} className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-amber-600" />
                  <span className="font-medium">{formatTime(lead.scheduled_time || '09:00')}</span>
                  <span className="text-gray-500">-</span>
                  <span>{lead.full_name}</span>
                  <span className="text-gray-400">({lead.property_address_suburb})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Time Slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Available Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No available slots for this day</p>
              <p className="text-xs mt-1">Try selecting a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(slot => (
                <SlotButton
                  key={slot.time}
                  slot={slot}
                  isSelected={selectedTime === slot.time}
                  onClick={() => onSelectTime(slot.time)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Info for Selected Slot */}
      {selectedTime && (
        <SelectedSlotInfo
          slots={slots}
          selectedTime={selectedTime}
          destinationSuburb={propertySuburb}
        />
      )}
    </div>
  )
}

// Slot Button Component
function SlotButton({
  slot,
  isSelected,
  onClick
}: {
  slot: AvailableSlot
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'h-12 relative',
        slot.is_recommended && !isSelected && 'border-green-500 border-2',
        isSelected && 'bg-blue-600'
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{slot.label}</span>
        {slot.is_recommended && (
          <span className="text-[10px] text-green-600 absolute -top-2 -right-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[9px] px-1">
              Best
            </Badge>
          </span>
        )}
      </div>
    </Button>
  )
}

// Selected Slot Info Component
function SelectedSlotInfo({
  slots,
  selectedTime,
  destinationSuburb
}: {
  slots: AvailableSlot[]
  selectedTime: string
  destinationSuburb: string
}) {
  const selectedSlot = slots.find(s => s.time === selectedTime)

  if (!selectedSlot) return null

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">
              Selected: {selectedSlot.label}
            </p>

            {selectedSlot.travel_from ? (
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  <span>
                    Previous inspection: {selectedSlot.travel_from.previous_client}
                    ({selectedSlot.travel_from.previous_suburb})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    Travel to {destinationSuburb}: ~{selectedSlot.travel_from.travel_minutes} mins
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-blue-700">
                <MapPin className="h-4 w-4 inline mr-1" />
                First inspection of the day in {destinationSuburb}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartBookingSlots
