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
}

interface SendSlackNotificationParams {
  event: 'new_lead' | 'inspection_booked' | 'report_ready' | 'report_approved';
  leadId?: string;
  leadName?: string;
  propertyAddress?: string;
  technicianName?: string;
  bookingDate?: string;
  additionalInfo?: Record<string, string>;
}

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
  .footer { background: #f8f9fa; border-top: 1px solid #e9ecef; padding: 24px; text-align: center; }
  .footer p { margin: 0 0 6px; font-size: 12px; color: #888; }
  .footer a { color: #121D73; text-decoration: none; }
  .footer .company { font-weight: 600; color: #555; font-size: 13px; }
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
    <div class="footer">
      <p class="company">Mould &amp; Restoration Co.</p>
      <p>Melbourne, Australia</p>
      <p>Phone: <a href="tel:0433880403">0433 880 403</a></p>
      <p style="margin-top:12px; font-size:11px; color:#aaa;">This is an automated message. Please do not reply directly to this email.</p>
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
}

export interface JobStartedData {
  customerName: string;
  address: string;
}

export interface JobCompletedData {
  customerName: string;
  address: string;
}

export interface JobBookedTechnicianData {
  clientName: string;
  date: string;
  time: string;
  property: string;
  suburb: string;
  quoteAmount?: number;
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
    <p>Our technician will arrive at the scheduled time to conduct a thorough mould inspection of your property. The inspection typically takes 1-2 hours depending on the property size.</p>
    <p>Please ensure access to all areas of the property, including any subfloor or roof spaces if applicable.</p>
    <p style="margin-top:24px;">Need to reschedule? Call us on <a href="tel:0433880403" style="color:#121D73; font-weight:600;">0433 880 403</a></p>
  `);
}

export function buildReportApprovedHtml(data: ReportApprovedData): string {
  return wrapInBrandedTemplate(`
    <h2>Your Inspection Report is Ready</h2>
    <p>Hi ${data.customerName},</p>
    <p>Great news — your mould inspection report for <strong>${data.address}</strong> has been completed and approved${data.jobNumber ? ` (Ref: ${data.jobNumber})` : ''}.</p>
    <p>Our team has thoroughly reviewed the findings and the report is now ready for you.</p>
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${data.address}</td></tr>
        ${data.jobNumber ? `<tr><td>Reference</td><td>${data.jobNumber}</td></tr>` : ''}
        <tr><td>Status</td><td style="color:#16a34a; font-weight:600;">Approved &amp; Ready</td></tr>
      </table>
    </div>
    <p>If you have any questions about the report or would like to discuss remediation options, please don't hesitate to get in touch.</p>
    <p style="margin-top:24px;">
      <a href="tel:0433880403" class="cta-button">Call Us to Discuss</a>
    </p>
  `);
}

export function buildJobStartedHtml(data: JobStartedData): string {
  return wrapInBrandedTemplate(`
    <h2>Service Has Started</h2>
    <p>Hi ${data.customerName},</p>
    <p>We're writing to let you know that our technician has arrived at <strong>${data.address}</strong> and has started the mould remediation service.</p>
    <p>We'll keep you updated on the progress. If you have any questions in the meantime, please don't hesitate to contact us.</p>
    <p style="margin-top:24px;">
      <a href="tel:0433880403" style="color:#121D73; font-weight:600;">0433 880 403</a>
    </p>
  `);
}

export function buildJobCompletedHtml(data: JobCompletedData): string {
  return wrapInBrandedTemplate(`
    <h2>Service Complete</h2>
    <p>Hi ${data.customerName},</p>
    <p>The mould remediation service at <strong>${data.address}</strong> has been completed.</p>
    <p>You will receive your detailed inspection report shortly. The report will include our findings, photos, and any recommendations for ongoing maintenance.</p>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p style="margin-top:24px;">
      <a href="tel:0433880403" class="cta-button">Contact Us</a>
    </p>
  `);
}

export function buildJobBookedTechnicianHtml(data: JobBookedTechnicianData): string {
  return wrapInBrandedTemplate(`
    <h2>New Job Booked</h2>
    <p>A new inspection has been scheduled. Please review the details below:</p>
    <div class="details-box">
      <table>
        <tr><td>Client</td><td>${data.clientName}</td></tr>
        <tr><td>Date</td><td>${data.date}</td></tr>
        <tr><td>Time</td><td>${data.time}</td></tr>
        <tr><td>Property</td><td>${data.property}, ${data.suburb}</td></tr>
        ${data.quoteAmount != null ? `<tr><td>Quote</td><td>$${data.quoteAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</td></tr>` : ''}
      </table>
    </div>
    <p>Please ensure you arrive on time with all required equipment.</p>
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
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) {
      console.error('[Notifications] Email edge function error:', error);
      return;
    }

    if (data && !data.success) {
      console.error('[Notifications] Email send failed:', data.error);
      return;
    }

    console.log('[Notifications] Email sent to', params.to);
  } catch (err) {
    console.error('[Notifications] Email send error:', err);
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

    console.log('[Notifications] Slack notification sent:', params.event);
  } catch (err) {
    console.error('[Notifications] Slack notification error:', err);
  }
}
