import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { STATUS_FLOW, LeadStatus } from '@/lib/statusFlow'
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, MapPin, Phone, User, Clock, ArrowLeft, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LeadsToBook } from '@/components/booking'

// Calendar event (only inspections for Stage 1)
interface CalendarEvent {
  id: string
  date: string
  time: string
  status: string
  leadId: string
  leadNumber: string
  client: string
  address: string
  suburb: string
  phone: string
}

// Parse a date string as LOCAL date (not UTC) to avoid timezone issues
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date()
  // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Format date to YYYY-MM-DD in LOCAL timezone for comparison
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Australian date formatting
const formatAustralianDate = (date: Date): string => {
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Format time from "HH:MM:SS" or "HH:MM" to readable format
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return '9:00 AM'
  const [hours] = timeStr.split(':').map(Number)
  if (hours === 12) return '12:00 PM'
  if (hours > 12) return `${hours - 12}:00 PM`
  if (hours === 0) return '12:00 AM'
  return `${hours}:00 AM`
}

const Calendar = () => {
  const navigate = useNavigate()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'month' | 'upcoming'>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Fetch leads with scheduled inspections
  const { data: leadsWithInspections, isLoading: leadsLoading } = useQuery({
    queryKey: ['calendar-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          full_name,
          phone,
          property_address_street,
          property_address_suburb,
          property_address_state,
          property_address_postcode,
          status,
          inspection_scheduled_date,
          scheduled_time
        `)
        .not('inspection_scheduled_date', 'is', null)
        .order('inspection_scheduled_date', { ascending: true })

      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })

  // Fetch inspections (for actual inspection dates)
  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ['calendar-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          lead_id,
          inspection_date,
          inspection_start_time
        `)
        .not('inspection_date', 'is', null)
        .order('inspection_date', { ascending: true })

      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })

  const isLoading = leadsLoading || inspectionsLoading

  // Convert to calendar events - ONE event per lead, using correct date
  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = []
    const processedLeadIds = new Set<string>()

    // Create a map of lead_id -> inspection data for quick lookup
    const inspectionMap = new Map<string, { date: string; time: string | null }>()
    inspections?.forEach(insp => {
      if (insp.inspection_date) {
        inspectionMap.set(insp.lead_id, {
          date: insp.inspection_date,
          time: insp.inspection_start_time
        })
      }
    })

    // Process each lead - only add ONE event per lead
    leadsWithInspections?.forEach(lead => {
      if (processedLeadIds.has(lead.id)) return
      processedLeadIds.add(lead.id)

      // Use inspection table date if available (actual date), otherwise use scheduled date
      const inspectionData = inspectionMap.get(lead.id)
      const eventDate = inspectionData?.date || lead.inspection_scheduled_date
      const eventTime = inspectionData?.time || lead.scheduled_time

      if (!eventDate) return

      calendarEvents.push({
        id: lead.id,
        date: eventDate,
        time: formatTime(eventTime),
        status: lead.status,
        leadId: lead.id,
        leadNumber: lead.lead_number || '',
        client: lead.full_name || 'Unknown',
        address: `${lead.property_address_street || ''}, ${lead.property_address_suburb || ''} ${lead.property_address_state || ''} ${lead.property_address_postcode || ''}`,
        suburb: lead.property_address_suburb || 'Unknown',
        phone: lead.phone || '',
      })
    })

    return calendarEvents
  }, [leadsWithInspections, inspections])

  // Get upcoming events (today and future only) - sorted by date
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return events
      .filter(event => parseLocalDate(event.date) >= today)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
  }, [events])

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = formatDateKey(date)
    return events.filter(event => event.date === dateKey)
  }

  // Calendar navigation
  const navigatePeriod = (direction: number) => {
    const newDate = new Date(currentDate)
    if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7))
    } else if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    return { daysInMonth, startingDayOfWeek }
  }

  const getWeekDates = (date: Date): Date[] => {
    const week: Date[] = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString()
  }

  // Get status badge color
  const getStatusBadgeClass = (status: string): string => {
    const colorMap: Record<string, string> = {
      'new_lead': 'bg-blue-100 text-blue-700',
      'inspection_waiting': 'bg-amber-100 text-amber-700',
      'approve_inspection_report': 'bg-purple-100 text-purple-700',
      'inspection_email_approval': 'bg-sky-100 text-sky-700',
      'closed': 'bg-green-100 text-green-700',
      'not_landed': 'bg-red-100 text-red-700',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string): string => {
    const statusConfig = STATUS_FLOW[status as LeadStatus]
    return statusConfig?.shortTitle || status
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  // Generate calendar days
  const calendarDays: { date: Date | null; events: CalendarEvent[] }[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ date: null, events: [] })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayEvents = getEventsForDate(date)
    calendarDays.push({ date, events: dayEvents })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-500">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-page">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-white/10 shadow-md">
        <div className="max-w-full px-4 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <div className="flex items-center gap-2 text-white">
            <CalendarIcon className="h-5 w-5" />
            <span className="font-semibold">Calendar</span>
          </div>

          <Button
            className="bg-white/20 hover:bg-white/30 text-white"
            onClick={() => navigate('/leads')}
          >
            <Plus className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">

          {/* Calendar Header */}
          <Card className="p-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                {view !== 'upcoming' && (
                  <>
                    <h1 className="text-xl font-bold text-gray-900">
                      {view === 'week' && `Week of ${currentDate.toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                      {view === 'month' && monthName}
                    </h1>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                  </>
                )}
                {view === 'upcoming' && (
                  <h1 className="text-xl font-bold text-gray-900">
                    Upcoming Inspections
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-2">
                {view !== 'upcoming' && (
                  <>
                    <Button variant="outline" size="icon" onClick={() => navigatePeriod(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigatePeriod(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* View Toggle: Month | Week | Upcoming */}
                <div className="flex rounded-lg border overflow-hidden ml-2">
                  <Button
                    variant={view === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setView('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={view === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-x"
                    onClick={() => setView('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === 'upcoming' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setView('upcoming')}
                  >
                    <List className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Upcoming</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Calendar Grid Views (Month & Week) */}
          {view !== 'upcoming' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Calendar Grid */}
              <Card className="lg:col-span-2 p-4">
                {/* Month View */}
                {view === 'month' && (
                  <>
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => {
                        if (!day.date) {
                          return <div key={index} className="aspect-square" />
                        }

                        const isCurrentDay = isToday(day.date)
                        const isSelected = isSameDate(day.date, selectedDate)
                        const hasEvents = day.events.length > 0

                        return (
                          <div
                            key={index}
                            className={`
                              aspect-square p-1 rounded-lg cursor-pointer transition-colors
                              ${isCurrentDay ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                              ${isSelected && !isCurrentDay ? 'bg-gray-100' : ''}
                              ${!isCurrentDay && !isSelected ? 'hover:bg-gray-50' : ''}
                            `}
                            onClick={() => setSelectedDate(day.date!)}
                          >
                            <div className={`
                              text-sm font-medium text-center
                              ${isCurrentDay ? 'text-blue-700' : 'text-gray-900'}
                            `}>
                              {day.date.getDate()}
                            </div>

                            {hasEvents && (
                              <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                                {day.events.slice(0, 3).map(event => (
                                  <div
                                    key={event.id}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  />
                                ))}
                                {day.events.length > 3 && (
                                  <span className="text-[10px] text-gray-500">+{day.events.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Week View */}
                {view === 'week' && (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 gap-2 min-w-[600px]">
                      {getWeekDates(currentDate).map((date, index) => {
                        const dayEvents = getEventsForDate(date)
                        const isCurrentDay = isToday(date)

                        return (
                          <div key={index} className="min-h-[200px]">
                            <div className={`
                              text-center py-2 rounded-t-lg
                              ${isCurrentDay ? 'bg-blue-500 text-white' : 'bg-gray-100'}
                            `}>
                              <div className="text-xs font-medium">
                                {date.toLocaleDateString('en-AU', { weekday: 'short' })}
                              </div>
                              <div className="text-lg font-bold">{date.getDate()}</div>
                            </div>

                            <div className="space-y-1 p-1">
                              {dayEvents.map(event => (
                                <div
                                  key={event.id}
                                  className="p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity bg-blue-50 border-l-3 border-blue-500"
                                  style={{ borderLeftWidth: '3px', borderLeftColor: '#3b82f6' }}
                                  onClick={() => setSelectedEvent(event)}
                                >
                                  <div className="font-medium truncate">{event.time}</div>
                                  <div className="truncate text-gray-600">{event.client}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* Sidebar - Selected Date Events */}
              <Card className="p-4">
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString('en-AU', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {getEventsForDate(selectedDate).length} inspection{getEventsForDate(selectedDate).length !== 1 ? 's' : ''}
                  </p>
                </div>

                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No inspections scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderLeftWidth: '4px', borderLeftColor: '#3b82f6' }}
                        onClick={() => navigate(`/leads/${event.leadId}`)}
                      >
                        <Badge className={getStatusBadgeClass(event.status)}>
                          {getStatusLabel(event.status)}
                        </Badge>

                        <h3 className="font-medium text-sm mt-2">{event.client}</h3>

                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.suburb}</span>
                          </div>
                          {event.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{event.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`,
                                '_blank'
                              )
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Directions
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `tel:${event.phone}`
                            }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Leads Awaiting Inspection */}
                <div className="mt-4">
                  <LeadsToBook
                    selectedDate={selectedDate}
                    existingAppointments={getEventsForDate(selectedDate).map(event => ({
                      suburb: event.suburb,
                      address: event.address,
                      time: event.time
                    }))}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Upcoming View - Simple List */}
          {view === 'upcoming' && (
            <Card className="p-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No upcoming inspections</p>
                  <p className="text-sm mt-1">Schedule an inspection to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => {
                    const eventDate = parseLocalDate(event.date)
                    const isTodayEvent = isToday(eventDate)
                    const formattedDate = eventDate.toLocaleDateString('en-AU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })

                    return (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderLeftWidth: '4px', borderLeftColor: '#3b82f6' }}
                        onClick={() => navigate(`/leads/${event.leadId}`)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base truncate">{event.client}</h3>
                              {isTodayEvent && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  Today
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-600">{formattedDate}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{event.time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{event.suburb}</span>
                              </div>
                            </div>

                            <div className="mt-2">
                              <Badge className={getStatusBadgeClass(event.status)}>
                                {getStatusLabel(event.status)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 w-10 sm:w-auto sm:px-3"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`,
                                  '_blank'
                                )
                              }}
                            >
                              <MapPin className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">Directions</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 w-10 sm:w-auto sm:px-3"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = `tel:${event.phone}`
                              }}
                            >
                              <Phone className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">Call</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-blue-100 text-blue-700">Inspection</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                X
              </Button>
            </div>

            <h2 className="text-xl font-bold mb-2">{selectedEvent.client}</h2>
            <Badge className={getStatusBadgeClass(selectedEvent.status)}>
              {getStatusLabel(selectedEvent.status)}
            </Badge>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>{parseLocalDate(selectedEvent.date).toLocaleDateString('en-AU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{selectedEvent.time}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span>{selectedEvent.client}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>{selectedEvent.address}</span>
              </div>
              {selectedEvent.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{selectedEvent.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedEvent.address)}`,
                  '_blank'
                )}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Directions
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = `tel:${selectedEvent.phone}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button
                className="col-span-2"
                onClick={() => navigate(`/leads/${selectedEvent.leadId}`)}
              >
                View Lead Details
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Calendar
