import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple in-memory rate limiter: IP → { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

function stripHtml(str: string): string {
  if (typeof str !== 'string') return String(str || '')
  return str.replace(/<[^>]*>/g, '').trim()
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
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/

const ParsedLeadSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().min(8).max(20),
  email: z.string().email().max(254),
  street: z.string().max(500).optional(),
  suburb: z.string().max(100).optional(),
  preferredDate: z.string().max(30).optional(),
  preferredTime: z.string().max(20).optional(),
  issueDescription: z.string().max(5000).optional(),
})

const MAX_BODY_SIZE = 50_000

interface FramerLeadPayload {
  full_name: string
  phone: string
  email: string
  street: string
  suburb: string
  preferred_date?: string
  preferred_time?: string
  issue_description?: string
}

// ---------------------------------------------------------------------------
// Slack block kit – reuses exact format from send-slack-notification
// ---------------------------------------------------------------------------

function buildSlackBlocks(lead: FramerLeadPayload, createdAt: string) {
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

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏠 New Lead Received', emoji: true },
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
</html>`
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Log every request immediately
  console.log('=== INCOMING REQUEST ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)

  // Log all headers
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => { headers[key] = value })
  console.log('Headers:', JSON.stringify(headers))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown'

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Always read raw body first for logging
    const contentType = req.headers.get('content-type') || ''
    // deno-lint-ignore no-explicit-any
    let body: Record<string, any> = {}

    console.log('Content-Type:', contentType)

    // Clone request to read body twice if needed
    const rawBody = await req.text()
    console.log('Raw body (first 1000 chars):', rawBody.substring(0, 1000))
    console.log('Raw body length:', rawBody.length)

    // Body size check — reject oversized payloads
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (contentType.includes('multipart/form-data')) {
      // Re-parse as FormData from raw text - need a new Request
      const newReq = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: rawBody,
      })
      const formData = await newReq.formData()
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          body[key] = value
        }
      }
    } else if (contentType.includes('application/json')) {
      body = JSON.parse(rawBody)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      for (const [key, value] of params.entries()) {
        body[key] = value
      }
    } else {
      // Try JSON first, fall back to form-urlencoded
      try {
        body = JSON.parse(rawBody)
      } catch (_e) {
        const params = new URLSearchParams(rawBody)
        for (const [key, value] of params.entries()) {
          body[key] = value
        }
      }
    }

    console.log('Parsed body keys:', Object.keys(body))
    console.log('Parsed body:', JSON.stringify(body).substring(0, 500))

    // -----------------------------------------------------------------------
    // Smart field extraction — handles Framer's quirky payload structure
    // Framer may bundle multiple fields into arrays and misname fields.
    // Strategy: try named fields first, then scan ALL values for content type.
    // -----------------------------------------------------------------------

    /** Safely get a field by multiple possible names (handles arrays) */
    const getField = (keys: string[]): string => {
      for (const key of keys) {
        if (body[key] !== undefined && body[key] !== null) return stripHtml(toStr(body[key]))
        const lower = key.toLowerCase()
        for (const [k, v] of Object.entries(body)) {
          if (k.toLowerCase() === lower || k.toLowerCase().replace(/[\s-]/g, '_') === lower) {
            return stripHtml(toStr(v))
          }
        }
      }
      return ''
    }

    // Collect ALL values (flattened from arrays) for smart detection
    const allValues = flattenValues(body)
    console.log('All flattened values:', allValues)

    // Try named fields first
    let fullName = getField(['full_name', 'fullName', 'Full Name', 'name', 'Name'])
    let phone = getField(['phone', 'Phone', 'phone_number', 'Phone Number', 'mobile', 'Mobile'])
    let email = getField(['email', 'Email', 'email_address', 'Email Address'])
    let street = getField(['street', 'Street', 'street_address', 'Street Address', 'address', 'Address'])
    let suburb = getField(['suburb', 'Suburb', 'city', 'City', 'location', 'Location'])
    let preferredDate = getField(['preferred_date', 'Preferred Date', 'date', 'Date', 'preferredDate'])
    let preferredTime = getField(['preferred_time', 'Preferred Time', 'time', 'Time', 'preferredTime'])
    let issueDescription = getField(['issue_description', 'Issue Description', 'issueDescription', 'message', 'Message', 'description', 'Description', 'issue', 'Issue'])

    // Smart detection: scan ALL values to find misplaced content
    // This handles Framer bundling email into the phone array, dates into email field, etc.
    const usedValues = new Set([fullName, phone, email, street, suburb, preferredDate, preferredTime, issueDescription].filter(Boolean))

    for (const val of allValues) {
      if (usedValues.has(val)) continue // already assigned

      if (!email && EMAIL_RE.test(val)) {
        email = val
        usedValues.add(val)
      } else if (!phone && PHONE_RE.test(val)) {
        phone = val
        usedValues.add(val)
      } else if (!preferredDate && DATE_RE.test(val)) {
        preferredDate = val
        usedValues.add(val)
      } else if (!preferredTime && TIME_RE.test(val)) {
        preferredTime = val
        usedValues.add(val)
      }
    }

    // If email field got a date value (Framer misconfiguration), clear it and use detected email
    if (email && DATE_RE.test(email)) {
      if (!preferredDate) preferredDate = email
      email = ''
      // Re-scan for actual email
      for (const val of allValues) {
        if (!usedValues.has(val) && EMAIL_RE.test(val)) {
          email = val
          usedValues.add(val)
          break
        }
      }
    }

    // If phone field got an array, Framer may have bundled email+suburb into it
    // The phone array pattern: [phone, email, suburb]
    const rawPhone = body['phone'] || body['Phone']
    if (Array.isArray(rawPhone)) {
      for (const item of rawPhone) {
        const s = String(item).trim()
        if (!s) continue
        if (!email && EMAIL_RE.test(s)) { email = s; usedValues.add(s) }
        else if (!phone && PHONE_RE.test(s)) { phone = s; usedValues.add(s) }
        else if (!suburb && !PHONE_RE.test(s) && !EMAIL_RE.test(s) && !DATE_RE.test(s) && !TIME_RE.test(s)) {
          // Remaining non-pattern value in phone array is likely suburb
          suburb = s; usedValues.add(s)
        }
      }
    }

    // If subject field is an array, Framer may have bundled time+street into it
    const rawSubject = body['subject'] || body['Subject']
    if (Array.isArray(rawSubject)) {
      for (const item of rawSubject) {
        const s = String(item).trim()
        if (!s) continue
        if (!preferredTime && TIME_RE.test(s)) { preferredTime = s; usedValues.add(s) }
        else if (!street && !TIME_RE.test(s) && !DATE_RE.test(s) && !EMAIL_RE.test(s) && !PHONE_RE.test(s)) {
          street = s; usedValues.add(s)
        }
      }
    }

    console.log('Final parsed fields:', { fullName, phone, email, street, suburb, preferredDate, preferredTime, issueDescription })

    const parsedLead = ParsedLeadSchema.safeParse({
      fullName: fullName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      street: street || undefined,
      suburb: suburb || undefined,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      issueDescription: issueDescription || undefined,
    })

    if (!parsedLead.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid lead data', details: parsedLead.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase client (service role for insert + duplicate check)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Duplicate check: same email + phone in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('phone', phone)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Lead already received. Our team will be in touch.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert lead
    const { error: insertError } = await supabase.from('leads').insert({
      full_name: fullName,
      email,
      phone,
      property_address_street: street,
      property_address_suburb: suburb,
      property_address_state: 'VIC',
      property_address_postcode: '',
      inspection_scheduled_date: preferredDate || null,
      scheduled_time: preferredTime || null,
      issue_description: issueDescription || null,
      lead_source: 'website',
      status: 'new_lead',
    })

    if (insertError) {
      console.error('Lead insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save lead. Please call us at 1800 954 117.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lead: FramerLeadPayload = {
      full_name: fullName,
      phone,
      email,
      street,
      suburb,
      preferred_date: preferredDate || undefined,
      preferred_time: preferredTime || undefined,
      issue_description: issueDescription || undefined,
    }

    const createdAt = new Date().toISOString()

    // Fire-and-forget: Slack notification + confirmation email (run in parallel)
    const slackPromise = (async () => {
      try {
        const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')
        if (!SLACK_WEBHOOK_URL) {
          console.warn('SLACK_WEBHOOK_URL not configured, skipping notification')
          return
        }
        const slackPayload = buildSlackBlocks(lead, createdAt)
        const res = await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        })
        if (!res.ok) {
          console.error('Slack error:', await res.text())
        }
      } catch (err) {
        console.error('Slack notification failed:', err)
      }
    })()

    const emailPromise = (async () => {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
          console.warn('RESEND_API_KEY not configured, skipping confirmation email')
          return
        }
        const html = buildConfirmationEmailHtml(lead)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Mould & Restoration Co <noreply@mrcsystem.com>',
            to: [email],
            subject: 'Thank you for your enquiry - Mould & Restoration Co',
            html,
            reply_to: 'admin@mouldandrestoration.com.au',
          }),
        })
        if (!res.ok) {
          const errData = await res.json()
          console.error('Resend email error:', errData)
        } else {
          // Log to email_logs
          const emailData = await res.json()
          await supabase.from('email_logs').insert({
            recipient_email: email,
            subject: 'Thank you for your enquiry - Mould & Restoration Co',
            template_name: 'framer_lead_confirmation',
            status: 'sent',
            provider: 'resend',
            provider_message_id: emailData?.id || null,
            sent_at: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('Confirmation email failed:', err)
      }
    })()

    // Wait for both but don't fail the request if either errors
    await Promise.allSettled([slackPromise, emailPromise])

    return new Response(
      JSON.stringify({ success: true, message: 'Lead received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('receive-framer-lead error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please call us at 1800 954 117.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
