import { describe, it, expect } from 'vitest'
import { formatDurationHours, toLocalDayKey } from '../dateUtils'

describe('formatDurationHours', () => {
  // Reports previously rounded to whole hours before formatting, so a genuine
  // 5.5-minute response time rendered as "0 min".
  it('should render 5.5 minutes in minutes rather than as zero', () => {
    expect(formatDurationHours(5.5 / 60)).toBe('6 min')
  })

  it('should never render a non-zero duration as 0 min', () => {
    expect(formatDurationHours(1 / 3600)).toBe('1 min')
  })

  it('should render sub-hour durations in minutes', () => {
    expect(formatDurationHours(0.75)).toBe('45 min')
  })

  it('should render a one-decimal figure between 1 and 10 hours', () => {
    expect(formatDurationHours(2.25)).toBe('2.3 hrs')
  })

  it('should render whole hours above 10 hours', () => {
    expect(formatDurationHours(26.4)).toBe('26 hrs')
  })

  it('should render an em-dash when there is no duration to report', () => {
    expect(formatDurationHours(0)).toBe('—')
  })
})

describe('toLocalDayKey', () => {
  it('should key a local-midnight date to that same calendar day', () => {
    expect(toLocalDayKey(new Date(2026, 6, 29, 0, 0, 0))).toBe('2026-07-29')
  })

  it('should key a late-evening local time to that same calendar day', () => {
    expect(toLocalDayKey(new Date(2026, 6, 28, 23, 59, 0))).toBe('2026-07-28')
  })

  it('should zero-pad single-digit months and days', () => {
    expect(toLocalDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
