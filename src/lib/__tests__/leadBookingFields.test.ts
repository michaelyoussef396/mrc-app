// R8 — the shared revert-clearing contract.
//
// Three surfaces walk a lead backwards past its booking (LeadDetail's atomic
// revert, the calendar Cancel Booking action, Leads Management Reactivate).
// Before this module they each carried their own field list, and two of them
// omitted assigned_to — which left a `new_lead` invisible to every
// `assigned_to IS NULL` queue while still listed in the New Lead tab.
// These tests pin the one list so a fourth divergent copy cannot appear.

import { describe, it, expect } from 'vitest'

import {
  CANCELLED_EVENT_REVERT_STATUS,
  LEAD_BOOKING_FIELDS,
  buildBookingRevertUpdates,
} from '../leadBookingFields'

describe('LEAD_BOOKING_FIELDS', () => {
  it('should list exactly the six lead columns a booking owns', () => {
    expect([...LEAD_BOOKING_FIELDS]).toEqual([
      'assigned_to',
      'inspection_scheduled_date',
      'scheduled_time',
      'scheduled_dates',
      'booked_at',
      'job_scheduled_date',
    ])
  })

  it('should not list customer preference columns, which belong to the customer', () => {
    expect([...LEAD_BOOKING_FIELDS].filter((f) => f.startsWith('customer_preferred'))).toEqual([])
  })
})

describe('CANCELLED_EVENT_REVERT_STATUS', () => {
  it('should return a cancelled inspection to new_lead', () => {
    expect(CANCELLED_EVENT_REVERT_STATUS.inspection).toBe('new_lead')
  })

  it('should return a cancelled job to job_waiting, not new_lead', () => {
    expect(CANCELLED_EVENT_REVERT_STATUS.job).toBe('job_waiting')
  })
})

describe('buildBookingRevertUpdates', () => {
  it('should write the requested status', () => {
    expect(buildBookingRevertUpdates('new_lead').status).toBe('new_lead')
  })

  it('should null every booking-owned column', () => {
    const updates = buildBookingRevertUpdates('new_lead')
    expect(LEAD_BOOKING_FIELDS.map((f) => updates[f])).toEqual(LEAD_BOOKING_FIELDS.map(() => null))
  })

  it('should null assigned_to, the column whose absence hid reactivated leads', () => {
    expect(buildBookingRevertUpdates('new_lead').assigned_to).toBeNull()
  })

  it('should null job_scheduled_date so a cancelled job leaves no phantom start date', () => {
    expect(buildBookingRevertUpdates('job_waiting').job_scheduled_date).toBeNull()
  })

  it('should write no column beyond status and the booking fields', () => {
    expect(Object.keys(buildBookingRevertUpdates('job_waiting')).sort()).toEqual(
      ['status', ...LEAD_BOOKING_FIELDS].sort(),
    )
  })

  it('should clear the same columns whichever status it reverts to', () => {
    const { status: _inspection, ...inspectionFields } = buildBookingRevertUpdates('new_lead')
    const { status: _job, ...jobFields } = buildBookingRevertUpdates('job_waiting')
    expect(inspectionFields).toEqual(jobFields)
  })
})
