/**
 * Strip characters that `JSON.stringify` emits happily but PostgREST's strict
 * (aeson) JSON decoder rejects as invalid — surfacing as PGRST102
 * "Empty or invalid json" on insert:
 *   - lone/unpaired UTF-16 surrogates (e.g. a streamed emoji split mid-pair)
 *   - C0 control characters, except tab (0x09), newline (0x0A), carriage return (0x0D)
 *
 * Applied to AI-summary text fields before they are written to
 * `ai_summary_versions` (see InspectionAIReview save + generate-inspection-summary EF).
 *
 * SYNC: keep identical to supabase/functions/_shared/stripBadUnicode.ts. Two copies
 * exist only because the Vite frontend and the Deno edge function cannot import a
 * single shared module — do not let them drift. No `u` flag: the surrogate handling
 * relies on UTF-16 code-unit semantics.
 */
export const stripBadUnicode = (s: string): string =>
  s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
