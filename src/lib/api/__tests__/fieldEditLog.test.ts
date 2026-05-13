// Wave 3 — fieldEditLog canonical writer (logFieldEdits + logNoteAdded).
//
// Pins the contract:
//   1. 1-field diff produces a single change entry with correct field/old/new.
//   2. Multi-field diff produces an array of changes in payload-order.
//   3. Multi-field description summarises as "N fields changed".
//   4. Single-field description renders as "{Label} changed: 'old' → 'new'".
//   5. Version auto-increments from prior field_edit rows for the same lead.
//   6. null → value and value → null transitions are captured verbatim.
//   7. logNoteAdded writes activity_type 'note_added' with note_text in metadata
//      (NOT a diff — append-only structures are distinct).
//   8. extraMetadata pass-through is preserved on field_edit rows.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockSelectResult = vi.fn() // resolves the thenable for .select().eq().eq()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
}))

interface BuilderCall {
  method: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[]
}

const allCalls: Array<{ table: string; calls: BuilderCall[] }> = []

function buildBuilder(table: string, calls: BuilderCall[]) {
  const builder: Record<string, unknown> = { _table: table, _calls: calls }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.select = vi.fn((...args: any[]) => { calls.push({ method: 'select', args }); return builder })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.eq = vi.fn((...args: any[]) => { calls.push({ method: 'eq', args }); return builder })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.insert = vi.fn((...args: any[]) => {
    calls.push({ method: 'insert', args })
    return Promise.resolve(mockInsert(...args))
  })
  // Thenable for awaited select chains — version-count uses `.select().eq().eq()`.
  // Returns whatever mockSelectResult resolves to.
  builder.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(mockSelectResult()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  allCalls.length = 0
  mockFrom.mockImplementation((table: string) => {
    const calls: BuilderCall[] = []
    allCalls.push({ table, calls })
    return buildBuilder(table, calls)
  })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockInsert.mockResolvedValue({ error: null })
  mockSelectResult.mockResolvedValue({ count: 0, error: null })
})

function getInsertRow(): Record<string, unknown> {
  const insertCall = allCalls.flatMap((c) => c.calls).find((c) => c.method === 'insert')
  if (!insertCall) throw new Error('no insert call recorded')
  return insertCall.args[0] as Record<string, unknown>
}

describe('logFieldEdits', () => {
  it('1-field diff produces a single change entry with correct field/old/new', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'access_instructions', old: null, new: 'Front gate open' }],
    })

    const row = getInsertRow()
    expect(row.activity_type).toBe('field_edit')
    expect(row.metadata).toEqual(
      expect.objectContaining({
        version: 1,
        entity_type: 'lead',
        entity_id: 'lead-1',
        changes: [{ field: 'access_instructions', old: null, new: 'Front gate open' }],
      }),
    )
  })

  it('multi-field diff produces an array of changes in payload-order', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [
        { field: 'full_name', old: 'old name', new: 'new name' },
        { field: 'phone', old: '0412', new: '0433' },
        { field: 'email', old: 'a@b.com', new: 'c@d.com' },
      ],
    })

    const row = getInsertRow()
    const metadata = row.metadata as { changes: Array<{ field: string }> }
    expect(metadata.changes).toHaveLength(3)
    expect(metadata.changes.map((c) => c.field)).toEqual(['full_name', 'phone', 'email'])
  })

  it('multi-field description summarises as "N fields changed"', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [
        { field: 'full_name', old: 'a', new: 'b' },
        { field: 'phone', old: '1', new: '2' },
      ],
    })

    const row = getInsertRow()
    expect(row.description).toBe('2 fields changed')
  })

  it('single-field description renders as "{Label} changed: \'old\' → \'new\'"', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'access_instructions', old: 'old text', new: 'new text' }],
    })

    const row = getInsertRow()
    expect(row.description).toBe("Access Instructions changed: 'old text' → 'new text'")
  })

  it('version auto-increments from prior field_edit rows for the same lead', async () => {
    mockSelectResult.mockResolvedValue({ count: 4, error: null })
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'status', old: 'new_lead', new: 'inspection_waiting' }],
    })

    const row = getInsertRow()
    const metadata = row.metadata as { version: number }
    expect(metadata.version).toBe(5)
    expect(row.title).toBe('v5 — edited Status')
  })

  it('null → value transition stores both values verbatim', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'special_requests', old: null, new: 'remove shoes' }],
    })

    const row = getInsertRow()
    const metadata = row.metadata as { changes: Array<{ old: unknown; new: unknown }> }
    expect(metadata.changes[0].old).toBeNull()
    expect(metadata.changes[0].new).toBe('remove shoes')
  })

  it('value → null transition stores both values verbatim', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'inspection_scheduled_date', old: '2026-05-15', new: null }],
    })

    const row = getInsertRow()
    const metadata = row.metadata as { changes: Array<{ old: unknown; new: unknown }> }
    expect(metadata.changes[0].old).toBe('2026-05-15')
    expect(metadata.changes[0].new).toBeNull()
  })

  it('extraMetadata pass-through is preserved on the row alongside changes', async () => {
    const { logFieldEdits } = await import('../fieldEditLog')

    await logFieldEdits({
      leadId: 'lead-1',
      entityType: 'lead',
      entityId: 'lead-1',
      changes: [{ field: 'status', old: 'job_completed', new: 'new_lead' }],
      extraMetadata: {
        reverted: true,
        cancelled_booking_ids: ['b-1', 'b-2'],
        preserved_booking_ids: ['b-3'],
      },
    })

    const row = getInsertRow()
    expect(row.metadata).toEqual(
      expect.objectContaining({
        version: 1,
        entity_type: 'lead',
        entity_id: 'lead-1',
        changes: [{ field: 'status', old: 'job_completed', new: 'new_lead' }],
        reverted: true,
        cancelled_booking_ids: ['b-1', 'b-2'],
        preserved_booking_ids: ['b-3'],
      }),
    )
  })
})

describe('logNoteAdded', () => {
  it("writes activity_type 'note_added' with note_text in metadata, NOT a diff", async () => {
    const { logNoteAdded } = await import('../fieldEditLog')

    await logNoteAdded({
      leadId: 'lead-1',
      noteText: 'Spoke to Adam, sounds genuine, booked Friday morning.',
      authorName: 'michael youssef',
    })

    const row = getInsertRow()
    expect(row.activity_type).toBe('note_added')
    expect(row.title).toBe('Note added')
    expect(row.metadata).toEqual({
      note_text: 'Spoke to Adam, sounds genuine, booked Friday morning.',
      author: 'michael youssef',
    })
    // Explicit negative assertion — must not carry a diff shape
    expect((row.metadata as Record<string, unknown>).changes).toBeUndefined()
  })
})
