// Regression cover for the Codex finding on 84015f3: the phase timer in
// api/render-job-report-pdf.ts called console.log unguarded, so a throwing log
// sink escaped mid-phase. At browser_launched that exits before the try/finally
// that closes Chromium (leaking the browser); after version_inserted it turns an
// already-committed save into a failed request.
//
// Lives under src/ rather than api/__tests__/ on purpose: Vercel turns files
// under api/ into deployed Serverless Functions. Underscore-prefixed paths are
// excluded by convention (that is what api/_shared/ relies on), but that
// exclusion cannot be verified from here and this landed immediately before a
// production deploy. The real fix is api/ test infrastructure — tracked as T13,
// since api/**/*.ts is in no tsconfig either.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const CALLER_ID = '11111111-1111-4111-8111-111111111111'
const JOB_COMPLETION_ID = '22222222-2222-4222-8222-222222222222'
const VERSION_ID = '33333333-3333-4333-8333-333333333333'
const JOB_NUMBER = 'JOB-2026-0012'
const PDF_BYTES = new Uint8Array([37, 80, 68, 70])
const EF_HTML = '<html><body>report</body></html>'

const closeBrowser = vi.fn(async () => undefined)

vi.mock('@sparticuz/chromium', () => ({
  default: {
    args: ['--no-sandbox'],
    headless: true,
    executablePath: vi.fn(async () => '/tmp/chromium'),
  },
}))

vi.mock('puppeteer-core', () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        emulateMediaType: async () => undefined,
        setContent: async () => undefined,
        evaluateHandle: async () => undefined,
        pdf: async () => PDF_BYTES,
      }),
      close: closeBrowser,
    })),
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: CALLER_ID } }, error: null }) },
    rpc: async () => ({ data: true, error: null }),
    from: (table: string) =>
      table === 'job_completions'
        ? {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { job_number: JOB_NUMBER }, error: null }) }),
            }),
          }
        : {
            select: () => ({
              eq: () => ({
                order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: VERSION_ID, version_number: 1 }, error: null }),
              }),
            }),
          },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.example/pdf' }, error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  }),
}))

function createResponseStub() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      res.statusCode = code
      return res
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload
      return res
    }),
    end: vi.fn(() => res),
  }
  return res
}

function throwOnPhase(phase: string) {
  return vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    const payload = args[1]
    if (typeof payload === 'string' && payload.includes(`"phase":"${phase}"`)) {
      throw new Error(`log sink failure at ${phase}`)
    }
  })
}

async function invokeHandler() {
  const { default: handler } = await import('../../../api/render-job-report-pdf')
  const res = createResponseStub()
  await handler(
    {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { jobCompletionId: JOB_COMPLETION_ID },
    } as never,
    res as never,
  )
  return res
}

describe('render-job-report-pdf phase instrumentation', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ html: EF_HTML }) })),
    )
    closeBrowser.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('when the log sink throws at browser_launched', () => {
    it('should reach the browser_launched breadcrumb', async () => {
      const logSpy = throwOnPhase('browser_launched')

      await invokeHandler()

      expect(logSpy).toHaveBeenCalledWith(
        '[render-job-report-pdf]',
        expect.stringContaining('"phase":"browser_launched"'),
      )
    })

    it('should close the browser', async () => {
      throwOnPhase('browser_launched')

      await invokeHandler()

      expect(closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('should return the successful response', async () => {
      throwOnPhase('browser_launched')

      const res = await invokeHandler()

      expect(res.statusCode).toBe(200)
    })

    it('should return the rendered pdf byte count', async () => {
      throwOnPhase('browser_launched')

      const res = await invokeHandler()

      expect(res.body).toMatchObject({ fileSizeBytes: PDF_BYTES.length })
    })
  })

  describe('when the log sink throws after the version row is inserted', () => {
    it('should reach the version_inserted breadcrumb', async () => {
      const logSpy = throwOnPhase('version_inserted')

      await invokeHandler()

      expect(logSpy).toHaveBeenCalledWith(
        '[render-job-report-pdf]',
        expect.stringContaining('"phase":"version_inserted"'),
      )
    })

    it('should return the successful response', async () => {
      throwOnPhase('version_inserted')

      const res = await invokeHandler()

      expect(res.statusCode).toBe(200)
    })

    it('should return the committed version number', async () => {
      throwOnPhase('version_inserted')

      const res = await invokeHandler()

      expect(res.body).toMatchObject({ versionNumber: 1 })
    })
  })
})
