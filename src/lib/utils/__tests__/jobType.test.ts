import { describe, expect, it } from 'vitest'

import { isRemediationJob } from '../jobType'

describe('isRemediationJob', () => {
  it('should be true for the canonical job event type', () => {
    expect(isRemediationJob('job')).toBe(true)
  })

  it('should be true for legacy removal event types', () => {
    expect(isRemediationJob('Mould Removal')).toBe(true)
  })

  it('should be false for inspections', () => {
    expect(isRemediationJob('inspection')).toBe(false)
  })

  it('should be false when the event type is missing', () => {
    expect(isRemediationJob(undefined)).toBe(false)
  })
})
