// R8 regression cover — the shared `updateLeadStatus` writer on Leads Management.
//
// Reactivate used to write `{ status: 'new_lead' }` alone, leaving assigned_to
// (and the rest of the booking-owned columns) populated. The lead then sat in
// the New Lead tab while the To Schedule rail — which requires
// `assigned_to IS NULL` for new_lead — could never list it. `clearBookingFields`
// is now opt-in, so the invariant runs in both directions:
//   - Reactivate is the only caller that walks a lead BACKWARDS past its
//     booking, so it must null every column in LEAD_BOOKING_FIELDS.
//   - Every other caller moves the lead forward or sideways and must keep
//     writing status ALONE — a stray null there would silently unbook a lead.
//
// NOT COVERED, and why: `markClosed` and `confirmRemoveLead` cannot be driven
// from the rendered page. `stageActions.markClosed` has no call site anywhere in
// the repo, and the Remove Lead modal that owns the `confirmRemoveLead` button
// is opened only by `stageActions.removeLead`, which also has no call site. Both
// take the same no-options branch of `updateLeadStatus` that the Approve test
// below pins, but their own wiring is unverified.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const recorder = vi.hoisted(() => ({
  leadUpdates: [] as Array<Record<string, unknown>>,
  leadRows: [] as Array<Record<string, unknown>>,
}))

// Network boundary only. The page, LeadCard, the status filter and
// buildBookingRevertUpdates all stay real — they are the wiring under test.
vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = (table: string) => {
    const methods: string[] = []
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        methods.push(method)
        if (table === 'leads' && method === 'update') {
          recorder.leadUpdates.push(args[0] as Record<string, unknown>)
        }
        return query
      }
    const query: Record<string, unknown> = {
      select: record('select'),
      insert: record('insert'),
      update: record('update'),
      eq: record('eq'),
      is: record('is'),
      in: record('in'),
      ilike: record('ilike'),
      order: record('order'),
      limit: record('limit'),
      range: record('range'),
      then: (onFulfilled: (value: unknown) => unknown) => {
        const isWrite = methods.includes('update') || methods.includes('insert')
        const data = table === 'leads' && !isWrite ? recorder.leadRows : []
        return Promise.resolve({ data, error: null }).then(onFulfilled)
      },
    }
    return query
  }

  return {
    supabase: {
      from: (table: string) => buildQuery(table),
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
      },
    },
  }
})

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, profile: { full_name: 'Admin User' } }),
}))

import LeadsManagement from '../LeadsManagement'
import { LEAD_BOOKING_FIELDS } from '@/lib/leadBookingFields'

const TECHNICIAN_ID = 'tech-ada'

// A lead parked at not_landed while still carrying its booking — the exact row
// shape that produced R8.
const NOT_LANDED_LEAD = {
  id: 'lead-not-landed',
  full_name: 'Nina Bramble',
  email: 'nina@example.com',
  phone: '0412345678',
  property_address_street: '12 Bell Street',
  property_address_suburb: 'Coburg',
  property_address_state: 'VIC',
  property_address_postcode: '3058',
  status: 'not_landed',
  lead_source: 'Website',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
  quoted_amount: null,
  issue_description: 'Mould on the bathroom ceiling',
  notes: null,
  lead_number: 'MRC-1001',
  inspection_scheduled_date: '2026-08-25',
  scheduled_time: '09:00',
  assigned_to: TECHNICIAN_ID,
  job_scheduled_date: null,
}

const AWAITING_APPROVAL_LEAD = {
  id: 'lead-approve-report',
  full_name: 'Owen Petrakis',
  email: 'owen@example.com',
  phone: '0433221100',
  property_address_street: '4 Hoddle Lane',
  property_address_suburb: 'Preston',
  property_address_state: 'VIC',
  property_address_postcode: '3072',
  status: 'approve_inspection_report',
  lead_source: 'Google',
  created_at: '2026-08-05T00:00:00.000Z',
  updated_at: '2026-08-21T00:00:00.000Z',
  quoted_amount: 1980,
  issue_description: 'Subfloor moisture',
  notes: null,
  lead_number: 'MRC-1002',
  inspection_scheduled_date: '2026-08-18',
  scheduled_time: '13:00',
  assigned_to: TECHNICIAN_ID,
  job_scheduled_date: null,
}

const allNulled = (fields: readonly string[]): Record<string, null> =>
  Object.fromEntries(fields.map((field) => [field, null]))

async function renderLeadsManagement() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LeadsManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText(NOT_LANDED_LEAD.full_name)
}

async function leadUpdatePayload(): Promise<Record<string, unknown>> {
  await waitFor(() => {
    if (recorder.leadUpdates.length === 0) throw new Error('no leads UPDATE recorded')
  })
  return recorder.leadUpdates[0]
}

beforeEach(() => {
  recorder.leadUpdates.length = 0
  recorder.leadRows.length = 0
  recorder.leadRows.push(NOT_LANDED_LEAD, AWAITING_APPROVAL_LEAD)
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            users: [{ id: TECHNICIAN_ID, full_name: 'Ada Nguyen' }],
          }),
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Reactivate', () => {
  it('should write status new_lead to the leads row when Reactivate is clicked', async () => {
    await renderLeadsManagement()

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }))

    expect((await leadUpdatePayload()).status).toBe('new_lead')
  })

  it('should null every booking-owned column when Reactivate is clicked', async () => {
    await renderLeadsManagement()

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }))

    expect(await leadUpdatePayload()).toEqual(
      expect.objectContaining(allNulled(LEAD_BOOKING_FIELDS)),
    )
  })
})

describe('Approve inspection report', () => {
  it('should write a payload of status alone when Approve is clicked', async () => {
    await renderLeadsManagement()

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(Object.keys(await leadUpdatePayload())).toEqual(['status'])
  })

  it('should write status inspection_email_approval when Approve is clicked', async () => {
    await renderLeadsManagement()

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect((await leadUpdatePayload()).status).toBe('inspection_email_approval')
  })
})
