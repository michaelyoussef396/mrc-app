// The inspection report IS the quote the customer receives. Three of its four equipment
// lines printed a daily rate and a quantity with no hire period, so the customer could not
// compute the equipment total from their own quote — while the invoice later bills off the
// actual days recorded at job completion. These assertions pin the hire period onto all
// four lines, and pin it to the days AS ENTERED: the quote never substitutes a day count
// nobody quoted, so HEPA takes no fallback to equipment_days the way jobCompletions does.
//
// The Edge Function runs on Deno and imports from esm.sh at module scope, so it cannot be
// imported here — equipmentRateDrift.test.ts guards the same file the same way and its
// header explains the boundary. Rather than re-implement the four expressions, this lifts
// the pricing block out of the shipped source, compiles it and runs it, so a change to the
// Edge Function changes these results.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ts from 'typescript'
import { describe, it, expect } from 'vitest'

const INSPECTION_EF = 'supabase/functions/generate-inspection-pdf/index.ts'
const BLOCK_START = '  // Equipment pricing — literals must match EQUIPMENT_RATES'
const BLOCK_END_ANCHOR = '  const hepaPrice'

interface EquipmentRow {
  commercial_dehumidifier_qty: number
  air_movers_qty: number
  rcd_box_qty: number
  hepa_air_scrubber_qty: number | null
  hepa_air_scrubber_days: number | null
  equipment_days: number | null
}

interface EquipmentPrices {
  dehumidifierPrice: string
  airMoverPrice: string
  rcdBoxPrice: string
  hepaPrice: string
}

function equipmentPricingBlock(): string {
  const source = readFileSync(resolve(process.cwd(), INSPECTION_EF), 'utf8')
  const start = source.indexOf(BLOCK_START)
  const anchor = start === -1 ? -1 : source.indexOf(BLOCK_END_ANCHOR, start)
  const end = anchor === -1 ? -1 : source.indexOf('\n\n', anchor)
  if (end === -1) {
    throw new Error(`${INSPECTION_EF} no longer declares the equipment pricing block this reads`)
  }
  return source.slice(start, end)
}

const PRICING_JS = ts.transpileModule(equipmentPricingBlock(), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText

const priceLines = (inspection: EquipmentRow): EquipmentPrices =>
  new Function(
    'inspection',
    `${PRICING_JS}\nreturn { dehumidifierPrice, airMoverPrice, rcdBoxPrice, hepaPrice }`
  )(inspection) as EquipmentPrices

// Every equipment type on the quote, hired for six days.
const QUOTED: EquipmentRow = {
  commercial_dehumidifier_qty: 2,
  air_movers_qty: 4,
  rcd_box_qty: 1,
  hepa_air_scrubber_qty: 3,
  hepa_air_scrubber_days: 6,
  equipment_days: 6,
}

describe('the inspection quote prints the hire period on every equipment line', () => {
  it('should print the hire period on the dehumidifier line', () => {
    expect(priceLines(QUOTED).dehumidifierPrice).toBe('$119/day × 2 (6 days)')
  })

  it('should print the hire period on the air mover line', () => {
    expect(priceLines(QUOTED).airMoverPrice).toBe('$46/day × 4 (6 days)')
  })

  it('should print the hire period on the RCD line', () => {
    expect(priceLines(QUOTED).rcdBoxPrice).toBe('$5/day × 1 (6 days)')
  })

  it('should print the hire period on the HEPA line', () => {
    expect(priceLines(QUOTED).hepaPrice).toBe('$100/day × 3 (6 days)')
  })
})

describe('a hire period the quote does not carry prints nothing', () => {
  const noDays = { ...QUOTED, equipment_days: null }
  const zeroDays = { ...QUOTED, equipment_days: 0 }

  it('should print no period on the dehumidifier line when equipment_days is null', () => {
    expect(priceLines(noDays).dehumidifierPrice).toBe('$119/day × 2')
  })

  it('should print no period on the air mover line when equipment_days is null', () => {
    expect(priceLines(noDays).airMoverPrice).toBe('$46/day × 4')
  })

  it('should print no period on the RCD line when equipment_days is null', () => {
    expect(priceLines(noDays).rcdBoxPrice).toBe('$5/day × 1')
  })

  it('should print no period on the dehumidifier line when equipment_days is zero', () => {
    expect(priceLines(zeroDays).dehumidifierPrice).toBe('$119/day × 2')
  })

  it('should not fall back to equipment_days when the HEPA day count is null', () => {
    expect(priceLines({ ...QUOTED, hepa_air_scrubber_days: null }).hepaPrice).toBe('$100/day × 3')
  })

  it('should not fall back to equipment_days when the HEPA day count is zero', () => {
    expect(priceLines({ ...QUOTED, hepa_air_scrubber_days: 0 }).hepaPrice).toBe('$100/day × 3')
  })
})
