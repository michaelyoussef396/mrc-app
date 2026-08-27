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
import {
  hardSaveReport,
  fetchVersionPdfBlob,
  assertEmailableAttachment,
  HardSaveError,
  PdfRetrievalError,
  HARD_SAVE_NETWORK_ERROR_MESSAGE,
  type HardSaveResult,
} from './reportPipeline'
import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError } from '@/lib/sentry'

const INSPECTION_ID = '11111111-1111-1111-1111-111111111111'

const VALID_PAYLOAD = {
  mode: 'hard_save',
  bucket: 'report-pdfs',
  pdfStoragePath: 'abc/v-1.pdf',
  htmlStoragePath: 'abc/v-1.html',
  htmlHash: 'deadbeef',
  fileSizeBytes: 15_482_910,
  filename: 'MRC-JOB1-Inspection-Report.pdf',
  signedUrl: 'https://proj.supabase.co/storage/v1/object/sign/report-pdfs/abc/v-1.pdf?token=t',
  versionId: 'aaa-bbb-ccc',
  versionNumber: 7,
}

const SAVED: HardSaveResult = {
  versionId: 'aaa-bbb-ccc',
  versionNumber: 7,
  pdfStoragePath: 'abc/v-1.pdf',
  htmlStoragePath: 'abc/v-1.html',
  htmlHash: 'deadbeef',
  bucket: 'report-pdfs',
  fileSizeBytes: 15_482_910,
  signedUrl: 'https://proj.supabase.co/storage/v1/object/sign/report-pdfs/abc/v-1.pdf?token=t',
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
const PDF_BLOB = new Blob([PDF_BYTES], { type: 'application/pdf' })

function mockSession(): void {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok-xyz' } as never },
    error: null,
  } as never)
}

function mockJsonResponse(body: unknown, status = 200): void {
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
  global.fetch = vi.fn().mockResolvedValue(res)
}

/** Stand-in for the chained PostgREST builder findRecentHardSave walks. */
function mockVersionLookup(row: Record<string, unknown> | null): void {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'not', 'gte', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })
  vi.mocked(supabase.from).mockReturnValue(builder as never)
}

function mockStorageDownload(data: Blob | null, error: { message: string } | null = null): void {
  vi.mocked(supabase.storage.from).mockReturnValue({
    download: vi.fn().mockResolvedValue({ data, error }),
  } as never)
}

describe('hardSaveReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete global.fetch
  })

  it('returns version metadata from the JSON body on success', async () => {
    mockSession()
    mockJsonResponse(VALID_PAYLOAD)

    const result = await hardSaveReport(INSPECTION_ID)

    expect(result).toEqual(SAVED)
  })

  it('throws 401 when there is no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)

    await expect(hardSaveReport(INSPECTION_ID)).rejects.toMatchObject({ status: 401 })
  })

  it("surfaces the server's error message on a non-OK response", async () => {
    mockSession()
    mockJsonResponse({ error: 'Admin role required' }, 403)

    await expect(hardSaveReport(INSPECTION_ID)).rejects.toMatchObject({
      name: 'HardSaveError',
      status: 403,
      message: 'Admin role required',
    })
  })

  it('rejects a 200 response whose version metadata is incomplete', async () => {
    mockSession()
    mockJsonResponse({ ...VALID_PAYLOAD, versionId: undefined })

    await expect(hardSaveReport(INSPECTION_ID)).rejects.toThrow(
      'Render endpoint succeeded but returned incomplete version metadata',
    )
  })

  it('rejects a 200 response whose version number is not a number', async () => {
    mockSession()
    mockJsonResponse({ ...VALID_PAYLOAD, versionNumber: 'not-a-number' })

    await expect(hardSaveReport(INSPECTION_ID)).rejects.toBeInstanceOf(HardSaveError)
  })

  it('reports NOT saved when the request fails and no version row exists', async () => {
    mockSession()
    mockVersionLookup(null)
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(hardSaveReport(INSPECTION_ID)).rejects.toMatchObject({
      status: 0,
      message: HARD_SAVE_NETWORK_ERROR_MESSAGE,
    })
  })

  // The 27 Aug incident: the server committed the row, the oversized response
  // died in flight, and the user was told the report was NOT saved six times.
  it('returns the committed version when the request fails but the row landed', async () => {
    mockSession()
    mockVersionLookup({
      id: 'recovered-id',
      version_number: 3,
      pdf_storage_path: 'abc/v-3.pdf',
      html_storage_path: 'abc/v-3.html',
      html_hash: 'cafebabe',
      file_size_bytes: 21_400_000,
    })
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(hardSaveReport(INSPECTION_ID)).resolves.toMatchObject({
      versionId: 'recovered-id',
      versionNumber: 3,
      pdfStoragePath: 'abc/v-3.pdf',
      signedUrl: null,
    })
  })

  it('does not report a Sentry error when the save is recovered from the database', async () => {
    mockSession()
    mockVersionLookup({
      id: 'recovered-id',
      version_number: 3,
      pdf_storage_path: 'abc/v-3.pdf',
      html_storage_path: 'abc/v-3.html',
      html_hash: 'cafebabe',
      file_size_bytes: 21_400_000,
    })
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await hardSaveReport(INSPECTION_ID)

    expect(captureBusinessError).not.toHaveBeenCalled()
  })

  it('reports an unrecoverable transport failure to Sentry', async () => {
    mockSession()
    mockVersionLookup(null)
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await hardSaveReport(INSPECTION_ID).catch(() => undefined)

    expect(captureBusinessError).toHaveBeenCalledWith(
      'Hard-save endpoint unreachable: POST /api/render-pdf',
      expect.objectContaining({ endpoint: '/api/render-pdf', cause: 'TypeError: Failed to fetch' }),
    )
  })

  it('posts the inspection id and hard_save mode to the render endpoint', async () => {
    mockSession()
    mockJsonResponse(VALID_PAYLOAD)

    await hardSaveReport(INSPECTION_ID)

    const call = vi.mocked(global.fetch).mock.calls[0]
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      inspectionId: INSPECTION_ID,
      mode: 'hard_save',
    })
  })
})

describe('fetchVersionPdfBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete global.fetch
  })

  it('returns the file from the signed URL when it resolves', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(PDF_BYTES, { status: 200 }))

    const blob = await fetchVersionPdfBlob(SAVED)

    await expect(blob.text()).resolves.toBe('%PDF')
  })

  it('falls back to an authenticated storage download when the signed URL fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 403 }))
    mockStorageDownload(PDF_BLOB)

    const blob = await fetchVersionPdfBlob(SAVED)

    // Identity check: jsdom Blobs cross realms badly, so compare the object.
    expect(blob).toBe(PDF_BLOB)
  })

  it('downloads from storage without a fetch when no signed URL was issued', async () => {
    mockStorageDownload(PDF_BLOB)

    await fetchVersionPdfBlob({ ...SAVED, signedUrl: null })

    expect(supabase.storage.from).toHaveBeenCalledWith('report-pdfs')
  })

  // A retrieval failure must never be reported as a lost save.
  it('carries the saved version number when every retrieval route fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    mockStorageDownload(null, { message: 'offline' })

    await expect(fetchVersionPdfBlob(SAVED)).rejects.toMatchObject({
      name: 'PdfRetrievalError',
      versionNumber: 7,
      versionId: 'aaa-bbb-ccc',
    })
  })

  it('reports retrieval failure without claiming the report was not saved', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    mockStorageDownload(null, { message: 'offline' })

    const error = await fetchVersionPdfBlob(SAVED).catch((err: PdfRetrievalError) => err)

    expect((error as PdfRetrievalError).message).not.toContain('NOT saved')
  })
})

describe('assertEmailableAttachment', () => {
  it('accepts a report that fits under the 40MB encoded ceiling', () => {
    expect(() => assertEmailableAttachment(28_900_000, 3)).not.toThrow()
  })

  it('rejects a report that exceeds 40MB once base64-encoded', () => {
    // 31MB raw -> ~41.3MB encoded, over Resend's limit despite being under 40MB on disk.
    expect(() => assertEmailableAttachment(31 * 1024 * 1024, 3)).toThrow(/cannot be sent as an attachment/)
  })

  it('names the version in the rejection so the admin knows which report', () => {
    expect(() => assertEmailableAttachment(31 * 1024 * 1024, 12)).toThrow(/Report v12/)
  })

  it('allows legacy rows that have no recorded size', () => {
    expect(() => assertEmailableAttachment(null, 3)).not.toThrow()
  })
})
