// The tile exists to break a silence: two inspections stalled on 7 Sep and no
// surface said so for two days. A tile that renders 0 when the read FAILED
// reproduces that exact defect — "nothing is wrong" and "I could not check"
// must never look the same.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

import { StalledInspectionsCard } from '../StalledInspectionsCard'

/** Stands in for the PostgREST builder chain the hook calls. */
function respondWith(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  mockFrom.mockReturnValue(builder)
}

/** Untouched for well over STALLED_AFTER_HOURS, so the predicate selects it. */
function stalledRow(leadNumber: string) {
  return {
    id: `inspection-${leadNumber}`,
    pdf_url: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    leads: { lead_number: leadNumber, archived_at: null },
    ai_summary_versions: [],
  }
}

function renderCard() {
  // retry: false — the rejection is terminal, so this asserts the state after
  // retries are exhausted rather than while one is still pending.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <StalledInspectionsCard />
    </QueryClientProvider>
  )
}

describe('StalledInspectionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should report the read as unavailable when the query fails', async () => {
    respondWith({ data: null, error: new Error('network down') })
    renderCard()

    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
  })

  it('should not render a zero count when the query fails', async () => {
    respondWith({ data: null, error: new Error('network down') })
    renderCard()

    await screen.findByText('Unavailable')
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('should render a verified zero when the query succeeds with no stalled inspections', async () => {
    respondWith({ data: [], error: null })
    renderCard()

    expect(await screen.findByText('0')).toBeInTheDocument()
  })

  it('should render the count when inspections have stalled', async () => {
    respondWith({ data: [stalledRow('MRC-2026-0136'), stalledRow('MRC-2026-0168')], error: null })
    renderCard()

    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('should name the stalled leads so the count can be acted on', async () => {
    respondWith({ data: [stalledRow('MRC-2026-0136'), stalledRow('MRC-2026-0168')], error: null })
    renderCard()

    expect(await screen.findByText('MRC-2026-0136, MRC-2026-0168')).toBeInTheDocument()
  })

  it('should collapse the lead list once it passes the display cap', async () => {
    const rows = ['MRC-2026-0136', 'MRC-2026-0168', 'MRC-2026-0127', 'MRC-2026-0124'].map(stalledRow)
    respondWith({ data: rows, error: null })
    renderCard()

    expect(await screen.findByText('MRC-2026-0136, MRC-2026-0168, MRC-2026-0127 +1 more')).toBeInTheDocument()
  })

  it('should leave the subtitle empty on a verified zero', async () => {
    respondWith({ data: [], error: null })
    renderCard()

    await screen.findByText('0')
    await waitFor(() => expect(screen.queryByText(/MRC-/)).not.toBeInTheDocument())
  })
})
