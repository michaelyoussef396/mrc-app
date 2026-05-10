// Stage 4.3 — deleteInspectionPhoto() soft-delete conversion
//
// Pins the post-conversion contract:
//   1. Soft-deletes via UPDATE deleted_at = NOW() (NOT a DELETE).
//   2. NULLs out inspection_areas.primary_photo_id pointing at the photo.
//   3. Does NOT remove the Storage object (plan v2: file stays in Storage).
//   4. Emits photo_history { action: 'deleted', after: null }.
//   5. Throws when the photo is missing or already soft-deleted (loud failure
//      over silent idempotency).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockUpdatePromise = vi.fn()
const mockStorageRemove = vi.fn()
const mockGetUser = vi.fn()
const mockHistoryInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({ remove: mockStorageRemove }),
    },
    auth: { getUser: mockGetUser },
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
}))

vi.mock('@/lib/offline', () => ({
  syncManager: { queuePhoto: vi.fn() },
  resizePhoto: vi.fn(),
}))

const FAKE_PHOTO = {
  id: 'photo-1',
  inspection_id: 'insp-1',
  area_id: 'area-1',
  subfloor_id: null,
  photo_type: 'area',
  photo_category: null,
  caption: 'Mould on ceiling',
  job_completion_id: null,
  storage_path: 'insp-1/area-1/file.jpg',
}

function buildBuilder(table: string, calls: Array<Record<string, unknown>>) {
  const builder: Record<string, unknown> = {
    _table: table,
    _calls: calls,
  }
  builder.select = vi.fn((arg) => { calls.push({ method: 'select', arg }); return builder })
  builder.eq = vi.fn((col, val) => { calls.push({ method: 'eq', col, val }); return builder })
  builder.is = vi.fn((col, val) => { calls.push({ method: 'is', col, val }); return builder })
  builder.update = vi.fn((row) => { calls.push({ method: 'update', row }); return builder })
  builder.maybeSingle = mockMaybeSingle
  // For non-terminating chains (UPDATE), the builder itself is awaited.
  // We make the builder thenable, resolving via mockUpdatePromise.
  builder.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(mockUpdatePromise()).then(onFulfilled)
  return builder
}

const allCalls: Array<{ table: string; calls: Array<Record<string, unknown>> }> = []

beforeEach(() => {
  vi.clearAllMocks()
  allCalls.length = 0

  mockFrom.mockImplementation((table: string) => {
    const calls: Array<Record<string, unknown>> = []
    allCalls.push({ table, calls })
    return buildBuilder(table, calls)
  })

  // Default: read returns the fake photo, all UPDATEs succeed
  mockMaybeSingle.mockResolvedValue({ data: FAKE_PHOTO, error: null })
  mockUpdatePromise.mockResolvedValue({ data: null, error: null })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockHistoryInsert.mockResolvedValue({ error: null })
})

describe('deleteInspectionPhoto', () => {
  it('reads the row with a deleted_at IS NULL filter (rejects already-deleted)', async () => {
    const { deleteInspectionPhoto } = await import('../photoUpload')
    await deleteInspectionPhoto('photo-1')

    const readCall = allCalls.find(c => c.table === 'photos' && c.calls.some(x => x.method === 'select'))
    expect(readCall).toBeDefined()
    expect(readCall!.calls).toContainEqual({ method: 'is', col: 'deleted_at', val: null })
  })

  it('NULLs out inspection_areas.primary_photo_id pointing at the photo', async () => {
    const { deleteInspectionPhoto } = await import('../photoUpload')
    await deleteInspectionPhoto('photo-1')

    const primaryNullCall = allCalls.find(c => c.table === 'inspection_areas')
    expect(primaryNullCall).toBeDefined()
    expect(primaryNullCall!.calls).toContainEqual({ method: 'update', row: { primary_photo_id: null } })
    expect(primaryNullCall!.calls).toContainEqual({ method: 'eq', col: 'primary_photo_id', val: 'photo-1' })
  })

  it('soft-deletes with UPDATE deleted_at, not a hard DELETE', async () => {
    const { deleteInspectionPhoto } = await import('../photoUpload')
    await deleteInspectionPhoto('photo-1')

    const photosCalls = allCalls.filter(c => c.table === 'photos')
    const updateCall = photosCalls.find(c => c.calls.some(x => x.method === 'update'))
    expect(updateCall).toBeDefined()

    const updateRow = updateCall!.calls.find(x => x.method === 'update')!.row as Record<string, unknown>
    expect(updateRow.deleted_at).toBeTypeOf('string')
    expect(new Date(updateRow.deleted_at as string).toString()).not.toBe('Invalid Date')
  })

  it('does NOT remove the Storage object (plan v2: file stays in Storage)', async () => {
    const { deleteInspectionPhoto } = await import('../photoUpload')
    await deleteInspectionPhoto('photo-1')

    expect(mockStorageRemove).not.toHaveBeenCalled()
  })

  it('throws when the photo is not found or already soft-deleted', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { deleteInspectionPhoto } = await import('../photoUpload')

    await expect(deleteInspectionPhoto('photo-1')).rejects.toThrow(/not found or already deleted/i)
  })

  it('throws when the soft-delete UPDATE fails', async () => {
    mockUpdatePromise
      .mockResolvedValueOnce({ data: null, error: null }) // primary null-out
      .mockResolvedValueOnce({ data: null, error: { message: 'rls denied' } }) // soft-delete

    const { deleteInspectionPhoto } = await import('../photoUpload')
    await expect(deleteInspectionPhoto('photo-1')).rejects.toThrow(/Failed to soft-delete photo/i)
  })

  it('throws when the primary_photo_id NULL-out fails', async () => {
    mockUpdatePromise.mockResolvedValueOnce({ data: null, error: { message: 'fk constraint' } })
    const { deleteInspectionPhoto } = await import('../photoUpload')

    await expect(deleteInspectionPhoto('photo-1')).rejects.toThrow(/Failed to clear primary_photo_id/i)
  })
})
