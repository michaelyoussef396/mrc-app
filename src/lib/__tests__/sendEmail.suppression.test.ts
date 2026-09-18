// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'

// Execute the real Edge handler; replace only its Deno/remote import boundaries.
const source = readFileSync('supabase/functions/send-email/index.ts', 'utf8')
const code = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText
const id = '11111111-1111-4111-8111-111111111111'
const body = {
  to: 'recipient@example.invalid', subject: 'Booking confirmation', html: '<p>Booked</p>',
  templateName: 'job-booking-confirmation', leadId: id, inspectionId: id, userId: id,
}
const reasons = {
  recipient: 'Rate limit: wait 5 minutes before resending to same recipient',
  hourly: 'Rate limit exceeded: 100 emails per hour',
}
// Postgres puts the whole failing row in DETAIL — recipient and subject included — while the
// message names only the constraint. That split is why the ruling is "code and message only".
const constraintError = {
  code: '23514',
  message: 'new row for relation "email_logs" violates check constraint "email_logs_status_check"',
  details: `Failing row contains (${id}, ${body.to}, ${body.subject}, suppressed).`,
}

function setup(
  gate: keyof typeof reasons | 'none',
  insertError: unknown = null,
  rejects = false,
  // What the awaited reporter reports back about persistence. 'failed' is the case the void
  // spy could never model, and it is the one that decides whether the episode stays open.
  reportResult: { errorLog: string } = { errorLog: 'written' },
) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  if (rejects) insert.mockRejectedValue(insertError)
  const logError = vi.fn()
  const reportError = vi.fn()
  const reportAwait = vi.fn().mockResolvedValue(reportResult)
  // Mutable so a test can take the cap down and back up inside one isolate, which is the
  // only way to exercise a second cap episode.
  const state = { hourlyCount: gate === 'hourly' ? 100 : 0 }
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: gate === 'recipient' ? [{ id }] : [] }),
    then: (resolve: (result: unknown) => unknown) => resolve({ count: state.hourlyCount }),
    insert,
  }
  const from = vi.fn(() => query)
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'provider-id' })))
  let handler: (request: Request) => Promise<Response>
  runInNewContext(code, {
    z, Request, Response, Date, setTimeout, fetch, console: { warn: vi.fn(), error: logError },
    createClient: () => ({ from }),
    // The transform strips every import line, so the _shared helper arrives as a sandbox
    // global exactly like createClient does.
    reportEdgeErrorInBackground: reportError,
    reportEdgeError: reportAwait,
    Deno: { env: { get: () => 'dummy' }, serve: (fn: typeof handler) => { handler = fn } },
  })
  const send = (extra = {}) => handler(new Request('https://localhost.invalid/send-email', {
    method: 'POST', body: JSON.stringify({ ...body, ...extra }),
  }))
  return { send, insert, fetch, from, query, state, logError, reportError, reportAwait }
}

describe('send-email suppression audit', () => {
  it('records a recipient suppression before returning 429', async () => {
    const { send, insert, fetch, from } = setup('recipient')
    const response = await send()
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: reasons.recipient })
    expect(from).toHaveBeenCalledWith('email_logs')
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      recipient_email: body.to, subject: body.subject, template_name: body.templateName,
      status: 'suppressed', error_message: reasons.recipient, provider: 'resend',
      provider_message_id: null, lead_id: id, inspection_id: id, sent_by: id,
    }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('writes no email_logs row when the hourly cap is reached', async () => {
    const { send, insert, fetch } = setup('hourly')
    const response = await send()
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: reasons.hourly })
    expect(insert).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports one hourly cap episode once however many requests it refuses', async () => {
    const { send, reportAwait } = setup('hourly')
    await send()
    await send()
    expect(reportAwait).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      severity: 'warning',
      context: expect.objectContaining({ function: 'send-email' }),
    }))
  })

  it('reports a second cap episode in the same hour', async () => {
    const { send, reportAwait, state } = setup('hourly')
    await send()
    state.hourlyCount = 0
    await send()
    state.hourlyCount = 100
    await send()
    expect(reportAwait).toHaveBeenCalledTimes(2)
  })

  it('retries the cap report when the error_logs write failed', async () => {
    const { send, reportAwait } = setup('hourly', null, false, { errorLog: 'failed' })
    await send()
    await send()
    expect(reportAwait).toHaveBeenCalledTimes(2)
  })

  it('dedupes the hourly cap report', async () => {
    const { send, reportAwait } = setup('hourly')
    await send()
    expect(reportAwait).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      dedupeKey: expect.stringContaining('hourly-cap'),
    }))
  })

  it('keeps the recipient address out of the hourly cap report', async () => {
    const { send, logError, reportError, reportAwait } = setup('hourly')
    await send()
    const logged = JSON.stringify([
      ...logError.mock.calls, ...reportError.mock.calls, ...reportAwait.mock.calls,
    ])
    expect(logged).not.toContain(body.to)
  })

  it.each([false, true])(
    'preserves the recipient 429 when the audit insert fails (insert throws = %s)', async (rejects) => {
      const { send, insert, fetch } = setup('recipient', constraintError, rejects)
      const response = await send()
      expect(response.status).toBe(429)
      expect(await response.json()).toEqual({ error: reasons.recipient })
      expect(insert).toHaveBeenCalledTimes(1)
      expect(fetch).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'records a failed suppression audit in error_logs (insert throws = %s)', async (rejects) => {
      const { send, reportError } = setup('recipient', constraintError, rejects)
      await send()
      expect(reportError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        message: expect.stringContaining(constraintError.code),
        context: expect.objectContaining({ lead_id: id, template_name: body.templateName }),
      }))
  })

  it.each([false, true])(
    'carries the Postgres message into the suppression-audit report (insert throws = %s)', async (rejects) => {
      const { send, reportError } = setup('recipient', constraintError, rejects)
      await send()
      expect(reportError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        message: expect.stringContaining(constraintError.message),
      }))
  })

  it.each([false, true])(
    'dedupes repeated suppression-audit failures (insert throws = %s)', async (rejects) => {
      const { send, reportError } = setup('recipient', constraintError, rejects)
      await send()
      expect(reportError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        dedupeKey: expect.stringContaining('suppression-insert-failed'),
      }))
  })

  it.each([false, true])(
    'keeps the recipient address out of every log sink (insert throws = %s)', async (rejects) => {
      const { send, logError, reportError } = setup('recipient', constraintError, rejects)
      await send()
      const logged = JSON.stringify([...logError.mock.calls, ...reportError.mock.calls])
      expect(logged).not.toContain(body.to)
  })

  it.each([false, true])('preserves normal sends (recipient bypass = %s)', async (bypass) => {
    const { send, insert, fetch, query } = setup(bypass ? 'recipient' : 'none')
    const response = await send({ bypassRecipientRateLimit: bypass })
    expect(response.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      status: 'sent', provider_message_id: 'provider-id', error_message: null,
    }))
    expect(query.limit).toHaveBeenCalledTimes(bypass ? 0 : 1)
  })

  it('keeps the hourly limit when the recipient limit is bypassed', async () => {
    const { send, insert, fetch } = setup('hourly')
    expect((await send({ bypassRecipientRateLimit: true })).status).toBe(429)
    expect(insert).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
