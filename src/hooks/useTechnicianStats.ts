import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface TechnicianWithStats {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  homeSuburb: string | null;
  lastSignInAt: string | null;
  // Stats
  inspectionsThisWeek: number;
  revenueThisMonth: number;
  upcomingCount: number;
  // Display
  initials: string;
  color: string;
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
  };
  last_sign_in_at?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initials from first and last name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

/**
 * Assign color based on index
 */
export function getTechnicianColor(index: number): string {
  const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5856D6'];
  return colors[index % colors.length];
}

/**
 * Format revenue as "$12.4k" or "$1,234"
 */
export function formatRevenue(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format relative time (e.g., "10 mins ago")
 */
export function formatLastSeen(date: string | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  // For older dates, show the actual date
  return then.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

async function fetchTechniciansWithStats(): Promise<TechnicianWithStats[]> {
  console.log('[useTechnicianStats] Starting fetch...');

  try {
    // Step 1: Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[useTechnicianStats] No session found');
      throw new Error('Not authenticated');
    }

    // Step 2: Fetch all users from edge function
    console.log('[useTechnicianStats] Fetching users from manage-users edge function...');
    let allUsers: UserFromAPI[] = [];
    try {
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
        console.error('[useTechnicianStats] Edge function error:', result.error);
        throw new Error(result.error || 'Failed to fetch users');
      }

      allUsers = result.users.filter((u: UserFromAPI) => u.is_active);
    } catch (fetchError) {
      console.error('[useTechnicianStats] Failed to fetch users, returning empty list:', fetchError);
      return [];
    }
    console.log('[useTechnicianStats] Active users:', allUsers.length);

    // Step 3: Get technician role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'technician')
      .maybeSingle();

    if (roleError) {
      console.error('[useTechnicianStats] Role fetch error:', roleError);
      throw new Error(`Failed to fetch technician role: ${roleError.message}`);
    }

    if (!roleData) {
      console.warn('[useTechnicianStats] No technician role found');
      return [];
    }

    // Step 4: Get user IDs with technician role
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roleData.id);

    if (userRolesError) {
      console.error('[useTechnicianStats] user_roles fetch error:', userRolesError);
      throw new Error(`Failed to fetch user roles: ${userRolesError.message}`);
    }

    if (!userRolesData || userRolesData.length === 0) {
      console.warn('[useTechnicianStats] No users with technician role');
      return [];
    }

    const technicianUserIds = new Set(userRolesData.map(r => r.user_id));
    const technicians = allUsers.filter(user => technicianUserIds.has(user.id));
    console.log('[useTechnicianStats] Technicians found:', technicians.length);

    // Step 5: Fetch inspection stats for each technician
    const techIds = technicians.map(t => t.id);

    // Get inspections this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: inspectionStats, error: inspectionError } = await supabase
      .from('inspections')
      .select('inspector_id, inspection_date, total_inc_gst')
      .in('inspector_id', techIds);

    if (inspectionError) {
      console.warn('[useTechnicianStats] Inspection stats error:', inspectionError);
    }

    // Step 6: Fetch upcoming bookings count
    const { data: upcomingBookings, error: bookingsError } = await supabase
      .from('calendar_bookings')
      .select('assigned_to')
      .in('assigned_to', techIds)
      .gte('start_datetime', new Date().toISOString());

    if (bookingsError) {
      console.warn('[useTechnicianStats] Bookings fetch error:', bookingsError);
    }

    // Step 6b: Fetch all active leads assigned to technicians
    const { data: assignedLeads, error: assignedLeadsError } = await supabase
      .from('leads')
      .select('assigned_to')
      .in('assigned_to', techIds)
      .not('status', 'in', '("closed","not_landed")');

    if (assignedLeadsError) {
      console.warn('[useTechnicianStats] Assigned leads fetch error:', assignedLeadsError);
    }

    // Step 7: Calculate stats for each technician
    const statsMap: Record<string, { inspectionsThisWeek: number; revenueThisMonth: number; upcomingCount: number }> = {};

    techIds.forEach(id => {
      statsMap[id] = { inspectionsThisWeek: 0, revenueThisMonth: 0, upcomingCount: 0 };
    });

    // Count active assigned leads per technician (shown as "leads" in Team Workload)
    (assignedLeads || []).forEach((lead: any) => {
      if (lead.assigned_to && statsMap[lead.assigned_to]) {
        statsMap[lead.assigned_to].inspectionsThisWeek++;
      }
    });

    // Revenue this month from completed inspections
    (inspectionStats || []).forEach((insp: any) => {
      if (insp.inspector_id && statsMap[insp.inspector_id]) {
        const inspDate = new Date(insp.inspection_date);
        if (inspDate >= monthStart && insp.total_inc_gst) {
          statsMap[insp.inspector_id].revenueThisMonth += parseFloat(insp.total_inc_gst) || 0;
        }
      }
    });

    // Count upcoming bookings
    (upcomingBookings || []).forEach((booking: any) => {
      if (booking.assigned_to && statsMap[booking.assigned_to]) {
        statsMap[booking.assigned_to].upcomingCount++;
      }
    });

    // Step 8: Build final result
    const techniciansWithStats: TechnicianWithStats[] = technicians.map((user, index) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      phone: user.phone || null,
      homeSuburb: user.starting_address?.suburb || null,
      lastSignInAt: user.last_sign_in_at || null,
      inspectionsThisWeek: statsMap[user.id]?.inspectionsThisWeek || 0,
      revenueThisMonth: statsMap[user.id]?.revenueThisMonth || 0,
      upcomingCount: statsMap[user.id]?.upcomingCount || 0,
      initials: getInitials(user.first_name, user.last_name),
      color: getTechnicianColor(index),
    }));

    console.log('[useTechnicianStats] Final result:', techniciansWithStats);
    return techniciansWithStats;

  } catch (error) {
    console.error('[useTechnicianStats] Fatal error:', error);
    throw error;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useTechnicianStats() {
  return useQuery({
    queryKey: ['technician-stats'],
    queryFn: fetchTechniciansWithStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  });
}

export default useTechnicianStats;
