import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SlackNotification {
  event: 'new_lead' | 'inspection_booked' | 'report_ready' | 'report_approved'
  leadId?: string
  leadName?: string
  propertyAddress?: string
  technicianName?: string
  bookingDate?: string
  additionalInfo?: Record<string, string>
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

    let message = ''
    let color = '#36a64f'

    switch (notification.event) {
      case 'new_lead':
        message = `*New Lead Received*\n*Name:* ${notification.leadName}\n*Address:* ${notification.propertyAddress}`
        color = '#3498db'
        break

      case 'inspection_booked':
        message = `*Inspection Booked*\n*Lead:* ${notification.leadName}\n*Address:* ${notification.propertyAddress}\n*Technician:* ${notification.technicianName}\n*Date:* ${notification.bookingDate}`
        color = '#f39c12'
        break

      case 'report_ready':
        message = `*Inspection Report Ready for Approval*\n*Lead:* ${notification.leadName}\n*Address:* ${notification.propertyAddress}\n*Action Required:* Review and approve report`
        color = '#e74c3c'
        break

      case 'report_approved':
        message = `*Report Approved & Sent*\n*Lead:* ${notification.leadName}\n*Address:* ${notification.propertyAddress}\n*Status:* Ready to send to customer`
        color = '#2ecc71'
        break

      default:
        message = `*Notification*\n${JSON.stringify(notification)}`
    }

    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            text: message,
            footer: 'MRC System',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
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
