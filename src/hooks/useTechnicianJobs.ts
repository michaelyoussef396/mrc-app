import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TabFilter = 'today' | 'this_week' | 'this_month' | 'upcoming' | 'completed';

export interface TechnicianJob {
  id: string;
  bookingId: string;
  leadId: string;
  inspectionId?: string;
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
  const isInitialLoad = useRef(true);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    // Only show loading spinner on initial load, not on realtime refreshes
    if (isInitialLoad.current) {
      setIsLoading(true);
    }
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
          inspection_id,
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
          inspectionId: booking.inspection_id || undefined,
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
      isInitialLoad.current = false;
    } catch (err) {
      console.error('[TechnicianJobs] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Realtime subscription for calendar_bookings changes
  useEffect(() => {
    if (!user?.id) return;

    console.log('[TechnicianJobs] Setting up realtime subscription');

    const channel = supabase
      .channel(`technician-jobs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_bookings',
          filter: `assigned_to=eq.${user.id}`,
        },
        (payload) => {
          console.log('[TechnicianJobs] Realtime event:', payload.eventType, payload);

          // Show toast notifications for relevant events
          const newRecord = payload.new as Record<string, any> | undefined;
          const oldRecord = payload.old as Record<string, any> | undefined;

          if (payload.eventType === 'INSERT' && newRecord) {
            toast.success('New job assigned', {
              description: newRecord.title || 'A new job has been added to your schedule',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            toast.info('Job updated', {
              description: newRecord.title || 'A job in your schedule has been updated',
              duration: 4000,
            });
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            toast.info('Job removed', {
              description: 'A job has been removed from your schedule',
              duration: 4000,
            });
          }

          // Refresh the jobs list
          fetchJobs();
        }
      )
      .subscribe((status) => {
        console.log('[TechnicianJobs] Realtime subscription status:', status);
      });

    return () => {
      console.log('[TechnicianJobs] Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchJobs]);

  // Filter jobs based on active tab
  const today = getTodayDate();
  const weekEnd = getDateOffset(7);
  const monthEnd = getDateOffset(30);

  // Overdue = scheduled in the past but not completed/cancelled
  const isOverdue = (job: TechnicianJob) =>
    job.date < today && job.status !== 'completed' && job.status !== 'cancelled';

  const filteredJobs = allJobs.filter((job) => {
    switch (activeTab) {
      case 'today':
        return (job.date === today && job.status !== 'completed') || isOverdue(job);
      case 'this_week':
        return (job.date >= today && job.date <= weekEnd && job.status !== 'completed') || isOverdue(job);
      case 'this_month':
        return (job.date >= today && job.date <= monthEnd && job.status !== 'completed') || isOverdue(job);
      case 'upcoming':
        return (job.date >= today && job.status !== 'completed') || isOverdue(job);
      case 'completed':
        return job.status === 'completed';
      default:
        return true;
    }
  });

  // Calculate counts for each tab
  const overdueCount = allJobs.filter(isOverdue).length;
  const counts = {
    today: allJobs.filter((j) => j.date === today && j.status !== 'completed').length + overdueCount,
    thisWeek: allJobs.filter((j) => j.date >= today && j.date <= weekEnd && j.status !== 'completed').length + overdueCount,
    thisMonth: allJobs.filter((j) => j.date >= today && j.date <= monthEnd && j.status !== 'completed').length + overdueCount,
    upcoming: allJobs.filter((j) => j.date >= today && j.status !== 'completed').length + overdueCount,
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
