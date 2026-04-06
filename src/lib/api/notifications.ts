import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  leadId?: string;
  inspectionId?: string;
  templateName?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    content_type: string;
  }>;
}

interface SendSlackNewLeadParams {
  event: 'new_lead';
  leadId?: string;
  full_name: string;
  phone?: string;
  email?: string;
  street_address?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  issue_description?: string;
  lead_source?: string;
  preferred_date?: string;
  preferred_time?: string;
  created_at?: string;
}

interface SendSlackGenericParams {
  event: 'inspection_booked' | 'report_ready' | 'report_approved';
  leadId?: string;
  leadName?: string;
  propertyAddress?: string;
  technicianName?: string;
  bookingDate?: string;
}

interface SendSlackStatusChangedParams {
  event: 'status_changed';
  leadId: string;
  leadName: string;
  propertyAddress?: string;
  oldStatus: string;
  newStatus: string;
  oldStatusLabel: string;
  newStatusLabel: string;
}

interface SendSlackLeadUpdatedParams {
  event: 'lead_updated';
  leadId: string;
  leadName: string;
  changedFields: string;
}

type SendSlackNotificationParams = SendSlackNewLeadParams | SendSlackGenericParams | SendSlackStatusChangedParams | SendSlackLeadUpdatedParams;

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

/**
 * Wraps email body content in the branded MRC layout.
 * Navy header (#121D73), white body, grey footer with contact info.
 * Mobile-responsive at 600px breakpoint.
 */
function wrapInBrandedTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; -webkit-text-size-adjust: 100%; }
  .wrapper { width: 100%; background: #f4f4f5; padding: 24px 0; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .header { background: #121D73; padding: 28px 24px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
  .header p { margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }
  .body { padding: 32px 24px; }
  .body h2 { margin: 0 0 16px; color: #121D73; font-size: 20px; }
  .body p { margin: 0 0 14px; font-size: 15px; color: #333; }
  .details-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .details-box table { width: 100%; border-collapse: collapse; }
  .details-box td { padding: 6px 0; font-size: 14px; vertical-align: top; }
  .details-box td:first-child { font-weight: 600; color: #555; width: 120px; white-space: nowrap; padding-right: 12px; }
  .details-box td:last-child { color: #1d1d1f; }
  .cta-button { display: inline-block; background: #121D73; color: #ffffff !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0; }
  .signature { padding: 24px 24px 16px; border-top: 1px solid #e9ecef; background: #f8f9fa; }
  .sign-off { font-size: 15px; color: #333; font-weight: 600; margin: 0 0 16px; line-height: 1.5; }
  .sig-table { width: 100%; border-collapse: collapse; }
  .sig-logo-cell { width: 130px; vertical-align: top; padding-right: 16px; }
  .sig-details-cell { vertical-align: top; }
  .sig-company { font-weight: 700; color: #121D73; font-size: 15px; margin: 0 0 4px !important; }
  .sig-details-cell p { margin: 0 0 2px !important; font-size: 13px; color: #555; }
  .sig-details-cell a { color: #121D73; text-decoration: none; }
  .sig-inquiries { font-size: 13px; color: #666; margin: 14px 0 6px !important; }
  .sig-review { font-size: 13px; margin: 0 !important; }
  .sig-review a { color: #121D73; font-weight: 600; text-decoration: none; }
  .footer { background: #f8f9fa; padding: 0 24px 24px; text-align: center; }
  .footer p { margin: 0; font-size: 11px; color: #999; line-height: 1.5; }
  @media only screen and (max-width: 620px) {
    .container { margin: 0 12px !important; }
    .body { padding: 24px 16px !important; }
    .header { padding: 24px 16px !important; }
    .details-box { padding: 16px !important; }
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <h1>Mould &amp; Restoration Co.</h1>
      <p>Professional Mould Remediation</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="signature">
      <p class="sign-off">Best Regards,<br>The MRC Team – Mould &amp; Restoration Experts</p>
      <table class="sig-table" cellpadding="0" cellspacing="0">
        <tr>
          <td class="sig-logo-cell">
            <img src="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
          </td>
          <td class="sig-details-cell">
            <p class="sig-company">Mould and Restoration Co.</p>
            <p>Phone: <a href="tel:1800954117">1800 954 117</a></p>
            <p>Email: <a href="mailto:admin@mouldandrestoration.com.au">admin@mouldandrestoration.com.au</a></p>
            <p>Website: <a href="https://mouldandrestoration.com.au">mouldandrestoration.com.au</a></p>
            <p>Business Hours: Monday to Sunday: 7:00 AM – 7:00 PM</p>
          </td>
        </tr>
      </table>
      <p class="sig-inquiries">For inquiries, assistance, or bookings, feel free to reach out during business hours.</p>
      <p class="sig-review">Write a Review: <a href="https://g.page/r/CSmcatb7uSq9EBM/review">Leave us a Google Review</a></p>
    </div>
    <div class="footer">
      <p>This email and any attachments are confidential and intended solely for the addressee. If you have received this email in error, please notify the sender immediately and delete it. Mould and Restoration Co. does not accept liability for any damage caused by this email or its attachments.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ============================================================================
// EMAIL TEMPLATES — Pre-built bodies for each workflow
// ============================================================================

export interface BookingConfirmationData {
  customerName: string;
  date: string;
  time: string;
  address: string;
  technicianName?: string;
}

export interface ReportApprovedData {
  customerName: string;
  address: string;
  jobNumber?: string;
  customMessage?: string;
}

export function buildBookingConfirmationHtml(data: BookingConfirmationData): string {
  return wrapInBrandedTemplate(`
    <h2>Booking Confirmed</h2>
    <p>Hi ${data.customerName},</p>
    <p>Your mould inspection has been confirmed. Here are the details:</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${data.date}</td></tr>
        <tr><td>Time</td><td>${data.time}</td></tr>
        <tr><td>Address</td><td>${data.address}</td></tr>
        ${data.technicianName ? `<tr><td>Technician</td><td>${data.technicianName}</td></tr>` : ''}
      </table>
    </div>
    <p><strong>What to expect:</strong></p>
    <p>Our technician will arrive at the scheduled time to conduct a thorough mould inspection of your property. The inspection takes a maximum of 1 hour.</p>
    <p>Please ensure access to all areas of the property, including any subfloor or roof spaces if applicable.</p>
    <p style="margin-top:24px;">Need to reschedule? Call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a></p>
  `);
}

export function buildReportApprovedHtml(data: ReportApprovedData): string {
  // Convert custom message newlines to <p> tags for proper email rendering
  const customMessageHtml = data.customMessage
    ? data.customMessage.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('\n    ')
    : '';

  return wrapInBrandedTemplate(`
    <h2>Your Inspection Report is Ready</h2>
    ${customMessageHtml || `
    <p>Hi ${data.customerName},</p>
    <p>Great news — your mould inspection report for <strong>${data.address}</strong> has been completed and approved${data.jobNumber ? ` (Ref: ${data.jobNumber})` : ''}.</p>
    <p>Our team has thoroughly reviewed the findings and the report is now ready for you.</p>
    `}
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${data.address}</td></tr>
        ${data.jobNumber ? `<tr><td>Reference</td><td>${data.jobNumber}</td></tr>` : ''}
        <tr><td>Status</td><td style="color:#16a34a; font-weight:600;">Approved &amp; Ready</td></tr>
      </table>
    </div>
    <p>If you have any questions about the report or would like to discuss remediation options, please don't hesitate to get in touch.</p>
    <p style="margin-top:24px;">
      <a href="tel:1800954117" class="cta-button">Call Us to Discuss</a>
    </p>
  `);
}

export interface InspectionReminderData {
  customerName: string;
  date: string;
  time: string;
  address: string;
}

export interface JobBookingConfirmationData {
  customerName: string;
  leadNumber: string;
  address: string;
  firstDate: string;      // e.g. "Tue 7 Apr"
  lastDate: string;       // e.g. "Sun 12 Apr 2026"
  startTime: string;      // e.g. "8:00 AM"
  durationDays: number;
  totalHours: number;
  technicianName: string;
  isSingleDay: boolean;
}

export function buildJobBookingConfirmationHtml(data: JobBookingConfirmationData): string {
  const dateRange = data.isSingleDay ? data.firstDate : `${data.firstDate} – ${data.lastDate}`;
  const durationLabel = `${data.durationDays} ${data.durationDays === 1 ? 'day' : 'days'} (${data.totalHours} hours)`;
  return wrapInBrandedTemplate(`
    <h2>Job Booking Confirmed</h2>
    <p>Hi ${data.customerName},</p>
    <p>Great news — your mould remediation job at <strong>${data.address}</strong> has been confirmed and scheduled.</p>
    <div class="details-box">
      <table>
        <tr><td>Reference</td><td>${data.leadNumber}</td></tr>
        <tr><td>Dates</td><td>${dateRange}</td></tr>
        <tr><td>Start Time</td><td>${data.startTime} daily</td></tr>
        <tr><td>Duration</td><td>${durationLabel}</td></tr>
        <tr><td>Technician</td><td>${data.technicianName}</td></tr>
        <tr><td>Address</td><td>${data.address}</td></tr>
      </table>
    </div>
    <p><strong>What to expect:</strong></p>
    <p>Our technician will arrive at ${data.startTime} on ${data.firstDate} to begin work. Please ensure access to all affected areas of the property for the duration of the job.</p>
    <p>If you need to reschedule, please call us on <a href="tel:0433553199" style="color:#121D73; font-weight:600;">0433 553 199</a> as soon as possible.</p>
  `);
}

export function buildInspectionReminderHtml(data: InspectionReminderData): string {
  return wrapInBrandedTemplate(`
    <h2>Inspection Reminder</h2>
    <p>Hi ${data.customerName},</p>
    <p>This is a friendly reminder that your mould inspection is coming up in <strong>2 days</strong>.</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${data.date}</td></tr>
        <tr><td>Time</td><td>${data.time}</td></tr>
        <tr><td>Address</td><td>${data.address}</td></tr>
      </table>
    </div>
    <p><strong>Please ensure:</strong></p>
    <ul style="margin:16px 0;padding:0;list-style:none;">
      <li style="padding:6px 0;font-size:14px;">&#10003; Access is available to all areas of the property</li>
      <li style="padding:6px 0;font-size:14px;">&#10003; Pets are secured or kept away from work areas</li>
      <li style="padding:6px 0;font-size:14px;">&#10003; Someone is home or access arrangements are made</li>
    </ul>
    <p style="margin-top:24px;">Need to reschedule? Call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a></p>
  `);
}

// ============================================================================
// SEND HELPERS
// ============================================================================

/**
 * Send an email via the `send-email` Supabase Edge Function.
 * Fire-and-forget — failures are logged, never thrown.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: params,
  });

  if (error) {
    console.error('[Notifications] Email edge function error:', error);
    throw new Error(error.message || 'Email edge function error');
  }

  if (data && !data.success) {
    console.error('[Notifications] Email send failed:', data.error);
    throw new Error(data.error || 'Email send failed');
  }
}

/**
 * Send a Slack notification via the `send-slack-notification` Supabase Edge Function.
 * Fire-and-forget — failures are logged, never thrown.
 */
export async function sendSlackNotification(params: SendSlackNotificationParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-slack-notification', {
      body: params,
    });

    if (error) {
      console.error('[Notifications] Slack edge function error:', error);
      return;
    }

    if (data && !data.success) {
      console.error('[Notifications] Slack notification failed:', data.error);
      return;
    }

  } catch (err) {
    console.error('[Notifications] Slack notification error:', err);
  }
}
