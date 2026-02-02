import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      // Get today's date in YYYY-MM-DD format (Melbourne timezone)
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Australia/Melbourne'
      });

      console.log('[Schedule] Fetching for date:', today);

      // Fetch inspections for today with lead details
      const { data, error: fetchError } = await supabase
        .from('inspections')
        .select(`
          id,
          inspection_date,
          inspection_start_time,
          inspector_name,
          inspector_id,
          selected_job_type,
          lead:leads (
            id,
            full_name,
            property_address_street,
            property_address_suburb,
            status
          )
        `)
        .eq('inspection_date', today)
        .order('inspection_start_time', { ascending: true });

      if (fetchError) {
        console.error('[Schedule] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[Schedule] Raw data:', data);

      // Transform the data
      const transformedSchedule: ScheduleItem[] = (data || []).map((inspection: any) => {
        const lead = inspection.lead;
        const techName = inspection.inspector_name || 'Unassigned';

        return {
          id: inspection.id,
          time: formatTime(inspection.inspection_start_time),
          clientName: lead?.full_name || 'Unknown Client',
          address: lead?.property_address_street || '',
          suburb: lead?.property_address_suburb || '',
          technicianName: techName,
          technicianInitial: techName.charAt(0).toUpperCase(),
          inspectionType: formatJobType(inspection.selected_job_type),
          leadStatus: lead?.status || 'unknown',
          leadId: lead?.id || '',
        };
      });

      console.log('[Schedule] Transformed:', transformedSchedule);
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

// Helper to format time from "09:00:00" to "9:00 AM"
function formatTime(time: string | null): string {
  if (!time) return 'TBD';

  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

// Helper to format job type
function formatJobType(jobType: string | null): string {
  if (!jobType) return 'Inspection';

  // Convert snake_case to Title Case
  return jobType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
