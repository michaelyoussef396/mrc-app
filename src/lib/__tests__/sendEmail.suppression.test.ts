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

function setup(gate: keyof typeof reasons | 'none', insertError: unknown = null, rejects = false) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  if (rejects) insert.mockRejectedValue(insertError)
  const logError = vi.fn()
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: gate === 'recipient' ? [{ id }] : [] }),
    then: (resolve: (result: unknown) => unknown) => resolve({ count: gate === 'hourly' ? 100 : 0 }),
    insert,
  }
  const from = vi.fn(() => query)
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'provider-id' })))
  let handler: (request: Request) => Promise<Response>
  runInNewContext(code, {
    z, Request, Response, Date, setTimeout, fetch, console: { warn: vi.fn(), error: logError },
    createClient: () => ({ from }),
    Deno: { env: { get: () => 'dummy' }, serve: (fn: typeof handler) => { handler = fn } },
  })
  const send = (extra = {}) => handler(new Request('https://localhost.invalid/send-email', {
    method: 'POST', body: JSON.stringify({ ...body, ...extra }),
  }))
  return { send, insert, fetch, from, query, logError }
}

describe('send-email suppression audit', () => {
  it.each(['recipient', 'hourly'] as const)('records a %s suppression before returning 429', async (gate) => {
    const { send, insert, fetch, from } = setup(gate)
    const response = await send()
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: reasons[gate] })
    expect(from).toHaveBeenCalledWith('email_logs')
    expect(insert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      recipient_email: body.to, subject: body.subject, template_name: body.templateName,
      status: 'suppressed', error_message: reasons[gate], provider: 'resend',
      provider_message_id: null, lead_id: id, inspection_id: id, sent_by: id,
    }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([['recipient', false], ['hourly', false], ['recipient', true], ['hourly', true]] as const)(
    'preserves %s 429 and reports the PG code (insert throws = %s)', async (gate, rejects) => {
      const error = { code: '23514', message: 'status constraint violation' }
      const { send, insert, fetch, logError } = setup(gate, error, rejects)
      const response = await send()
      expect(response.status).toBe(429)
      expect(await response.json()).toEqual({ error: reasons[gate] })
      expect(logError).toHaveBeenCalledWith('[send-email] Failed to record suppression', '23514', error)
      expect(insert).toHaveBeenCalledTimes(1)
      expect(fetch).not.toHaveBeenCalled()
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
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'suppressed' }))
    expect(fetch).not.toHaveBeenCalled()
  })
})
