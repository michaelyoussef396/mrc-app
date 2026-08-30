// R8 regression cover for the calendar Cancel Booking action.
//
// Two defects lived in handleCancelBooking:
//   1. The lead reverted to `new_lead` while keeping `assigned_to` (and the rest
//      of the booking-owned columns) set, so the lead vanished from every
//      `assigned_to IS NULL` queue — the To Schedule rail — while still showing
//      in the New Lead tab.
//   2. There was no event-type check, so cancelling a JOB sent a job-stage lead
//      back to `new_lead` instead of `job_waiting`.
//
// Only the network boundary (supabase), the toast, and Sentry are faked;
// buildBookingRevertUpdates and CANCELLED_EVENT_REVERT_STATUS stay real.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { LEAD_BOOKING_FIELDS } from '@/lib/leadBookingFields'
import type { CalendarEvent } from '@/hooks/useScheduleCalendar'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

import { EventDetailsPanel } from '../EventDetailsPanel'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Recording supabase query builder
// ---------------------------------------------------------------------------

interface BuilderCall {
  method: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[]
}

const allCalls: Array<{ table: string; calls: BuilderCall[] }> = []

function buildBuilder(calls: BuilderCall[]) {
  const builder: Record<string, unknown> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.update = vi.fn((...args: any[]) => { calls.push({ method: 'update', args }); return builder })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.eq = vi.fn((...args: any[]) => { calls.push({ method: 'eq', args }); return builder })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.insert = vi.fn((...args: any[]) => {
    calls.push({ method: 'insert', args })
    return Promise.resolve({ error: null })
  })
  // Thenable so `await supabase.from(t).update(p).eq(c, v)` resolves.
  builder.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ error: null }).then(onFulfilled)
  return builder
}

/** Every recorded `.update()` against `table`, as { payload, id } pairs. */
function updatesOn(table: string): Array<{ payload: unknown; id: unknown }> {
  return allCalls
    .filter((entry) => entry.table === table)
    .map((entry) => ({
      payload: entry.calls.find((call) => call.method === 'update')?.args[0],
      id: entry.calls.find((call) => call.method === 'eq')?.args[1],
    }))
}

/** The single `.update()` written to `table`. Throws if there wasn't exactly one. */
function updateOn(table: string): { payload: Record<string, unknown>; id: unknown } {
  const updates = updatesOn(table)
  if (updates.length !== 1) throw new Error(`expected 1 update on ${table}, recorded ${updates.length}`)
  return updates[0] as { payload: Record<string, unknown>; id: unknown }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVENT_ID = 'booking-1'
const LEAD_ID = 'lead-1'

/** Derived from the shared constant on purpose — a hand-copied list is the bug. */
const ALL_BOOKING_FIELDS_NULLED = Object.fromEntries(
  LEAD_BOOKING_FIELDS.map((field) => [field, null]),
)

function calendarEvent(eventType: CalendarEvent['eventType']): CalendarEvent {
  return {
    id: EVENT_ID,
    leadId: LEAD_ID,
    title: 'Jane Citizen',
    clientName: 'Jane Citizen',
    suburb: 'Richmond',
    postcode: '3121',
    address: '12 Smith Street, Richmond',
    startDatetime: new Date('2026-09-02T09:00:00+10:00'),
    endDatetime: new Date('2026-09-02T11:00:00+10:00'),
    eventType,
    status: 'scheduled',
    technicianId: 'tech-1',
    technicianName: 'Glen Marshall',
    technicianInitial: 'G',
    technicianColor: '#137fec',
  }
}

function renderPanel(eventType: CalendarEvent['eventType']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <EventDetailsPanel event={calendarEvent(eventType)} open onClose={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
  return { invalidateQueries }
}

/** Press Cancel Booking and wait for the write sequence to settle. */
async function cancelBooking() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /cancel booking/i }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Booking cancelled'))
}

const confirmStub = vi.fn(() => true)

beforeEach(() => {
  vi.clearAllMocks()
  allCalls.length = 0
  confirmStub.mockReturnValue(true)
  vi.stubGlobal('confirm', confirmStub)
  mockFrom.mockImplementation((table: string) => {
    const calls: BuilderCall[] = []
    allCalls.push({ table, calls })
    return buildBuilder(calls)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EventDetailsPanel — cancelling an inspection booking', () => {
  it('should revert the lead to new_lead when an inspection is cancelled', async () => {
    renderPanel('inspection')

    await cancelBooking()

    expect(updateOn('leads').payload.status).toBe('new_lead')
  })

  it('should clear every booking-owned column when an inspection is cancelled', async () => {
    renderPanel('inspection')

    await cancelBooking()

    expect(updateOn('leads').payload).toEqual(expect.objectContaining(ALL_BOOKING_FIELDS_NULLED))
  })

  it('should mark the calendar booking cancelled when an inspection is cancelled', async () => {
    renderPanel('inspection')

    await cancelBooking()

    expect(updateOn('calendar_bookings')).toEqual({ payload: { status: 'cancelled' }, id: EVENT_ID })
  })
})

describe('EventDetailsPanel — cancelling a job booking', () => {
  it('should revert the lead to job_waiting when a job is cancelled', async () => {
    renderPanel('job')

    await cancelBooking()

    expect(updateOn('leads').payload.status).toBe('job_waiting')
  })

  it('should clear every booking-owned column when a job is cancelled', async () => {
    renderPanel('job')

    await cancelBooking()

    expect(updateOn('leads').payload).toEqual(expect.objectContaining(ALL_BOOKING_FIELDS_NULLED))
  })
})

describe('EventDetailsPanel — declining the confirmation', () => {
  it('should leave the lead untouched when the confirmation is declined', async () => {
    confirmStub.mockReturnValue(false)
    renderPanel('inspection')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cancel booking/i }))

    expect(updatesOn('leads')).toEqual([])
  })
})

describe('EventDetailsPanel — cache invalidation', () => {
  it('should invalidate the calendar, To Schedule rail and leads caches after cancelling', async () => {
    const { invalidateQueries } = renderPanel('inspection')

    await cancelBooking()

    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ['schedule-calendar'],
      ['leads-to-schedule'],
      ['leads'],
    ])
  })
})
