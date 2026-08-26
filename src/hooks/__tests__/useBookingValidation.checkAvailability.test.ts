import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBookingValidation, AVAILABILITY_FAILURE_MESSAGES } from '../useBookingValidation'
import type { AvailabilityOutcome, AvailabilityResult } from '../useBookingValidation'

const getSession = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}))

const BASE_PARAMS = {
  technicianId: 'tech-1',
  date: new Date('2026-08-04T00:00:00'),
  requestedTime: '09:00',
  destinationAddress: '12 Example St, Richmond VIC 3121',
}

// Overrides are deliberately loose rather than Partial<AvailabilityResult>: the whole
// point of several tests below is to build the wire shapes the Edge Function sends when
// travel is UNKNOWN, where every derived field is null. Partial<> types those fields as
// number/string/boolean and would reject exactly the payloads under test.
function availabilityPayload(overrides: Record<string, unknown> = {}): AvailabilityResult {
  return {
    source: 'google_api',
    available: true,
    technician_name: 'Glen',
    technician_home: '5 Depot Rd, Preston',
    previous_appointment: null,
    earliest_start: '08:30',
    requested_time_works: true,
    buffer_minutes: 30,
    suggestions: [],
    day_schedule: [],
    travel_time_minutes: 18,
    travel_distance_km: 12.4,
    travel_origin_address: '5 Depot Rd, Preston',
    is_feasible: true,
    ...overrides,
  } as AvailabilityResult
}

/** The wire shape for any response that could not produce a travel figure. */
const UNKNOWN_TRAVEL_FIELDS = {
  available: null,
  earliest_start: null,
  requested_time_works: null,
  buffer_minutes: null,
  suggestions: [],
  travel_time_minutes: null,
  travel_distance_km: null,
  is_feasible: null,
}

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

async function callCheckAvailability(
  params: Record<string, unknown> = BASE_PARAMS,
): Promise<AvailabilityOutcome> {
  const { result } = renderHook(() => useBookingValidation())
  let outcome!: AvailabilityOutcome
  await act(async () => {
    outcome = await result.current.checkAvailability(params as typeof BASE_PARAMS)
  })
  return outcome
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  getSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'tok' } } })
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('checkAvailability', () => {
  it('should return status "ok" when the service computes a travel time', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(availabilityPayload()))

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('ok')
  })

  it('should carry the computed payload through on success', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(availabilityPayload()))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'ok' && outcome.data.travel_time_minutes).toBe(18)
  })

  it('should not report "ok" when the technician has no starting address', async () => {
    // The Edge Function answers HTTP 200 for this case with the whole derived cluster
    // nulled out and no suggestions. It used to answer with placeholder zeroes, which
    // rendered as a confident "0 min travel / Buffer: 0 min".
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(
        availabilityPayload({
          ...UNKNOWN_TRAVEL_FIELDS,
          source: 'no_origin',
          error: 'no_starting_address',
          message: "Cannot calculate travel time - Glen's starting address is not set.",
        }),
      ),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('unavailable')
  })

  it('should not report "ok" when the mapping service does not answer', async () => {
    // No legacy `error` flag on this one — `source` is the only signal that the numbers
    // are absent. Before the guard widened, this took the success path and the booking
    // panel rendered "undefined min" and "NaN min short" against a null payload.
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(
        availabilityPayload({
          ...UNKNOWN_TRAVEL_FIELDS,
          source: 'unavailable',
          message: 'Travel time could not be calculated - the mapping service did not respond.',
        }),
      ),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('unavailable')
  })

  it('should route a no_origin source to unavailable without the legacy error flag', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(
        availabilityPayload({ ...UNKNOWN_TRAVEL_FIELDS, source: 'no_origin' }),
      ),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('unavailable')
  })

  it('should report "ok" when the function states a google_api source', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(availabilityPayload({ source: 'google_api' })),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('ok')
  })

  it('should report "ok" for a response from a function that predates the source field', async () => {
    // Edge Functions deploy separately from the frontend, so a build talking to an older
    // deployment is a real state. That deployment still sends real numbers, and an
    // absent `source` must not be read as a failure.
    const { source: _omitted, ...withoutSource } = availabilityPayload()
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(withoutSource))

    const outcome = await callCheckAvailability()

    expect(outcome.status).toBe('ok')
  })

  it('should surface the function\'s own message when travel cannot be computed', async () => {
    const message = "Cannot calculate travel time - Glen's starting address is not set."
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(availabilityPayload({ error: 'no_starting_address', message })),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'unavailable' && outcome.message).toBe(message)
  })

  it('should fall back to generic copy when the function omits its message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse(availabilityPayload({ error: 'no_starting_address' })),
    )

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'unavailable' && outcome.message).toMatch(/could not be calculated/i)
  })

  it('should classify an undeployed function (404 with a non-JSON body) as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('<html>Function not found</html>'),
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    } as unknown as Response)

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should report the HTTP status in the failure detail', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('<html>Function not found</html>'),
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    } as unknown as Response)

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.detail).toContain('HTTP 404')
  })

  it('should never parse the body of a non-2xx response', async () => {
    const json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <'))
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('<html>Function not found</html>'),
      json,
    } as unknown as Response)

    await callCheckAvailability()

    expect(json).not.toHaveBeenCalled()
  })

  it('should classify a 500 response as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should surface the shared travel-unknown copy on a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.userMessage).toBe(
      AVAILABILITY_FAILURE_MESSAGES.server,
    )
  })

  it('should classify a rejected fetch as a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('network')
  })

  it('should report the underlying cause in the detail of a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.detail).toContain('Failed to fetch')
  })

  it('should classify a malformed JSON body on a 200 response as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should classify a missing session as an auth failure', async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('auth')
  })

  it('should not call the Edge Function when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    await callCheckAvailability()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('should classify a missing technician id as a bad_params failure', async () => {
    const outcome = await callCheckAvailability({ ...BASE_PARAMS, technicianId: '' })

    expect(outcome.status === 'failed' && outcome.reason).toBe('bad_params')
  })

  it('should classify a missing requested time as a bad_params failure', async () => {
    const outcome = await callCheckAvailability({ ...BASE_PARAMS, requestedTime: '' })

    expect(outcome.status === 'failed' && outcome.reason).toBe('bad_params')
  })

  it('should not read the session when required parameters are missing', async () => {
    await callCheckAvailability({ ...BASE_PARAMS, technicianId: '' })

    expect(getSession).not.toHaveBeenCalled()
  })

  it('should leave isLoading false after the bad_params early return', async () => {
    // bad_params returns before setIsLoading(true), so it never reaches the finally
    // block. This pins that as deliberate rather than a leaked loading flag.
    const { result } = renderHook(() => useBookingValidation())

    await act(async () => {
      await result.current.checkAvailability({ ...BASE_PARAMS, technicianId: '' })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should leave isLoading false after a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))
    const { result } = renderHook(() => useBookingValidation())

    await act(async () => {
      await result.current.checkAvailability(BASE_PARAMS)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should resolve rather than reject when the session lookup itself throws', async () => {
    getSession.mockRejectedValue(new Error('transport exploded'))

    const outcome = await callCheckAvailability()

    expect(outcome.status === 'failed' && outcome.reason).toBe('network')
  })

  it('should expose the computed result on hook state for TimeSlotValidator', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse(availabilityPayload()))
    const { result } = renderHook(() => useBookingValidation())

    await act(async () => {
      await result.current.checkAvailability(BASE_PARAMS)
    })

    expect(result.current.result?.technician_name).toBe('Glen')
  })
})
