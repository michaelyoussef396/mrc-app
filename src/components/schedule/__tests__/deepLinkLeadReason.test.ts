import { describe, it, expect, vi } from 'vitest'

import {
  buildPinnedLeadView,
  deriveDeepLinkReason,
  describeDeepLinkReason,
  describePinnedBooking,
  isLeadIdShaped,
  toStillNotListedReason,
  INVALID_ID_REASON,
  LOOKUP_FAILED_REASON,
} from '../deepLinkLeadReason'
import type { DeepLinkLeadRow } from '../deepLinkLeadReason'

// The module also exports the Supabase-backed lookup, so importing it pulls in the
// client, which throws at import time when VITE_SUPABASE_* are absent.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

const LEAD_ID = 'ac8db3e6-3ef0-4b79-9c90-1d8714aff95a'

function makeRow(overrides: Partial<DeepLinkLeadRow>): DeepLinkLeadRow {
  return {
    id: LEAD_ID,
    full_name: 'Hunter Campbell',
    lead_number: 'MRC-2026-0144',
    status: 'new_lead',
    assigned_to: null,
    archived_at: null,
    property_address_street: '12 Swan Street',
    property_address_suburb: 'Richmond',
    inspection_scheduled_date: null,
    scheduled_time: null,
    job_scheduled_date: null,
    ...overrides,
  }
}

function viewFor(row: DeepLinkLeadRow | null, technicianName: string | null = null) {
  return buildPinnedLeadView({
    leadId: LEAD_ID,
    row,
    reason: deriveDeepLinkReason(row),
    technicianName,
  })
}

describe('isLeadIdShaped', () => {
  it('should accept a canonical uuid', () => {
    expect(isLeadIdShaped(LEAD_ID)).toBe(true)
  })

  it('should accept an uppercase uuid', () => {
    expect(isLeadIdShaped(LEAD_ID.toUpperCase())).toBe(true)
  })

  it('should reject a value that is not a uuid', () => {
    expect(isLeadIdShaped('garbage')).toBe(false)
  })

  it('should reject a uuid missing a block', () => {
    expect(isLeadIdShaped('ac8db3e6-3ef0-4b79-1d8714aff95a')).toBe(false)
  })

  it('should reject an empty id', () => {
    expect(isLeadIdShaped('')).toBe(false)
  })
})

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

  it('should carry the lead name through for the pinned card', () => {
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
    expect(describeDeepLinkReason(reason, null)).toBe('Not in the To Schedule list (status: Contacted)')
  })

  it('should say a lookup failure was a connection problem, not a missing lead', () => {
    expect(describeDeepLinkReason(LOOKUP_FAILED_REASON, null)).toContain('check your connection')
  })

  it('should call a missing lead not found', () => {
    expect(describeDeepLinkReason(deriveDeepLinkReason(null), null)).toBe('Lead not found')
  })

  it('should call a malformed id a broken link rather than a missing lead', () => {
    expect(describeDeepLinkReason(INVALID_ID_REASON, null)).toBe(
      "That link is broken — the lead id in it isn't valid",
    )
  })

  it('should describe giving up after a refresh as possibly assigned or booked', () => {
    const reason = toStillNotListedReason(deriveDeepLinkReason(makeRow({})))
    expect(describeDeepLinkReason(reason, null)).toBe(
      'Still not in the list after refreshing — it may have just been assigned or booked',
    )
  })
})

describe('buildPinnedLeadView', () => {
  it('should show the customer name', () => {
    expect(viewFor(makeRow({ status: 'inspection_waiting' })).name).toBe('Hunter Campbell')
  })

  it('should fall back to a placeholder name when there is no row', () => {
    expect(viewFor(null).name).toBe('Unknown lead')
  })

  it('should show the lead number', () => {
    expect(viewFor(makeRow({ status: 'inspection_waiting' })).leadNumber).toBe('MRC-2026-0144')
  })

  it('should omit a blank lead number rather than render an empty line', () => {
    expect(viewFor(makeRow({ lead_number: '   ' })).leadNumber).toBeNull()
  })

  it('should join the street and suburb into one address', () => {
    expect(viewFor(makeRow({ status: 'inspection_waiting' })).address).toBe('12 Swan Street, Richmond')
  })

  it('should show the suburb alone when the street is missing', () => {
    const row = makeRow({ status: 'inspection_waiting', property_address_street: null })
    expect(viewFor(row).address).toBe('Richmond')
  })

  it('should omit the address when neither street nor suburb is present', () => {
    const row = makeRow({ property_address_street: null, property_address_suburb: null })
    expect(viewFor(row).address).toBeNull()
  })

  it('should render an unmodelled status as readable text rather than looking it up', () => {
    expect(viewFor(makeRow({ status: 'inspection_report_pdf_completed' })).statusLabel).toBe(
      'Inspection report pdf completed',
    )
  })

  it('should omit the status when there is no row', () => {
    expect(viewFor(null).statusLabel).toBeNull()
  })

  it('should offer a link to the lead page for a lead that exists', () => {
    expect(viewFor(makeRow({ status: 'inspection_waiting' })).canViewLead).toBe(true)
  })

  it('should not offer a link to a lead that was not found', () => {
    expect(viewFor(null).canViewLead).toBe(false)
  })

  it('should not offer a link when the id in the URL was malformed', () => {
    const view = buildPinnedLeadView({
      leadId: 'garbage',
      row: null,
      reason: INVALID_ID_REASON,
      technicianName: null,
    })
    expect(view.canViewLead).toBe(false)
  })

  it('should still offer a link when the lookup failed on the network', () => {
    const view = buildPinnedLeadView({
      leadId: LEAD_ID,
      row: null,
      reason: LOOKUP_FAILED_REASON,
      technicianName: null,
    })
    expect(view.canViewLead).toBe(true)
  })
})

describe('buildPinnedLeadView bookings', () => {
  const bookedRow = makeRow({
    status: 'inspection_waiting',
    assigned_to: 'tech-1',
    inspection_scheduled_date: '2026-08-31',
    scheduled_time: '12:45',
  })

  it('should format the inspection date in Australian order', () => {
    expect(viewFor(bookedRow).booking?.date).toBe('31/08/2026')
  })

  it('should format the booking time with a period', () => {
    expect(viewFor(bookedRow).booking?.time).toBe('12:45 PM')
  })

  it('should label an inspection booking as an inspection', () => {
    expect(viewFor(bookedRow).booking?.label).toBe('Inspection')
  })

  it('should name the technician on the booking', () => {
    expect(viewFor(bookedRow, 'Clayton Jenkins').booking?.technicianName).toBe('Clayton Jenkins')
  })

  it('should show a scheduled job date when there is no inspection date', () => {
    const row = makeRow({ status: 'job_scheduled', job_scheduled_date: '2026-09-04' })
    expect(viewFor(row).booking?.date).toBe('04/09/2026')
  })

  it('should label a job booking as a job', () => {
    const row = makeRow({ status: 'job_scheduled', job_scheduled_date: '2026-09-04' })
    expect(viewFor(row).booking?.label).toBe('Job')
  })

  it('should prefer the inspection date when a lead carries both', () => {
    const row = makeRow({
      status: 'job_scheduled',
      inspection_scheduled_date: '2026-08-31',
      job_scheduled_date: '2026-09-04',
    })
    expect(viewFor(row).booking?.label).toBe('Inspection')
  })

  it('should omit the booking when no date is stored', () => {
    expect(viewFor(makeRow({ status: 'contacted' })).booking).toBeNull()
  })

  it('should omit the booking when the stored date cannot be parsed', () => {
    const row = makeRow({ status: 'inspection_waiting', inspection_scheduled_date: 'not-a-date' })
    expect(viewFor(row).booking).toBeNull()
  })

  it('should omit the time when only a date is stored', () => {
    const row = makeRow({ status: 'inspection_waiting', inspection_scheduled_date: '2026-08-31' })
    expect(viewFor(row).booking?.time).toBeNull()
  })

  it('should omit the booking entirely when there is no row', () => {
    expect(viewFor(null).booking).toBeNull()
  })
})

describe('describePinnedBooking', () => {
  it('should read as one sentence when every part is known', () => {
    expect(
      describePinnedBooking({
        label: 'Inspection',
        date: '31/08/2026',
        time: '12:45 PM',
        technicianName: 'Clayton Jenkins',
      }),
    ).toBe('Inspection 31/08/2026 at 12:45 PM with Clayton Jenkins')
  })

  it('should drop the time when it is unknown', () => {
    expect(
      describePinnedBooking({
        label: 'Job',
        date: '04/09/2026',
        time: null,
        technicianName: 'Clayton Jenkins',
      }),
    ).toBe('Job 04/09/2026 with Clayton Jenkins')
  })

  it('should drop the technician when nobody is assigned', () => {
    expect(
      describePinnedBooking({
        label: 'Inspection',
        date: '31/08/2026',
        time: '12:45 PM',
        technicianName: null,
      }),
    ).toBe('Inspection 31/08/2026 at 12:45 PM')
  })
})
