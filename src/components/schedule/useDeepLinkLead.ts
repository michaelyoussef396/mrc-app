import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { LeadToSchedule } from '@/hooks/useLeadsToSchedule';
import {
  deriveDeepLinkReason,
  fetchDeepLinkLeadRow,
  toStillNotListedReason,
  LOOKUP_FAILED_REASON,
  type DeepLinkReason,
} from './deepLinkLeadReason';

/**
 * Resolves /admin/schedule?lead={id} into either a card to open or a reason the
 * rail cannot open it, exactly once per id.
 *
 * The rail's own query is never touched: when the lookup says the lead belongs in
 * the rail but the cached list predates it, we ask the existing query to refetch
 * and re-check, rather than widening its filter.
 */

// NOTE: mirrors the key inside useLeadsToSchedule, which is frozen for a pending
// deploy and exports nothing. Four other call sites already invalidate this literal.
const LEADS_TO_SCHEDULE_QUERY_KEY = ['leads-to-schedule'] as const;

interface LeadsToScheduleCache {
  leads: LeadToSchedule[];
}

interface UseDeepLinkLeadParams {
  /** Lead id from the deep link, or null when there is nothing to resolve. */
  leadId: string | null;
  leads: LeadToSchedule[];
  isListLoading: boolean;
  /** Called once the id has been resolved, so the caller can stop re-supplying it. */
  onSettled?: () => void;
}

interface UseDeepLinkLeadResult {
  /** Lead to expand and scroll to. Null until resolved, or when it cannot be shown. */
  targetLeadId: string | null;
  /** Why the rail cannot show the lead. Null while pending and once applied. */
  reason: DeepLinkReason | null;
  dismissReason: () => void;
}

export function useDeepLinkLead({
  leadId,
  leads,
  isListLoading,
  onSettled,
}: UseDeepLinkLeadParams): UseDeepLinkLeadResult {
  const queryClient = useQueryClient();
  const [targetLeadId, setTargetLeadId] = useState<string | null>(null);
  const [reason, setReason] = useState<DeepLinkReason | null>(null);

  // The resolution reads the list once, at the moment it runs — depending on `leads`
  // would restart it on every 60 s refetch.
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const resolvedIdRef = useRef<string | null>(null);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (!leadId || isListLoading) return;
    if (resolvedIdRef.current === leadId) return;
    resolvedIdRef.current = leadId;

    let cancelled = false;

    const settle = (outcome: { target: string | null; reason: DeepLinkReason | null }) => {
      if (cancelled) return;
      setTargetLeadId(outcome.target);
      setReason(outcome.reason);
      onSettledRef.current?.();
    };

    const isListed = (list: LeadToSchedule[]) => list.some((lead) => lead.id === leadId);

    void (async () => {
      if (isListed(leadsRef.current)) {
        settle({ target: leadId, reason: null });
        return;
      }

      let lookupReason: DeepLinkReason;
      try {
        lookupReason = deriveDeepLinkReason(await fetchDeepLinkLeadRow(leadId));
      } catch {
        lookupReason = LOOKUP_FAILED_REASON;
      }
      if (cancelled) return;

      if (lookupReason.kind !== 'expected_listed') {
        settle({ target: null, reason: lookupReason });
        return;
      }

      // The lead belongs here but the cached list predates it — refresh and re-check.
      await queryClient.refetchQueries({ queryKey: LEADS_TO_SCHEDULE_QUERY_KEY });
      if (cancelled) return;

      const refreshed =
        queryClient.getQueryData<LeadsToScheduleCache>(LEADS_TO_SCHEDULE_QUERY_KEY)?.leads ?? [];
      settle(
        isListed(refreshed)
          ? { target: leadId, reason: null }
          : { target: null, reason: toStillNotListedReason(lookupReason) },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, isListLoading, queryClient]);

  const dismissReason = useCallback(() => setReason(null), []);

  return { targetLeadId, reason, dismissReason };
}
