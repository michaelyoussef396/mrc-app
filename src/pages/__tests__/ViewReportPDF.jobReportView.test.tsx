import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

import { JobReportPreview, isLoadedJobReportCurrent } from '../ViewReportPDF'

// The preview only reaches for the Storage client when the URL looks like a
// Supabase Storage URL. These fixtures deliberately do not, so every load in
// this file goes through window.fetch and stays controllable from the test.
const JOB_ID = 'job-completion-1'
const V1_URL = 'https://reports.test/job-report-v1.html'
const V2_URL = 'https://reports.test/job-report-v2.html'
const V1_HTML = '<html><body>version one</body></html>'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ download: vi.fn() }) } },
}))

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
