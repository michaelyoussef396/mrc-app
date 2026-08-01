import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBookingValidation, RECOMMENDED_DATES_FAILURE_MESSAGES } from '../useBookingValidation'
import type { DateRecommendation, RecommendedDatesOutcome } from '../useBookingValidation'

const getSession = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}))

const BASE_PARAMS = {
  technicianId: 'tech-1',
  destinationAddress: '12 Example St, Richmond VIC 3121',
  destinationSuburb: 'Richmond',
  daysAhead: 14,
  durationMinutes: 60,
}

const recommendation = (date: string): DateRecommendation => ({
  date,
  day_name: 'Mon',
  display_date: '4 Aug',
  score: 90,
  rating: 'best',
  reason: 'Close to an existing job',
  appointment_count: 1,
  travel_from_home_minutes: 18,
  available_slots: ['09:00', '11:00'],
})

function mockJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

async function callGetRecommendedDates(
  params: typeof BASE_PARAMS | Record<string, unknown> = BASE_PARAMS,
): Promise<RecommendedDatesOutcome> {
  const { result } = renderHook(() => useBookingValidation())
  let outcome!: RecommendedDatesOutcome
  await act(async () => {
    outcome = await result.current.getRecommendedDates(params as typeof BASE_PARAMS)
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

describe('getRecommendedDates', () => {
  it('should return status "ok" when the service returns at least one recommended day', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [recommendation('2026-08-04'), recommendation('2026-08-05')],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
        has_missing_address_warning: true,
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status).toBe('ok')
  })

  it('should preserve every recommendation returned by the service', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [recommendation('2026-08-04'), recommendation('2026-08-05')],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'ok' && outcome.recommendations).toHaveLength(2)
  })

  it('should default has_missing_address_warning to false when the service omits it', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [recommendation('2026-08-04')],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'ok' && outcome.has_missing_address_warning).toBe(false)
  })

  it('should return status "empty" when the service answers with zero recommended days', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status).toBe('empty')
  })

  it('should still carry the technician name on an empty result so the travel panel can render', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'empty' && outcome.technician_name).toBe('Glen')
  })

  it('should still carry the technician home address on an empty result', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJsonResponse({
        recommendations: [],
        technician_name: 'Glen',
        technician_home: '5 Depot Rd, Preston',
      }),
    )

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'empty' && outcome.technician_home).toBe('5 Depot Rd, Preston')
  })

  it('should classify an undeployed function (404 with a non-JSON body) as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('<html>Function not found</html>'),
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    } as unknown as Response)

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should report the HTTP status in the failure detail for an undeployed function', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi.fn().mockResolvedValue('<html>Function not found</html>'),
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
    } as unknown as Response)

    const outcome = await callGetRecommendedDates()

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

    await callGetRecommendedDates()

    expect(json).not.toHaveBeenCalled()
  })

  it('should surface the shared "pick a date manually" copy on a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.userMessage).toBe(
      RECOMMENDED_DATES_FAILURE_MESSAGES.server,
    )
  })

  it('should classify a 500 response as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should classify a rejected fetch as a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('network')
  })

  it('should report the underlying cause in the detail of a network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.detail).toContain('Failed to fetch')
  })

  it('should classify a malformed JSON body on a 200 response as a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('server')
  })

  it('should classify a missing session as an auth failure', async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('auth')
  })

  it('should not call the Edge Function when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })

    await callGetRecommendedDates()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('should classify a missing technician id as a bad_params failure', async () => {
    const outcome = await callGetRecommendedDates({ ...BASE_PARAMS, technicianId: '' })

    expect(outcome.status === 'failed' && outcome.reason).toBe('bad_params')
  })

  it('should classify a missing destination address as a bad_params failure', async () => {
    const outcome = await callGetRecommendedDates({ ...BASE_PARAMS, destinationAddress: '' })

    expect(outcome.status === 'failed' && outcome.reason).toBe('bad_params')
  })

  it('should not read the session when required parameters are missing', async () => {
    await callGetRecommendedDates({ ...BASE_PARAMS, technicianId: '' })

    expect(getSession).not.toHaveBeenCalled()
  })

  it('should leave isLoading false after the bad_params early return', async () => {
    // bad_params returns before setIsLoading(true), so it never reaches the finally block.
    // This pins that as deliberate rather than a leaked loading flag.
    const { result } = renderHook(() => useBookingValidation())

    await act(async () => {
      await result.current.getRecommendedDates({ ...BASE_PARAMS, technicianId: '' })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should leave isLoading false after a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(mockJsonResponse({ error: 'boom' }, 500))
    const { result } = renderHook(() => useBookingValidation())

    await act(async () => {
      await result.current.getRecommendedDates(BASE_PARAMS)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should resolve rather than reject when the session lookup itself throws', async () => {
    getSession.mockRejectedValue(new Error('transport exploded'))

    const outcome = await callGetRecommendedDates()

    expect(outcome.status === 'failed' && outcome.reason).toBe('network')
  })
})
