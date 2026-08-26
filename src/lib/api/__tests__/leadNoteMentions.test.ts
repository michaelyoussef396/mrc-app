// @mention parsing, rendering and persistence for internal lead notes.
// Follows the leadNotes.test.ts idiom: real behaviour against a small
// in-memory fake, no assertions on spies alone.

import { describe, it, expect, vi, beforeEach } from 'vitest'

let rpcError: { message: string } | null = null
let rpcResult: unknown = 0
let userRoleRows: Array<{ user_id: string | null }> = []
let staffNames: Array<{ id: string; full_name: string | null }> = []
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: userRoleRows, error: null }),
    }),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      if (fn === 'get_staff_names') {
        const ids = args.p_user_ids as string[]
        return Promise.resolve({
          data: staffNames.filter((s) => ids.includes(s.id)),
          error: null,
        })
      }
      return Promise.resolve(
        rpcError ? { data: null, error: rpcError } : { data: rpcResult, error: null },
      )
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-vryan' } } }) },
  },
}))

vi.mock('@/lib/api/fieldEditLog', () => ({ logNoteAdded: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))

import {
  addLeadNoteMentions,
  listStaffForMentions,
  parseMentions,
  segmentNoteBody,
  LeadNoteError,
  type MentionCandidate,
} from '../leadNotes'

// "Clay" exists specifically so the longest-name-first rule has something to
// get wrong — a naive substring match resolves it inside "@Clayton Jenkins".
const STAFF: MentionCandidate[] = [
  { id: 'user-clay', fullName: 'Clay' },
  { id: 'user-clayton', fullName: 'Clayton Jenkins' },
  { id: 'user-glen', fullName: 'Glen Marshall' },
]

beforeEach(() => {
  vi.clearAllMocks()
  rpcCalls.length = 0
  rpcError = null
  rpcResult = 0
  userRoleRows = []
  staffNames = []
})

describe('parseMentions', () => {
  it('should resolve a mentioned staff member to their user id', () => {
    expect(parseMentions('@Glen Marshall can you call them', STAFF)).toEqual(['user-glen'])
  })

  it('should resolve the longest matching name when one name is a prefix of another', () => {
    expect(parseMentions('@Clayton Jenkins please check', STAFF)).toEqual(['user-clayton'])
  })

  it('should still resolve the shorter name when it is the one mentioned', () => {
    expect(parseMentions('@Clay please check', STAFF)).toEqual(['user-clay'])
  })

  it('should match case-insensitively', () => {
    expect(parseMentions('@glen marshall', STAFF)).toEqual(['user-glen'])
  })

  it('should return an empty array when nobody is mentioned', () => {
    expect(parseMentions('Called the customer, no answer.', STAFF)).toEqual([])
  })

  it('should ignore an @token that matches no staff member', () => {
    expect(parseMentions('@Nobody At All', STAFF)).toEqual([])
  })

  it('should not repeat an id when the same person is mentioned twice', () => {
    expect(parseMentions('@Clay and again @Clay', STAFF)).toEqual(['user-clay'])
  })

  it('should resolve every distinct person mentioned', () => {
    expect(parseMentions('@Clay and @Glen Marshall', STAFF).sort()).toEqual([
      'user-clay',
      'user-glen',
    ])
  })
})

describe('segmentNoteBody', () => {
  it('should return the whole body as one plain segment when there are no mentions', () => {
    expect(segmentNoteBody('No mentions here', [])).toEqual([
      { text: 'No mentions here', isMention: false },
    ])
  })

  it('should mark the mention span separately from the surrounding text', () => {
    expect(segmentNoteBody('hey @Clay look', ['Clay'])).toEqual([
      { text: 'hey ', isMention: false },
      { text: '@Clay', isMention: true },
      { text: ' look', isMention: false },
    ])
  })

  it('should not mark a shorter name nested inside a longer mention', () => {
    const segments = segmentNoteBody('@Clayton Jenkins here', ['Clayton Jenkins', 'Clay'])
    expect(segments.filter((segment) => segment.isMention)).toEqual([
      { text: '@Clayton Jenkins', isMention: true },
    ])
  })
})

describe('addLeadNoteMentions', () => {
  it('should not call the RPC when nobody was mentioned', async () => {
    await addLeadNoteMentions('note-1', [])
    expect(rpcCalls).toEqual([])
  })

  it('should pass the note id and user ids to add_lead_note_mentions', async () => {
    await addLeadNoteMentions('note-1', ['user-glen'])
    expect(rpcCalls).toEqual([
      { fn: 'add_lead_note_mentions', args: { p_note_id: 'note-1', p_user_ids: ['user-glen'] } },
    ])
  })

  it('should return the number of people notified', async () => {
    rpcResult = 2
    await expect(addLeadNoteMentions('note-1', ['user-glen', 'user-clay'])).resolves.toBe(2)
  })

  it('should throw MENTION_FAILED when the RPC rejects the caller', async () => {
    rpcError = { message: 'only the note author may add mentions' }
    await expect(addLeadNoteMentions('note-1', ['user-glen'])).rejects.toMatchObject({
      code: 'MENTION_FAILED',
    })
  })

  it('should throw a LeadNoteError so the UI can surface it', async () => {
    rpcError = { message: 'boom' }
    await expect(addLeadNoteMentions('note-1', ['user-glen'])).rejects.toBeInstanceOf(LeadNoteError)
  })
})

describe('listStaffForMentions', () => {
  it('should return every staff member with a resolvable name, sorted by name', async () => {
    userRoleRows = [{ user_id: 'user-glen' }, { user_id: 'user-clay' }]
    staffNames = [
      { id: 'user-glen', full_name: 'Glen Marshall' },
      { id: 'user-clay', full_name: 'Clay' },
    ]
    await expect(listStaffForMentions()).resolves.toEqual([
      { id: 'user-clay', fullName: 'Clay' },
      { id: 'user-glen', fullName: 'Glen Marshall' },
    ])
  })

  it('should drop a staff id whose name cannot be resolved', async () => {
    userRoleRows = [{ user_id: 'user-glen' }, { user_id: 'user-ghost' }]
    staffNames = [{ id: 'user-glen', full_name: 'Glen Marshall' }]
    await expect(listStaffForMentions()).resolves.toEqual([
      { id: 'user-glen', fullName: 'Glen Marshall' },
    ])
  })

  it('should de-duplicate a user holding more than one role', async () => {
    userRoleRows = [{ user_id: 'user-glen' }, { user_id: 'user-glen' }]
    staffNames = [{ id: 'user-glen', full_name: 'Glen Marshall' }]
    await expect(listStaffForMentions()).resolves.toHaveLength(1)
  })

  it('should return an empty list when there are no staff rows', async () => {
    userRoleRows = []
    await expect(listStaffForMentions()).resolves.toEqual([])
  })
})
