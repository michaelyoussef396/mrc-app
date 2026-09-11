# Session log — 2026-09-12 — fix/activity-timeline-attribution

## Header

- Date: 2026-09-12 (Australia/Melbourne)
- Lane: C, dated authoring window; Claude reviews on return before production.
- Branch: `fix/activity-timeline-attribution`
- Worktree: `/Users/michaelyoussef/mrc-timeline-attr`
- Tool/model: Codex, GPT-6; model/effort override not requested.
- Baseline commit: `dedd0a35a59695d546d311b78b262b92f733dbe8` (clean).
- Session id: not exposed; no resume command has been printed.

## Intent

P2-39 Unit 1: distinguish missing attribution from known website/system origins in full and compact timelines. Unit 2: read-only writer inventory for a later unit. The initial inspection-form merge dependency is reconsidered in Michael's accepted correction below.

## Touching

- `src/components/dashboard/ActivityTimeline.tsx`
- `src/hooks/useActivityTimeline.ts`
- `src/components/dashboard/__tests__/ActivityTimeline.test.tsx` (mount integration tests exercising the real hook)
- `docs/sessions/2026-09-12-fix-activity-timeline-attribution.md` (mandatory handover)

## Baseline

- Read author brief fully, then AGENTS, then TODO P2-39. Latest explicit user instructions govern fallback semantics: NULL does not prove System.
- `nvm use 24` printed `Now using node v24.20.0 (npm v11.19.0)`; separate shell `node --version` printed `v23.7.0`. Absolute interpreter printed `v24.20.0` and is used for every npm/vitest/tsc invocation.
- `npm ci --offline --no-audit --no-fund`: initial empty temporary cache failed ENOTCACHED; copied existing `~/.npm/_cacache` into `/private/tmp/mrc-timeline-npm-cache/` and retry succeeded, 1042 packages. No lockfile changes.
- Inline test env: `VITE_SUPABASE_URL=https://localhost.invalid VITE_SUPABASE_ANON_KEY=dummy`; no env file created.
- Full vitest: **79 files / 1315 tests**, **78 files / 1314 tests passed**, one known failure: `src/lib/api/reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` (`TypeError: blob.text is not a function`). Duration 19.74s.
- tsc application project: **100 error lines, 41 distinct normalized lines** after stripping `(line,col)`. Compare normalized sets, not counts. Raw logs `/private/tmp/mrc-timeline-baseline-{vitest,tsc}.log`; normalized set `/private/tmp/mrc-timeline-baseline-tsc.normalized`.

## Step log

- 09:29 · codex · [codex] · baseline complete before first authored file; inspect display/query and plan failing mount tests · touching paths above · estimated 30–45 source and 80–100 test lines, under 150 total.
- 09:29 · codex · [codex] · record concurrent read-only delegation already started during setup · src and supabase/functions writer sites (read only) · writer_recon will return report; parent logs on its behalf because Unit 2 forbids agent writes.
- [writer_recon] 09:29 · codex · writer_recon · trace six activity types and website/system evidence at dedd0a3 · src and supabase/functions (read only) · investigation in progress, no files written.
- 09:29 · codex · [codex] · Unit 1 test-first · ActivityTimeline.test.tsx · next: demonstrate missing actor labels before changing either source file.
- 09:43 · codex · [codex] · Michael accepted implementation commit `4d2594c`; document his explicit correction to the brief, concrete actor retrieval, cheapest first writer and revised overlap dependency · this session log only · documentation follow-up; no writer implementation or additional tests requested.

## What I did

- Display used by AdminDashboard, LeadDetail and Notifications; only owned hook/component will change. Both compact and full rendering require actor text.
- Known profile wins. Existing user id without a usable profile name is `User (name unavailable)`. Unattributed actions are `Actor not recorded` (ordinary information, no error state).
- Website inference is restricted to `lead_created` with `leads.lead_source = website` and `created_by = NULL`; never infer later action origin from the lead's source or creator. Both fields are available on leads.
- Only `invoice_overdue` and `invoice_milestone` map to System: their sole current app/Edge writer is the cron function `check-overdue-invoices/index.ts:390–396,429–435`. No general metadata automation flag exists. Other activity types, generic emails and notifications remain unknown without evidence.

## Evidence

- Before any source edit, mounted real hook/component test: **37 failed / 3 passed / 40 total**, 38.25s. Failures are absent actor labels, including all six target types in both modes; the three full-view named-user controls already passed. `/private/tmp/mrc-timeline-red.log`.
- Added query-contract test before source: **1 failed / 40 skipped**, because activities select does not request `lead_source`/`created_by`. `/private/tmp/mrc-timeline-projection-red.log`.
- 09:34 · codex · [codex] · red evidence confirmed; begin minimal display/query change · owned hook/component · next run 41 tests, then mutate fallbacks and each rendering branch.
- First post-change run: 30 passed / 11 failed. The 11 compact table cases had a test-locator whitespace assumption (` — ` versus `— `), while the expected labels were visible. Corrected the locator to tolerate separator whitespace; no source change for this. Initial red evidence for all six affected types used a different unchanged regex and remains valid.
- Green: **41 passed**, 2.05s, `/private/tmp/mrc-timeline-green.log`.
- 09:35 · codex · [codex] · mutation-check ten independent regressions · owned hook/component temporarily, restored after each · every mutant produced expected assertion failures; no surviving mutation or unplanned pass.
- Mutation results (`/private/tmp/mrc-timeline-mutation-<name>.log`, each exit 1): `unknown-is-system` 2 failed; `website-all-actions` 2; `ignore-recorded-creator` 2; `lose-website-origin` 2 (1 unaffected control passed); `lose-cron-origin` 4; `lose-profile-name` 2; `generic-events-system` 4; `hide-full-actor` 1 (compact control passed); `hide-compact-actor` 1 (full control passed); `omit-provenance-query` 1. All against the 41-test file, remaining tests skipped.
- 09:36 · codex · [codex] · restored source; start final full vitest and normalized tsc comparison · all tests/application project (read only) · measured diff so far **22 SOURCE + 80 TEST = 102 reviewable lines**, session log excluded, no waiver.
- Final full suite: **80 files / 1356 tests; 79 files / 1355 tests passed**, only the same `reportPipeline.test.ts > fetchVersionPdfBlob > returns the file from the signed URL when it resolves` failure. New attribution file: **41/41 passed** after restoration. Duration 10.88s; `/private/tmp/mrc-timeline-final-vitest.log`.
- Final application tsc: **100 error lines / 41 distinct normalized messages**, zero new or removed messages; normalized `Counter` comparison identical, including multiplicities. `/private/tmp/mrc-timeline-final-tsc.log`.
- 09:38 · codex · [codex] · final diff/scope/PII inspection and local commit preparation · exact four touching paths · source 16 added/6 deleted = 22; tests 80 added = 80; total 102 excluding session log. No customer PII or attribution trailer added; no writer, TechnicianInspectionForm, lockfile, TODO or review-log changes.
- 09:38 · codex · [codex] · explicit-path staging succeeded; local commit is the final mutation · exact four touching paths · commit subject `fix: distinguish timeline actors from missing attribution`; final SHA available from branch HEAD. No push/merge/PR follows.

## Codex threads

- None printed. No terminal review during this authoring window; Claude reviews on return per author brief.

## Commands for Michael

None yet. No Supabase, Vercel, push, merge, deploy or PR command executed.

## Scoped OUT and why

- Writer implementation remains outside this completed session. The original instruction to wait for the other lane's merge is reconsidered by Michael's accepted correction below; it is not an established dependency of the eight identified insert sites.
- `src/pages/TechnicianInspectionForm.tsx` is read-only and belongs to another session.
- No migrations or database investigation: PROD findings supplied by Michael, not re-queried.
- No TODO or codex-review-log edits, per author brief.

## Open questions for Claude

- Review the independent local unit after the credit window resets; no production claim is made.

## Unit 2 — read-only writer report at dedd0a3

Eight direct insert sites across the six requested types; all are browser actions and fixable. No six-type cron/Edge activity writer found. This inventory describes this checkout, not the deployed code; the supplied 9 September PROD counts remain the historical evidence. No database function or migration is a proposed fix.

| Type | Direct writer | Acting-user availability at that point | Later writer classification |
|---|---|---|---|
| `status_change` | `src/pages/LeadsManagement.tsx:349–354`, `updateLeadStatus` | No user variable in handler; recoverable authenticated admin session. Invoked for reactivate, close, approve inspection report (`:215,219,224`) and confirm removal (`:244`). | Fixable |
| `status_change` | `src/pages/LeadsManagement.tsx:600–605`, `handleApproveJobReport` | No local user variable; authenticated admin session recoverable. | Fixable |
| `status_change` | `src/pages/ViewReportPDF.tsx:910–915`, `handleApprove` | `auth.getUser()` already called at `:904`; adjacent write uses `user?.id` for approval at `:908`. | Fixable; ID already in scope |
| `inspection_booked` | `src/lib/bookingService.ts:211–216`, `bookInspection` | No acting-user parameter/local. Browser caller `src/components/schedule/LeadBookingCard.tsx:543–557` has `user` from `useAuth()` at `:102` but passes only author name. `technicianId` is the assignee, not necessarily the actor. | Fixable |
| `booking_cancelled` | `src/components/schedule/EventDetailsPanel.tsx:71–76`, `handleCancelBooking` | No local user variable. Parent `src/pages/AdminSchedule.tsx:29` has user but does not pass it at `:321–325`; browser session recoverable. Explicit click/confirmation at `EventDetailsPanel.tsx:49–51,206`. | Fixable |
| `job_completion_submitted` | `src/hooks/useJobCompletionForm.ts:470–477`, `handleSubmit` | User fetched/checked at `:223–226` is scoped to initialization, not submit. Caller `src/pages/JobCompletionForm.tsx:40` has user; hook receives only lead ID at `:57`. Current submitting session is recoverable. Draft creator/assigned technician is not a safe substitute. | Fixable |
| `archived` | `src/pages/LeadsManagement.tsx:561–565`, `confirmArchive` | No local user variable; authenticated admin session recoverable. | Fixable |
| `lead_not_proceeding` | `src/pages/LeadsManagement.tsx:627–632`, `handleNotProceeding` | No local user variable; authenticated admin session recoverable. Authenticated staff records the customer's decision; the customer is not the actor. | Fixable |

Auth evidence: `src/App.tsx:144–153` protects LeadsManagement, `:108–115` protects AdminSchedule; `src/components/ProtectedRoute.tsx:5,18–22` checks user and `src/components/RoleProtectedRoute.tsx:22,38–39,77–85` checks session/role. Recoverable means the session API is available, not that the current insert validates a fresh user ID.

The user-supplied Technician location is a base-specific difference: `src/pages/TechnicianInspectionForm.tsx:4751–4757` calls `logFieldEdits`, which resolves auth at `src/lib/api/fieldEditLog.ts:77–78` and writes `field_edit` with user ID at `:90–96`. The page has user at `:2968`. Read only, no change. The original merge-wait instruction is reconsidered in the accepted correction below.

Correctly anonymous automation outside these six: `supabase/functions/check-overdue-invoices/index.ts:390–395,429–436` writes `invoice_overdue`/`invoice_milestone`. There is no human acting user. A configured system UUID exists at `:203`, not a human identity. Those are the only current app/Edge writers of those activity types.

Website origin evidence: `supabase/functions/receive-framer-lead/index.ts:824` writes website lead source; `:892–900` emits `new_lead` notification with event-specific `metadata.source = framer`; `:914–922` writes `framer_lead_confirmation` email with system UUID or NULL `sent_by`. Generic email is not automation evidence: `src/lib/api/notifications.ts:324–332` obtains the initiating browser user and `supabase/functions/send-email/index.ts:222–232` stores `sent_by`. Generic notifications can describe human actions (`notifications.ts:498–512,568–573`). No general automation metadata flag is emitted by the inspected activity writers.

- [writer_recon] 09:32 · codex · writer_recon · read-only Unit 2 completed at dedd0a3 · writer/caller/auth and Edge paths listed above, plus `src/lib/api/jobCompletions.ts` and `src/lib/api/invoices.ts` · eight direct inserts located; no files written, tests run, database tools used, or writer changes made; parent transcribed this report.
- 09:32 · codex · [codex] · record writer_recon return · this session log · writer work remains deferred until other lane merges.

## Accepted correction to the written brief — Michael, 2026-09-12

**The recon overturns the brief's claim that some of the six activity types are correctly anonymous cron/Edge actions. That claim is FALSE for all six: there are eight insert sites, all browser actions, all fixable. The writer unit changes from "fix what you can, some are legitimately null" to "all eight are fixable".** The genuinely anonymous writers are `invoice_overdue` and `invoice_milestone`, which are not among the six. This is Michael's accepted correction to the written instruction, recorded explicitly for Sunday's reviewer, not merely an untriaged finding.

Concrete meaning of **session recoverable** for the six sites described that way: use the existing browser Supabase client to call `await supabase.auth.getUser()` in the acting handler, obtain `data.user.id`, and pass that ID as `activities.user_id`. The six are the four LeadsManagement handlers (`updateLeadStatus`, `handleApproveJobReport`, `confirmArchive`, `handleNotProceeding`), `EventDetailsPanel.handleCancelBooking`, and `useJobCompletionForm.handleSubmit`. Resolve the actor at the start of that action, before its business writes; handle an auth error or missing user through the action's existing failure flow rather than treating it as legitimate anonymity. This is retrieval guidance for the future writer unit, not code implemented or a claim that every future runtime session will still be authenticated.

For `bookingService.bookInspection`, the caller already has `user` from `useAuth()` at `LeadBookingCard.tsx:102`: pass that acting `user.id` from `performBooking` (`:543–557`) into the service and its activity insert. Do not substitute the assigned `technicianId`, `authorName`, lead creator or draft creator for the acting user's ID.

**Start with `ViewReportPDF.tsx:910`. It is the cheapest of the eight and the natural first writer fix:** `handleApprove` already fetches user at `:904` and uses `user?.id` in the adjacent approval write at `:908`. Reuse that locally fetched actor for the activity insert; no additional auth lookup or caller-parameter plumbing is needed. Missing-user handling still belongs to the authenticated action, not a System fallback.

**Revised overlap/dependency:** `TechnicianInspectionForm.tsx:4751` calls the already-attributed `field_edit` helper; it is not one of these eight missing-actor insert sites at `dedd0a3`. The file-overlap concern that originally scoped this lane may therefore not apply at all, and the writer unit may not need to wait for the other lane to merge. Recheck current ownership and paths when that unit starts; the recon does not establish a necessary merge dependency. This does not authorize this finished session to touch the inspection form or begin writer changes.

## Resume from here

Implementation commit `4d2594c` is complete and accepted by Michael: 22 source / 80 test lines, failures shown first, all 41 tests passing, ten mutations caught. Unit 2 recon and the accepted correction above are complete. This follow-up changes only the log and ends the session. Claude reviews the local branch against `dedd0a3` on return. A future writer unit addresses all eight sites, naturally starting at ViewReportPDF, and rechecks ownership without assuming the old inspection-form merge dependency.

## Baseline normalized TypeScript error set

Repeated errors collapse from 100 lines to 41 distinct messages; final comparison also checks multiplicities.

```text
api/render-job-report-pdf.ts: error TS2339: Property 'headless' does not exist on type 'typeof Chromium'.
src/App.tsx: error TS2741: Property 'loading' is missing in type '{}' but required in type 'GlobalLoaderProps'.
src/components/leads/BookJobSheet.tsx: error TS2769: No overload matches this call.
src/components/leads/CreateNewLeadModal.tsx: error TS2339: Property 'disabled' does not exist on type '{ label: string; value: string; }'.
src/components/leads/CreateNewLeadModal.tsx: error TS2769: No overload matches this call.
src/components/leads/InvoiceSummaryCard.tsx: error TS2339: Property 'completion_date' does not exist on type 'GenericStringError'.
src/components/leads/InvoiceSummaryCard.tsx: error TS2339: Property 'job_number' does not exist on type 'GenericStringError'.
src/components/leads/InvoiceSummaryCard.tsx: error TS2559: Type 'GenericStringError' has no properties in common with type 'QuoteVarianceInput'.
src/components/leads/JobCompletionSummary.tsx: error TS2322: Type '{ children: string; className: string; }' is not assignable to type 'IntrinsicAttributes & { children: ReactNode; }'.
src/components/photos/PhotoCollectionEditor.tsx: error TS2769: No overload matches this call.
src/components/schedule/LeadBookingCard.tsx: error TS2322: Type '{ className: string; style: { color: "#34C759" | "rgba(255,255,255,0.9)"; }; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/schedule/LeadBookingCard.tsx: error TS2322: Type '{ className: string; style: { color: "#34C759"; }; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/schedule/LeadBookingCard.tsx: error TS2322: Type '{ className: string; style: { color: "#FF9500" | "rgba(255,255,255,0.9)"; }; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/schedule/LeadBookingCard.tsx: error TS2322: Type '{ className: string; style: { color: "#FF9500"; }; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/schedule/LeadBookingCard.tsx: error TS2339: Property 'disabled' does not exist on type '{ label: string; value: string; }'.
src/hooks/useGoogleMaps.ts: error TS2304: Cannot find name 'allSlots'.
src/hooks/useGoogleMaps.ts: error TS2304: Cannot find name 'google'.
src/lib/__tests__/apiClient.test.ts: error TS2304: Cannot find name 'afterEach'.
src/lib/api/apiClient.ts: error TS2339: Property 'catch' does not exist on type 'PromiseLike<void>'.
src/lib/api/fieldEditLog.ts: error TS2769: No overload matches this call.
src/lib/api/inspections.ts: error TS2322: Type 'string' is not assignable to type '"house" | "units" | "apartment" | "duplex" | "townhouse" | "commercial" | "construction" | "industrial"'.
src/lib/api/inspections.ts: error TS2322: Type 'string' is not assignable to type '"tenanted" | "vacant" | "owner_occupied" | "tenants_vacating"'.
src/lib/api/inspections.ts: error TS2345: Argument of type '{ updated_at: string; lead_id?: string; inspector_id?: string; inspection_date?: string; job_number?: string; triage_description?: string; requested_by?: string; attention_to?: string; property_occupation?: string; ... 28 more ...; parking_option?: string; }' is not assignable to parameter of type '{ additional_equipment_comments?: string; additional_info_technician?: string; air_movers_qty?: number; antimicrobial?: boolean; attention_to?: string; cause_of_mould?: string; commercial_dehumidifier_qty?: number; ... 71 more ...; why_this_happened?: string; }'.
src/lib/api/inspections.ts: error TS2769: No overload matches this call.
src/lib/api/invoices.ts: error TS2345: Argument of type '{ customer_name: string; customer_email: string; customer_phone: string; property_address: string; job_completion_id: string; line_items: InvoiceLineItem[]; subtotal: number; ... 7 more ...; notes: string; }' is not assignable to parameter of type '{ created_at?: string; created_by?: string; customer_email?: string; customer_name?: string; customer_phone?: string; discount_amount?: number; discount_percentage?: number; due_date?: string; equipment_subtotal?: number; ... 20 more ...; xero_invoice_id?: string; }'.
src/lib/api/invoices.ts: error TS2352: Conversion of type '{ created_at: string; created_by: string; customer_email: string; customer_name: string; customer_phone: string; discount_amount: number; discount_percentage: number; due_date: string; equipment_subtotal: number; ... 20 more ...; xero_invoice_id: string; }' to type 'InvoiceRow' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/lib/api/invoices.ts: error TS2352: Conversion of type '{ created_at: string; created_by: string; customer_email: string; customer_name: string; customer_phone: string; discount_amount: number; discount_percentage: number; due_date: string; equipment_subtotal: number; ... 20 more ...; xero_invoice_id: string; }[]' to type 'InvoiceRow[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
src/lib/api/invoices.ts: error TS2769: No overload matches this call.
src/lib/offline/SyncManager.ts: error TS2769: No overload matches this call.
src/lib/utils/htmlToPdf.ts: error TS2550: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
src/pages/LeadDetail.tsx: error TS2322: Type '{ access_instructions: string; archived_at: string; assigned_to: string; booked_at: string; created_at: string; created_by: string; customer_preferred_date: string; customer_preferred_time: string; ... 39 more ...; xero_contact_id: string; }' is not assignable to type '{ id: string; status: LeadStatus; }'.
src/pages/LeadDetail.tsx: error TS2339: Property 'icon' does not exist on type 'StatusFlowConfig'.
src/pages/LeadsManagement.tsx: error TS2345: Argument of type 'string | number' is not assignable to parameter of type 'string'.
src/pages/LeadsManagement.tsx: error TS2769: No overload matches this call.
src/pages/TechnicianInspectionForm.tsx: error TS2322: Type 'Element' is not assignable to type 'string & ReactNode'.
src/pages/TechnicianInspectionForm.tsx: error TS2345: Argument of type '{ inspection_id: string; observations: string; comments: string; landscape: string; sanitation_required: boolean; treatment_time_minutes: number; updated_at: string; }' is not assignable to parameter of type '{ comments?: string; created_at?: string; id?: string; inspection_id?: string; landscape?: "flat_block" | "sloping_block"; observations?: string; sanitation_required?: boolean; treatment_time_minutes?: number; updated_at?: string; }'.
src/pages/TechnicianInspectionForm.tsx: error TS2769: No overload matches this call.
src/pages/TechnicianJobDetail.tsx: error TS2339: Property 'disabled' does not exist on type '{ label: string; value: string; }'.
src/pages/TechnicianJobDetail.tsx: error TS2339: Property 'special_requests' does not exist on type 'LeadData'.
src/pages/ViewReportPDF.tsx: error TS2345: Argument of type '{ temperature: number; humidity: number; dew_point: number; external_moisture: number; internal_moisture: number; mould_visible_locations: unknown; comments: string; extra_notes: string; updated_at: string; }' is not assignable to parameter of type '{ area_name?: string; area_order?: number; comments?: string; created_at?: string; demolition_description?: string; demolition_required?: boolean; demolition_time_minutes?: number; dew_point?: number; ... 20 more ...; updated_at?: string; }'.
src/pages/ViewReportPDF.tsx: error TS2769: No overload matches this call.
```
