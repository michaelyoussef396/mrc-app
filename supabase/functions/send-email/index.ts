import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
  leadId?: string
  inspectionId?: string
  templateName?: string
  attachments?: Array<{
    filename: string
    content: string
    content_type: string
  }>
}

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

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      attachments,
    }: EmailRequest = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend with retry
    const result = await sendWithRetry({
      from: from || 'Mould & Restoration Co <noreply@mrcsystem.com>',
      to: [to],
      subject,
      html,
      reply_to: replyTo || 'admin@mouldandrestoration.com.au',
      attachments: attachments || [],
    }, RESEND_API_KEY)

    // Log to email_logs table (both success and failure)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

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
