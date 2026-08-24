import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// deps pin: supabase-js declares functions-js ^2.1.5, which floats to a version
// esm.sh has no denonext build for, breaking every deploy. 2.4.4 satisfies the
// same range and builds. Remove once esm.sh serves the newer target.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3?deps=@supabase/functions-js@2.4.4'

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
            <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
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

// Display-only copy of src/lib/utils/displayFormat.ts (Deno can't import src/).
// Keep the two implementations in sync.
const AU_STATE_ABBREVIATIONS = new Set(['VIC', 'NSW', 'QLD', 'SA', 'WA', 'NT', 'ACT', 'TAS']);

function toDisplayTitleCase(value: string): string {
  if (!value) return value;
  return value
    .split(/(\s+)/)
    .map((token) => {
      if (!/[a-zA-Z]/.test(token) || /\d/.test(token)) return token;
      const isAllCaps = token === token.toUpperCase();
      const isAllLower = token === token.toLowerCase();
      if (isAllCaps && AU_STATE_ABBREVIATIONS.has(token.replace(/[^a-zA-Z]/g, ''))) return token;
      if (!isAllCaps && !isAllLower) return token;
      return token
        .toLowerCase()
        .replace(/(^|['’-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
    })
    .join('');
}

function buildReminderHtml(data: {
  customerName: string;
  date: string;
  time: string;
  address: string;
}): string {
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

// The idempotency key makes a retry of the SAME logical email a no-op at Resend:
// same key + same payload returns the original response without sending again.
// Same key + a DIFFERENT payload returns 409 invalid_idempotent_request, which the
// 4xx branch below correctly treats as permanent — the Resend docs state retrying
// is useless without changing the key or the payload. Keys are retained for 24h.
async function sendWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  idempotencyKey: string,
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
          'Idempotency-Key': idempotencyKey,
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
    const SYSTEM_USER_UUID = Deno.env.get('SYSTEM_USER_UUID');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!SYSTEM_USER_UUID) {
      console.error('[send-inspection-reminder] SYSTEM_USER_UUID env var not set — email_logs.sent_by will be NULL');
    }

    // email_logs is the only durable record that a reminder email was attempted,
    // so a failure here must be visible — but it must never take the reminder run
    // down. Both the PostgREST error result and any thrown error are captured and
    // logged; nothing propagates out of this helper. The send has already happened
    // by the time this is called, so a lost log row must not undo it, skip the
    // claim-release decision below, or abort the remaining bookings.
    // NOTE: the supabase-js query builder is a PromiseLike, not a Promise — it has
    // no .catch(). Chaining one throws TypeError before the insert is ever issued,
    // which is what silently emptied this table on the Framer path.
    async function logReminderEmail(
      bookingId: string,
      fields: {
        recipient_email: string;
        subject: string;
        status: 'sent' | 'failed';
        provider_message_id?: string | null;
        error_message?: string | null;
        lead_id: string | null;
      },
    ): Promise<void> {
      try {
        const { error } = await supabase.from('email_logs').insert({
          template_name: 'inspection_reminder',
          provider: 'resend',
          sent_by: SYSTEM_USER_UUID || null,
          sent_at: new Date().toISOString(),
          ...fields,
        });
        if (error) {
          console.error(
            `[send-inspection-reminder] email_logs insert failed (booking ${bookingId}, recipient ${fields.recipient_email}, status ${fields.status}):`,
            error.code ?? 'no-code', error.message ?? String(error), error.details ?? '',
          );
        }
      } catch (err) {
        console.error(
          `[send-inspection-reminder] email_logs insert threw (booking ${bookingId}, recipient ${fields.recipient_email}, status ${fields.status}):`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

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
    let alreadyClaimed = 0;
    let released = 0;

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

      // Claim the reminder BEFORE sending. The conditional UPDATE is the atomic
      // tie-breaker: concurrent invocations serialise on the row, so only the
      // first one still sees reminder_sent = false and the others match zero
      // rows. The SELECT above cannot do this job — both invocations clear it
      // before either writes, which is what caused the duplicate sends.
      const { data: claimedRows, error: claimError } = await supabase
        .from('calendar_bookings')
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('reminder_sent', false)
        .select('id');

      if (claimError) {
        console.error(`Booking ${booking.id}: claim failed - ${claimError.message}`);
        failed++;
        continue;
      }

      // Zero rows means another invocation owns this reminder. Expected under
      // duplicate delivery — not an error state.
      if (!claimedRows || claimedRows.length === 0) {
        alreadyClaimed++;
        console.log(`Booking ${booking.id}: already claimed by another invocation, skipping send`);
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
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Melbourne',
      }).replace(/\b[ap]m\b/gi, (m) => m.toUpperCase());
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

      // Stable per logical email: one reminder exists per booking, so the booking
      // id plus the template type identifies it. Retries of this same send reuse
      // the key; a different booking gets a different key. Resend's recommended
      // <event-type>/<entity-id> format, well inside the 256-character limit.
      const idempotencyKey = `inspection-reminder/${booking.id}`;

      // Send email
      const result = await sendWithRetry({
        from: 'Mould & Restoration Co. <admin@mouldandrestoration.com.au>',
        to: [lead.email],
        subject,
        html,
        reply_to: 'admin@mouldandrestoration.com.au',
      }, RESEND_API_KEY, idempotencyKey);

      // Log to email_logs
      await logReminderEmail(booking.id, {
        recipient_email: lead.email,
        subject,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.data?.id || null,
        error_message: result.error || null,
        lead_id: booking.lead_id,
      });

      if (result.success) {
        // The claim above already set reminder_sent — nothing further to write.
        sent++;
        console.log(`Booking ${booking.id}: reminder sent to ${lead.email}`);
        continue;
      }

      failed++;
      console.error(`Booking ${booking.id}: failed to send reminder - ${result.error}`);

      // Send-failure policy, chosen deliberately: RELEASE the claim on transient
      // failures so the next hourly tick retries, RETAIN it on permanent ones.
      //
      // Releasing is safe because the retry reuses the same Idempotency-Key: if
      // the failure was a false negative (Resend accepted but the response was
      // lost) Resend returns the original result instead of sending again. A
      // missed reminder two days out risks a missed inspection, which is a worse
      // outcome than the residual duplicate risk this leaves.
      //
      // Retaining on 4xx (bad recipient, 409 invalid_idempotent_request) is what
      // bounds the retries. There is no attempt-counter column and adding one
      // would be a schema change, so the status class is the only stop condition
      // available; without it a permanently-failing address would be retried
      // every hour until the booking left 'scheduled'.
      const isPermanentFailure =
        typeof result.status === 'number' &&
        result.status >= 400 && result.status < 500 && result.status !== 429;

      if (isPermanentFailure) {
        console.error(
          `Booking ${booking.id}: permanent failure (${result.status}) — claim retained, will not retry`
        );
        continue;
      }

      // Ownership is proven by reminder_sent still being true, not by matching a
      // timestamp. Claiming requires the false->true transition and we performed
      // it, so while the flag stands the claim can only be ours — no other
      // invocation can hold it. A boolean has no precision, serialisation or
      // normalisation surface, so this cannot silently match zero rows the way an
      // exact timestamptz comparison could if anything ever rewrote the column.
      // If an external actor did reset the flag, we match nothing and correctly
      // leave their state alone.
      const { error: releaseError } = await supabase
        .from('calendar_bookings')
        .update({ reminder_sent: false, reminder_sent_at: null })
        .eq('id', booking.id)
        .eq('reminder_sent', true);

      if (releaseError) {
        console.error(`Booking ${booking.id}: claim release failed - ${releaseError.message}`);
      } else {
        released++;
        console.log(`Booking ${booking.id}: transient failure — claim released for retry`);
      }
    }

    return new Response(
      JSON.stringify({
        processed: bookings.length,
        sent,
        failed,
        skipped,
        alreadyClaimed,
        released,
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
