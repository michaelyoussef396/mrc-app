// Stage 4.2 — recordPhotoHistory() helper
//
// Pins the contract that this helper NEVER throws and always routes
// failures through Sentry. Photo upload paths rely on this guarantee —
// if recordPhotoHistory throws, an upload would error out after the row
// is already written.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockGetUser = vi.fn()
const mockSentry = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: mockSentry,
}))

describe('recordPhotoHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a row with changed_by set to the authenticated user id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })
    const { recordPhotoHistory } = await import('../photoHistory')

    await recordPhotoHistory({
      photo_id: 'photo-1',
      inspection_id: 'insp-1',
      action: 'added',
      after: { photo_type: 'area' },
    })

    expect(mockInsert).toHaveBeenCalledWith({
      photo_id: 'photo-1',
      inspection_id: 'insp-1',
      action: 'added',
      before: null,
      after: { photo_type: 'area' },
      changed_by: 'user-1',
    })
  })

  it('passes both before and after when supplied (category_changed shape)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })
    const { recordPhotoHistory } = await import('../photoHistory')

    await recordPhotoHistory({
      photo_id: 'photo-1',
      inspection_id: 'insp-1',
      action: 'category_changed',
      before: { photo_category: null },
      after: { photo_category: 'before' },
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { photo_category: null },
        after: { photo_category: 'before' },
      }),
    )
  })

  it('skips the insert when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { recordPhotoHistory } = await import('../photoHistory')

    await recordPhotoHistory({
      photo_id: 'photo-1',
      inspection_id: 'insp-1',
      action: 'added',
    })

    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockSentry).toHaveBeenCalledWith(
      expect.stringContaining('no authenticated user'),
      expect.objectContaining({ photo_id: 'photo-1', action: 'added' }),
    )
  })

  it('does not throw when the insert returns an error — routes to Sentry instead', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: { message: 'rls denied' } })
    const { recordPhotoHistory } = await import('../photoHistory')

    await expect(
      recordPhotoHistory({
        photo_id: 'photo-1',
        inspection_id: 'insp-1',
        action: 'added',
      }),
    ).resolves.toBeUndefined()

    expect(mockSentry).toHaveBeenCalledWith(
      expect.stringContaining('photo_history insert failed'),
      expect.objectContaining({ error: 'rls denied' }),
    )
  })

  it('does not throw when getUser() rejects — catches and routes to Sentry', async () => {
    mockGetUser.mockRejectedValue(new Error('network down'))
    const { recordPhotoHistory } = await import('../photoHistory')

    await expect(
      recordPhotoHistory({
        photo_id: 'photo-1',
        inspection_id: 'insp-1',
        action: 'added',
      }),
    ).resolves.toBeUndefined()

    expect(mockSentry).toHaveBeenCalledWith(
      expect.stringContaining('photo_history insert threw'),
      expect.objectContaining({ error: 'network down' }),
    )
  })

  it('does not throw when insert() rejects — catches and routes to Sentry', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockRejectedValue(new Error('connection lost'))
    const { recordPhotoHistory } = await import('../photoHistory')

    await expect(
      recordPhotoHistory({
        photo_id: 'photo-1',
        inspection_id: 'insp-1',
        action: 'added',
      }),
    ).resolves.toBeUndefined()

    expect(mockSentry).toHaveBeenCalledWith(
      expect.stringContaining('photo_history insert threw'),
      expect.objectContaining({ error: 'connection lost' }),
    )
  })
})
