# Session log — 2026-09-12 — fix/job-report-pdf-memory

## Header

- Date: 2026-09-12 (Australia/Melbourne)
- Lane: C / PDF authoring window
- Branch: fix/job-report-pdf-memory
- Worktree: /Users/michaelyoussef/mrc-jobpdf
- Tool/model: Codex / GPT-6 (inherited session settings)
- Baseline commit: dedd0a35a59695d546d311b78b262b92f733dbe8 (requested base)
- Starting tree: clean; no existing log for this branch.
- Session id: no resumable thread id exposed by this harness.

## Intent

Fix P1-S-5 only: preserve version history on overlapping/repeated Edge Function generations. Investigate PDF-CL17 read-only; no photo-fetching change. Read author brief fully, then AGENTS.md, then TODO rows PDF-CL17, P1-S-5, T18 and T19.

## Touching

- `supabase/functions/generate-job-report-pdf/index.ts`
- `supabase/functions/generate-job-report-pdf/index.test.mjs`
- `docs/sessions/2026-09-12-fix-job-report-pdf-memory.md`
- `api/render-job-report-pdf.ts` is owned but expected to remain unchanged; working retry implementation read first.

## Baseline

- `nvm use 24`: command unavailable in this shell. Separate version check: default `node --version` = `v23.7.0`; `/Users/michaelyoussef/.nvm/versions/node/v24.20.0/bin/node --version` = `v24.20.0`. All subsequent Node commands use the absolute v24.20.0 interpreter.
- Lockfile-faithful `npm ci` running with writable cache `/private/tmp/mrc-jobpdf-npm-cache`; baseline tests and tsc pending before code changes.
- Inline dummy test env only: `VITE_SUPABASE_URL=https://localhost.invalid VITE_SUPABASE_ANON_KEY=dummy`. No env files or credentials created/read.
- T13 coverage caveat: `api/**` is in no tsconfig include; only imports from included tests can make API code reachable. Existing `src/lib/__tests__/renderJobReportPdf.*.test.ts` import this API handler, but this is not a general API gate. The owned Edge Function is also outside the app tsc gate; app tsc alone cannot validate its changes.
- Measured baseline: first npm ci failed DNS (`ENOTFOUND registry.npmjs.org`); copied npm content cache (not node_modules) into writable temp cache and reran `npm ci --offline`, successfully installing 1042 packages. Installed/pinned TypeScript both 5.8.3; lockfile unchanged.
- Full Vitest: **79 files / 1315 tests**, 78 files and 1314 tests pass; one failure: `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` (`blob.text is not a function`). Exit 1.
- App tsc: **100 error lines / 41 distinct normalized lines**, exit 2; normalized `(line,col)`-stripped baseline at `/private/tmp/mrc-jobpdf-tsc-baseline.normalized`. It includes the existing API TS2339 on `chromium.headless` through test imports; the Edge Function remains uncovered.

## Step log

- 09:28 · codex · [root] · preflight and baseline setup · author brief, AGENTS.md, requested TODO rows, API reference, EF, test config (read-only) · correct base and clean tree; npm ci started before code edits.
- 09:28 · codex · [root] · delegate read-only PDF-CL17 investigation · EF/API/template/upload source and public platform documentation · request payload measurements using only synthetic/local noncustomer material; no PROD access or CLI deploys; parent will record agent's log lines.
- 09:32 · codex · [root] · test-first P1-S-5 regression · `supabase/functions/generate-job-report-pdf/index.test.mjs` · baseline recorded; exercise shipped handler with Node type stripping, local Zod and in-memory clients. Forecast about 60 source / 80 test lines, within 150 total. Test runner is explicit Node because root Vitest only includes `src/**`; no config ownership expansion.
- 09:33 · codex · [root] · implement bounded history retry after regression red · `supabase/functions/generate-job-report-pdf/index.ts` · 4 failures / 1 expected preview guard pass shown before fix. Concurrent stale counter returned `[1,1]` instead of `[2,3]`; all three error cases returned HTTP 200 instead of 500. Keep preview/returnHtml branches; persist history before parent update, reread latest history on 23505, stop after 3 attempts.
- 09:34 · codex · [root] · mutation check and final gates · owned EF source/test · all 5 regressions passed after fix; measured 58 SOURCE lines (36 added / 22 deleted) + 83 TEST lines = 141 reviewable lines. Temporarily replace history-derived allocation with stale parent allocation, require test failure, restore in finally, rerun regression plus full Vitest and normalized tsc comparison.
- 09:35 · codex · [root] · record final gates and read-only investigation return; prepare local commit · both owned EF files and this log · no new baseline failures; timestamp labels above corrected against local output artifact times (red 09:32:33, green 09:33:37, mutation 09:34:23). Check exact diff, PII and explicit paths before staging; no push/deploy.
- 09:35 · codex · [memory_investigation] · PDF-CL17 source/primary-doc investigation and synthetic base payload measurement, recorded by parent · read EF/API, template, upload/preview/hash code and vercel.json; wrote only `/private/tmp/mrc-jobpdf-payload-measure.mjs` · Node v24.20.0; 20 × 350 KiB photos yielded 9,885,225-byte HTML / 9,886,582-byte JSON; 256 MB hosted EF memory limit verified; incident bytes and peak Deno memory unavailable. Agent was read-only in repo and could not append its own log line.
- 09:37 · codex · [root] · local commit `Fix job report history version retries` · exact three Touching paths (API unchanged) · explicit staging succeeded; staged mechanical count 141 (119 added / 22 deleted), whitespace check passed, diff/new files checked for PII and secrets (none). Commit this unit locally and stop; Claude review pending.

## Codex threads

- None printed.

## Evidence

Pre-fix regression command (Node v24.20.0): `node --test supabase/functions/generate-job-report-pdf/index.test.mjs`; exit 1, 5 tests, 1 pass / 4 fail. Full output: `/private/tmp/mrc-jobpdf-regression-red.log`. Failure names: overlapping regenerations preserve distinct history despite the same stale parent counter; retry exhaustion returns failure instead of silently dropping audit history; non-unique insert error returns failure instead of silently dropping audit history; history lookup error returns failure instead of silently dropping audit history. PreviewOnly guard was expected to pass and did. No test passed unexpectedly.

After fix: same command, 5 pass / 0 fail; `/private/tmp/mrc-jobpdf-regression-green.log`. The in-memory unique constraint forces attempts `[2,2,3]` against an existing history version 1 while both calls read `jc.pdf_version=0`. Both history rows retain caller attribution and completion id, and parent updates use the committed versions. Exhaustion is HTTP 500 with explicit `Version insert exhausted retries; retry report generation`; other insert/lookup errors fail immediately. No parent update is performed on these version failures. Hosted Deno/database integration has not been run; Node strips TS syntax and uses installed Zod for this runtime test, which is not Deno typechecking.

Mutation: changed allocation back to `(jc.pdf_version || 0) + 1`; exit 1, concurrency regression fails (returned versions undefined because retries exhausted instead of `[2,3]`), other 4 pass. Fixed source restored byte-for-byte in `finally`. Final explicit regression rerun: **5 pass / 0 fail**, exit 0. Outputs: `/private/tmp/mrc-jobpdf-regression-mutation.log`, `/private/tmp/mrc-jobpdf-regression-restored.log`.

Final full Vitest: **79 files / 1315 tests**, same 78 files / 1314 pass and exactly the same single `reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` failure, exit 1. New EF Node tests are separate, not silently included in that total. App tsc: **100 error lines / 41 distinct normalized lines**, exit 2; set comparison **0 added / 0 removed**. Logs: `/private/tmp/mrc-jobpdf-vitest-final.log`, `/private/tmp/mrc-jobpdf-tsc-final.log`. This is no regression in the app baseline, not a clean compiler gate and not Edge Function typechecking. API unchanged. `git diff --check` passes.

## PDF-CL17 — read-only investigation

**Incident payload and peak hosted memory are unknown.** The supplied 10 Sep 19:58 HTTP 546 / "Memory limit exceeded" on 20 photos is production evidence; no customer account/storage access was used to measure that incident. The measurements below are synthetic execution of the base `dedd0a3` EF preview handler and tracked template, not production measurements or a 546 reproduction.

The handler downloads six photos simultaneously and retains every base64 URI in a Map. Downloaded Blob data, ArrayBuffers, binary strings, base64, generated HTML and JSON serialization create multiple representations. A JPEG URI contains `23 + 4 * ceil(photoBytes / 3)` ASCII bytes; `Array.from` also temporarily creates numeric arrays during encoding. All selected photos are downloaded even if demolition is disabled or there are more than four demolition photos. Retained payload bytes cannot be equated with peak runtime memory or used as a safe photo-count threshold.

Method: Node **v24.20.0**, exact base handler source with TS stripped and remote imports/schema/I/O mocked; 20 unique JPEG-labelled synthetic blobs, 10 before / 10 after, no demolition; template read from `git show dedd0a3:src/templates/job-report-template.html`, **324,791 bytes**. No browser decoding or Deno memory profile. Real Storage template identity is unverified. Upload code aims at 1600px JPEG, quality 0.85 (`src/lib/offline/photoResizer.ts`), not a fixed byte ceiling.

| Bytes per photo | Total photo bytes | HTML UTF-8 bytes | JSON UTF-8 bytes |
|---|---:|---:|---:|
| 200 KiB | 4,096,000 | 5,789,225 | 5,790,582 |
| 350 KiB | 7,168,000 | 9,885,225 | 9,886,582 |
| 500 KiB | 10,240,000 | 13,981,225 | 13,982,582 |
| 1 MiB | 20,971,520 | 28,289,945 | 28,291,302 |

Replacing only those 20 URI strings **in scratch memory** with hypothetical 300-byte URLs gives HTML **333,405 bytes** and JSON **334,762 bytes**. URL size is an assumption, not a measured signed URL. No production code was changed. Reproduce locally while scratch file exists:

```sh
/Users/michaelyoussef/.nvm/versions/node/v24.20.0/bin/node /private/tmp/mrc-jobpdf-payload-measure.mjs
```

Relevant ceilings, verified against primary documentation:

- Supabase hosted Edge Functions: **256 MB memory**, and HTTP **546** for resource termination. The reported memory message places this incident at the EF memory layer; no hard body-size or image-count threshold was established. [Limits](https://supabase.com/docs/guides/functions/limits), [status codes](https://supabase.com/docs/guides/functions/status-codes).
- Vercel's **4.5 MB external request/response** limit produces **413**. HTML is fetched inside the handler and uploads go directly to Storage; the external API response carries metadata. That response-body cap is distinct from this EF failure. [Function limits](https://vercel.com/docs/functions/limitations).
- Local `vercel.json` specifies **1024 MB / 60 seconds**, no region override. Effective deployed settings were not read. T18's cross-region transfer and T19's independent 60s fetch / 45s setContent / other waits remain separate work; a platform timeout is a different failure from memory termination.

A signed-URL unit needs these decisions/tests before rollout:

1. Replace deduplicated photo downloads with signing; handle per-path failures and an explicit lifetime covering cold renders/retries. Inspector's existing 3600-second URLs are a reference, not proof of correct job-report lifetime. [Bulk signing](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls).
2. Resolve **durable HTML semantics**. EF uploads self-contained HTML to `inspection-reports`; `ViewReportPDF.tsx` later reopens it via `srcDoc`; API also archives source HTML. Expiring URLs would break later previews/history. Signing only `previewOnly` leaves the legacy EF memory path intact. [Storage URL expiry](https://supabase.com/docs/guides/storage/serving/downloads).
3. Add bounded photo loading/decoding before PDF capture. Current API waits for `domcontentloaded` and `document.fonts.ready`, neither guarantees network photos have loaded. Test delayed/failed/expired URLs in Chromium. [Image decoding](https://html.spec.whatwg.org/multipage/embedded-content.html).
4. Verify both app `srcDoc` and Chromium image access/CSP with the real signed host. Current `img-src` permits `https://*.supabase.co`, and tracked template has no CSP meta; no automatic CSP widening is indicated. Existing hash normalization strips signed URL queries.
5. Measure hosted memory on representative synthetic images and verify cold renders, retries and reopening older versions. Michael must provide incident byte-count telemetry or run a sanitized measurement to establish the actual production payload without exposing report content.

## Commands for Michael

Prepared only; DO NOT run until review and Michael's deployment decision:

```sh
supabase functions deploy generate-job-report-pdf --project-ref ctppzqnysmzynkxjlzta
```

## Scoped OUT and why

- PDF-CL17 implementation: signed URLs affect signing, expiry, CSP and render-time image loading; separate unit explicitly requested by Michael.
- T18 region and T19 deadline changes: separate units, read for investigation context only.
- Sharing API version code: direct import includes Node/Vercel/Chromium and is unsuitable for the Deno function. A runtime-neutral extraction is possible but changes the working API and deployment/import layout. Prefer a small local retry adaptation for this bounded fix; no cross-runtime refactor.
- No Supabase/Vercel CLI, PROD access, push, merge, PR or deployment. Claude reviews on return under the author brief.

## Open questions for Claude

- Review the local P1-S-5 unit on return; no deploy has occurred. Run the explicit Node test command above because root Vitest does not discover tests under `supabase/functions/`.
- Version allocation now uses persisted history even if the parent counter update fails. Existing parent-update errors are still only logged; returnHtml-only behavior and upload cleanup are unchanged. This unit guarantees bounded history allocation/error reporting, not a transaction spanning Storage, history and parent metadata. Filename version labels still use the pre-insert snapshot; committed row/response version uses the successful allocation.
- PDF-CL17 requires the persistence/lifetime decision above before implementation. No claim that synthetic byte totals reproduce the production memory termination.

## Review

- Deferred to Claude on return per dated author brief; no companion review in this authoring unit.
- Reviewable SOURCE / TEST line counts: **58 SOURCE** (36 added, 22 deleted) / **83 TEST** (all added), **141 total**, excluding this session log; within 150.

## Resume from here

Implementation, regression/mutation evidence, final gates and read-only memory investigation are complete; all three paths are staged for the local commit recorded above. Next human step: Claude review on return, then Michael decides whether to run the exact DEV deploy command. Verify local HEAD/status to confirm commit completion. No further implementation is authorized for PDF-CL17 in this unit.
