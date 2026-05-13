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

  // inspections — identity / header
  inspector_name: 'Inspector Name',
  inspector_id: 'Inspector',
  job_number: 'Job Number',
  inspection_date: 'Inspection Date',
  requested_by: 'Requested By',
  attention_to: 'Attention To',
  triage_description: 'Triage Description',
  property_occupation: 'Property Occupation',
  dwelling_type: 'Dwelling Type',
  property_address_snapshot: 'Address Snapshot',

  // inspections — outdoor readings
  outdoor_temperature: 'Outdoor Temperature',
  outdoor_humidity: 'Outdoor Humidity',
  outdoor_dew_point: 'Outdoor Dew Point',
  outdoor_comments: 'Outdoor Comments',

  // inspections — mould / cause
  cause_of_mould: 'Cause of Mould',
  additional_info_technician: 'Additional Info (Tech)',
  additional_equipment_comments: 'Equipment Comments',

  // inspections — treatment methods
  treatment_methods: 'Treatment Methods',
  hepa_vac: 'HEPA Vacuuming',
  antimicrobial: 'Antimicrobial Treatment',
  stain_removing_antimicrobial: 'Stain-Removing Antimicrobial',
  home_sanitation_fogging: 'ULV Fogging',
  drying_equipment_enabled: 'Drying Equipment',

  // inspections — equipment
  commercial_dehumidifier_enabled: 'Dehumidifier Enabled',
  commercial_dehumidifier_qty: 'Dehumidifier Qty',
  air_movers_enabled: 'Air Movers Enabled',
  air_movers_qty: 'Air Movers Qty',
  rcd_box_enabled: 'RCD Box Enabled',
  rcd_box_qty: 'RCD Box Qty',
  recommended_dehumidifier: 'Recommended Dehumidifier',
  direction_photos_enabled: 'Direction Photos',

  // inspections — waste / subfloor flags
  waste_disposal_required: 'Waste Disposal Required',
  waste_disposal_amount: 'Waste Disposal Amount',
  subfloor_required: 'Subfloor Required',
  parking_option: 'Parking Option',

  // inspections — labour hours
  no_demolition_hours: 'Non-Demo Hours',
  demolition_hours: 'Demolition Hours',
  subfloor_hours: 'Subfloor Hours',

  // inspections — pricing
  equipment_cost_ex_gst: 'Equipment Cost (ex GST)',
  labour_cost_ex_gst: 'Labour Cost (ex GST)',
  discount_percent: 'Discount %',
  subtotal_ex_gst: 'Subtotal (ex GST)',
  gst_amount: 'GST Amount',
  total_inc_gst: 'Total (inc GST)',
  manual_labour_override: 'Manual Labour Override',
  manual_total_inc_gst: 'Manual Total (inc GST)',
  option_selected: 'Option Selected',
  option_1_labour_ex_gst: 'Option 1 Labour (ex GST)',
  option_1_equipment_ex_gst: 'Option 1 Equipment (ex GST)',
  option_1_total_inc_gst: 'Option 1 Total (inc GST)',
  option_2_total_inc_gst: 'Option 2 Total (inc GST)',

  // inspection_areas — identity
  area_name: 'Area Name',
  area_order: 'Area Order',

  // inspection_areas — environmental readings
  temperature: 'Temperature',
  humidity: 'Humidity',
  dew_point: 'Dew Point',
  internal_moisture: 'Internal Moisture',
  external_moisture: 'External Moisture',

  // inspection_areas — mould observations
  mould_description: 'Mould Description',
  mould_visible_locations: 'Mould Locations',
  mould_visible_custom: 'Mould (Custom)',
  mould_ceiling: 'Mould — Ceiling',
  mould_walls: 'Mould — Walls',
  mould_flooring: 'Mould — Flooring',
  mould_skirting: 'Mould — Skirting',
  mould_cornice: 'Mould — Cornice',
  mould_windows: 'Mould — Windows',
  mould_window_furnishings: 'Mould — Window Furnishings',
  mould_cupboard: 'Mould — Cupboard',
  mould_wardrobe: 'Mould — Wardrobe',
  mould_grout_silicone: 'Mould — Grout/Silicone',
  mould_contents: 'Mould — Contents',
  mould_none_visible: 'No Mould Visible',

  // inspection_areas — infrared
  infrared_enabled: 'Infrared Enabled',
  infrared_observation_no_active: 'IR: No Active Intrusion',
  infrared_observation_water_infiltration: 'IR: Active Water Infiltration',
  infrared_observation_past_ingress: 'IR: Past Water Ingress',
  infrared_observation_condensation: 'IR: Condensation Pattern',
  infrared_observation_missing_insulation: 'IR: Missing Insulation',

  // inspection_areas — job / demo
  job_time_minutes: 'Job Time (mins)',
  demolition_required: 'Demolition Required',
  demolition_time_minutes: 'Demolition Time (mins)',
  demolition_description: 'Demolition Description',
  moisture_readings_enabled: 'Moisture Readings Enabled',

  // inspection_areas — notes
  comments: 'Report Comments',
  internal_office_notes: 'Internal Notes',
  extra_notes: 'Extra Notes',
  primary_photo_id: 'Primary Photo',

  // moisture_readings
  moisture_percentage: 'Moisture %',
  moisture_status: 'Moisture Status',
  reading_order: 'Reading Order',
  title: 'Reading Title',

  // subfloor_data
  observations: 'Subfloor Observations',
  landscape: 'Subfloor Landscape',
  sanitation_required: 'Sanitation Required',
  racking_required: 'Racking Required',
  treatment_time_minutes: 'Treatment Time (mins)',
  comments_approved: 'Comments Approved',

  // subfloor_readings
  location: 'Reading Location',
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
