// One-off Deno script: fire all 7 customer-facing emails to a single inbox so
// they can be screenshotted in Gmail. Sends DIRECTLY via Resend (not via the
// send-email Edge Function) to bypass the per-recipient 5-min rate-limit and
// avoid writing email_logs rows for these previews.
//
// Run:
//   RESEND_API_KEY=re_... PREVIEW_TO=michaelyoussef396@gmail.com \
//     npx tsx scripts/send-preview-emails.ts

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PREVIEW_TO = process.env.PREVIEW_TO || 'michaelyoussef396@gmail.com';
const SENDER = 'Mould & Restoration Co <noreply@mrcsystem.com>';
const REPLY_TO = 'admin@mrcsystem.com';
const DELAY_MS = 3000;

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not set');
  process.exit(1);
}

// ---------- Real lead data (fetched from Supabase 2026-04-23) ----------
// lead 85fca3d1-f30b-4942-ba6c-f9c7d27269d8
const LEAD = {
  full_name: 'michael youssef',
  email: 'michaelyoussef396@gmail.com',
  street: '35 Wellington Street',
  suburb: 'Mernda',
  state: 'Victoria',
  postcode: '3754',
  preferred_date: '2026-02-13',  // ISO; renders as 13/02/2026
  preferred_time: '08:00',
  full_address: '35 Wellington Street, Mernda, Victoria, 3754',
  short_address: '35 Wellington Street, Mernda',
};

// inspection MRC-2026-9478
const INSPECTION = {
  job_number: 'MRC-2026-9478',
  attention_to: 'Michael directed',
  inspector_name: 'Clayton Jenkins',
  total_inc_gst: 11050.71,
};

// inspection booking 03e198cd
const INSPECTION_BOOKING = {
  start_datetime: '2026-02-13T02:00:00+00:00',  // Melbourne 1:00 PM AEDT
};

// job_completion JOB-2026-5317
const JOB_COMPLETION = {
  id: 'c2d27e2a-a2e0-42eb-98c6-ed5a7fe5064a',
  job_number: 'JOB-2026-5317',
  completion_date: '2026-04-06',
  remediation_completed_by: 'michael youssef',
  pdf_url: 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/inspection-reports/job-report-c2d27e2a-a2e0-42eb-98c6-ed5a7fe5064a-v26-1776864520374.html',
};

// 6 job bookings: Apr 7-12 Melbourne, 8 AM start, 5×8h + 1×4h = 44 hours
const JOB_BOOKING = {
  firstDate: 'Tue 7 Apr',
  lastDate: 'Sun 12 Apr 2026',
  startTime: '8:00 AM',
  durationDays: 6,
  totalHours: 44,
  technicianName: 'michael youssef',
};

// ---------- Branded wrapper (copied from src/lib/api/notifications.ts:85) ----------
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
            <img src="https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
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

// ---------- Email body builders (copied verbatim from production code) ----------

// #1 — buildConfirmationEmailHtml (supabase/functions/receive-framer-lead/index.ts:204)
// Uses an inlined template (different signature block: no inquiries line, etc.)
// Faithfully reproduced here.
function buildConfirmationEmailHtml(): string {
  const lead = {
    full_name: LEAD.full_name,
    street: LEAD.street,
    suburb: LEAD.suburb,
    preferred_date: LEAD.preferred_date,
    preferred_time: LEAD.preferred_time,
  };
  let formattedDate = '';
  if (lead.preferred_date) {
    const [y, m, d] = lead.preferred_date.split('-');
    formattedDate = `${d}/${m}/${y}`;
  }
  const detailRows = [
    `<tr><td>Name</td><td>${lead.full_name}</td></tr>`,
    `<tr><td>Address</td><td>${lead.street}${lead.suburb ? ', ' + lead.suburb : ''}</td></tr>`,
    formattedDate ? `<tr><td>Preferred Date</td><td>${formattedDate}</td></tr>` : '',
    lead.preferred_time ? `<tr><td>Preferred Time</td><td>${lead.preferred_time}</td></tr>` : '',
  ].filter(Boolean).join('\n        ');

  const bodyHtml = `
      <h2>Thank You for Your Enquiry</h2>
      <p>Hi ${lead.full_name},</p>
      <p>Thank you for reaching out to Mould &amp; Restoration Co. We have received your enquiry and a member of our team will be in touch shortly to confirm your booking.</p>
      <div class="details-box">
        <table>
          ${detailRows}
        </table>
      </div>
      <p><strong>What happens next?</strong></p>
      <ol style="margin:16px 0;padding-left:20px;font-size:14px;color:#333;">
        <li style="padding:4px 0;">Our team will call you to confirm the inspection date and time</li>
        <li style="padding:4px 0;">A technician will arrive at the scheduled time for a thorough mould inspection (max 1 hour)</li>
        <li style="padding:4px 0;">You'll receive a detailed inspection report with recommendations</li>
      </ol>
      <p>If you need to get in touch before then, please call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a>.</p>
  `;
  return wrapInBrandedTemplate(bodyHtml);
}

// #2 — buildBookingConfirmationHtml (src/lib/api/notifications.ts:185)
function buildBookingConfirmationHtml(d: {
  customerName: string; date: string; time: string; address: string; technicianName?: string;
}): string {
  return wrapInBrandedTemplate(`
    <h2>Booking Confirmed</h2>
    <p>Hi ${d.customerName},</p>
    <p>Your mould inspection has been confirmed. Here are the details:</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${d.date}</td></tr>
        <tr><td>Time</td><td>${d.time}</td></tr>
        <tr><td>Address</td><td>${d.address}</td></tr>
        ${d.technicianName ? `<tr><td>Technician</td><td>${d.technicianName}</td></tr>` : ''}
      </table>
    </div>
    <p><strong>What to expect:</strong></p>
    <p>Our technician will arrive at the scheduled time to conduct a thorough mould inspection of your property. The inspection takes a maximum of 1 hour.</p>
    <p>Please ensure access to all areas of the property, including any subfloor or roof spaces if applicable.</p>
    <p style="margin-top:24px;">Need to reschedule? Call us on <a href="tel:1800954117" style="color:#121D73; font-weight:600;">1800 954 117</a></p>
  `);
}

// #3 — buildReminderHtml (supabase/functions/send-inspection-reminder/index.ts:92)
function buildReminderHtml(d: { customerName: string; date: string; time: string; address: string }): string {
  return wrapInBrandedTemplate(`
    <h2>Inspection Reminder</h2>
    <p>Hi ${d.customerName},</p>
    <p>This is a friendly reminder that your mould inspection is coming up in <strong>2 days</strong>.</p>
    <div class="details-box">
      <table>
        <tr><td>Date</td><td>${d.date}</td></tr>
        <tr><td>Time</td><td>${d.time}</td></tr>
        <tr><td>Address</td><td>${d.address}</td></tr>
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

// #4 — buildReportApprovedHtml (src/lib/api/notifications.ts:205)
function buildReportApprovedHtml(d: { customerName: string; address: string; jobNumber?: string }): string {
  return wrapInBrandedTemplate(`
    <h2>Your Inspection Report is Ready</h2>
    <p>Hi ${d.customerName},</p>
    <p>Great news — your mould inspection report for <strong>${d.address}</strong> has been completed and approved${d.jobNumber ? ` (Ref: ${d.jobNumber})` : ''}.</p>
    <p>Our team has thoroughly reviewed the findings and the report is now ready for you.</p>
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${d.address}</td></tr>
        ${d.jobNumber ? `<tr><td>Reference</td><td>${d.jobNumber}</td></tr>` : ''}
        <tr><td>Status</td><td style="color:#16a34a; font-weight:600;">Approved &amp; Ready</td></tr>
      </table>
    </div>
    <p>If you have any questions about the report or would like to discuss remediation options, please don't hesitate to get in touch.</p>
    <p style="margin-top:24px;">
      <a href="tel:1800954117" class="cta-button">Call Us to Discuss</a>
    </p>
  `);
}

// #5 — buildJobBookingConfirmationHtml (src/lib/api/notifications.ts:252)
function buildJobBookingConfirmationHtml(d: {
  customerName: string; leadNumber: string; address: string;
  firstDate: string; lastDate: string; startTime: string;
  durationDays: number; totalHours: number; technicianName: string; isSingleDay: boolean;
}): string {
  const dateRange = d.isSingleDay ? d.firstDate : `${d.firstDate} – ${d.lastDate}`;
  const durationLabel = `${d.durationDays} ${d.durationDays === 1 ? 'day' : 'days'} (${d.totalHours} hours)`;
  return wrapInBrandedTemplate(`
    <h2>Job Booking Confirmed</h2>
    <p>Hi ${d.customerName},</p>
    <p>Great news — your mould remediation job at <strong>${d.address}</strong> has been confirmed and scheduled.</p>
    <div class="details-box">
      <table>
        <tr><td>Reference</td><td>${d.leadNumber}</td></tr>
        <tr><td>Dates</td><td>${dateRange}</td></tr>
        <tr><td>Start Time</td><td>${d.startTime} daily</td></tr>
        <tr><td>Duration</td><td>${durationLabel}</td></tr>
        <tr><td>Technician</td><td>${d.technicianName}</td></tr>
        <tr><td>Address</td><td>${d.address}</td></tr>
      </table>
    </div>
    <p><strong>What to expect:</strong></p>
    <p>Our technician will arrive at ${d.startTime} on ${d.firstDate} to begin work. Please ensure access to all affected areas of the property for the duration of the job.</p>
    <p>If you need to reschedule, please call us on <a href="tel:0433553199" style="color:#121D73; font-weight:600;">0433 553 199</a> as soon as possible.</p>
  `);
}

// #6 — buildJobReportEmailHtml (src/lib/api/notifications.ts:329)
function buildJobReportEmailHtml(p: {
  customerName: string; propertyAddress: string; jobNumber: string;
  completionDate: string; technicianName: string; pdfUrl: string;
}): string {
  return wrapInBrandedTemplate(`
    <h2>Job Completion Report</h2>
    <p>Dear ${p.customerName},</p>
    <p>Please find your job completion report for the remediation work carried out at:</p>
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${p.propertyAddress}</td></tr>
        <tr><td>Job Number</td><td>${p.jobNumber}</td></tr>
        <tr><td>Completion Date</td><td>${p.completionDate}</td></tr>
        <tr><td>Technician</td><td>${p.technicianName}</td></tr>
      </table>
    </div>
    <p style="margin-top:24px;">
      <a href="${p.pdfUrl}" class="cta-button">View Job Report</a>
    </p>
    <p>This report includes before and after photos, treatment methods used, and our warranty conditions.
    If you have any questions, contact us at <strong>1800 954 117</strong> or reply to this email.</p>
  `);
}

// #7 — buildGoogleReviewEmailHtml (src/lib/api/notifications.ts:411)
function buildGoogleReviewEmailHtml(p: { customerName: string; jobNumber: string }): string {
  return wrapInBrandedTemplate(`
    <h2>Thank You — Would You Leave Us a Review?</h2>
    <p>Dear ${p.customerName},</p>
    <p>Thank you for trusting Mould &amp; Restoration Co with your remediation work (${p.jobNumber}). We hope you're thrilled with the result.</p>
    <p>Your feedback means the world to small businesses like ours. If you have 30 seconds, a quick Google review would genuinely make our day:</p>
    <p style="margin-top:24px;text-align:center;">
      <a href="https://g.page/r/CSmcatb7uSq9EBM/review" class="cta-button">Leave a Google Review</a>
    </p>
    <p>If anything's not quite right, please reply to this email or call us on <strong>1800 954 117</strong> — we'll make it right.</p>
    <p>Thanks again,<br>The MRC Team</p>
  `);
}

// ---------- Format the inspection booking time using Melbourne tz ----------
const inspectionDate = new Date(INSPECTION_BOOKING.start_datetime);
const dateMelb = inspectionDate.toLocaleDateString('en-AU', {
  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'Australia/Melbourne',
});
const timeMelb = inspectionDate.toLocaleTimeString('en-AU', {
  hour: '2-digit', minute: '2-digit', hour12: true,
  timeZone: 'Australia/Melbourne',
});
const shortDateMelb = inspectionDate.toLocaleDateString('en-AU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'Australia/Melbourne',
});
const dayOfWeekMelb = inspectionDate.toLocaleDateString('en-AU', {
  weekday: 'long', timeZone: 'Australia/Melbourne',
});

// ---------- Build all 7 emails ----------
const emails = [
  {
    n: 1,
    name: 'Enquiry confirmation',
    subject: '[PREVIEW] Thank you for your enquiry - Mould & Restoration Co',
    html: buildConfirmationEmailHtml(),
  },
  {
    n: 2,
    name: 'Booking Confirmation',
    subject: `[PREVIEW] Booking Confirmed — ${shortDateMelb} at ${timeMelb}`,
    html: buildBookingConfirmationHtml({
      customerName: LEAD.full_name,
      date: shortDateMelb,
      time: timeMelb,
      address: LEAD.full_address,
      technicianName: JOB_BOOKING.technicianName,
    }),
  },
  {
    n: 3,
    name: 'Inspection Reminder',
    subject: `[PREVIEW] Reminder: Your Mould Inspection — ${dayOfWeekMelb} ${shortDateMelb}`,
    html: buildReminderHtml({
      customerName: LEAD.full_name,
      date: dateMelb,
      time: timeMelb,
      address: LEAD.full_address,
    }),
  },
  {
    n: 4,
    name: 'Inspection Report (approved)',
    subject: `[PREVIEW] Your Inspection Report is Ready — ${INSPECTION.job_number}`,
    html: buildReportApprovedHtml({
      customerName: LEAD.full_name,
      address: LEAD.short_address,
      jobNumber: INSPECTION.job_number,
    }),
  },
  {
    n: 5,
    name: 'Job Booking Confirmation',
    subject: `[PREVIEW] Job Booking Confirmed — ${INSPECTION.job_number}`,
    html: buildJobBookingConfirmationHtml({
      customerName: LEAD.full_name,
      leadNumber: INSPECTION.job_number,
      address: LEAD.full_address,
      firstDate: JOB_BOOKING.firstDate,
      lastDate: JOB_BOOKING.lastDate,
      startTime: JOB_BOOKING.startTime,
      durationDays: JOB_BOOKING.durationDays,
      totalHours: JOB_BOOKING.totalHours,
      technicianName: JOB_BOOKING.technicianName,
      isSingleDay: false,
    }),
  },
  {
    n: 6,
    name: 'Job Completion Report',
    subject: `[PREVIEW] Job Completion Report — ${JOB_COMPLETION.job_number}`,
    html: buildJobReportEmailHtml({
      customerName: LEAD.full_name,
      propertyAddress: LEAD.full_address,
      jobNumber: JOB_COMPLETION.job_number,
      completionDate: '06/04/2026',
      technicianName: JOB_COMPLETION.remediation_completed_by,
      pdfUrl: JOB_COMPLETION.pdf_url,
    }),
  },
  {
    n: 7,
    name: 'Google Review Request',
    subject: '[PREVIEW] Thank you from Mould & Restoration Co',
    html: buildGoogleReviewEmailHtml({
      customerName: LEAD.full_name,
      jobNumber: JOB_COMPLETION.job_number,
    }),
  },
];

// ---------- Send each email via Resend, with delay ----------
console.log(`\nDispatching ${emails.length} preview emails to ${PREVIEW_TO}\n`);

const results: Array<{ n: number; name: string; subject: string; ok: boolean; resendId?: string; error?: string }> = [];

for (const e of emails) {
  console.log(`[${e.n}/7] ${e.name}`);
  console.log(`        Subject: ${e.subject}`);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: [PREVIEW_TO],
        subject: e.subject,
        html: e.html,
        reply_to: REPLY_TO,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`        ✓ sent (Resend id: ${data.id})`);
      results.push({ n: e.n, name: e.name, subject: e.subject, ok: true, resendId: data.id });
    } else {
      console.log(`        ✗ failed: ${res.status} ${JSON.stringify(data)}`);
      results.push({ n: e.n, name: e.name, subject: e.subject, ok: false, error: `${res.status} ${JSON.stringify(data)}` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`        ✗ network error: ${msg}`);
    results.push({ n: e.n, name: e.name, subject: e.subject, ok: false, error: msg });
  }

  if (e.n < emails.length) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log('\n========== SUMMARY ==========');
const sent = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log(`Sent: ${sent}/${emails.length}  Failed: ${failed}/${emails.length}\n`);
for (const r of results) {
  console.log(`  #${r.n} ${r.ok ? '✓' : '✗'} ${r.name}`);
  console.log(`         "${r.subject}"`);
  if (r.resendId) console.log(`         Resend id: ${r.resendId}`);
  if (r.error) console.log(`         Error: ${r.error}`);
}
console.log(`\nCheck inbox: ${PREVIEW_TO}\nFilter: subject contains "[PREVIEW]"\n`);
