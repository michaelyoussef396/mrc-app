import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

type SlackNotification = NewLeadPayload | GenericNotification

function formatNewLeadBlocks(n: NewLeadPayload) {
  const address = [n.street_address, n.suburb, n.state, n.postcode]
    .filter(Boolean)
    .join(', ')

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

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏠 New Lead Received', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name*\n${n.full_name || 'N/A'}` },
          { type: 'mrkdwn', text: `*Phone*\n${n.phone || 'N/A'}` },
          { type: 'mrkdwn', text: `*Email*\n${n.email || 'N/A'}` },
          { type: 'mrkdwn', text: `*Source*\n${source}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Property Address*\n${address || 'N/A'}` },
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

    const notification: SlackNotification = await req.json()

    const payload =
      notification.event === 'new_lead'
        ? formatNewLeadBlocks(notification as NewLeadPayload)
        : formatGenericMessage(notification as GenericNotification)

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
