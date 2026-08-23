// Supabase Edge Function: check-overdue-invoices
// Runs daily via cron (23:00 UTC = 9:00am AEST) to flag overdue invoices and
// post ONE Slack digest per run. Cron schedule lives in
// 20260601120000_fix_cron_auth_headers.sql (auth header from Vault).
//
// Logic:
// 1. All day-math is in the Australia/Melbourne calendar day — daysOverdue here
//    must agree with src/lib/calculations/penaltyLadder.ts (the canonical ladder),
//    because admins act on the tier names in the digest.
// 2. sent + past-due invoices transition to 'overdue' via the audited RPC
//    (audited_mark_invoice_overdue — SYSTEM_USER_UUID attribution, see
//    docs/edge-function-attribution-manifest.md Bucket B).
// 3. Idempotency: duplicate deliveries of the same cron tick must no-op. This is
//    a permanent condition, not a transient bug — EVERY tick is delivered twice
//    (100% of ticks, both invocations running the full body), between pg_net and
//    the Edge Functions gateway. Ticket open with Supabase; not fixable here.
//    Three independent guards, every one a compare-and-set, none a
//    read-then-write:
//      sent→overdue      — audited_mark_invoice_overdue's conditional UPDATE,
//                          which RETURNS BOOLEAN so the loser knows it lost;
//      milestone rows    — app_settings PRIMARY KEY claim, one key per invoice
//                          per Melbourne day (a milestone transitions no column,
//                          so there is nothing for an UPDATE to arbitrate);
//      Slack digest      — app_settings PRIMARY KEY claim, one key per day.
//    No new schema needed — app_settings already exists.
// 4. Slack: one digest per run, only when something happened. The digest is
//    informational — MRC never auto-contacts customers; the admin does.
//
// Manual invocation (safe to repeat):
//   POST {}                → real run, respects the idempotency guard
//   POST {"dryRun": true}  → computes everything, writes NOTHING, posts the
//                            digest prefixed [DRY RUN] (posts nothing if empty)
//
// NOTE: Does NOT auto-charge late fees. Admin handles fee charges manually.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fanOutNotification } from '../_shared/fanout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MELBOURNE_TZ = 'Australia/Melbourne'
const MS_PER_DAY = 1000 * 60 * 60 * 24

// Penalty-ladder tier boundaries (days past due). Canonical source:
// src/lib/calculations/penaltyLadder.ts — keep in lockstep. A crossing fires
// the day an invoice ENTERS a tier: 1 overdue, 8 second reminder, 15 final
// notice, 16 warranty void, 29 ongoing.
// (Replaces the legacy MILESTONE_DAYS [15,22,29,30,60], which had drifted from
// the ladder — see the 29 Jul EF-wave report.)
const TIER_BOUNDARY_DAYS = [1, 8, 15, 16, 29] as const

// NOT a warranty tier — an admin escalation prompt beyond the ladder
// ("stop chasing, escalate"). Kept separate from TIER_BOUNDARY_DAYS and
// labelled distinctly so it can't be read as a ladder tier.
const ESCALATION_DAY = 60
const ESCALATION_LABEL = 'Admin escalation — stop chasing, escalate (not a warranty tier)'

// Guard state for the Slack digest. The per-invoice guards protect the DB writes
// but not the post, which is why near-simultaneous invocations could still
// double-post. Deliberately NOT in activities: that table renders on the
// customer's lead timeline and a system marker does not belong there.
// app_settings is a system key/value table with no customer-facing surface, added
// in 20251111000012 to fix the inspection-number race — coordination state is
// what it is for. One key per Melbourne day; rows accumulate at 1/day.
const DIGEST_CLAIM_KEY_PREFIX = 'digest:invoice-overdue:'

// Guard state for the per-invoice milestone rows, same table and same reasoning as
// the digest claim above. A milestone changes no column, so the conditional-UPDATE
// trick that arbitrates the sent→overdue transition has nothing to key on here —
// the app_settings PRIMARY KEY is the only atomic mechanism available.
// invoice_number is UNIQUE and at most one tier boundary can be crossed on a given
// day, so one key per invoice per Melbourne day identifies a milestone exactly.
// Rows accrue at most 6 per invoice across its whole life (5 ladder tiers + the
// escalation prompt).
const MILESTONE_CLAIM_KEY_PREFIX = 'milestone:invoice-overdue:'
// In-app digest fan-out claims its own per-day key: the Slack digest claim is
// released when the Slack post fails, and a retry re-entering that branch must
// not duplicate the already-inserted notification rows.
const FANOUT_CLAIM_KEY_PREFIX = 'digest-fanout:invoice-overdue:'

function ladderTierLabel(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Current'
  if (daysOverdue <= 7) return 'Overdue'
  if (daysOverdue < 15) return 'Second Reminder'
  if (daysOverdue === 15) return 'Final Notice'
  if (daysOverdue < 29) return 'Warranty VOID'
  return 'Warranty VOID — Ongoing'
}

interface InvoiceRow {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  due_date: string
  status: string
  lead_id: string | null
}

interface DigestLine {
  invoice_number: string
  customer_name: string
  total_amount: number
  days_overdue: number
  tier: string
}

// --- Melbourne date helpers (date-only arithmetic, DST-safe) -----------------

/** YYYY-MM-DD of the current Melbourne calendar day. */
function melbourneDateISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MELBOURNE_TZ }).format(now)
}

/** A YYYY-MM-DD string as a UTC day number, for pure date subtraction. */
function isoToDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

/** Days the invoice is past due as of the given Melbourne calendar day. */
function daysOverdueOn(dueDate: string, melTodayIso: string): number {
  const diff = isoToDayNumber(melTodayIso) - isoToDayNumber(dueDate)
  return diff > 0 ? diff : 0
}

/** DD/MM/YYYY for the digest heading. */
function formatDateAU(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatAUD(n: number): string {
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Same posting pattern as send-slack-notification (shared SLACK_WEBHOOK_URL secret)
async function postSlack(webhook: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('Slack API error:', await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('Slack post failed:', err)
    return false
  }
}

function buildDigest(
  melTodayIso: string,
  newlyFlagged: DigestLine[],
  milestones: DigestLine[],
  escalations: DigestLine[],
  outstandingCount: number,
  outstandingTotal: number,
  dryRun: boolean,
): string {
  const lines: string[] = []
  if (dryRun) lines.push('*[DRY RUN — no changes were written]*')
  lines.push(`:receipt: *Overdue invoice digest — ${formatDateAU(melTodayIso)}*`)
  if (newlyFlagged.length > 0) {
    lines.push('*Newly overdue (flagged this run):*')
    for (const f of newlyFlagged) {
      lines.push(`• ${f.invoice_number} — ${f.customer_name} — ${formatAUD(f.total_amount)} — ${f.days_overdue} day${f.days_overdue === 1 ? '' : 's'} overdue (${f.tier})`)
    }
  }
  if (milestones.length > 0) {
    lines.push('*Penalty milestones reached today:*')
    for (const m of milestones) {
      lines.push(`• ${m.invoice_number} — ${m.customer_name} — day ${m.days_overdue} — entered *${m.tier}*`)
    }
  }
  if (escalations.length > 0) {
    lines.push('*Admin escalation (not a warranty tier):*')
    for (const e of escalations) {
      lines.push(`• ${e.invoice_number} — ${e.customer_name} — ${formatAUD(e.total_amount)} — ${e.days_overdue} days overdue — *stop chasing, escalate*`)
    }
  }
  lines.push(`*Outstanding total:* ${outstandingCount} invoice${outstandingCount === 1 ? '' : 's'} — ${formatAUD(outstandingTotal)}`)
  lines.push('_No customer has been contacted — review and follow up from the <https://www.mrcsystem.com/admin|dashboard>._')
  return lines.join('\n')
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

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = body?.dryRun === true
  } catch {
    // empty body (cron sends {}) — real run
  }

  const melToday = melbourneDateISO()

  const newlyFlagged: DigestLine[] = []
  const milestones: DigestLine[] = []
  const escalations: DigestLine[] = []
  const errors: string[] = []

  // Guard-hit counters. Both are reported in the response so the guards can be
  // observed firing in PROD — under duplicate delivery the losing invocation is
  // the one that increments them, and without these there is no evidence in the
  // logs that either guard ever arbitrated anything. Mirrors alreadyClaimed in
  // send-inspection-reminder.
  let alreadyFlagged = 0
  let alreadyMilestoned = 0

  try {
    // Past-due candidates. due_date is a DATE column, so comparing against the
    // Melbourne calendar day keeps the whole run in Melbourne reckoning.
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total_amount, due_date, status, lead_id')
      .in('status', ['sent', 'overdue'])
      .lt('due_date', melToday)

    if (error) {
      console.error('Query failed:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const rows = (invoices ?? []) as InvoiceRow[]

    // Cheap early-out only — NOT a concurrency guard. This is a plain SELECT, so
    // two near-simultaneous invocations both see the same (empty) result; it can
    // only skip work an EARLIER, already-committed run did, e.g. a manual
    // re-invocation later the same day. The actual arbitration is the RPC's
    // boolean and the app_settings claims. 26h window then exact Melbourne-day
    // filter client-side, which avoids computing the UTC instant of Melbourne
    // midnight across DST.
    // Only 'invoice_overdue' is fetched: the milestone path no longer consults
    // this set (it claims an app_settings key instead), so selecting
    // 'invoice_milestone' rows would be work nothing reads.
    const lookbackISO = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
    const { data: todaysActivities, error: actErr } = await supabase
      .from('activities')
      .select('activity_type, description, lead_id, created_at')
      .eq('activity_type', 'invoice_overdue')
      .gte('created_at', lookbackISO)
    if (actErr) {
      // Guard data unavailable — safer to abort a real run than risk duplicate
      // writes/digests. Dry runs can continue (they write nothing).
      if (!dryRun) {
        return new Response(
          JSON.stringify({ error: `Idempotency lookup failed: ${actErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }
    const doneToday = new Set(
      (todaysActivities ?? [])
        .filter((a) => melbourneDateISO(new Date(a.created_at)) === melToday)
        .map((a) => `${a.activity_type}:${a.lead_id}:${a.description?.match(/INV-\d{4}-\d{4}/)?.[0] ?? ''}`),
    )

    const milestoneClaimKey = (invoiceNumber: string) =>
      `${MILESTONE_CLAIM_KEY_PREFIX}${invoiceNumber}:${melToday}`

    // Milestone guard — the same atomic compare-and-set as claimTodaysDigest
    // below: exactly one invocation can INSERT the key and every other gets a
    // 23505 unique violation, so there is no read-then-write window to lose.
    // Dry runs write nothing and so must never consume the guard; they check for
    // the key read-only instead, which keeps the [DRY RUN] digest faithful
    // without claiming anything.
    const mayRecordMilestone = async (invoiceNumber: string): Promise<boolean> => {
      const key = milestoneClaimKey(invoiceNumber)

      if (dryRun) {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key')
          .eq('key', key)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return data === null
      }

      const { error } = await supabase
        .from('app_settings')
        .insert({ key, value: new Date().toISOString() })

      if (!error) return true
      if (error.code === '23505') return false
      throw new Error(error.message)
    }

    for (const inv of rows) {
      try {
        const daysOverdue = daysOverdueOn(inv.due_date, melToday)
        if (daysOverdue <= 0) continue
        const tier = ladderTierLabel(daysOverdue)

        // ---- sent → overdue transition -----------------------------------
        if (inv.status === 'sent') {
          const flagKey = `invoice_overdue:${inv.lead_id}:${inv.invoice_number}`
          // Guard 2: an earlier invocation already flagged it today
          if (doneToday.has(flagKey)) continue

          // Cheap early-out, NOT the tie-breaker. This SELECT and the RPC below
          // are two separate statements, so two invocations can and routinely do
          // both read 'sent' here — under duplicate delivery that is the normal
          // case, not the edge case. It earns its keep only by skipping an RPC
          // round-trip when the loser is far enough behind to observe the
          // winner's commit. The real tie-breaker is the conditional UPDATE
          // inside audited_mark_invoice_overdue and the boolean it returns.
          // (send-inspection-reminder:328-352 is the reference for a guard that
          // genuinely arbitrates: one conditional UPDATE, no preceding read.)
          const { data: fresh, error: freshErr } = await supabase
            .from('invoices')
            .select('status')
            .eq('id', inv.id)
            .single()
          if (freshErr) {
            errors.push(`Re-read failed for ${inv.invoice_number}: ${freshErr.message}`)
            continue
          }
          if (fresh.status !== 'sent') continue // another invocation won the race

          if (dryRun) {
            newlyFlagged.push({ invoice_number: inv.invoice_number, customer_name: inv.customer_name, total_amount: inv.total_amount, days_overdue: daysOverdue, tier })
            continue
          }

          // Audited compare-and-set. The RPC pulls
          // set_config('app.acting_user_id', SYSTEM_USER_UUID) and a conditional
          // UPDATE (WHERE status = 'sent') into one transaction, and returns TRUE
          // only if THIS call moved the row. See
          // docs/edge-function-attribution-manifest.md.
          const { data: didTransition, error: updateErr } = await supabase.rpc('audited_mark_invoice_overdue', {
            p_acting_user_id: SYSTEM_USER_UUID || null,
            p_invoice_id: inv.id,
          })
          if (updateErr) {
            errors.push(`Failed to mark ${inv.invoice_number} overdue: ${updateErr.message}`)
            continue
          }

          // A non-boolean means the deployed RPC is still the pre-compare-and-set
          // RETURNS void version, which yields null and cannot say who won.
          // Deploying this function before its migration lands is the one ordering
          // mistake that would otherwise cost every activity row with nothing
          // surfaced, so it is reported rather than assumed away.
          if (typeof didTransition !== 'boolean') {
            errors.push(
              `${inv.invoice_number}: audited_mark_invoice_overdue returned ${JSON.stringify(didTransition)}, ` +
              `expected boolean — deployed RPC predates the compare-and-set migration; activity row skipped`,
            )
            continue
          }

          // FALSE: a concurrent invocation made the transition. It owns the
          // activity row AND the digest line, so this one writes neither — and
          // skips the milestone block below for the same reason.
          if (!didTransition) {
            alreadyFlagged++
            console.log(`[check-overdue-invoices] ${inv.invoice_number}: sent→overdue already done by another invocation, skipping`)
            continue
          }

          if (inv.lead_id) {
            const { error: overdueActErr } = await supabase.from('activities').insert({
              lead_id: inv.lead_id,
              activity_type: 'invoice_overdue',
              title: 'Invoice marked overdue',
              description: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue (${formatAUD(inv.total_amount)})`,
            })
            if (overdueActErr) {
              // The status transition is already committed and is the record that
              // matters; a missing timeline row must not undo it or abort the run.
              errors.push(`${inv.invoice_number}: invoice_overdue activity insert failed: ${overdueActErr.message}`)
            }
          }
          newlyFlagged.push({ invoice_number: inv.invoice_number, customer_name: inv.customer_name, total_amount: inv.total_amount, days_overdue: daysOverdue, tier })
        }

        // ---- penalty-ladder tier crossing / admin escalation -------------
        const isTierBoundary = TIER_BOUNDARY_DAYS.includes(daysOverdue as typeof TIER_BOUNDARY_DAYS[number])
        const isEscalation = daysOverdue === ESCALATION_DAY
        if (isTierBoundary || isEscalation) {
          let mayRecord: boolean
          try {
            mayRecord = await mayRecordMilestone(inv.invoice_number)
          } catch (err) {
            // Guard data unavailable — same stance as the digest claim and the
            // idempotency lookup: skip rather than risk a duplicate row.
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`${inv.invoice_number}: milestone guard failed: ${msg}`)
            continue
          }

          if (!mayRecord) {
            alreadyMilestoned++
            console.log(`[check-overdue-invoices] ${inv.invoice_number}: day-${daysOverdue} milestone already recorded, skipping`)
            continue
          }

          const label = isEscalation ? ESCALATION_LABEL : tier
          let milestoneRecorded = false
          if (!dryRun && inv.lead_id) {
            const { error: milestoneActErr } = await supabase.from('activities').insert({
              lead_id: inv.lead_id,
              activity_type: 'invoice_milestone',
              title: `Invoice milestone: day ${daysOverdue}`,
              description: isEscalation
                ? `Invoice ${inv.invoice_number} is ${daysOverdue} days past due — ${ESCALATION_LABEL}`
                : `Invoice ${inv.invoice_number} entered penalty tier "${tier}" (day ${daysOverdue} past due)`,
            })
            if (milestoneActErr) {
              errors.push(`${inv.invoice_number}: invoice_milestone activity insert failed: ${milestoneActErr.message}`)
            } else {
              milestoneRecorded = true
            }
          }

          // The claim is taken before the write, so a write that never happened
          // has to give it back — otherwise a failed insert, or a null lead_id,
          // silently burns the key and the milestone can never be recorded. Only
          // the invocation holding the claim reaches here, so this cannot release
          // someone else's key. Dry runs never claimed, so they never release.
          // Mirrors the digest claim release below.
          if (!dryRun && !milestoneRecorded) {
            const { error: releaseErr } = await supabase
              .from('app_settings')
              .delete()
              .eq('key', milestoneClaimKey(inv.invoice_number))
            if (releaseErr) {
              errors.push(`${inv.invoice_number}: milestone claim release failed: ${releaseErr.message}`)
            }
          }

          const line: DigestLine = { invoice_number: inv.invoice_number, customer_name: inv.customer_name, total_amount: inv.total_amount, days_overdue: daysOverdue, tier: label }
          if (isEscalation) escalations.push(line)
          else milestones.push(line)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Row ${inv.invoice_number}: ${msg}`)
      }
    }

    // Running total: every issued-but-unpaid invoice (matches the dashboard's
    // Outstanding Invoices widget: sent / viewed / overdue).
    const { data: outstandingRows, error: outErr } = await supabase
      .from('invoices')
      .select('total_amount')
      .in('status', ['sent', 'viewed', 'overdue'])
    if (outErr) errors.push(`Outstanding total query failed: ${outErr.message}`)
    const outstandingCount = outstandingRows?.length ?? 0
    const outstandingTotal = (outstandingRows ?? []).reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0)

    // Digest guard. A single INSERT into app_settings, whose PRIMARY KEY (key)
    // makes it an atomic compare-and-set: exactly one invocation can create
    // today's key and every other one gets a 23505 unique violation. There is no
    // read-then-write window, so unlike the per-invoice guards above this needs
    // no re-read to arbitrate — the database decides the winner.
    const claimTodaysDigest = async (): Promise<{ won: boolean; reason: string }> => {
      const { error } = await supabase
        .from('app_settings')
        .insert({ key: `${DIGEST_CLAIM_KEY_PREFIX}${melToday}`, value: new Date().toISOString() })

      if (!error) return { won: true, reason: 'claimed' }
      if (error.code === '23505') return { won: false, reason: 'digest already posted today' }
      throw new Error(error.message)
    }

    // One digest per run, only when something happened this run.
    let slackPosted = false
    let digest: string | null = null
    let digestSuppressed: string | null = null
    if (newlyFlagged.length + milestones.length + escalations.length > 0) {
      digest = buildDigest(melToday, newlyFlagged, milestones, escalations, outstandingCount, outstandingTotal, dryRun)

      // Dry runs write nothing, so they must neither claim nor consume the guard.
      let mayPost = true
      if (!dryRun) {
        try {
          const claim = await claimTodaysDigest()
          mayPost = claim.won
          if (!claim.won) {
            digestSuppressed = claim.reason
            console.log(`[check-overdue-invoices] digest suppressed: ${claim.reason}`)
          }
        } catch (err) {
          // Same stance as the idempotency lookup above: guard data unavailable,
          // so abort the post rather than risk a duplicate digest.
          const msg = err instanceof Error ? err.message : String(err)
          mayPost = false
          digestSuppressed = `digest guard failed: ${msg}`
          errors.push(`Digest guard failed: ${msg}`)
        }
      }

      if (mayPost) {
        if (SLACK_WEBHOOK_URL) {
          slackPosted = await postSlack(SLACK_WEBHOOK_URL, digest)
        } else {
          console.warn('[check-overdue-invoices] SLACK_WEBHOOK_URL not set — digest not posted')
        }

        // Additive in-app mirror of the digest above (mapping row 8,
        // overdue_invoice_digest). It takes its OWN per-day compare-and-set
        // claim rather than riding the Slack claim: that one is released when
        // the Slack post fails, and a retry re-entering this branch must not
        // duplicate the already-inserted notification rows. The claim is
        // released only when the fan-out itself fails, so a retry can redo it.
        // Dry runs are skipped entirely — unlike the [DRY RUN] Slack post,
        // notification rows persist for every recipient. All failures are
        // non-fatal, recorded in the existing errors[] pattern.
        if (!dryRun) {
          const fanOutClaimKey = `${FANOUT_CLAIM_KEY_PREFIX}${melToday}`
          const { error: fanClaimErr } = await supabase
            .from('app_settings')
            .insert({ key: fanOutClaimKey, value: new Date().toISOString() })
          if (fanClaimErr && fanClaimErr.code === '23505') {
            console.log('[check-overdue-invoices] in-app digest already fanned out today — skipped')
          } else if (fanClaimErr) {
            errors.push(`Notification fan-out claim failed: ${fanClaimErr.message}`)
          } else {
            const fanOutResult = await fanOutNotification(supabase, {
              type: 'overdue_invoice_digest',
              title: `Overdue invoice digest — ${formatDateAU(melToday)}`,
              message: digest,
              actionUrl: '/admin',
              priority: 'normal',
            })
            if (!fanOutResult.ok) {
              errors.push(`Notification fan-out failed: ${fanOutResult.error ?? 'unknown error'}`)
              const { error: fanReleaseErr } = await supabase
                .from('app_settings')
                .delete()
                .eq('key', fanOutClaimKey)
              if (fanReleaseErr) {
                errors.push(`Notification fan-out claim release failed: ${fanReleaseErr.message}`)
              }
            }
          }
        }

        // The claim is taken before the post, so a post that never happened has
        // to give it back. Otherwise a Slack outage — or an unset webhook —
        // silently consumes today's key and blocks the retry as well, including
        // a manual re-invocation. Only the invocation holding the claim reaches
        // here, and only when nothing was posted, so the delete cannot take a
        // claim belonging to another run.
        if (!dryRun && !slackPosted) {
          const { error: releaseErr } = await supabase
            .from('app_settings')
            .delete()
            .eq('key', `${DIGEST_CLAIM_KEY_PREFIX}${melToday}`)
          if (releaseErr) {
            errors.push(`Digest claim release failed: ${releaseErr.message}`)
          } else {
            console.warn('[check-overdue-invoices] digest not posted — claim released for retry')
          }
        }
      }
    } else {
      console.log(`[check-overdue-invoices] ${melToday}: nothing newly overdue, no tier crossings — no digest posted`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        melbourneDate: melToday,
        newlyFlagged,
        milestones,
        escalations,
        alreadyFlagged,
        alreadyMilestoned,
        outstanding: { count: outstandingCount, total: Math.round(outstandingTotal * 100) / 100 },
        slackPosted,
        digestSuppressed,
        digest,
        errors,
        checkedAt: new Date().toISOString(),
      }),
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
