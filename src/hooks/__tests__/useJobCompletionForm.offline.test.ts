import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { isNetworkLevelError, useJobCompletionForm } from '../useJobCompletionForm'
import { updateJobCompletion } from '@/lib/api/jobCompletions'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'tech@example.com', user_metadata: {} } },
      }),
    },
    from: vi.fn(),
  },
}))

vi.mock('@/lib/api/jobCompletions', () => ({
  createJobCompletion: vi.fn(),
  updateJobCompletion: vi.fn(),
  submitJobCompletion: vi.fn(),
  getJobCompletionByLeadId: vi.fn().mockResolvedValue({
    id: 'jc-1',
    status: 'draft',
    submitted_at: null,
    completion_date: '2026-08-01',
    swms_completed: false,
    demolition_works: false,
    scope_changed: false,
    request_review: false,
    damages_present: false,
    staining_present: false,
    followup_required: false,
  }),
}))

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    value,
    writable: true,
    configurable: true,
  })
}

describe('isNetworkLevelError', () => {
  afterEach(() => setNavigatorOnLine(true))

  it('returns true when navigator.onLine is false regardless of the error', () => {
    setNavigatorOnLine(false)
    expect(isNetworkLevelError(new Error('anything at all'))).toBe(true)
  })

  it('returns true for the Chromium fetch failure message', () => {
    expect(isNetworkLevelError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('returns true for the WebKit fetch failure message wrapped by supabase-js', () => {
    expect(isNetworkLevelError({ message: 'TypeError: Load failed' })).toBe(true)
  })

  it('returns true for the Firefox NetworkError message', () => {
    expect(isNetworkLevelError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true)
  })

  it('returns true for the API wrapper prefix around a fetch failure', () => {
    expect(
      isNetworkLevelError(new Error('Failed to update job completion: TypeError: Failed to fetch')),
    ).toBe(true)
  })

  it('returns false for a database constraint failure while online', () => {
    expect(isNetworkLevelError(new Error('duplicate key value violates unique constraint'))).toBe(false)
  })

  it('returns false for the zero-rows-affected save failure while online', () => {
    expect(isNetworkLevelError(new Error('Update failed: No rows affected. Check permissions.'))).toBe(false)
  })

  it('returns false for null while online', () => {
    expect(isNetworkLevelError(null)).toBe(false)
  })
})

describe('useJobCompletionForm handleSave messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setNavigatorOnLine(true)
  })

  afterEach(() => setNavigatorOnLine(true))

  async function renderReadyHook() {
    const rendered = renderHook(() => useJobCompletionForm('lead-1'))
    await waitFor(() => expect(rendered.result.current.isLoading).toBe(false))
    return rendered
  }

  it('shows a server-save success message when the save reaches the server', async () => {
    vi.mocked(updateJobCompletion).mockResolvedValueOnce(undefined)
    const { result } = await renderReadyHook()

    await act(async () => {
      await result.current.handleSave()
    })

    expect(toast.success).toHaveBeenCalledWith('Saved to the server')
  })

  it('shows the amber offline message when the save fails at the network level', async () => {
    vi.mocked(updateJobCompletion).mockRejectedValueOnce(
      new Error('Failed to update job completion: TypeError: Failed to fetch'),
    )
    const { result } = await renderReadyHook()

    await act(async () => {
      await result.current.handleSave().catch(() => {})
    })

    expect(toast.warning).toHaveBeenCalledWith(
      "You're offline — not saved to the server",
      expect.objectContaining({
        description:
          "Your changes are only on this device for now. Keep this form open — it will save to the server automatically once you're back online.",
      }),
    )
  })

  it('keeps the generic error message for non-network save failures', async () => {
    vi.mocked(updateJobCompletion).mockRejectedValueOnce(
      new Error('Update failed: No rows affected. Check permissions.'),
    )
    const { result } = await renderReadyHook()

    await act(async () => {
      await result.current.handleSave().catch(() => {})
    })

    expect(toast.error).toHaveBeenCalledWith('Could not save', {
      description: 'Update failed: No rows affected. Check permissions.',
    })
  })

  it('rethrows the network-level failure so submit can abort', async () => {
    const failure = new Error('Failed to update job completion: TypeError: Failed to fetch')
    vi.mocked(updateJobCompletion).mockRejectedValueOnce(failure)
    const { result } = await renderReadyHook()

    await expect(act(async () => result.current.handleSave())).rejects.toThrow(failure.message)
  })
})
