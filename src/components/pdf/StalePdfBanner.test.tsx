import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { StalePdfBanner } from './StalePdfBanner'

type MaybeSingleResult<T> = Promise<{ data: T | null; error: null }>

const summaryMaybeSingle = vi.fn<[], MaybeSingleResult<{ generated_at: string }>>()
const pdfMaybeSingle = vi.fn<[], MaybeSingleResult<{ created_at: string }>>()

vi.mock('@/integrations/supabase/client', () => {
  const summaryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: () => summaryMaybeSingle(),
  }
  const pdfBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: () => pdfMaybeSingle(),
  }
  return {
    supabase: {
      from: (table: string) => (table === 'pdf_versions' ? pdfBuilder : summaryBuilder),
    },
  }
})

const BANNER_TEXT = /PDF is out of date/i
const INSPECTION_ID = 'd58d3f11-3cf5-441c-8087-f01869ac7002'

describe('StalePdfBanner', () => {
  beforeEach(() => {
    summaryMaybeSingle.mockReset()
    pdfMaybeSingle.mockReset()
  })

  it('does not render when no PDF has ever been generated', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: '2026-05-16T03:40:32Z' }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: null, error: null })

    render(<StalePdfBanner inspectionId={INSPECTION_ID} isRegenerating={false} onRegenerate={vi.fn()} />)

    await waitFor(() => {
      expect(summaryMaybeSingle).toHaveBeenCalled()
      expect(pdfMaybeSingle).toHaveBeenCalled()
    })
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })

  it('renders when the PDF was generated before the latest AI summary', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: '2026-05-16T05:00:00Z' }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: '2026-05-16T04:00:00Z' }, error: null })

    render(<StalePdfBanner inspectionId={INSPECTION_ID} isRegenerating={false} onRegenerate={vi.fn()} />)

    expect(await screen.findByText(BANNER_TEXT)).toBeInTheDocument()
  })

  it('does not render when the PDF was generated after the latest AI summary', async () => {
    summaryMaybeSingle.mockResolvedValue({ data: { generated_at: '2026-05-16T04:00:00Z' }, error: null })
    pdfMaybeSingle.mockResolvedValue({ data: { created_at: '2026-05-16T05:00:00Z' }, error: null })

    render(<StalePdfBanner inspectionId={INSPECTION_ID} isRegenerating={false} onRegenerate={vi.fn()} />)

    await waitFor(() => {
      expect(summaryMaybeSingle).toHaveBeenCalled()
      expect(pdfMaybeSingle).toHaveBeenCalled()
    })
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument()
  })
})
