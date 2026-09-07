// Regression cover for the 2026-09-07 P0: POST /api/render-job-report-pdf 504'd in
// production with `TimeoutError: Navigation timeout of 45000 ms exceeded at
// CdpFrame.setContent`, because the call passed `waitUntil: 'networkidle0'`.
//
// puppeteer-core removes network-idle from setContent on purpose —
// SetContentWaitForOptions types waitUntil as
// `Exclude<PuppeteerLifeCycleEvent, 'networkidle0' | 'networkidle2'>`. setContent does
// not navigate (Frame.setFrameContent is document.open/write/close), so the CDP
// `networkIdle` lifecycle event the watcher waits for need never arrive: the wait burns
// its full 45s budget and Vercel's maxDuration of 60 turns that into a 504.
//
// The stub below reproduces that exact shape, so these tests fail against the old value
// and pass against 'domcontentloaded'. Note tsc is the stronger guard — reverting
// re-introduces error TS2322 on the same line — and neither check can prove real
// Chromium finishes inside 60s from iad1, or that the PDF carries the right fonts and
// photos. Only a real render shows that.
//
// Lives under src/ for the same reason as renderJobReportPdf.instrumentation.test.ts:
// Vercel turns files under api/ into deployed Serverless Functions. Proper api/ test
// infrastructure is tracked as T13.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const CALLER_ID = '11111111-1111-4111-8111-111111111111'
const JOB_COMPLETION_ID = '22222222-2222-4222-8222-222222222222'
const VERSION_ID = '33333333-3333-4333-8333-333333333333'
const JOB_NUMBER = 'JOB-2026-0012'
const PDF_BYTES = new Uint8Array([37, 80, 68, 70])
const EF_HTML = '<html><body>report</body></html>'

const setContent = vi.fn(async (_html: string, options?: { waitUntil?: string }) => {
  if (options?.waitUntil === 'networkidle0') {
    const timeout = new Error('Navigation timeout of 45000 ms exceeded')
    timeout.name = 'TimeoutError'
    throw timeout
  }
})

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
        setContent,
        evaluateHandle: async () => undefined,
        pdf: async () => PDF_BYTES,
      }),
      close: async () => undefined,
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

describe('render-job-report-pdf page content lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ html: EF_HTML }) })),
    )
    setContent.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('should not wait for network idle when setting page content', async () => {
    await invokeHandler()

    expect(setContent).toHaveBeenCalledWith(
      EF_HTML,
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    )
  })

  it('should return a successful response when the page never reaches network idle', async () => {
    const res = await invokeHandler()

    expect(res.statusCode).toBe(200)
  })

  it('should return the rendered pdf byte count when the page never reaches network idle', async () => {
    const res = await invokeHandler()

    expect(res.body).toMatchObject({ fileSizeBytes: PDF_BYTES.length })
  })
})
