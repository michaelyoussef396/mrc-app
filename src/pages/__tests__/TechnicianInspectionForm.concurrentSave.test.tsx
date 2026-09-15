// Regression adapted from the unchanged 9 Sep diagnostic, shown failing first.
// Codex adversarial-review finding, thread 01a08579-16c2-7620-ae38-9885de181c4d:
//   "Coalesced saves can delete a newer save's areas."
// Reproduction exactly as Codex specified it:
//   start save A with areas [a], hold its INSERT response
//   add area b, start save B with [a,b]
//   resolve creation, delay A's inspection_areas SELECT
//   let B finish persisting both
//   release A's SELECT returning [a,b]
//   assert b is still persisted after both saves complete
// The supabase mock is STATEFUL: inspection_areas rows really are inserted and
// really are deleted, so a destructive reconciliation is observable.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const db = vi.hoisted(() => ({
  areaRows: [] as Array<{ id: string; inspection_id: string }>,
  inspectionInserts: 0,
  areaWrites: [] as Array<{ inspection_id: unknown; area_name: unknown }>,
  areaSelects: 0,
  deletedIds: [] as string[],
  insertOrder: [] as string[],
  openCreateGate: () => {},
  createGate: Promise.resolve(),
  openFirstAreaSelect: () => {},
  firstAreaSelectGate: Promise.resolve(),
}))

vi.mock('@/integrations/supabase/client', () => {
  const LEAD = {
    id: 'lead-1', full_name: 'Test Customer', phone: '0400000000',
    email: 'customer@example.com', property_address_street: '1 Test Street',
    property_address_suburb: 'Coburg', property_address_state: 'VIC',
    property_address_postcode: '3058', property_lat: null, property_lng: null,
    issue_description: 'Mould in bathroom', internal_notes: null, status: 'inspection_booked',
  }

  const buildQuery = (table: string) => {
    const methods: string[] = []
    let payload: Record<string, unknown> = {}
    let inIds: string[] = []
    let columns = ''

    const record =
      (method: string) =>
      (...args: unknown[]) => {
        methods.push(method)
        if (method === 'insert' || method === 'update') payload = (args[0] ?? {}) as Record<string, unknown>
        if (method === 'select') columns = String(args[0])
        if (method === 'in') inIds = (args[1] ?? []) as string[]
        return query
      }

    const resolve = async (): Promise<{ data: unknown; error: null }> => {
      if (table === 'inspections' && methods.includes('insert')) {
        await db.createGate
        db.inspectionInserts += 1
        return { data: { id: 'inspection-1', job_number: 'JOB-1' }, error: null }
      }
      if (table === 'inspection_areas') {
        if (methods.includes('insert') || methods.includes('update')) {
          db.areaWrites.push({ inspection_id: payload.inspection_id, area_name: payload.area_name })
        }
        if (methods.includes('delete')) {
          db.deletedIds.push(...inIds)
          db.areaRows = db.areaRows.filter((r) => !inIds.includes(r.id))
          return { data: null, error: null }
        }
        if (methods.includes('insert')) {
          const newId = payload.id as string
          if (!db.insertOrder.includes(newId)) db.insertOrder.push(newId)
          db.areaRows.push({ id: newId, inspection_id: payload.inspection_id as string })
          return { data: null, error: null }
        }
        if (methods.includes('update')) return { data: null, error: null }
        // Gate reconciliation only; UPDATE also reads '*' for its audit snapshot.
        if (columns === 'id') {
          db.areaSelects += 1
          if (db.areaSelects === 1) await db.firstAreaSelectGate
        }
        return { data: db.areaRows.map((r) => ({ id: r.id })), error: null }
      }
      if (table === 'leads') return { data: LEAD, error: null }
      if (table === 'subfloor_data' && methods.includes('insert')) {
        return { data: { id: 'subfloor-1' }, error: null }
      }
      const isSingle = methods.includes('single') || methods.includes('maybeSingle')
      return { data: isSingle ? null : [], error: null }
    }

    const query: Record<string, unknown> = {
      then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => resolve().then(ok, err),
    }
    for (const m of [
      'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'is', 'in',
      'not', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'maybeSingle',
    ]) query[m] = record(m)
    return query
  }

  return {
    supabase: {
      from: (t: string) => buildQuery(t),
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
  }
})

const stable = vi.hoisted(() => ({
  toast: vi.fn(),
  auth: { user: { id: 'tech-1' }, profile: { full_name: 'Test Tech' } },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => stable.auth }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: stable.toast }), toast: stable.toast }))
vi.mock('@/lib/utils/photoUpload', () => ({
  uploadInspectionPhoto: vi.fn(), deleteInspectionPhoto: vi.fn(),
  loadInspectionPhotos: vi.fn().mockResolvedValue([]),
}))

import TechnicianInspectionForm from '../TechnicianInspectionForm'

beforeEach(() => {
  stable.toast.mockClear()
  db.areaWrites = []
  db.areaRows = []
  db.inspectionInserts = 0
  db.areaSelects = 0
  db.deletedIds = []
  db.insertOrder = []
  db.createGate = new Promise<void>((r) => { db.openCreateGate = r })
  db.firstAreaSelectGate = new Promise<void>((r) => { db.openFirstAreaSelect = r })
})

async function renderAreaForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/technician/inspection?leadId=lead-1']}>
        <TechnicianInspectionForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  const header = await screen.findByRole('banner')
  const saveButton = within(header).getAllByRole('button')[1]

  // Reach Section 3, where areas can be added. handleAddArea does not set
  // hasUnsavedChanges and the mount fetch never does either, so navigating
  // fires no save of its own.
  await act(async () => { screen.getByRole('button', { name: /Next Section/ }).click() })
  await act(async () => { screen.getByRole('button', { name: /Next Section/ }).click() })
  await screen.findByRole('button', { name: /Add Another Area/ })
  return saveButton
}

const savedCount = () => stable.toast.mock.calls.filter(([value]) => value.title === 'Saved').length

async function saveThreePayloads() {
  const saveButton = await renderAreaForm()
  // Different render snapshots, all invoked while the first INSERT is pending.
  for (const name of ['first', 'second', 'third']) {
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('e.g., Master Bedroom, Kitchen...'), { target: { value: name } })
    })
    await act(async () => { saveButton.click() })
  }
  await act(async () => { db.openCreateGate(); db.openFirstAreaSelect() })
  await waitFor(() => expect(savedCount()).toBe(3))
}

describe('handleSave re-entrancy during the create window', () => {
  it('should insert exactly one inspection when three saves are dispatched before the first resolves', async () => {
    await saveThreePayloads()
    expect(db.inspectionInserts).toBe(1)
  })
  it('should bind every area write to a single inspection id when three saves are dispatched before the first resolves', async () => {
    await saveThreePayloads()
    expect(new Set(db.areaWrites.map((row) => row.inspection_id))).toEqual(new Set(['inspection-1']))
    expect(db.areaWrites.map((row) => row.area_name)).toEqual(['first', 'second', 'third'])
  })
})

describe('stale-snapshot delete across saves', () => {
  it.each(['CREATE', 'UPDATE'])('%s keeps the area added between two saves', async (path) => {
    const saveButton = await renderAreaForm()
    if (path === 'UPDATE') {
      // Establish the inspection before racing two UPDATE saves.
      db.openCreateGate()
      db.openFirstAreaSelect()
      await act(async () => { saveButton.click() })
      await waitFor(() => expect(savedCount()).toBe(1))
      stable.toast.mockClear()
      db.areaWrites = []
      db.areaSelects = 0
      db.firstAreaSelectGate = new Promise<void>((r) => { db.openFirstAreaSelect = r })
    }

    // Save A: areas = [a]. Hold creation (CREATE) or reconciliation (UPDATE).
    await act(async () => { saveButton.click() })

    // Add area b while A is still in flight.
    await act(async () => { screen.getByRole('button', { name: /Add Another Area/ }).click() })

    // Save B: areas = [a, b]. Must retain this payload until A finishes.
    await act(async () => { saveButton.click() })

    // Resolve creation. A resumes first and blocks on its gated areas SELECT;
    // B runs on and persists both areas.
    await act(async () => {
      db.openCreateGate()
      await new Promise((r) => setTimeout(r, 50))
    })

    const persistedAfterB = db.areaRows.length

    // Release A's SELECT — it now sees [a, b] but its own closure holds only [a].
    await act(async () => {
      db.openFirstAreaSelect()
      await new Promise((r) => setTimeout(r, 50))
    })

    await waitFor(() => {
      expect(db.areaSelects).toBe(2)
      expect(savedCount()).toBe(2)
    })

    // eslint-disable-next-line no-console
    const secondAreaId = db.insertOrder[1]
    console.log('DIAG inserts=%d areaSelects=%d persistedAfterB=%d finalRows=%d',
      db.inspectionInserts, db.areaSelects, persistedAfterB, db.areaRows.length)
    console.log('DIAG insertOrder=%o', db.insertOrder)
    console.log('DIAG deleted=%o', db.deletedIds)
    console.log('DIAG survivors=%o', db.areaRows.map((r) => r.id))
    console.log('DIAG deleted-is-the-newly-added-area=%s', db.deletedIds.includes(secondAreaId))

    expect(db.areaRows).toHaveLength(2)
    expect(db.inspectionInserts).toBe(1)
    expect(db.deletedIds).not.toContain(secondAreaId)
    expect(db.areaRows.map((r) => r.id)).toContain(secondAreaId)
    expect(db.areaWrites).toHaveLength(3) // A's one area, then B's two: neither payload dropped.
  })
})
