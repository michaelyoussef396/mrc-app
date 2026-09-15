import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STALLED_REFETCH_INTERVAL_MS = 60000;
const STALLED_STALE_TIME_MS = 30000;

/**
 * How long an inspection may sit untouched before it counts as stalled.
 *
 * Technicians fill in what they can on site, leave for the next appointment and
 * finish the report that night, so an inspection unfinished during the day is
 * normal working rhythm, not a fault. Without this window the tile would flag
 * every in-progress inspection — noise on a surface whose only job is signal.
 */
export const STALLED_AFTER_HOURS = 24;

const MS_PER_HOUR = 3600000;

export interface StalledInspectionRow {
  id: string;
  pdf_url: string | null;
  updated_at: string | null;
  leads: { lead_number: string; archived_at: string | null } | null;
  ai_summary_versions: { id: string }[];
}

/**
 * An inspection that was started and then abandoned: no AI summary version was
 * ever generated and no report PDF was ever saved.
 *
 * Lead status is deliberately not consulted — a technician who simply stops
 * leaves status untouched, which is why MRC-2026-0136 and MRC-2026-0168 sat
 * unnoticed for two days. pdf_version is not consulted either: its column
 * default is 1, so it is evidence of nothing.
 *
 * Age is consulted, via STALLED_AFTER_HOURS. That is not a status filter
 * readmitted by the back door: it separates an abandoned inspection from one
 * still being worked on tonight.
 */
export function isStalledInspection(row: StalledInspectionRow, now: Date = new Date()): boolean {
  if (row.updated_at === null) return false;

  const hoursSinceTouched = (now.getTime() - new Date(row.updated_at).getTime()) / MS_PER_HOUR;

  return (
    hoursSinceTouched >= STALLED_AFTER_HOURS &&
    row.pdf_url === null &&
    row.ai_summary_versions.length === 0 &&
    row.leads !== null &&
    row.leads.archived_at === null
  );
}

/**
 * Hook: inspections that stalled before producing a report, oldest first.
 *
 * Read-only. PostgREST cannot express "has no related rows" as a server-side
 * filter without a view or an RPC, so the zero-summary-versions half of the
 * predicate is applied here rather than in the query.
 *
 * CONSTRAINT: that client-side half runs AFTER the server row cap (1000 by
 * default), so it is only safe while the candidate set — inspections with a
 * null pdf_url on an unarchived lead — stays well under that cap. It was 7 on
 * 2026-09-09. If it approaches the cap, an older stalled inspection can fill
 * the page and a newer one drop out of the result entirely, and polling will
 * repeat the same omission. Before that point this needs pagination over all
 * candidates, or an embedded is.null anti-join moving the whole predicate
 * server-side.
 */
export function useStalledInspections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stalled-inspections'],
    queryFn: async (): Promise<StalledInspectionRow[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select('id, pdf_url, updated_at, leads!inner(lead_number, archived_at), ai_summary_versions(id)')
        .is('pdf_url', null)
        .is('leads.archived_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Wrapped, not point-free: Array.filter passes the index as the second
      // argument, which would land in the `now` parameter.
      return (data as unknown as StalledInspectionRow[]).filter((row) => isStalledInspection(row));
    },
    enabled: !!user,
    refetchInterval: STALLED_REFETCH_INTERVAL_MS,
    staleTime: STALLED_STALE_TIME_MS,
  });
}
