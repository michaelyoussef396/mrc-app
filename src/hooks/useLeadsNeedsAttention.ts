import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NeedsAttentionLead {
  id: string;
  fullName: string;
  addressStreet: string | null;
  leadNumber: string | null;
  leadStatus: string;
  submittedAt: string | null;
  updatedAt: string;
}

interface NeedsAttentionResult {
  leads: NeedsAttentionLead[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * useLeadsNeedsAttention
 *
 * Fetches leads in `pending_review` status where the technician has flagged
 * `request_review = true` on the associated job completion. Used by the
 * NeedsAttentionList card on the admin dashboard to surface jobs requiring
 * admin eyes before the report can be approved and sent.
 *
 * Uses an `!inner` join on job_completions so the filter runs server-side in
 * one round trip and RLS applies correctly.
 */
export function useLeadsNeedsAttention(): NeedsAttentionResult {
  const [leads, setLeads] = useState<NeedsAttentionLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('id, full_name, property_address_street, lead_number, status, updated_at, job_completions!inner(submitted_at, request_review)')
        .eq('status', 'pending_review')
        .eq('job_completions.request_review', true)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('[NeedsAttention] Fetch error:', fetchError);
        throw fetchError;
      }

      const transformed: NeedsAttentionLead[] = (data || []).map((row) => {
        // job_completions comes back as an array due to the join
        const completions = row.job_completions as Array<{ submitted_at: string | null; request_review: boolean }>;
        const submittedAt = completions?.[0]?.submitted_at ?? null;

        return {
          id: row.id,
          fullName: row.full_name || 'Unknown',
          addressStreet: row.property_address_street ?? null,
          leadNumber: row.lead_number ?? null,
          leadStatus: row.status || 'pending_review',
          submittedAt,
          updatedAt: row.updated_at,
        };
      });

      setLeads(transformed);
      setTotalCount(transformed.length);
    } catch (err) {
      console.error('[NeedsAttention] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads needing attention');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    totalCount,
    isLoading,
    error,
    refetch: fetchLeads,
  };
}
