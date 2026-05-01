// Supabase Edge Function: check-overdue-invoices
// Runs daily via cron to flag overdue invoices and send Slack alerts.
// Cron schedule must be configured in Supabase dashboard or via pg_cron:
//   daily at 23:00 UTC (9am AEST)
//
// Logic:
// 1. Query invoices WHERE status = 'sent' AND due_date < CURRENT_DATE
// 2. For each: update status to 'overdue', insert activity log, Slack alert
// 3. At milestone days (15/22/29/30/60) past due: extra Slack reminders
//
// NOTE: Does NOT auto-charge late fees. Admin handles fee charges manually.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MILESTONE_DAYS = [15, 22, 29, 30, 60] as const
const MILESTONE_MESSAGES: Record<number, string> = {
  15: 'First reminder — $65 late fee applies (admin to charge manually)',
  22: 'Second reminder — payment still outstanding',
  29: 'Final notice — warranty at risk',
  30: 'WARRANTY VOID — 30 days overdue',
  60: 'CREDIT DEFAULT WARNING — 60+ days overdue, escalate',
}

interface OverdueInvoice {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  due_date: string
  status: string
  lead_id: string | null
}

function formatAUD(n: number): string {
  return `$${Number(n).toFixed(2)}`
}

async function postSlack(webhook: string, text: string): Promise<void> {
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error('Slack post failed:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL') ?? ''
  const SYSTEM_USER_UUID = Deno.env.get('SYSTEM_USER_UUID')

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  if (!SYSTEM_USER_UUID) {
    console.error('[check-overdue-invoices] SYSTEM_USER_UUID env var not set — audit attribution will be NULL')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString().split('T')[0]

  let overdueCount = 0
  let milestoneAlerts = 0
  const errors: string[] = []

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total_amount, due_date, status, lead_id')
      .in('status', ['sent', 'overdue'])
      .lt('due_date', todayISO)

    if (error) {
      console.error('Query failed:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const rows = (invoices ?? []) as OverdueInvoice[]

    for (const inv of rows) {
      try {
        const dueDate = new Date(inv.due_date + 'T00:00:00')
        const diffMs = today.getTime() - dueDate.getTime()
        const daysOverdue = Math.round(diffMs / (1000 * 60 * 60 * 24))

        // First-time transition from sent -> overdue.
        // Audited write: routed through audited_mark_invoice_overdue RPC so
        // set_config('app.acting_user_id', SYSTEM_USER_UUID) and the UPDATE
        // run in one transaction. See docs/edge-function-attribution-manifest.md.
        if (inv.status === 'sent') {
          const { error: updateErr } = await supabase.rpc('audited_mark_invoice_overdue', {
            p_acting_user_id: SYSTEM_USER_UUID || null,
            p_invoice_id: inv.id,
          })
          if (updateErr) {
            errors.push(`Failed to mark ${inv.invoice_number} overdue: ${updateErr.message}`)
            continue
          }
          overdueCount++

          if (inv.lead_id) {
            await supabase.from('activities').insert({
              lead_id: inv.lead_id,
              activity_type: 'invoice_overdue',
              title: 'Invoice marked overdue',
              description: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue (${formatAUD(inv.total_amount)})`,
            })
          }

          if (SLACK_WEBHOOK_URL) {
            await postSlack(
              SLACK_WEBHOOK_URL,
              `⏰ Invoice ${inv.invoice_number} for ${inv.customer_name} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue — ${formatAUD(inv.total_amount)}. <https://www.mrcsystem.com/admin/leads|Open dashboard>`,
            )
          }
        }

        // Milestone reminders (exact-day match — cron runs daily so each fires once)
        if (MILESTONE_DAYS.includes(daysOverdue as typeof MILESTONE_DAYS[number])) {
          const milestoneText = MILESTONE_MESSAGES[daysOverdue]
          if (SLACK_WEBHOOK_URL) {
            await postSlack(
              SLACK_WEBHOOK_URL,
              `🚨 *${milestoneText}*\nInvoice ${inv.invoice_number} — ${inv.customer_name} — ${formatAUD(inv.total_amount)}\nDay ${daysOverdue} past due`,
            )
          }
          if (inv.lead_id) {
            await supabase.from('activities').insert({
              lead_id: inv.lead_id,
              activity_type: 'invoice_milestone',
              title: `Invoice milestone: day ${daysOverdue}`,
              description: milestoneText,
            })
          }
          milestoneAlerts++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Row ${inv.invoice_number}: ${msg}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, overdueCount, milestoneAlerts, errors, checkedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
