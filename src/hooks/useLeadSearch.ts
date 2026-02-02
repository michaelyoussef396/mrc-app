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

/**
 * Custom hook for searching leads with debounced queries
 * Searches across: name, email, phone, address, suburb, postcode, status, source
 */
export function useLeadSearch(query: string): SearchResult {
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the query by 300ms
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const searchLeads = async () => {
      // Don't search if query is too short
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setLeads([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const normalizedQuery = debouncedQuery.toLowerCase().trim();

        // Normalize phone number for search (remove spaces, dashes, parentheses)
        const phoneQuery = debouncedQuery.replace(/[\s\-\(\)]/g, '');

        // Split query into words for multi-word search
        const searchWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        // Build OR filter for each search word
        // Each word must match at least one field
        // Note: status is an enum type so we can't use ilike on it directly
        const orFilters = searchWords.map(word => {
          const conditions = [
            `full_name.ilike.%${word}%`,
            `email.ilike.%${word}%`,
            `phone.ilike.%${word}%`,
            `property_address_street.ilike.%${word}%`,
            `property_address_suburb.ilike.%${word}%`,
            `property_address_postcode.ilike.%${word}%`,
            `lead_source.ilike.%${word}%`,
            `notes.ilike.%${word}%`,
            `issue_description.ilike.%${word}%`,
          ];
          return conditions.join(',');
        });

        // For single word, use simple OR filter
        // For multiple words, we need to match all words (AND logic)
        // Supabase doesn't support AND with .or() easily, so for multi-word
        // we'll do a single OR and filter client-side for better UX
        const { data, error: searchError, count } = await supabase
          .from('leads')
          .select(
            `
            id,
            full_name,
            email,
            phone,
            property_address_street,
            property_address_suburb,
            property_address_postcode,
            status,
            lead_source,
            created_at,
            notes,
            issue_description
          `,
            { count: 'exact' }
          )
          .or(orFilters[0]) // Use first word's filter for DB query
          .order('created_at', { ascending: false })
          .limit(50); // Get more results for client-side filtering

        if (searchError) throw searchError;

        let filteredResults = data || [];

        // If multiple words, filter client-side to ensure ALL words match
        if (searchWords.length > 1) {
          filteredResults = filteredResults.filter(lead => {
            // Include status (formatted) for client-side filtering
            const statusFormatted = lead.status?.replace(/_/g, ' ') || '';
            const searchableText = [
              lead.full_name,
              lead.email,
              lead.phone,
              lead.property_address_street,
              lead.property_address_suburb,
              lead.property_address_postcode,
              statusFormatted,
              lead.lead_source,
              lead.notes,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            // All search words must be present
            return searchWords.every(word => searchableText.includes(word));
          });
        }

        // Also handle phone number flexible matching
        if (phoneQuery.length >= 3) {
          const phoneMatches = (data || []).filter(lead => {
            if (!lead.phone) return false;
            const normalizedPhone = lead.phone.replace(/[\s\-\(\)]/g, '');
            return normalizedPhone.includes(phoneQuery);
          });

          // Merge phone matches with existing results (avoid duplicates)
          const existingIds = new Set(filteredResults.map(l => l.id));
          phoneMatches.forEach(match => {
            if (!existingIds.has(match.id)) {
              filteredResults.push(match);
            }
          });
        }

        // Limit to 8 for display
        setLeads(filteredResults.slice(0, 8));
        setTotalCount(filteredResults.length);
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
