import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEvent } from '@/hooks/useScheduleCalendar';

// ============================================================================
// HOOK
// ============================================================================

interface UseCancelledBookingsResult {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
}

export function useCancelledBookings(): UseCancelledBookingsResult {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['cancelled-bookings'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
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
        .eq('status', 'cancelled')
        .order('start_datetime', { ascending: false });

      if (fetchError) {
        console.error('[CancelledBookings] Fetch error:', fetchError);
        throw fetchError;
      }

      // Fetch technician names
      const technicianIds = [...new Set((data || []).map(e => e.assigned_to).filter(Boolean))];
      let technicianMap: Record<string, string> = {};

      if (technicianIds.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
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
              result.users.forEach((u: Record<string, string>) => {
                if (technicianIds.includes(u.id)) {
                  technicianMap[u.id] = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
                }
              });
            }
          }
        } catch (err) {
          console.warn('[CancelledBookings] Failed to fetch technician names:', err);
        }
      }

      // Transform to CalendarEvent format
      const transformed: CalendarEvent[] = (data || []).map((booking: Record<string, any>) => {
        const lead = booking.lead;
        const techName = technicianMap[booking.assigned_to] || 'Unassigned';

        const clientName = lead?.full_name
          || extractNameFromTitle(booking.title)
          || 'Unknown';

        const suburb = lead?.property_address_suburb
          || extractSuburbFromAddress(booking.location_address)
          || '';

        return {
          id: booking.id,
          leadId: lead?.id || booking.lead_id || '',
          title: booking.title || `${booking.event_type} - ${clientName}`,
          clientName,
          suburb,
          postcode: lead?.property_address_postcode || '',
          address: booking.location_address || '',
          startDatetime: new Date(booking.start_datetime),
          endDatetime: new Date(booking.end_datetime),
          eventType: booking.event_type === 'job' ? 'job' as const : 'inspection' as const,
          status: booking.status || 'cancelled',
          technicianId: booking.assigned_to,
          technicianName: techName,
          technicianInitial: techName[0]?.toUpperCase() || '?',
          technicianColor: getTechnicianColor(techName),
        };
      });

      return transformed;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return {
    events,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

// ============================================================================
// HELPERS (duplicated from useScheduleCalendar to keep hook self-contained)
// ============================================================================

function getTechnicianColor(name: string): string {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('clayton')) return '#007AFF';
  if (nameLower.includes('glen')) return '#34C759';
  return '#86868b';
}

function extractNameFromTitle(title: string | null): string | null {
  if (!title) return null;
  const dashIdx = title.indexOf(' - ');
  if (dashIdx === -1) return null;
  const name = title.substring(dashIdx + 3).trim();
  return name || null;
}

function extractSuburbFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(',');
  if (parts.length < 2) return null;
  const afterComma = parts[1].trim();
  const match = afterComma.match(/^(.+?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}$/i);
  return match ? match[1].trim() : afterComma;
}
