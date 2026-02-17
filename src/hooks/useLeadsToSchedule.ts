import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTimeAgo } from '@/lib/bookingService';

// ============================================================================
// TYPES
// ============================================================================

export interface LeadToSchedule {
  id: string;
  leadNumber: string;
  fullName: string;
  displayName: string;
  initials: string;
  suburb: string;
  propertyType: string;
  phone: string;
  email: string;
  issueDescription: string | null;  // Notes from enquiry
  propertyAddress: string;          // Full address for booking
  createdAt: string;
  timeAgo: string;
}

interface UseLeadsToScheduleResult {
  leads: LeadToSchedule[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useLeadsToSchedule(): UseLeadsToScheduleResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leads-to-schedule'],
    queryFn: async () => {

      // Fetch leads that:
      // 1. Have status 'new_lead' or 'hipages_lead'
      // 2. AND have no inspection_scheduled_date
      const { data: leadsData, error: fetchError, count } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          full_name,
          phone,
          email,
          property_address_street,
          property_address_suburb,
          property_address_state,
          property_address_postcode,
          property_type,
          issue_description,
          created_at
        `, { count: 'exact' })
        .in('status', ['new_lead', 'hipages_lead'])
        .is('inspection_scheduled_date', null)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[LeadsToSchedule] Fetch error:', fetchError);
        throw fetchError;
      }


      // Transform to LeadToSchedule format
      const transformedLeads: LeadToSchedule[] = (leadsData || []).map((lead: any) => {
        const nameParts = parseFullName(lead.full_name);
        const fullAddress = buildFullAddress(
          lead.property_address_street,
          lead.property_address_suburb,
          lead.property_address_state,
          lead.property_address_postcode
        );

        return {
          id: lead.id,
          leadNumber: lead.lead_number || '',
          fullName: lead.full_name || 'Unknown',
          displayName: formatDisplayName(nameParts.firstName, nameParts.lastName),
          initials: getInitials(nameParts.firstName, nameParts.lastName),
          suburb: lead.property_address_suburb || '',
          propertyType: formatPropertyType(lead.property_type),
          phone: lead.phone || '',
          email: lead.email || '',
          issueDescription: lead.issue_description,
          propertyAddress: fullAddress,
          createdAt: lead.created_at,
          timeAgo: getTimeAgo(lead.created_at),
        };
      });


      return {
        leads: transformedLeads,
        totalCount: count || 0,
      };
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });

  return {
    leads: data?.leads || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse full name into first and last name
 */
function parseFullName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Format display name as "FirstName L." or just "FirstName"
 */
function formatDisplayName(firstName: string, lastName: string): string {
  if (!firstName) return 'Unknown';
  if (!lastName) return firstName;
  return `${firstName} ${lastName[0]}.`;
}

/**
 * Get initials from name
 */
function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

/**
 * Build full address string
 */
function buildFullAddress(
  street: string | null,
  suburb: string | null,
  state: string | null,
  postcode: string | null
): string {
  const parts = [street, suburb, state, postcode].filter(Boolean);
  return parts.join(', ');
}

/**
 * Format property type for display
 */
function formatPropertyType(propertyType: string | null): string {
  if (!propertyType) return 'Property';

  // Convert snake_case or lowercase to Title Case
  return propertyType
    .split(/[_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
