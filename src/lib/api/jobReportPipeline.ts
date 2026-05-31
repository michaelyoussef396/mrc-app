// Client wrapper for the server-side job-report PDF pipeline.
//
// Mirrors src/lib/api/reportPipeline.ts (the inspection-side equivalent) for
// job-completion reports. The send-time guarantee is identical: the email
// always attaches the latest server-rendered, hash-verified PDF.
//
// Phase 2b: hardSaveJobReport calls POST /api/render-job-report-pdf with
// mode='hard_save'. The server returns PDF bytes in the body plus version
// metadata in X-Mrc-* response headers — one round-trip yields the file AND
// the job_completion_pdf_versions row reference.
//
// downloadBlobAs is intentionally NOT re-exported here; callers import it
// from @/lib/api/reportPipeline (it's generic — no inspection coupling).
//
// See docs/PDF_PIPELINE_PLAN.md (inspection rebuild) and
// ~/.claude/plans/silly-inventing-neumann.md (this job-side mirror).

import { supabase } from '@/integrations/supabase/client'
import { hashHtml } from '@/lib/utils/reportHash'

const RENDER_PDF_ENDPOINT = '/api/render-job-report-pdf'
const REPORT_PDFS_BUCKET = 'report-pdfs'

export interface HardSaveJobReportResult {
  versionId: string
  versionNumber: number
  pdfStoragePath: string
  htmlStoragePath: string
  htmlHash: string
  pdfBlob: Blob
}

export class HardSaveJobReportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly serverError?: string,
  ) {
    super(message)
    this.name = 'HardSaveJobReportError'
  }
}

/**
 * Render-and-persist the job-completion report. Returns a Blob the caller can
 * trigger a browser download from, plus the metadata of the newly-written
 * job_completion_pdf_versions row. Throws HardSaveJobReportError on failure.
 */
export async function hardSaveJobReport(jobCompletionId: string): Promise<HardSaveJobReportResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new HardSaveJobReportError('Not authenticated', 401)
  }

  const response = await fetch(RENDER_PDF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ jobCompletionId, mode: 'hard_save' }),
  })

  if (!response.ok) {
    let serverError: string | undefined
    try {
      const payload = (await response.json()) as { error?: string }
      serverError = payload.error
    } catch {
      // ignore — body not JSON
    }
    throw new HardSaveJobReportError(
      serverError ?? `Render endpoint returned ${response.status}`,
      response.status,
      serverError,
    )
  }

  const versionId = response.headers.get('X-Mrc-Version-Id')
  const versionNumberRaw = response.headers.get('X-Mrc-Version-Number')
  const pdfStoragePath = response.headers.get('X-Mrc-Pdf-Storage-Path')
  const htmlStoragePath = response.headers.get('X-Mrc-Html-Storage-Path')
  const htmlHash = response.headers.get('X-Mrc-Html-Hash')

  if (!versionId || !versionNumberRaw || !pdfStoragePath || !htmlStoragePath || !htmlHash) {
    throw new HardSaveJobReportError(
      'Render endpoint succeeded but version metadata headers were missing',
      500,
    )
  }

  const versionNumber = Number.parseInt(versionNumberRaw, 10)
  if (!Number.isFinite(versionNumber)) {
    throw new HardSaveJobReportError('Invalid X-Mrc-Version-Number header', 500)
  }

  const pdfBlob = await response.blob()
  return { versionId, versionNumber, pdfStoragePath, htmlStoragePath, htmlHash, pdfBlob }
}

// ============================================================================
// Send-time mismatch guard
// ============================================================================

export interface HardSaveJobReportVersionRow {
  id: string
  version_number: number
  pdf_storage_path: string
  html_storage_path: string | null
  html_hash: string | null
  created_at: string
}

export type JobReportMismatchResult =
  | { kind: 'no_hard_save' }
  | { kind: 'match'; version: HardSaveJobReportVersionRow }
  | { kind: 'mismatch'; version: HardSaveJobReportVersionRow; currentHash: string }

/**
 * Compare the latest hard-saved version's stored HTML hash against a freshly
 * re-rendered HTML for the same job completion. Used by handleSendEmail (job
 * branch) to gate sends behind a "report data has drifted since v{N}" prompt.
 */
export async function checkJobReportSendMismatch(jobCompletionId: string): Promise<JobReportMismatchResult> {
  const { data: latest, error: latestError } = await supabase
    .from('job_completion_pdf_versions')
    .select('id, version_number, pdf_storage_path, html_storage_path, html_hash, created_at')
    .eq('job_completion_id', jobCompletionId)
    .eq('generation_type', 'hard_save')
    .not('pdf_storage_path', 'is', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Job-report mismatch check: failed to load latest hard-save version: ${latestError.message}`)
  }
  if (!latest) {
    return { kind: 'no_hard_save' }
  }
  const version = latest as unknown as HardSaveJobReportVersionRow

  if (!version.html_hash) {
    // Pre-pipeline hard_save row missing the hash — treat as mismatch so the
    // admin is asked to re-save (and the new row gets the hash populated).
    const fresh = await fetchPreviewHtml(jobCompletionId)
    const currentHash = await hashHtml(fresh)
    return { kind: 'mismatch', version, currentHash }
  }

  const fresh = await fetchPreviewHtml(jobCompletionId)
  const currentHash = await hashHtml(fresh)
  return currentHash === version.html_hash
    ? { kind: 'match', version }
    : { kind: 'mismatch', version, currentHash }
}

async function fetchPreviewHtml(jobCompletionId: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('Job-report mismatch check: not authenticated')
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-job-report-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ jobCompletionId, previewOnly: true }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Job-report mismatch check: previewOnly EF returned ${response.status}${body ? ` — ${body.slice(0, 120)}` : ''}`)
  }
  const payload = (await response.json()) as { html?: unknown }
  if (typeof payload.html !== 'string') {
    throw new Error('Job-report mismatch check: previewOnly EF returned no HTML')
  }
  return payload.html
}

/**
 * Download the stored PDF for a given hard-save version and return its base64
 * body — the shape the existing sendEmail()/Resend attachment path wants.
 */
export async function downloadJobVersionPdfAsBase64(pdfStoragePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REPORT_PDFS_BUCKET)
    .download(pdfStoragePath)
  if (error || !data) {
    throw new Error(`Failed to download PDF v${pdfStoragePath}: ${error?.message ?? 'unknown'}`)
  }
  const buf = await data.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/**
 * Mark a hard-save job-report version as emailed. Called after a successful
 * send so the version-history UI can show the badge.
 */
export async function markJobVersionEmailed(versionId: string): Promise<void> {
  const { error } = await supabase
    .from('job_completion_pdf_versions')
    .update({ was_emailed: true, emailed_at: new Date().toISOString() })
    .eq('id', versionId)
  if (error) {
    // Log but don't throw — the send succeeded; we just lost the email-badge
    // signal for this version row. Worth knowing about but not user-facing.
    console.error('[jobReportPipeline] markJobVersionEmailed failed', { versionId, error })
  }
}
