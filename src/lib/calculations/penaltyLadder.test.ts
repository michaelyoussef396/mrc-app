import { describe, it, expect } from 'vitest'
import {
  getDaysOverdue,
  getPenaltyTier,
  PENALTY_FEE_INCREMENT,
  INTEREST_RATE_OVERDUE,
  INTEREST_RATE_VOID,
} from './penaltyLadder'

// ---------------------------------------------------------------------------
// getPenaltyTier — keyed off daysOverdue (days past due_date). DISPLAY ONLY.
// ---------------------------------------------------------------------------

describe('getPenaltyTier — tier boundaries', () => {
  it('should be current at 0 days overdue', () => {
    expect(getPenaltyTier(0).tier).toBe('current')
  })

  it('should be current for negative days overdue', () => {
    expect(getPenaltyTier(-5).tier).toBe('current')
  })

  it('should be overdue at day 1', () => {
    expect(getPenaltyTier(1).tier).toBe('overdue')
  })

  it('should be overdue at day 7', () => {
    expect(getPenaltyTier(7).tier).toBe('overdue')
  })

  it('should be second_reminder at day 8', () => {
    expect(getPenaltyTier(8).tier).toBe('second_reminder')
  })

  it('should be second_reminder at day 14', () => {
    expect(getPenaltyTier(14).tier).toBe('second_reminder')
  })

  it('should be final_notice at day 15', () => {
    expect(getPenaltyTier(15).tier).toBe('final_notice')
  })

  it('should be warranty_void at day 16', () => {
    expect(getPenaltyTier(16).tier).toBe('warranty_void')
  })

  it('should be warranty_void at day 28', () => {
    expect(getPenaltyTier(28).tier).toBe('warranty_void')
  })

  it('should be ongoing at day 29', () => {
    expect(getPenaltyTier(29).tier).toBe('ongoing')
  })
})

describe('getPenaltyTier — warranty flags', () => {
  it('should not suspend or void warranty when current', () => {
    const tier = getPenaltyTier(0)
    expect(tier.warrantySuspended).toBe(false)
    expect(tier.warrantyVoid).toBe(false)
  })

  it('should suspend warranty (not void) at day 1', () => {
    const tier = getPenaltyTier(1)
    expect(tier.warrantySuspended).toBe(true)
    expect(tier.warrantyVoid).toBe(false)
  })

  it('should suspend warranty (not void) at final notice day 15', () => {
    const tier = getPenaltyTier(15)
    expect(tier.warrantySuspended).toBe(true)
    expect(tier.warrantyVoid).toBe(false)
  })

  it('should void warranty (not suspended) at day 16', () => {
    const tier = getPenaltyTier(16)
    expect(tier.warrantyVoid).toBe(true)
    expect(tier.warrantySuspended).toBe(false)
  })

  it('should keep warranty void in ongoing tier', () => {
    expect(getPenaltyTier(43).warrantyVoid).toBe(true)
  })
})

describe('getPenaltyTier — interest rate (display only)', () => {
  it('should apply no interest when current', () => {
    expect(getPenaltyTier(0).interestRate).toBe(0)
  })

  it('should apply 10% p.a. from day 1', () => {
    expect(getPenaltyTier(1).interestRate).toBe(INTEREST_RATE_OVERDUE)
  })

  it('should apply 10% p.a. at final notice day 15', () => {
    expect(getPenaltyTier(15).interestRate).toBe(INTEREST_RATE_OVERDUE)
  })

  it('should apply 35% p.a. combined once warranty voids at day 16', () => {
    expect(getPenaltyTier(16).interestRate).toBe(INTEREST_RATE_VOID)
  })
})

describe('getPenaltyTier — cumulative fee (display only, $65 increments)', () => {
  it('should accrue no fee when current', () => {
    expect(getPenaltyTier(0).feeApplied).toBe(0)
  })

  it('should accrue one $65 increment in the overdue tier', () => {
    expect(getPenaltyTier(1).feeApplied).toBe(PENALTY_FEE_INCREMENT)
    expect(getPenaltyTier(7).feeApplied).toBe(PENALTY_FEE_INCREMENT)
  })

  it('should accrue $130 in the second-reminder tier', () => {
    expect(getPenaltyTier(8).feeApplied).toBe(PENALTY_FEE_INCREMENT * 2)
  })

  it('should accrue $195 at final notice', () => {
    expect(getPenaltyTier(15).feeApplied).toBe(PENALTY_FEE_INCREMENT * 3)
  })

  it('should hold at $195 through the warranty_void window before the next period', () => {
    expect(getPenaltyTier(28).feeApplied).toBe(PENALTY_FEE_INCREMENT * 3)
  })

  it('should accrue a fourth $65 increment at the first ongoing period (day 29)', () => {
    expect(getPenaltyTier(29).feeApplied).toBe(PENALTY_FEE_INCREMENT * 4)
  })

  it('should accrue a fifth $65 increment at the second ongoing period (day 43)', () => {
    expect(getPenaltyTier(43).feeApplied).toBe(PENALTY_FEE_INCREMENT * 5)
  })
})

// ---------------------------------------------------------------------------
// getDaysOverdue — status gating + due-date arithmetic
// ---------------------------------------------------------------------------

describe('getDaysOverdue', () => {
  const fixedNow = new Date('2026-06-23T10:00:00')

  it('should return 0 when there is no due date', () => {
    expect(getDaysOverdue({ due_date: null, status: 'sent' }, fixedNow)).toBe(0)
  })

  it('should return 0 for a draft invoice even if the date passed', () => {
    expect(getDaysOverdue({ due_date: '2026-06-01', status: 'draft' }, fixedNow)).toBe(0)
  })

  it('should return 0 for a paid invoice even if the date passed', () => {
    expect(getDaysOverdue({ due_date: '2026-06-01', status: 'paid' }, fixedNow)).toBe(0)
  })

  it('should return 0 for a void invoice even if the date passed', () => {
    expect(getDaysOverdue({ due_date: '2026-06-01', status: 'void' }, fixedNow)).toBe(0)
  })

  it('should return 0 when a sent invoice is not yet due', () => {
    expect(getDaysOverdue({ due_date: '2026-06-30', status: 'sent' }, fixedNow)).toBe(0)
  })

  it('should return 0 on the due date itself', () => {
    expect(getDaysOverdue({ due_date: '2026-06-23', status: 'sent' }, fixedNow)).toBe(0)
  })

  it('should count days past due for a sent invoice', () => {
    expect(getDaysOverdue({ due_date: '2026-06-13', status: 'sent' }, fixedNow)).toBe(10)
  })

  it('should count days past due for an already-overdue invoice', () => {
    expect(getDaysOverdue({ due_date: '2026-06-03', status: 'overdue' }, fixedNow)).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Integration: a 20-day-overdue invoice lands in warranty_void (T8 acceptance)
// ---------------------------------------------------------------------------

describe('getDaysOverdue + getPenaltyTier integration', () => {
  it('should place a 20-day-overdue sent invoice in the warranty_void tier', () => {
    const now = new Date('2026-06-23T10:00:00')
    const days = getDaysOverdue({ due_date: '2026-06-03', status: 'sent' }, now)
    const tier = getPenaltyTier(days)
    expect(days).toBe(20)
    expect(tier.tier).toBe('warranty_void')
    expect(tier.warrantyVoid).toBe(true)
    expect(tier.interestRate).toBe(INTEREST_RATE_VOID)
  })
})
