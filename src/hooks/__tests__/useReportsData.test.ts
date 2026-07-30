import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDateRange, generateTimeline, TimePeriod } from '../useReportsData'

// Regression cover for the Reports audit (2026-07-29).
//
// The chart previously keyed its axis buckets with toISOString() (UTC) while the
// Total Leads KPI filtered on the real timestamp. In UTC+10 the two disagreed by
// a day: points plotted one day late, and a lead created after 10:00 local had
// no bucket at all — the KPI said 1, the chart said 0 on the same screen.

const MELBOURNE_OFFSET_HOURS = 10

/** Leads the KPI would count: created_at inside [start, end]. */
function kpiCount(leads: Array<{ created_at: string }>, start: Date, end: Date): number {
  return leads.filter(l => {
    const t = new Date(l.created_at)
    return t >= start && t <= end
  }).length
}

function chartTotal(timeline: Array<{ leads: number }>): number {
  return timeline.reduce((sum, point) => sum + point.leads, 0)
}

/** ISO instant for a given Melbourne wall-clock time. */
function melbourne(year: number, month: number, day: number, hour: number, minute = 0): string {
  return new Date(Date.UTC(year, month - 1, day, hour - MELBOURNE_OFFSET_HOURS, minute)).toISOString()
}

describe('generateTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 29 Jul 2026, 13:30 Melbourne
    vi.setSystemTime(new Date(melbourne(2026, 7, 29, 13, 30)))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should count a lead created late in the evening of the day it arrived', () => {
    // The exact production row that exposed the bug: 28 Jul 2026, 18:52 Melbourne.
    const leads = [{ created_at: melbourne(2026, 7, 28, 18, 52) }]
    const { start, end } = getDateRange('month')

    expect(chartTotal(generateTimeline(leads, 'month', start, end))).toBe(1)
  })

  it('should plot that lead under its own calendar day, not the day after', () => {
    const leads = [{ created_at: melbourne(2026, 7, 28, 18, 52) }]
    const { start, end } = getDateRange('month')

    const point = generateTimeline(leads, 'month', start, end).find(p => p.leads > 0)

    expect(point?.label).toBe('28 July')
  })

  it('should still count a lead created today after 10am, when the old UTC key had no bucket', () => {
    const leads = [{ created_at: melbourne(2026, 7, 29, 11, 15) }]
    const { start, end } = getDateRange('month')

    expect(chartTotal(generateTimeline(leads, 'month', start, end))).toBe(1)
  })

  it('should count a lead created today before 10am', () => {
    const leads = [{ created_at: melbourne(2026, 7, 29, 6, 5) }]
    const { start, end } = getDateRange('month')

    expect(chartTotal(generateTimeline(leads, 'month', start, end))).toBe(1)
  })

  it('should count a lead created on the first day of the window', () => {
    const leads = [{ created_at: melbourne(2026, 6, 30, 9, 0) }]
    const { start, end } = getDateRange('month')

    expect(chartTotal(generateTimeline(leads, 'month', start, end))).toBe(1)
  })
})

describe('chart total matches the Total Leads KPI', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(melbourne(2026, 7, 29, 13, 30)))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Spread across the boundaries that used to drop or misplace rows: the 10:00
  // local UTC-rollover, the first bucket, and the last bucket.
  const leads = [
    { created_at: melbourne(2026, 6, 30, 0, 30) },
    { created_at: melbourne(2026, 7, 5, 9, 59) },
    { created_at: melbourne(2026, 7, 5, 10, 1) },
    { created_at: melbourne(2026, 7, 28, 18, 52) },
    { created_at: melbourne(2026, 7, 29, 11, 15) },
  ]

  it.each<TimePeriod>(['week', 'month', 'year'])(
    'should agree for the %s period',
    period => {
      const { start, end } = getDateRange(period)
      const inWindow = leads.filter(l => new Date(l.created_at) >= start && new Date(l.created_at) <= end)

      expect(chartTotal(generateTimeline(inWindow, period, start, end)))
        .toBe(kpiCount(inWindow, start, end))
    }
  )

  it('should agree for the today period', () => {
    const { start, end } = getDateRange('today')
    const inWindow = leads.filter(l => new Date(l.created_at) >= start && new Date(l.created_at) <= end)

    expect(chartTotal(generateTimeline(inWindow, 'today', start, end)))
      .toBe(kpiCount(inWindow, start, end))
  })

  it('should lose no leads when every lead falls inside the month window', () => {
    const { start, end } = getDateRange('month')

    expect(chartTotal(generateTimeline(leads, 'month', start, end))).toBe(leads.length)
  })
})

describe('empty period', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(melbourne(2026, 7, 29, 13, 30)))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // With no leads in the window the chart still renders a full set of buckets,
  // every one at zero — the flat-line state, not a crash and not "No data".
  it('should produce a bucket for every day even with no leads', () => {
    const { start, end } = getDateRange('month')
    expect(generateTimeline([], 'month', start, end).length).toBe(30)
  })

  it('should total zero rather than NaN', () => {
    const { start, end } = getDateRange('month')
    expect(chartTotal(generateTimeline([], 'month', start, end))).toBe(0)
  })

  it('should give every bucket a numeric zero count', () => {
    const { start, end } = getDateRange('month')
    const nonNumeric = generateTimeline([], 'month', start, end).filter(p => !Number.isFinite(p.leads))
    expect(nonNumeric).toEqual([])
  })

  it('should agree with a zero KPI count', () => {
    const { start, end } = getDateRange('month')
    expect(chartTotal(generateTimeline([], 'month', start, end))).toBe(kpiCount([], start, end))
  })
})
