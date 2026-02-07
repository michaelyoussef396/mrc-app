import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TabFilter = 'today' | 'this_week' | 'this_month' | 'upcoming' | 'completed';

export interface TechnicianJob {
  id: string;
  bookingId: string;
  leadId: string;
  title: string;
  eventType: string;
  status: JobStatus;
  // Date/Time
  startDatetime: string;
  endDatetime: string;
  date: string; // YYYY-MM-DD
  time: string; // Formatted time e.g. "9:00 AM"
  // Client info
  clientName: string;
  phone: string;
  email: string;
  // Location
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  fullAddress: string;
  // Job details
  issueDescription: string | null;
  accessInstructions: string | null;
  travelTimeMinutes: number | null;
}

interface UseTechnicianJobsResult {
  jobs: TechnicianJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  counts: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    upcoming: number;
    completed: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format (Melbourne timezone)
 */
function getTodayDate(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Australia/Melbourne',
  });
}

/**
 * Get date N days from today in YYYY-MM-DD format
 */
function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Australia/Melbourne',
  });
}

/**
 * Format time from ISO datetime to "9:00 AM" format
 */
function formatTime(datetime: string): string {
  try {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Melbourne',
    });
  } catch {
    return 'TBD';
  }
}

/**
 * Extract date (YYYY-MM-DD) from ISO datetime
 */
function extractDate(datetime: string): string {
  try {
    const date = new Date(datetime);
    return date.toLocaleDateString('en-CA', {
      timeZone: 'Australia/Melbourne',
    });
  } catch {
    return '';
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useTechnicianJobs(activeTab: TabFilter): UseTechnicianJobsResult {
  const { user } = useAuth();
  const [allJobs, setAllJobs] = useState<TechnicianJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const today = getTodayDate();
      const weekAgo = getDateOffset(-7);

      console.log('[TechnicianJobs] Fetching for user:', user.id);
      console.log('[TechnicianJobs] Today:', today);

      // Fetch all bookings for this technician (upcoming + recently completed)
      const { data, error: fetchError } = await supabase
        .from('calendar_bookings')
        .select(`
          id,
          title,
          event_type,
          status,
          start_datetime,
          end_datetime,
          location_address,
          travel_time_minutes,
          lead_id,
          lead:leads (
            id,
            full_name,
            phone,
            email,
            property_address_street,
            property_address_suburb,
            property_address_state,
            property_address_postcode,
            issue_description,
            access_instructions
          )
        `)
        .eq('assigned_to', user.id)
        .or(`start_datetime.gte.${weekAgo}T00:00:00,status.eq.completed`)
        .order('start_datetime', { ascending: true });

      if (fetchError) {
        console.error('[TechnicianJobs] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[TechnicianJobs] Raw data:', data?.length, 'bookings');

      // Transform the data
      const transformedJobs: TechnicianJob[] = (data || []).map((booking: any) => {
        const lead = booking.lead;
        const address = lead?.property_address_street || booking.location_address || '';
        const suburb = lead?.property_address_suburb || '';
        const state = lead?.property_address_state || 'VIC';
        const postcode = lead?.property_address_postcode || '';

        return {
          id: booking.id,
          bookingId: booking.id,
          leadId: lead?.id || booking.lead_id || '',
          title: booking.title || 'Inspection',
          eventType: booking.event_type || 'inspection',
          status: (booking.status as JobStatus) || 'scheduled',
          startDatetime: booking.start_datetime,
          endDatetime: booking.end_datetime,
          date: extractDate(booking.start_datetime),
          time: formatTime(booking.start_datetime),
          clientName: lead?.full_name || 'Unknown Client',
          phone: lead?.phone || '',
          email: lead?.email || '',
          address,
          suburb,
          state,
          postcode,
          fullAddress: [address, suburb, state, postcode].filter(Boolean).join(', '),
          issueDescription: lead?.issue_description || null,
          accessInstructions: lead?.access_instructions || null,
          travelTimeMinutes: booking.travel_time_minutes,
        };
      });

      console.log('[TechnicianJobs] Transformed:', transformedJobs.length, 'jobs');
      setAllJobs(transformedJobs);
    } catch (err) {
      console.error('[TechnicianJobs] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Filter jobs based on active tab
  const today = getTodayDate();
  const weekEnd = getDateOffset(7);
  const monthEnd = getDateOffset(30);

  const filteredJobs = allJobs.filter((job) => {
    switch (activeTab) {
      case 'today':
        return job.date === today && job.status !== 'completed';
      case 'this_week':
        return job.date >= today && job.date <= weekEnd && job.status !== 'completed';
      case 'this_month':
        return job.date >= today && job.date <= monthEnd && job.status !== 'completed';
      case 'upcoming':
        return job.date >= today && job.status !== 'completed';
      case 'completed':
        return job.status === 'completed';
      default:
        return true;
    }
  });

  // Calculate counts for each tab
  const counts = {
    today: allJobs.filter((j) => j.date === today && j.status !== 'completed').length,
    thisWeek: allJobs.filter((j) => j.date >= today && j.date <= weekEnd && j.status !== 'completed').length,
    thisMonth: allJobs.filter((j) => j.date >= today && j.date <= monthEnd && j.status !== 'completed').length,
    upcoming: allJobs.filter((j) => j.date >= today && j.status !== 'completed').length,
    completed: allJobs.filter((j) => j.status === 'completed').length,
  };

  return {
    jobs: filteredJobs,
    isLoading,
    error,
    refetch: fetchJobs,
    counts,
  };
}
