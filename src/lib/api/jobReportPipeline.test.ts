import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
}))

// Re-import after mock so the SUT picks up the mocked client.
import { hardSaveJobReport } from './jobReportPipeline'
import { HARD_SAVE_NETWORK_ERROR_MESSAGE } from './reportPipeline'
import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError } from '@/lib/sentry'

const JOB_COMPLETION_ID = '33333333-3333-3333-3333-333333333333'

const VALID_PAYLOAD = {
  mode: 'hard_save',
  bucket: 'report-pdfs',
  pdfStoragePath: 'job/v-1.pdf',
  htmlStoragePath: 'job/v-1.html',
  htmlHash: 'deadbeef',
  fileSizeBytes: 24_000_000,
  filename: 'MRC-JOB1-Job-Report.pdf',
  signedUrl: 'https://proj.supabase.co/storage/v1/object/sign/report-pdfs/job/v-1.pdf?token=t',
  versionId: 'job-version-id',
  versionNumber: 2,
}

function mockSession(): void {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok-xyz' } as never },
    error: null,
  } as never)
}

function mockJsonResponse(body: unknown, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

/** Stand-in for the chained PostgREST builder findRecentJobHardSave walks. */
function mockVersionLookup(row: Record<string, unknown> | null): void {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'not', 'gte', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })
  vi.mocked(supabase.from).mockReturnValue(builder as never)
}

describe('hardSaveJobReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete global.fetch
  })

  it('returns version metadata from the JSON body on success', async () => {
    mockSession()
    mockJsonResponse(VALID_PAYLOAD)

    await expect(hardSaveJobReport(JOB_COMPLETION_ID)).resolves.toMatchObject({
      versionId: 'job-version-id',
      versionNumber: 2,
      pdfStoragePath: 'job/v-1.pdf',
      fileSizeBytes: 24_000_000,
    })
  })

  it('posts the job completion id and hard_save mode to the render endpoint', async () => {
    mockSession()
    mockJsonResponse(VALID_PAYLOAD)

    await hardSaveJobReport(JOB_COMPLETION_ID)

    const call = vi.mocked(global.fetch).mock.calls[0]
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      jobCompletionId: JOB_COMPLETION_ID,
      mode: 'hard_save',
    })
  })

  it('throws the network message when the request fails and no version row exists', async () => {
    mockSession()
    mockVersionLookup(null)
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(hardSaveJobReport(JOB_COMPLETION_ID)).rejects.toMatchObject({
      name: 'HardSaveJobReportError',
      status: 0,
      message: HARD_SAVE_NETWORK_ERROR_MESSAGE,
    })
  })

  it('returns the committed version when the request fails but the row landed', async () => {
    mockSession()
    mockVersionLookup({
      id: 'recovered-job-id',
      version_number: 4,
      pdf_storage_path: 'job/v-4.pdf',
      html_storage_path: 'job/v-4.html',
      html_hash: 'cafebabe',
      file_size_bytes: 24_000_000,
    })
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(hardSaveJobReport(JOB_COMPLETION_ID)).resolves.toMatchObject({
      versionId: 'recovered-job-id',
      versionNumber: 4,
      signedUrl: null,
    })
  })

  it('reports an unrecoverable transport failure to Sentry', async () => {
    mockSession()
    mockVersionLookup(null)
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await hardSaveJobReport(JOB_COMPLETION_ID).catch(() => undefined)

    expect(captureBusinessError).toHaveBeenCalledWith(
      'Hard-save endpoint unreachable: POST /api/render-job-report-pdf',
      expect.objectContaining({
        endpoint: '/api/render-job-report-pdf',
        cause: 'TypeError: Failed to fetch',
      }),
    )
  })
})
