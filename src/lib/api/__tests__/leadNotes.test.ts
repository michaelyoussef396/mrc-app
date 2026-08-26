// Pins the lead_notes data layer (Phase 1, text only):
//   1. createLeadNote inserts the trimmed body attributed to the signed-in
//      user and projects a note_added activity via logNoteAdded.
//   2. listLeadNotes returns live notes newest first, never soft-deleted ones,
//      with author names resolved through get_staff_names.
//   3. softDeleteLeadNote stamps deleted_at and fails loudly when RLS matched
//      no row (not the author / already deleted) — never a silent no-op.

import { describe, it, expect, vi, beforeEach } from 'vitest'

interface NoteRow {
  id: string
  lead_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

let rows: NoteRow[] = []
let staffNames: Array<{ id: string; full_name: string | null }> = []
let queryError: { message: string } | null = null
let rpcError: { message: string } | null = null
let insertCounter = 0

// Minimal in-memory PostgREST fake for lead_notes: filters (.eq/.is), ordering
// and writes are applied against `rows` so the tests exercise real behaviour
// (soft-deleted rows disappear because the filter runs, not because a spy says so).
function createFakeQuery() {
  let working = [...rows]
  let pendingUpdate: Partial<NoteRow> | null = null
  let inserted: NoteRow | null = null

  const settle = () => {
    if (queryError) return { data: null, error: queryError }
    if (pendingUpdate) {
      const patch = pendingUpdate
      working.forEach((row) => Object.assign(row, patch))
      return { data: working.map((row) => ({ id: row.id })), error: null }
    }
    return { data: working, error: null }
  }

  const builder = {
    select: () => builder,
    eq: (column: keyof NoteRow, value: string) => {
      working = working.filter((row) => row[column] === value)
      return builder
    },
    is: (column: keyof NoteRow, value: null) => {
      working = working.filter((row) => row[column] === value)
      return builder
    },
    order: (column: keyof NoteRow, { ascending }: { ascending: boolean }) => {
      working.sort((a, b) =>
        ascending
          ? String(a[column]).localeCompare(String(b[column]))
          : String(b[column]).localeCompare(String(a[column])),
      )
      return builder
    },
    insert: (payload: Pick<NoteRow, 'lead_id' | 'author_id' | 'body'>) => {
      insertCounter += 1
      inserted = {
        ...payload,
        id: `note-${insertCounter}`,
        created_at: '2026-08-26T00:00:00Z',
        updated_at: '2026-08-26T00:00:00Z',
        deleted_at: null,
      }
      rows.push(inserted)
      return builder
    },
    update: (patch: Partial<NoteRow>) => {
      pendingUpdate = patch
      return builder
    },
    single: () =>
      Promise.resolve(queryError ? { data: null, error: queryError } : { data: inserted, error: null }),
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(settle()).then(onFulfilled),
  }
  return builder
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => createFakeQuery(),
    rpc: (_fn: string, args: { p_user_ids: string[] }) =>
      Promise.resolve(
        rpcError
          ? { data: null, error: rpcError }
          : { data: staffNames.filter((s) => args.p_user_ids.includes(s.id)), error: null },
      ),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-vryan' } } }) },
  },
}))

const { mockLogNoteAdded } = vi.hoisted(() => ({ mockLogNoteAdded: vi.fn() }))
vi.mock('@/lib/api/fieldEditLog', () => ({ logNoteAdded: mockLogNoteAdded }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

import { createLeadNote, listLeadNotes, softDeleteLeadNote, LeadNoteError } from '../leadNotes'

const LEAD_ID = 'lead-1'

const OLDER_NOTE: NoteRow = {
  id: 'note-older',
  lead_id: LEAD_ID,
  author_id: 'user-clayton',
  body: 'Tenant confirmed access for Thursday',
  created_at: '2026-08-24T06:26:25Z',
  updated_at: '2026-08-24T06:26:25Z',
  deleted_at: null,
}

const NEWER_NOTE: NoteRow = {
  id: 'note-newer',
  lead_id: LEAD_ID,
  author_id: 'user-vryan',
  body: 'Called, waiting on approval',
  created_at: '2026-08-25T02:09:35Z',
  updated_at: '2026-08-25T02:09:35Z',
  deleted_at: null,
}

const DELETED_NOTE: NoteRow = {
  id: 'note-deleted',
  lead_id: LEAD_ID,
  author_id: 'user-vryan',
  body: 'Wrong lead, ignore',
  created_at: '2026-08-25T03:00:00Z',
  updated_at: '2026-08-25T03:05:00Z',
  deleted_at: '2026-08-25T03:05:00Z',
}

const OTHER_LEAD_NOTE: NoteRow = {
  id: 'note-other-lead',
  lead_id: 'lead-2',
  author_id: 'user-clayton',
  body: 'Belongs elsewhere',
  created_at: '2026-08-25T04:00:00Z',
  updated_at: '2026-08-25T04:00:00Z',
  deleted_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  rows = [OLDER_NOTE, NEWER_NOTE, DELETED_NOTE, OTHER_LEAD_NOTE].map((row) => ({ ...row }))
  staffNames = [
    { id: 'user-vryan', full_name: 'Vryan Lopez' },
    { id: 'user-clayton', full_name: 'Clayton Jenkins' },
  ]
  queryError = null
  rpcError = null
  insertCounter = 0
  mockLogNoteAdded.mockResolvedValue(undefined)
})

describe('createLeadNote', () => {
  it('should insert the trimmed body attributed to the signed-in user', async () => {
    await createLeadNote({ leadId: LEAD_ID, body: '  Left a voicemail  ', authorName: 'Vryan Lopez' })

    expect(rows.at(-1)).toMatchObject({ lead_id: LEAD_ID, author_id: 'user-vryan', body: 'Left a voicemail' })
  })

  it('should return the stored row', async () => {
    const note = await createLeadNote({ leadId: LEAD_ID, body: 'Left a voicemail', authorName: 'Vryan Lopez' })

    expect(note).toMatchObject({ id: 'note-1', body: 'Left a voicemail', deleted_at: null })
  })

  it('should log a note_added activity after a successful insert', async () => {
    await createLeadNote({ leadId: LEAD_ID, body: 'Left a voicemail', authorName: 'Vryan Lopez' })

    expect(mockLogNoteAdded).toHaveBeenCalledWith({
      leadId: LEAD_ID,
      noteText: 'Left a voicemail',
      authorName: 'Vryan Lopez',
    })
  })

  it('should reject a whitespace-only body without touching the database', async () => {
    await expect(createLeadNote({ leadId: LEAD_ID, body: '   \n\t ', authorName: 'Vryan Lopez' })).rejects.toMatchObject({
      code: 'EMPTY_BODY',
    })
  })

  it('should reject a body over the 10000 character limit', async () => {
    await expect(
      createLeadNote({ leadId: LEAD_ID, body: 'x'.repeat(10001), authorName: 'Vryan Lopez' }),
    ).rejects.toMatchObject({ code: 'BODY_TOO_LONG' })
  })

  it('should throw INSERT_FAILED when the database rejects the insert', async () => {
    queryError = { message: 'new row violates row-level security policy' }

    await expect(createLeadNote({ leadId: LEAD_ID, body: 'Hello', authorName: 'Vryan Lopez' })).rejects.toBeInstanceOf(
      LeadNoteError,
    )
  })

  it('should not log an activity when the insert fails', async () => {
    queryError = { message: 'new row violates row-level security policy' }

    await createLeadNote({ leadId: LEAD_ID, body: 'Hello', authorName: 'Vryan Lopez' }).catch(() => undefined)

    expect(mockLogNoteAdded).not.toHaveBeenCalled()
  })
})

describe('listLeadNotes', () => {
  it('should return the lead\'s live notes newest first', async () => {
    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.map((n) => n.id)).toEqual(['note-newer', 'note-older'])
  })

  it('should not include soft-deleted notes', async () => {
    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.some((n) => n.id === 'note-deleted')).toBe(false)
  })

  it('should not include notes from other leads', async () => {
    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.some((n) => n.lead_id !== LEAD_ID)).toBe(false)
  })

  it('should resolve author names through get_staff_names', async () => {
    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.map((n) => n.authorName)).toEqual(['Vryan Lopez', 'Clayton Jenkins'])
  })

  it('should leave authorName null when name resolution fails', async () => {
    rpcError = { message: 'permission denied for function get_staff_names' }

    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.every((n) => n.authorName === null)).toBe(true)
  })

  it('should throw LIST_FAILED when the query errors', async () => {
    queryError = { message: 'network down' }

    await expect(listLeadNotes(LEAD_ID)).rejects.toMatchObject({ code: 'LIST_FAILED' })
  })
})

describe('softDeleteLeadNote', () => {
  it('should stamp deleted_at on the note', async () => {
    await softDeleteLeadNote('note-newer')

    expect(rows.find((r) => r.id === 'note-newer')?.deleted_at).toEqual(expect.any(String))
  })

  it('should hide the note from subsequent lists', async () => {
    await softDeleteLeadNote('note-newer')

    const notes = await listLeadNotes(LEAD_ID)

    expect(notes.some((n) => n.id === 'note-newer')).toBe(false)
  })

  it('should throw DELETE_FAILED when no row was updated (not the author or already deleted)', async () => {
    await expect(softDeleteLeadNote('note-deleted')).rejects.toMatchObject({ code: 'DELETE_FAILED' })
  })

  it('should throw DELETE_FAILED when the database rejects the update', async () => {
    queryError = { message: 'permission denied' }

    await expect(softDeleteLeadNote('note-newer')).rejects.toMatchObject({ code: 'DELETE_FAILED' })
  })
})
