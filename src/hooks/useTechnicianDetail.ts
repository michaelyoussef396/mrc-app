import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getInitials, getTechnicianColor, formatRevenue, formatLastSeen } from './useTechnicianStats';

// ============================================================================
// TYPES
// ============================================================================

export interface TechnicianDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  homeSuburb: string | null;
  homeAddress: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
  // Display
  initials: string;
  color: string;
  // Stats
  inspectionsToday: number;
  inspectionsThisWeek: number;
  inspectionsThisMonth: number;
  revenueThisMonth: number;
  // Workload breakdown (last 30 days)
  workloadScheduled: number;
  workloadInProgress: number;
  workloadCompleted: number;
  workloadCancelled: number;
}

export interface UpcomingJob {
  id: string;
  startDatetime: Date;
  endDatetime: Date;
  eventType: 'inspection' | 'job';
  title: string;
  status: string;
  customerName: string;
  suburb: string;
  phone: string | null;
  leadId: string | null;
}

interface UserFromAPI {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  phone?: string;
  starting_address?: {
    suburb?: string;
    fullAddress?: string;
  };
  last_sign_in_at?: string;
  created_at?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date for display (e.g., "Today, 2:00 PM" or "Tomorrow, 9:30 AM")
 */
export function formatJobDateTime(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;

  // For other days, show day name
  const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' });
  return `${dayName}, ${time}`;
}

/**
 * Get color for event type badge
 */
export function getEventTypeColor(eventType: string): { bg: string; text: string; border: string } {
  if (eventType === 'inspection') {
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-100 dark:border-blue-800',
    };
  }
  // job / restoration
  return {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-800',
  };
}

/**
 * Get accent color for job card left border
 */
export function getJobAccentColor(eventType: string): string {
  return eventType === 'inspection' ? 'bg-[#007AFF]' : 'bg-orange-500';
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchTechnicianDetail(technicianId: string): Promise<TechnicianDetail | null> {

  try {
    // Step 1: Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Step 2: Fetch user data from edge function
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
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch users');
    }

    const user = result.users.find((u: UserFromAPI) => u.id === technicianId);
    if (!user) {
      console.warn('[useTechnicianDetail] Technician not found');
      return null;
    }

    // Step 3: Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Step 4: Fetch inspection stats
    const { data: inspections, error: inspError } = await supabase
      .from('inspections')
      .select('inspection_date, total_inc_gst')
      .eq('inspector_id', technicianId);

    if (inspError) {
      console.warn('[useTechnicianDetail] Inspection fetch error:', inspError);
    }

    // Calculate inspection counts
    let inspectionsToday = 0;
    let inspectionsThisWeek = 0;
    let inspectionsThisMonth = 0;
    let revenueThisMonth = 0;

    (inspections || []).forEach((insp: any) => {
      const inspDate = new Date(insp.inspection_date);

      if (inspDate >= todayStart) {
        inspectionsToday++;
      }
      if (inspDate >= weekStart) {
        inspectionsThisWeek++;
      }
      if (inspDate >= monthStart) {
        inspectionsThisMonth++;
        if (insp.total_inc_gst) {
          revenueThisMonth += parseFloat(insp.total_inc_gst) || 0;
        }
      }
    });

    // Step 5: Fetch workload breakdown (leads assigned, last 30 days)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('status, created_at')
      .eq('assigned_to', technicianId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (leadsError) {
      console.warn('[useTechnicianDetail] Leads fetch error:', leadsError);
    }

    // Categorize workload
    let workloadScheduled = 0;
    let workloadInProgress = 0;
    let workloadCompleted = 0;
    let workloadCancelled = 0;

    (leads || []).forEach((lead: any) => {
      const status = lead.status?.toLowerCase() || '';

      if (['inspection_waiting', 'job_waiting', 'contacted'].includes(status)) {
        workloadScheduled++;
      } else if (['inspection_in_progress', 'approve_inspection_report'].includes(status)) {
        workloadInProgress++;
      } else if (['job_completed', 'finished', 'paid', 'invoicing_sent'].includes(status)) {
        workloadCompleted++;
      } else if (['closed', 'cancelled', 'not_landed'].includes(status)) {
        workloadCancelled++;
      } else {
        // Default to scheduled for new statuses
        workloadScheduled++;
      }
    });

    // Build result
    const technicianDetail: TechnicianDetail = {
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      phone: user.phone || null,
      homeSuburb: user.starting_address?.suburb || null,
      homeAddress: user.starting_address?.fullAddress || null,
      lastSignInAt: user.last_sign_in_at || null,
      createdAt: user.created_at || null,
      initials: getInitials(user.first_name, user.last_name),
      color: getTechnicianColor(0), // Will use index from parent
      inspectionsToday,
      inspectionsThisWeek,
      inspectionsThisMonth,
      revenueThisMonth,
      workloadScheduled,
      workloadInProgress,
      workloadCompleted,
      workloadCancelled,
    };

    return technicianDetail;

  } catch (error) {
    console.error('[useTechnicianDetail] Fatal error:', error);
    throw error;
  }
}

async function fetchUpcomingJobs(technicianId: string): Promise<UpcomingJob[]> {

  try {
    const { data: bookings, error } = await supabase
      .from('calendar_bookings')
      .select(`
        id,
        start_datetime,
        end_datetime,
        event_type,
        title,
        status,
        lead_id,
        lead:leads (
          id,
          full_name,
          property_address_suburb,
          phone
        )
      `)
      .eq('assigned_to', technicianId)
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[useTechnicianDetail] Bookings fetch error:', error);
      throw error;
    }

    const upcomingJobs: UpcomingJob[] = (bookings || []).map((booking: any) => ({
      id: booking.id,
      startDatetime: new Date(booking.start_datetime),
      endDatetime: new Date(booking.end_datetime),
      eventType: booking.event_type === 'job' ? 'job' : 'inspection',
      title: booking.title || '',
      status: booking.status || 'scheduled',
      customerName: booking.lead?.full_name || 'Unknown',
      suburb: booking.lead?.property_address_suburb || '',
      phone: booking.lead?.phone || null,
      leadId: booking.lead_id,
    }));

    return upcomingJobs;

  } catch (error) {
    console.error('[useTechnicianDetail] Upcoming jobs error:', error);
    throw error;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTechnicianDetail(technicianId: string | undefined) {
  return useQuery({
    queryKey: ['technician-detail', technicianId],
    queryFn: () => fetchTechnicianDetail(technicianId!),
    enabled: !!technicianId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

export function useUpcomingJobs(technicianId: string | undefined) {
  return useQuery({
    queryKey: ['technician-upcoming-jobs', technicianId],
    queryFn: () => fetchUpcomingJobs(technicianId!),
    enabled: !!technicianId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}

// Re-export helpers
export { formatRevenue, formatLastSeen };
