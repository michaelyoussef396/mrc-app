import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { StalePdfBanner } from './StalePdfBanner'

type MaybeSingleResult<T> = Promise<{ data: T | null; error: null }>

const summaryMaybeSingle = vi.fn<() => MaybeSingleResult<{ generated_at: string }>>()
const areaMaybeSingle = vi.fn<() => MaybeSingleResult<{ updated_at: string }>>()
const pdfMaybeSingle = vi.fn<() => MaybeSingleResult<{ created_at: string }>>()
const pdfEq = vi.fn()

vi.mock('@/integrations/supabase/client', () => {
  const summaryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => summaryMaybeSingle(),
  }
  const areaBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: () => areaMaybeSingle(),
  }
  const pdfBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(function (this: unknown, col: string, val: unknown) {
      pdfEq(col, val)
      return this
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: () => pdfMaybeSingle(),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'pdf_versions') return pdfBuilder
        if (table === 'inspection_areas') return areaBuilder
        return summaryBuilder
      },
    },
  }
})

const BANNER_TEXT = /PDF is out of date/i
const INSPECTION_ID = 'd58d3f11-3cf5-441c-8087-f01869ac7002'

const EARLIER = '2026-05-16T04:00:00Z'
const LATER = '2026-05-16T05:00:00Z'

function renderBanner() {
  render(<StalePdfBanner inspectionId={INSPECTION_ID} isRegenerating={false} onRegenerate={vi.fn()} />)
}

async function waitForQueries() {
  await waitFor(() => {
    expect(pdfMaybeSingle).toHaveBeenCalled()
  })
}

describe('StalePdfBanner', () => {
  beforeEach(() => {
    summaryMaybeSingle.mockReset()
    areaMaybeSingle.mockReset()
    pdfMaybeSingle.mockReset()
    pdfEq.mockReset()
    // Default every signal to absent; each test opts into the one it exercises.
    summaryMaybeSingle.mockResolvedValue({ data: null, error: null })
    areaMaybeSingle.mockResolvedValue({ data: null, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('does not render when no PDF has ever been generated', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: LATER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: null, error: null })

    renderBanner()
    await waitForQueries()

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  it('renders when the PDF was generated before the latest AI summary', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: LATER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: EARLIER }, error: null })

    renderBanner()

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
  })

  it('does not render when the PDF was generated after the latest AI summary', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: EARLIER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: LATER }, error: null })

    renderBanner()
    await waitForQueries()

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  it('renders when an area was updated after the PDF was generated', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: EARLIER }, error: null })
    areaMaybeSingle.mockResolvedValue({ data: { updated_at: LATER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: EARLIER }, error: null })

    renderBanner()

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
  })

  it('does not render when the newest area update predates the PDF', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: EARLIER }, error: null })
    areaMaybeSingle.mockResolvedValue({ data: { updated_at: EARLIER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: LATER }, error: null })

    renderBanner()
    await waitForQueries()

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  // Regression: an inspection with no AI summary used to be reported fresh no
  // matter how much its areas had changed, because the old early return bailed
  // out on a missing summary before comparing anything else.
  it('renders when an area was updated after the PDF and no AI summary exists', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: null, error: null })
    areaMaybeSingle.mockResolvedValue({ data: { updated_at: LATER }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: EARLIER }, error: null })

    renderBanner()

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
  })

  it('does not render when neither an AI summary nor an area update exists', async () => {
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: EARLIER }, error: null })

    renderBanner()
    await waitForQueries()

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  // Without this filter the banner is self-defeating: the legacy EF writes a
  // pdf_versions row on every preview render, and an area edit auto-triggers one,
  // so the row lands newer than the edit that caused it and the banner clears
  // before the admin sees it. Staleness must be measured against what is actually
  // emailed — the newest hard_save — matching reportPipeline's send guard.
  it('measures staleness against hard_save versions only', async () => {
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: EARLIER }, error: null })

    renderBanner()
    await waitForQueries()

    expect(pdfEq).toHaveBeenCalledWith('generation_type', 'hard_save')
  })
})
