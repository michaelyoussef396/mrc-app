import { describe, it, expect, vi } from 'vitest'

import {
  deriveDeepLinkReason,
  describeDeepLinkReason,
  toStillNotListedReason,
  LOOKUP_FAILED_REASON,
} from '../deepLinkLeadReason'
import type { DeepLinkLeadRow } from '../deepLinkLeadReason'

// The module also exports the Supabase-backed lookup, so importing it pulls in the
// client, which throws at import time when VITE_SUPABASE_* are absent.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

function makeRow(overrides: Partial<DeepLinkLeadRow>): DeepLinkLeadRow {
  return {
    id: 'lead-1',
    full_name: 'Hunter Campbell',
    status: 'new_lead',
    assigned_to: null,
    archived_at: null,
    ...overrides,
  }
}

describe('deriveDeepLinkReason', () => {
  it('should report a missing row as not found', () => {
    expect(deriveDeepLinkReason(null).kind).toBe('not_found')
  })

  it('should report an archived lead as archived', () => {
    expect(deriveDeepLinkReason(makeRow({ archived_at: '2026-08-01T00:00:00Z' })).kind).toBe('archived')
  })

  it('should report an archived job as archived rather than expected in the list', () => {
    const row = makeRow({ status: 'job_waiting', archived_at: '2026-08-01T00:00:00Z' })
    expect(deriveDeepLinkReason(row).kind).toBe('archived')
  })

  it('should report a new lead that still carries a technician as assigned', () => {
    expect(deriveDeepLinkReason(makeRow({ assigned_to: 'tech-1' })).kind).toBe('assigned')
  })

  it('should report an assigned hipages lead as assigned', () => {
    const row = makeRow({ status: 'hipages_lead', assigned_to: 'tech-1' })
    expect(deriveDeepLinkReason(row).kind).toBe('assigned')
  })

  it('should expect an unassigned new lead to be listed', () => {
    expect(deriveDeepLinkReason(makeRow({})).kind).toBe('expected_listed')
  })

  it('should expect an unassigned hipages lead to be listed', () => {
    expect(deriveDeepLinkReason(makeRow({ status: 'hipages_lead' })).kind).toBe('expected_listed')
  })

  it('should expect a job awaiting booking to be listed even when assigned', () => {
    const row = makeRow({ status: 'job_waiting', assigned_to: 'tech-1' })
    expect(deriveDeepLinkReason(row).kind).toBe('expected_listed')
  })

  it('should report a lead awaiting inspection as booked', () => {
    const row = makeRow({ status: 'inspection_waiting', assigned_to: 'tech-1' })
    expect(deriveDeepLinkReason(row).kind).toBe('booked')
  })

  it('should report a scheduled job as booked', () => {
    const row = makeRow({ status: 'job_scheduled', assigned_to: 'tech-1' })
    expect(deriveDeepLinkReason(row).kind).toBe('booked')
  })

  it('should report a legacy completed inspection as booked', () => {
    const row = makeRow({ status: 'inspection_completed', assigned_to: 'tech-1' })
    expect(deriveDeepLinkReason(row).kind).toBe('booked')
  })

  it('should report a closed lead as closed rather than booked', () => {
    expect(deriveDeepLinkReason(makeRow({ status: 'not_landed' })).kind).toBe('closed')
  })

  it('should report a status the rail never lists as not listed', () => {
    expect(deriveDeepLinkReason(makeRow({ status: 'contacted' })).kind).toBe('not_listed')
  })

  it('should carry the lead name through for the banner', () => {
    expect(deriveDeepLinkReason(makeRow({ status: 'contacted' })).leadName).toBe('Hunter Campbell')
  })

  it('should leave the lead name empty when the row has no name', () => {
    expect(deriveDeepLinkReason(makeRow({ full_name: '' })).leadName).toBeNull()
  })

  it('should carry the assigned technician id for late name resolution', () => {
    expect(deriveDeepLinkReason(makeRow({ assigned_to: 'tech-1' })).assignedTo).toBe('tech-1')
  })
})

describe('toStillNotListedReason', () => {
  it('should replace the in-progress kind with the terminal one', () => {
    const reason = deriveDeepLinkReason(makeRow({}))
    expect(toStillNotListedReason(reason).kind).toBe('still_not_listed')
  })

  it('should keep the lead name when giving up', () => {
    const reason = deriveDeepLinkReason(makeRow({}))
    expect(toStillNotListedReason(reason).leadName).toBe('Hunter Campbell')
  })
})

describe('describeDeepLinkReason', () => {
  it('should name the technician holding an assigned lead', () => {
    const reason = deriveDeepLinkReason(makeRow({ assigned_to: 'tech-1' }))
    expect(describeDeepLinkReason(reason, 'Glen')).toBe(
      'Assigned to Glen — clear the assignment to book from here',
    )
  })

  it('should fall back to a generic name when the technician is unknown', () => {
    const reason = deriveDeepLinkReason(makeRow({ assigned_to: 'tech-unknown' }))
    expect(describeDeepLinkReason(reason, null)).toBe(
      'Assigned to another technician — clear the assignment to book from here',
    )
  })

  it('should send a booked lead back to its own page', () => {
    const reason = deriveDeepLinkReason(makeRow({ status: 'inspection_waiting' }))
    expect(describeDeepLinkReason(reason, null)).toBe('Already booked — reschedule from the lead page')
  })

  it('should spell out the status of a lead the rail never lists', () => {
    const reason = deriveDeepLinkReason(makeRow({ status: 'contacted' }))
    expect(describeDeepLinkReason(reason, null)).toBe(
      'Not in the To Schedule list (status: contacted)',
    )
  })

  it('should say a lookup failure was a connection problem, not a missing lead', () => {
    expect(describeDeepLinkReason(LOOKUP_FAILED_REASON, null)).toContain('check your connection')
  })

  it('should describe giving up after a refresh as possibly assigned or booked', () => {
    const reason = toStillNotListedReason(deriveDeepLinkReason(makeRow({})))
    expect(describeDeepLinkReason(reason, null)).toBe(
      'Still not in the list after refreshing — it may have just been assigned or booked',
    )
  })
})
