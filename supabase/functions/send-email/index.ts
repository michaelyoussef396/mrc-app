import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// deps pin: supabase-js declares functions-js ^2.1.5, which floats to a version
// esm.sh has no denonext build for, breaking every deploy. 2.4.4 satisfies the
// same range and builds. Remove once esm.sh serves the newer target.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3?deps=@supabase/functions-js@2.4.4'
import { z } from 'https://esm.sh/zod@3.22.4'
import { reportEdgeErrorInBackground } from '../_shared/errorReporting.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple in-memory rate limiter: IP → { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

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

const HOURLY_SEND_CAP = 100
const HOURLY_WINDOW_MS = 60 * 60 * 1000

// Per isolate, and per cap EPISODE rather than per clock hour. Throttling on elapsed time
// loses the second episode: the cap clears as sends age out of the window and can re-trip
// inside the same hour, and because the cap writes no email_logs row those refusals would
// then leave no trace in any table at all. Reset once back under the cap, so every episode
// is reported exactly once per isolate.
let hasReportedCurrentCapEpisode = false

function tooManyRequests(reason: string): Response {
  return new Response(
    JSON.stringify({ error: reason }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

const EmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1).max(500_000),
  from: z.string().optional(),
  replyTo: z.string().email().optional(),
  leadId: z.string().uuid().optional(),
  inspectionId: z.string().uuid().optional(),
  templateName: z.string().max(100).optional(),
  // Sender attribution for email_logs.sent_by. Frontend callers pass the
  // authenticated user's UUID; system callers (cron, webhook) pass
  // SYSTEM_USER_UUID. NULL only when caller fails to provide it (logged).
  // See docs/edge-function-attribution-manifest.md.
  userId: z.string().uuid().optional(),
  // ADDITIVE, backwards compatible: `content` (base64 bytes) still works and
  // is still what the legacy LeadsManagement send path passes. `path` is a
  // URL Resend fetches itself, which is how report sends now attach their
  // PDF — a 29MB report is ~38.5MB once base64-encoded, and shipping that
  // through the browser and this function's JSON body is its own failure.
  // Exactly one of the two must be present.
  attachments: z.array(z.object({
    filename: z.string().max(255),
    content: z.string().optional(),
    path: z.string().url().optional(),
    content_type: z.string().max(100),
  }).refine(
    (a) => (a.content === undefined) !== (a.path === undefined),
    { message: 'attachment requires exactly one of content or path' },
  )).optional(),
  bypassRecipientRateLimit: z.boolean().optional(),
})

interface SendResult {
  success: boolean
  data?: { id: string }
  error?: string
  status?: number
}

async function sendWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  maxRetries = 3
): Promise<SendResult> {
  let lastError = ''
  let lastStatus = 500

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      }

      lastError = data?.message || JSON.stringify(data)
      lastStatus = response.status

      // 4xx = client error, not retryable (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Resend API client error (attempt ${attempt}/${maxRetries}): ${response.status}`, data)
        break
      }

      // 5xx or 429 = retryable
      console.warn(`Resend API error (attempt ${attempt}/${maxRetries}): ${response.status}`, data)
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      lastStatus = 500
      console.warn(`Resend API network error (attempt ${attempt}/${maxRetries}):`, lastError)
    }

    // Wait before retry (exponential: 1s, 2s, 3s)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }

  return { success: false, error: lastError, status: lastStatus }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`)
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawBody = await req.json()
    const parsed = EmailRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      to,
      subject,
      html,
      from,
      replyTo,
      leadId,
      inspectionId,
      templateName,
      userId,
      attachments,
      bypassRecipientRateLimit,
    } = parsed.data

    if (!userId) {
      console.warn('[send-email] No userId in payload — email_logs.sent_by will be NULL')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    async function suppressionResponse(reason: string): Promise<Response> {
      try {
        const { error } = await supabase.from('email_logs').insert({
          recipient_email: to,
          subject,
          template_name: templateName || 'custom',
          status: 'suppressed',
          provider: 'resend',
          provider_message_id: null,
          error_message: reason,
          lead_id: leadId || null,
          inspection_id: inspectionId || null,
          sent_by: userId || null,
          sent_at: new Date().toISOString(),
        })
        if (error) throw error
      } catch (error) {
        // Code and message only, never the whole error. A Postgres constraint violation names
        // the constraint in its message but puts the failing row — recipient and subject — in
        // DETAIL, so logging the object leaks a customer address into the function log.
        reportEdgeErrorInBackground({
          logger: 'send-email',
          severity: 'error',
          message: `Suppression audit insert failed (${error?.code || 'unknown'}): ${error?.message || 'unknown'}`,
          // Without a key this writes one row per refused request, and the window where the
          // function is deployed ahead of the CHECK migration makes every cooldown-suppressed
          // send fail this insert. Keyed on the code so a different failure class still reports.
          dedupeKey: `send-email:suppression-insert-failed:${error?.code || 'unknown'}`,
          context: {
            function: 'send-email',
            lead_id: leadId || null,
            template_name: templateName || 'custom',
          },
        })
      }
      return tooManyRequests(reason)
    }

    // Rate limiting: max 1 email to same recipient per 5 minutes
    // Skipped when admin explicitly confirms a resend via DuplicateSendDialog
    if (!bypassRecipientRateLimit) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: recentToRecipient } = await supabase
        .from('email_logs')
        .select('id')
        .eq('recipient_email', to)
        .eq('status', 'sent')
        .gt('sent_at', fiveMinutesAgo)
        .limit(1)

      if (recentToRecipient && recentToRecipient.length > 0) {
        return suppressionResponse('Rate limit: wait 5 minutes before resending to same recipient')
      }
    }

    // Global rate limit: max 100 emails per hour
    const oneHourAgo = new Date(Date.now() - HOURLY_WINDOW_MS).toISOString()
    const { count: hourlyCount } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gt('sent_at', oneHourAgo)

    if ((hourlyCount || 0) >= HOURLY_SEND_CAP) {
      // No email_logs row. One per refused request is what fanned a Slack post and an in-app
      // notification out to every admin and technician for every request past the cap; one
      // error_logs row per episode carries the same fact without the fan-out.
      if (!hasReportedCurrentCapEpisode) {
        hasReportedCurrentCapEpisode = true
        reportEdgeErrorInBackground({
          logger: 'send-email',
          severity: 'warning',
          message: `Hourly send cap reached (${HOURLY_SEND_CAP}); further sends are refused this window`,
          context: {
            function: 'send-email',
            lead_id: leadId || null,
            template_name: templateName || 'custom',
          },
        })
      }
      return tooManyRequests(`Rate limit exceeded: ${HOURLY_SEND_CAP} emails per hour`)
    }

    // Under the cap again: this episode is over, so the next one reports on its first refusal.
    hasReportedCurrentCapEpisode = false

    // Send email via Resend with retry
    const result = await sendWithRetry({
      from: from || 'Mould & Restoration Co. <admin@mouldandrestoration.com.au>',
      to: [to],
      subject,
      html,
      reply_to: replyTo || 'admin@mouldandrestoration.com.au',
      attachments: attachments || [],
    }, RESEND_API_KEY)

    // Log to email_logs table (both success and failure)
    await supabase.from('email_logs').insert({
      recipient_email: to,
      subject,
      template_name: templateName || 'custom',
      status: result.success ? 'sent' : 'failed',
      provider: 'resend',
      provider_message_id: result.data?.id || null,
      error_message: result.error || null,
      lead_id: leadId || null,
      inspection_id: inspectionId || null,
      sent_by: userId || null,
      sent_at: new Date().toISOString(),
    })

    if (!result.success) {
      console.error('Email send failed after retries:', result.error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result.error }),
        { status: result.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
