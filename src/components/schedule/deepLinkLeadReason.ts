import { supabase } from '@/integrations/supabase/client';
import { formatDateAU } from '@/lib/dateUtils';
import { formatTimeLabel } from '@/lib/utils/timeOfDay';

/**
 * Why a deep-linked lead (/admin/schedule?lead={id}) is not in the To Schedule rail,
 * and what the pinned card shows about it instead.
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
  lead_number: string | null;
  status: string;
  assigned_to: string | null;
  archived_at: string | null;
  property_address_street: string | null;
  property_address_suburb: string | null;
  inspection_scheduled_date: string | null;
  scheduled_time: string | null;
  job_scheduled_date: string | null;
}

export type DeepLinkReasonKind =
  | 'invalid_id'
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

/** Booking on the pinned lead, already formatted for Australian display. */
export interface PinnedLeadBooking {
  label: string;
  date: string;
  time: string | null;
  technicianName: string | null;
}

/** Everything the pinned card renders. Derived here so the component stays a renderer. */
export interface PinnedLeadView {
  leadId: string;
  name: string;
  leadNumber: string | null;
  address: string | null;
  statusLabel: string | null;
  booking: PinnedLeadBooking | null;
  reasonText: string;
  canViewLead: boolean;
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kinds where there is no lead behind the link, so offering "View lead" would dead-end. */
const KINDS_WITHOUT_A_LEAD: ReadonlySet<DeepLinkReasonKind> = new Set(['not_found', 'invalid_id']);

export const LOOKUP_FAILED_REASON: DeepLinkReason = {
  kind: 'lookup_failed',
  leadName: null,
  assignedTo: null,
  status: null,
};

export const INVALID_ID_REASON: DeepLinkReason = {
  kind: 'invalid_id',
  leadName: null,
  assignedTo: null,
  status: null,
};

/** A malformed id is a broken link, not a missing lead — Postgres would reject it as 22P02. */
export function isLeadIdShaped(leadId: string): boolean {
  return UUID_PATTERN.test(leadId.trim());
}

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
    case 'invalid_id':
      return "That link is broken — the lead id in it isn't valid";
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
      return `Not in the To Schedule list (status: ${humaniseStatus(reason.status) ?? 'unknown'})`;
  }
}

interface BuildPinnedLeadViewParams {
  leadId: string;
  row: DeepLinkLeadRow | null;
  reason: DeepLinkReason;
  technicianName: string | null;
}

export function buildPinnedLeadView({
  leadId,
  row,
  reason,
  technicianName,
}: BuildPinnedLeadViewParams): PinnedLeadView {
  return {
    leadId,
    name: toText(row?.full_name).trim() || 'Unknown lead',
    leadNumber: toOptionalText(row?.lead_number),
    address: toOptionalText(
      [row?.property_address_street, row?.property_address_suburb]
        .map((part) => toText(part).trim())
        .filter(Boolean)
        .join(', '),
    ),
    statusLabel: humaniseStatus(row?.status),
    booking: toPinnedBooking(row, technicianName),
    reasonText: describeDeepLinkReason(reason, technicianName),
    canViewLead: !KINDS_WITHOUT_A_LEAD.has(reason.kind),
  };
}

/** One line for the booking, e.g. "Inspection 31/08/2026 at 12:45 PM with Clayton Jenkins". */
export function describePinnedBooking(booking: PinnedLeadBooking): string {
  const parts = [booking.label, booking.date];
  if (booking.time) parts.push(`at ${booking.time}`);
  if (booking.technicianName) parts.push(`with ${booking.technicianName}`);
  return parts.join(' ');
}

export async function fetchDeepLinkLeadRow(leadId: string): Promise<DeepLinkLeadRow | null> {
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, full_name, lead_number, status, assigned_to, archived_at, property_address_street, property_address_suburb, inspection_scheduled_date, scheduled_time, job_scheduled_date',
    )
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function isInRailPopulation(row: DeepLinkLeadRow): boolean {
  const isUnassignedNewLead = RAIL_NEW_LEAD_STATUSES.has(row.status) && !row.assigned_to;
  return isUnassignedNewLead || row.status === RAIL_JOB_STATUS;
}

/**
 * An inspection booking wins over a job booking: a lead that has both was inspected
 * first, and the job date is the later of the two only once the inspection is done.
 * Both share the single scheduled_time column.
 */
function toPinnedBooking(
  row: DeepLinkLeadRow | null,
  technicianName: string | null,
): PinnedLeadBooking | null {
  if (!row) return null;

  const inspectionDate = formatDateAU(row.inspection_scheduled_date);
  const jobDate = formatDateAU(row.job_scheduled_date);
  const label = inspectionDate ? 'Inspection' : 'Job';
  const date = inspectionDate || jobDate;
  // formatDateAU returns '' for an unparseable date; a booking line with a blank
  // date reads as a rendering bug, so drop the whole block instead.
  if (!date) return null;

  return {
    label,
    date,
    time: toOptionalText(formatTimeLabel(row.scheduled_time)),
    technicianName,
  };
}

/**
 * Statuses are rendered as their own text. Four DB statuses have no entry in
 * statusFlow, so indexing any status map here would render undefined.
 */
function humaniseStatus(status: string | null | undefined): string | null {
  const raw = toText(status).trim();
  if (raw === '') return null;
  const spaced = raw.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toOptionalText(value: string | null | undefined): string | null {
  return toText(value).trim() || null;
}

function toText(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}
