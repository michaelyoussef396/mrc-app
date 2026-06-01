// Server-rendered job-completion-report PDF endpoint. Mirrors api/render-pdf.ts
// (the inspection-side equivalent) with these intentional deltas:
//
//   * Only hard_save mode — no legacy bucket-read mode. Jobs don't have an
//     /admin/render-test surface and don't need a legacy fallback in the
//     endpoint; the legacy generate-job-report-pdf EF write path is still
//     available as the cheap HTML refresh used by handleGenerate.
//   * inspectionId → jobCompletionId throughout, including storage paths and
//     pdf_versions / job_completion_pdf_versions tables.
//   * Calls generate-job-report-pdf EF with { previewOnly: true } to source
//     fresh, side-effect-free HTML.
//
// Identical to inspection: caller-JWT auth + has_role('admin') gate (no
// service-role usage), Chromium spawn via @sparticuz/chromium + puppeteer-core,
// hash via api/_shared/reportHash.js, race-safe pdf_versions INSERT with retry
// on 23505, X-Mrc-* response headers expose version metadata.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
// Vercel nodejs24.x compiles api/**/*.ts and runs the output as ESM, where
// relative imports require the explicit `.js` extension that resolves to the
// emitted file at runtime. Local `tsc` is fine without it; Vercel is not.
import { hashHtml } from './_shared/reportHash.js';

export const config = { runtime: 'nodejs' } as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VIEWPORT_WIDTH = 794;   // A4 portrait at 96 DPI
const VIEWPORT_HEIGHT = 1123;
const DEVICE_SCALE_FACTOR = 2;

const REPORT_PDFS_BUCKET = 'report-pdfs';
const MAX_VERSION_INSERT_ATTEMPTS = 3;

type RenderMode = 'hard_save';

// Origins permitted to call this admin endpoint via CORS. Anything else gets
// a same-origin-only posture (no CORS headers).
const ALLOWED_ORIGINS = new Set<string>([
  'https://mrcsystem.com',
  'https://www.mrcsystem.com',
]);
function allowedOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (typeof origin !== 'string') return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Vercel preview deploys: mrc-app-<hash>-<scope>.vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return origin;
  return null;
}

interface SupabaseEnv {
  url: string;
  anonKey: string;
}

function readEnv(): SupabaseEnv | { error: string } {
  // VITE_-prefixed names are the project's existing public vars in Vercel; don't rename to
  // non-prefixed — they don't exist there. Service-role key is intentionally NOT read here
  // (parity with api/render-pdf.ts Phase 2: god-key removed from the edge).
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { error: 'Server misconfigured: missing Supabase env vars' };
  }
  return { url, anonKey };
}

function extractBearer(req: VercelRequest): string | null {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

interface ParsedBody {
  jobCompletionId: string;
  mode: RenderMode;
}

function readBody(req: VercelRequest): ParsedBody | null {
  const body = req.body as { jobCompletionId?: unknown; mode?: unknown } | undefined;
  if (!body || typeof body.jobCompletionId !== 'string') return null;
  // Only hard_save is supported. We accept the field for parity with the
  // inspection endpoint shape but reject any other value explicitly so
  // callers can't silently get unexpected behavior.
  if (body.mode !== undefined && body.mode !== 'hard_save') return null;
  return { jobCompletionId: body.jobCompletionId, mode: 'hard_save' };
}

function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = allowedOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

async function renderPdfFromHtml(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45_000 });
    await page.evaluateHandle('document.fonts.ready');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return pdf;
  } finally {
    await browser.close().catch((closeErr) => {
      console.error('[render-job-report-pdf] browser close failed', closeErr);
    });
  }
}

async function fetchFreshHtmlViaEf(
  supabaseUrl: string,
  callerToken: string,
  jobCompletionId: string,
): Promise<{ html: string } | { error: string; status: number }> {
  const efUrl = `${supabaseUrl}/functions/v1/generate-job-report-pdf`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(efUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerToken}`,
      },
      body: JSON.stringify({ jobCompletionId, previewOnly: true }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[render-job-report-pdf] previewOnly EF failed', {
        jobCompletionId,
        status: response.status,
        body: text.slice(0, 200),
      });
      return { error: 'Fresh HTML fetch failed', status: 502 };
    }
    const payload = (await response.json()) as { html?: unknown };
    if (typeof payload.html !== 'string' || payload.html.length === 0) {
      return { error: 'EF returned empty HTML', status: 502 };
    }
    return { html: payload.html };
  } catch (err) {
    console.error('[render-job-report-pdf] previewOnly EF threw', { jobCompletionId, err });
    return { error: 'Fresh HTML fetch failed', status: 502 };
  } finally {
    clearTimeout(timeout);
  }
}

interface InsertedVersion {
  versionId: string;
  versionNumber: number;
}

async function insertHardSaveVersion(
  client: SupabaseClient,
  jobCompletionId: string,
  pdfStoragePath: string,
  htmlStoragePath: string,
  htmlHash: string,
  fileSizeBytes: number,
  callerId: string,
): Promise<InsertedVersion | { error: string }> {
  for (let attempt = 1; attempt <= MAX_VERSION_INSERT_ATTEMPTS; attempt++) {
    const { data: maxRow, error: maxError } = await client
      .from('job_completion_pdf_versions')
      .select('version_number')
      .eq('job_completion_id', jobCompletionId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) {
      console.error('[render-job-report-pdf] version max lookup failed', { jobCompletionId, err: maxError });
      return { error: 'Version lookup failed' };
    }
    const nextVersion = (maxRow?.version_number ?? 0) + 1;
    const { data, error } = await client
      .from('job_completion_pdf_versions')
      .insert({
        job_completion_id: jobCompletionId,
        version_number: nextVersion,
        pdf_storage_path: pdfStoragePath,
        html_storage_path: htmlStoragePath,
        html_hash: htmlHash,
        file_size_bytes: fileSizeBytes,
        generation_type: 'hard_save',
        generated_by: callerId,
      })
      .select('id, version_number')
      .single();
    if (!error && data) {
      return { versionId: data.id as string, versionNumber: data.version_number as number };
    }
    // 23505 = unique_violation (someone else inserted between SELECT and INSERT)
    const errCode = (error as { code?: string } | null)?.code;
    if (errCode !== '23505') {
      console.error('[render-job-report-pdf] version insert failed', { jobCompletionId, attempt, err: error });
      return { error: 'Version insert failed' };
    }
    // Retry on race.
  }
  return { error: 'Version insert exhausted retries' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const env = readEnv();
  if ('error' in env) {
    console.error('[render-job-report-pdf]', env.error);
    return res.status(500).json({ error: env.error });
  }

  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  // One supabase client, bound to the caller's JWT. Used for auth, role check,
  // DB reads, and storage upload — every SQL/Storage call goes through RLS
  // as the caller, not service-role.
  const callerClient = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
  const callerId = userData.user.id;

  const { data: isAdmin, error: roleError } = await callerClient.rpc('has_role', {
    _user_id: callerId,
    _role_name: 'admin',
  });
  if (roleError) {
    console.error('[render-job-report-pdf] has_role lookup failed', { callerId, err: roleError });
    return res.status(500).json({ error: 'Role lookup failed' });
  }
  if (!isAdmin) {
    console.warn('[render-job-report-pdf] non-admin caller blocked', { callerId });
    return res.status(403).json({ error: 'Admin role required' });
  }

  const parsedBody = readBody(req);
  if (!parsedBody || !UUID_REGEX.test(parsedBody.jobCompletionId)) {
    return res.status(400).json({ error: 'jobCompletionId must be a UUID' });
  }
  const { jobCompletionId } = parsedBody;

  const { data: jobCompletion, error: jobError } = await callerClient
    .from('job_completions')
    .select('job_number')
    .eq('id', jobCompletionId)
    .maybeSingle();

  if (jobError) {
    console.error('[render-job-report-pdf] job_completion lookup failed', { callerId, jobCompletionId, err: jobError });
    return res.status(500).json({ error: 'Job completion lookup failed' });
  }
  if (!jobCompletion) {
    return res.status(404).json({ error: 'Job completion not found' });
  }

  // === Source the HTML ============================================
  const fresh = await fetchFreshHtmlViaEf(env.url, token, jobCompletionId);
  if ('error' in fresh) {
    return res.status(fresh.status).json({ error: fresh.error });
  }
  const html = fresh.html;

  // === Render PDF =================================================
  let pdf: Uint8Array;
  try {
    pdf = await renderPdfFromHtml(html);
  } catch (err) {
    // Server-side log carries the full error; response is generic so puppeteer
    // internal paths or HTML fragments cannot leak to the caller.
    console.error('[render-job-report-pdf] render failed', { callerId, jobCompletionId, err });
    return res.status(500).json({ error: 'PDF render failed' });
  }

  const filenameJob = jobCompletion.job_number ?? 'Report';
  const downloadFilename = `MRC-${filenameJob}-Job-Report.pdf`;

  // === Hash + upload + version row + metadata headers ==================
  let htmlHash: string;
  try {
    htmlHash = await hashHtml(html);
  } catch (err) {
    console.error('[render-job-report-pdf] hash failed', { callerId, jobCompletionId, err });
    return res.status(500).json({ error: 'Hash failed' });
  }

  // Find next version number for path naming (the INSERT helper recomputes
  // this internally race-safely; here we just need a path label that's
  // unique enough — use timestamp suffix to avoid collisions on retry).
  const filenameTimestamp = Date.now();
  const pdfStorageKey = `${jobCompletionId}/v-${filenameTimestamp}.pdf`;
  const htmlStorageKey = `${jobCompletionId}/v-${filenameTimestamp}.html`;

  const pdfUpload = await callerClient.storage
    .from(REPORT_PDFS_BUCKET)
    .upload(pdfStorageKey, Buffer.from(pdf), {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (pdfUpload.error) {
    console.error('[render-job-report-pdf] pdf upload failed', { callerId, jobCompletionId, err: pdfUpload.error });
    return res.status(500).json({ error: 'PDF storage upload failed' });
  }

  const htmlUpload = await callerClient.storage
    .from(REPORT_PDFS_BUCKET)
    .upload(htmlStorageKey, html, {
      contentType: 'text/html',
      upsert: false,
    });
  if (htmlUpload.error) {
    console.error('[render-job-report-pdf] html upload failed', { callerId, jobCompletionId, err: htmlUpload.error });
    // Best-effort cleanup of the orphan PDF so we don't leave half-rows.
    await callerClient.storage.from(REPORT_PDFS_BUCKET).remove([pdfStorageKey]).catch(() => undefined);
    return res.status(500).json({ error: 'HTML storage upload failed' });
  }

  const inserted = await insertHardSaveVersion(
    callerClient,
    jobCompletionId,
    pdfStorageKey,
    htmlStorageKey,
    htmlHash,
    pdf.length,
    callerId,
  );
  if ('error' in inserted) {
    await callerClient.storage.from(REPORT_PDFS_BUCKET).remove([pdfStorageKey, htmlStorageKey]).catch(() => undefined);
    return res.status(500).json({ error: inserted.error });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // Surface version metadata so the client can show toast + history without
  // a follow-up DB roundtrip. CORS expose lets the browser fetch read them.
  res.setHeader('Access-Control-Expose-Headers',
    'X-Mrc-Version-Id, X-Mrc-Version-Number, X-Mrc-Pdf-Storage-Path, X-Mrc-Html-Storage-Path, X-Mrc-Html-Hash');
  res.setHeader('X-Mrc-Version-Id', inserted.versionId);
  res.setHeader('X-Mrc-Version-Number', String(inserted.versionNumber));
  res.setHeader('X-Mrc-Pdf-Storage-Path', pdfStorageKey);
  res.setHeader('X-Mrc-Html-Storage-Path', htmlStorageKey);
  res.setHeader('X-Mrc-Html-Hash', htmlHash);
  return res.status(200).send(Buffer.from(pdf));
}
