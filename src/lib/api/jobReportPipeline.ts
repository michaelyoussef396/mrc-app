// Client wrapper for the server-side job-report PDF pipeline.
//
// Mirrors src/lib/api/reportPipeline.ts (the inspection-side equivalent) for
// job-completion reports. The send-time guarantee is identical: the email
// always attaches the latest server-rendered, hash-verified PDF.
//
// Like the inspection endpoint, /api/render-job-report-pdf returns JSON
// metadata plus a signed URL rather than PDF bytes — Vercel caps a buffered
// response body at ~4.5 MB and job reports are the larger of the two payloads,
// because generate-job-report-pdf embeds photos as base64 data URIs.
//
// Retrieval, signed-URL and attachment-size helpers are imported from
// reportPipeline rather than duplicated: both pipelines write to the same
// report-pdfs bucket and the version shapes are identical.
//
// See docs/PDF_PIPELINE_PLAN.md (inspection rebuild) and
// ~/.claude/plans/silly-inventing-neumann.md (this job-side mirror).

import { supabase } from '@/integrations/supabase/client'
import { HARD_SAVE_NETWORK_ERROR_MESSAGE } from '@/lib/api/reportPipeline'
import { captureBusinessError } from '@/lib/sentry'
import { hashHtml } from '@/lib/utils/reportHash'

const RENDER_PDF_ENDPOINT = '/api/render-job-report-pdf'
const NETWORK_ERROR_STATUS = 0
const REPORT_PDFS_BUCKET = 'report-pdfs'

// See reportPipeline.RECONCILE_WINDOW_MS — same reasoning, same window.
const RECONCILE_WINDOW_MS = 5 * 60 * 1000

export interface HardSaveJobReportResult {
  versionId: string
  versionNumber: number
  pdfStoragePath: string
  htmlStoragePath: string
  htmlHash: string
  bucket: string
  fileSizeBytes: number
  /** Null when the server could not mint one; retrieval falls back to an authenticated download. */
  signedUrl: string | null
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

// Mirror of reportPipeline's toHardSaveNetworkError — see that function for
// why transport TypeErrors must be reported and rethrown typed.
function toJobReportNetworkError(err: unknown, endpoint: string): HardSaveJobReportError {
  captureBusinessError(`Hard-save endpoint unreachable: POST ${endpoint}`, {
    endpoint,
    origin: window.location.origin,
    cause: String(err),
  })
  return new HardSaveJobReportError(HARD_SAVE_NETWORK_ERROR_MESSAGE, NETWORK_ERROR_STATUS)
}

/**
 * Render-and-persist the job-completion report. Returns the metadata of the
 * newly-written job_completion_pdf_versions row; call fetchVersionPdfBlob to
 * get the file. Throws HardSaveJobReportError only when no row exists.
 */
export async function hardSaveJobReport(jobCompletionId: string): Promise<HardSaveJobReportResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new HardSaveJobReportError('Not authenticated', 401)
  }

  const startedAt = new Date(Date.now() - RECONCILE_WINDOW_MS).toISOString()

  let response: Response
  try {
    response = await fetch(RENDER_PDF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ jobCompletionId, mode: 'hard_save' }),
    })
  } catch (err) {
    // The row is committed before the server responds, so check the database
    // before claiming the report was lost. See reportPipeline for the full note.
    const recovered = await findRecentJobHardSave(jobCompletionId, startedAt)
    if (recovered) return recovered
    throw toJobReportNetworkError(err, RENDER_PDF_ENDPOINT)
  }

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

  let payload: Partial<HardSaveJobReportResult>
  try {
    payload = (await response.json()) as Partial<HardSaveJobReportResult>
  } catch {
    const recovered = await findRecentJobHardSave(jobCompletionId, startedAt)
    if (recovered) return recovered
    throw new HardSaveJobReportError('Render endpoint returned a malformed response', 500)
  }

  const { versionId, versionNumber, pdfStoragePath, htmlStoragePath, htmlHash } = payload
  if (
    typeof versionId !== 'string' ||
    typeof versionNumber !== 'number' ||
    !Number.isFinite(versionNumber) ||
    typeof pdfStoragePath !== 'string' ||
    typeof htmlStoragePath !== 'string' ||
    typeof htmlHash !== 'string'
  ) {
    throw new HardSaveJobReportError(
      'Render endpoint succeeded but returned incomplete version metadata',
      500,
    )
  }

  return {
    versionId,
    versionNumber,
    pdfStoragePath,
    htmlStoragePath,
    htmlHash,
    bucket: payload.bucket ?? REPORT_PDFS_BUCKET,
    fileSizeBytes: typeof payload.fileSizeBytes === 'number' ? payload.fileSizeBytes : 0,
    signedUrl: typeof payload.signedUrl === 'string' ? payload.signedUrl : null,
  }
}

async function findRecentJobHardSave(
  jobCompletionId: string,
  sinceIso: string,
): Promise<HardSaveJobReportResult | null> {
  const { data, error } = await supabase
    .from('job_completion_pdf_versions')
    .select('id, version_number, pdf_storage_path, html_storage_path, html_hash, file_size_bytes')
    .eq('job_completion_id', jobCompletionId)
    .eq('generation_type', 'hard_save')
    .not('pdf_storage_path', 'is', null)
    .gte('created_at', sinceIso)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const row = data as unknown as {
    id: string
    version_number: number
    pdf_storage_path: string
    html_storage_path: string | null
    html_hash: string | null
    file_size_bytes: number | null
  }
  return {
    versionId: row.id,
    versionNumber: row.version_number,
    pdfStoragePath: row.pdf_storage_path,
    htmlStoragePath: row.html_storage_path ?? '',
    htmlHash: row.html_hash ?? '',
    bucket: REPORT_PDFS_BUCKET,
    fileSizeBytes: row.file_size_bytes ?? 0,
    signedUrl: null,
  }
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
  file_size_bytes: number | null
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
    .select('id, version_number, pdf_storage_path, html_storage_path, html_hash, file_size_bytes, created_at')
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
