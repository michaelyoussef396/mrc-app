import { supabase } from '@/integrations/supabase/client';

/**
 * Why a deep-linked lead (/admin/schedule?lead={id}) is not in the To Schedule rail.
 *
 * The rail lists only leads it can book from scratch — unassigned new leads and
 * jobs awaiting booking. Every "Schedule" / "Reschedule" button elsewhere assumes a
 * broader population, so an id can arrive that the rail will never show. Before this
 * module that produced silence; now it produces a specific reason. This is a single
 * additive lookup by id — the rail's own query and filter are untouched.
 */

export interface DeepLinkLeadRow {
  id: string;
  full_name: string;
  status: string;
  assigned_to: string | null;
  archived_at: string | null;
}

export type DeepLinkReasonKind =
  | 'not_found'
  | 'lookup_failed'
  | 'archived'
  | 'assigned'
  | 'booked'
  | 'closed'
  | 'not_listed'
  | 'expected_listed'
  | 'still_not_listed';

export interface DeepLinkReason {
  kind: DeepLinkReasonKind;
  leadName: string | null;
  /** Technician holding the lead, resolved to a display name at render time. */
  assignedTo: string | null;
  /** Raw status, for the reason text of statuses with no dedicated message. */
  status: string | null;
}

/**
 * NOTE: this mirrors the rail's population rule, which lives in the query in
 * useLeadsToSchedule (a lead is listed when its status is new_lead or hipages_lead
 * AND no technician is assigned, OR its status is job_waiting — and in every case
 * it is not archived). The rule is duplicated rather than shared because that hook
 * is frozen for a pending deploy; the archived check below is part of the same
 * mirror. If the rail's filter changes, change these three constants with it.
 */
const RAIL_NEW_LEAD_STATUSES: ReadonlySet<string> = new Set(['new_lead', 'hipages_lead']);
const RAIL_JOB_STATUS = 'job_waiting';

/**
 * Statuses that mean an inspection or job is already on the calendar. Listed
 * explicitly rather than derived from ALL_STATUSES, which is a display order and
 * omits the legacy DB statuses inspection_completed / inspection_report_pdf_completed.
 */
const BOOKED_STATUSES: ReadonlySet<string> = new Set([
  'inspection_waiting',
  'inspection_ai_summary',
  'approve_inspection_report',
  'inspection_email_approval',
  'inspection_completed',
  'inspection_report_pdf_completed',
  'job_scheduled',
  'job_completed',
  'pending_review',
  'job_report_pdf_sent',
  'invoicing_sent',
  'paid',
  'google_review',
]);

const CLOSED_STATUSES: ReadonlySet<string> = new Set(['finished', 'closed', 'not_landed']);

export const LOOKUP_FAILED_REASON: DeepLinkReason = {
  kind: 'lookup_failed',
  leadName: null,
  assignedTo: null,
  status: null,
};

export function deriveDeepLinkReason(row: DeepLinkLeadRow | null): DeepLinkReason {
  if (!row) {
    return { kind: 'not_found', leadName: null, assignedTo: null, status: null };
  }

  const base = {
    leadName: row.full_name || null,
    assignedTo: row.assigned_to,
    status: row.status,
  };

  if (row.archived_at) return { ...base, kind: 'archived' };
  if (isInRailPopulation(row)) return { ...base, kind: 'expected_listed' };
  if (RAIL_NEW_LEAD_STATUSES.has(row.status) && row.assigned_to) return { ...base, kind: 'assigned' };
  if (CLOSED_STATUSES.has(row.status)) return { ...base, kind: 'closed' };
  if (BOOKED_STATUSES.has(row.status)) return { ...base, kind: 'booked' };
  return { ...base, kind: 'not_listed' };
}

/**
 * The lookup said the lead belongs in the rail, but it was still absent after a
 * refresh — it was almost certainly assigned or booked in between.
 */
export function toStillNotListedReason(reason: DeepLinkReason): DeepLinkReason {
  return { ...reason, kind: 'still_not_listed' };
}

/** Human-readable reason. Separate from derivation so the technician name can be resolved late. */
export function describeDeepLinkReason(
  reason: DeepLinkReason,
  technicianName: string | null,
): string {
  switch (reason.kind) {
    case 'not_found':
      return 'Lead not found';
    case 'lookup_failed':
      return "Couldn't look up that lead — check your connection and try the link again";
    case 'archived':
      return 'Archived';
    case 'assigned':
      return `Assigned to ${technicianName ?? 'another technician'} — clear the assignment to book from here`;
    case 'booked':
      return 'Already booked — reschedule from the lead page';
    case 'closed':
      return 'Closed — reopen the lead from its page to book again';
    case 'expected_listed':
      return 'Not in the list yet — refreshing';
    case 'still_not_listed':
      return 'Still not in the list after refreshing — it may have just been assigned or booked';
    case 'not_listed':
      return `Not in the To Schedule list (status: ${(reason.status ?? 'unknown').replace(/_/g, ' ')})`;
  }
}

function isInRailPopulation(row: DeepLinkLeadRow): boolean {
  const isUnassignedNewLead = RAIL_NEW_LEAD_STATUSES.has(row.status) && !row.assigned_to;
  return isUnassignedNewLead || row.status === RAIL_JOB_STATUS;
}

export async function fetchDeepLinkLeadRow(leadId: string): Promise<DeepLinkLeadRow | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, full_name, status, assigned_to, archived_at')
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
