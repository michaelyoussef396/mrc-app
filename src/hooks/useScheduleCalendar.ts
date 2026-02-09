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

      // Fetch technician names from edge function
      const technicianIds = [...new Set((data || []).map(e => e.assigned_to).filter(Boolean))];
      let technicianMap: Record<string, string> = {};

      if (technicianIds.length > 0) {
        try {
          // Get session for authentication
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Fetch users from manage-users edge function
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Content-Type': 'application/json',
                },
              }
            );
            const result = await response.json();
            if (result.success && result.users) {
              result.users.forEach((u: any) => {
                if (technicianIds.includes(u.id)) {
                  technicianMap[u.id] = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
                }
              });
            }
          }
        } catch (err) {
          console.warn('[ScheduleCalendar] Failed to fetch technician names:', err);
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
 * Returns top percentage and height percentage for the calendar grid
 *
 * IMPORTANT: The grid has 13 TIME_SLOTS (7AM-7PM inclusive), each 64px (h-16)
 * Total grid height = 13 * 64 = 832px
 *
 * Position calculation:
 * - 7AM = row 0 = 0% of grid
 * - 8AM = row 1 = (1/13) * 100 = 7.69%
 * - 10AM = row 3 = (3/13) * 100 = 23.08%
 */
export function calculateEventPosition(event: CalendarEvent): {
  top: number;
  height: number;
} {
  const startHour = event.startDatetime.getHours();
  const startMinutes = event.startDatetime.getMinutes();
  const endHour = event.endDatetime.getHours();
  const endMinutes = event.endDatetime.getMinutes();

  // Grid starts at 7AM (hour 7)
  // The grid has 13 TIME_SLOTS (rows), so we use 13 as the denominator
  const gridStartHour = 7;
  const totalSlots = 13; // Number of time slots in the grid (7AM to 7PM inclusive)

  // Calculate start position as percentage of total grid
  // Each slot = 1/13 of the grid (7.69%)
  const startOffset = (startHour - gridStartHour) + (startMinutes / 60);
  const top = Math.max(0, (startOffset / totalSlots) * 100);

  // Calculate duration in hours (guard against negative/zero for malformed events)
  let durationHours = (endHour - startHour) + ((endMinutes - startMinutes) / 60);
  if (durationHours <= 0) durationHours = 1;
  let height = Math.max((durationHours / totalSlots) * 100, 7.69); // Minimum 1 slot height
  if (top + height > 100) height = 100 - top;

  // Debug logging
  console.log('[Calendar] Event position:', {
    title: event.title || event.clientName,
    startTime: `${startHour}:${startMinutes.toString().padStart(2, '0')}`,
    startOffset: startOffset.toFixed(2),
    top: top.toFixed(2) + '%',
    height: height.toFixed(2) + '%',
  });

  return { top, height };
}
