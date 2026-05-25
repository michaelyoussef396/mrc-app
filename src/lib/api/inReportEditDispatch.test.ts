import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the supabase client BEFORE importing the SUT so the SUT picks up the mock.
const updateMock = vi.fn()
const eqMock = vi.fn()
const fromMock = vi.fn()
const getSessionMock = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: () => getSessionMock() },
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

import {
  dispatchInReportEdit,
  IN_REPORT_FIELD_MAP,
} from './inReportEditDispatch'

const INSPECTION_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'

function mockSession(): void {
  getSessionMock.mockResolvedValue({
    data: { session: { user: { id: USER_ID } } as never },
    error: null,
  } as never)
}

function mockUpdateChain({ error = null } = {}): { capturedUpdate: { current: unknown } } {
  const capturedUpdate = { current: undefined as unknown }
  updateMock.mockImplementation((payload: unknown) => {
    capturedUpdate.current = payload
    return { eq: (...args: unknown[]) => eqMock(...args) }
  })
  eqMock.mockResolvedValue({ error })
  fromMock.mockReturnValue({ update: (p: unknown) => updateMock(p) })
  return { capturedUpdate }
}

function makeOpts(persistImpl?: (u: unknown) => Promise<void>) {
  return {
    persistManualEdit: vi.fn(persistImpl ?? (async () => undefined)),
  }
}

describe('IN_REPORT_FIELD_MAP', () => {
  it('covers exactly the 13 keys from ViewReportPDF.tsx:1365-1383', () => {
    const expectedKeys = [
      'cause_of_mould',
      'outdoor_temperature',
      'outdoor_humidity',
      'outdoor_dew_point',
      'outdoor_comments',
      'ai_summary',
      'labor_cost',
      'equipment_cost',
      'subtotal_ex_gst',
      'gst_amount',
      'total_inc_gst',
      'client_name',
      'property_address',
    ]
    expect(Object.keys(IN_REPORT_FIELD_MAP).sort()).toEqual(expectedKeys.sort())
  })

  it('marks every pricing/equipment field as read_only (13% cap guardrail)', () => {
    const pricingKeys = ['labor_cost', 'equipment_cost', 'subtotal_ex_gst', 'gst_amount', 'total_inc_gst']
    for (const key of pricingKeys) {
      expect(IN_REPORT_FIELD_MAP[key].writeStrategy).toBe('read_only')
    }
  })
})

describe('dispatchInReportEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- Unknown / default-deny ----------------------------------------------

  it('returns unknown-field error for a key not in the map', async () => {
    const result = await dispatchInReportEdit(INSPECTION_ID, 'not_a_real_key', '42', makeOpts())
    expect(result).toEqual({ success: false, error: 'Unknown field: not_a_real_key' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  // --- read_only refusal ---------------------------------------------------

  it('refuses total_inc_gst (read_only) and includes the label in the error', async () => {
    const result = await dispatchInReportEdit(INSPECTION_ID, 'total_inc_gst', 9999, makeOpts())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Total Cost (inc GST)')
    expect(result.error).toContain('read-only')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it.each(['labor_cost', 'equipment_cost', 'subtotal_ex_gst', 'gst_amount'])(
    'refuses pricing field %s with no DB call',
    async (key) => {
      const result = await dispatchInReportEdit(INSPECTION_ID, key, 1000, makeOpts())
      expect(result.success).toBe(false)
      expect(fromMock).not.toHaveBeenCalled()
    },
  )

  it('refuses client_name (B1 leads-deferred) with no DB call', async () => {
    const result = await dispatchInReportEdit(INSPECTION_ID, 'client_name', 'New Name', makeOpts())
    expect(result.success).toBe(false)
    expect(result.error).toContain('Client Name')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('refuses property_address (B1 leads-deferred) with no DB call', async () => {
    const result = await dispatchInReportEdit(INSPECTION_ID, 'property_address', 'New Address', makeOpts())
    expect(result.success).toBe(false)
    expect(fromMock).not.toHaveBeenCalled()
  })

  // --- Class A — inspections direct UPDATE ----------------------------------

  it('outdoor_dew_point UPDATEs inspections with the right column + audit metadata', async () => {
    mockSession()
    const { capturedUpdate } = mockUpdateChain()

    const result = await dispatchInReportEdit(INSPECTION_ID, 'outdoor_dew_point', 18.5, makeOpts())

    expect(result).toEqual({ success: true })
    expect(fromMock).toHaveBeenCalledWith('inspections')
    expect(eqMock).toHaveBeenCalledWith('id', INSPECTION_ID)
    const payload = capturedUpdate.current as Record<string, unknown>
    expect(payload.outdoor_dew_point).toBe(18.5)
    expect(payload.last_edited_by).toBe(USER_ID)
    expect(typeof payload.last_edited_at).toBe('string')
  })

  it('cause_of_mould (textarea) writes string value to inspections', async () => {
    mockSession()
    const { capturedUpdate } = mockUpdateChain()

    const result = await dispatchInReportEdit(INSPECTION_ID, 'cause_of_mould', 'Condensation from poor ventilation', makeOpts())

    expect(result).toEqual({ success: true })
    const payload = capturedUpdate.current as Record<string, unknown>
    expect(payload.cause_of_mould).toBe('Condensation from poor ventilation')
  })

  it('returns Not authenticated when no session is present (Class A)', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null } as never)
    mockUpdateChain()

    const result = await dispatchInReportEdit(INSPECTION_ID, 'outdoor_humidity', 60, makeOpts())

    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('propagates supabase error from the UPDATE (Class A)', async () => {
    mockSession()
    mockUpdateChain({ error: { message: 'permission denied for table inspections' } })

    const result = await dispatchInReportEdit(INSPECTION_ID, 'outdoor_temperature', 22, makeOpts())

    expect(result.success).toBe(false)
    expect(result.error).toContain('Save failed')
    expect(result.error).toContain('permission denied for table inspections')
  })

  // --- Class B — ai_summary_versions via callback --------------------------

  it('ai_summary calls persistManualEdit with the right version column, not supabase directly', async () => {
    const opts = makeOpts()
    const result = await dispatchInReportEdit(INSPECTION_ID, 'ai_summary', 'Updated summary text', opts)

    expect(result).toEqual({ success: true })
    expect(opts.persistManualEdit).toHaveBeenCalledTimes(1)
    expect(opts.persistManualEdit).toHaveBeenCalledWith({ ai_summary_text: 'Updated summary text' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('propagates persistManualEdit thrown error as a dispatch failure (Class B)', async () => {
    const opts = makeOpts(async () => {
      throw new Error('version insert failed: 23505 unique_violation after 3 attempts')
    })

    const result = await dispatchInReportEdit(INSPECTION_ID, 'ai_summary', 'text', opts)

    expect(result.success).toBe(false)
    expect(result.error).toContain('version insert failed')
  })
})
