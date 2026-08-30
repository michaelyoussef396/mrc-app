import { describe, it, expect } from 'vitest'

import { filterLeadsToSchedule } from '../filterLeadsToSchedule'
import type { LeadToSchedule } from '@/hooks/useLeadsToSchedule'

function makeLead(overrides: Partial<LeadToSchedule>): LeadToSchedule {
  return {
    id: 'lead-1',
    leadNumber: 'MRC-2026-0001',
    fullName: 'Hunter Campbell',
    displayName: 'Hunter C.',
    initials: 'HC',
    suburb: 'Richmond',
    propertyType: 'House',
    phone: '0412 345 678',
    email: 'hunter@example.com',
    issueDescription: null,
    leadSource: null,
    propertyAddress: '12 Swan Street, Richmond, VIC, 3121',
    preferredDate: null,
    preferredTime: null,
    internalNotes: null,
    createdAt: '2026-08-30T00:00:00Z',
    timeAgo: '1h ago',
    scheduleType: 'inspection',
    status: 'new_lead',
    ...overrides,
  }
}

/**
 * Every searched column is NOT NULL in the database and the hook coalesces each one,
 * so these shapes cannot occur today. They exist to prove a future nullable column
 * cannot turn a keystroke into a crash, which is why they defeat the type.
 */
function makeLeadWithNullFields(overrides: Partial<Record<keyof LeadToSchedule, null>>): LeadToSchedule {
  return makeLead(overrides as Partial<LeadToSchedule>)
}

const hunter = makeLead({})
const priya = makeLead({
  id: 'lead-2',
  fullName: 'Priya Nair',
  suburb: 'Brunswick',
  phone: '(03) 9380 1122',
  propertyAddress: '4/88 Sydney Road, Brunswick, VIC, 3056',
})
const sam = makeLead({
  id: 'lead-3',
  fullName: 'Sam Ortiz',
  suburb: 'Fitzroy',
  phone: '+61455000111',
  propertyAddress: '2B High Street, Fitzroy, VIC, 3065',
})
const LEADS = [hunter, priya, sam]

describe('filterLeadsToSchedule', () => {
  it('should return every lead when the term is empty', () => {
    expect(filterLeadsToSchedule(LEADS, '')).toEqual(LEADS)
  })

  it('should return every lead when the term is only whitespace', () => {
    expect(filterLeadsToSchedule(LEADS, '   ')).toEqual(LEADS)
  })

  it('should match the full name case-insensitively', () => {
    expect(filterLeadsToSchedule(LEADS, 'CAMPBELL')).toEqual([hunter])
  })

  it('should match the suburb', () => {
    expect(filterLeadsToSchedule(LEADS, 'brunswick')).toEqual([priya])
  })

  it('should match the street from the property address', () => {
    expect(filterLeadsToSchedule(LEADS, 'swan st')).toEqual([hunter])
  })

  it('should match the postcode from the property address', () => {
    expect(filterLeadsToSchedule(LEADS, '3056')).toEqual([priya])
  })

  it('should match a phone typed without spaces', () => {
    expect(filterLeadsToSchedule(LEADS, '0412345')).toEqual([hunter])
  })

  it('should match a landline split across spaces as one number', () => {
    expect(filterLeadsToSchedule(LEADS, '03 9380 1122')).toEqual([priya])
  })

  it('should match a landline typed with brackets', () => {
    expect(filterLeadsToSchedule(LEADS, '(03) 9380')).toEqual([priya])
  })

  it('should ignore a bare area code as too short to identify a phone', () => {
    expect(filterLeadsToSchedule(LEADS, '(03)')).toEqual([])
  })

  it('should match an 04 mobile against a number stored in +61 form', () => {
    expect(filterLeadsToSchedule(LEADS, '0455 000')).toEqual([sam])
  })

  it('should require every token to match when the term has several words', () => {
    expect(filterLeadsToSchedule(LEADS, 'campbell brunswick')).toEqual([])
  })

  it('should combine a name token with a postcode token', () => {
    expect(filterLeadsToSchedule(LEADS, 'campbell 3121')).toEqual([hunter])
  })

  it('should combine a name token with a phone token', () => {
    expect(filterLeadsToSchedule(LEADS, 'campbell 0412')).toEqual([hunter])
  })

  it('should treat a unit number as address text rather than phone digits', () => {
    expect(filterLeadsToSchedule(LEADS, '2b')).toEqual([sam])
  })

  it('should not match a short street number against every phone number', () => {
    expect(filterLeadsToSchedule(LEADS, '12')).toEqual([hunter])
  })

  it('should return an empty list when nothing matches', () => {
    expect(filterLeadsToSchedule(LEADS, 'zzz')).toEqual([])
  })

  it('should not match a punctuation-only term against phone numbers', () => {
    expect(filterLeadsToSchedule(LEADS, '()')).toEqual([])
  })

  it('should not throw when a lead has no phone number', () => {
    const noPhone = makeLeadWithNullFields({ phone: null })
    expect(() => filterLeadsToSchedule([noPhone], '0412')).not.toThrow()
  })

  it('should still match a lead by name when it has no phone number', () => {
    const noPhone = makeLeadWithNullFields({ phone: null })
    expect(filterLeadsToSchedule([noPhone], 'campbell')).toEqual([noPhone])
  })

  it('should not throw when every searchable field is missing', () => {
    const empty = makeLeadWithNullFields({
      fullName: null,
      suburb: null,
      propertyAddress: null,
      phone: null,
    })
    expect(() => filterLeadsToSchedule([empty], 'campbell')).not.toThrow()
  })

  it('should drop a lead whose searchable fields are all missing', () => {
    const empty = makeLeadWithNullFields({
      fullName: null,
      suburb: null,
      propertyAddress: null,
      phone: null,
    })
    expect(filterLeadsToSchedule([empty], 'campbell')).toEqual([])
  })

  it('should treat a missing search term as no search at all', () => {
    expect(filterLeadsToSchedule(LEADS, null as unknown as string)).toEqual(LEADS)
  })
})
