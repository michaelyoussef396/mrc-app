// The booking sheet is what the technician works the job from, so its equipment
// heading must read the hire period the quote charged for, not the length of the
// labour schedule. Before the equipment-days stepper shipped the two figures could
// never disagree; an explicit hire period longer than the labour days makes them.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { INSPECTION_ROW } = vi.hoisted(() => ({
  // Four labour hours — one scheduled day — hired against an explicit four-day period.
  INSPECTION_ROW: {
    id: 'inspection-1',
    no_demolition_hours: 4,
    demolition_hours: 0,
    subfloor_hours: 0,
    commercial_dehumidifier_qty: 1,
    air_movers_qty: 0,
    rcd_box_qty: 0,
    equipment_days: 4,
    option_selected: 1,
    total_inc_gst: 2145.55,
    treatment_methods: ['Surface treatment'],
  },
}))

vi.mock('@/integrations/supabase/client', () => {
  // PostgREST returns only the selected columns, so a column the component never
  // asks for is absent here too — that is what makes this test fail on the select.
  const project = (row: Record<string, unknown>, columns: string) => {
    const wanted = columns.split(',').map((column) => column.trim())
    return Object.fromEntries(Object.entries(row).filter(([column]) => wanted.includes(column)))
  }

  const respondWith = (result: { data: unknown; error: null }) => {
    const builder: Record<string, unknown> = {
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    for (const method of ['eq', 'neq', 'order', 'limit']) {
      builder[method] = () => builder
    }
    return builder
  }

  return {
    supabase: {
      from: (table: string) => ({
        select: (columns: string) => {
          if (table === 'inspections') {
            return respondWith({ data: project(INSPECTION_ROW, columns), error: null })
          }
          if (table === 'leads') {
            return respondWith({ data: { assigned_to: null, job_scheduled_date: null }, error: null })
          }
          return respondWith({ data: [], error: null })
        },
      }),
    },
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, profile: { full_name: 'Admin User' } }),
}))

vi.mock('@/hooks/useTechnicians', () => ({
  useTechnicians: () => ({ data: [], error: null, isPending: false }),
}))

vi.mock('@/lib/bookingService', () => ({
  checkBookingConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
}))

vi.mock('@/lib/api/notifications', () => ({
  sendEmail: vi.fn(),
  buildJobBookingConfirmationHtml: vi.fn(),
}))

vi.mock('@/lib/api/fieldEditLog', () => ({ logFieldEdits: vi.fn(), logNoteAdded: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ captureBusinessError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { BookJobSheet } from '../BookJobSheet'

function renderBookingSheet() {
  return render(
    <BookJobSheet
      open
      onOpenChange={vi.fn()}
      leadId="lead-1"
      leadNumber="MRC-0001"
      customerName="Jane Citizen"
      propertyAddress="12 Example Street, Brunswick"
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookJobSheet — equipment hire period against a shorter labour schedule', () => {
  it('should render the quoted four-day hire period in the equipment heading', async () => {
    renderBookingSheet()

    expect(await screen.findByText('Equipment (× 4 days)')).toBeInTheDocument()
  })

  it('should schedule the four labour hours as a single day', async () => {
    renderBookingSheet()

    expect(await screen.findByText('1 consecutive day · 4 hours total')).toBeInTheDocument()
  })
})
