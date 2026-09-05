// Pins the single search filter shared by the topbar search and the Leads
// Management page — the two surfaces diverged when the Leads page filtered
// client-side over a paginated slice.
//
// The filter is now an OR across search_text and lead_number so a Lead ID
// finds its lead (P1-15). Because that OR is built as a PostgREST filter
// STRING rather than passed as an escaped parameter, the quoting is
// load-bearing: an unquoted comma or paren in user input would be read as
// filter grammar. Those cases are pinned below.

import { describe, expect, it } from 'vitest'

import {
  applyLeadSearch,
  escapeIlike,
  hasSearchQuery,
  quoteOrValue,
  toSearchWords,
} from '../leadSearch'

function createRecordingQuery() {
  const filters: string[] = []
  const query = {
    filters,
    or(expression: string) {
      filters.push(expression)
      return query
    },
  }
  return query
}

describe('applyLeadSearch', () => {
  it('should add one OR group per word', () => {
    const query = applyLeadSearch(createRecordingQuery(), 'jane richmond')

    expect(query.filters).toEqual([
      'search_text.ilike."%jane%",lead_number.ilike."%jane%"',
      'search_text.ilike."%richmond%",lead_number.ilike."%richmond%"',
    ])
  })

  it('should match a full Lead ID against lead_number', () => {
    const query = applyLeadSearch(createRecordingQuery(), 'MRC-2026-0179')

    expect(query.filters).toEqual([
      'search_text.ilike."%MRC-2026-0179%",lead_number.ilike."%MRC-2026-0179%"',
    ])
  })

  it('should match a partial Lead ID against lead_number', () => {
    const query = applyLeadSearch(createRecordingQuery(), '0179')

    expect(query.filters).toEqual([
      'search_text.ilike."%0179%",lead_number.ilike."%0179%"',
    ])
  })

  it('should add no filters for a query shorter than the minimum length', () => {
    const query = applyLeadSearch(createRecordingQuery(), 'j')

    expect(query.filters).toEqual([])
  })

  it('should add no filters for whitespace-only input', () => {
    const query = applyLeadSearch(createRecordingQuery(), '   ')

    expect(query.filters).toEqual([])
  })

  // Two escaping layers stack here: escapeIlike makes `%` and `_` literal for
  // LIKE, then quoteOrValue doubles the backslashes it produced so they
  // survive PostgREST's unquoting. The wire value therefore carries `\\%`,
  // which PostgREST hands to LIKE as `\%` — a literal percent sign.
  it('should escape ILIKE wildcards typed by the user', () => {
    const query = applyLeadSearch(createRecordingQuery(), '50%_off')

    expect(query.filters).toEqual([
      'search_text.ilike."%50\\\\%\\\\_off%",lead_number.ilike."%50\\\\%\\\\_off%"',
    ])
  })

  it('should quote a comma so it is not read as a filter separator', () => {
    const query = applyLeadSearch(createRecordingQuery(), 'smith,jane')

    expect(query.filters).toEqual([
      'search_text.ilike."%smith,jane%",lead_number.ilike."%smith,jane%"',
    ])
  })

  it('should quote parentheses so they are not read as filter grouping', () => {
    const query = applyLeadSearch(createRecordingQuery(), '(03)')

    expect(query.filters).toEqual([
      'search_text.ilike."%(03)%",lead_number.ilike."%(03)%"',
    ])
  })

  it('should return the same builder so the caller can keep chaining', () => {
    const original = createRecordingQuery()

    expect(applyLeadSearch(original, 'jane')).toBe(original)
  })
})

describe('toSearchWords', () => {
  it('should split on any run of whitespace', () => {
    expect(toSearchWords('  jane   citizen ')).toEqual(['jane', 'citizen'])
  })

  it('should return an empty list below the minimum length', () => {
    expect(toSearchWords('a')).toEqual([])
  })
})

describe('hasSearchQuery', () => {
  it('should be true for a two-character query', () => {
    expect(hasSearchQuery('ab')).toBe(true)
  })

  it('should be false for a one-character query', () => {
    expect(hasSearchQuery('a')).toBe(false)
  })
})

describe('escapeIlike', () => {
  it('should escape backslash before percent and underscore', () => {
    expect(escapeIlike('a\\b%c_d')).toBe('a\\\\b\\%c\\_d')
  })
})

describe('quoteOrValue', () => {
  it('should wrap the value in double quotes', () => {
    expect(quoteOrValue('jane')).toBe('"jane"')
  })

  it('should escape an embedded double quote', () => {
    expect(quoteOrValue('say "hi"')).toBe('"say \\"hi\\""')
  })

  it('should escape a backslash so it survives PostgREST unquoting', () => {
    expect(quoteOrValue('a\\b')).toBe('"a\\\\b"')
  })
})
