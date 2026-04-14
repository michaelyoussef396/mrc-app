import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

export interface SearchLead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  property_address_street: string;
  property_address_suburb: string;
  property_address_postcode: string;
  status: string;
  lead_source: string | null;
  created_at: string | null;
  notes: string | null;
  issue_description: string | null;
}

interface SearchResult {
  leads: SearchLead[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

/** Escape LIKE/ILIKE wildcards so user input is treated as literal text */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Custom hook for searching leads with debounced queries.
 * Uses a DB-side `search_text` generated column (GIN-indexed with pg_trgm)
 * instead of 9 separate unindexed ILIKE scans.
 * Multi-word queries use chained .ilike() for DB-side AND logic.
 */
export function useLeadSearch(query: string): SearchResult {
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const searchLeads = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setLeads([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const normalizedQuery = debouncedQuery.trim();
        const searchWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        // Normalize phone for flexible matching (strip formatting chars)
        const phoneQuery = debouncedQuery.replace(/[\s\-\(\)]/g, '');

        // Build query using the indexed search_text column.
        // Each word becomes a chained .ilike() = DB-side AND logic.
        // The GIN trgm index on search_text handles infix matching efficiently.
        let dbQuery = supabase
          .from('leads')
          .select(
            `id, full_name, email, phone,
             property_address_street, property_address_suburb,
             property_address_postcode, status, lead_source,
             created_at, notes, issue_description`,
            { count: 'exact' }
          )
          .is('archived_at', null);

        for (const word of searchWords) {
          const escaped = escapeIlike(word);
          dbQuery = dbQuery.ilike('search_text', `%${escaped}%`);
        }

        const { data, error: searchError, count } = await dbQuery
          .order('created_at', { ascending: false })
          .limit(100);

        if (searchError) throw searchError;

        let filteredResults = data || [];

        // Phone normalization post-filter: merge any matches where the user
        // typed a phone number with different formatting than stored
        if (phoneQuery.length >= 3) {
          const phoneMatches = filteredResults.filter(lead => {
            if (!lead.phone) return false;
            const normalizedPhone = lead.phone.replace(/[\s\-\(\)]/g, '');
            return normalizedPhone.includes(phoneQuery);
          });

          // If phone-specific matches exist, ensure they're at the top
          if (phoneMatches.length > 0) {
            const phoneIds = new Set(phoneMatches.map(l => l.id));
            const nonPhoneResults = filteredResults.filter(l => !phoneIds.has(l.id));
            filteredResults = [...phoneMatches, ...nonPhoneResults];
          }
        }

        // Limit to 8 for display
        setLeads(filteredResults.slice(0, 8));
        setTotalCount(count ?? filteredResults.length);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setLeads([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    searchLeads();
  }, [debouncedQuery]);

  return { leads, totalCount, isLoading, error };
}
