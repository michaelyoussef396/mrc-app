// The Sentry envelope is the one thing in this change that fails SILENTLY when it is
// wrong. A dashed event_id, a mismatched header, the wrong Content-Type, or a `length`
// field that disagrees with the payload's byte count all produce a 200-ish no-op: the
// event is simply never ingested. That is the exact failure mode the travel-time work
// exists to remove, so the builder gets real tests rather than a source-text guard.
//
// supabase/functions/_shared/errorReporting.ts is written with ZERO imports and touches
// Deno only lazily inside functions, specifically so this file can import it and assert
// on the real bytes. The alternative — the repo's usual duplicate-plus-drift-guard, as
// in _shared/reportHash.ts <-> src/lib/utils/reportHash.ts — would mean maintaining a
// second copy of the exact thing we need to get right once. The first test below pins
// the zero-imports constraint that makes this possible.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  __resetReportDedupe,
  buildSentryEnvelope,
  newEventId,
  parseSentryDsn,
  redactAddress,
  reportEdgeError,
} from '../../../supabase/functions/_shared/errorReporting.ts'

const MODULE_PATH = 'supabase/functions/_shared/errorReporting.ts'
const DSN = 'https://abc123@o4507.ingest.us.sentry.io/4509'

const BASE_EVENT = {
  eventId: '9f1a2b3c4d5e6f708192a3b4c5d6e7f8',
  timestamp: '2026-08-27T04:11:09.412Z',
  level: 'error' as const,
  logger: 'calculate-travel-time',
  exceptionType: 'GoogleMapsDistanceMatrixError',
  exceptionValue: 'check_availability: OVER_QUERY_LIMIT',
}

function envelopeLines(envelope: string): string[] {
  return envelope.split('\n')
}

function stubEnv(vars: Record<string, string>): void {
  vi.stubGlobal('Deno', { env: { get: (key: string) => vars[key] } })
}

function stubFetchOk(): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', mock)
  return mock
}

const FULL_ENV = {
  SUPABASE_URL: 'https://ref.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SENTRY_DSN: DSN,
}

beforeEach(() => {
  __resetReportDedupe()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('module constraints', () => {
  it('should stay free of remote imports so this test file can import it', () => {
    const source = readFileSync(resolve(process.cwd(), MODULE_PATH), 'utf8')

    expect(source).not.toMatch(/from ['"](https:|jsr:|npm:)/)
  })
})

describe('parseSentryDsn', () => {
  it('should build the envelope URL from a standard DSN', () => {
    expect(parseSentryDsn(DSN)?.url).toBe(
      'https://o4507.ingest.us.sentry.io/api/4509/envelope/?sentry_key=abc123',
    )
  })

  it('should preserve a non-default port', () => {
    expect(parseSentryDsn('https://key@localhost:9000/2')?.url).toBe(
      'https://localhost:9000/api/2/envelope/?sentry_key=key',
    )
  })

  it('should preserve a self-hosted path prefix', () => {
    expect(parseSentryDsn('https://key@sentry.example.com/relay/7')?.url).toBe(
      'https://sentry.example.com/relay/api/7/envelope/?sentry_key=key',
    )
  })

  it('should extract the public key from a legacy DSN carrying a secret', () => {
    expect(parseSentryDsn('https://key:secret@host/1')?.publicKey).toBe('key')
  })

  it('should return null when the DSN has no public key', () => {
    expect(parseSentryDsn('https://o4507.ingest.us.sentry.io/4509')).toBeNull()
  })

  it('should return null when the DSN has no project id', () => {
    expect(parseSentryDsn('https://key@host/')).toBeNull()
  })

  it('should return null for a string that is not a URL', () => {
    expect(parseSentryDsn('not a url')).toBeNull()
  })

  it('should return null for an empty string', () => {
    expect(parseSentryDsn('')).toBeNull()
  })
})

describe('newEventId', () => {
  it('should return 32 lowercase hex characters with no dashes', () => {
    const ids = Array.from({ length: 200 }, () => newEventId())

    expect(ids.every((id) => /^[0-9a-f]{32}$/.test(id))).toBe(true)
  })
})

describe('redactAddress', () => {
  it('should keep only suburb, state and postcode', () => {
    expect(redactAddress('12 Smith Street, Richmond, VIC 3121')).toBe('Richmond, VIC 3121')
  })
})

describe('buildSentryEnvelope', () => {
  it('should emit three newline-delimited parts plus a trailing newline', () => {
    const lines = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(lines).toHaveLength(4)
  })

  it('should terminate with a trailing newline', () => {
    const lines = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(lines[3]).toBe('')
  })

  it('should carry the DSN in the envelope header as a second auth path', () => {
    const [header] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(JSON.parse(header).dsn).toBe(DSN)
  })

  it('should stamp a parseable sent_at on the envelope header', () => {
    const [header] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(Number.isFinite(Date.parse(JSON.parse(header).sent_at))).toBe(true)
  })

  it('should declare the item as a JSON event', () => {
    const [, itemHeader] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(JSON.parse(itemHeader)).toEqual({ type: 'event', content_type: 'application/json' })
  })

  it('should omit length from the item header', () => {
    const [, itemHeader] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(Object.keys(JSON.parse(itemHeader))).not.toContain('length')
  })

  it('should match the payload event_id to the envelope header event_id', () => {
    const [header, , payload] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(JSON.parse(payload).event_id).toBe(JSON.parse(header).event_id)
  })

  it('should carry the exception type Sentry groups on', () => {
    const [, , payload] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(JSON.parse(payload).exception.values[0].type).toBe('GoogleMapsDistanceMatrixError')
  })

  it('should carry a stable exception value free of variable detail', () => {
    const [, , payload] = envelopeLines(buildSentryEnvelope(DSN, BASE_EVENT))

    expect(JSON.parse(payload).exception.values[0].value).toBe(
      'check_availability: OVER_QUERY_LIMIT',
    )
  })

  it('should pass an explicit fingerprint through so one issue is not opened per booking', () => {
    const fingerprint = ['calculate-travel-time', 'check_availability', 'OVER_QUERY_LIMIT']
    const [, , payload] = envelopeLines(
      buildSentryEnvelope(DSN, { ...BASE_EVENT, fingerprint }),
    )

    expect(JSON.parse(payload).fingerprint).toEqual(fingerprint)
  })

  it('should map the event level through unchanged', () => {
    const [, , payload] = envelopeLines(
      buildSentryEnvelope(DSN, { ...BASE_EVENT, level: 'warning' }),
    )

    expect(JSON.parse(payload).level).toBe('warning')
  })

  it('should stay three parts when extra carries non-ASCII text', () => {
    const envelope = buildSentryEnvelope(DSN, {
      ...BASE_EVENT,
      extra: { address_hint: 'Preston, VIC 3072 — café' },
    })

    expect(envelopeLines(envelope)).toHaveLength(4)
  })
})

describe('reportEdgeError', () => {
  it('should write to both sinks when the DSN and service key are present', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('should post the error_logs row to PostgREST', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(fetchMock.mock.calls[0][0]).toBe('https://ref.supabase.co/rest/v1/error_logs')
  })

  it('should tag the error_logs row as an edge function error', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).error_type).toBe('edge_function_error')
  })

  it('should authenticate the error_logs write with the service role key', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer service-role-key')
  })

  it('should post the Sentry envelope with the envelope content type', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe(
      'application/x-sentry-envelope',
    )
  })

  it('should skip Sentry when no DSN is configured', async () => {
    stubEnv({ SUPABASE_URL: FULL_ENV.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'k' })
    stubFetchOk()

    const result = await reportEdgeError({ message: 'boom' })

    expect(result.sentry).toBe('skipped')
  })

  it('should still write error_logs when no DSN is configured', async () => {
    stubEnv({ SUPABASE_URL: FULL_ENV.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'k' })
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should skip the error_logs write when the service key is absent', async () => {
    stubEnv({ SENTRY_DSN: DSN })
    stubFetchOk()

    const result = await reportEdgeError({ message: 'boom' })

    expect(result.errorLog).toBe('skipped')
  })

  it('should resolve rather than reject when both sinks throw', async () => {
    stubEnv(FULL_ENV)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(reportEdgeError({ message: 'boom' })).resolves.toMatchObject({
      errorLog: 'failed',
      sentry: 'failed',
    })
  })

  it('should mark Sentry failed when ingest returns a non-ok status', async () => {
    stubEnv(FULL_ENV)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )

    const result = await reportEdgeError({ message: 'boom' })

    expect(result.sentry).toBe('failed')
  })

  it('should suppress a repeat report inside the dedupe window', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({ message: 'boom', dedupeKey: 'maps-api:check_availability:DENIED' })
    fetchMock.mockClear()
    await reportEdgeError({ message: 'boom', dedupeKey: 'maps-api:check_availability:DENIED' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should keep the full address out of the Sentry envelope', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({
      message: 'boom',
      context: { destination: '12 Smith Street, Richmond, VIC 3121' },
      extra: { address_hint: redactAddress('12 Smith Street, Richmond, VIC 3121') },
    })

    expect(fetchMock.mock.calls[1][1].body).not.toContain('12 Smith Street')
  })

  it('should keep the full address in the admin-only error_logs row', async () => {
    stubEnv(FULL_ENV)
    const fetchMock = stubFetchOk()

    await reportEdgeError({
      message: 'boom',
      context: { destination: '12 Smith Street, Richmond, VIC 3121' },
    })

    expect(fetchMock.mock.calls[0][1].body).toContain('12 Smith Street')
  })
})
