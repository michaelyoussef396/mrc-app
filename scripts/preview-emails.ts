// Local-only script: render all 7 customer email templates with real test-lead
// data and write each to docs/email-previews/<NN>-<name>.html for visual review.
//
// Run from repo root:
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run preview-emails
//
// Reads VITE_SUPABASE_URL from .env (already present). The service-role key
// is required so the joined lead/inspection/job_completion/calendar_bookings
// rows can be fetched in one go without RLS getting in the way. Never
// write to the database. Never deploy. See docs/email-previews/README.md.
//
// TODO: the 7 builder functions below are DUPLICATED from production code:
//   - 5 of them mirror src/lib/api/notifications.ts (buildBookingConfirmationHtml,
//     buildReportApprovedHtml, buildJobBookingConfirmationHtml,
//     buildJobReportEmailHtml, buildGoogleReviewEmailHtml)
//   - 2 of them mirror inline templates in
//     supabase/functions/receive-framer-lead/index.ts (buildConfirmationEmailHtml)
//     and supabase/functions/send-inspection-reminder/index.ts (buildReminderHtml)
// Direct imports aren't viable today: notifications.ts uses the `@/` Vite alias
// and `import.meta.env.VITE_SUPABASE_URL`, neither resolvable in a plain tsx
// Node script; Edge Function code uses `Deno.env.get(...)`. Extracting the
// shared shell into a runtime-neutral helper is the right next step.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const OUTPUT_DIR = join(REPO_ROOT, 'docs', 'email-previews')
const TEST_LEAD_ID = '85fca3d1-f30b-4942-ba6c-f9c7d27269d8'

// ---------------------------------------------------------------------------
// Env loading: read .env (for VITE_SUPABASE_URL) without pulling dotenv as a dep
// ---------------------------------------------------------------------------

function loadEnvFile(): void {
  const envPath = join(REPO_ROOT, '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('ERROR: VITE_SUPABASE_URL not set (expected in .env at repo root).')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set.')
  console.error('Provide it inline:  SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run preview-emails')
  console.error('The script needs a service-role key to read joined lead/inspection/job_completion rows.')
  console.error('It does NOT fall back to production secrets and writes nothing to the database.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---------------------------------------------------------------------------
// Branded shell — DUPLICATED from src/lib/api/notifications.ts:85-164
// (Vite `import.meta.env` substituted with process.env)
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
            <img src="${SUPABASE_URL}/storage/v1/object/public/pdf-assets/assets/logos/logo-mrc.png" alt="MRC Logo" width="120" style="display:block;">
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
</html>`
}

// ---------------------------------------------------------------------------
// 5 builders mirroring src/lib/api/notifications.ts (lines 185, 205, 252, 329, 420)
// ---------------------------------------------------------------------------

interface BookingConfirmationData {
  customerName: string
  date: string
  time: string
  address: string
  technicianName?: string
}

function buildBookingConfirmationHtml(data: BookingConfirmationData): string {
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
  `)
}

interface ReportApprovedData {
  customerName: string
  address: string
  jobNumber?: string
  customMessage?: string
}

function buildReportApprovedHtml(data: ReportApprovedData): string {
  const customMessageHtml = data.customMessage
    ? data.customMessage.split('\n').filter((l) => l.trim()).map((l) => `<p>${l}</p>`).join('\n    ')
    : ''
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
  `)
}

interface JobBookingConfirmationData {
  customerName: string
  leadNumber: string
  address: string
  firstDate: string
  lastDate: string
  startTime: string
  durationDays: number
  totalHours: number
  technicianName: string
  isSingleDay: boolean
}

function buildJobBookingConfirmationHtml(data: JobBookingConfirmationData): string {
  const dateRange = data.isSingleDay ? data.firstDate : `${data.firstDate} – ${data.lastDate}`
  const durationLabel = `${data.durationDays} ${data.durationDays === 1 ? 'day' : 'days'} (${data.totalHours} hours)`
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
  `)
}

function buildJobReportEmailHtml(params: {
  customerName: string
  propertyAddress: string
  jobNumber: string
  completionDate: string
  technicianName?: string
  pdfUrl: string
  customMessage?: string
}): string {
  const customMessageHtml = params.customMessage
    ? params.customMessage.split('\n').filter((l) => l.trim()).map((l) => `<p>${l}</p>`).join('\n    ')
    : ''
  return wrapInBrandedTemplate(`
    <h2>Job Completion Report</h2>
    ${customMessageHtml || `
    <p>Dear ${params.customerName},</p>
    <p>Please find your job completion report for the remediation work carried out at:</p>
    `}
    <div class="details-box">
      <table>
        <tr><td>Property</td><td>${params.propertyAddress}</td></tr>
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
  `)
}

function buildGoogleReviewEmailHtml(params: { customerName: string; jobNumber: string }): string {
  return wrapInBrandedTemplate(`
    <h2>Thank You — Would You Leave Us a Review?</h2>
    <p>Dear ${params.customerName},</p>
    <p>Thank you for trusting Mould &amp; Restoration Co with your remediation work (${params.jobNumber}). We hope you're thrilled with the result.</p>
    <p>Your feedback means the world to small businesses like ours. If you have 30 seconds, a quick Google review would genuinely make our day:</p>
    <p style="margin-top:24px;text-align:center;">
      <a href="https://g.page/r/CSmcatb7uSq9EBM/review" class="cta-button">Leave a Google Review</a>
    </p>
    <p>If anything's not quite right, please reply to this email or call us on <strong>1800 954 117</strong> — we'll make it right.</p>
    <p>Thanks again,<br>The MRC Team</p>
  `)
}

// ---------------------------------------------------------------------------
// 2 builders mirroring inline Edge Function templates
// ---------------------------------------------------------------------------

interface FramerLeadPayload {
  full_name: string
  phone: string
  email: string
  street: string
  suburb: string
  postcode: string
  preferred_date?: string  // ISO YYYY-MM-DD
  preferred_time?: string
  issue_description?: string
}

// DUPLICATED from supabase/functions/receive-framer-lead/index.ts:204-313
// (Deno.env.get substituted with SUPABASE_URL constant)
function buildConfirmationEmailHtml(lead: FramerLeadPayload): string {
  let formattedDate = ''
  if (lead.preferred_date) {
    const [y, m, d] = lead.preferred_date.split('-')
    formattedDate = `${d}/${m}/${y}`
  }

  const detailRows = [
    `<tr><td>Name</td><td>${lead.full_name}</td></tr>`,
    `<tr><td>Address</td><td>${lead.street}${lead.suburb ? ', ' + lead.suburb : ''}</td></tr>`,
    formattedDate ? `<tr><td>Preferred Date</td><td>${formattedDate}</td></tr>` : '',
    lead.preferred_time ? `<tr><td>Preferred Time</td><td>${lead.preferred_time}</td></tr>` : '',
  ].filter(Boolean).join('\n        ')

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
  `

  // The Edge Function uses its own inline shell — byte-equivalent to
  // wrapInBrandedTemplate today, so reuse it here.
  return wrapInBrandedTemplate(bodyHtml)
}

// DUPLICATED from supabase/functions/send-inspection-reminder/index.ts:92-117
// The Edge Function defines its own inline `<ul class="checklist">` styling
// inside its inline shell. That checklist class isn't in the canonical
// wrapInBrandedTemplate, so we substitute inline-styled <li>s to match
// what the production reminder actually renders to the recipient's inbox.
function buildReminderHtml(data: { customerName: string; date: string; time: string; address: string }): string {
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
  `)
}

// ---------------------------------------------------------------------------
// AU-locale formatting helpers
// ---------------------------------------------------------------------------

const MELBOURNE = 'Australia/Melbourne'

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: MELBOURNE,
  })
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: MELBOURNE,
  })
}

function fmtDateShortYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: MELBOURNE,
  })
}

function fmtDateAU(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: MELBOURNE,
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MELBOURNE,
  })
}

function fmtTimeFromHHMM(hhmm: string): string {
  // Inspection scheduled_time is "08:00" (Melbourne local) — render as "8:00 AM"
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// ---------------------------------------------------------------------------
// Main: fetch lead + related data, render 7 templates, write to disk
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Fetching test lead ${TEST_LEAD_ID}...`)

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, inspection_scheduled_date, scheduled_time, issue_description')
    .eq('id', TEST_LEAD_ID)
    .single()

  if (leadErr || !lead) {
    console.error('Failed to fetch lead:', leadErr?.message ?? 'not found')
    process.exit(1)
  }

  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, job_number, inspection_date, inspector_name, pdf_url')
    .eq('lead_id', TEST_LEAD_ID)
    .order('created_at', { ascending: false })
    .limit(1)
  const inspection = inspections?.[0] ?? null

  const { data: jobCompletions } = await supabase
    .from('job_completions')
    .select('id, job_number, completion_date, pdf_url, completed_by')
    .eq('lead_id', TEST_LEAD_ID)
    .order('created_at', { ascending: false })
    .limit(1)
  const jobCompletion = jobCompletions?.[0] ?? null

  const { data: jobBookings } = await supabase
    .from('calendar_bookings')
    .select('id, start_datetime, end_datetime, location_address')
    .eq('lead_id', TEST_LEAD_ID)
    .eq('event_type', 'job')
    .order('start_datetime', { ascending: true })
  const jobBookingsList = jobBookings ?? []

  // Derived shared values
  const fullAddress = [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode,
  ].filter(Boolean).join(', ')

  const shortAddress = [lead.property_address_street, lead.property_address_suburb].filter(Boolean).join(', ')
  const technicianName = inspection?.inspector_name ?? 'Clayton Jenkins'

  // Inspection booking date/time for previews 02 and 03
  const inspectionDateLong = lead.inspection_scheduled_date
    ? fmtDateLong(`${lead.inspection_scheduled_date}T00:00:00`)
    : 'Friday, 13/02/2026'
  const inspectionTimePretty = lead.scheduled_time ? fmtTimeFromHHMM(lead.scheduled_time) : '8:00 AM'

  // Job booking range (preview 05)
  let firstDate = 'Tue 7 Apr'
  let lastDate = 'Sun 12 Apr 2026'
  let startTime = '8:00 AM'
  let durationDays = 6
  let totalHours = 48
  let isSingleDay = false
  if (jobBookingsList.length > 0) {
    const first = jobBookingsList[0]
    const last = jobBookingsList[jobBookingsList.length - 1]
    firstDate = fmtDateShort(first.start_datetime)
    lastDate = fmtDateShortYear(last.start_datetime)
    startTime = fmtTime(first.start_datetime)
    durationDays = jobBookingsList.length
    isSingleDay = durationDays === 1
    totalHours = jobBookingsList.reduce((sum, b) => {
      const ms = new Date(b.end_datetime).getTime() - new Date(b.start_datetime).getTime()
      return sum + Math.round(ms / 36e5)
    }, 0)
  }

  // ---- Render all 7 ----
  const previews: Array<{ filename: string; html: string; label: string }> = []

  previews.push({
    filename: '01-enquiry-confirmation.html',
    label: 'Enquiry confirmation (Framer)',
    html: buildConfirmationEmailHtml({
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      street: lead.property_address_street ?? '',
      suburb: lead.property_address_suburb ?? '',
      postcode: lead.property_address_postcode ?? '',
      preferred_date: lead.inspection_scheduled_date ?? undefined,
      preferred_time: lead.scheduled_time ?? undefined,
      issue_description: lead.issue_description ?? undefined,
    }),
  })

  previews.push({
    filename: '02-booking-confirmation.html',
    label: 'Booking confirmation',
    html: buildBookingConfirmationHtml({
      customerName: lead.full_name,
      date: inspectionDateLong,
      time: inspectionTimePretty,
      address: fullAddress,
      technicianName,
    }),
  })

  previews.push({
    filename: '03-inspection-reminder.html',
    label: 'Inspection reminder (T-2)',
    html: buildReminderHtml({
      customerName: lead.full_name,
      date: inspectionDateLong,
      time: inspectionTimePretty,
      address: fullAddress,
    }),
  })

  previews.push({
    filename: '04-inspection-report.html',
    label: 'Inspection report sent',
    html: buildReportApprovedHtml({
      customerName: lead.full_name,
      address: fullAddress,
      jobNumber: inspection?.job_number ?? 'MRC-2026-9478',
    }),
  })

  previews.push({
    filename: '05-job-booking-confirmation.html',
    label: 'Job booking confirmation',
    html: buildJobBookingConfirmationHtml({
      customerName: lead.full_name,
      leadNumber: inspection?.job_number ?? 'MRC-2026-9478',
      address: fullAddress,
      firstDate,
      lastDate,
      startTime,
      durationDays,
      totalHours,
      technicianName,
      isSingleDay,
    }),
  })

  const completionDate = jobCompletion?.completion_date
    ? fmtDateAU(`${jobCompletion.completion_date}T00:00:00`)
    : '06/04/2026'

  previews.push({
    filename: '06-job-completion-report.html',
    label: 'Job completion report',
    html: buildJobReportEmailHtml({
      customerName: lead.full_name,
      propertyAddress: fullAddress,
      jobNumber: jobCompletion?.job_number ?? 'JOB-2026-5317',
      completionDate,
      technicianName,
      pdfUrl: jobCompletion?.pdf_url ?? '#',
    }),
  })

  previews.push({
    filename: '07-google-review-request.html',
    label: 'Google review request',
    html: buildGoogleReviewEmailHtml({
      customerName: lead.full_name,
      jobNumber: jobCompletion?.job_number ?? 'JOB-2026-5317',
    }),
  })

  // ---- Write to disk ----
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const { filename, html, label } of previews) {
    const path = join(OUTPUT_DIR, filename)
    writeFileSync(path, html, 'utf-8')
    console.log(`  wrote ${filename}  (${(html.length / 1024).toFixed(1)} KB)  — ${label}`)
  }

  console.log(`\nWrote ${previews.length} previews to ${OUTPUT_DIR}.`)
  console.log(`Used real data from lead ${TEST_LEAD_ID} (${lead.full_name} · ${shortAddress}).`)
  console.log('Open with Live Server.')
}

main().catch((err) => {
  console.error('preview-emails failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
