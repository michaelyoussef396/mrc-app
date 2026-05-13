// Single source of truth: DB column name → human-readable label.
// Used by the activity-log diff system to render descriptions and metadata
// changes in a consistent, lead-attached field vocabulary.
//
// When a new editable column is added anywhere a lead-attached writer touches,
// add its label here so the activity timeline doesn't fall back to raw snake_case.

export const FIELD_LABELS: Record<string, string> = {
  // leads — contact
  full_name: 'Name',
  phone: 'Phone',
  email: 'Email',

  // leads — property
  property_address_street: 'Street Address',
  property_address_suburb: 'Suburb',
  property_address_state: 'State',
  property_address_postcode: 'Postcode',
  property_lat: 'Latitude',
  property_lng: 'Longitude',
  property_type: 'Property Type',
  property_zone: 'Property Zone',

  // leads — lead details
  lead_source: 'Lead Source',
  lead_source_other: 'Other Source',
  urgency: 'Urgency',
  issue_description: 'Issue Description',

  // leads — customer requests
  access_instructions: 'Access Instructions',
  special_requests: 'Special Requests',
  internal_notes: 'Internal Notes',

  // leads — pipeline / status
  status: 'Status',
  assigned_to: 'Assigned Technician',
  inspection_scheduled_date: 'Inspection Date',
  scheduled_time: 'Inspection Time',
  scheduled_dates: 'Scheduled Dates',
  booked_at: 'Booked At',
  inspection_completed_date: 'Inspection Completed',
  job_scheduled_date: 'Job Scheduled',
  job_completed_date: 'Job Completed',
  invoice_amount: 'Invoice Amount',
  invoice_sent_date: 'Invoice Sent',
  payment_received_date: 'Payment Received',
  report_pdf_url: 'Report PDF',
  quoted_amount: 'Quoted Amount',

  // leads — customer preferences (never cleared)
  customer_preferred_date: 'Customer Preferred Date',
  customer_preferred_time: 'Customer Preferred Time',
};

/**
 * Resolve a DB column name to its human-readable label.
 * Falls back to title-cased snake_case if no mapping exists, so unknown columns
 * still render legibly in the timeline while signalling the gap.
 */
export function getFieldLabel(column: string): string {
  const mapped = FIELD_LABELS[column];
  if (mapped) return mapped;
  return column
    .split('_')
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

const DIFF_DISPLAY_LIMIT = 60;

/**
 * Format a value for inclusion in an activity-log description string.
 * Truncates strings/JSON beyond DIFF_DISPLAY_LIMIT so the description stays
 * scannable. The full untruncated value lives in metadata.changes for recovery.
 */
export function formatDiffValueForDescription(
  value: unknown,
): string {
  if (value === null || value === undefined || value === '') return "''";
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const truncated =
      value.length > DIFF_DISPLAY_LIMIT
        ? `${value.slice(0, DIFF_DISPLAY_LIMIT)}…`
        : value;
    // collapse internal newlines so single-line description renders cleanly
    return `'${truncated.replace(/\s*\n\s*/g, ' ')}'`;
  }
  const json = JSON.stringify(value);
  return json.length > DIFF_DISPLAY_LIMIT
    ? `${json.slice(0, DIFF_DISPLAY_LIMIT)}…`
    : json;
}
