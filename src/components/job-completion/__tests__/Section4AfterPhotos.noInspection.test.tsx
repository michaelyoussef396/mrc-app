// After-photo upload on a job whose lead never had an inspection.
//
// Section 4 had the same guard Section 3 shipped with: canUpload required an
// inspectionId, so on these leads "Add Photos" rendered disabled and a red
// banner said photos could not be uploaded at all. A technician hit exactly
// this on site. Unlike Section 3 the grid never had a fetch problem — after
// photos are read back by job_completion_id alone — so the fix is the guard,
// the banner, and a stated reason whenever the buttons are still held closed.
//
// Only the network boundary (supabase, the upload helper), the toast, and
// Sentry are faked. Caption derivation stays real.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'

import type { JobCompletionFormData } from '@/types/jobCompletion'

const { mockFrom, mockCreateSignedUrl, mockUploadMultiplePhotos } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
  mockUploadMultiplePhotos: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl })) },
  },
}))

vi.mock('@/lib/utils/photoUpload', () => ({
  uploadMultiplePhotos: mockUploadMultiplePhotos,
  deleteInspectionPhoto: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
  addBusinessBreadcrumb: vi.fn(),
}))

import { Section4AfterPhotos } from '../Section4AfterPhotos'

const LEAD_ID = 'lead-1'
const JOB_ID = 'job-completion-1'
const UPLOADED_PHOTO_ID = 'uploaded-after-1'

/** Rows the `photos` grid query returns. Mutable so an upload can land mid-test. */
let photoRows: Array<Record<string, unknown>> = []

/** What the before-photo count query returns — this is the after-photo limit. */
let beforeCount = 1

/** What the `inspections` lookup resolves to. Null models a lead with none. */
let inspectionLookup: () => Promise<{ data: unknown; error: unknown }> = async () => ({
  data: null,
  error: null,
})

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  let isCountQuery = false

  builder.select = vi.fn((_columns: string, options?: { head?: boolean }) => {
    isCountQuery = options?.head === true
    return builder
  })
  for (const method of ['eq', 'is', 'in', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn(() => inspectionLookup())
  // The photos queries have no terminator — the builder itself is awaited.
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
    const result =
      table !== 'photos'
        ? { data: [], error: null }
        : isCountQuery
          ? { count: beforeCount, error: null }
          : { data: photoRows, error: null }
    return Promise.resolve(result).then(onFulfilled, onRejected)
  }
  return builder
}

function makeUploadedRow() {
  return {
    id: UPLOADED_PHOTO_ID,
    storage_path: `job-${JOB_ID}/general-1.jpg`,
    photo_category: 'after',
    caption: 'After',
  }
}

function makeFormData(overrides: Partial<JobCompletionFormData> = {}): JobCompletionFormData {
  return {
    demolitionWorks: false,
    demolitionJustification: '',
    demolitionRemovalNotes: '',
    ...overrides,
  } as unknown as JobCompletionFormData
}

function renderSection({
  jobCompletionId = JOB_ID,
  formData = makeFormData(),
}: { jobCompletionId?: string | null; formData?: JobCompletionFormData } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Section4AfterPhotos
        formData={formData}
        onChange={vi.fn()}
        leadId={LEAD_ID}
        jobCompletionId={jobCompletionId}
      />
    </QueryClientProvider>
  )
}

function getAfterUploadButton() {
  return screen.getByRole('button', { name: /^add photos$/i })
}

async function uploadOnePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], 'after.jpg', { type: 'image/jpeg' })
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  photoRows = []
  beforeCount = 1
  inspectionLookup = async () => ({ data: null, error: null })

  mockFrom.mockImplementation((table: string) => makeBuilder(table))
  mockCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://example.test/signed.jpg' },
    error: null,
  })
  // An upload lands the row the next refetch will read.
  mockUploadMultiplePhotos.mockImplementation(async () => {
    photoRows = [makeUploadedRow()]
    return [{ photo_id: UPLOADED_PHOTO_ID, storage_path: 'p', signed_url: 's' }]
  })
  vi.stubGlobal('navigator', { ...navigator, onLine: true })
})

describe('Section 4 on a job with no inspection', () => {
  it('enables the Add Photos button', async () => {
    renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
  })

  it('gives the technician no blocking message', async () => {
    renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('no longer tells the technician photos cannot be uploaded', async () => {
    renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    expect(screen.queryByText(/cannot be uploaded/i)).not.toBeInTheDocument()
  })

  it('uploads with a null inspection id', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inspection_id: null })
      )
    )
  })

  it('attaches the upload to the job completion as an after photo', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ job_completion_id: JOB_ID, photo_category: 'after' })
      )
    )
  })

  // The fix is worthless if the photo uploads and then disappears from the grid.
  it('shows the uploaded photo in the grid', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    expect(await screen.findByRole('img', { name: 'After' })).toBeInTheDocument()
  })

  it('uploads a demolition photo with a null inspection id', async () => {
    const { container } = renderSection({ formData: makeFormData({ demolitionWorks: true }) })
    const demolitionButton = await screen.findByRole('button', { name: /add demolition photos/i })
    await waitFor(() => expect(demolitionButton).toBeEnabled())
    fireEvent.click(demolitionButton)
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ photo_category: 'demolition', inspection_id: null })
      )
    )
  })
})

// TanStack v5 parks a query created offline as pending/paused: isLoading is
// false and there is no error, so a gate on either would open the buttons with
// the inspection still unknown.
describe('Section 4 while the device is offline', () => {
  beforeEach(() => {
    onlineManager.setOnline(false)
  })

  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('holds the upload button closed', async () => {
    renderSection({ formData: makeFormData({ demolitionWorks: true }) })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add demolition photos/i })).toBeDisabled()
    )
  })

  it('says the device is offline rather than going silent', async () => {
    renderSection({ formData: makeFormData({ demolitionWorks: true }) })
    expect(await screen.findByRole('status')).toHaveTextContent(/offline/i)
  })
})

describe('Section 4 while the inspection lookup is still running', () => {
  beforeEach(() => {
    inspectionLookup = () => new Promise(() => {})
  })

  it('holds the Add Photos button closed', async () => {
    renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeDisabled())
  })

  it('says it is checking for an inspection rather than going silent', async () => {
    renderSection()
    expect(await screen.findByRole('status')).toHaveTextContent(/checking for a linked inspection/i)
  })
})

describe('Section 4 when the inspection lookup fails', () => {
  beforeEach(() => {
    inspectionLookup = async () => ({ data: null, error: new Error('network down') })
  })

  it('holds the Add Photos button closed', async () => {
    renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeDisabled())
  })

  it('says why the button is disabled', async () => {
    renderSection()
    expect(await screen.findByRole('status')).toHaveTextContent(/could not check for a linked inspection/i)
  })

  it('offers a retry', async () => {
    renderSection()
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('re-enables the upload button once Retry succeeds', async () => {
    renderSection()
    const retry = await screen.findByRole('button', { name: /retry/i })
    inspectionLookup = async () => ({ data: null, error: null })
    fireEvent.click(retry)
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
  })
})

describe('Section 4 before the job completion row exists', () => {
  it('holds the demolition upload button closed', async () => {
    renderSection({ jobCompletionId: null, formData: makeFormData({ demolitionWorks: true }) })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add demolition photos/i })).toBeDisabled()
    )
  })

  it('says why the button is disabled rather than going silent', async () => {
    renderSection({ jobCompletionId: null, formData: makeFormData({ demolitionWorks: true }) })
    expect(await screen.findByRole('status')).toHaveTextContent(/preparing this job/i)
  })
})

describe('Section 4 on a job that does have an inspection', () => {
  beforeEach(() => {
    inspectionLookup = async () => ({ data: { id: 'insp-1' }, error: null })
  })

  it('still uploads with the inspection id', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getAfterUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inspection_id: 'insp-1' })
      )
    )
  })
})
