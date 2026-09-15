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
- 09:42 · codex · [root] · answer Michael's post-acceptance delivery/history question before any behavior change · read job-report callers/history readers and P0-A sibling implementation; edit this log only · original unit committed as `227cd2e`; Michael accepted retry/test scope and requested explicit comparison with P0-A's degraded HTTP 200. Delegate independent read-only P0-A comparison; record deliberate duplication and the unresolved PDF-CL17 size/memory gap. No implementation change until answered.
- 09:45 · codex · [history_delivery_comparison] · independent read-only P0-A comparison returned, recorded by parent · sibling tracked source at `8a2fc99` and local legacy/hard-save clients · same conclusion: legacy EF should preserve usable report with degraded success; downstream email depends on separate API hard-save rows. Agent made no file changes or test runs and could not write its own log line.
- 09:45 · codex · [root] · commit answer and requested clarifications locally · this log only · source/test unchanged, source/test diff remains 58/83; log checked for PII and whitespace. No tests required for this documentation-only follow-up; no push, deploy or behavioral correction before Michael receives the answer.
- 09:54 · codex · [root] · implement Michael-authorized degraded-success correction, test-first · owned EF source/test and this log · clean starting HEAD `8f78e7d`; absolute Node prints `v24.20.0`. Change three history-error regressions to expect HTTP 200, `versionHistorySaved:false` and usable parent/response URL; keep concurrent allocation and preview guards. Forecast 62 SOURCE / 87 TEST = 149 total against `dedd0a3`, within cap. Delegate read-only verification of the one shared wrapper-warning follow-up; no API or wrapper edits.
- 09:56 · codex · [root] · implement after corrected tests shown red · owned EF source/test · 4 expected failures / 1 preview guard pass, exit 1 (`/private/tmp/mrc-jobpdf-availability-red.log`): three error cases return 500 instead of 200; successful overlap lacks the new true flag. Preserve bounded retries and continue to the parent URL update after lookup/insert failure; report history status separately.
- 09:56 · codex · [wrapper_warning_caveat] · return read-only shared-wrapper follow-up, recorded by parent · both wrappers and current/sibling consumers · confirmed wrappers drop the flag and there are no runtime consumers; supplied one combined Scoped OUT row with both file/line references. No files edited or tests run by agent; parent writes its log line.
- 09:57 · codex · [root] · mutation-check availability and flag, then final gates · owned EF source/test · corrected tests pass 5/5; measured 62 SOURCE / 87 TEST = 149 reviewable lines. Independently null the parent URL and falsify the response flag, require red, restore exact source each time; rerun targeted tests, full Vitest and normalized app tsc. API stays byte-identical to base.
- 09:59 · codex · [root] · finalize correction evidence and prepare local commit · owned EF source/test and this log · both mutations failed in all three degraded-success cases; final targeted tests pass 5/5. Full Vitest and normalized app tsc match baseline. Record shared wrapper caveat once, preserve historical decision trail, check PII/paths/count, commit locally and stop.

## Codex threads

- None printed.

## Evidence

Pre-fix regression command (Node v24.20.0): `node --test supabase/functions/generate-job-report-pdf/index.test.mjs`; exit 1, 5 tests, 1 pass / 4 fail. Full output: `/private/tmp/mrc-jobpdf-regression-red.log`. Failure names: overlapping regenerations preserve distinct history despite the same stale parent counter; retry exhaustion returns failure instead of silently dropping audit history; non-unique insert error returns failure instead of silently dropping audit history; history lookup error returns failure instead of silently dropping audit history. PreviewOnly guard was expected to pass and did. No test passed unexpectedly.

After fix: same command, 5 pass / 0 fail; `/private/tmp/mrc-jobpdf-regression-green.log`. The in-memory unique constraint forces attempts `[2,2,3]` against an existing history version 1 while both calls read `jc.pdf_version=0`. Both history rows retain caller attribution and completion id, and parent updates use the committed versions. Exhaustion is HTTP 500 with explicit `Version insert exhausted retries; retry report generation`; other insert/lookup errors fail immediately. No parent update is performed on these version failures. Hosted Deno/database integration has not been run; Node strips TS syntax and uses installed Zod for this runtime test, which is not Deno typechecking.

Mutation: changed allocation back to `(jc.pdf_version || 0) + 1`; exit 1, concurrency regression fails (returned versions undefined because retries exhausted instead of `[2,3]`), other 4 pass. Fixed source restored byte-for-byte in `finally`. Final explicit regression rerun: **5 pass / 0 fail**, exit 0. Outputs: `/private/tmp/mrc-jobpdf-regression-mutation.log`, `/private/tmp/mrc-jobpdf-regression-restored.log`.

Final full Vitest: **79 files / 1315 tests**, same 78 files / 1314 pass and exactly the same single `reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` failure, exit 1. New EF Node tests are separate, not silently included in that total. App tsc: **100 error lines / 41 distinct normalized lines**, exit 2; set comparison **0 added / 0 removed**. Logs: `/private/tmp/mrc-jobpdf-vitest-final.log`, `/private/tmp/mrc-jobpdf-tsc-final.log`. This is no regression in the app baseline, not a clean compiler gate and not Edge Function typechecking. API unchanged. `git diff --check` passes.

## PDF-CL17 — read-only investigation

**Incident payload and peak hosted memory are unknown.** The supplied 10 Sep 19:58 HTTP 546 / "Memory limit exceeded" on 20 photos is production evidence; no customer account/storage access was used to measure that incident. The measurements below are synthetic execution of the base `dedd0a3` EF preview handler and tracked template, not production measurements or a 546 reproduction.

**Post-acceptance clarification from Michael:** twenty 350 KiB photos produce about 9.9 MB of JSON against a documented 256 MB memory ceiling, a roughly 25-fold gap. This measurement does **not** prove that straightforward payload size caused the 546. The actual incident may involve much larger image bytes even with the same 20-photo count, or peak memory amplified by allocations/runtime behavior we did not measure. The observed memory failure is established; the PDF-CL17 diagnosis that base64 photo embedding caused it is a hypothesis, not yet proven. Actual incident bytes and peak memory remain unknown. Do not turn the synthetic result into evidence that the 256 MB limit was crossed or infer that more than 20 photos were present.

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

| Follow-up | Scoped OUT and why |
|---|---|
| Surface legacy history-save warnings for **both** `generate-job-report-pdf` and `generate-inspection-pdf` | Job wrapper `src/lib/api/jobReportPdf.ts:43` and inspection wrapper `src/lib/api/pdfGeneration.ts:104–111` discard `versionHistorySaved` (inspection also drops P0-A's structured `warning`). Their UI handlers at `src/pages/ViewReportPDF.tsx:811–813,830–833` therefore still show ordinary success. Carry the status through both wrappers and show a nonblocking warning in a separate UI unit; those paths are outside this EF correction. API hard-save behavior must remain strict. P0-A producer verified in sibling `mrc-pdfver` at `8a2fc99`, `supabase/functions/generate-inspection-pdf/index.ts:2413–2418`; job producer is `supabase/functions/generate-job-report-pdf/index.ts:528`. No wrapper/UI implementation here. |

- PDF-CL17 implementation: signed URLs affect signing, expiry, CSP and render-time image loading; separate unit explicitly requested by Michael.
- T18 region and T19 deadline changes: separate units, read for investigation context only.
- Sharing API version code: **duplication is deliberate for this bounded unit**, accepted by Michael. Direct import includes Node/Vercel/Chromium and is unsuitable for the Deno function. **The eventual shape is a runtime-neutral shared allocation/retry helper**, extracted for both Deno and Vercel with each writer retaining its own payload and failure policy. That requires validating both import/deployment paths and is outside this unit. Sharing retry mechanics does not imply identical delivery semantics.
- No Supabase/Vercel CLI, PROD access, push, merge, PR or deployment. Claude reviews on return under the author brief.

## Open questions for Claude

- Review the local P1-S-5 unit on return; no deploy has occurred. Run the explicit Node test command above because root Vitest does not discover tests under `supabase/functions/`.
- Version allocation now uses persisted history even if the parent counter update fails. Existing parent-update errors are still only logged; returnHtml-only behavior and upload cleanup are unchanged. This unit provides bounded history allocation with separate history-status reporting, not a transaction spanning Storage, history and parent metadata. Filename version labels still use the pre-insert snapshot; successful inserts return the committed row's version. When `versionHistorySaved:false`, the returned legacy counter is not a claim that the corresponding audit row exists.
- PDF-CL17 requires the persistence/lifetime decision above before implementation. No claim that synthetic byte totals reproduce the production memory termination.

## Review

- Deferred to Claude on return per dated author brief; no companion review in this authoring unit.
- Final reviewable SOURCE / TEST line counts against `dedd0a3`: **62 SOURCE** (40 added, 22 deleted) / **87 TEST** (all added), **149 total**, excluding this session log; within 150. Before correction: 58/83 = 141. Incremental correction against `8f78e7d`: 14 SOURCE (9 added / 5 deleted) and 12 TEST (8 added / 4 deleted).

## Post-acceptance decision — legacy history versus delivery

Michael accepted the retry/test scope but challenged the HTTP 500 policy and explicitly requested an answer before code changes. **Recommendation: match P0-A's degraded HTTP 200 for this legacy Edge Function. The original hard-failure policy was too strict.** Implementation and tests are unchanged in this follow-up; this section corrects the design recommendation, not a claim that the behavior has already changed.

The distinction is **which writer's row is missing**, not whether the job table is ever read:

- `src/lib/api/jobReportPdf.ts:38–43` consumes the legacy EF's `success`, `pdfUrl` and `version`, with no version-row id. `ViewReportPDF.tsx:606` selects current HTML from `job_completions.pdf_url` unless a historical version is pinned. `JobReportPreview` fetches that URL directly (`:307–333`); the View/print escape hatch uses the loaded HTML (`:1396–1420`). None requires the newly inserted legacy history row.
- The legacy history switcher does read `job_completion_pdf_versions` (`ViewReportPDF.tsx:620–630,3043–3068`). A missing row means the generation is absent from history and cannot later be selected there. This is a real audit/history loss, but it is not a prerequisite for current preview, PDF rendering or customer delivery.
- Email and hard-save recovery **do** rely on this table, but select **`generation_type='hard_save'` with non-null `pdf_storage_path`**, not this EF's legacy HTML row (`jobReportPipeline.ts:146–178,208–223`; `ViewReportPDF.tsx:656–671`). Send explicitly requests Download if no hard save exists (`:1225–1230`), rather than silently accepting a missing hard-save row.
- The API creates those hard-save rows and requires their ids in its success contract (`api/render-job-report-pdf.ts:500–525`; `jobReportPipeline.ts:120–135`). It calls this EF with **`previewOnly:true`** (`api/render-job-report-pdf.ts:237`), and the EF returns **before any history insert** (`index.ts:415–427`). Therefore missing legacy history neither satisfies nor breaks the separate hard-save dependency. Keep the API's existing strict behavior; it does not justify the same policy in the legacy EF.
- Current `227cd2e` throws on history failure **before updating the parent URL** (`index.ts:486–512`). After a successful HTML upload, the caller reports failure and skips refetch/navigation (`LeadDetail.tsx:638–646,1111–1117`; `ViewReportPDF.tsx:811–817`). On first generation the parent URL stays empty, so the page shows **No Report Generated** (`ViewReportPDF.tsx:2589–2618`) and hides its ordinary Download/Send surface. This is the availability regression Michael identified; on regeneration it leaves the old parent URL in place.

P0-A comparison verified read-only against sibling worktree `mrc-pdfver` at `8a2fc99`: inspection EF updates its parent URL before history (`generate-inspection-pdf/index.ts:2352–2364`) and returns `success:true`, the usable URL, `versionHistorySaved:false` and a structured warning on history failure (`:2406–2421`). This preserves the generated artifact independently of its audit entry. The same availability policy fits this legacy job EF: retain the bounded retries, preserve/publish the generated parent URL, then report history failure explicitly without blocking access to the artifact. Simply changing HTTP status while leaving the parent update unreachable would not fix the problem.

**Visibility limitation:** the current job wrapper drops additional response fields (`jobReportPdf.ts:43`), so adding `versionHistorySaved:false` alone does not create a visible UI warning. It is explicit response metadata plus server logging, as in the sibling pattern; do not claim automatic recovery, historical reconciliation or a UI alert. A caller/UI change is outside this unit's owned paths.

Evidence is a read-only trace plus the original runtime regression showing HTTP 500 and no parent update on history failures. No new tests were run for this log-only clarification, and no production state was accessed. The no-dependency conclusion applies to the repository call paths traced here; it is not an assertion about uninspected external consumers.

## Implemented correction — authorized after the answer

Michael authorized the behavior correction after the comparison above. **The legacy EF now preserves report availability when history lookup/insertion fails:** keep the three-attempt 23505 retry, log database errors, continue to the parent `pdf_url` update, and return HTTP 200 / `success:true` with `versionHistorySaved:false`. Successful history inserts return `versionHistorySaved:true`. Storage-upload failures retain their existing failure behavior. `api/render-job-report-pdf.ts` is byte-identical to `dedd0a3`; its hard-save contract remains strict. Neither wrapper was edited.

**Process lesson requested by Michael:** answering the downstream-dependency question uncovered the availability regression introduced in this session's first fix: an audit-row error stranded successfully uploaded HTML before the parent URL update. Tracing the actual caller contract was more useful than defending the copied API failure policy. Keep this distinction explicit when reusing retry mechanics across writers; the eventual shared helper must not impose one availability policy on both flows.

Test-first evidence for the correction, all on absolute Node **v24.20.0**:

- Updated tests **before source**. Command: `/Users/michaelyoussef/.nvm/versions/node/v24.20.0/bin/node --test supabase/functions/generate-job-report-pdf/index.test.mjs`. Red: **4 fail / 1 pass**, exit 1. Three cases (`retry exhaustion`, `non-unique insert error`, `history lookup error`) returned 500 instead of required 200; successful overlap lacked the new true flag. Preview guard was expected to pass. Output: `/private/tmp/mrc-jobpdf-availability-red.log`.
- Green after source correction: **5 pass / 0 fail**, exit 0. Error cases verify `success:true`, `versionHistorySaved:false`, expected insert attempt counts (3/1/0), no inserted history rows, and the same uploaded URL in the response and parent update. Existing overlap still yields attempts `[2,2,3]`, versions `[2,3]` and true history flags. PreviewOnly retains zero writes. Output: `/private/tmp/mrc-jobpdf-availability-green.log`.
- Mutation 1 changed only the parent update's `pdf_url` to null while leaving successful response/flags intact: **3 fail / 2 pass**, exit 1, all three fail on URL equality. Mutation 2 forced response `versionHistorySaved:true`: **3 fail / 2 pass**, exit 1, all three fail on `true !== false`. Both mutations restored the source exactly in `finally`. Outputs: `/private/tmp/mrc-jobpdf-availability-mutation-parent-url.log` and `/private/tmp/mrc-jobpdf-availability-mutation-history-flag.log`.
- Final targeted run after restoration and retaining the direct `!versionError` null guard: **5 pass / 0 fail**, exit 0; `/private/tmp/mrc-jobpdf-availability-restored.log`.
- Full Vitest with inline dummy Supabase values: **79 files / 1315 tests**, same 78 files / 1314 pass and sole known failure `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves`, exit 1. App tsc: **100 error lines / 41 distinct normalized lines**, exit 2, **zero added / zero removed** versus the measured baseline. Outputs: `/private/tmp/mrc-jobpdf-availability-vitest.log`, `/private/tmp/mrc-jobpdf-availability-tsc.log`. Same coverage limitation: this app compiler gate does not typecheck the EF; the new tests run explicitly under Node, separately from the Vitest total. No hosted Deno integration was run.

No tests unexpectedly passed, no cap waiver was needed, and no customer data or deployment access was used. The single shared wrapper/UI follow-up is filed in **Scoped OUT and why** with both file/line references; it remains unimplemented here. PDF-CL17 remains read-only and causally unproven as recorded above.

## Resume from here

The authorized legacy EF availability correction is complete and verified; local commit is the closing action. No further implementation remains in this unit. Next human step is Claude review, then Michael's decision on the exact DEV deploy command above. Nothing was pushed or deployed. Keep API hard-save behavior strict, handle the shared wrapper-warning follow-up separately, and leave PDF-CL17 implementation deferred. Confirm local HEAD/status for the closing commit.
