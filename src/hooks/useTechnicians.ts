import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Technician {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface UserFromAPI {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function getTechnicianColor(name: string): string {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('clayton')) return '#007AFF';
  if (nameLower.includes('glen')) return '#34C759';
  if (nameLower.includes('michael')) return '#FF9500';
  // Generate a consistent color for other technicians
  const colors = ['#FF9500', '#FF3B30', '#5856D6', '#AF52DE', '#00C7BE'];
  let hash = 0;
  for (let i = 0; i < nameLower.length; i++) {
    hash = nameLower.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getTechnicianInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name[0].toUpperCase();
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

/**
 * Fetches technicians by:
 * 1. Getting all users from the manage-users edge function
 * 2. Getting technician role ID from roles table
 * 3. Filtering to only users with technician role
 */
async function fetchTechnicians(): Promise<Technician[]> {
  try {
    // Step 1: Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[useTechnicians] No session found');
      throw new Error('Not authenticated');
    }

    // Step 2: Fetch all users from edge function (same as BookInspectionModal)
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

    const allUsers: UserFromAPI[] = result.users.filter((u: UserFromAPI) => u.is_active);

    // Step 3: Get technician role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'technician')
      .maybeSingle();

    if (roleError) {
      console.error('[useTechnicians] Role fetch error:', roleError);
      throw new Error(`Failed to fetch technician role: ${roleError.message}`);
    }

    if (!roleData) {
      console.warn('[useTechnicians] No technician role found - returning empty list');
      return [];
    }

    const technicianRoleId = roleData.id;

    // Step 4: Get user IDs with technician role
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', technicianRoleId);

    if (userRolesError) {
      console.error('[useTechnicians] user_roles fetch error:', userRolesError);
      throw new Error(`Failed to fetch user roles: ${userRolesError.message}`);
    }

    if (!userRolesData || userRolesData.length === 0) {
      console.warn('[useTechnicians] No users with technician role - returning empty list');
      return [];
    }

    // Step 5: Filter users to only those with technician role
    const technicianUserIds = new Set(userRolesData.map(r => r.user_id));
    const technicians = allUsers
      .filter(user => technicianUserIds.has(user.id))
      .map(user => ({
        id: user.id,
        name: user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email,
        color: getTechnicianColor(user.full_name || user.first_name),
        initials: getTechnicianInitials(user.full_name || user.first_name),
      }));
    return technicians;

  } catch (error) {
    console.error('[useTechnicians] Fatal error:', error);
    throw error;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useTechnicians() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: fetchTechnicians,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export default useTechnicians;
