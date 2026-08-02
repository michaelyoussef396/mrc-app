// job_number is assigned by the set_job_number trigger (JOB-YYYY-NNNN from
// job_number_seq), not by the client. Previously createJobCompletion stamped a
// Math.random() value into the insert; the trigger's `IF NEW.job_number IS NULL`
// guard means any client-supplied value silently wins, so the payload must stay
// clean or the sequence never engages.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// hoisted: vi.mock factories run before module-level consts are initialised.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
  addBusinessBreadcrumb: vi.fn(),
}))

import { createJobCompletion } from '../jobCompletions'

const LEAD_ROW = {
  full_name: 'Jane Citizen',
  property_address_street: '12 Test St',
  property_address_suburb: 'Richmond',
  property_address_postcode: '3121',
}

/** Captures the argument passed to .insert() on the job_completions table. */
let insertPayload: Record<string, unknown> | null = null

/** The row the mocked job_completions insert resolves with. */
let insertedRow: Record<string, unknown> = {}

function buildBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder

  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.insert = vi.fn((payload: Record<string, unknown>) => {
    if (table === 'job_completions') insertPayload = payload
    return builder
  })
  builder.single = vi.fn(async () => {
    if (table === 'leads') return { data: LEAD_ROW, error: null }
    return { data: insertedRow, error: null }
  })

  return builder
}

describe('createJobCompletion job_number', () => {
  beforeEach(() => {
    insertPayload = null
    insertedRow = { id: 'jc-1', job_number: 'JOB-2026-0001' }
    mockFrom.mockReset()
    mockFrom.mockImplementation((table: string) => buildBuilder(table))
  })

  it('should not send job_number in the insert payload', async () => {
    await createJobCompletion('lead-1', null, 'user-1')

    expect(insertPayload).not.toBeNull()
    expect(insertPayload).not.toHaveProperty('job_number')
  })

  it('should return the database-generated job number', async () => {
    const row = await createJobCompletion('lead-1', null, 'user-1')

    expect(row.job_number).toBe('JOB-2026-0001')
  })
})
