import type { LeadStatus } from '@/lib/statusFlow';

/**
 * The `leads` columns a booking owns.
 *
 * SINGLE SOURCE OF TRUTH for revert clearing. Every surface that walks a lead
 * backwards past its booking — the atomic revert in LeadDetail, the calendar
 * Cancel Booking action, and Leads Management Reactivate — MUST clear this set
 * via `buildBookingRevertUpdates`. Do not re-declare a local field list on any
 * surface: three divergent lists are precisely how a `new_lead` kept a non-null
 * `assigned_to` and vanished from every `assigned_to IS NULL` queue while still
 * showing in the New Lead tab (R8). A fourth list would reopen it.
 *
 * Customer preference columns (`customer_preferred_*`) are deliberately absent —
 * they belong to the customer, not the workflow, and are never cleared.
 */
export const LEAD_BOOKING_FIELDS = [
  'assigned_to',
  'inspection_scheduled_date',
  'scheduled_time',
  'scheduled_dates',
  'booked_at',
  'job_scheduled_date',
] as const;

export type LeadBookingField = (typeof LEAD_BOOKING_FIELDS)[number];

/**
 * Status a cancelled booking returns its lead to, keyed by the calendar event
 * type. A cancelled inspection has no inspection left to run, so the lead goes
 * back to the top of the pipeline; a cancelled job keeps its completed
 * inspection and only needs the job re-booked.
 */
export const CANCELLED_EVENT_REVERT_STATUS: Record<'inspection' | 'job', LeadStatus> = {
  inspection: 'new_lead',
  job: 'job_waiting',
};

/**
 * Build the `leads` UPDATE payload for a revert: the target status plus every
 * booking-owned column nulled.
 */
export function buildBookingRevertUpdates(status: LeadStatus): Record<string, unknown> {
  const updates: Record<string, unknown> = { status };
  for (const field of LEAD_BOOKING_FIELDS) {
    updates[field] = null;
  }
  return updates;
}
