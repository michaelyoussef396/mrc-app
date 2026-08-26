// calculate-travel-time used to answer with a number no matter what. A 30-minute
// stand-in when Google didn't reply (check_availability), a second hidden 30 in the day
// ranking (get_recommended_dates), a zero when a technician had no starting address, and
// another zero on the override path. All four shipped as HTTP 200 with nothing marking
// them as invented, and an admin booked against them.
//
// The Edge Function's own discriminated union is the primary guard: under `deno check`,
// putting a number where the unknown-travel response declares `null` is a compile error.
// These tests are the second line — they catch what a type cannot:
//
//   * `deno check` is not run by any npm script, any git hook, or any CI (there is no
//     CI in this repo), so nothing forces it before a merge. `npx vitest run` is.
//   * Edge Functions cannot be imported here at all — index.ts uses jsr: and
//     https://esm.sh specifiers and calls Deno.serve — so the source is read as text,
//     the same approach as src/lib/calculations/equipmentRateDrift.test.ts.
//
// Comments are stripped before asserting. The code comments in index.ts deliberately
// quote the fabrications they replaced ("`let travelTimeMinutes = 30` used to open this
// block"), which is exactly the documentation a future reader needs — and it would make
// a naive text search fail. A guard that prose can defeat is not a guard.
//
// A failure here is NOT fixed by editing the Edge Function alone. Edge Functions deploy
// separately from the frontend:
//   npx supabase functions deploy calculate-travel-time --project-ref <ref>

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, it, expect } from 'vitest'

const EF_PATH = 'supabase/functions/calculate-travel-time/index.ts'

const rawSource = readFileSync(resolve(process.cwd(), EF_PATH), 'utf8')

/**
 * Strip block comments and line comments, leaving code. The `(?<!:)` guard keeps the
 * `//` in `https://maps.googleapis.com` from being treated as a comment start.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (line.trim().startsWith('//') ? '' : line.replace(/(?<!:)\/\/.*$/, '')))
    .join('\n')
}

const code = stripComments(rawSource)

/** Every right-hand side assigned to `field:` in the executable source. */
function assignedValues(field: string): string[] {
  return [...code.matchAll(new RegExp(`${field}:\\s*([^,\\n]+)`, 'g'))].map((m) => m[1].trim())
}

describe('no fabricated travel figures', () => {
  it('should never assign a numeric literal to travel_time_minutes', () => {
    const permitted = new Set([
      'number | null',
      'number',
      'null',
      'travelTimeMinutes',
      'usedOverrideAddress ? null : travelTimeMinutes',
      'apiResult.duration_minutes',
      'estimateTravelMinutes(dist)',
    ])
    const found = assignedValues('travel_time_minutes')

    expect(found.filter((value) => !permitted.has(value))).toEqual([])
  })

  it('should actually find travel_time_minutes assignments to check', () => {
    expect(assignedValues('travel_time_minutes').length).toBeGreaterThan(0)
  })

  it('should never assign a numeric literal to buffer_minutes', () => {
    const permitted = new Set(['number', 'null', 'bufferMinutes'])

    expect(assignedValues('buffer_minutes').filter((v) => !permitted.has(v))).toEqual([])
  })

  it('should never assign a numeric literal to travel_distance_km', () => {
    const permitted = new Set(['number', 'null', 'travelDistanceKm'])

    expect(assignedValues('travel_distance_km').filter((v) => !permitted.has(v))).toEqual([])
  })

  it('should not seed a travel time variable with a number', () => {
    expect(code).not.toMatch(/travelTimeMinutes\s*=\s*\d/)
  })

  it('should not reintroduce the hidden 30-minute penalty in day ranking', () => {
    expect(code).not.toMatch(/travelFromHomeMinutes\s*\|\|/)
  })

  it('should not emit a hardcoded earliest_start', () => {
    expect(code).not.toMatch(/earliest_start:\s*['"]/)
  })

  it('should not build a suggestion list from an assumed business-hours start', () => {
    expect(code).not.toContain('generateSuggestions(8 * 60')
  })
})

describe('provenance is stated on every travel-carrying path', () => {
  it('should declare a google_api source on the measured availability response', () => {
    expect(code).toContain("source: 'google_api'")
  })

  it('should declare an unavailable source when the mapping service does not answer', () => {
    expect(code).toContain("source: 'unavailable'")
  })

  it('should declare a no_origin source when there is no starting address', () => {
    expect(code).toContain("source: 'no_origin'")
  })

  it('should claim haversine only on the two branches that actually estimate', () => {
    expect(code.match(/source: 'haversine'/g)).toHaveLength(2)
  })

  it('should carry travel_from_home_source through both interfaces and both emit sites', () => {
    expect(code.match(/travel_from_home_source/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
  })
})

describe('back-compat with a frontend that predates the source field', () => {
  it('should keep the no_starting_address flag the booking hook still gates on', () => {
    expect(code).toContain("error: 'no_starting_address'")
  })
})

describe('failure reporting', () => {
  it('should import the shared reporter', () => {
    expect(code).toContain("from '../_shared/errorReporting.ts'")
  })

  it('should report from every Maps failure point', () => {
    expect(code.match(/reportEdgeErrorInBackground\(/g)?.length ?? 0).toBeGreaterThanOrEqual(7)
  })

  it('should pass Google\'s own error_message through verbatim', () => {
    expect(code).toMatch(/google_error_message:\s*data\.error_message/)
  })

  it('should never block the response path on a report', () => {
    expect(code).not.toMatch(/await\s+reportEdgeError\(/)
  })
})
