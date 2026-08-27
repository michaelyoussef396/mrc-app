import { supabase } from '@/integrations/supabase/client';
import { toDisplayTitleCase } from '@/lib/utils/displayFormat';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Google review destination (g.page short link). Single source of truth for
 * every email's review CTA — swap here if the business review URL changes.
 */
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CSmcatb7uSq9EBM/review';

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
  // Sender attribution for email_logs.sent_by. Auto-resolved from the
  // current Supabase session if not explicitly provided. See
  // docs/edge-function-attribution-manifest.md.
  userId?: string;
  // Exactly one of `content` (base64 bytes) or `path` (a URL Resend fetches
  // itself). Report sends use `path` so a multi-MB PDF never travels through
  // the browser or the send-email function's JSON body.
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    content_type: string;
  }>;
  bypassRecipientRateLimit?: boolean;
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

interface SendSlackCustomParams {
  event: 'custom';
  leadId?: string;
  leadName?: string;
  message: string;
}

type SendSlackNotificationParams = SendSlackNewLeadParams | SendSlackGenericParams | SendSlackStatusChangedParams | SendSlackLeadUpdatedParams | SendSlackCustomParams;

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
      <p class="sign-off">Best Regards,<br>The MRC Team – Mould &amp; Restoration Co.</p>
      <table class="sig-table" cellpadding="0" cellspacing="0">
        <tr>
          <td class="sig-logo-cell">
            <img src="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
          </td>
          <td class="sig-details-cell">
            <p class="sig-company">Mould &amp; Restoration Co.</p>
            <p>Phone: <a href="tel:1800954117">1800 954 117</a></p>
            <p>Email: <a href="mailto:admin@mouldandrestoration.com.au">admin@mouldandrestoration.com.au</a></p>
            <p>Website: <a href="https://mouldandrestoration.com.au">mouldandrestoration.com.au</a></p>
            <p>Business Hours: Monday to Sunday: 7:00 AM – 7:00 PM</p>
          </td>
        </tr>
      </table>
      <p class="sig-inquiries">For inquiries, assistance, or bookings, feel free to reach out during business hours.</p>
    </div>
    <div class="footer">
      <p>This email and any attachments are confidential and intended solely for the addressee — if you've received it in error, please notify the sender and delete it.</p>
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
    <p>Hi ${toDisplayTitleCase(data.customerName)},</p>
    <p>Your mould inspection has been confirmed. Here are the details:</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${data.date}</td></tr>
        <tr><td>Time</td><td>${data.time}</td></tr>
        <tr><td>Address</td><td>${toDisplayTitleCase(data.address)}</td></tr>
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
    <p>Hi ${toDisplayTitleCase(data.customerName)},</p>
    <p>Great news — your mould inspection report for <strong>${toDisplayTitleCase(data.address)}</strong> has been completed and approved${data.jobNumber ? ` (Ref: ${data.jobNumber})` : ''}.</p>
    <p>Our team has thoroughly reviewed the findings and the report is now ready for you.</p>
    `}
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${toDisplayTitleCase(data.address)}</td></tr>
        ${data.jobNumber ? `<tr><td>Reference</td><td>${data.jobNumber}</td></tr>` : ''}
        <tr><td>Status</td><td style="color:#16a34a; font-weight:600;">Approved &amp; Ready</td></tr>
      </table>
    </div>
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
    <p>Hi ${toDisplayTitleCase(data.customerName)},</p>
    <p>Great news — your mould remediation job at <strong>${toDisplayTitleCase(data.address)}</strong> has been confirmed and scheduled.</p>
    <div class="details-box">
      <table>
        <tr><td>Reference</td><td>${data.leadNumber}</td></tr>
        <tr><td>Dates</td><td>${dateRange}</td></tr>
        <tr><td>Start Time</td><td>${data.startTime} daily</td></tr>
        <tr><td>Duration</td><td>${durationLabel}</td></tr>
        <tr><td>Technician</td><td>${data.technicianName}</td></tr>
        <tr><td>Address</td><td>${toDisplayTitleCase(data.address)}</td></tr>
      </table>
    </div>
    <p><strong>What to expect:</strong></p>
    <p>Our technician will arrive at ${data.startTime} on ${data.firstDate} to begin work. Please ensure access to all affected areas of the property for the duration of the job.</p>
    <p>If you need to reschedule, please call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a> as soon as possible.</p>
  `);
}

export function buildInspectionReminderHtml(data: InspectionReminderData): string {
  return wrapInBrandedTemplate(`
    <h2>Inspection Reminder</h2>
    <p>Hi ${toDisplayTitleCase(data.customerName)},</p>
    <p>This is a friendly reminder that your mould inspection is coming up in <strong>2 days</strong>.</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${data.date}</td></tr>
        <tr><td>Time</td><td>${data.time}</td></tr>
        <tr><td>Address</td><td>${toDisplayTitleCase(data.address)}</td></tr>
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
 *
 * Resolves userId from the current session if the caller didn't pass one,
 * so email_logs.sent_by gets populated for sender attribution.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  let userId = params.userId;
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { ...params, userId },
  });

  if (error) {
    console.error('[Notifications] Email edge function error:', error);
    // FunctionsHttpError sets context to the parsed response body.
    // Extract the server's human-readable message (e.g. rate-limit explanation)
    // instead of the generic "Edge Function returned a non-2xx status code".
    const ctx = (error as { context?: Record<string, unknown> }).context;
    const serverMessage = typeof ctx?.error === 'string' ? ctx.error : undefined;
    throw new Error(serverMessage || error.message || 'Email edge function error');
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
// ============================================================================
// JOB REPORT EMAIL
// ============================================================================

export function buildJobReportEmailHtml(params: {
  customerName: string;
  propertyAddress: string;
  jobNumber: string;
  completionDate: string;
  technicianName?: string;
  pdfUrl: string;
  customMessage?: string;
}): string {
  // When admin provides a customMessage, replace the default "Dear / Please find…" prose
  // while preserving the branded shell, details box, CTA, and disclaimer.
  const customMessageHtml = params.customMessage
    ? params.customMessage.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('\n    ')
    : '';

  return wrapInBrandedTemplate(`
    <h2>Job Completion Report</h2>
    ${customMessageHtml || `
    <p>Dear ${toDisplayTitleCase(params.customerName)},</p>
    <p>Please find your job completion report for the remediation work carried out at:</p>
    `}
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${toDisplayTitleCase(params.propertyAddress)}</td></tr>
        <tr><td>Job Number</td><td>${params.jobNumber}</td></tr>
        <tr><td>Completion Date</td><td>${params.completionDate}</td></tr>
        ${params.technicianName ? `<tr><td>Technician</td><td>${params.technicianName}</td></tr>` : ''}
      </table>
    </div>
    <p style="margin-top:24px;">
      <a href="${params.pdfUrl}" class="cta-button">View Job Report</a>
    </p>
    <p>This report includes before and after photos, treatment methods used, and our warranty conditions.
    If you have any questions, contact us at <strong>1800 954 117</strong> or reply to this email.</p>
  `);
}

export async function sendJobReportEmail(params: {
  leadId: string;
  customerEmail: string;
  customerName: string;
  propertyAddress: string;
  jobNumber: string;
  completionDate: string;
  technicianName: string;
  pdfUrl: string;
}): Promise<void> {
  const html = buildJobReportEmailHtml(params);
  await sendEmail({
    to: params.customerEmail,
    subject: `Job Completion Report — ${params.jobNumber}`,
    html,
    leadId: params.leadId,
    templateName: 'job_report_sent',
  });
}

// ============================================================================
// FAN-OUT NOTIFICATIONS (in-app) — additive, RPC-backed
// ============================================================================
//
// Mirrors a subset of Slack events into public.notifications via the
// fan_out_notification RPC, so admins/technicians get an in-app + realtime
// notification, not just a Slack message. See docs/NOTIFICATIONS_INVESTIGATION.md
// for the full Slack event inventory this fans out from.
//
// fan_out_notification ships in a migration Michael applies by hand (never
// auto-applied), so until then it is also absent from the generated Database
// types. FanOutRpcClient is a narrow local type that lets us call it without
// hand-editing the generated src/integrations/supabase/types.ts.

/** Admin leads list — landing page for events with no single lead to deep-link to. */
const ADMIN_LEADS_LIST_PATH = '/admin/leads';

/** Lead detail route, confirmed against src/App.tsx (`path="/leads/:id"`). */
const LEAD_DETAIL_PATH_PREFIX = '/leads/';

function buildLeadDetailPath(leadId: string): string {
  return `${LEAD_DETAIL_PATH_PREFIX}${leadId}`;
}

export interface FanOutParams {
  type: string;
  title: string;
  message: string;
  leadId?: string | null;
  actionUrl?: string | null;
  priority?: 'normal' | 'high';
  metadata?: Record<string, unknown> | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

/**
 * Maps a Slack notification event to its in-app notification, or null when the
 * event has no in-app equivalent — 'custom' events (invoice/payment notices build
 * their own FanOutParams directly, see notifyInvoiceSent/notifyPaymentReceived)
 * and any event not yet wired (report_ready, report_approved stay Slack-only
 * dead code, untouched by design).
 */
export function buildNotificationFromSlackEvent(params: SendSlackNotificationParams): FanOutParams | null {
  switch (params.event) {
    case 'new_lead': {
      const message = [params.full_name, params.suburb, params.phone]
        .filter((part): part is string => Boolean(part))
        .join(' — ');
      return {
        type: 'new_lead',
        title: 'New lead received',
        message,
        leadId: params.leadId ?? null,
        actionUrl: ADMIN_LEADS_LIST_PATH,
        priority: 'high',
        // Deliberately NOT { ...params }: the full payload (email, address,
        // issue description) would be duplicated into one stored row per
        // recipient. The message already carries name/suburb/phone; keep
        // metadata to routing-relevant fields, matching the Framer EF writer.
        metadata: {
          lead_source: params.lead_source ?? null,
          preferred_date: params.preferred_date ?? null,
          preferred_time: params.preferred_time ?? null,
        },
      };
    }

    case 'inspection_booked': {
      const message = [params.leadName, params.propertyAddress, params.technicianName, params.bookingDate]
        .filter((part): part is string => Boolean(part))
        .join(' — ');
      return {
        type: 'inspection_booked',
        title: 'Inspection booked',
        message,
        leadId: params.leadId ?? null,
        actionUrl: params.leadId ? buildLeadDetailPath(params.leadId) : null,
        priority: 'normal',
      };
    }

    case 'status_changed': {
      return {
        type: 'status_changed',
        title: 'Lead status changed',
        message: `${params.leadName}: ${params.oldStatusLabel} → ${params.newStatusLabel}`,
        leadId: params.leadId,
        actionUrl: buildLeadDetailPath(params.leadId),
        priority: 'normal',
        metadata: {
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          oldStatusLabel: params.oldStatusLabel,
          newStatusLabel: params.newStatusLabel,
          propertyAddress: params.propertyAddress,
        },
      };
    }

    case 'lead_updated': {
      return {
        type: 'lead_updated',
        title: 'Lead details updated',
        message: `${params.leadName} — fields: ${params.changedFields}`,
        leadId: params.leadId,
        actionUrl: buildLeadDetailPath(params.leadId),
        priority: 'normal',
      };
    }

    default:
      return null;
  }
}

/** Narrow local shape for the pending fan_out_notification RPC — see section note above. */
interface FanOutRpcClient {
  rpc(fn: 'fan_out_notification', args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Fires the fan_out_notification RPC. Fire-and-forget: every error (including
 * "function does not exist" before the migration lands) is caught and logged,
 * never thrown, so a failure here can never break Slack or the calling flow.
 */
export async function fanOutNotification(params: FanOutParams): Promise<void> {
  try {
    const { error } = await (supabase as unknown as FanOutRpcClient).rpc('fan_out_notification', {
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_lead_id: params.leadId ?? null,
      p_action_url: params.actionUrl ?? null,
      p_priority: params.priority ?? 'normal',
      p_metadata: params.metadata ?? null,
      p_related_entity_type: params.relatedEntityType ?? null,
      p_related_entity_id: params.relatedEntityId ?? null,
    });

    if (error) {
      console.error('[Notifications] fan_out_notification RPC error:', error);
    }
  } catch (err) {
    console.error('[Notifications] fan_out_notification RPC error:', err);
  }
}

// ============================================================================
// INVOICE EMAIL
// ============================================================================

export async function sendSlackNotification(params: SendSlackNotificationParams): Promise<void> {
  try {
    // Fan out the in-app copy BEFORE the Slack invoke so a thrown invoke
    // rejection cannot skip it — the two channels must fail independently.
    const mapped = buildNotificationFromSlackEvent(params);
    if (mapped) void fanOutNotification(mapped);

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

// ============================================================================
// GOOGLE REVIEW EMAIL
// ============================================================================

export interface GoogleReviewEmailParams {
  customerName: string;
  jobNumber: string;
}

export function buildGoogleReviewEmailHtml(params: GoogleReviewEmailParams): string {
  return wrapInBrandedTemplate(`
    <h2>Thank You — Would You Leave Us a Review?</h2>
    <p>Dear ${toDisplayTitleCase(params.customerName)},</p>
    <p>Thank you for trusting Mould &amp; Restoration Co. with your remediation work (${params.jobNumber}). We hope you're thrilled with the result.</p>
    <p>Your feedback means the world to small businesses like ours. If you have 30 seconds, a quick Google review would genuinely make our day:</p>
    <p style="margin-top:24px;text-align:center;">
      <a href="${GOOGLE_REVIEW_URL}" class="cta-button">Leave us a Google Review</a>
    </p>
    <p>If anything's not quite right, please reply to this email or call us on <strong>1800 954 117</strong> — we'll make it right.</p>
    <p>Thanks again,<br>The MRC Team</p>
    <p style="font-size:13px;color:#666;margin-top:20px;">If you'd prefer not to receive follow-ups like this, reply STOP to this email.</p>
  `);
}

export async function sendGoogleReviewEmail(params: {
  leadId: string;
  customerEmail: string;
  customerName: string;
  jobNumber: string;
}): Promise<void> {
  const html = buildGoogleReviewEmailHtml({ customerName: params.customerName, jobNumber: params.jobNumber });
  await sendEmail({
    to: params.customerEmail,
    subject: `Thank you for choosing Mould & Restoration Co. — We'd love your feedback`,
    html,
    leadId: params.leadId,
    templateName: 'google_review_request',
  });
}

// ============================================================================
// INVOICE SLACK HELPERS
// ============================================================================

export async function notifyInvoiceSent(params: {
  leadId: string;
  leadName: string;
  invoiceNumber: string;
  totalAmount: number;
}): Promise<void> {
  try {
    await sendSlackNotification({
      event: 'custom',
      leadId: params.leadId,
      leadName: params.leadName,
      message: `💰 Invoice ${params.invoiceNumber} marked as sent for ${params.leadName} — $${params.totalAmount.toFixed(2)}`,
    });
    void fanOutNotification({
      type: 'invoice_sent',
      title: 'Invoice sent',
      message: `💰 Invoice ${params.invoiceNumber} marked as sent for ${params.leadName} — $${params.totalAmount.toFixed(2)}`,
      leadId: params.leadId,
      priority: 'normal',
      metadata: { invoiceNumber: params.invoiceNumber, totalAmount: params.totalAmount },
    });
  } catch (err) {
    console.error('[Notifications] notifyInvoiceSent failed:', err);
  }
}

export async function notifyPaymentReceived(params: {
  leadId: string;
  leadName: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentMethod: string;
}): Promise<void> {
  try {
    await sendSlackNotification({
      event: 'custom',
      leadId: params.leadId,
      leadName: params.leadName,
      message: `✅ Payment received for ${params.invoiceNumber} from ${params.leadName} — $${params.totalAmount.toFixed(2)} via ${params.paymentMethod}`,
    });
    void fanOutNotification({
      type: 'payment_received',
      title: 'Payment received',
      message: `✅ Payment received for ${params.invoiceNumber} from ${params.leadName} — $${params.totalAmount.toFixed(2)} via ${params.paymentMethod}`,
      leadId: params.leadId,
      priority: 'normal',
      metadata: { invoiceNumber: params.invoiceNumber, totalAmount: params.totalAmount, paymentMethod: params.paymentMethod },
    });
  } catch (err) {
    console.error('[Notifications] notifyPaymentReceived failed:', err);
  }
}

export async function notifyInvoiceOverdue(params: {
  leadId: string;
  leadName: string;
  invoiceNumber: string;
  totalAmount: number;
  daysOverdue: number;
}): Promise<void> {
  try {
    await sendSlackNotification({
      event: 'custom',
      leadId: params.leadId,
      leadName: params.leadName,
      message: `⏰ Invoice ${params.invoiceNumber} for ${params.leadName} is ${params.daysOverdue} days overdue — $${params.totalAmount.toFixed(2)}`,
    });
  } catch (err) {
    console.error('[Notifications] notifyInvoiceOverdue failed:', err);
  }
}
