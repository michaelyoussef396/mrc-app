import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ---------------------------------------------------------------------------
// Branded email template (duplicated from notifications.ts for Deno runtime)
// ---------------------------------------------------------------------------

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
  .checklist { margin: 16px 0; padding: 0; list-style: none; }
  .checklist li { padding: 6px 0; font-size: 14px; color: #333; }
  .checklist li::before { content: "\\2713 "; color: #16a34a; font-weight: 700; margin-right: 6px; }
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
            <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
          </td>
          <td class="sig-details-cell">
            <p class="sig-company">Mould and Restoration Co.</p>
            <p>Phone: <a href="tel:1800954117">1800 954 117</a></p>
            <p>Email: <a href="mailto:admin@mrcsystem.com">admin@mrcsystem.com</a></p>
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

function buildReminderHtml(data: {
  customerName: string;
  date: string;
  time: string;
  address: string;
}): string {
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
    <ul class="checklist">
      <li>Access is available to all areas of the property</li>
      <li>Pets are secured or kept away from work areas</li>
      <li>Someone is home or access arrangements are made</li>
    </ul>
    <p style="margin-top:24px;">Need to reschedule? Call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a></p>
  `);
}

// ---------------------------------------------------------------------------
// Send with retry (reused pattern from send-email/index.ts)
// ---------------------------------------------------------------------------

interface SendResult {
  success: boolean;
  data?: { id: string };
  error?: string;
  status?: number;
}

async function sendWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  maxRetries = 3
): Promise<SendResult> {
  let lastError = '';
  let lastStatus = 500;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      }

      lastError = data?.message || JSON.stringify(data);
      lastStatus = response.status;

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Resend API client error (attempt ${attempt}/${maxRetries}): ${response.status}`, data);
        break;
      }

      console.warn(`Resend API error (attempt ${attempt}/${maxRetries}): ${response.status}`, data);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      lastStatus = 500;
      console.warn(`Resend API network error (attempt ${attempt}/${maxRetries}):`, lastError);
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  return { success: false, error: lastError, status: lastStatus };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req) => {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Query bookings that need reminders
    const { data: bookings, error: queryError } = await supabase
      .from('calendar_bookings')
      .select(`
        id,
        start_datetime,
        location_address,
        lead_id,
        leads!calendar_bookings_lead_id_fkey (
          full_name,
          email,
          property_address_street,
          property_address_suburb
        )
      `)
      .eq('reminder_sent', false)
      .eq('status', 'scheduled')
      .lte('reminder_scheduled_for', new Date().toISOString())
      .not('lead_id', 'is', null);

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query bookings', details: queryError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0, message: 'No pending reminders' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${bookings.length} reminder(s)`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const booking of bookings) {
      const lead = (booking as Record<string, unknown>).leads as {
        full_name: string;
        email: string;
        property_address_street: string;
        property_address_suburb: string;
      } | null;

      if (!lead?.email) {
        console.warn(`Booking ${booking.id}: no customer email, skipping`);
        skipped++;
        continue;
      }

      // Format date/time in Australia/Melbourne timezone
      const startDate = new Date(booking.start_datetime);
      const dateStr = startDate.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Australia/Melbourne',
      });
      const timeStr = startDate.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Melbourne',
      });
      const dayOfWeek = startDate.toLocaleDateString('en-AU', {
        weekday: 'long',
        timeZone: 'Australia/Melbourne',
      });
      const shortDate = startDate.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Australia/Melbourne',
      });

      const address = booking.location_address
        || `${lead.property_address_street}, ${lead.property_address_suburb}`;

      const html = buildReminderHtml({
        customerName: lead.full_name,
        date: dateStr,
        time: timeStr,
        address,
      });

      const subject = `Reminder: Your Mould Inspection \u2014 ${dayOfWeek} ${shortDate}`;

      // Send email
      const result = await sendWithRetry({
        from: 'Mould & Restoration Co <noreply@mrcsystem.com>',
        to: [lead.email],
        subject,
        html,
        reply_to: 'admin@mrcsystem.com',
      }, RESEND_API_KEY);

      // Log to email_logs
      await supabase.from('email_logs').insert({
        recipient_email: lead.email,
        subject,
        template_name: 'inspection_reminder',
        status: result.success ? 'sent' : 'failed',
        provider: 'resend',
        provider_message_id: result.data?.id || null,
        error_message: result.error || null,
        lead_id: booking.lead_id,
        sent_at: new Date().toISOString(),
      });

      if (result.success) {
        // Mark reminder as sent
        await supabase
          .from('calendar_bookings')
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        sent++;
        console.log(`Booking ${booking.id}: reminder sent to ${lead.email}`);
      } else {
        failed++;
        console.error(`Booking ${booking.id}: failed to send reminder - ${result.error}`);
      }
    }

    return new Response(
      JSON.stringify({
        processed: bookings.length,
        sent,
        failed,
        skipped,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reminder function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
