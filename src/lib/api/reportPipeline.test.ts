import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

// Re-import after mock so the SUT picks up the mocked client.
import { hardSaveReport, HardSaveError } from './reportPipeline'
import { supabase } from '@/integrations/supabase/client'

const VALID_HEADERS = {
  'X-Mrc-Version-Id': 'aaa-bbb-ccc',
  'X-Mrc-Version-Number': '7',
  'X-Mrc-Pdf-Storage-Path': 'abc/v-1.pdf',
  'X-Mrc-Html-Storage-Path': 'abc/v-1.html',
  'X-Mrc-Html-Hash': 'deadbeef',
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF

function mockSession(): void {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok-xyz' } as never },
    error: null,
  } as never)
}

function mockFetchResponse(init: Partial<Response> & { headersObj?: Record<string, string>; body?: BodyInit; ok?: boolean; status?: number } = {}): void {
  const headers = new Headers(init.headersObj ?? VALID_HEADERS)
  const res = new Response(init.body ?? PDF_BYTES, {
    status: init.status ?? 200,
    headers,
  })
  // @ts-expect-error global override
  global.fetch = vi.fn().mockResolvedValue(res)
}

describe('hardSaveReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // @ts-expect-error global cleanup
    delete global.fetch
  })

  it('returns version metadata + PDF blob on success', async () => {
    mockSession()
    mockFetchResponse()

    const result = await hardSaveReport('11111111-1111-1111-1111-111111111111')

    expect(result.versionId).toBe('aaa-bbb-ccc')
    expect(result.versionNumber).toBe(7)
    expect(result.pdfStoragePath).toBe('abc/v-1.pdf')
    expect(result.htmlStoragePath).toBe('abc/v-1.html')
    expect(result.htmlHash).toBe('deadbeef')
    // jsdom realm crossing makes `instanceof Blob` flaky; shape-check instead.
    expect(result.pdfBlob.size).toBeGreaterThan(0)
    expect(typeof result.pdfBlob.arrayBuffer).toBe('function')
  })

  it('throws HardSaveError(401) when no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)

    await expect(hardSaveReport('11111111-1111-1111-1111-111111111111'))
      .rejects.toMatchObject({ name: 'HardSaveError', status: 401 })
  })

  it('throws HardSaveError with server error message on non-OK response', async () => {
    mockSession()
    // @ts-expect-error global override
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(hardSaveReport('11111111-1111-1111-1111-111111111111'))
      .rejects.toMatchObject({ name: 'HardSaveError', status: 403, message: 'Admin role required' })
  })

  it('throws when version metadata headers are missing', async () => {
    mockSession()
    mockFetchResponse({ headersObj: { 'X-Mrc-Version-Id': 'only-this' } })

    await expect(hardSaveReport('11111111-1111-1111-1111-111111111111'))
      .rejects.toThrow(HardSaveError)
  })

  it('throws on non-numeric X-Mrc-Version-Number', async () => {
    mockSession()
    mockFetchResponse({ headersObj: { ...VALID_HEADERS, 'X-Mrc-Version-Number': 'not-a-number' } })

    await expect(hardSaveReport('11111111-1111-1111-1111-111111111111'))
      .rejects.toThrow('Invalid X-Mrc-Version-Number header')
  })

  it('sends the inspectionId and mode=hard_save in the request body', async () => {
    mockSession()
    mockFetchResponse()

    await hardSaveReport('22222222-2222-2222-2222-222222222222')

    // @ts-expect-error global access
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBe('/api/render-pdf')
    const body = JSON.parse((call[1] as RequestInit).body as string)
    expect(body).toEqual({
      inspectionId: '22222222-2222-2222-2222-222222222222',
      mode: 'hard_save',
    })
    const headers = (call[1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-xyz')
  })
})
