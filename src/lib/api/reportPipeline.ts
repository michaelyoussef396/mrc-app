// Client wrapper for the server-side PDF pipeline.
//
// The render endpoint returns JSON metadata plus a short-lived signed URL —
// never PDF bytes. Vercel buffers a function's response body and caps it at
// ~4.5 MB, and every report this system produces is larger than that, so the
// old bytes-in-body contract reported failure on saves that had already
// succeeded. See docs/PDF_PIPELINE_PLAN.md.

import { supabase } from '@/integrations/supabase/client'
import { captureBusinessError } from '@/lib/sentry'
import { hashHtml } from '@/lib/utils/reportHash'

const RENDER_PDF_ENDPOINT = '/api/render-pdf'
const REPORT_PDFS_BUCKET = 'report-pdfs'
const NETWORK_ERROR_STATUS = 0

// Window searched for an already-committed version row when the request that
// created it died in flight. Generous enough to cover a slow Chromium render
// plus upload, tight enough that it can't match an unrelated earlier save.
const RECONCILE_WINDOW_MS = 5 * 60 * 1000

// Resend fetches the attachment itself, on its own schedule, and may retry —
// so an emailed report's URL has to outlive the request that created it.
// Deliberately longer than the 300s used for an immediate in-browser
// download: for that window an unguessable URL to a customer report is
// readable by anyone holding it.
export const RESEND_FETCH_TTL_SECONDS = 3600

// Resend caps a message at 40MB *after* base64 encoding, which inflates the
// payload by 4/3. Guard on the encoded size, because that is the number
// Resend actually measures.
const RESEND_MAX_EMAIL_BASE64_BYTES = 40 * 1024 * 1024
const BYTES_PER_MB = 1024 * 1024

export const HARD_SAVE_NETWORK_ERROR_MESSAGE =
  'Could not reach the PDF service. The report was NOT saved — check your connection and try again.'

export interface HardSaveResult {
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

export class HardSaveError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly serverError?: string,
  ) {
    super(message)
    this.name = 'HardSaveError'
  }
}

/**
 * The report was saved — only fetching the file back failed. Carries the
 * version so callers can say so instead of claiming the save was lost.
 */
export class PdfRetrievalError extends Error {
  constructor(
    message: string,
    public readonly versionId: string,
    public readonly versionNumber: number,
  ) {
    super(message)
    this.name = 'PdfRetrievalError'
  }
}

// Transport-level fetch failures (offline, DNS, blocked cross-origin
// redirect) throw TypeError, whose messages ("Failed to fetch" et al.) are
// on the Sentry ignoreErrors list — so report via captureBusinessError with
// a message that list can't match, and rethrow typed so callers surface it.
function toHardSaveNetworkError(err: unknown, endpoint: string): HardSaveError {
  captureBusinessError(`Hard-save endpoint unreachable: POST ${endpoint}`, {
    endpoint,
    origin: window.location.origin,
    cause: String(err),
  })
  return new HardSaveError(HARD_SAVE_NETWORK_ERROR_MESSAGE, NETWORK_ERROR_STATUS)
}

/**
 * Render-and-persist the inspection report. Returns the metadata of the
 * newly-written pdf_versions row; call fetchVersionPdfBlob to get the file.
 * Throws HardSaveError only when no version row exists.
 */
export async function hardSaveReport(inspectionId: string): Promise<HardSaveResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new HardSaveError('Not authenticated', 401)
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
      body: JSON.stringify({ inspectionId, mode: 'hard_save' }),
    })
  } catch (err) {
    // The server commits the version row before it responds, so a request
    // that dies in flight can still sit on top of a completed save. Ask the
    // database before telling anyone their report was lost — that false
    // claim is what drove six duplicate saves on 27 Aug.
    const recovered = await findRecentHardSave(inspectionId, startedAt)
    if (recovered) return recovered
    throw toHardSaveNetworkError(err, RENDER_PDF_ENDPOINT)
  }

  if (!response.ok) {
    let serverError: string | undefined
    try {
      const payload = (await response.json()) as { error?: string }
      serverError = payload.error
    } catch {
      // ignore — body not JSON
    }
    throw new HardSaveError(
      serverError ?? `Render endpoint returned ${response.status}`,
      response.status,
      serverError,
    )
  }

  let payload: Partial<HardSaveResult>
  try {
    payload = (await response.json()) as Partial<HardSaveResult>
  } catch {
    const recovered = await findRecentHardSave(inspectionId, startedAt)
    if (recovered) return recovered
    throw new HardSaveError('Render endpoint returned a malformed response', 500)
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
    throw new HardSaveError('Render endpoint succeeded but returned incomplete version metadata', 500)
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

/**
 * Look for a hard-save row committed since `sinceIso`. Used to tell a save
 * that landed apart from one that did not, when the response never arrived.
 */
async function findRecentHardSave(
  inspectionId: string,
  sinceIso: string,
): Promise<HardSaveResult | null> {
  const { data, error } = await supabase
    .from('pdf_versions')
    .select('id, version_number, pdf_storage_path, html_storage_path, html_hash, file_size_bytes')
    .eq('inspection_id', inspectionId)
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

/**
 * Retrieve the saved PDF. Tries the server's signed URL first, then an
 * authenticated storage download — the same call ReportVersionHistory has
 * always used. Throws PdfRetrievalError, which reports a retrieval problem
 * without implying the save failed.
 */
export async function fetchVersionPdfBlob(saved: HardSaveResult): Promise<Blob> {
  if (saved.signedUrl) {
    try {
      const response = await fetch(saved.signedUrl)
      if (response.ok) return await response.blob()
      console.error('[reportPipeline] signed url fetch failed', {
        status: response.status,
        pdfStoragePath: saved.pdfStoragePath,
      })
    } catch (err) {
      console.error('[reportPipeline] signed url fetch threw', { err })
    }
  }

  const { data, error } = await supabase.storage
    .from(saved.bucket)
    .download(saved.pdfStoragePath)
  if (error || !data) {
    throw new PdfRetrievalError(
      `Saved v${saved.versionNumber}, but the file could not be downloaded: ${error?.message ?? 'unknown'}`,
      saved.versionId,
      saved.versionNumber,
    )
  }
  return data
}

// ============================================================================
// Send-time mismatch guard (Phase 5)
// ============================================================================

export interface HardSaveVersionRow {
  id: string
  version_number: number
  pdf_storage_path: string
  html_storage_path: string | null
  html_hash: string | null
  file_size_bytes: number | null
  created_at: string
}

export type MismatchResult =
  | { kind: 'no_hard_save' }
  | { kind: 'match'; version: HardSaveVersionRow }
  | { kind: 'mismatch'; version: HardSaveVersionRow; currentHash: string }

/**
 * Compare the latest hard-saved version's stored HTML hash against a freshly
 * re-rendered HTML for the same inspection. Used by handleSendEmail to gate
 * sends behind a "report data has drifted since v{N}" prompt.
 */
export async function checkSendMismatch(inspectionId: string): Promise<MismatchResult> {
  const { data: latest, error: latestError } = await supabase
    .from('pdf_versions')
    .select('id, version_number, pdf_storage_path, html_storage_path, html_hash, file_size_bytes, created_at')
    .eq('inspection_id', inspectionId)
    .eq('generation_type', 'hard_save')
    .not('pdf_storage_path', 'is', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Mismatch check: failed to load latest hard-save version: ${latestError.message}`)
  }
  if (!latest) {
    return { kind: 'no_hard_save' }
  }
  // Type assertion: SELECT picked these fields, but types.ts may not have
  // regenerated yet — we promised types in the interface.
  const version = latest as unknown as HardSaveVersionRow

  if (!version.html_hash) {
    // Pre-pipeline hard_save row missing the hash — treat as mismatch so the
    // admin is asked to re-save (and the new row gets the hash populated).
    const fresh = await fetchPreviewHtml(inspectionId)
    const currentHash = await hashHtml(fresh)
    return { kind: 'mismatch', version, currentHash }
  }

  const fresh = await fetchPreviewHtml(inspectionId)
  const currentHash = await hashHtml(fresh)
  return currentHash === version.html_hash
    ? { kind: 'match', version }
    : { kind: 'mismatch', version, currentHash }
}

async function fetchPreviewHtml(inspectionId: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    throw new Error('Mismatch check: not authenticated')
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-inspection-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ inspectionId, previewOnly: true }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Mismatch check: previewOnly EF returned ${response.status}${body ? ` — ${body.slice(0, 120)}` : ''}`)
  }
  const payload = (await response.json()) as { html?: unknown }
  if (typeof payload.html !== 'string') {
    throw new Error('Mismatch check: previewOnly EF returned no HTML')
  }
  return payload.html
}

// ============================================================================
// Storage retrieval helpers (shared with the job-report pipeline)
// ============================================================================

/**
 * Mint a link Resend can fetch the attachment from, so the PDF bytes never
 * travel through the browser or the email Edge Function's JSON body.
 */
export async function createVersionPdfSignedUrl(pdfStoragePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REPORT_PDFS_BUCKET)
    .createSignedUrl(pdfStoragePath, RESEND_FETCH_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    throw new Error(`Could not create a link to the report PDF: ${error?.message ?? 'unknown'}`)
  }
  return data.signedUrl
}

function formatMb(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

/**
 * Reject an attachment Resend will refuse. Base64 inflates the payload by
 * 4/3 and Resend's 40MB ceiling applies to the encoded size, so a ~30MB PDF
 * is the real limit. Rows predating file_size_bytes are let through — the
 * send will surface any problem itself rather than be blocked on no evidence.
 */
export function assertEmailableAttachment(fileSizeBytes: number | null, versionNumber: number): void {
  if (fileSizeBytes === null || fileSizeBytes <= 0) return
  const encodedBytes = Math.ceil(fileSizeBytes / 3) * 4
  if (encodedBytes > RESEND_MAX_EMAIL_BASE64_BYTES) {
    throw new Error(
      `Report v${versionNumber} is ${formatMb(fileSizeBytes)} (${formatMb(encodedBytes)} once encoded for email), ` +
      `over the ${formatMb(RESEND_MAX_EMAIL_BASE64_BYTES)} limit. It cannot be sent as an attachment.`,
    )
  }
}

/**
 * Download a stored version's PDF straight to the user's disk. Used by the
 * version-history list and by the hard-save download flow.
 */
export async function downloadStoredPdf(pdfStoragePath: string, filename: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(REPORT_PDFS_BUCKET)
    .download(pdfStoragePath)
  if (error || !data) {
    throw new Error(error?.message ?? 'Download failed')
  }
  downloadBlobAs(data, filename)
}

/**
 * Mark a hard-save version as emailed. Called after a successful send so the
 * version-history UI can show the badge.
 */
export async function markVersionEmailed(versionId: string): Promise<void> {
  const { error } = await supabase
    .from('pdf_versions')
    .update({ was_emailed: true, emailed_at: new Date().toISOString() })
    .eq('id', versionId)
  if (error) {
    // Log but don't throw — the send succeeded; we just lost the email-badge
    // signal for this version row. Worth knowing about but not user-facing.
    console.error('[reportPipeline] markVersionEmailed failed', { versionId, error })
  }
}

/**
 * Trigger a browser download for a PDF blob. Cleanly revokes the object URL
 * after the click handler runs.
 */
export function downloadBlobAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
