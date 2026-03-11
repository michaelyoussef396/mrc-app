import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Dexie with in-memory store
const mockStore: Record<string, Record<string, unknown>[]> = {
  inspectionDrafts: [],
  photoQueue: [],
  syncLog: [],
}

const createMockTable = (name: string) => ({
  get: vi.fn(async (id: string) => mockStore[name].find((r: any) => r.id === id)),
  put: vi.fn(async (record: any) => {
    const idx = mockStore[name].findIndex((r: any) => r.id === record.id)
    if (idx >= 0) mockStore[name][idx] = record
    else mockStore[name].push(record)
  }),
  update: vi.fn(async (id: string, changes: any) => {
    const idx = mockStore[name].findIndex((r: any) => r.id === id)
    if (idx >= 0) Object.assign(mockStore[name][idx], changes)
  }),
  delete: vi.fn(async (id: string) => {
    mockStore[name] = mockStore[name].filter((r: any) => r.id !== id)
  }),
  where: vi.fn((field: string) => ({
    equals: vi.fn((value: any) => ({
      first: vi.fn(async () => mockStore[name].find((r: any) => (r as any)[field] === value)),
      filter: vi.fn((fn: (item: any) => boolean) => ({
        toArray: vi.fn(async () => mockStore[name].filter((r: any) => (r as any)[field] === value).filter(fn)),
      })),
      delete: vi.fn(async () => {
        mockStore[name] = mockStore[name].filter((r: any) => (r as any)[field] !== value)
      }),
      toArray: vi.fn(async () => mockStore[name].filter((r: any) => (r as any)[field] === value)),
    })),
    anyOf: vi.fn((values: any[]) => ({
      count: vi.fn(async () => mockStore[name].filter((r: any) => values.includes((r as any)[field])).length),
      toArray: vi.fn(async () => mockStore[name].filter((r: any) => values.includes((r as any)[field]))),
    })),
  })),
})

vi.mock('../db', () => ({
  offlineDb: {
    inspectionDrafts: createMockTable('inspectionDrafts'),
    photoQueue: createMockTable('photoQueue'),
    syncLog: createMockTable('syncLog'),
  },
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'remote-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}))

describe('SyncManager', () => {
  let SyncManager: any

  beforeEach(async () => {
    mockStore.inspectionDrafts = []
    mockStore.photoQueue = []
    mockStore.syncLog = []

    vi.resetModules()
    const mod = await import('../SyncManager')
    SyncManager = mod.SyncManager
  })

  it('saveDraft() stores to IndexedDB with pending status', async () => {
    const sm = new SyncManager()
    const draft = await sm.saveDraft({
      id: 'draft-1',
      leadId: 'lead-1',
      formData: { treatment_type: 'mould_cleaning' },
    })

    expect(draft.status).toBe('pending')
    expect(draft.id).toBe('draft-1')
    expect(draft.leadId).toBe('lead-1')
    expect(draft.createdAt).toBeDefined()
    expect(draft.updatedAt).toBeDefined()
  })

  it('getDraft() retrieves by ID', async () => {
    const sm = new SyncManager()
    await sm.saveDraft({ id: 'draft-2', leadId: 'lead-2', formData: {} })
    const result = await sm.getDraft('draft-2')
    expect(result).toBeDefined()
    expect(result?.id).toBe('draft-2')
  })

  it('getDraftByLeadId() retrieves by lead ID', async () => {
    const sm = new SyncManager()
    await sm.saveDraft({ id: 'draft-3', leadId: 'lead-3', formData: { note: 'test' } })
    const result = await sm.getDraftByLeadId('lead-3')
    expect(result).toBeDefined()
    expect(result?.leadId).toBe('lead-3')
  })

  it('getPendingCounts() returns correct counts', async () => {
    const sm = new SyncManager()
    await sm.saveDraft({ id: 'd1', leadId: 'l1', formData: {} })
    await sm.saveDraft({ id: 'd2', leadId: 'l2', formData: {} })

    const counts = await sm.getPendingCounts()
    expect(counts.drafts).toBe(2)
    expect(counts.photos).toBe(0)
  })

  it('queuePhoto() stores photo with pending status', async () => {
    const sm = new SyncManager()
    const photo = await sm.queuePhoto({
      id: 'photo-1',
      inspectionDraftId: 'draft-1',
      blob: new Blob(['test'], { type: 'image/jpeg' }),
      originalFileName: 'test.jpg',
      photoType: 'area' as const,
      orderIndex: 0,
    })

    expect(photo.status).toBe('pending')
    expect(photo.id).toBe('photo-1')
    expect(photo.createdAt).toBeDefined()
  })

  it('syncAll() skips when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const sm = new SyncManager()
    const result = await sm.syncAll()

    expect(result.syncedDrafts).toBe(0)
    expect(result.errors).toContain('Device is offline')

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  it('deleteDraft() removes draft and its photos', async () => {
    const sm = new SyncManager()
    await sm.saveDraft({ id: 'del-1', leadId: 'l-del', formData: {} })

    await sm.deleteDraft('del-1')

    const result = await sm.getDraft('del-1')
    expect(result).toBeUndefined()
  })
})
