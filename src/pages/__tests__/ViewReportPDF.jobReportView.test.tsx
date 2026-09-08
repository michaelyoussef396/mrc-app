import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Component, type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ViewReportPDF, { JobReportPreview, isLoadedJobReportCurrent } from '../ViewReportPDF'

// The preview only reaches for the Storage client when the URL looks like a
// Supabase Storage URL. These fixtures deliberately do not, so every load in
// this file goes through window.fetch and stays controllable from the test.
const JOB_ID = 'job-completion-1'
const V1_URL = 'https://reports.test/job-report-v1.html'
const V2_URL = 'https://reports.test/job-report-v2.html'
const V1_HTML = '<html><body>version one</body></html>'

// Every table the page reads resolves from this map. A table with no entry
// answers `{ data: null, error: null }`, which is the benign "nothing here"
// shape each of the page's queries already handles.
const tableResults: Record<string, { data: unknown; error: unknown }> = {}

vi.mock('@/integrations/supabase/client', () => {
  function builderFor(table: string) {
    const settle = () =>
      Promise.resolve(tableResults[table] ?? { data: null, error: null })
    // Chainable and thenable: some queries end in .maybeSingle()/.single(),
    // others await the builder straight after .order().
    const builder: Record<string, unknown> = {
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        settle().then(onFulfilled, onRejected),
      single: settle,
      maybeSingle: settle,
    }
    for (const method of ['select', 'eq', 'neq', 'not', 'order', 'limit', 'update', 'insert']) {
      builder[method] = () => builder
    }
    return builder
  }

  return {
    supabase: {
      storage: { from: () => ({ download: vi.fn() }) },
      from: (table: string) => builderFor(table),
    },
  }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function htmlResponse(body: string) {
  return { ok: true, status: 200, text: async () => body } as unknown as Response
}

describe('isLoadedJobReportCurrent', () => {
  const loaded = { html: V1_HTML, sourceUrl: V1_URL, jobCompletionId: JOB_ID }

  it('should accept a report whose job and source URL both match the selection', () => {
    expect(isLoadedJobReportCurrent(loaded, JOB_ID, V1_URL)).toBe(true)
  })

  it('should reject a report loaded from a different source URL', () => {
    expect(isLoadedJobReportCurrent(loaded, JOB_ID, V2_URL)).toBe(false)
  })

  it('should reject a report belonging to a different job', () => {
    expect(isLoadedJobReportCurrent(loaded, 'job-completion-2', V1_URL)).toBe(false)
  })

  it('should reject when nothing has loaded', () => {
    expect(isLoadedJobReportCurrent(null, JOB_ID, V1_URL)).toBe(false)
  })

  it('should reject when no report is selected', () => {
    expect(isLoadedJobReportCurrent(loaded, JOB_ID, null)).toBe(false)
  })
})

describe('JobReportPreview readiness reporting', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should revoke readiness while a newly selected version is still loading', async () => {
    // Regression test for the 2026-09-07 Codex finding: the lifted HTML
    // survived a version switch, so the View button stayed enabled over the
    // PREVIOUS version and an admin could email a customer the wrong report.
    const secondLoad = deferred<Response>()
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(htmlResponse(V1_HTML))
      .mockReturnValueOnce(secondLoad.promise)

    const onHtmlLoaded = vi.fn()

    const { rerender } = render(
      <JobReportPreview htmlUrl={V1_URL} jobCompletionId={JOB_ID} onHtmlLoaded={onHtmlLoaded} />,
    )

    await waitFor(() =>
      expect(onHtmlLoaded).toHaveBeenLastCalledWith({
        html: V1_HTML,
        sourceUrl: V1_URL,
        jobCompletionId: JOB_ID,
      }),
    )

    // Select v2. Its fetch never settles, so the preview sits in a loading
    // state that previously left v1 exportable.
    rerender(
      <JobReportPreview htmlUrl={V2_URL} jobCompletionId={JOB_ID} onHtmlLoaded={onHtmlLoaded} />,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(onHtmlLoaded).toHaveBeenLastCalledWith(null)

    secondLoad.resolve(htmlResponse('<html><body>version two</body></html>'))
  })

  it('should revoke readiness when the preview unmounts', async () => {
    vi.mocked(fetch).mockResolvedValue(htmlResponse(V1_HTML))
    const onHtmlLoaded = vi.fn()

    const { unmount } = render(
      <JobReportPreview htmlUrl={V1_URL} jobCompletionId={JOB_ID} onHtmlLoaded={onHtmlLoaded} />,
    )

    await waitFor(() => expect(onHtmlLoaded).toHaveBeenLastCalledWith(expect.objectContaining({ html: V1_HTML })))

    unmount()

    expect(onHtmlLoaded).toHaveBeenLastCalledWith(null)
  })

  it('should tag loaded HTML with the job it belongs to', async () => {
    vi.mocked(fetch).mockResolvedValue(htmlResponse(V1_HTML))
    const onHtmlLoaded = vi.fn()

    render(
      <JobReportPreview htmlUrl={V1_URL} jobCompletionId={JOB_ID} onHtmlLoaded={onHtmlLoaded} />,
    )

    await waitFor(() =>
      expect(onHtmlLoaded).toHaveBeenLastCalledWith(
        expect.objectContaining({ jobCompletionId: JOB_ID, sourceUrl: V1_URL }),
      ),
    )
  })
})

// --- Parent-state interactions -------------------------------------------
//
// The suites above exercise JobReportPreview and isLoadedJobReportCurrent in
// isolation, which is why neither caught the two defects below: both live in
// how ViewReportPDF's own state (a pinned history version) interacts with a
// job-completion query result that changes underneath it. Reproducing them
// needs the page mounted, not the preview.

const LEAD_ID = 'lead-1'
const JOB_A = {
  id: 'job-completion-a',
  job_number: 'JOB-A',
  pdf_url: 'https://reports.test/job-a-latest.html',
  pdf_version: 2,
  lead: { id: LEAD_ID, full_name: 'Test Customer', email: 'customer@test.invalid' },
}
const JOB_B = {
  id: 'job-completion-b',
  job_number: 'JOB-B',
  pdf_url: 'https://reports.test/job-b-latest.html',
  pdf_version: 1,
  lead: { id: LEAD_ID, full_name: 'Test Customer', email: 'customer@test.invalid' },
}
const JOB_A_V1_URL = 'https://reports.test/job-a-v1.html'
const JOB_A_V1_HTML = '<html><body>job A version one</body></html>'
const JOB_B_HTML = '<html><body>job B latest</body></html>'

/** Records anything thrown during render so a crash reads as an assertion, not a stack trace. */
class RenderGuard extends Component<{ children: ReactNode }, { error: Error | null }> {
  static caught: Error | null = null
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    RenderGuard.caught = error
    return { error }
  }
  render() {
    return this.state.error ? <div>render failed</div> : this.props.children
  }
}

function renderJobReportPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  render(
    <RenderGuard>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/job-report/${LEAD_ID}`]}>
          <Routes>
            <Route path="/admin/job-report/:leadId" element={<ViewReportPDF />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </RenderGuard>,
  )
  return { queryClient }
}

/** jsdom's Blob implements neither text() nor arrayBuffer(). */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/** The desktop toolbar's View button — the entry point to the export path. */
function viewButton() {
  return screen.getByRole('button', { name: /^View$/ })
}

/** Pins job A's v1 from the version-history strip, the way an admin does. */
async function pinJobAVersionOne(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^History$/ }))
  await user.click(await screen.findByRole('button', { name: /^v1/ }))
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(JOB_A_V1_URL, expect.anything()))
}

describe('ViewReportPDF job report — pinned history version', () => {
  let openedBlobs: Blob[]

  beforeEach(() => {
    RenderGuard.caught = null
    openedBlobs = []
    for (const key of Object.keys(tableResults)) delete tableResults[key]

    tableResults.job_completions = { data: JOB_A, error: null }
    tableResults.job_completion_pdf_versions = {
      data: [
        { id: 'v1', version_number: 1, pdf_url: JOB_A_V1_URL, created_at: '2026-09-01T00:00:00Z', generated_by: null },
      ],
      error: null,
    }
    // No inspection record: this is a job-only report, and loadInspection()
    // already treats "not found" as a non-fatal empty state.
    tableResults.inspections = { data: null, error: { message: 'not found' } }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        htmlResponse(url === JOB_A_V1_URL ? JOB_A_V1_HTML : url === JOB_B.pdf_url ? JOB_B_HTML : V1_HTML),
      ),
    )
    vi.stubGlobal('open', vi.fn(() => ({ opener: {} })))
    URL.createObjectURL = vi.fn((blob: Blob) => {
      openedBlobs.push(blob)
      return 'blob:stub'
    })
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should survive the job query returning null while a history version is pinned', async () => {
    // Codex 2026-09-08, defect 1: jobHtmlUrl stays truthy off the pinned
    // override, so the preview was still constructed after jobCompletion went
    // null and jobCompletion!.id dereferenced null.
    const user = userEvent.setup()
    const { queryClient } = renderJobReportPage()

    await waitFor(() => expect(viewButton()).toBeEnabled())
    await pinJobAVersionOne(user)

    tableResults.job_completions = { data: null, error: { message: 'network error' } }
    await queryClient.invalidateQueries({ queryKey: ['job-completion-report', LEAD_ID] })

    // The header falls back to this label once jobCompletion is null. It can
    // only appear if that render completed — a crash replaces the tree instead.
    expect(await screen.findByText('Job Completion Report')).toBeInTheDocument()
  })

  it('should disable View when the job query returns null while a history version is pinned', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderJobReportPage()

    await waitFor(() => expect(viewButton()).toBeEnabled())
    await pinJobAVersionOne(user)

    tableResults.job_completions = { data: null, error: { message: 'network error' } }
    await queryClient.invalidateQueries({ queryKey: ['job-completion-report', LEAD_ID] })

    await waitFor(() => expect(viewButton()).toBeDisabled())
  })

  it('should never export the pinned job\'s HTML after the page switches to a different job', async () => {
    // Codex 2026-09-08, defect 2: the override outlived the completion it was
    // pinned from. The preview re-downloaded job A's URL and tagged that HTML
    // with job B's id, so both identity comparisons passed and job A's report
    // could be exported under job B's heading.
    const user = userEvent.setup()
    const { queryClient } = renderJobReportPage()

    await waitFor(() => expect(viewButton()).toBeEnabled())
    await pinJobAVersionOne(user)

    tableResults.job_completions = { data: JOB_B, error: null }
    await queryClient.invalidateQueries({ queryKey: ['job-completion-report', LEAD_ID] })
    await screen.findByText(/JOB-B/)

    await waitFor(() => expect(viewButton()).toBeEnabled())
    await user.click(viewButton())

    const exported = await Promise.all(openedBlobs.map(readBlob))
    expect(exported).not.toContain(JOB_A_V1_HTML)
  })
})
