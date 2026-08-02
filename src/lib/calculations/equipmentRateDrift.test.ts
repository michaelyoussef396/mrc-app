// Equipment rates exist in three places and only one is canonical.
//
//   src/lib/calculations/pricing.ts        EQUIPMENT_RATES   <- canonical
//   supabase/functions/generate-job-report-pdf/index.ts      hand-copied
//   supabase/functions/generate-inspection-pdf/index.ts      hand-copied
//
// The Edge Functions run on Deno and cannot import from src/ — no shared package, no
// bundler path across the boundary — so both carry their own copy with a "keep in sync
// by hand" comment. Nothing enforced that, and drift there is invisible: it lands
// directly on a customer-facing PDF. It has happened before (a hardcoded $132/day
// dehumidifier survived in the inspection EF until a68710d, long after pricing.ts said
// $119).
//
// These tests are the enforcement. They read the EF sources as text and assert the
// literals equal EQUIPMENT_RATES.
//
// A failure here is NOT fixed by editing the EF alone — Edge Functions deploy
// separately from the frontend, so the EF must also be redeployed:
//   npx supabase functions deploy <name> --project-ref <ref>

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, it, expect } from 'vitest'

import { EQUIPMENT_RATES } from './pricing'

const JOB_EF = 'supabase/functions/generate-job-report-pdf/index.ts'
const INSPECTION_EF = 'supabase/functions/generate-inspection-pdf/index.ts'

const readEf = (relPath: string) => readFileSync(resolve(process.cwd(), relPath), 'utf8')

/**
 * Rate from a `['Label', qty, days, RATE],` tuple in the job EF's equipmentRows array.
 * Returns null when the tuple shape no longer matches, so a restructured EF fails the
 * "must be found" assertion rather than silently passing.
 */
function jobEfRate(source: string, label: string): number | null {
  const match = source.match(
    new RegExp(`\\['${label}',[^\\]]*?,\\s*(\\d+(?:\\.\\d+)?)\\s*\\]`)
  )
  return match ? Number(match[1]) : null
}

/**
 * EVERY `$NNN/day` rate in the named const of the inspection EF.
 *
 * Each price const is a ternary that repeats the rate in both branches:
 *   qty > 0 ? `$119/day × ${qty}` : '$119/day'
 * Matching only the first occurrence would let a drift confined to the qty=0 fallback
 * ship undetected, so this collects all of them and the caller asserts they agree.
 */
function inspectionEfRates(source: string, constName: string): number[] {
  const start = source.indexOf(`const ${constName}`)
  if (start === -1) return []
  // Declaration runs to the next top-level const, so a multi-line ternary is captured
  // whole without bleeding into the following one.
  const rest = source.slice(start + constName.length)
  const end = rest.indexOf('\n  const ')
  const decl = end === -1 ? rest : rest.slice(0, end)
  return [...decl.matchAll(/\$(\d+)\/day/g)].map((m) => Number(m[1]))
}

describe('generate-job-report-pdf equipment rates match EQUIPMENT_RATES', () => {
  const source = readEf(JOB_EF)

  it('should still declare the equipmentRows table this guard reads', () => {
    expect(source).toContain('const equipmentRows')
  })

  it('should charge the canonical dehumidifier rate', () => {
    expect(jobEfRate(source, 'Dehumidifier')).toBe(EQUIPMENT_RATES.dehumidifier)
  })

  it('should charge the canonical air mover rate', () => {
    expect(jobEfRate(source, 'Air Mover')).toBe(EQUIPMENT_RATES.airMover)
  })

  it('should charge the canonical HEPA Air Scrubber rate', () => {
    expect(jobEfRate(source, 'HEPA Air Scrubber')).toBe(EQUIPMENT_RATES.hepaAirScrubber)
  })

  it('should charge the canonical RCD rate', () => {
    expect(jobEfRate(source, 'RCD Box')).toBe(EQUIPMENT_RATES.rcd)
  })
})

describe('generate-inspection-pdf equipment rates match EQUIPMENT_RATES', () => {
  const source = readEf(INSPECTION_EF)

  // Every rate in the declaration, both ternary branches. An empty array fails too,
  // so a renamed const cannot pass silently.
  const expectAllRatesToBe = (constName: string, rate: number) => {
    const found = inspectionEfRates(source, constName)
    expect(found.length).toBeGreaterThan(0)
    expect(found).toEqual(found.map(() => rate))
  }

  it('should quote the canonical dehumidifier rate to the customer', () => {
    expectAllRatesToBe('dehumidifierPrice', EQUIPMENT_RATES.dehumidifier)
  })

  it('should quote the canonical air mover rate to the customer', () => {
    expectAllRatesToBe('airMoverPrice', EQUIPMENT_RATES.airMover)
  })

  it('should quote the canonical HEPA Air Scrubber rate to the customer', () => {
    expectAllRatesToBe('hepaPrice', EQUIPMENT_RATES.hepaAirScrubber)
  })

  it('should quote the canonical RCD rate to the customer', () => {
    expectAllRatesToBe('rcdBoxPrice', EQUIPMENT_RATES.rcd)
  })
})

describe('the $132 dehumidifier regression stays fixed', () => {
  it('should not quote $132/day anywhere in the inspection PDF Edge Function', () => {
    expect(readEf(INSPECTION_EF)).not.toContain('$132/day')
  })
})
