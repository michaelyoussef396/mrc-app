// Save re-entrancy cover for the inspection form.
//
// handleSave reads `currentInspectionId` out of its render closure and nothing is
// awaited before the INSERT, so every save entered before the creating save's
// setState commits used to see null and mint its own `inspections` row. The child
// writes then split across those rows — observed in production as one inspection
// holding the areas, another holding the photos, the AI summary and the PDF.
//
// The header save button is the unguarded entry point: unlike the footer button it
// carries no `disabled={isSaving}`, so three taps inside the create window all reach
// handleSave. Both tests drive that button.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const recorder = vi.hoisted(() => ({
  inspectionInserts: [] as Array<Record<string, unknown>>,
  areaWriteInspectionIds: [] as unknown[],
  createdInspectionCount: 0,
}))

// Network boundary only. The page, handleSave and every child-write branch stay
// real — that wiring is what is under test.
vi.mock('@/integrations/supabase/client', () => {
  const LEAD = {
    id: 'lead-1',
    full_name: 'Test Customer',
    phone: '0400000000',
    email: 'customer@example.com',
    property_address_street: '1 Test Street',
    property_address_suburb: 'Coburg',
    property_address_state: 'VIC',
    property_address_postcode: '3058',
    property_lat: null,
    property_lng: null,
    issue_description: 'Mould in bathroom',
    internal_notes: null,
    status: 'inspection_booked',
  }

  const buildQuery = (table: string) => {
    const methods: string[] = []
    let payload: Record<string, unknown> = {}

    const record =
      (method: string) =>
      (...args: unknown[]) => {
        methods.push(method)
        if (method === 'insert' || method === 'update') {
          payload = (args[0] ?? {}) as Record<string, unknown>
          if (table === 'inspections' && method === 'insert') {
            recorder.inspectionInserts.push(payload)
          }
          if (table === 'inspection_areas') {
            recorder.areaWriteInspectionIds.push(payload.inspection_id)
          }
        }
        return query
      }

    const resolve = (): Promise<{ data: unknown; error: null }> => {
      const isSingle = methods.includes('single') || methods.includes('maybeSingle')

      if (table === 'inspections' && methods.includes('insert')) {
        recorder.createdInspectionCount += 1
        const id = `inspection-${recorder.createdInspectionCount}`
        // Resolve on a macrotask so the create window unambiguously spans the
        // later taps — the bug needs them to arrive while the INSERT is in flight.
        return new Promise((done) =>
          setTimeout(() => done({ data: { id, job_number: `JOB-${id}` }, error: null }), 0)
        )
      }
      if (table === 'subfloor_data' && methods.includes('insert')) {
        return Promise.resolve({ data: { id: 'subfloor-1' }, error: null })
      }
      if (table === 'leads') {
        return Promise.resolve({ data: LEAD, error: null })
      }
      return Promise.resolve({ data: isSingle ? null : [], error: null })
    }

    const query: Record<string, unknown> = {
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        resolve().then(onFulfilled, onRejected),
    }
    for (const method of [
      'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'is', 'in',
      'not', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'maybeSingle',
    ]) {
      query[method] = record(method)
    }
    return query
  }

  return {
    supabase: {
      from: (table: string) => buildQuery(table),
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
  }
})

// These identities must be stable across renders: the mount fetch effect lists
// `toast` in its dependency array and the inspector-name effect lists `user`, so a
// fresh object per render re-fires them forever and the form never settles.
const stable = vi.hoisted(() => ({
  toast: vi.fn(),
  auth: { user: { id: 'tech-1' }, profile: { full_name: 'Test Tech' } },
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => stable.auth }))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: stable.toast }),
  toast: stable.toast,
}))

vi.mock('@/lib/utils/photoUpload', () => ({
  uploadInspectionPhoto: vi.fn(),
  deleteInspectionPhoto: vi.fn(),
  loadInspectionPhotos: vi.fn().mockResolvedValue([]),
}))

import TechnicianInspectionForm from '../TechnicianInspectionForm'

async function renderFormAndTapSaveThreeTimes() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/technician/inspection?leadId=lead-1']}>
        <TechnicianInspectionForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  // The header renders only once the mount fetch clears the loading gate. Its two
  // buttons are back and save, in that order; the save icon carries no accessible
  // name, so it is addressed positionally rather than by label.
  const header = await screen.findByRole('banner')
  const saveButton = within(header).getAllByRole('button')[1]

  // Three taps in one tick — the window in which no setState has committed yet.
  await act(async () => {
    saveButton.click()
    saveButton.click()
    saveButton.click()
  })

  await waitFor(() => {
    if (recorder.areaWriteInspectionIds.length < 3) throw new Error('saves still in flight')
  })
}

beforeEach(() => {
  recorder.inspectionInserts.length = 0
  recorder.areaWriteInspectionIds.length = 0
  recorder.createdInspectionCount = 0
})

describe('handleSave re-entrancy during the create window', () => {
  it('should insert exactly one inspection when three saves are dispatched before the first resolves', async () => {
    await renderFormAndTapSaveThreeTimes()

    expect(recorder.inspectionInserts).toHaveLength(1)
  })

  it('should bind every area write to a single inspection id when three saves are dispatched before the first resolves', async () => {
    await renderFormAndTapSaveThreeTimes()

    expect(new Set(recorder.areaWriteInspectionIds)).toEqual(new Set(['inspection-1']))
  })
})
