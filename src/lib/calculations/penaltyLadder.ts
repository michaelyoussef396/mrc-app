/**
 * T&Cs Penalty Ladder — Phase 2D
 *
 * DISPLAY ONLY. None of these fees or interest rates are ever written to an
 * invoice or charged by MRC. After the Xero integration lands, Xero owns all
 * fee/interest calculation, reminders, and chasing. This module exists purely
 * to show admins where a sent invoice sits on the contractual penalty ladder.
 *
 * The ladder is keyed off `daysOverdue` (days past `due_date`), NOT days since
 * the invoice was sent, so it stays correct across the 7/14/30/60-day payment
 * terms selector. The T&Cs are written in days-from-sent assuming 14-day terms;
 * for default terms `daysOverdue + 14 == daysFromSent`.
 */

import type { InvoiceRow } from '@/lib/api/invoices'

// Penalty constants — DISPLAY ONLY (Xero calculates the real figures)
export const PENALTY_FEE_INCREMENT = 65        // AUD per administration-fee step
export const INTEREST_RATE_OVERDUE = 0.10      // 10% p.a. from first day overdue
export const INTEREST_RATE_VOID = 0.35         // 35% p.a. combined once warranty voids (10% + 25%)

// Ladder day thresholds (days past due_date)
const SECOND_REMINDER_DAY = 8
const FINAL_NOTICE_DAY = 15
const WARRANTY_VOID_DAY = 16
const ONGOING_START_DAY = 29
const ONGOING_PERIOD_DAYS = 14
const FEE_STEPS_AT_FINAL_NOTICE = 3            // $65 × 3 = $195 accrued by the final notice

const MS_PER_DAY = 1000 * 60 * 60 * 24

export type PenaltyTierName =
  | 'current'
  | 'overdue'
  | 'second_reminder'
  | 'final_notice'
  | 'warranty_void'
  | 'ongoing'

export interface PenaltyTier {
  tier: PenaltyTierName
  daysOverdue: number
  warrantySuspended: boolean
  warrantyVoid: boolean
  feeApplied: number        // cumulative $65 increments — DISPLAY ONLY
  interestRate: number      // 0 | 0.10 | 0.35 p.a. — DISPLAY ONLY
  label: string             // short badge label
  description: string       // full admin warning text
}

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Days an invoice is past its `due_date`. Returns 0 when not overdue, when there
 * is no due date, or when the invoice is in a non-chaseable status
 * (draft/paid/void). `now` is injectable for testing.
 */
export function getDaysOverdue(
  invoice: Pick<InvoiceRow, 'due_date' | 'status'>,
  now: Date = new Date(),
): number {
  if (!invoice.due_date) return 0
  if (invoice.status === 'draft' || invoice.status === 'paid' || invoice.status === 'void') return 0

  const due = startOfDay(new Date(`${invoice.due_date}T00:00:00`))
  const today = startOfDay(now)
  const diffDays = Math.round((today - due) / MS_PER_DAY)
  return diffDays > 0 ? diffDays : 0
}

/**
 * Cumulative administration fee for a given days-overdue. DISPLAY ONLY.
 * $65 at day 1, $130 at day 8, $195 at day 15, then +$65 every 14-day period.
 */
function cumulativeFee(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0
  if (daysOverdue <= 7) return PENALTY_FEE_INCREMENT
  if (daysOverdue <= 14) return PENALTY_FEE_INCREMENT * 2
  const ongoingPeriods = Math.floor((daysOverdue - FINAL_NOTICE_DAY) / ONGOING_PERIOD_DAYS)
  return PENALTY_FEE_INCREMENT * (FEE_STEPS_AT_FINAL_NOTICE + ongoingPeriods)
}

/**
 * Map a days-overdue count to its penalty-ladder tier. Pure. DISPLAY ONLY.
 */
export function getPenaltyTier(daysOverdue: number): PenaltyTier {
  const feeApplied = cumulativeFee(daysOverdue)

  if (daysOverdue <= 0) {
    return {
      tier: 'current',
      daysOverdue: Math.max(0, daysOverdue),
      warrantySuspended: false,
      warrantyVoid: false,
      feeApplied: 0,
      interestRate: 0,
      label: 'Current',
      description: 'Within payment terms. No fees or interest apply.',
    }
  }

  if (daysOverdue <= 7) {
    return {
      tier: 'overdue',
      daysOverdue,
      warrantySuspended: true,
      warrantyVoid: false,
      feeApplied,
      interestRate: INTEREST_RATE_OVERDUE,
      label: 'Overdue',
      description:
        'Payment overdue. Warranty suspended. Per the T&Cs a $65 administration fee and ' +
        '10% p.a. interest apply — calculated and charged by Xero, not by MRC.',
    }
  }

  if (daysOverdue < FINAL_NOTICE_DAY) {
    return {
      tier: 'second_reminder',
      daysOverdue,
      warrantySuspended: true,
      warrantyVoid: false,
      feeApplied,
      interestRate: INTEREST_RATE_OVERDUE,
      label: 'Second Reminder',
      description:
        '$130 in administration fees accrued under the T&Cs. Warranty remains suspended, ' +
        '10% p.a. interest. Figures are calculated and charged by Xero, not by MRC.',
    }
  }

  if (daysOverdue === FINAL_NOTICE_DAY) {
    return {
      tier: 'final_notice',
      daysOverdue,
      warrantySuspended: true,
      warrantyVoid: false,
      feeApplied,
      interestRate: INTEREST_RATE_OVERDUE,
      label: 'Final Notice',
      description:
        'Final notice before the warranty is voided. $195 in administration fees accrued, ' +
        '10% p.a. interest. Figures are calculated and charged by Xero, not by MRC.',
    }
  }

  if (daysOverdue < ONGOING_START_DAY) {
    return {
      tier: 'warranty_void',
      daysOverdue,
      warrantySuspended: false,
      warrantyVoid: true,
      feeApplied,
      interestRate: INTEREST_RATE_VOID,
      label: 'Warranty VOID',
      description:
        'Warranty is now void per the T&Cs. $195 in fees accrued plus 35% p.a. combined ' +
        'interest. Figures are calculated and charged by Xero, not by MRC.',
    }
  }

  return {
    tier: 'ongoing',
    daysOverdue,
    warrantySuspended: false,
    warrantyVoid: true,
    feeApplied,
    interestRate: INTEREST_RATE_VOID,
    label: 'Warranty VOID — Ongoing',
    description:
      `Warranty void. Administration fees of $${feeApplied} accrued ($65 per 14-day period) plus ` +
      '35% p.a. combined interest. Figures are calculated and charged by Xero, not by MRC.',
  }
}
