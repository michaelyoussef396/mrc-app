// Wave 3 — fieldLabels: DB column → human label resolution.
//
// Pins the contract: known columns map to their human label; unknown columns
// degrade gracefully to a humanised snake_case fallback; every key in the
// FIELD_LABELS map carries a non-empty label.

import { describe, it, expect } from 'vitest'
import { FIELD_LABELS, getFieldLabel } from '../fieldLabels'

describe('getFieldLabel', () => {
  it('returns the mapped human label for a known DB column', () => {
    expect(getFieldLabel('access_instructions')).toBe('Access Instructions')
  })

  it('returns the mapped human label for status', () => {
    expect(getFieldLabel('status')).toBe('Status')
  })

  it('falls back to title-cased snake_case for an unknown column', () => {
    expect(getFieldLabel('some_unmapped_column')).toBe('Some Unmapped Column')
  })

  it('returns single-token columns unchanged in fallback', () => {
    expect(getFieldLabel('unknown')).toBe('Unknown')
  })
})

describe('FIELD_LABELS map', () => {
  it('every key has a non-empty label', () => {
    for (const [key, value] of Object.entries(FIELD_LABELS)) {
      expect(value, `FIELD_LABELS["${key}"] should be non-empty`).toBeTruthy()
      expect(value.length, `FIELD_LABELS["${key}"] should not be empty string`).toBeGreaterThan(0)
    }
  })
})
