// Two-sink error reporting for Edge Functions.
//
//   Sink 1  public.error_logs, via raw PostgREST. Matches the hand-rolled writers
//           already in generate-inspection-summary and send-slack-notification.
//   Sink 2  Sentry, via a hand-built envelope POST. Inert until SENTRY_DSN is set as
//           an Edge Function secret.
//
// There is deliberately NO Sentry SDK import. Every EF dependency here is a pinned
// https://esm.sh URL; @sentry/deno would be the first runtime jsr:/npm: dependency in
// the whole function tree, and its main value-add is tracing — which is switched off
// for /functions/ anyway (src/lib/sentry.ts:26-31, because EF CORS omits baggage and
// sentry-trace headers).
//
// This module has ZERO imports on purpose, and touches Deno only lazily inside
// functions. That is what lets src/lib/__tests__/edgeErrorReporting.test.ts import it
// directly and assert on the real envelope bytes rather than duplicating the builder.
// Getting these bytes wrong means silent non-delivery — the exact failure mode this
// module exists to fix — so it needs real tests, not a source-text guard. A remote
// import added here would break that; a test asserts the constraint.
//
// Like _shared/fanout.ts, nothing here ever throws. A caller can fire it right next to
// a return statement without any extra try/catch.

// ---------------------------------------------------------------------------
// Runtime shims — structural, so this file typechecks under both Deno and Node
// ---------------------------------------------------------------------------

interface EnvReader {
  env: { get(key: string): string | undefined }
}

interface WaitUntilHost {
  waitUntil?: (promise: Promise<unknown>) => void
}

function readEnv(key: string): string | undefined {
  try {
    // Double assertion: a single assertion off `typeof globalThis` trips
    // "insufficiently overlapping types" under Deno's strict config, and going
    // through globalThis avoids depending on the jsr: ambient declaration.
    return (globalThis as unknown as { Deno?: EnvReader }).Deno?.env.get(key)
  } catch {
    // Deno throws on env access without --allow-env. Treat as unset.
    return undefined
  }
}

/** 32 lowercase hex chars, no dashes. Sentry rejects a dashed UUID as an event_id. */
export function newEventId(): string {
  const webCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID().replace(/-/g, '')
  }
  let id = ''
  while (id.length < 32) id += Math.floor(Math.random() * 16).toString(16)
  return id.slice(0, 32)
}

/**
 * Suburb, state and postcode only — the tail of a comma-separated address.
 *
 * error_logs is RLS-restricted to admins and can hold a customer's full street address.
 * Sentry is a third party and gets this instead: enough to diagnose a ZERO_RESULTS or a
 * bad-postcode route failure, without exporting where somebody lives.
 */
export function redactAddress(address: string): string {
  return address.split(',').slice(-2).join(',').trim()
}

// ---------------------------------------------------------------------------
// Sentry DSN + envelope
// ---------------------------------------------------------------------------

export interface SentryEndpoint {
  /** Fully-formed envelope URL, including the ?sentry_key= query param. */
  url: string
  publicKey: string
  projectId: string
}

/**
 * https://<publicKey>@<host>[:<port>][/<pathPrefix>]/<projectId>
 *   -> https://<host>[:<port>][/<pathPrefix>]/api/<projectId>/envelope/?sentry_key=<publicKey>
 *
 * The optional path prefix matters for self-hosted Sentry and for Relay mounted under a
 * subpath. Dropping it 404s silently.
 */
export function parseSentryDsn(dsn: string): SentryEndpoint | null {
  try {
    const parsed = new URL(dsn)
    const publicKey = parsed.username
    if (!publicKey) return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    const projectId = segments.pop()
    if (!projectId) return null

    const prefix = segments.length > 0 ? `/${segments.join('/')}` : ''
    return {
      url: `${parsed.protocol}//${parsed.host}${prefix}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(publicKey)}`,
      publicKey,
      projectId,
    }
  } catch {
    return null
  }
}

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'info'

export interface SentryEventInput {
  eventId: string
  timestamp: string
  level: SentryLevel
  logger: string
  transaction?: string
  exceptionType: string
  exceptionValue: string
  fingerprint?: string[]
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  stack?: string | null
}

/**
 * A Sentry envelope is newline-delimited JSON:
 *
 *   line 1  envelope header  {"event_id":...,"sent_at":...,"dsn":...}
 *   line 2  item header      {"type":"event","content_type":"application/json"}
 *   line 3  the event payload
 *
 * `length` is deliberately OMITTED from the item header. It is optional, and when
 * present it must equal the payload's exact UTF-8 BYTE length — a mismatch, trivially
 * caused by any non-ASCII character in an address, gets the whole envelope rejected.
 * Without it Sentry reads to the next newline, and JSON.stringify never emits a raw one.
 *
 * `dsn` in the envelope header is a second, independent auth path alongside the
 * ?sentry_key= query param. Belt and braces: if either is right, the event lands.
 */
export function buildSentryEnvelope(dsn: string, event: SentryEventInput): string {
  const envelopeHeader = JSON.stringify({
    event_id: event.eventId,
    sent_at: new Date().toISOString(),
    dsn,
  })

  const itemHeader = JSON.stringify({
    type: 'event',
    content_type: 'application/json',
  })

  const payload = JSON.stringify({
    event_id: event.eventId,
    timestamp: event.timestamp,
    platform: 'javascript',
    level: event.level,
    logger: event.logger,
    server_name: 'supabase-edge-function',
    environment: readEnv('SENTRY_ENVIRONMENT') ?? 'production',
    ...(event.transaction ? { transaction: event.transaction } : {}),
    // Explicit fingerprint: without it Sentry groups on exception type + value, and a
    // value carrying a customer address would open one new issue per booking attempt.
    ...(event.fingerprint ? { fingerprint: event.fingerprint } : {}),
    tags: event.tags ?? {},
    extra: event.extra ?? {},
    exception: {
      values: [
        {
          type: event.exceptionType,
          value: event.exceptionValue,
          ...(event.stack
            ? {
                stacktrace: {
                  frames: [
                    {
                      filename: '<edge-function>',
                      function: event.logger,
                      context_line: event.stack.slice(0, 1000),
                    },
                  ],
                },
              }
            : {}),
        },
      ],
    },
  })

  return `${envelopeHeader}\n${itemHeader}\n${payload}\n`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ReportSeverity = 'warning' | 'error' | 'critical'

export interface ReportEdgeErrorParams {
  message: string
  severity?: ReportSeverity
  /** error_logs.error_type */
  errorType?: string
  /** error_logs.source */
  source?: string
  /** Sentry exception.values[0].type */
  exceptionType?: string
  stack?: string | null
  /** Goes to error_logs ONLY (admin-only table). Full addresses belong here. */
  context?: Record<string, unknown>
  /** Goes to Sentry (third party). Keep PII out — use redactAddress(). */
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  fingerprint?: string[]
  transaction?: string
  logger?: string
  userId?: string | null
  /** Suppress a repeat of the same key inside the dedupe window, per isolate. */
  dedupeKey?: string
  /** Injectable for tests. */
  eventId?: string
}

export interface ReportEdgeErrorResult {
  ok: boolean
  errorLog: 'written' | 'skipped' | 'failed'
  sentry: 'sent' | 'skipped' | 'failed'
  eventId: string
  detail?: string
}

const SEVERITY_TO_SENTRY_LEVEL: Record<ReportSeverity, SentryLevel> = {
  warning: 'warning',
  error: 'error',
  critical: 'fatal',
}

const DEDUPE_WINDOW_MS = 60_000
const REPORT_TIMEOUT_MS = 3_000

const recentReports = new Map<string, number>()

function shouldSuppress(key: string | undefined): boolean {
  if (!key) return false

  const now = Date.now()
  for (const [seen, at] of recentReports) {
    if (now - at > DEDUPE_WINDOW_MS) recentReports.delete(seen)
  }

  const last = recentReports.get(key)
  if (last !== undefined && now - last <= DEDUPE_WINDOW_MS) return true

  recentReports.set(key, now)
  return false
}

/** Test seam. The booking form re-fires per keystroke, so the window is real. */
export function __resetReportDedupe(): void {
  recentReports.clear()
}

async function writeErrorLog(params: ReportEdgeErrorParams): Promise<'written' | 'skipped' | 'failed'> {
  const supabaseUrl = readEnv('SUPABASE_URL')
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return 'skipped'

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        error_type: params.errorType ?? 'edge_function_error',
        severity: params.severity ?? 'error',
        message: params.message,
        stack_trace: params.stack ?? null,
        context: params.context ?? {},
        source: params.source ?? 'edge_function',
        user_id: params.userId ?? null,
      }),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    })
    return response.ok ? 'written' : 'failed'
  } catch {
    return 'failed'
  }
}

async function sendToSentry(
  params: ReportEdgeErrorParams,
  eventId: string,
): Promise<'sent' | 'skipped' | 'failed'> {
  const dsn = readEnv('SENTRY_DSN')
  if (!dsn) return 'skipped'

  const endpoint = parseSentryDsn(dsn)
  if (!endpoint) return 'failed'

  try {
    const body = buildSentryEnvelope(dsn, {
      eventId,
      timestamp: new Date().toISOString(),
      level: SEVERITY_TO_SENTRY_LEVEL[params.severity ?? 'error'],
      logger: params.logger ?? 'edge-function',
      transaction: params.transaction,
      exceptionType: params.exceptionType ?? 'EdgeFunctionError',
      exceptionValue: params.message,
      fingerprint: params.fingerprint,
      tags: params.tags,
      extra: params.extra,
      stack: params.stack,
    })

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    })
    return response.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Awaitable form. Never rejects. */
export async function reportEdgeError(
  params: ReportEdgeErrorParams,
): Promise<ReportEdgeErrorResult> {
  const eventId = params.eventId ?? newEventId()

  if (shouldSuppress(params.dedupeKey)) {
    return { ok: true, errorLog: 'skipped', sentry: 'skipped', eventId, detail: 'deduped' }
  }

  // Keep the Supabase log line the EFs already emit — it is short-retention, but it is
  // what a live `supabase functions logs` tail shows.
  console.error(`[${params.logger ?? 'edge-function'}] ${params.message}`, params.context ?? {})

  const [errorLog, sentry] = await Promise.all([
    writeErrorLog(params),
    sendToSentry(params, eventId),
  ])

  return { ok: errorLog !== 'failed' && sentry !== 'failed', errorLog, sentry, eventId }
}

/**
 * Fire-and-forget. Returns synchronously; the response path never awaits it.
 *
 * Supabase Edge Runtime tears the isolate down once the Response resolves, which
 * cancels a bare floating promise mid-flight — silently losing the report, which is the
 * precise failure mode this module exists to fix. EdgeRuntime.waitUntil keeps it alive.
 */
export function reportEdgeErrorInBackground(params: ReportEdgeErrorParams): void {
  const pending = reportEdgeError(params).then(() => undefined)

  const host = (globalThis as unknown as { EdgeRuntime?: WaitUntilHost }).EdgeRuntime
  if (typeof host?.waitUntil === 'function') {
    try {
      host.waitUntil(pending)
      return
    } catch {
      // Fall through to the floating-promise path below.
    }
  }

  void pending.catch(() => undefined)
}
