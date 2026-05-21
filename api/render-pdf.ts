// Phase 1 fidelity-test endpoint. Renders the EF-produced inspection HTML to
// PDF server-side via headless Chromium so we can compare against the existing
// browser-print output. Not wired into the email send / Download default path
// yet — that's Phase 2.
//
// Flow: POST { inspectionId } → verify Supabase JWT → service-role-read the
// HTML from inspection-reports bucket → puppeteer + @sparticuz/chromium →
// stream PDF back with Content-Disposition: attachment.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = { runtime: 'nodejs' } as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_PATH_REGEX = /inspection-reports\/(.+)$/;

const VIEWPORT_WIDTH = 794;   // A4 portrait at 96 DPI
const VIEWPORT_HEIGHT = 1123;
const DEVICE_SCALE_FACTOR = 2;

interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceKey: string;
}

function readEnv(): SupabaseEnv | { error: string } {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return { error: 'Server misconfigured: missing Supabase env vars' };
  }
  return { url, anonKey, serviceKey };
}

function extractBearer(req: VercelRequest): string | null {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function readInspectionId(req: VercelRequest): string | null {
  if (req.method === 'POST') {
    const body = req.body as { inspectionId?: unknown } | undefined;
    if (body && typeof body.inspectionId === 'string') return body.inspectionId;
    return null;
  }
  const q = req.query?.inspectionId;
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && typeof q[0] === 'string') return q[0];
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(204).end();
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const env = readEnv();
  if ('error' in env) {
    console.error('[render-pdf]', env.error);
    return res.status(500).json({ error: env.error });
  }

  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  const authClient = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  const inspectionId = readInspectionId(req);
  if (!inspectionId || !UUID_REGEX.test(inspectionId)) {
    return res.status(400).json({ error: 'inspectionId must be a UUID' });
  }

  const serviceClient = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: inspection, error: inspectionError } = await serviceClient
    .from('inspections')
    .select('pdf_url, job_number')
    .eq('id', inspectionId)
    .maybeSingle();

  if (inspectionError) {
    console.error('[render-pdf] inspection lookup failed', inspectionError);
    return res.status(500).json({ error: 'Inspection lookup failed' });
  }
  if (!inspection) {
    return res.status(404).json({ error: 'Inspection not found' });
  }
  if (!inspection.pdf_url) {
    return res.status(404).json({
      error: 'Inspection has no pdf_url yet — generate the report first',
    });
  }

  const pathMatch = String(inspection.pdf_url).match(STORAGE_PATH_REGEX);
  if (!pathMatch) {
    return res.status(500).json({
      error: 'Unexpected pdf_url shape — could not extract storage path',
    });
  }

  const { data: htmlBlob, error: downloadError } = await serviceClient.storage
    .from('inspection-reports')
    .download(pathMatch[1]);
  if (downloadError || !htmlBlob) {
    console.error('[render-pdf] storage download failed', downloadError);
    return res.status(500).json({ error: 'Failed to fetch inspection HTML' });
  }
  const html = await htmlBlob.text();

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

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

    const filenameJob = inspection.job_number ?? 'Report';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="MRC-${filenameJob}-Inspection-Report.pdf"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(pdf);
  } catch (err) {
    console.error('[render-pdf] render failed', err);
    const message = err instanceof Error ? err.message : 'Render failed';
    return res.status(500).json({ error: `PDF render failed: ${message}` });
  } finally {
    if (browser) {
      await browser.close().catch((closeErr) => {
        console.error('[render-pdf] browser close failed', closeErr);
      });
    }
  }
}
