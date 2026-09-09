import { describe, it, expect } from 'vitest'

import { SENTRY_IGNORE_ERRORS } from '@/lib/sentry'

// Mirrors Sentry's eventFilters matching: an error is dropped when any
// ignoreErrors entry matches either the exception value or "<type>: <value>",
// with string entries matched as substrings and regex entries with .test().
function isIgnoredBySentry(error: Error): boolean {
  const candidates = [error.message, `${error.name}: ${error.message}`]
  return SENTRY_IGNORE_ERRORS.some((pattern) =>
    candidates.some((candidate) =>
      typeof pattern === 'string'
        ? candidate.includes(pattern)
        : (pattern as RegExp).test(candidate)
    )
  )
}

describe('SENTRY_IGNORE_ERRORS', () => {
  it('should not drop a TypeError with message "Failed to fetch"', () => {
    const supabaseConnectivityFailure = new TypeError('Failed to fetch')

    const isDropped = isIgnoredBySentry(supabaseConnectivityFailure)

    expect(isDropped).toBe(false)
  })

  it('should still drop a "ResizeObserver loop" error', () => {
    const browserNoise = new Error('ResizeObserver loop completed with undelivered notifications.')

    const isDropped = isIgnoredBySentry(browserNoise)

    expect(isDropped).toBe(true)
  })
})
