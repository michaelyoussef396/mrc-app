import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnassignedLead {
  id: string;
  fullName: string;
  displayName: string;
  initials: string;
  suburb: string;
  status: string;
  createdAt: string;
  timeAgo: string;
  phone: string;
  email: string;
}

interface UnassignedLeadsResult {
  leads: UnassignedLead[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUnassignedLeads(): UnassignedLeadsResult {
  const [leads, setLeads] = useState<UnassignedLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnassignedLeads = async () => {
    try {
      setIsLoading(true);

      console.log('[UnassignedLeads] Fetching...');

      // Fetch leads that are new/hipages OR have no technician assigned
      const { data, error: fetchError, count } = await supabase
        .from('leads')
        .select('id, full_name, property_address_suburb, status, assigned_to, created_at, phone, email', { count: 'exact' })
        .or('status.in.(new_lead,hipages_lead),assigned_to.is.null')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('[UnassignedLeads] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[UnassignedLeads] Raw data:', data);

      // Transform the data
      const transformedLeads: UnassignedLead[] = (data || []).map((lead: any) => {
        const nameParts = parseFullName(lead.full_name);
        return {
          id: lead.id,
          fullName: lead.full_name || 'Unknown',
          displayName: formatDisplayName(nameParts.firstName, nameParts.lastName),
          initials: getInitials(nameParts.firstName, nameParts.lastName),
          suburb: lead.property_address_suburb || '',
          status: lead.status || 'new_lead',
          createdAt: lead.created_at,
          timeAgo: getTimeAgo(lead.created_at),
          phone: lead.phone || '',
          email: lead.email || '',
        };
      });

      console.log('[UnassignedLeads] Transformed:', transformedLeads);

      setLeads(transformedLeads);
      setTotalCount(count || 0);
      setError(null);

    } catch (err) {
      console.error('[UnassignedLeads] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassignedLeads();
  }, []);

  return {
    leads,
    totalCount,
    isLoading,
    error,
    refetch: fetchUnassignedLeads
  };
}

// Helper to parse full name into first/last
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

// Helper to format display name as "FirstName L."
function formatDisplayName(firstName: string, lastName: string): string {
  if (!firstName) return 'Unknown';
  if (!lastName) return firstName;
  return `${firstName} ${lastName[0]}.`;
}

// Helper to get initials
function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

// Helper to get relative time
function getTimeAgo(dateString: string): string {
  if (!dateString) return '';

  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }
}
