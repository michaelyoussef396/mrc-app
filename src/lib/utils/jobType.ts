/**
 * Booking event_type values are free text from calendar_bookings; remediation
 * jobs have historically been stored as 'job', 'removal' or variants of both.
 * Anything else is treated as an inspection.
 */
export function isRemediationJob(eventType: string | null | undefined): boolean {
  const normalized = (eventType ?? '').toLowerCase();
  return normalized.includes('job') || normalized.includes('removal');
}
