// Uploading a before photo on a job whose lead never had an inspection.
//
// A lead can reach job completion without an inspection ever existing. On those
// jobs this upload is the only path any photo has into the job report, so
// uploadInspectionPhoto has to accept inspection_id = null. Three things follow
// from that and are pinned here:
//
//   1. The photos row is written with inspection_id NULL. It is reachable
//      because the technician RLS policies carry a job_completion_id-only
//      branch, and the job report queries by job_completion_id alone.
//   2. The Storage object is filed under a job- prefix. Interpolating a null
//      inspection_id would write a literal "null/" path.
//   3. The photo_history write is skipped. photo_history.inspection_id is NOT
//      NULL, so the insert would be rejected on every single upload.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()
const mockRemove = vi.fn()
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockRecordPhotoHistory = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      })),
    },
    auth: { getUser: mockGetUser },
  },
}))

vi.mock('@/lib/offline', () => ({
  syncManager: { queuePhoto: vi.fn() },
  resizePhoto: vi.fn(async () => ({
    size: 2048,
    arrayBuffer: async () => new ArrayBuffer(8),
  })),
}))

vi.mock('@/lib/sentry', () => ({
  addBusinessBreadcrumb: vi.fn(),
  captureBusinessError: vi.fn(),
}))

vi.mock('@/lib/utils/photoHistory', () => ({
  recordPhotoHistory: mockRecordPhotoHistory,
}))

const { uploadInspectionPhoto } = await import('../photoUpload')

const JOB_ID = 'job-completion-1'

const NO_INSPECTION_METADATA = {
  inspection_id: null,
  job_completion_id: JOB_ID,
  photo_category: 'before' as const,
  photo_type: 'general' as const,
  caption: 'Before photo',
}

function makeFile(): File {
  return new File(['x'], 'before.jpg', { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUpload.mockResolvedValue({ data: { path: 'uploaded/path.jpg' }, error: null })
  mockCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://example.test/signed.jpg' },
    error: null,
  })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'tech-1' } } })
  mockInsert.mockReturnValue({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: 'photo-1' }, error: null })),
    })),
  })
})

describe('uploadInspectionPhoto with no inspection', () => {
  it('writes the photos row with a null inspection_id', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ inspection_id: null })
    )
  })

  it('links the photos row to the job completion', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ job_completion_id: JOB_ID })
    )
  })

  it('marks the photos row as a before photo', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ photo_category: 'before' })
    )
  })

  it('files the Storage object under a job- prefix', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockUpload.mock.calls[0][0]).toMatch(new RegExp(`^job-${JOB_ID}/`))
  })

  it('never writes a literal null into the storage path', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockUpload.mock.calls[0][0]).not.toContain('null')
  })

  it('skips the photo_history write', async () => {
    await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(mockRecordPhotoHistory).not.toHaveBeenCalled()
  })

  it('returns the id of the created photo', async () => {
    const result = await uploadInspectionPhoto(makeFile(), NO_INSPECTION_METADATA)
    expect(result.photo_id).toBe('photo-1')
  })

  it('rejects a photo with neither an inspection nor a job completion', async () => {
    await expect(
      uploadInspectionPhoto(makeFile(), { ...NO_INSPECTION_METADATA, job_completion_id: undefined })
    ).rejects.toThrow(/inspection_id or a job_completion_id/)
  })
})

describe('uploadInspectionPhoto with an inspection', () => {
  const WITH_INSPECTION_METADATA = { ...NO_INSPECTION_METADATA, inspection_id: 'insp-1' }

  it('still files the Storage object under the inspection id', async () => {
    await uploadInspectionPhoto(makeFile(), WITH_INSPECTION_METADATA)
    expect(mockUpload.mock.calls[0][0]).toMatch(/^insp-1\//)
  })

  it('still records photo history', async () => {
    await uploadInspectionPhoto(makeFile(), WITH_INSPECTION_METADATA)
    expect(mockRecordPhotoHistory).toHaveBeenCalledWith(
      expect.objectContaining({ inspection_id: 'insp-1', action: 'added' })
    )
  })
})
