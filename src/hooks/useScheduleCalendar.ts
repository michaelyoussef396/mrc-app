import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarEvent {
  id: string;
  leadId: string;
  title: string;
  clientName: string;
  suburb: string;
  postcode: string;
  address: string;
  startDatetime: Date;
  endDatetime: Date;
  eventType: 'inspection' | 'job';
  status: string;
  technicianId: string;
  technicianName: string;
  technicianInitial: string;
  technicianColor: string;
}

interface UseScheduleCalendarParams {
  weekStart: Date;
  technicianFilter: string | null; // null = "All", or technician ID
}

interface UseScheduleCalendarResult {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get start of week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get end of week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get array of dates for the week
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Format date for display (e.g., "Mon 14")
 */
export function formatDayHeader(date: Date): { dayName: string; dayNumber: number } {
  return {
    dayName: date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
    dayNumber: date.getDate(),
  };
}

/**
 * Format week range for header (e.g., "Feb 3 - 9, 2025")
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  const startMonth = weekStart.toLocaleDateString('en-AU', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-AU', { month: 'short' });
  const year = weekEnd.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
}

// ============================================================================
// HOOK
// ============================================================================

export function useScheduleCalendar({
  weekStart,
  technicianFilter,
}: UseScheduleCalendarParams): UseScheduleCalendarResult {
  const weekEnd = getWeekEnd(weekStart);

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['schedule-calendar', formatDateKey(weekStart), technicianFilter],
    queryFn: async () => {
      console.log('[ScheduleCalendar] Fetching events for week:', formatDateKey(weekStart));

      // Build query for calendar_bookings with lead joins
      let query = supabase
        .from('calendar_bookings')
        .select(`
          id,
          lead_id,
          title,
          start_datetime,
          end_datetime,
          event_type,
          status,
          assigned_to,
          location_address,
          lead:leads (
            id,
            full_name,
            property_address_suburb,
            property_address_postcode
          )
        `)
        .gte('start_datetime', weekStart.toISOString())
        .lte('start_datetime', weekEnd.toISOString())
        .order('start_datetime', { ascending: true });

      // Apply technician filter if not "All"
      if (technicianFilter) {
        query = query.eq('assigned_to', technicianFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[ScheduleCalendar] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[ScheduleCalendar] Raw data:', data);

      // Fetch technician names
      const technicianIds = [...new Set((data || []).map(e => e.assigned_to).filter(Boolean))];
      let technicianMap: Record<string, string> = {};

      if (technicianIds.length > 0) {
        // Fetch from users via edge function or use cached mapping
        // For now, we'll try to get names from user_profiles or use a simple mapping
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', technicianIds);

        if (profiles) {
          profiles.forEach(p => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
            technicianMap[p.id] = fullName;
          });
        }
      }

      // Transform to CalendarEvent format
      const transformedEvents: CalendarEvent[] = (data || []).map((booking: any) => {
        const lead = booking.lead;
        const techName = technicianMap[booking.assigned_to] || 'Unassigned';
        const techColor = getTechnicianColorByName(techName);
        const techInitial = getTechnicianInitialByName(techName);

        return {
          id: booking.id,
          leadId: lead?.id || booking.lead_id || '',
          title: booking.title || `${booking.event_type} - ${lead?.full_name || 'Unknown'}`,
          clientName: lead?.full_name || 'Unknown',
          suburb: lead?.property_address_suburb || '',
          postcode: lead?.property_address_postcode || '',
          address: booking.location_address || '',
          startDatetime: new Date(booking.start_datetime),
          endDatetime: new Date(booking.end_datetime),
          eventType: booking.event_type === 'job' ? 'job' : 'inspection',
          status: booking.status || 'scheduled',
          technicianId: booking.assigned_to,
          technicianName: techName,
          technicianInitial: techInitial,
          technicianColor: techColor,
        };
      });

      console.log('[ScheduleCalendar] Transformed events:', transformedEvents.length);
      return transformedEvents;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });

  return {
    events,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTechnicianColorByName(name: string): string {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('clayton')) return '#007AFF';
  if (nameLower.includes('glen')) return '#34C759';
  return '#86868b';
}

function getTechnicianInitialByName(name: string): string {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('clayton')) return 'C';
  if (nameLower.includes('glen')) return 'G';
  return name?.[0]?.toUpperCase() || '?';
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter(event => isSameDay(event.startDatetime, date));
}

/**
 * Calculate event position and height based on time
 * Returns top percentage and height percentage for a 12-hour grid (7AM-7PM)
 */
export function calculateEventPosition(event: CalendarEvent): {
  top: number;
  height: number;
} {
  const startHour = event.startDatetime.getHours();
  const startMinutes = event.startDatetime.getMinutes();
  const endHour = event.endDatetime.getHours();
  const endMinutes = event.endDatetime.getMinutes();

  // Grid starts at 7AM (hour 7) and ends at 7PM (hour 19)
  // Total grid height represents 12 hours (7-19)
  const gridStartHour = 7;
  const gridEndHour = 19;
  const totalHours = gridEndHour - gridStartHour; // 12 hours

  // Calculate start position as percentage
  const startOffset = (startHour - gridStartHour) + (startMinutes / 60);
  const top = Math.max(0, (startOffset / totalHours) * 100);

  // Calculate duration in hours
  const durationHours = (endHour - startHour) + ((endMinutes - startMinutes) / 60);
  const height = Math.min((durationHours / totalHours) * 100, 100 - top);

  return { top, height };
}
