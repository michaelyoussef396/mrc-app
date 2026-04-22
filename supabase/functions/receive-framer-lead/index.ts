import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

// deno-lint-ignore no-explicit-any
async function isRateLimited(supabase: any, ip: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('webhook_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)
  return (count ?? 0) >= RATE_LIMIT
}

function stripHtml(str: string): string {
  if (typeof str !== 'string') return String(str || '')
  return str.replace(/<[^>]*>/g, '').replace(/\0/g, '').trim()
}

/** Safely convert any value (string, array, etc.) to a trimmed string */
function toStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) return val[0] ? String(val[0]).trim() : ''
  return String(val).trim()
}

/** Flatten all values from the Framer payload into a single string[] for smart detection */
function flattenValues(obj: Record<string, unknown>): string[] {
  const values: string[] = []
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item !== null && item !== undefined) values.push(String(item).trim())
      }
    } else if (val !== null && val !== undefined) {
      values.push(String(val).trim())
    }
  }
  return values.filter(Boolean)
}

// Content detection patterns
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s()+-]{8,15}$/
const POSTCODE_RE = /^3\d{3}$/
const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/
const DATE_AU_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/
const DATE_RE = (val: string) => DATE_ISO_RE.test(val) || DATE_AU_RE.test(val)
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?$/

const ParsedLeadSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().min(8).max(20),
  email: z.string().email().max(254),
  street: z.string().max(500).optional(),
  suburb: z.string().max(100).optional(),
  postcode: z.string().regex(POSTCODE_RE, 'Postcode must be a 4-digit Melbourne postcode (3000-3999)'),
  preferredDate: z.string().max(30).optional(),
  preferredTime: z.string().max(20).optional(),
  issueDescription: z.string().max(5000).optional(),
})

function normaliseDate(val: string): string {
  if (DATE_ISO_RE.test(val)) return isValidCalendarDate(val) ? val : ''
  if (DATE_AU_RE.test(val)) {
    const parts = val.split('/')
    const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    return isValidCalendarDate(iso) ? iso : ''
  }
  return ''
}

function isValidCalendarDate(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return false
  return d.toISOString().startsWith(iso)
}

const MAX_BODY_SIZE = 50_000

interface FramerLeadPayload {
  full_name: string
  phone: string
  email: string
  street: string
  suburb: string
  postcode: string
  preferred_date?: string
  preferred_time?: string
  issue_description?: string
}

// ---------------------------------------------------------------------------
// Slack block kit – reuses exact format from send-slack-notification
// ---------------------------------------------------------------------------

function buildSlackBlocks(lead: FramerLeadPayload, createdAt: string, isPossibleDuplicate = false) {
  const timestamp = new Date(createdAt).toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  let formattedDate = 'N/A'
  if (lead.preferred_date) {
    const [y, m, d] = lead.preferred_date.split('-')
    formattedDate = `${d}/${m}/${y}`
  }

  const formattedTime = lead.preferred_time || 'N/A'

  const headerText = isPossibleDuplicate
    ? '🔁 Possible repeat — 🏠 New Lead Received'
    : '🏠 New Lead Received'

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: headerText, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Full Name*\n${lead.full_name}` },
          { type: 'mrkdwn', text: `*Phone*\n${lead.phone || 'N/A'}` },
          { type: 'mrkdwn', text: `*Email*\n${lead.email || 'N/A'}` },
          { type: 'mrkdwn', text: `*Lead Source*\nWebsite (Framer)` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Street Address*\n${lead.street || 'N/A'}` },
          { type: 'mrkdwn', text: `*Suburb*\n${lead.suburb || 'N/A'}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Preferred Date*\n${formattedDate}` },
          { type: 'mrkdwn', text: `*Preferred Time*\n${formattedTime}` },
        ],
      },
      ...(lead.issue_description
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Issue Description*\n${lead.issue_description}`,
              },
            },
          ]
        : []),
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '⚠️ *ACTION REQUIRED*\n📞 CALL LEAD AND BOOK THEM IN',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🔗 *Schedule Now:* <https://www.mrcsystem.com/admin/leads|Open Leads Dashboard>',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${timestamp}  •  MRC System`,
          },
        ],
      },
      { type: 'divider' },
    ],
  }
}

// ---------------------------------------------------------------------------
// Confirmation email – branded MRC template
// ---------------------------------------------------------------------------

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
</html>`
}

// ---------------------------------------------------------------------------
// Failure notification helpers
// ---------------------------------------------------------------------------

async function sendFailureEmail(rawPayload: string, errorMsg: string): Promise<void> {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) return
    const adminEmail = Deno.env.get('ADMIN_FALLBACK_EMAIL') || 'admin@mrcsystem.com'
    const ts = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MRC System Alerts <noreply@mrcsystem.com>',
        to: [adminEmail],
        subject: 'LEAD CAPTURE FAILURE — Manual Follow-up Required',
        html: `<h2 style="color:#c00;">Lead Capture Failed</h2>
<p><strong>Time:</strong> ${ts}</p>
<p><strong>Error:</strong> ${errorMsg}</p>
<h3>Raw Payload</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;font-size:13px;">${rawPayload.substring(0, 5000)}</pre>
<p><strong>Action required:</strong> Manually create this lead in <a href="https://www.mrcsystem.com/admin/leads">the admin dashboard</a>.</p>`,
        reply_to: 'admin@mrcsystem.com',
      }),
    })
  } catch (err) {
    console.error('Failure email send failed:', err)
  }
}

async function sendFailureSlack(rawPayload: string, errorMsg: string): Promise<void> {
  try {
    const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')
    if (!SLACK_WEBHOOK_URL) return
    const ts = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })
    let preview = rawPayload.substring(0, 500)
    try { preview = JSON.stringify(JSON.parse(rawPayload), null, 2).substring(0, 500) } catch { /* keep raw */ }
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '\u{1F6A8} LEAD CAPTURE FAILURE', emoji: true } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Error:* ${errorMsg}\n*Time:* ${ts}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Raw payload:*\n\`\`\`${preview}\`\`\`` } },
          { type: 'section', text: { type: 'mrkdwn', text: ':point_right: <https://www.mrcsystem.com/admin/leads|Open Admin Dashboard> to manually create this lead.' } },
          { type: 'divider' },
        ],
      }),
    })
  } catch (err) {
    console.error('Failure Slack send failed:', err)
  }
}

async function insertLeadWithRetry(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  leadRow: Record<string, any>,
  maxRetries = 3,
// deno-lint-ignore no-explicit-any
): Promise<{ data: any; error: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await supabase.from('leads').insert(leadRow).select('id').single()
    if (!result.error) return result
    console.error(`Lead insert attempt ${attempt}/${maxRetries} failed:`, result.error.message)
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(3, attempt - 1)))
    } else {
      return result
    }
  }
  return { data: null, error: { message: 'All retries exhausted' } }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // --- Health check (GET) ---
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: 18 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // --- Supabase client (service role) — needed throughout ---
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // --- Read raw body FIRST ---
  const rawBody = await req.text()
  const reqHeaders: Record<string, string> = {}
  req.headers.forEach((v, k) => { reqHeaders[k] = v })
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown'

  console.log('=== INCOMING REQUEST ===', req.method, rawBody.length, 'bytes from', clientIp)

  // --- LAYER 1: Log raw submission to webhook_submissions BEFORE any processing ---
  let submissionId: string | null = null
  try {
    let payloadJson: unknown = rawBody
    try { payloadJson = JSON.parse(rawBody) } catch { /* store as string */ }
    const { data: sub } = await supabase.from('webhook_submissions').insert({
      source: 'framer',
      raw_payload: payloadJson,
      headers: reqHeaders,
      ip_address: clientIp,
      status: 'received',
    }).select('id').single()
    submissionId = sub?.id ?? null
  } catch (err) {
    console.error('CRITICAL: webhook_submissions insert failed. Raw payload:', rawBody.substring(0, 2000), 'Error:', err)
  }

  // Helper to update submission status
  async function updateSubmission(status: string, extra: Record<string, unknown> = {}) {
    if (!submissionId) return
    try {
      await supabase.from('webhook_submissions').update({ status, ...extra }).eq('id', submissionId)
    } catch { /* non-fatal */ }
  }

  // --- Body size check ---
  if (rawBody.length > MAX_BODY_SIZE) {
    const sizeMsg = 'Body too large: ' + rawBody.length + ' bytes'
    await updateSubmission('failed', { error_message: sizeMsg })
    await Promise.allSettled([
      sendFailureEmail(rawBody.substring(0, 5000), sizeMsg),
      sendFailureSlack(rawBody.substring(0, 500), sizeMsg),
    ])
    return new Response(
      JSON.stringify({ error: 'Request body too large' }),
      { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // --- Rate limit check (AFTER logging raw payload) ---
  if (await isRateLimited(supabase, clientIp)) {
    const rlMsg = `Rate limit exceeded for IP ${clientIp}`
    await updateSubmission('rate_limited')
    await Promise.allSettled([
      sendFailureEmail(rawBody, rlMsg),
      sendFailureSlack(rawBody, rlMsg),
    ])
    return new Response(
      JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // --- Parse body ---
    const contentType = req.headers.get('content-type') || ''
    // deno-lint-ignore no-explicit-any
    let body: Record<string, any> = {}

    if (contentType.includes('multipart/form-data')) {
      const newReq = new Request(req.url, { method: 'POST', headers: req.headers, body: rawBody })
      const formData = await newReq.formData()
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') body[key] = value
      }
    } else if (contentType.includes('application/json')) {
      body = JSON.parse(rawBody)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      for (const [key, value] of params.entries()) body[key] = value
    } else {
      try { body = JSON.parse(rawBody) } catch {
        const params = new URLSearchParams(rawBody)
        for (const [key, value] of params.entries()) body[key] = value
      }
    }

    // --- Smart field extraction (unchanged) ---
    const getField = (keys: string[]): string => {
      for (const key of keys) {
        if (body[key] !== undefined && body[key] !== null) return stripHtml(toStr(body[key]))
        const lower = key.toLowerCase()
        for (const [k, v] of Object.entries(body)) {
          if (k.toLowerCase() === lower || k.toLowerCase().replace(/[\s-]/g, '_') === lower) return stripHtml(toStr(v))
        }
      }
      return ''
    }

    const allValues = flattenValues(body)

    let fullName = getField(['full_name', 'fullName', 'Full Name', 'name', 'Name', 'your_name', 'Your Name'])
    let phone = getField(['phone', 'Phone', 'phone_number', 'Phone Number', 'mobile', 'Mobile', 'contact', 'Contact Number', 'contact_number'])
    let email = getField(['email', 'Email', 'email_address', 'Email Address', 'your_email', 'Your Email'])
    let street = getField(['street', 'Street', 'street_address', 'Street Address', 'address', 'Address', 'number_and_address', 'number and address', 'Number and Address', 'property_address', 'Property Address', 'address_line_1'])
    let suburb = getField(['suburb', 'Suburb', 'city', 'City', 'location', 'Location', 'town', 'Town'])
    let postcode = getField(['postcode', 'Postcode', 'post_code', 'Post Code', 'postal_code', 'Postal Code', 'zip', 'Zip', 'zipcode', 'Zip Code'])
    let preferredDate = getField(['preferred_date', 'Preferred Date', 'date', 'Date', 'preferredDate', 'inspection_date', 'Inspection Date', 'booking_date'])
    let preferredTime = getField(['preferred_time', 'Preferred Time', 'time', 'Time', 'preferredTime', 'inspection_time', 'Inspection Time', 'booking_time'])
    let issueDescription = getField(['issue_description', 'Issue Description', 'issueDescription', 'message', 'Message', 'description', 'Description', 'issue', 'Issue', 'your_message', 'Your Message', 'comments', 'Comments', 'notes', 'Notes', 'details', 'Details'])

    const usedValues = new Set([fullName, phone, email, street, suburb, postcode, preferredDate, preferredTime, issueDescription].filter(Boolean))

    // Track each smart-extraction fallback that fires. Logged at the end so
    // any Framer field-naming drift surfaces in Supabase function logs (and
    // Sentry, if the function is wired into it later) before it causes data
    // issues. Clean payloads — where every field has its own top-level key —
    // produce zero events. See docs/FRAMER_FIELD_MAPPING.md.
    const recoveryEvents: string[] = []

    for (const val of allValues) {
      if (usedValues.has(val)) continue
      if (!email && EMAIL_RE.test(val)) { email = val; usedValues.add(val); recoveryEvents.push('generic-content-match: email') }
      else if (!phone && PHONE_RE.test(val)) { phone = val; usedValues.add(val); recoveryEvents.push('generic-content-match: phone') }
      else if (!postcode && POSTCODE_RE.test(val)) { postcode = val; usedValues.add(val); recoveryEvents.push('generic-content-match: postcode') }
      else if (!preferredDate && DATE_RE(val)) { preferredDate = val; usedValues.add(val); recoveryEvents.push('generic-content-match: preferred_date') }
      else if (!preferredTime && TIME_RE.test(val)) { preferredTime = val; usedValues.add(val); recoveryEvents.push('generic-content-match: preferred_time') }
    }

    if (email && DATE_RE(email)) {
      if (!preferredDate) preferredDate = email
      email = ''
      recoveryEvents.push('email-field-held-date: swapped to preferred_date')
      for (const val of allValues) {
        if (!usedValues.has(val) && EMAIL_RE.test(val)) {
          email = val; usedValues.add(val)
          recoveryEvents.push('email-rescued-from-other-field')
          break
        }
      }
    }

    const rawPhone = body['phone'] || body['Phone']
    if (Array.isArray(rawPhone)) {
      recoveryEvents.push(`phone-field-arrived-as-array: ${rawPhone.length} items`)
      for (const item of rawPhone) {
        const s = String(item).trim()
        if (!s) continue
        if (!email && EMAIL_RE.test(s)) { email = s; usedValues.add(s); recoveryEvents.push('phone-array-recovered: email') }
        else if (!phone && PHONE_RE.test(s)) { phone = s; usedValues.add(s); recoveryEvents.push('phone-array-recovered: phone') }
        else if (!postcode && POSTCODE_RE.test(s)) { postcode = s; usedValues.add(s); recoveryEvents.push('phone-array-recovered: postcode') }
        else if (!suburb && !PHONE_RE.test(s) && !EMAIL_RE.test(s) && !DATE_RE(s) && !TIME_RE.test(s) && !POSTCODE_RE.test(s)) {
          suburb = s; usedValues.add(s); recoveryEvents.push('phone-array-recovered: suburb')
        }
      }
    }

    const rawSubject = body['subject'] || body['Subject']
    if (Array.isArray(rawSubject)) {
      recoveryEvents.push(`subject-field-arrived-as-array: ${rawSubject.length} items`)
      for (const item of rawSubject) {
        const s = String(item).trim()
        if (!s) continue
        if (!preferredTime && TIME_RE.test(s)) { preferredTime = s; usedValues.add(s); recoveryEvents.push('subject-array-recovered: preferred_time') }
        else if (!street && !TIME_RE.test(s) && !DATE_RE(s) && !EMAIL_RE.test(s) && !PHONE_RE.test(s)) {
          street = s; usedValues.add(s); recoveryEvents.push('subject-array-recovered: street')
        }
      }
    }

    // Bundled-format fallback: older payloads sent suburb as "Southbank VIC 3006".
    // Extract postcode from suburb if it ends with a 4-digit Melbourne postcode.
    if (suburb && !postcode) {
      const match = suburb.match(/\b(3\d{3})\b/)
      if (match) {
        postcode = match[1]
        suburb = suburb.replace(/\s*(VIC\s+)?3\d{3}\s*$/i, '').trim()
        recoveryEvents.push('bundled-suburb-postcode-extracted')
      }
    }

    if (recoveryEvents.length > 0) {
      console.warn(`[smart-extraction] fallback triggered: ${recoveryEvents.join('; ')} — see docs/FRAMER_FIELD_MAPPING.md`)
    }

    if (preferredDate) {
      preferredDate = normaliseDate(preferredDate)
      if (!DATE_ISO_RE.test(preferredDate)) preferredDate = ''
    }

    console.log('Parsed fields:', { fullName, phone, email, street, suburb, postcode, preferredDate, preferredTime, issueDescription })

    // --- Validate ---
    const parsedLead = ParsedLeadSchema.safeParse({
      fullName: fullName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      street: street || undefined,
      suburb: suburb || undefined,
      postcode: postcode || undefined,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      issueDescription: issueDescription || undefined,
    })

    if (!parsedLead.success) {
      const errMsg = 'Validation failed: ' + JSON.stringify(parsedLead.error.flatten().fieldErrors)
      await updateSubmission('failed', { error_message: errMsg })
      await Promise.allSettled([
        sendFailureEmail(rawBody, errMsg),
        sendFailureSlack(rawBody, errMsg),
      ])
      return new Response(
        JSON.stringify({ error: 'Invalid lead data', details: parsedLead.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- Duplicate detection (flag-only, never reject) ---
    // Same email+phone within 24h flags the new lead as a possible repeat;
    // the new lead is still inserted. Admin reviews and decides what to do.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('leads').select('id').eq('email', email).eq('phone', phone)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    const possibleDuplicateOf: string | null = existing && existing.length > 0 ? existing[0].id : null
    const isPossibleDuplicate = possibleDuplicateOf !== null

    // --- Insert lead with retry (3 attempts, exponential backoff) ---
    const leadRow = {
      full_name: fullName, email, phone,
      property_address_street: street,
      property_address_suburb: suburb,
      property_address_state: 'VIC',
      property_address_postcode: postcode,
      inspection_scheduled_date: preferredDate || null,
      scheduled_time: preferredTime || null,
      issue_description: issueDescription || null,
      lead_source: 'website',
      status: 'new_lead',
      is_possible_duplicate: isPossibleDuplicate,
      possible_duplicate_of: possibleDuplicateOf,
    }

    const { data: leadData, error: insertError } = await insertLeadWithRetry(supabase, leadRow)

    if (insertError) {
      const errMsg = `Lead insert failed after 3 retries: ${insertError.message}`
      console.error(errMsg)
      await updateSubmission('failed', { error_message: errMsg, retry_count: 3 })
      await Promise.allSettled([
        sendFailureEmail(rawBody, errMsg),
        sendFailureSlack(rawBody, errMsg),
      ])
      return new Response(
        JSON.stringify({ error: 'Failed to save lead. Please call us at 1800 954 117.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // --- Success: update submission ---
    await updateSubmission('processed', {
      lead_id: leadData?.id ?? null,
      processed_at: new Date().toISOString(),
    })

    const lead: FramerLeadPayload = {
      full_name: fullName, phone, email, street, suburb, postcode,
      preferred_date: preferredDate || undefined,
      preferred_time: preferredTime || undefined,
      issue_description: issueDescription || undefined,
    }
    const createdAt = new Date().toISOString()

    // --- Fire-and-forget: Slack + confirmation email ---
    const slackPromise = (async () => {
      try {
        const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')
        if (!SLACK_WEBHOOK_URL) return
        const res = await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildSlackBlocks(lead, createdAt, isPossibleDuplicate)),
        })
        if (!res.ok) console.error('Slack error:', await res.text())
      } catch (err) { console.error('Slack notification failed:', err) }
    })()

    const emailPromise = (async () => {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) return
        const html = buildConfirmationEmailHtml(lead)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Mould & Restoration Co <noreply@mrcsystem.com>',
            to: [email],
            subject: 'Thank you for your enquiry - Mould & Restoration Co',
            html,
            reply_to: 'admin@mrcsystem.com',
          }),
        })
        if (!res.ok) { console.error('Resend error:', await res.json()) }
        else {
          const emailData = await res.json()
          await supabase.from('email_logs').insert({
            recipient_email: email,
            subject: 'Thank you for your enquiry - Mould & Restoration Co',
            template_name: 'framer_lead_confirmation',
            status: 'sent', provider: 'resend',
            provider_message_id: emailData?.id || null,
            sent_at: new Date().toISOString(),
          })
        }
      } catch (err) { console.error('Confirmation email failed:', err) }
    })()

    await Promise.allSettled([slackPromise, emailPromise])

    return new Response(
      JSON.stringify({ success: true, message: 'Lead received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('receive-framer-lead top-level error:', errMsg)
    await updateSubmission('failed', { error_message: errMsg })
    await Promise.allSettled([
      sendFailureEmail(rawBody, errMsg),
      sendFailureSlack(rawBody, errMsg),
    ])
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please call us at 1800 954 117.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
