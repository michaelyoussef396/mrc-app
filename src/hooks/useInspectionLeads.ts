import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface InspectionLead {
  id: string;
  lead_number: string;
  status: string;
  lead_source: string;
  full_name: string;
  email: string;
  phone: string;
  property_address_street: string;
  property_address_suburb: string;
  property_address_postcode: string;
  property_address_state: string;
  property_type: string;
  issue_description: string;
  inspection_scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook: Fetch leads ready for inspection
 *
 * Returns leads with status 'inspection_waiting' sorted FIFO (oldest first).
 *
 * Includes real-time subscription for automatic updates when:
 * - New leads become inspection-ready
 * - Lead status changes
 * - Lead details are updated
 */
export function useInspectionLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inspection-leads'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          status,
          lead_source,
          full_name,
          email,
          phone,
          property_address_street,
          property_address_suburb,
          property_address_postcode,
          property_address_state,
          property_type,
          issue_description,
          inspection_scheduled_date,
          created_at,
          updated_at
        `)
        .eq('status', 'inspection_waiting')
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as InspectionLead[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Set up real-time subscription for lead changes
  useEffect(() => {
    if (!user) return;


    const channel = supabase
      .channel('inspection-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leads',
          filter: 'status=eq.inspection_waiting', // Only inspection-ready leads
        },
        (payload) => {

          // Invalidate and refetch inspection leads
          queryClient.invalidateQueries({ queryKey: ['inspection-leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/**
 * Hook: Get count of inspection-ready leads
 *
 * Useful for showing badge counts or quick stats
 */
export function useInspectionLeadsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inspection-leads-count'],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inspection_waiting')
        .is('archived_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
}
