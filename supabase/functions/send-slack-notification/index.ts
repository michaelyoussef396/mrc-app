import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from 'https://esm.sh/zod@3.22.4'

const SlackNotificationSchema = z.object({
  event: z.enum(['new_lead', 'inspection_booked', 'report_ready', 'report_approved', 'status_changed', 'lead_updated']),
  leadId: z.string().max(500).optional(),
  full_name: z.string().max(500).optional(),
  phone: z.string().max(500).optional(),
  email: z.string().max(500).optional(),
  street_address: z.string().max(500).optional(),
  suburb: z.string().max(500).optional(),
  postcode: z.string().max(500).optional(),
  state: z.string().max(500).optional(),
  issue_description: z.string().max(500).optional(),
  lead_source: z.string().max(500).optional(),
  preferred_date: z.string().max(500).optional(),
  preferred_time: z.string().max(500).optional(),
  created_at: z.string().max(500).optional(),
  leadName: z.string().max(500).optional(),
  propertyAddress: z.string().max(500).optional(),
  technicianName: z.string().max(500).optional(),
  bookingDate: z.string().max(500).optional(),
  oldStatus: z.string().max(500).optional(),
  newStatus: z.string().max(500).optional(),
  oldStatusLabel: z.string().max(500).optional(),
  newStatusLabel: z.string().max(500).optional(),
  changedFields: z.string().max(500).optional(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface NewLeadPayload {
  event: 'new_lead'
  leadId?: string
  full_name: string
  phone?: string
  email?: string
  street_address?: string
  suburb?: string
  postcode?: string
  state?: string
  issue_description?: string
  lead_source?: string
  preferred_date?: string
  preferred_time?: string
  created_at?: string
}

interface GenericNotification {
  event: 'inspection_booked' | 'report_ready' | 'report_approved'
  leadId?: string
  leadName?: string
  propertyAddress?: string
  technicianName?: string
  bookingDate?: string
}

interface StatusChangedPayload {
  event: 'status_changed'
  leadId: string
  leadName: string
  propertyAddress?: string
  oldStatus: string
  newStatus: string
  oldStatusLabel: string
  newStatusLabel: string
}

interface LeadUpdatedPayload {
  event: 'lead_updated'
  leadId: string
  leadName: string
  changedFields: string
}

type SlackNotification = NewLeadPayload | GenericNotification | StatusChangedPayload | LeadUpdatedPayload

function formatNewLeadBlocks(n: NewLeadPayload) {
  const timestamp = n.created_at
    ? new Date(n.created_at).toLocaleString('en-AU', {
        timeZone: 'Australia/Melbourne',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })

  const source = n.lead_source
    ? n.lead_source.charAt(0).toUpperCase() + n.lead_source.slice(1)
    : 'Unknown'

  // Format preferred date as DD/MM/YYYY
  let formattedDate = 'N/A'
  if (n.preferred_date) {
    const [y, m, d] = n.preferred_date.split('-')
    formattedDate = `${d}/${m}/${y}`
  }

  // Format preferred time as 12hr label
  let formattedTime = 'N/A'
  if (n.preferred_time) {
    const [hStr, mStr] = n.preferred_time.split(':')
    const h = parseInt(hStr, 10)
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ampm = h >= 12 ? 'PM' : 'AM'
    formattedTime = `${h12}:${mStr} ${ampm}`
  }

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏠 New Lead Received', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Full Name*\n${n.full_name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Phone*\n${n.phone || 'N/A'}` },
          { type: 'mrkdwn', text: `*Email*\n${n.email || 'N/A'}` },
          { type: 'mrkdwn', text: `*Lead Source*\n${source}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Street Address*\n${n.street_address || 'N/A'}` },
          { type: 'mrkdwn', text: `*Suburb*\n${n.suburb || 'N/A'}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Preferred Date*\n${formattedDate}` },
          { type: 'mrkdwn', text: `*Preferred Time*\n${formattedTime}` },
        ],
      },
      ...(n.issue_description
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Issue Description*\n${n.issue_description}`,
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

function formatGenericMessage(n: GenericNotification) {
  let message = ''
  let color = '#36a64f'

  switch (n.event) {
    case 'inspection_booked':
      message = `*Inspection Booked*\n*Lead:* ${n.leadName}\n*Address:* ${n.propertyAddress}\n*Technician:* ${n.technicianName}\n*Date:* ${n.bookingDate}`
      color = '#f39c12'
      break
    case 'report_ready':
      message = `*Inspection Report Ready for Approval*\n*Lead:* ${n.leadName}\n*Address:* ${n.propertyAddress}\n*Action Required:* Review and approve report`
      color = '#e74c3c'
      break
    case 'report_approved':
      message = `*Report Approved & Sent*\n*Lead:* ${n.leadName}\n*Address:* ${n.propertyAddress}\n*Status:* Ready to send to customer`
      color = '#2ecc71'
      break
  }

  return {
    attachments: [
      {
        color,
        text: message,
        footer: 'MRC System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

const STATUS_EMOJI: Record<string, string> = {
  new_lead: ':sparkles:',
  inspection_waiting: ':clock3:',
  inspection_ai_summary: ':robot_face:',
  approve_inspection_report: ':page_facing_up:',
  inspection_email_approval: ':email:',
  closed: ':white_check_mark:',
  not_landed: ':x:',
}

const STATUS_COLOR: Record<string, string> = {
  new_lead: '#3b82f6',
  inspection_waiting: '#f59e0b',
  inspection_ai_summary: '#8b5cf6',
  approve_inspection_report: '#a855f7',
  inspection_email_approval: '#38bdf8',
  closed: '#22c55e',
  not_landed: '#ef4444',
}

function formatStatusChanged(n: StatusChangedPayload) {
  const fromEmoji = STATUS_EMOJI[n.oldStatus] || ':arrow_right:'
  const toEmoji = STATUS_EMOJI[n.newStatus] || ':arrow_right:'
  const color = STATUS_COLOR[n.newStatus] || '#6b7280'

  const timestamp = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔄 Lead Status Changed', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Lead*\n${n.leadName}` },
          { type: 'mrkdwn', text: `*Status Change*\n${fromEmoji} ${n.oldStatusLabel}  →  ${toEmoji} ${n.newStatusLabel}` },
        ],
      },
      ...(n.propertyAddress
        ? [
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Property Address*\n${n.propertyAddress}` },
              ],
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `📅 ${timestamp}  •  MRC System` },
        ],
      },
      { type: 'divider' },
    ],
    attachments: [{ color, blocks: [] }],
  }
}

function formatLeadUpdated(n: LeadUpdatedPayload) {
  return {
    attachments: [
      {
        color: '#3498db',
        text: `*Lead Details Updated — ${n.leadName}*\n*Fields changed:* ${n.changedFields}`,
        footer: 'MRC System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')
    if (!SLACK_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ error: 'SLACK_WEBHOOK_URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawBody = await req.json()
    const parseResult = SlackNotificationSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', issues: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notification = parseResult.data as SlackNotification

    let payload
    switch (notification.event) {
      case 'new_lead':
        payload = formatNewLeadBlocks(notification as NewLeadPayload)
        break
      case 'status_changed':
        payload = formatStatusChanged(notification as StatusChangedPayload)
        break
      case 'lead_updated':
        payload = formatLeadUpdated(notification as LeadUpdatedPayload)
        break
      default:
        payload = formatGenericMessage(notification as GenericNotification)
        break
    }

    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text()
      console.error('Slack API error:', errorText)
      return new Response(
        JSON.stringify({ error: `Slack API error: ${slackResponse.statusText}` }),
        { status: slackResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending Slack notification:', error)

    // Log to error_logs table (fire-and-forget, non-blocking)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            error_type: 'edge_function_error',
            severity: 'warning',
            message: `Slack notification failed: ${error.message}`,
            context: { function: 'send-slack-notification' },
            source: 'edge_function',
          }),
        })
      }
    } catch { /* non-blocking */ }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
