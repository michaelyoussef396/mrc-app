// Supabase Edge Function: check-photo-moisture-orphans
//
// Detects photos that were uploaded against a moisture reading but whose
// moisture_reading_id FK was never written (BUG-026 — retroactive-link race).
//
// A photo is considered a candidate orphan when ALL of these are true:
//   1. deleted_at IS NULL              — not soft-deleted
//   2. moisture_reading_id IS NULL     — FK was never linked
//   3. created_at < NOW() - INTERVAL '1 hour'  — past the grace period for
//                                        fresh uploads that haven't been saved yet
//   4. caption matches the moisture sentinel pattern:
//        caption = 'moisture'  (exact sentinel set by TechnicianInspectionForm)
//        OR caption matches /\d+(\.\d+)?%/  (percentage value e.g. "42.5%")
//      See: src/pages/TechnicianInspectionForm.tsx — `finalCaption = 'moisture'`
//      and DB query confirming the only linked caption is the literal "moisture".
//
// Invocation:
//   POST /functions/v1/check-photo-moisture-orphans
//   Authorization: Bearer <SERVICE_ROLE_KEY or anon key with appropriate RLS>
//
// Returns:
//   { checked_count: number, orphans_found: number, orphan_ids: string[] }
//
// DO NOT add a pg_cron schedule in this file — cron wiring is a separate ops step.
// Deploy: npx supabase functions deploy check-photo-moisture-orphans --project-ref ecyivrxjpsmjmexqatym

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ---------------------------------------------------------------------------
// Orphan caption pattern
//
// Two patterns identify photos intended to document a moisture reading:
//   1. Exact sentinel "moisture" — set by TechnicianInspectionForm line ~3146:
//        const finalCaption = readingId ? 'moisture' : caption
//   2. Percentage value like "42%", "42.5%" — numeric readings techs sometimes
//      type manually.
//
// The regex is intentionally liberal (false positives generate warnings only;
// false negatives silently miss real orphans which is the worse outcome).
// ---------------------------------------------------------------------------
const MOISTURE_CAPTION_RE = /^moisture$|\d+(\.\d+)?%/i;

interface OrphanPhoto {
  id: string;
  caption: string | null;
  area_id: string | null;
  inspection_id: string | null;
  created_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[check-photo-moisture-orphans] Missing required env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration — required env vars not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Service role bypasses RLS — required to read all photos across all inspections.
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Query: photos that are unlinked, not soft-deleted, past the 1-hour grace period.
    // We fetch caption so we can apply the pattern filter in JS — avoids a complex
    // SIMILAR TO / regex clause in PostgREST which has limited regex support.
    const { data: candidates, error: queryError } = await supabase
      .from('photos')
      .select('id, caption, area_id, inspection_id, created_at')
      .is('moisture_reading_id', null)
      .is('deleted_at', null)
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('[check-photo-moisture-orphans] Query error:', queryError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query photos', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = (candidates ?? []) as OrphanPhoto[];
    const checked_count = rows.length;

    // Apply the caption pattern filter to isolate moisture-reading candidates.
    const orphans = rows.filter(
      (p) => p.caption !== null && MOISTURE_CAPTION_RE.test(p.caption)
    );

    // Emit a structured warning for each orphan so Supabase function logs
    // (and any future log-drain integration) can surface them.
    for (const orphan of orphans) {
      console.warn(
        `[BUG-026] Orphaned moisture photo detected:`,
        JSON.stringify({
          photo_id: orphan.id,
          caption: orphan.caption,
          area_id: orphan.area_id,
          inspection_id: orphan.inspection_id,
          created_at: orphan.created_at,
        })
      );
    }

    if (orphans.length > 0) {
      console.warn(
        `[BUG-026] check-photo-moisture-orphans: ${orphans.length} orphan(s) found out of ${checked_count} unlinked candidates.`
      );
    } else {
      console.log(
        `[check-photo-moisture-orphans] Clean run — ${checked_count} unlinked candidates checked, 0 moisture orphans found.`
      );
    }

    return new Response(
      JSON.stringify({
        checked_count,
        orphans_found: orphans.length,
        orphan_ids: orphans.map((o) => o.id),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[check-photo-moisture-orphans] Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
