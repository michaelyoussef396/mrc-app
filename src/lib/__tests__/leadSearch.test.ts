// Pins the single search filter shared by the topbar search and the Leads
// Management page — the two surfaces diverged when the Leads page filtered
// client-side over a paginated slice.

import { describe, expect, it } from 'vitest'

import { applyLeadSearch, escapeIlike, hasSearchQuery, toSearchWords } from '../leadSearch'

interface RecordedFilter {
  column: string
  pattern: string
}

function createRecordingQuery() {
  const filters: RecordedFilter[] = []
  const query = {
    filters,
    ilike(column: string, pattern: string) {
      filters.push({ column, pattern })
      return query
    },
  }
  return query
}

describe('applyLeadSearch', () => {
  it('should add one search_text ILIKE filter per word', () => {
    const query = applyLeadSearch(createRecordingQuery(), 'jane richmond')

    expect(query.filters).toEqual([
      { column: 'search_text', pattern: '%jane%' },
      { column: 'search_text', pattern: '%richmond%' },
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

  it('should escape ILIKE wildcards typed by the user', () => {
    const query = applyLeadSearch(createRecordingQuery(), '50%_off')

    expect(query.filters[0].pattern).toBe('%50\\%\\_off%')
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
