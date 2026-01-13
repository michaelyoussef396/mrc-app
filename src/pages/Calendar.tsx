import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { STATUS_FLOW, LeadStatus } from '@/lib/statusFlow'
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, MapPin, Phone, User, Clock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Event types for Stage 1
type EventType = 'inspection' | 'job' | 'follow-up' | 'other'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: EventType
  status: string
  leadId: string
  leadNumber: string
  client: string
  address: string
  suburb: string
  phone: string
  color: string
}

// Event type colors
const EVENT_COLORS: Record<EventType, string> = {
  'inspection': '#3b82f6', // Blue
  'job': '#f97316',        // Orange
  'follow-up': '#8b5cf6',  // Purple
  'other': '#10b981',      // Green
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

const Calendar = () => {
  const navigate = useNavigate()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Fetch leads with scheduled inspections from Supabase
  const { data: leadsWithInspections, isLoading, error } = useQuery({
    queryKey: ['calendar-events'],
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
          scheduled_time,
          job_scheduled_date,
          scheduled_dates
        `)
        .or('inspection_scheduled_date.not.is.null,job_scheduled_date.not.is.null')
        .order('inspection_scheduled_date', { ascending: true })

      if (error) throw error
      return data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  // Also fetch from inspections table for completed/in-progress inspections
  const { data: inspections } = useQuery({
    queryKey: ['calendar-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          lead_id,
          inspection_date,
          inspection_start_time,
          leads (
            id,
            lead_number,
            full_name,
            phone,
            property_address_street,
            property_address_suburb,
            property_address_state,
            property_address_postcode,
            status
          )
        `)
        .order('inspection_date', { ascending: true })

      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })

  // Convert leads to calendar events
  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = []

    // Add events from leads with inspection_scheduled_date
    leadsWithInspections?.forEach(lead => {
      if (lead.inspection_scheduled_date) {
        // Determine event type based on status
        let eventType: EventType = 'inspection'
        if (lead.status === 'closed' || lead.status === 'not_landed') {
          eventType = 'other'
        }

        calendarEvents.push({
          id: `lead-inspection-${lead.id}`,
          title: `Inspection - ${lead.full_name}`,
          date: lead.inspection_scheduled_date,
          time: lead.scheduled_time || '9:00 AM',
          type: eventType,
          status: lead.status,
          leadId: lead.id,
          leadNumber: lead.lead_number || '',
          client: lead.full_name,
          address: `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`,
          suburb: lead.property_address_suburb,
          phone: lead.phone,
          color: EVENT_COLORS[eventType],
        })
      }

      // Add job events if job_scheduled_date exists
      if (lead.job_scheduled_date) {
        calendarEvents.push({
          id: `lead-job-${lead.id}`,
          title: `Job - ${lead.full_name}`,
          date: lead.job_scheduled_date,
          time: lead.scheduled_time || '7:00 AM',
          type: 'job',
          status: lead.status,
          leadId: lead.id,
          leadNumber: lead.lead_number || '',
          client: lead.full_name,
          address: `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`,
          suburb: lead.property_address_suburb,
          phone: lead.phone,
          color: EVENT_COLORS['job'],
        })
      }

      // Add multi-day job events from scheduled_dates array
      if (lead.scheduled_dates && lead.scheduled_dates.length > 0) {
        lead.scheduled_dates.forEach((dateStr, index) => {
          calendarEvents.push({
            id: `lead-job-day-${lead.id}-${index}`,
            title: `Job Day ${index + 1} - ${lead.full_name}`,
            date: dateStr,
            time: lead.scheduled_time || '7:00 AM',
            type: 'job',
            status: lead.status,
            leadId: lead.id,
            leadNumber: lead.lead_number || '',
            client: lead.full_name,
            address: `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`,
            suburb: lead.property_address_suburb,
            phone: lead.phone,
            color: EVENT_COLORS['job'],
          })
        })
      }
    })

    // Add events from inspections table (for completed inspections with actual dates)
    inspections?.forEach(inspection => {
      const lead = inspection.leads as any
      if (!lead || !inspection.inspection_date) return

      // Check if we already have this event from the leads query
      const existingEvent = calendarEvents.find(e =>
        e.leadId === lead.id && e.date === inspection.inspection_date
      )
      if (existingEvent) return

      calendarEvents.push({
        id: `inspection-${inspection.id}`,
        title: `Inspection - ${lead.full_name}`,
        date: inspection.inspection_date,
        time: inspection.inspection_start_time || '9:00 AM',
        type: 'inspection',
        status: lead.status,
        leadId: lead.id,
        leadNumber: lead.lead_number || '',
        client: lead.full_name,
        address: `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`,
        suburb: lead.property_address_suburb,
        phone: lead.phone,
        color: EVENT_COLORS['inspection'],
      })
    })

    return calendarEvents
  }, [leadsWithInspections, inspections])

  // Get upcoming events (today and future only)
  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return events
      .filter(event => parseLocalDate(event.date) >= today)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
      .slice(0, 5) // Show next 5 upcoming events
  }, [events])

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = formatDateKey(date)
    return events.filter(event => event.date === dateKey)
  }

  // Calendar navigation
  const navigatePeriod = (direction: number) => {
    const newDate = new Date(currentDate)
    if (view === 'day') {
      newDate.setDate(currentDate.getDate() + direction)
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7))
    } else {
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
    const statusConfig = STATUS_FLOW[status as LeadStatus]
    if (!statusConfig) return 'bg-gray-100 text-gray-700'

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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load calendar</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Refresh
          </Button>
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
            <span className="hidden sm:inline">New Event</span>
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">

          {/* Calendar Header */}
          <Card className="p-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {view === 'day' && formatAustralianDate(currentDate)}
                  {view === 'week' && `Week of ${currentDate.toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                  {view === 'month' && monthName}
                </h1>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigatePeriod(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigatePeriod(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex rounded-lg border overflow-hidden ml-2">
                  <Button
                    variant={view === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setView('day')}
                  >
                    Day
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
                    variant={view === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setView('month')}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </div>
          </Card>

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
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: event.color }}
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
                                className="p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
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

              {/* Day View */}
              {view === 'day' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">{formatAustralianDate(currentDate)}</h2>

                  {getEventsForDate(currentDate).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No events scheduled</p>
                      <p className="text-sm mt-1">Click "New Event" to add one</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getEventsForDate(currentDate).map(event => (
                        <div
                          key={event.id}
                          className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                          style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getStatusBadgeClass(event.status)}>
                              {getStatusLabel(event.status)}
                            </Badge>
                            <span className="text-sm font-medium text-gray-500">{event.time}</span>
                          </div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-gray-600">{event.client}</p>
                          <p className="text-sm text-gray-500">{event.suburb}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
                  {getEventsForDate(selectedDate).length} event{getEventsForDate(selectedDate).length !== 1 ? 's' : ''}
                </p>
              </div>

              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                      onClick={() => navigate(`/leads/${event.leadId}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.type}
                        </Badge>
                        <Badge className={getStatusBadgeClass(event.status)}>
                          {getStatusLabel(event.status)}
                        </Badge>
                      </div>

                      <h3 className="font-medium text-sm">{event.client}</h3>

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

              {/* Upcoming Inspections */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    Coming Up
                  </h3>
                  {upcomingEvents.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      {upcomingEvents.length}
                    </Badge>
                  )}
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-xs">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(event => {
                      const eventDate = parseLocalDate(event.date)
                      const isToday = eventDate.toDateString() === new Date().toDateString()
                      const formattedDate = eventDate.toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })

                      return (
                        <div
                          key={event.id}
                          className="p-2 rounded-lg border cursor-pointer hover:bg-blue-50 transition-colors"
                          style={{ borderLeftWidth: '3px', borderLeftColor: event.color }}
                          onClick={() => navigate(`/leads/${event.leadId}`)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {event.client}
                            </span>
                            {isToday && (
                              <Badge className="bg-green-100 text-green-700 text-[10px] px-1">
                                Today
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="font-medium text-blue-600">{formattedDate}</span>
                            <span>•</span>
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.suburb}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Event Types</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['inspection', 'job', 'follow-up', 'other'] as EventType[]).map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: EVENT_COLORS[type] }}
                      />
                      <span className="text-xs text-gray-600 capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
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
              <Badge variant="outline" className="capitalize">{selectedEvent.type}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                X
              </Button>
            </div>

            <h2 className="text-xl font-bold mb-2">{selectedEvent.title}</h2>
            <Badge className={getStatusBadgeClass(selectedEvent.status)}>
              {getStatusLabel(selectedEvent.status)}
            </Badge>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{selectedEvent.date} at {selectedEvent.time}</span>
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
