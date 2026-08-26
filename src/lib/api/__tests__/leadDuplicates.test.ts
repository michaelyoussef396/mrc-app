// Pins the advisory duplicate lookup: a live phone/email collision is reported
// (so the modal can warn) but archived leads never count as duplicates.

import { describe, it, expect, vi, beforeEach } from 'vitest'

interface LeadRow {
  id: string
  full_name: string
  phone: string
  email: string
  archived_at: string | null
}

let rows: LeadRow[] = []
let lastQueryError: { message: string } | null = null

// Minimal in-memory PostgREST builder: applies .is()/.or() against `rows`
// so the tests exercise the real filter semantics rather than call spying.
function createFakeQuery() {
  let result = [...rows]
  const builder = {
    select: () => builder,
    is: (column: keyof LeadRow, value: null) => {
      result = result.filter(row => row[column] === value)
      return builder
    },
    or: (expression: string) => {
      const clauses = expression.split(',').map(clause => {
        const [column, operator, ...rest] = clause.split('.')
        return { column: column as keyof LeadRow, operator, value: rest.join('.') }
      })
      result = result.filter(row =>
        clauses.some(({ column, operator, value }) => {
          const cell = String(row[column] ?? '')
          return operator === 'eq' ? cell === value : cell.toLowerCase() === value.toLowerCase()
        }),
      )
      return builder
    },
    limit: (count: number) =>
      Promise.resolve({ data: lastQueryError ? null : result.slice(0, count), error: lastQueryError }),
  }
  return builder
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => createFakeQuery() },
}))

import { findDuplicateLead, normalizePhoneDigits } from '../leadDuplicates'

const LIVE_LEAD: LeadRow = {
  id: 'lead-live',
  full_name: 'Jane Citizen',
  phone: '0412345678',
  email: 'jane@example.com',
  archived_at: null,
}

const ARCHIVED_LEAD: LeadRow = {
  id: 'lead-archived',
  full_name: 'Old Enquiry',
  phone: '0499999999',
  email: 'old@example.com',
  archived_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  rows = [LIVE_LEAD, ARCHIVED_LEAD]
  lastQueryError = null
})

describe('findDuplicateLead — live duplicates warn', () => {
  it('should report the colliding lead when the email matches a live lead', async () => {
    const match = await findDuplicateLead({ phone: '0400 000 000', email: 'JANE@example.com' })

    expect(match).toEqual({ id: 'lead-live', fullName: 'Jane Citizen', matchType: 'email address' })
  })

  it('should report a phone match even when the input is formatted', async () => {
    const match = await findDuplicateLead({ phone: '0412 345 678', email: 'other@example.com' })

    expect(match?.matchType).toBe('phone number')
  })

  it('should name the colliding lead so the user can see what they are duplicating', async () => {
    const match = await findDuplicateLead({ phone: '0412 345 678', email: '' })

    expect(match?.fullName).toBe('Jane Citizen')
  })
})

describe('findDuplicateLead — archived leads are excluded', () => {
  it('should return null when the only email match is archived', async () => {
    const match = await findDuplicateLead({ phone: '0400 000 000', email: 'old@example.com' })

    expect(match).toBeNull()
  })

  it('should return null when the only phone match is archived', async () => {
    const match = await findDuplicateLead({ phone: '0499 999 999', email: 'fresh@example.com' })

    expect(match).toBeNull()
  })
})

describe('findDuplicateLead — never blocks on failure', () => {
  it('should return null when both phone and email are empty', async () => {
    const match = await findDuplicateLead({ phone: '', email: '  ' })

    expect(match).toBeNull()
  })

  it('should return null when the query errors', async () => {
    lastQueryError = { message: 'network down' }

    const match = await findDuplicateLead({ phone: '0412 345 678', email: 'jane@example.com' })

    expect(match).toBeNull()
  })
})

describe('normalizePhoneDigits', () => {
  it('should strip spaces, brackets and dashes', () => {
    expect(normalizePhoneDigits('(03) 9123-4567')).toBe('0391234567')
  })
})
