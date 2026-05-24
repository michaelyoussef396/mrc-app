# PDF Pipeline Rebuild — Living Tracking Doc

**Approved:** 2026-05-24
**Branch policy:** main only (Vercel preview); never push to production this build
**Shared DB note:** single Supabase project (`ecyivrxjpsmjmexqatym`) serves both preview and production until L4 ships. All DB changes this build are ADDITIVE only. All preview-phase writes use designated TEST LEADS only.

> Full architectural plan: see `~/.claude/plans/warm-shimmying-meerkat.md`. This doc tracks live execution.

## Phase 0 — Determinism Audit (read-only) ✅ STATIC PASS COMPLETE
- [x] Static audit: grep the EF + template for volatile patterns (timestamps, nonces, ordering)
- [ ] Live audit: confirm with two real EF calls once Phase 4a deploys `previewOnly` (this is a check-as-we-go, not a blocking gate — static audit already isolated the single source)
- [x] Catalogue every volatile field + chosen normalization strategy below
- [x] GATE PASSED: the one volatile vector (signed-URL query strings) is reliably normalizable via regex strip

### Volatile content catalogue

| Field | Source | Strategy |
|---|---|---|
| Photo signed URL `?token=...&expires=...` query strings | `createSignedUrl(storagePath, 3600)` in `generate-inspection-pdf/index.ts:1744` populates `photoSignedUrls` map; `getPhotoUrl()` (:914-916) returns URLs that are then substituted into `{{cover_photo_url}}`, area photo placeholders, etc. Each EF call generates fresh tokens + expirations. | `normalizeHtmlForHash()` strips the query string from any URL pointing at the Supabase storage host (`/storage/v1/object/sign/` or `/storage/v1/object/public/`) before SHA-256. The bucket-relative path remains intact — that's the stable identifier of "which photo is in this slot". |
| Inline `inspection_date` | `formatDate(inspection.inspection_date)` substituted at :1315 | **Stable** — sourced from `inspections.inspection_date` column. Same input → same output. No normalization needed. |
| Asset/font absolute paths | `ASSET_BASE` constant via `.replace()` at :1305-1310 | **Stable** — constant. |
| `<script>` tags in template | None (verified: `grep -c '<script' /tmp/mrc-template.html` returned `0`) | **No JS volatility.** |
| `pdf_generated_at` / `Date.now()` / response `generatedAt` | EF runtime — used for DB write metadata, response JSON, storage filename suffix | **Not in HTML.** Verified: all 4 hits at :1825, :1835, :1873, :1904 are response/persistence metadata, never substituted into `populatedHtml`. |
| Template placeholders (41 unique `{{...}}` tokens) | All map to inspection/lead/photo data | **Stable for stable input** — see full list in static-audit notes. |
| Safety net: unreplaced `{{...}}` stripped at :1815 | `.replace(/\{\{[a-zA-Z_]+\}\}/g, '')` | **Stable** — same input → same set of unreplaced tokens. |

### Normalization rule (Phase 3 will implement this)
```ts
// strip query strings from supabase storage URLs before hashing
const SIGNED_URL_RE = /(https?:\/\/[^\/\s"']+\/storage\/v1\/object\/(?:sign|public)\/[^?"'\s]+)\?[^"'\s]*/g
const normalized = html.replace(SIGNED_URL_RE, '$1')
```

## Phase 1 — Schema (ADDITIVE migration → shared DB) — ⚠️ APPLY APPROVAL PENDING
- [x] New migration `supabase/migrations/20260524044234_pdf_versions_pipeline_columns.sql` with 6 ADD COLUMNs + 1 CHECK constraint + 2 partial indexes
- [ ] **Apply to `ecyivrxjpsmjmexqatym` — BLOCKED: auto-mode classifier requires explicit user approval to apply schema to shared prod DB**
- [ ] Verify columns via `information_schema.columns` (post-apply)
- [ ] Verify `StalePdfBanner` still renders correctly (post-apply)
- [ ] Regenerate `src/integrations/supabase/types.ts` (post-apply)
- [x] `tsc --noEmit` clean (migration file is SQL, no TS impact)

## Phase 2 — Renderer Auth Hardening + Service-Role Removal ✅ CODE COMPLETE
- [x] `api/render-pdf.ts`: replaced service-role client with caller-JWT client
- [x] Added `has_role(_user_id, _role_name='admin')` check via caller-JWT RPC; 403 on failure
- [x] Updated log lines to include inspection id + caller id
- [x] Verified storage RLS on `inspection-reports` (PUBLIC + authenticated SELECT — no policy migration needed)
- [x] `security-reviewer` agent on diff — 4 findings (1 HIGH, 1 MEDIUM, 2 LOW) all fixed:
  - HIGH: catch block was leaking puppeteer error text → generic "PDF render failed" response
  - MEDIUM: CORS `*` wildcard → allowlist with prod + vercel.app preview origins
  - LOW: path-traversal hardening on extracted storage key + tightened STORAGE_PATH_REGEX
  - LOW: dropped GET method, POST only
- [ ] Re-test `/admin/render-test` end-to-end on preview (needs deploy)
- [ ] Delete `SUPABASE_SERVICE_ROLE_KEY` from Vercel Preview env (after preview deploy proves render-pdf doesn't need it)
- [x] `tsc --noEmit` clean

## Phase 3 — HTML Normalization + Hash Helper ✅ COMPLETE
- [x] `src/lib/utils/reportHash.ts` (normalize signed-URL query strings + SHA-256)
- [x] `supabase/functions/_shared/reportHash.ts` (Deno mirror, identical implementation — both use Web Crypto)
- [x] `src/lib/utils/reportHash.test.ts` — 10 tests covering determinism, signed-URL invariance, content sensitivity, edge cases
- [x] `npx vitest run src/lib/utils/reportHash.test.ts` — 10/10 passed

## Phase 4a — `previewOnly: true` Flag on `generate-inspection-pdf` ✅ CODE COMPLETE
- [x] Add flag to `RequestBodySchema` (additive, optional, default false)
- [x] Handler destructures `previewOnly`; `returnHtml = returnHtmlRaw || previewOnly`
- [x] Early-return branch before existing returnHtml branch; skips inspections UPDATE, bucket upload, pdf_versions INSERT
- [x] `security-reviewer` on diff → MEDIUM finding (EF reads via service-role bypassing RLS; previewOnly leaves no audit) fixed by adding `has_role` admin gate inside the previewOnly branch + 401 on unauthenticated. 2 LOW findings logged to TODO (PDF-CL7 = audit log for preview reads; non-versioned `version: null` contract documented inline)
- [ ] **Deploy EF — needs user approval (high-risk EF push per brief)**
- [ ] Smoke test post-deploy: legacy default still works; previewOnly returns HTML without side effects

## Phase 4b — Hard-Save Download ✅ CODE COMPLETE
- [x] `api/render-pdf.ts` gains `mode: 'hard_save'`: previewOnly EF call → hash → render PDF → upload PDF+HTML → race-safe INSERT pdf_versions row → return metadata in `X-Mrc-*` response headers + PDF bytes in body
- [x] `renderPdfFromHtml()` helper extracted so legacy + hard_save modes share Chromium code
- [x] Best-effort orphan cleanup on partial-upload failures
- [x] `src/lib/api/reportPipeline.ts` `hardSaveReport()` + `downloadBlobAs()` helpers
- [x] `handleDownload` (inspection branch) rewired to `hardSaveReport()` + browser-download blob; removed print-window dance + `setShowPdfUpload(true)` line
- [x] `reportPipeline.test.ts` — 6 tests (success, no-session, server-error, missing-headers, invalid-version-number, request-shape) all green
- [ ] Manual smoke at 375px on TEST LEAD — pending preview deploy

## Phase 5 — Send-Time Mismatch Guard ✅ CODE COMPLETE
- [x] `checkSendMismatch()` + `downloadVersionPdfAsBase64()` + `markVersionEmailed()` helpers
- [x] `MismatchSendDialog.tsx` — shadcn AlertDialog, 3 CTAs (cancel / send v{N} as-is / hard-save fresh & send), all ≥48px, mobile-first
- [x] `handleSendEmail` (inspection branch) rewired: pre-check → match path → `performInspectionSend(version)`; mismatch → dialog; no_hard_save → toast + abort
- [x] `performInspectionSend()` extracted so both paths share the actual send code
- [x] `handleMismatchChoice()` orchestrates user choice; successful send marks `was_emailed=true, emailed_at=NOW()` on the version row
- [x] Dialog mounted in JSX
- [ ] Manual smoke at 375px on TEST LEAD — pending preview deploy

## Phase 6 — Manual Upload as Explicit Fallback ✅ CODE COMPLETE
- [x] `handlePdfUpload` rewritten: unique timestamped path (`{id}/manual-v-{ts}.pdf`), no upsert
- [x] Race-safe pdf_versions INSERT with `generation_type='manual_upload_fallback'`
- [x] `inspections.pdf_blob_url` still updated for back-compat (deprecation tracked PDF-CL4)
- [x] Toast surfaces assigned version number
- [ ] Manual smoke at 375px on TEST LEAD — pending preview deploy

## Phase 7 — Version History UI ✅ CODE COMPLETE
- [x] `getPDFVersionHistory()` returns the 6 new columns
- [x] `ReportVersionHistory.tsx` — mobile-first card list <md, table ≥md, generation_type badge, was_emailed badge, Download button per row (disabled for legacy NULL rows)
- [x] Wired into `handleShowVersions()` (inspection branch); job branch keeps legacy switcher untouched (scope: inspection only)
- [x] Australia/Melbourne DD/MM/YYYY HH:mm formatting
- [ ] Manual smoke at 375px + 1920px — pending preview deploy
- Note: RTL Vitest deferred (component is read-only DB + storage download, low risk)

## Phase 8 — Wrap-Up + Tracking ✅ COMPLETE
- [x] Updated `CLAUDE.md` Current State + Deep Docs index pointer to this file
- [x] Added 7 post-launch cleanup items (PDF-CL1..7) to `docs/TODO.md`
- [x] This plan doc kept in sync as each phase closed

## Verification (post all phases)
See plan file §Verification — 10 checks covering schema, hard-save, hash provenance, mismatch paths, manual fallback, history, auth (incl. service-role removal), build, security review.

## Final Build Snapshot (2026-05-24)

- Files written / modified:
  - `supabase/migrations/20260524044234_pdf_versions_pipeline_columns.sql` (NEW)
  - `api/render-pdf.ts` (MODIFIED — Phase 2 hardening + Phase 4b hard_save mode)
  - `api/_shared/reportHash.ts` (NEW — Node mirror)
  - `supabase/functions/generate-inspection-pdf/index.ts` (MODIFIED — previewOnly flag + admin gate)
  - `supabase/functions/_shared/reportHash.ts` (NEW — Deno mirror)
  - `src/lib/utils/reportHash.ts` (NEW — browser canonical) + `reportHash.test.ts` (10 tests)
  - `src/lib/api/reportPipeline.ts` (NEW) + `reportPipeline.test.ts` (6 tests)
  - `src/lib/api/pdfGeneration.ts` (MODIFIED — extended SELECT)
  - `src/components/pdf/MismatchSendDialog.tsx` (NEW)
  - `src/components/pdf/ReportVersionHistory.tsx` (NEW)
  - `src/pages/ViewReportPDF.tsx` (MODIFIED — handleDownload, handleSendEmail, handlePdfUpload, version history panel, dialog mount, performInspectionSend + handleMismatchChoice helpers)
  - `docs/TODO.md` (MODIFIED — added PDF-CL1..7)
  - `CLAUDE.md` (MODIFIED — Current State + Deep Docs)
  - `docs/PDF_PIPELINE_PLAN.md` (NEW — this file)

- Tests: 16/16 passing across 2 spec files. `tsc --noEmit` clean across all changes.

- Outstanding deploys (BOTH require user approval):
  1. Apply migration `20260524044234_pdf_versions_pipeline_columns.sql` to shared `ecyivrxjpsmjmexqatym`
  2. Deploy `generate-inspection-pdf` EF (`npx supabase functions deploy generate-inspection-pdf --project-ref ecyivrxjpsmjmexqatym`)
  3. Vercel preview will auto-deploy `api/render-pdf.ts` + frontend changes on push to main
  4. After preview proves out: delete `SUPABASE_SERVICE_ROLE_KEY` (Preview scope) from Vercel env
