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
      // Use en-CA locale with Intl.DateTimeFormat — it outputs YYYY-MM-DD directly
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());


      // Fetch inspections for today with lead details.
      // NOTE: inspection_start_time + selected_job_type columns dropped in
      // Phase 5 dead-column drop migration. Schedule shows 'TBD' for time
      // and a generic 'Inspection' label until a replacement schedule
      // model is built.
      const { data, error: fetchError } = await supabase
        .from('inspections')
        .select(`
          id,
          inspection_date,
          inspector_name,
          inspector_id,
          lead:leads (
            id,
            full_name,
            property_address_street,
            property_address_suburb,
            status
          )
        `)
        .eq('inspection_date', today)
        .order('inspection_date', { ascending: true });

      if (fetchError) {
        console.error('[Schedule] Fetch error:', fetchError);
        throw fetchError;
      }


      // Transform the data
      const transformedSchedule: ScheduleItem[] = (data || []).map((inspection: any) => {
        const lead = inspection.lead;
        const techName = inspection.inspector_name || 'Unassigned';

        return {
          id: inspection.id,
          time: 'TBD',
          clientName: lead?.full_name || 'Unknown Client',
          address: lead?.property_address_street || '',
          suburb: lead?.property_address_suburb || '',
          technicianName: techName,
          technicianInitial: techName.charAt(0).toUpperCase(),
          inspectionType: 'Inspection',
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

