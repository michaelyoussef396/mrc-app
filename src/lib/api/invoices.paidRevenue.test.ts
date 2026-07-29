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

// Re-import after mock so the SUT picks up the mocked client.
import { getPaidInvoices, sumPaidRevenue, sumPaidRevenueFor, PaidInvoice } from './invoices'
import { supabase } from '@/integrations/supabase/client'

// The invoices table is emptied by docs/INVOICE_INTEGRITY_RUNBOOK.md — none of the
// four historical rows was a real customer invoice. Every revenue figure on
// Reports and the Technician surfaces therefore aggregates over ZERO rows. These
// tests pin that the answer is 0, never NaN, undefined or a thrown error.

const TECH = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e'

/** Mocks the .from().select().eq().gte().lte() chain getPaidInvoices builds. */
function mockInvoiceQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue(result),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as never)
  return chain
}

const FROM = new Date('2026-07-01T00:00:00+10:00')
const TO = new Date('2026-07-31T23:59:59+10:00')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPaidInvoices with an empty invoices table', () => {
  it('should return an empty array rather than undefined', async () => {
    mockInvoiceQuery({ data: [], error: null })
    await expect(getPaidInvoices(FROM, TO)).resolves.toEqual([])
  })

  it('should return an empty array when PostgREST returns a null body', async () => {
    mockInvoiceQuery({ data: null, error: null })
    await expect(getPaidInvoices(FROM, TO)).resolves.toEqual([])
  })

  it('should throw a described error rather than resolve undefined on query failure', async () => {
    mockInvoiceQuery({ data: null, error: { message: 'boom' } })
    await expect(getPaidInvoices(FROM, TO)).rejects.toThrow('Failed to fetch paid invoices: boom')
  })
})

describe('sumPaidRevenue over zero invoices', () => {
  it('should total zero', () => {
    expect(sumPaidRevenue([])).toBe(0)
  })

  it('should return a finite number, not NaN', () => {
    expect(Number.isFinite(sumPaidRevenue([]))).toBe(true)
  })

  it('should format as a currency string rather than "$NaN"', () => {
    const rendered = new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(sumPaidRevenue([]))
    expect(rendered).toBe('$0')
  })
})

describe('sumPaidRevenueFor over zero invoices', () => {
  it('should credit a technician zero when there are no invoices at all', () => {
    expect(sumPaidRevenueFor([], TECH)).toBe(0)
  })

  it('should return a finite number, not NaN', () => {
    expect(Number.isFinite(sumPaidRevenueFor([], TECH))).toBe(true)
  })
})

describe('sumPaidRevenueFor when invoices exist but none belong to the technician', () => {
  const invoices: PaidInvoice[] = [
    { id: 'a', totalAmount: 1200, paidAt: '2026-07-05T02:00:00Z', technicianId: 'someone-else' },
    { id: 'b', totalAmount: 800, paidAt: '2026-07-06T02:00:00Z', technicianId: null },
  ]

  it('should credit the technician zero', () => {
    expect(sumPaidRevenueFor(invoices, TECH)).toBe(0)
  })

  // An invoice traceable to neither a job completion nor an assigned lead must
  // still reach the org total — the top line cannot under-report collected cash.
  it('should still count an unattributed invoice in the org total', () => {
    expect(sumPaidRevenue(invoices)).toBe(2000)
  })

  it('should not credit an unattributed invoice to any technician', () => {
    expect(sumPaidRevenueFor(invoices, 'someone-else')).toBe(1200)
  })
})

describe('getPaidInvoices coercion', () => {
  it('should coerce a null total_amount to zero rather than NaN', async () => {
    mockInvoiceQuery({
      data: [{ id: 'x', total_amount: null, paid_at: '2026-07-05T02:00:00Z', job_completion: null, lead: null }],
      error: null,
    })
    const rows = await getPaidInvoices(FROM, TO)
    expect(rows[0].totalAmount).toBe(0)
  })

  it('should coerce a string total_amount to a number', async () => {
    mockInvoiceQuery({
      data: [{ id: 'x', total_amount: '11029.77', paid_at: '2026-07-05T02:00:00Z', job_completion: null, lead: null }],
      error: null,
    })
    const rows = await getPaidInvoices(FROM, TO)
    expect(rows[0].totalAmount).toBe(11029.77)
  })

  it('should prefer the job completion technician over the assigned lead owner', async () => {
    mockInvoiceQuery({
      data: [{
        id: 'x', total_amount: 100, paid_at: '2026-07-05T02:00:00Z',
        job_completion: { completed_by: TECH }, lead: { assigned_to: 'someone-else' },
      }],
      error: null,
    })
    const rows = await getPaidInvoices(FROM, TO)
    expect(rows[0].technicianId).toBe(TECH)
  })

  it('should fall back to the assigned lead owner when there is no job completion', async () => {
    mockInvoiceQuery({
      data: [{
        id: 'x', total_amount: 100, paid_at: '2026-07-05T02:00:00Z',
        job_completion: null, lead: { assigned_to: TECH },
      }],
      error: null,
    })
    const rows = await getPaidInvoices(FROM, TO)
    expect(rows[0].technicianId).toBe(TECH)
  })

  it('should report no technician when neither link exists', async () => {
    mockInvoiceQuery({
      data: [{
        id: 'x', total_amount: 100, paid_at: '2026-07-05T02:00:00Z',
        job_completion: null, lead: { assigned_to: null },
      }],
      error: null,
    })
    const rows = await getPaidInvoices(FROM, TO)
    expect(rows[0].technicianId).toBeNull()
  })
})
