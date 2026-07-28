import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAU } from '@/lib/dateUtils';

interface ScheduleItem {
  id: string;
  time: string;
  clientName: string;
  address: string;
  suburb: string;
  technicianName: string;
  technicianInitial: string;
  inspectionType: string;
  leadStatus: string;
  leadId: string;
}

interface TodaysScheduleResult {
  schedule: ScheduleItem[];
  isLoading: boolean;
  error: string | null;
}

export function useTodaysSchedule(): TodaysScheduleResult {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysSchedule();
  }, []);

  const fetchTodaysSchedule = async () => {
    try {
      // Today's Melbourne day window
      const now = new Date();
      const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
      const startOfToday = new Date(melbourneNow);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      // Bookings whose span overlaps today (Melbourne). Overlap predicate
      // (start < end-of-day AND end > start-of-day) so a multi-day booking
      // appears on EVERY day of its span, not just its start date.
      const { data, error: fetchError } = await supabase
        .from('calendar_bookings')
        .select(`
          id,
          start_datetime,
          end_datetime,
          event_type,
          all_day,
          status,
          assigned_to,
          lead:leads (
            id,
            full_name,
            property_address_street,
            property_address_suburb,
            status
          )
        `)
        .lt('start_datetime', endOfToday.toISOString())
        .gt('end_datetime', startOfToday.toISOString())
        .neq('status', 'cancelled')
        .order('start_datetime', { ascending: true });

      if (fetchError) {
        console.error('[Schedule] Fetch error:', fetchError);
        throw fetchError;
      }

      // Resolve technician names for the assigned user ids
      const techIds = [...new Set((data || []).map((b: any) => b.assigned_to).filter(Boolean))] as string[];
      const nameMap = new Map<string, string>();
      if (techIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', techIds);
        if (profilesError) {
          console.warn('[Schedule] Profile fetch error (names fall back to Unassigned):', profilesError);
        }
        (profiles || []).forEach((p) => nameMap.set(p.id, p.full_name || ''));
      }

      // Transform the data
      const transformedSchedule: ScheduleItem[] = (data || []).map((booking: any) => {
        const lead = booking.lead;
        const techName = (booking.assigned_to && nameMap.get(booking.assigned_to)) || 'Unassigned';

        return {
          id: booking.id,
          time: booking.all_day ? 'All day' : formatTimeAU(booking.start_datetime),
          clientName: lead?.full_name || 'Unknown Client',
          address: lead?.property_address_street || '',
          suburb: lead?.property_address_suburb || '',
          technicianName: techName,
          technicianInitial: techName.charAt(0).toUpperCase(),
          inspectionType: booking.event_type === 'job' ? 'Job' : 'Inspection',
          leadStatus: lead?.status || 'unknown',
          leadId: lead?.id || '',
        };
      });

      setSchedule(transformedSchedule);

    } catch (err) {
      console.error('[Schedule] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  };

  return { schedule, isLoading, error };
}
