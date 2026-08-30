import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  deriveDeepLinkReason,
  fetchDeepLinkLeadRow,
  isLeadIdShaped,
  toStillNotListedReason,
  INVALID_ID_REASON,
  LOOKUP_FAILED_REASON,
} from './deepLinkLeadReason';
import type { LeadToSchedule } from '@/hooks/useLeadsToSchedule';
import type { DeepLinkLeadRow, DeepLinkReason } from './deepLinkLeadReason';

/**
 * Resolves /admin/schedule?lead={id} into either a card to open or a pinned card
 * explaining why the rail cannot open it, exactly once per id.
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

/** The deep-linked lead the rail cannot list, and what is known about it. */
export interface DeepLinkPin {
  leadId: string;
  /** Null when the id was malformed, the lead is gone, or the lookup failed. */
  row: DeepLinkLeadRow | null;
  reason: DeepLinkReason;
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
  /** Lead to pin above the list. Null while pending, when listed, and once dismissed. */
  pin: DeepLinkPin | null;
  dismissPin: () => void;
}

export function useDeepLinkLead({
  leadId,
  leads,
  isListLoading,
  onSettled,
}: UseDeepLinkLeadParams): UseDeepLinkLeadResult {
  const queryClient = useQueryClient();
  const [targetLeadId, setTargetLeadId] = useState<string | null>(null);
  const [pin, setPin] = useState<DeepLinkPin | null>(null);

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

    const settle = (outcome: { target: string | null; pin: DeepLinkPin | null }) => {
      if (cancelled) return;
      setTargetLeadId(outcome.target);
      setPin(outcome.pin);
      onSettledRef.current?.();
    };

    const settlePin = (row: DeepLinkLeadRow | null, reason: DeepLinkReason) =>
      settle({ target: null, pin: { leadId, row, reason } });

    const isListed = (list: LeadToSchedule[]) => list.some((lead) => lead.id === leadId);

    void (async () => {
      if (isListed(leadsRef.current)) {
        settle({ target: leadId, pin: null });
        return;
      }

      // Postgres rejects a malformed uuid as 22P02, which would surface as a
      // connection problem. Catch the broken link here and say so instead.
      if (!isLeadIdShaped(leadId)) {
        settlePin(null, INVALID_ID_REASON);
        return;
      }

      let row: DeepLinkLeadRow | null;
      try {
        row = await fetchDeepLinkLeadRow(leadId);
      } catch {
        if (!cancelled) settlePin(null, LOOKUP_FAILED_REASON);
        return;
      }
      if (cancelled) return;

      const lookupReason = deriveDeepLinkReason(row);
      if (lookupReason.kind !== 'expected_listed') {
        settlePin(row, lookupReason);
        return;
      }

      // The lead belongs here but the cached list predates it — refresh and re-check.
      await queryClient.refetchQueries({ queryKey: LEADS_TO_SCHEDULE_QUERY_KEY });
      if (cancelled) return;

      const refreshed =
        queryClient.getQueryData<LeadsToScheduleCache>(LEADS_TO_SCHEDULE_QUERY_KEY)?.leads ?? [];
      if (isListed(refreshed)) {
        settle({ target: leadId, pin: null });
        return;
      }
      settlePin(row, toStillNotListedReason(lookupReason));
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, isListLoading, queryClient]);

  const dismissPin = useCallback(() => setPin(null), []);

  return { targetLeadId, pin, dismissPin };
}
