// Before-photo upload on a job whose lead never had an inspection.
//
// This was a live blocker: "Add Before Photos" rendered disabled and clicking
// it did nothing, because canUpload required an inspectionId that these leads
// never have. The empty state told the technician to use the very button it had
// disabled, and the upload was the only photo path those jobs had.
//
// Enabling the button alone is not the fix. fetchBeforePhotos used to return
// early when the lead had no inspection, so an uploaded photo — which carries
// inspection_id = null — was invisible to the refetch that follows the upload.
// It would have uploaded and then vanished. Both halves are pinned here.
//
// Only the network boundary (supabase, the upload helper), the toast, and
// Sentry are faked. Grouping and classification stay real.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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

vi.mock('@/lib/utils/photoHistory', () => ({ recordPhotoHistory: vi.fn() }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
  addBusinessBreadcrumb: vi.fn(),
}))

import { Section3BeforePhotos } from '../Section3BeforePhotos'

const LEAD_ID = 'lead-1'
const JOB_ID = 'job-completion-1'
const UPLOADED_PHOTO_ID = 'uploaded-photo-1'

/** Rows the `photos` table returns. Mutable so an upload can land mid-test. */
let photoRows: Array<Record<string, unknown>> = []

/** Result the `inspections` lookup returns. Null models a lead with none. */
let inspectionRow: Record<string, unknown> | null = null

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'or', 'order', 'limit', 'update', 'in']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn(async () => ({ data: inspectionRow, error: null }))
  // The photos query has no terminator — the builder itself is awaited.
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(
      table === 'photos' ? { data: photoRows, error: null } : { data: [], error: null }
    ).then(onFulfilled, onRejected)
  return builder
}

function makeUploadedRow() {
  return {
    id: UPLOADED_PHOTO_ID,
    inspection_id: null,
    storage_path: `job-${JOB_ID}/general-1.jpg`,
    caption: 'Before photo',
    area_id: null,
    photo_type: 'general',
    photo_category: 'before',
    job_completion_id: JOB_ID,
  }
}

const FORM_DATA = { areasTreated: [] } as unknown as JobCompletionFormData

function renderSection(jobCompletionId: string | null = JOB_ID) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Section3BeforePhotos
        formData={FORM_DATA}
        onChange={vi.fn()}
        leadId={LEAD_ID}
        jobCompletionId={jobCompletionId}
      />
    </QueryClientProvider>
  )
}

function getUploadButton() {
  return screen.getByRole('button', { name: /add before photos/i })
}

async function uploadOnePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], 'before.jpg', { type: 'image/jpeg' })
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  photoRows = []
  inspectionRow = null

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

describe('Section 3 on a job with no inspection', () => {
  it('enables the upload button', async () => {
    renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
  })

  it('gives the technician no blocking message', async () => {
    renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('tells the technician there is no inspection to draw from', async () => {
    renderSection()
    expect(await screen.findByText(/no inspection to draw photos from/i)).toBeInTheDocument()
  })

  it('uploads with a null inspection id', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inspection_id: null })
      )
    )
  })

  it('attaches the upload to the job completion', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    await waitFor(() =>
      expect(mockUploadMultiplePhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ job_completion_id: JOB_ID, photo_category: 'before' })
      )
    )
  })

  // The regression that would make the fix worthless: a photo that uploads
  // successfully and then disappears because the refetch cannot see it.
  it('shows the uploaded photo in the grid', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    expect(await screen.findByRole('img', { name: /before photo/i })).toBeInTheDocument()
  })

  it('groups the uploaded photo as taken on site', async () => {
    const { container } = renderSection()
    await waitFor(() => expect(getUploadButton()).toBeEnabled())
    await uploadOnePhoto(container)
    expect(await screen.findByText(/photos you added on site/i)).toBeInTheDocument()
  })
})

describe('Section 3 before the job completion row exists', () => {
  it('disables the upload button', async () => {
    renderSection(null)
    await waitFor(() => expect(getUploadButton()).toBeDisabled())
  })

  it('says why the button is disabled rather than going silent', async () => {
    renderSection(null)
    expect(await screen.findByRole('status')).toHaveTextContent(/preparing this job/i)
  })
})

describe('Section 3 on a job that does have an inspection', () => {
  it('still lists the inspection photos', async () => {
    inspectionRow = { id: 'insp-1' }
    photoRows = [
      {
        id: 'insp-photo-1',
        inspection_id: 'insp-1',
        storage_path: 'insp-1/general-1.jpg',
        caption: 'Ceiling',
        area_id: null,
        photo_type: 'general',
        photo_category: null,
        job_completion_id: null,
      },
    ]
    renderSection()
    expect(await screen.findByRole('img', { name: /ceiling/i })).toBeInTheDocument()
  })
})
