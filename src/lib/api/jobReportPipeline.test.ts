import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
}))

// Re-import after mock so the SUT picks up the mocked client.
import { hardSaveJobReport } from './jobReportPipeline'
import { HARD_SAVE_NETWORK_ERROR_MESSAGE } from './reportPipeline'
import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError } from '@/lib/sentry'

function mockSession(): void {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok-xyz' } as never },
    error: null,
  } as never)
}

describe('hardSaveJobReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // @ts-expect-error global cleanup
    delete global.fetch
  })

  it('throws HardSaveJobReportError with the network message when fetch fails at transport level', async () => {
    mockSession()
    // @ts-expect-error global override
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(hardSaveJobReport('33333333-3333-3333-3333-333333333333'))
      .rejects.toMatchObject({
        name: 'HardSaveJobReportError',
        status: 0,
        message: HARD_SAVE_NETWORK_ERROR_MESSAGE,
      })
  })

  it('reports transport failures to Sentry via captureBusinessError', async () => {
    mockSession()
    // @ts-expect-error global override
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await hardSaveJobReport('33333333-3333-3333-3333-333333333333').catch(() => undefined)

    expect(captureBusinessError).toHaveBeenCalledWith(
      'Hard-save endpoint unreachable: POST /api/render-job-report-pdf',
      expect.objectContaining({
        endpoint: '/api/render-job-report-pdf',
        cause: 'TypeError: Failed to fetch',
      }),
    )
  })
})
