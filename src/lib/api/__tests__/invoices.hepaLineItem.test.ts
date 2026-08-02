// HEPA Air Scrubber must reach the customer's invoice at $100 per unit per day.
//
// The original AFD defect was that qty and days were captured on the job completion but
// no cost was ever emitted — customers were billed $0 for the equipment. This pins the
// billing end of that path by driving the real autoPopulateFromLead (invoices.ts:734),
// not a reimplementation of its arithmetic.
//
// Two things make this path easy to break silently:
//   1. The DB column is still actual_afd_* while the form/UI side is
//      actualHepaAirScrubber* — a bridge, so a rename on one side loses the value.
//   2. Equipment is never discounted, so the line must carry is_equipment: true.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))
vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
  addBusinessBreadcrumb: vi.fn(),
}))
vi.mock('@/lib/api/notifications', () => ({
  notifyInvoiceSent: vi.fn(),
  notifyPaymentReceived: vi.fn(),
}))

import { autoPopulateFromLead } from '../invoices'
import { EQUIPMENT_RATES } from '@/lib/calculations/pricing'
import { supabase } from '@/integrations/supabase/client'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'

const LEAD_ROW = {
  id: LEAD_ID,
  full_name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '0400 000 000',
  property_address_street: '12 Test St',
  property_address_suburb: 'Richmond',
  property_address_state: 'VIC',
  property_address_postcode: '3121',
}

/** 2 HEPA units × 3 days, nothing else, so the HEPA line is unambiguous. */
const JOB_COMPLETION_ROW = {
  id: '22222222-2222-2222-2222-222222222222',
  actual_dehumidifier_qty: 0,
  actual_dehumidifier_days: 0,
  actual_air_mover_qty: 0,
  actual_air_mover_days: 0,
  actual_afd_qty: 2,
  actual_afd_days: 3,
  actual_rcd_qty: 0,
  actual_rcd_days: 0,
  actual_waste_disposal_m3: null,
  actual_waste_disposal_cost: null,
}

/** Routes .from(table) to a chainable builder resolving that table's row. */
function mockTables(rows: Record<string, unknown>) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const result = { data: rows[table] ?? null, error: null }
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    builder.select = vi.fn(chain)
    builder.eq = vi.fn(chain)
    builder.is = vi.fn(chain)
    builder.order = vi.fn(chain)
    builder.limit = vi.fn(chain)
    builder.single = vi.fn(async () => result)
    builder.maybeSingle = vi.fn(async () => result)
    return builder as never
  })
}

const hepaLine = async () => {
  const input = await autoPopulateFromLead(LEAD_ID)
  return input.line_items.find((li) => li.description.includes('HEPA'))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTables({
    leads: LEAD_ROW,
    job_completions: JOB_COMPLETION_ROW,
    inspections: null,
  })
})

describe('autoPopulateFromLead HEPA Air Scrubber billing', () => {
  it('should emit a line item for the HEPA Air Scrubber', async () => {
    expect(await hepaLine()).toBeDefined()
  })

  it('should price the HEPA Air Scrubber at the canonical rate', async () => {
    expect((await hepaLine())?.unit_price).toBe(EQUIPMENT_RATES.hepaAirScrubber)
  })

  it('should bill 2 units over 3 days as 6 unit-days', async () => {
    expect((await hepaLine())?.quantity).toBe(6)
  })

  it('should total 2 units × 3 days at $600 ex GST', async () => {
    expect((await hepaLine())?.total).toBe(600)
  })

  it('should label the line for the customer as HEPA Air Scrubber, not AFD', async () => {
    expect((await hepaLine())?.description).toBe('HEPA Air Scrubber (2 units × 3 days)')
  })

  it('should mark the line as equipment so it is never discounted', async () => {
    expect((await hepaLine())?.is_equipment).toBe(true)
  })

  it('should emit no HEPA line when the job recorded no scrubber', async () => {
    mockTables({
      leads: LEAD_ROW,
      job_completions: { ...JOB_COMPLETION_ROW, actual_afd_qty: 0, actual_afd_days: 0 },
      inspections: null,
    })
    expect(await hepaLine()).toBeUndefined()
  })
})
