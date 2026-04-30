import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

// Narrowed to match what the query actually returns post-Stage-1 filtering.
// The full booking_status enum is scheduled | in_progress | completed | cancelled
// | rescheduled, but the .in('status', ['scheduled', 'in_progress']) predicate
// in the query rules out the other three.
export type JobStatus = 'scheduled' | 'in_progress';
export type TabFilter = 'today' | 'this_week' | 'overdue' | 'pending_review' | 'all';

export interface TechnicianJob {
  id: string;
  bookingId: string;
  leadId: string;
  inspectionId?: string;
  title: string;
  eventType: string;
  status: JobStatus;
  leadStatus: string;
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
  // Multi-day job indicator parsed from title (e.g. "Day 1 of 6")
  dayLabel?: string;
  dayNumber?: number;
  totalDays?: number;
}

interface UseTechnicianJobsResult {
  jobs: TechnicianJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  counts: {
    today: number;
    thisWeek: number;
    overdue: number;
    pendingReview: number;
    all: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format (Melbourne timezone)
 */
function getTodayDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date());
}

/**
 * Monday–Sunday range for the current week in Melbourne timezone, as YYYY-MM-DD.
 * Parses today's Melbourne date string into a UTC-midnight Date so weekday
 * arithmetic doesn't drift across the date line.
 */
function getThisWeekRange(): { start: string; end: string } {
  const todayStr = getTodayDate();
  const today = new Date(todayStr + 'T00:00:00Z');
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
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
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(date);
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

      // Fetch active bookings for this technician, restricted to leads in
      // technician-actionable workflow stages. !inner forces an INNER join so
      // PostgREST applies the lead.status filter and drops lead-less bookings
      // (out-of-workflow standalone calendar entries).
      //
      // Booking-status predicate: only ACTIVE work — scheduled/in_progress.
      //   - 'completed' is terminal history, not actionable
      //   - 'cancelled' was already excluded
      //   - 'rescheduled' is a tombstone marker on a moved booking; the new
      //     booking is created as 'scheduled', so the rescheduled row is also
      //     terminal history.
      //
      // Lead-status predicate: technician-actionable stages only.
      //   - 'inspection_waiting' — tech does the inspection
      //   - 'job_scheduled' — tech does the remediation job
      //   - 'pending_review' — tech-side revisions surface here once Phase 2 ships
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
          lead:leads!inner (
            id,
            full_name,
            phone,
            email,
            property_address_street,
            property_address_suburb,
            property_address_state,
            property_address_postcode,
            issue_description,
            access_instructions,
            status
          )
        `)
        .eq('assigned_to', user.id)
        .in('status', ['scheduled', 'in_progress'])
        .in('lead.status', ['inspection_waiting', 'job_scheduled', 'pending_review'])
        .order('start_datetime', { ascending: true });

      if (fetchError) {
        console.error('[TechnicianJobs] Fetch error:', fetchError);
        throw fetchError;
      }


      // Transform the data — lead may be null for bookings without a linked lead
      const transformedJobs: TechnicianJob[] = (data || []).map((booking: any) => {
        const lead = Array.isArray(booking.lead) ? booking.lead[0] : booking.lead;
        const address = lead?.property_address_street || booking.location_address || '';
        const suburb = lead?.property_address_suburb || '';
        const state = lead?.property_address_state || '';
        const postcode = lead?.property_address_postcode || '';

        // Parse multi-day label from the booking title, e.g. "Job (Day 3/6) - John Smith"
        const dayMatch = typeof booking.title === 'string'
          ? booking.title.match(/\(Day (\d+)\/(\d+)\)/)
          : null;
        const dayNumber = dayMatch ? parseInt(dayMatch[1], 10) : undefined;
        const totalDays = dayMatch ? parseInt(dayMatch[2], 10) : undefined;
        const dayLabel = dayMatch ? `Day ${dayNumber} of ${totalDays}` : undefined;

        return {
          id: booking.id,
          bookingId: booking.id,
          leadId: lead?.id || booking.lead_id || '',
          inspectionId: booking.inspection_id || undefined,
          title: booking.title || 'Inspection',
          eventType: booking.event_type || 'inspection',
          status: (booking.status as JobStatus) || 'scheduled',
          leadStatus: lead?.status || '',
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
          dayLabel,
          dayNumber,
          totalDays,
        };
      });

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
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchJobs]);

  // Filter jobs based on active tab. Tabs are non-overlapping — Overdue lives
  // in its own tab so stale work is visible but doesn't bleed into Today/Week/All.
  // Server query already restricts to actionable booking + lead statuses, so no
  // need to filter on job.status here.
  const today = getTodayDate();
  const { start: weekStart, end: weekEnd } = getThisWeekRange();

  const filteredJobs = allJobs.filter((job) => {
    switch (activeTab) {
      case 'today':
        return job.date === today;
      case 'this_week':
        return job.date >= weekStart && job.date <= weekEnd;
      case 'overdue':
        return job.date < today;
      case 'pending_review':
        return job.leadStatus === 'pending_review';
      case 'all':
        return true;
      default:
        return true;
    }
  });

  const counts = {
    today: allJobs.filter((j) => j.date === today).length,
    thisWeek: allJobs.filter((j) => j.date >= weekStart && j.date <= weekEnd).length,
    overdue: allJobs.filter((j) => j.date < today).length,
    pendingReview: allJobs.filter((j) => j.leadStatus === 'pending_review').length,
    all: allJobs.length,
  };

  return {
    jobs: filteredJobs,
    isLoading,
    error,
    refetch: fetchJobs,
    counts,
  };
}
