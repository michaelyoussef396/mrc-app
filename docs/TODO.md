# MRC Lead Management System — Current TODO

## ⚠️ PENDING: Email Domain DNS Cutover
DNS records (SPF/DKIM/DMARC) for mouldandrestoration.com.au NOT yet configured.
Resend domain NOT yet verified.
**Scheduling (decided 2026-07-13):** now scheduled as an EARLY launch-weekend task —
start the DNS setup FIRST because verification can take a few hours. This reverses the
earlier "separate, later item" framing.
Do NOT switch sending domain until DNS is verified in Resend dashboard. If it is not
verified in time, launch on the current working domain and switch shortly after — do
not delay launch for it.
Once DNS is done: re-run a full email send test (booking confirmation +
inspection report) and verify headers pass SPF/DKIM/DMARC before trusting
production email delivery.

---

## ⚠️ PENDING: Invoice data integrity — 2 SQL blocks for Michael to run

Branch `fix/admin-analytics-accuracy`. Surfaced 2026-07-29 while auditing the
admin analytics surfaces. Read-only investigation; **no DB writes made, no
migration applied.**

**What was wrong.** Two writers stamped an inc-GST figure into
`invoices.subtotal_after_discount`, which is the ex-GST column:

| Invoice | Stored | Status | Written by |
|---|---|---|---|
| `INV-2026-0001` | sad **290.40**, gst **0.00**, total 290.40 | overdue | `handleCreate` in `InvoicePaymentCard.tsx` — raw insert bypassing `calculateInvoiceTotals`, gst hardcoded 0 |
| `INV-2026-0002` | sad **11029.77**, gst 1002.69, total 11029.77 | paid | pre-`bb1ee91` `handleEdit`, same file — stamped the typed inc-GST total onto three money columns leaving gst stale |

`handleEdit` was removed 2026-06-02 (`bb1ee91`). `handleCreate` was removed
2026-07-29 (`5792211`) — it was unreachable but was the surviving copy of the
same shape. **No code can produce this defect any more**; only the two rows and
the missing DB guard remain.

Live consequence while the rows exist: `AdminInvoiceHelper.tsx:357-361` renders
`subtotal_after_discount` and `gst_amount` raw when a saved invoice exists, so
`INV-2026-0001` displays **"GST 10%: $0.00"** on the screen an admin copies from
to hand-build an invoice.

**A third row also goes — test data, not defective.** `INV-2026-0004` (paid,
$28,603.75) is arithmetically perfect and came through the proper
`saveCalculatedInvoice` path, but it is not a real invoice: customer email
`user.name+tag+sorting@example.com` on an IANA-reserved domain, notes reading
`notes optial in invocie`, a line item named `testing custom line`, equipment of
10 × 10 days for every item ($18,300), address just "VIC", zero inspections /
job completions / bookings, and a full create→sent→paid lifecycle in 50 minutes
(sent one second after creation, paid six seconds after being re-sent).

- [ ] **Run `docs/INVOICE_INTEGRITY_RUNBOOK.md` — DEV (`ctppzqnysmzynkxjlzta`)
      first, confirm clean, then PROD (`ecyivrxjpsmjmexqatym`).** Two ordered
      blocks: **A** deletes all three rows with bracketing verification SELECTs;
      **B** applies `supabase/migrations/20260729153000_invoice_totals_integrity_checks.sql`
      (two CHECK constraints, both `VALID`). **A before B** — a VALID constraint
      aborts while the two defective rows are present.

**Safe to delete (verified read-only 2026-07-29):** no table in the DB has an
`invoice_id` column — all 26 public tables probed — so no FK references
`invoices.id`; nothing cascades, nothing blocks. The full before-state of all
three rows is preserved permanently in `audit_logs` (append-only, protected by
`prevent_audit_logs_delete`), plus a `delete_invoice` audit row each.
`invoice_number_seq` is not rewound; the next invoice is `INV-2026-0005`.

**Expected, not a regression:** both paid invoices go, so Reports year revenue
drops **$39,633.52 → $0.00**. Month view and technician revenue stay $0.00
(unchanged — neither payment fell in the current month). Outstanding
**$4,987.88 → $4,697.48**. $0.00 is the honest figure: no real customer has been
invoiced through this system.

Both constraints are required — neither alone catches both defects.
`INV-2026-0001` **passes** the sum check (290.40 + 0.00 = 290.40 is
arithmetically consistent) and is caught only by the GST relation.

**Open, flagged not actioned:** the one surviving invoice `INV-2026-0003`
(Amy sherry, $4,697.48, overdue/unpaid) also looks like test data — email is a
variant of Michael's own address, one line item is named `custom one` — but it
exercised more of the pipeline (1 inspection, 1 booking) and is unpaid, so
revenue reads $0.00 either way. Decide whether to delete it too.

---

**Last Updated:** 2026-07-23
**Production state:** main @ `b50d07b`, production @ `9fdc853` (merge of PRs #67–#71 + login-footer fix), mrcsystem.com live and verified 2026-07-23
**Status:** Phase 1 + Phase 3 + Phase 4 Stages 4.1/4.1.5/4.2/4.3 COMPLETE in production. Phase 2 (Job Completion) built and deployed — existence-verified 2026-07-07, runtime-untested against dev (see "Phase 2 — Job Completion Workflow: Existence Verification" below). Pre-launch hardening underway.

Backed by `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` (48-stage execution map) and `docs/JOB_COMPLETION_PRD.md` (Phase 2 spec).

---

## HANDOFF — HEPA/waste consistency build (28 Jul 2026 session, PENDING MULTI-SESSION MERGE)

All code phases are committed on LOCAL main. **`git push` was blocked by the session's
permission classifier — Michael runs `git push origin main` to trigger the Vercel preview.**
Michael is running a parallel CC session on other debugging; nothing merges to production
until both streams land together.

### Commits (local main, in order)

| Commit | What |
|---|---|
| `a350400` | feat(pricing): HEPA in the equipment engine (qty + own days; absent = byte-identical). 8 new tests, pricing-guardian GO. |
| `725b764` | feat(db): migration file `20260728120000_hepa_quote_columns.sql` (inspections.hepa_air_scrubber_qty/_days + job_completions.quoted_afd_qty/_days). |
| `0362c39` | chore(types): regenerated from DEV after both migrations applied there. |
| `277cc86` | feat(inspection): Section 7 HEPA panel (units/days, Auto (N) days); wired into all 4 calc/save sites + Section 9 + InspectionDataDisplay; first writer of `inspections.equipment_days`. |
| `1c663e8` | feat(job-completion): WasteCard (quoted vs actual m³, confirm/override, reset-on-edit); quoted HEPA/waste snapshot in createJobCompletion; null-tolerant quoted props (kills HEPA false-amber); rates imported from pricing.ts. |
| `8be4c83` | feat(invoice): estimate/actual chips + Use buttons (equipment + waste); autoPopulateFromLead prefers job-actual waste; reference values never become line items. |
| `a68710d` | feat(pdf): Page 8 HEPA + waste lines (Both mode = "billed once"); scope-steps injection fixed via {{option_1_steps}}/{{option_2_steps}} placeholders with count-scaled type (14px ≤3 / 12px 4-5 / 10px 6+), legacy static fallback; dead indexOf surgery deleted; preview gets Both-mode waste input. |

### Verified vs UNTESTED — be honest about the line

**Verified (local, this session):** typecheck clean · `npm run build` clean · 60/60 pricing
tests · EF parses (esbuild) · template placeholders 1:1 with EF replacements · DEV columns
live (behavioral probes 200) · PROD schema untouched (probes 400) · repo template was
byte-identical to live PROD Storage BEFORE editing · Phase 2 adversarially reviewed
(2a by agent: APPROVE; 2b reviewer died on rate limit — reviewed manually line-by-line,
2 fixes applied pre-commit).

**UNTESTED at runtime (nothing has rendered or round-tripped):** every UI flow (HEPA
panel, autosave/localStorage round-trip, WasteCard confirm/override, invoice chips) ·
EF execution on Deno (incl. page-marker validation with the edited template) · actual
PDF visual geometry (line-fit numbers are calculated, not rendered) · quoted-snapshot
writes on job creation · invoice seeding precedence on real rows.

### DEV environment state (prepared this session)

- Both migrations applied to DEV (`ctppzqnysmzynkxjlzta`) by Michael, probe-verified.
- DEV Storage seeded via Storage API: `pdf-templates` + `pdf-assets` created PUBLIC,
  90/90 objects copied from PROD (incl. Galvji.ttc re-uploaded as octet-stream), and
  the EDITED `inspection-report-template-final.html` (66,282B) upserted. Bucket
  inventory now 1:1 with PROD (`inspection-reports` output bucket already existed).
- **DEV has ZERO Edge Functions deployed** (restore never carried them) — the
  generate-inspection-pdf deploy below is the first; EF/template ordering is therefore
  moot on DEV. This EF needs no custom secrets (Supabase-only).

### Michael's ordered steps

1. ~~`git push origin main`~~ — DONE (Michael, 28 Jul eve, `6fa0855..77fcc22`).
2. Smoke the forms on preview at 375px: HEPA panel only when its toggle is on; Section 9
   HEPA line; job completion quoted values real (no false amber); WasteCard flow; invoice
   helper chips. **Still outstanding — the only unverified surface.**
3. ~~Deploy the EF to DEV~~ — DONE (Michael, 28 Jul eve).
4. ~~E2E render~~ — **DONE by CC against the DEPLOYED DEV EF + live DEV Storage template
   (28 Jul eve): single mode 7/7 PASS, Both mode 8/8 PASS, legacy fallback 5/5 PASS.**
   Verified: HEPA line ("$100/day × 2 (3 days)") · waste single ("6 m³ — $550.00 +GST")
   and Both ("billed once") wording · scope steps rendered from real treatment methods
   with scaled type (5 methods → 12px wrapper) · zero leaked `{{…}}` · legacy rows
   (empty methods / null HEPA / null waste) reproduce the historic static text,
   informational HEPA rate, and "Not required" · DOM-measured geometry: equipment list
   695→809px vs photos 827px (18px clear); Option-1 steps end 386px vs Option-2 title
   400px. Test fixture: DEV inspection `fc568a31-…17ff` left STAGED in Both mode
   (2 HEPA × 3d, 6 m³/$550, 5 methods, option totals 3000/5000) for the UI smoke; the
   render used the default EF path, so DEV also gained pdf_versions rows + an
   inspection-reports HTML object (sandbox, expected).
5. **PROD sequence (only after step-2 smoke green + parallel stream ready):** apply
   `20260624113911` then `20260728120000` in PROD Studio → deploy EF to PROD
   (`--project-ref ecyivrxjpsmjmexqatym`) → upload `src/templates/inspection-report-template.html`
   to PROD Storage AS `inspection-report-template-final.html` (EF FIRST, template second —
   PROD still runs the old EF, so reversed order blanks the description areas) → merge
   main → production.
6. ~~[CC] Phase 5 closer~~ — **DONE (29 Jul, `01abf08`, Michael-approved after both render
   E2Es + AI payload verification).** Guide section 6 rewritten: gaps → closed (HEPA on
   the quote, waste on the quote incl. billed-once, actual-vs-estimate waste at invoice,
   job report equipment summary). 796 prose words, all 31 figures re-verified against
   pricing.ts, 375px clean. Note: this was the guide file's FIRST commit — it had been
   untracked since the 28 Jul doc-consolidation session.

**ALL CC WORK COMPLETE.** Everything that remains lives in ONE place: the
**PROD ROLLOUT RUNBOOK** section directly below. (Optional DEV extra, separate from the
rollout: `OPENROUTER_API_KEY` secret on DEV for AI-summary testing on preview.)

---

## PROD ROLLOUT RUNBOOK — HEPA/waste stream + parallel-session merge

Written 29 Jul 2026 to be run COLD, possibly days later, with no memory of the
sessions. Covers the HEPA/waste stream (20 commits, `a350400..97f3b44`, all on
origin/main). The parallel debugging session's requirements get pasted into the slot
below before running.

**The one ordering principle, spelled out:** three layers activate this feature and
each must exist before the next one needs it. (1) **DB columns before code** — the
merged code writes `hepa_air_scrubber_*` / `*_waste_disposal_*` columns; if the
migrations haven't run, every inspection save and job-completion save on live 500s
with "column does not exist". (2) **EF code before templates** — the live inspection
EF strips unknown `{{placeholders}}`, so uploading the new template first renders
blank description/equipment values; the live job EF has NO catch-all, so uploading its
template first prints literal `{{equipment_summary}}` on customer PDFs. (3) **All of
the above before the production merge**, because the merge is what puts the
column-writing frontend in front of customers.

### GATE (do not start the runbook until both are ticked)

- [ ] 375px UI smoke passed on the Vercel preview (staged fixtures: inspection
      `fc568a31-…17ff` in Both mode; job completion `1b81f7e7-…33c5` with full actuals
      — HEPA panel gating, WasteCard confirm/override, invoice estimate/actual chips).
- [ ] Parallel session's stream is ready to merge (its steps pasted in below).

### PRE-MERGE

- [ ] **Both streams build clean.** On each branch/worktree:
      `npm run typecheck && npm run build && npx vitest run src/lib/calculations/pricing.test.ts`
      (this stream's expected: typecheck clean, build clean, 60/60 tests).
- [ ] **Conflict check.** Files the HEPA/waste stream touched (definitive list from
      `git diff --name-only a350400^..97f3b44`) — check the parallel session against
      these BEFORE merging; the starred ones are the likely collision points:
      - ⭐ `src/lib/calculations/pricing.ts` (+ `pricing.test.ts`) — SACRED money engine
      - ⭐ `src/lib/api/invoices.ts`
      - ⭐ `src/pages/TechnicianInspectionForm.tsx`
      - ⭐ `src/pages/JobCompletionForm.tsx` + `src/hooks/useJobCompletionForm.ts`
        + `src/lib/api/jobCompletions.ts` + `src/components/job-completion/Section7Equipment.tsx`
      - ⭐ `src/pages/AdminInvoiceHelper.tsx`
      - ⭐ `src/templates/inspection-report-template.html` + `src/templates/job-report-template.html`
        (BOTH must be re-uploaded to Storage if the parallel session edited them too —
        Storage serves ONE copy per file)
      - `src/components/leads/InspectionDataDisplay.tsx`, `JobCompletionEditSheet.tsx`,
        `JobCompletionSummary.tsx`, `src/components/pdf/ReportPreviewHTML.tsx`
      - `src/types/inspection.ts`, `src/types/jobCompletion.ts`,
        `src/integrations/supabase/types.ts` (regenerate from DB if both streams touched it)
      - `supabase/functions/generate-inspection-pdf/index.ts`,
        `generate-job-report-pdf/index.ts`, `generate-inspection-summary/index.ts`
      - `supabase/migrations/20260728120000_hepa_quote_columns.sql`
      - Docs only: `docs/TODO.md`, `docs/PRICING_AND_PROCESS_GUIDE.html`,
        `docs/COST_CALCULATION_SYSTEM.md`, `.claude/rules/australian-compliance.md`
- [ ] **PARALLEL SESSION STEPS — fill in from the other session before running:**
      ```
      (paste the parallel session's pre-merge checks, migrations, deploys, and
       verification steps here, and slot them into the sequence below)
      ```

### PROD SEQUENCE — exact order

- [ ] **1. Apply BOTH migrations in PROD Studio** (LIVE — `ecyivrxjpsmjmexqatym`).
      SQL editor: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new
      Paste and run, in this order (both files in `supabase/migrations/`, both additive
      `IF NOT EXISTS`, safe to re-run):
      1. `20260624113911_job_completion_waste.sql`
      2. `20260728120000_hepa_quote_columns.sql`
      Verify (same SQL editor — expect 4 rows):
      ```sql
      SELECT table_name, column_name FROM information_schema.columns
      WHERE (table_name='inspections'     AND column_name LIKE 'hepa_air_scrubber%')
         OR (table_name='job_completions' AND column_name IN ('quoted_afd_qty','actual_waste_disposal_cost'));
      ```
      *Out of order:* skip this and merge anyway → every inspection/job-completion save
      on live fails ("column does not exist") until applied. Rollback SQL is in each
      file's header comment.

- [ ] **2. Deploy the three Edge Functions to PROD** (from the repo root, on the
      merged-ready main — run all three, order among them doesn't matter):
      ```
      npx supabase functions deploy generate-inspection-pdf     --project-ref ecyivrxjpsmjmexqatym
      npx supabase functions deploy generate-job-report-pdf     --project-ref ecyivrxjpsmjmexqatym
      npx supabase functions deploy generate-inspection-summary --project-ref ecyivrxjpsmjmexqatym
      ```
      *Out of order:* deploying AFTER step 3's uploads leaves a window where the OLD
      EFs render the NEW templates — inspection PDFs show blank scope/equipment values
      (catch-all strips), job PDFs print literal `{{equipment_summary}}` (no catch-all).
      Deploying EFs first is harmless: new `.replace` calls no-op on the old templates.

- [ ] **3. Upload BOTH templates to PROD Storage** (Dashboard → Storage →
      `pdf-templates` bucket → Upload, overwrite existing):
      https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/storage/buckets/pdf-templates
      | Source (repo) | Upload into bucket AS |
      |---|---|
      | `src/templates/inspection-report-template.html` | `inspection-report-template-final.html` ← **RENAME on upload** |
      | `src/templates/job-report-template.html` | `job-report-template.html` (same name) |
      *Out of order / skipped:* features stay silently OFF — the new EFs find no
      placeholders to fill, customers keep getting the old pages (no corruption, but
      no HEPA/waste lines and the scope-steps fix stays dormant). This step is the ON
      switch. To roll a template back: `git show a68710d^:src/templates/inspection-report-template.html`
      / `git show 7dae371^:src/templates/job-report-template.html` and re-upload.

- [ ] **4. Merge main → production** (repo rule: merge commit — NEVER squash, never
      rebase):
      ```
      git checkout production && git pull origin production
      git merge main --no-ff
      git push origin production
      git checkout main
      ```
      Vercel auto-deploys production (mrcsystem.com) from the push.
      *Out of order:* merging before steps 1-3 puts column-writing forms and
      placeholder-emitting flows in front of customers against a DB/EF/template stack
      that can't serve them — this is the step that goes LAST.

- [ ] **5. Post-merge deploy verification:**
      - Vercel dashboard: production deployment green (project **mrc-system** — repo
        `.vercel` link is stale, always pass/select the project explicitly).
      - Bundle points at PROD Supabase (guards the 23 Jul env-var clobber recurrence):
        view-source of https://mrcsystem.com → fetch the main JS bundle → it must
        contain `ecyivrxjpsmjmexqatym` and NOT `ctppzqnysmzynkxjlzta`.

### POST-MERGE

- [ ] **Env vars intact** (the 23 Jul outage was Production-scope `VITE_*` vars
      clobbered by the Supabase marketplace integration):
      `npx vercel env ls production --project mrc-system` → confirm
      `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (+ the other two `VITE_*`) exist
      in **Production** scope with PROD values.
- [ ] **Live smoke on mrcsystem.com:** log in → open a lead → inspection form opens
      and Section 7 shows the HEPA panel when its toggle is on → create a smoke lead,
      confirm it appears, delete it (23 Jul pattern). If a real inspection exists,
      render its PDF once and check Page 8: HEPA line, waste line, scope-of-work steps
      showing actual treatment methods, no `{{...}}` anywhere.
- [ ] **Send `docs/PRICING_AND_PROCESS_GUIDE.html` to Glen and Clayton** — the Phase 5
      quick-skim (796 words, gaps-closed section 6). Print-to-PDF or attach the HTML.

---

### ADDENDUM — second work batch (28 Jul late evening)

Five more scoped commits on local main (typecheck + build + 60/60 tests green after each):

| Commit | What |
|---|---|
| `dc17242` | fix(rules): australian-compliance.md dehumidifier $132 → $119, HEPA added to the rate line. |
| `e04b410` | docs(cost-system): SUPERSEDED banner on COST_CALCULATION_SYSTEM.md → points at PRICING_AND_PROCESS_GUIDE.html. |
| `9eb0439` | feat(ai-summary): buildAIPayload sends resolved HEPA (qty/days/cost via shared getSharedEquipmentDays helper); summary EF renders a HEPA equipment line AND its TREATMENT METHODS line now prefers the canonical treatmentMethods array (was reading only 4 legacy booleans — the array was sent but never consumed). Waste verified already present in payload + prompt. Old deployed EF safely ignores the new fields (zod record is permissive). |
| `7dae371` | feat(job-pdf): the job report previously rendered NO equipment/waste anywhere. Contents-page navy card now carries an EQUIPMENT & WASTE section via new `{{equipment_summary}}` placeholder (per-item actuals with line totals, equipment total, waste "billed once" line, graceful empty fallback). Plus the defensive catch-all placeholder strip the job EF lacked. Job template verified byte-identical to live PROD before editing; edited copy upserted to DEV Storage (DEV has no job EF → template-first is safe THERE ONLY). |
| `41c99ad` | fix(job-completion): independent re-review follow-ups (below). |

**Independent re-review of `1c663e8` (fresh agent, full run):** no criticals. 1 major
FIXED (createJobCompletion swallowed inspection-fetch errors — a transient failure
permanently forged a "never quoted" snapshot; now captures + throws, retryable). 3 minors
FIXED (waste fields in the EditSheet field-edit map; Confirm clears the override flag;
Save Override shows the amount so a cleared-field $0.00 is deliberate). 1 minor ACCEPTED
AS DESIGN (admin EditSheet can save m³ changes without re-confirming the price — the
no-stale-price invariant still holds; chips render em-dash). WasteCard state machine,
null-vs-zero semantics, and legacy-card behaviour all verified clean.

**Michael's addenda to the ordered steps:**
- ~~DEV job-report EF deploy~~ — DONE (Michael, 29 Jul) → **job-PDF render E2E run by CC
  against the deployed DEV EF: 11/11 PASS** (all four equipment lines with exact totals,
  equipment total $1,881.00, waste "(6 m³) — billed once: $550.00 ex GST", section heading
  on the contents card, zero leaked placeholders, dynamic contents page numbers intact,
  and the zeroed-row empty fallback). Test fixture: DEV job_completion `1b81f7e7-…33c5`
  left STAGED (2/3 dehumidifier, 4/3 air mover, 2/3 HEPA, 1/3 RCD, 6 m³/$550 waste,
  demolition=true) for the UI smoke.
- ~~AI-summary EF deploy to DEV~~ — DONE (Michael, 29 Jul). Probe-verified the new code
  is live: it fails fast with 500 "AI service not configured" because **DEV has ONLY the
  platform-auto secrets** (CLI-verified 29 Jul: no OPENROUTER_API_KEY, no SYSTEM_USER_UUID,
  no Resend/Slack/INTERNAL_WEBHOOK_SECRET — the L4 "set dev EF secrets" step never ran).
  AI generation on DEV works once Michael runs
  `npx supabase secrets set OPENROUTER_API_KEY=<from vault> --project-ref ctppzqnysmzynkxjlzta`
  (value from his own vault, never via chat). CC can then run a generation against the
  staged inspection and check the summary mentions the HEPA quote.
- **PROD sequence gains two uploads + two deploys:** after migrations →
  deploy `generate-inspection-pdf` AND `generate-job-report-pdf` (+
  `generate-inspection-summary` when convenient) to PROD **FIRST**, then upload BOTH
  templates to PROD `pdf-templates`: `src/templates/inspection-report-template.html`
  AS `inspection-report-template-final.html`, and `src/templates/job-report-template.html`
  AS `job-report-template.html` (same name). EF-first is MANDATORY on PROD for the job
  template too — the live PROD job EF has no catch-all, so template-first would print
  literal `{{equipment_summary}}` on customer reports.

### Known issues logged this session (separate sections below)

- GitNexus false negatives on inline-component call edges — grep-verify LOW/zero results.
- `.claude/rules/australian-compliance.md` still says dehumidifier $132/day (wrong, $119).
- `docs/COST_CALCULATION_SYSTEM.md` documents the retired volume-discount tiers as live.
- Follow-up added 28 Jul eve: `buildAIPayload` in TechnicianInspectionForm doesn't include
  the new HEPA fields, so AI summaries won't mention a HEPA quote (review finding, minor).

---

## Follow-ups from 23 Jul 2026 session (production deploy + env-var outage recovery)

Context: merging main → production (PRs #67–#71 + login-footer fix) exposed that the Supabase↔Vercel
marketplace integration had clobbered the Production-scope `VITE_SUPABASE_*` env vars (~30 Jun) —
first prod build since shipped a blank page (~1h outage, same-day recovery). Vars restored, `9fdc853`
redeployed, site verified end-to-end at 375px, all 6 active migrations from the deployed PRs
confirmed applied on prod. Smoke-test lead created + deleted same session.

- [ ] **Decide Supabase↔Vercel marketplace integration fate.** It owns env-var naming and can
      re-sync/clobber the hand-maintained `VITE_*` vars again. Either disconnect it, or document that
      `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Production) must be re-verified after any
      integration change. Pre-deploy check: `npx vercel env ls production --project mrc-system`.
- [ ] **`.env.local` + `.gitignore` from `vercel link`.** The relink auto-created `.env.local`
      (Development-scope pull) and appended `.env*` to `.gitignore`. Decide: commit the
      `.gitignore` line (recommended) and delete `.env.local` (local dev already uses
      `.env.development.local` → DEV).
- [ ] **Replace dead `SUPABASE_ACCESS_TOKEN` in the `mcp__supabase` MCP server config.** Server
      rejects all calls ("Unauthorized"); token was rotated out. Until fixed, DB access from CC
      sessions = Supabase CLI (authed) + PostgREST with keys fetched via
      `supabase projects api-keys` — or complete the Supabase MCP plugin OAuth.
- [ ] **Confirm `audited_insert_lead_via_framer` anon-revoke in Studio** (1 query — the SELECT at
      the bottom of `20260709120000_revoke_anon_execute_audit_rpcs.sql`). Its companion RPC was
      probe-verified `42501` on 2026-07-23; this one is inferred-applied only (probing would insert
      a real lead).
- [ ] **Triage the 6 old git stashes** (`xero + lead detail WIP`, `wave-1-prep`, etc. — all pre-date
      2026-07-23). Recover anything wanted, drop the rest.

---

## Follow-ups from 28 Jul 2026 session (pricing doc consolidation)

Surfaced while verifying `src/lib/calculations/pricing.ts` against the docs to build
`docs/PRICING_AND_PROCESS_GUIDE.html`. All read-only findings — no code was touched.

- [ ] **`docs/COST_CALCULATION_SYSTEM.md` is actively WRONG, not merely stale.** *(Supersedes the
      milder "stale" note in the 2 Jun list, item 4 — upgrade the severity.)* It documents the
      **retired volume-discount tier system** (7.5% / 10.25% / 11.5% / 13% by total hours) as the
      live rule across four sections, including a `calculateDiscount()` code block, a tier table, a
      worked example applying 10.25%, and test cases asserting the tiers. That system no longer
      exists — `calculateCostEstimate` returns `discountPercent: 0` unconditionally
      (`pricing.ts:376, 435`); the per-day `dayRates` model replaced it. Its "Rule 1: pro-rate under
      2 hours" also contradicts the live charging path, which enforces a **flat 2-hour minimum**
      (`calculateLabourCostWithBreakdown`, `pricing.ts:115-124`). Worked examples still use
      pre-2026-06-24 rates. Anyone reading this doc for pricing rules will be misled on the single
      most money-sensitive rule in the system. Rewrite or retire — own session.
- [ ] **`.claude/rules/australian-compliance.md` says "Dehumidifier $132/day"** — contradicts live
      `pricing.ts:28` ($119) *and* contradicts `CLAUDE.md`, which correctly says $119. This rule file
      is auto-loaded every session, so the wrong figure is in context by default. One-line fix.
- [ ] **Stale comments in `src/lib/api/invoices.ts:325-326, 361-362`** claim the 13% cap "is enforced
      by `calculateCostEstimate`'s discount tiers." Those tiers no longer exist. Consequently the
      branch at `:383` (`est.discountPercent > 0 ? ...volume discount...`) is **unreachable** — it
      builds a discount note that can never render. Real enforcement is the explicit clamp at
      `:106-108` plus the two DB CHECK constraints. Correct the comments, drop the dead branch.
- [ ] **Dead exports in `pricing.ts`.** `interpolateCost` has no importer anywhere (not even the test
      file) — live only via internal call at `:116`. `formatPercent` is imported at
      `TechnicianInspectionForm.tsx:15` with **zero call sites** in that file. Drop the unused import;
      decide whether to unexport `interpolateCost`.
- [ ] **Inspection PDF scope-of-work injection is a SILENT NO-OP in production (pre-existing, discovered 28 Jul).**
      `generate-inspection-pdf/index.ts:1539-1585` replaces the template's hardcoded Option 1/2
      scope-of-work steps with the inspection's selected treatment methods via `indexOf` markers
      (`'left: 33px; top: 157px;'`, `'top: 370px'`, `'top: 470px'`, `'top: 696px'`). Verified 28 Jul:
      the LIVE Storage template `pdf-templates/inspection-report-template-final.html` (fetched via
      public URL, byte-identical to `src/templates/inspection-report-template.html`) contains ZERO
      of those markers — its Page 8 uses static "Option 1/2 Description" A/B/C/D text at
      `top: 214px` / `top: 476px` instead. The guards (`if (opt1Idx > 0 ...)`) therefore fail
      silently and **every customer PDF ships the generic template descriptions, never the
      selected treatment methods**. Exposure verified same day (read-only PROD SELECTs): 0
      inspections, 0 pdf_versions rows, 0 report emails since the 13 Jul launch — zero launch-era
      customers received generic-description reports; no corrective re-sends needed. Key-alignment
      (old L1 item-7) re-verified: all 11 form labels match STEP_DESCRIPTIONS keys exactly, plus
      the legacy 'AFD Installation' alias. **FOLDED INTO Phase 3 of the HEPA/waste work (Michael,
      28 Jul)** — fixed in the same EF-deploy + template-upload cycle; option (a) marker fix /
      (b) placeholders / (c) delete pending Michael's pick.
- [ ] **DEV Storage has no PDF buckets content — DEV cannot render any PDF (found 28 Jul).**
      Public GETs against DEV (`ctppzqnysmzynkxjlzta`) return 400/404 for
      `pdf-templates/inspection-report-template-final.html`, `pdf-templates/job-report-template.html`
      AND `pdf-assets/pages/page-6-cleaning-estimate/logo-page6.png` (all 200 on PROD). Either the
      restore didn't carry these buckets/objects or they're not public on DEV. Blocks any preview
      E2E of PDF generation. Fix: create/verify `pdf-templates` + `pdf-assets` as PUBLIC buckets on
      DEV and copy objects from PROD. The earlier "Storage verified present" note (2026-07-07) did
      not cover these two buckets.
- [ ] **GitNexus false negative worth knowing about.** After a fresh `analyze` (10,014 symbols),
      `impact({target: "calculateWasteDisposalCost", direction: "upstream"})` returned **0 callers /
      LOW risk**, but grep proves a live call at `TechnicianInspectionForm.tsx:1696`. The call sits
      inside `Section6WasteDisposal`, a component defined *inline* within
      `TechnicianInspectionForm.tsx` rather than as its own module — the indexer appears to miss
      call edges from inline-declared components. `calculateCostEstimate` resolved correctly
      (CRITICAL, 5 direct callers). **Always grep-verify a LOW/zero-impact GitNexus result before
      trusting it**, especially for symbols consumed by the inline sections of the big form files.

---

## Bugs & decisions found 2 Jun 2026

Surfaced during the business-logic / flow audits (read-only investigations). Code fixes are each their own session — logged here, not yet actioned.

1. **Manual-invoice GST = $0 lump-sum branch is latent dead code (low priority).** *Corrected 3 Jun 2026 — the earlier "GST=$0 is the default path" claim was a misreading.* In normal use the live invoice-create path is `InvoiceSummaryCard → createInvoice`, which **splits GST correctly** (and only renders at status `job_report_pdf_sent` with no existing invoice). The `gst_amount = 0` lump-sum branch in `InvoicePaymentCard.handleCreate` is **UNREACHABLE**: the card only mounts when an invoice already exists (`LeadDetail.tsx:2413`, `if (invoice)`), but that create branch only runs when there is *no* invoice — so it never renders. **Not current behaviour; no customer impact today.** Fix (low priority, own session): harden the unreachable branch to split GST so it's safe if the gating is ever re-wired.

2. **AFD not wired + not captured as billable equipment.** AFD is a method toggle only ("AFD Installation") — no qty×days line like dehumidifier/air mover/RCD in the quote engine. `$75` in `Section7Equipment.tsx` is a placeholder (only AFD number anywhere; usage qty/days IS captured on the job form via `actual_afd_qty`/`actual_afd_days` but never SELECTed in `autoPopulateFromLead`, no line emitted, absent from `pricing.ts`). Bills **$0**. **Decision: $75/unit/day ex GST provisional, flagged for Glen/Clayton, not applied yet.** Fix own session — confirm rate, ensure qty/days capturable through to billing, wire AFD through quote → invoice → PDF.

3. **Section 7 "both options" save guard over-fires (not data loss).** *Clarified 3 Jun 2026.* "Option 1 total could not be computed; ensure surface treatment hours are entered before saving in Both-options mode" is an **intentional integrity guard** — it blocks saving a $0/blank price to one option's customer PDF. The problem is it's wired into the shared save function (`handleSave`), so it over-fires: it blocks auto-save and section navigation, not just final submit, and surfaces a legitimate "no hours yet" state as a "Save Failed" error. **Data is retained in normal use** (the throw precedes all state resets + DB writes; in-memory form state + 30s localStorage backup survive). Only real loss risk: a brand-new inspection that has never had a successful save (so no localStorage backup key yet) being hard-reloaded before any save. Fix (own session): enforce the non-zero check only at submit / PDF-generation time; let sections auto-save freely.

4. **`docs/COST_CALCULATION_SYSTEM.md` is stale.** Documents under-2h work as pro-rated and equipment as direct-total entry; live code charges a flat 2-hour minimum and equipment as qty×rate×days. Fix or retire — own session.

5. **Waste disposal — billing decision needed.** Recorded as a size (Small/Medium/Large) for reporting context only; never a dollar amount, not billed, no rate set. Confirm with Glen/Clayton whether it should be charged to customers.

---

## Phase 2 — Job Completion Workflow: Existence Verification (2026-07-07)

Read-only investigation cross-checked `docs/JOB_COMPLETION_PLAN.md` against disk + prod DB. All six sub-phases (2A–2F) are **BUILT — existence-verified [2026-07-07], runtime-untested against dev.** This confirms files/tables/routes EXIST; it does NOT confirm runtime behaviour. Not "complete" or "done" until the E2E gate below passes.

- **2A Data & types — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** `src/types/jobCompletion.ts`, `src/lib/api/jobCompletions.ts`, all 8 Phase 2 statuses in `src/lib/statusFlow.ts` (pending_review, job_waiting, job_completed, job_report_pdf_sent, invoicing_sent, paid, google_review, finished), AFD/HEPA rate in `pricing.ts` (`hepaAirScrubber`).
- **2B Form — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** all 10 sections at `src/components/job-completion/` (Section1OfficeInfo…Section10OfficeNotes; Section7 is `Section7Equipment.tsx`), routed page `src/pages/JobCompletionForm.tsx` at `/technician/job-completion/:leadId`, technician entry button in `TechnicianJobDetail.tsx`.
- **2C Job report PDF — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** `supabase/functions/generate-job-report-pdf/` EF; view/edit/approve unified into `ViewReportPDF.tsx` via `reportType` detection (no standalone `ViewJobReportPDF.tsx` — deleted by design).
- **2D Admin/invoice — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** `src/pages/AdminInvoiceHelper.tsx` routed + admin-gated at `/admin/invoice/:leadId` (`src/App.tsx`), `src/hooks/usePaymentTracking.ts`, LeadDetail job/invoice/review cards.
- **2E Payment automation — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** `supabase/functions/check-overdue-invoices/` EF + `usePaymentTracking`. (Cron migration + individual Slack templates not separately verified.)
- **2F Google review & closure — BUILT (existence-verified [2026-07-07], runtime-untested against dev):** `GoogleReviewSection` + `FinishLeadSection` in `LeadDetail.tsx`, `sendGoogleReviewEmail` in `notifications.ts`.
- **DB (prod `ecyivrxjpsmjmexqatym`, SELECT-only):** `job_completions` (67 cols), `job_completion_pdf_versions` (13 cols), `invoices` (30 cols) all present.

### Confirmed-remaining gaps (open — do not hide)

- [ ] **No offline Dexie draft store for job completion.** `jobCompletionDrafts` was never added to `src/lib/offline/db.ts`; the `version(2)` bump added `quarantinedPhotos` instead. The inspection form has offline draft support; the job completion form does NOT — the zero-data-loss principle is not met for this form.
- [ ] **No standalone `src/lib/schemas/jobCompletionSchema.ts`.** Validation is inline (form/hook), not a discrete Zod schema like `inspectionSchema.ts`. Extract it, or document the decision to keep validation inline.
- [ ] **Pricing discrepancy — dehumidifier rate.** `src/lib/calculations/pricing.ts` has `dehumidifier: 119`, but PRD/CLAUDE.md say `132`. Unresolved — needs verification against business records. DO NOT change pricing here; fold into the L1 pricing session (rate reconciliation).
- [ ] **Runtime E2E test of full job completion workflow against mrc-dev** — form save → PDF → invoice → payment → review → finish. Nothing above is runtime-verified; this is the gate that turns "BUILT" into "working."

---

## Launch Model

Three-stage green flag.

1. **Pre-test green flag (Michael):** All L blockers + S should-fix items resolved. Michael confirms "this is production, not MVP."
2. **Tester green flag (Glen + Clayton + Vryan):** They walk through full system including all T smoke surfaces. They must be happy. Vryan = admin role for testing purposes.
3. **Customer launch green flag (Michael):** Only after both above. Real Framer form connected, customers can use it.

---

## Launch Rollback Plan

- **Hybrid launch (2026-07-13):** From 2026-07-13, all new leads flow through the MRC system. Existing jobs already past the inspection-booking stage remain in ServiceM8 and run to closure there — no mid-flight job is migrated into MRC.
- **Rollback path if MRC breaks post-launch:** New leads get manually logged into ServiceM8 — the same process used before launch. No data migration is required to revert; MRC simply stops being the intake path and staff fall back to the existing ServiceM8 manual workflow.

---

## Open Questions for Michael (blocking input)

Items that need a decision from you, not engineering work. Resolving these unblocks L-section work.

- **AFD equipment daily rate** — `src/components/job-completion/Section7Equipment.tsx:9` uses `$75/day` as a placeholder. Comment at :166 reads "Confirm with Michael before going live." Real impact: every job using AFD will quote wrong until this is locked. Need the real rate to seed the constant.

---

## PDF Pipeline Rebuild — Post-Launch Cleanup (added 2026-05-24)

After the PDF Pipeline Rebuild (server-render + versioning + mismatch guard) lands and is proven in preview/production, these consolidation items should be addressed. Tracked here, not blocking launch.

- **PDF-CL1 — Repurpose / rename misleading `pdf_versions.pdf_url`.** Column currently holds the HTML URL written by the legacy `generate-inspection-pdf` EF (since 2024-12-21). The new pipeline writes `pdf_storage_path` for the actual PDF. Two columns now coexist with related-but-different semantics. Action: rename `pdf_url` to `html_public_url` (its actual content) and update consumers; legacy rows preserved.
- **PDF-CL2 — Decommission legacy EF write to `pdf_versions`.** `supabase/functions/generate-inspection-pdf/index.ts:1881-1894` still inserts a row on every render. Once the new pipeline is proven, remove this insert — `pdf_versions` should have one source of truth (the hard-save and manual-upload paths).
- **PDF-CL3 — Mirror the pipeline to job-completion reports.** `job_completion_pdf_versions` already exists; the `if (reportType === 'job')` branches in `handleDownload` / `handleSendEmail` still use the old print-window + client-side conversion pattern. Apply the same hard-save / mismatch-guard / version-history design.
- **PDF-CL4 — Deprecate `inspections.pdf_blob_url`.** Once nothing reads it (handleSendEmail no longer uses it post-Phase 5; only `handlePdfUpload` writes for back-compat), drop the column. Verify with grep across `src/` first.
- **PDF-CL5 — Consider adding audit trigger on `pdf_versions`.** Not currently in the canonical audit-table list (per CLAUDE.md). Adding one would require explicit approval per the Phase-2-audit-foundation lock. Worth doing for the full picture of who hard-saved / uploaded when.
- **PDF-CL6 — Add Vercel deploy-time delete of `SUPABASE_SERVICE_ROLE_KEY` (Preview scope).** Phase 2 removed all reads of this env var from `api/render-pdf.ts`. After preview deploys prove the renderer doesn't need it, delete the Preview-scoped secret from Vercel so the god-key isn't sitting on the edge waiting for the next callsite to add it back.
- **PDF-CL7 — `previewOnly` calls should leave an audit row.** Phase 4a security-review (LOW finding) — the previewOnly EF branch makes zero writes, so an admin (or compromised admin) can repeatedly exfiltrate inspection HTML with no forensic trail beyond `console.log`. Same hole now exists on the job EF previewOnly branch added 2026-06-01 — single fix covers both.
- **PDF-CL8 — Unified job-report version-history UI.** The 2026-06-01 job-report hard-save mirror (`api/render-job-report-pdf` + `jobReportPipeline.ts`) writes new `job_completion_pdf_versions` rows tagged `generation_type='hard_save'` with `pdf_url` NULL (pdf lives at `pdf_storage_path`). The legacy switcher in `ViewReportPDF.tsx` (~line 2520) reads `pdf_url`, so the query was filtered with `.not('pdf_url','is',null)` to hide hard-save rows from it. Hard-save versions are reachable via re-clicking Download. Follow-on: build a job equivalent of `src/components/pdf/ReportVersionHistory.tsx` that lists both legacy HTML and hard_save PDF rows with Download buttons per row (mirror inspection version history).
- **PDF-CL9 — Mirror PDF-CL3 deprecation for the job HTML EF.** Once the new hard-save path is proven, the `generate-job-report-pdf` EF's HTML-bucket-upload + `job_completion_pdf_versions` INSERT (lines ~405-461) becomes redundant for the Send flow. Keep the EF for previewOnly HTML refresh used by `handleGenerate`, but remove the legacy write path so `job_completion_pdf_versions` has one source of truth (hard-save). Symmetric with the inspection-side PDF-CL2.
- **PDF-CL10 — Drop `job_completions.pdf_blob_url` column.** The 2026-06-01 job-send rewrite removed all reads of `pdf_blob_url` from the email path. Other callers should be greppped before drop. Symmetric with the inspection-side PDF-CL4.

## Wave 6.1 — Cleanup PR (post-Wave-6 deploy, target: within 48h)

Scheduled by Michael 2026-05-14 after Wave 6 audit gates returned GO. Non-blocking nits surfaced by the Phase 8 audit pass.

- **W6.1-A — Enum render parity** — `property_occupation` displays differently across surfaces. `LeadDetail.tsx` Card 8 (~:1820) uses an explicit label map ("Owner Occupied", "Tenants Vacating"). `TechnicianJobDetail.tsx:530-541` uses `replace(/_/g, ' ')` + lowercase capitalize ("Owner occupied", "Tenants vacating"). Extract shared helper or copy the map for consistency. Source: Phase 8f code-reviewer.

- **W6.1-B — Defensive `old` status in FinishLeadSection** — `LeadDetail.tsx:2430` hardcodes `old: 'google_review'` in the `logFieldEdits` call. Section gated on `lead.status === 'google_review'` upstream so it's correct in practice, but if the gate ever changes the audit log will lie. Read from `lead.status` instead. Source: Phase 8f code-reviewer.

- **W6.1-C — Performance: `Promise.all` snapshot fetches** — Two opportunities surfaced by Phase 8e performance-reviewer:
  - `TechnicianInspectionForm.tsx:3392-3420` — three sequential `await`s for inspection/areas/subfloor snapshots before each section save. Wrap as `Promise.all` → saves ~300ms per autosave (autosave fires every 30s during multi-hour inspections). **Highest impact.**
  - `TechnicianJobDetail.tsx:198-213` — `subfloor_data.maybeSingle()` + `inspection_areas` fetch are sequential. Wrap as `Promise.all` → saves ~100-200ms per Tech Job Detail open on van WiFi.

- **W6.1-D — Misleading test name** — `pricing.test.ts:154` test is named "should null-clear option2..." but actually validates `calculateCostEstimate` returns a finite positive total (null-clear lives in TIF, not pricing.ts). Rename to "should produce a finite positive total for the option1-only path". Source: Phase 8f code-reviewer.

- **W6.1-E — Ugly inline cast** — `ViewReportPDF.tsx:1015` has a huge inline cast `(lead as { id: string; full_name: string; email?: string; ... }).status`. Extract a small typed local interface or narrow to `(lead as { status?: string }).status`. Cosmetic. Source: Phase 8f code-reviewer.

- **W6.1-F — Caption regex anchor (orphan EF)** — `supabase/functions/check-photo-moisture-orphans/index.ts` regex `/^moisture$|\d+(\.\d+)?%/i` lacks a `$` anchor after the percent group, so `"42%abc"` matches. Tighten to `/^moisture$|^\d+(\.\d+)?%$/i`. False positives are cheap warnings only; this is optional polish. Source: Phase 8f code-reviewer.

- **W6.1-G — Migration filename time-suffix convention** — `supabase/migrations/20260513_phase5_dead_column_drop.sql` lacks the 6-digit `HHMMSS` suffix that all other recent migrations use. Sort order is fine (sorts before `20260513122754_...`); this is cosmetic only. Source: Phase 8f code-reviewer.

- **W6.1-H — EF `details` leakage** — `check-photo-moisture-orphans/index.ts:92` returns `details: queryError.message` to the caller. Per error-handling rules, never expose raw DB errors. Function is service-role-only (not user-facing) so impact is minimal, but scrub to a generic message. Source: Phase 8d security-reviewer (LOW severity).

---

## Launch Blockers (MUST fix before Glen + Clayton + customers start using)

### L1 — Equipment pricing audit + AFD rate
- **Status:** Investigation complete (2026-05-11) — Michael APPROVED defer to future session with business records. **Parked, not active.**
- **Estimate:** Re-scope needed. Original "30 min" estimate was wrong; real scope is multi-decision spanning pricing engine + customer PDF + invoice generation.

- **What customers ACTUALLY see today on inspection PDF page 8:**
  - "Commercial dehumidifier: $132/day × {qty}"
  - "Air Mover: $46/day × {qty}"
  - "RCD Box: $5/day × {qty}"
  - "Capped at 5 days" (always literal text, regardless of actual quote days)
  - No equipment days shown
  - No AFD line
  - Rates render even when qty = 0 (informational)

- **Findings deferred (no decision made tonight):**

  1. **Rate reconciliation between code and reference doc**
     - Code: $132 dehumidifier / $46 air mover / $5 RCD
     - Reference doc Michael shared (2026-05-11): $118 dehumidifier / $44 air mover, no AFD/RCD specified
     - Michael's call: leave code rates as-is. Reference doc context unclear (old? supplier? planning artifact?)
     - Action when decided: if doc is canonical, update 4 surfaces — pricing.ts:22-26, Section7Equipment.tsx:6-11, inspectionUtils.ts:57-61, and the hardcoded literals in generate-inspection-pdf/index.ts:1345-1347

  2. **"Capped at 5 days" — cosmetic display, not enforced in code**
     - PDF tells customer "Capped at 5 days" (hardcoded at generate-inspection-pdf/index.ts:1534)
     - Code does NOT enforce this cap — pricing.ts:219-227 calculates `days = Math.max(1, Math.ceil(totalLabourHours / 8))` with no upper bound
     - A 50-hour job calculates 7 equipment days, customer PDF still says "capped at 5"
     - Michael confirmed 5-day cap IS the real policy
     - Action when decided: clamp days to max 5 in pricing.ts calculateEquipmentCost (touches "sacred" pricing — requires careful test)

  3. **AFD invisibility across system**
     - Tech form (Section7Equipment.tsx) has AFD field with $75 placeholder rate
     - AFD not in pricing.ts EquipmentInput/EquipmentResult types
     - AFD not in invoices.ts line items — invoice generation silently drops AFD cost
     - AFD not in customer-facing inspection PDF (no `{{equipment_afd}}` placeholder)
     - Real AFD rate unknown
     - Action when decided: either (a) thread AFD through pricing engine + invoice + PDF with real rate, or (b) remove AFD from tech form entirely if it's a phantom feature

  4. **Zero-equipment jobs still display rate card**
     - generate-inspection-pdf/index.ts:1345-1347 ternary false branch shows bare rate when qty=0
     - Customer sees "$132/day, $46/day, $5/day" even on jobs with no equipment hire
     - May be intentional (informational rates) or a display bug
     - Michael's call: leave as-is

  5. **Equipment days never shown to customer**
     - Customer sees rate × qty (e.g. "$132/day × 1") but no duration
     - Cannot compute their own total from PDF
     - Michael's call: leave as-is

  6. **Three duplicate EQUIPMENT_RATES blocks (drift risk)**
     - src/lib/calculations/pricing.ts:22-26 (canonical, exported, no AFD)
     - src/components/job-completion/Section7Equipment.tsx:6-11 (local, has AFD)
     - src/lib/inspectionUtils.ts:57-61 (local, no AFD)
     - Updating one without the others creates silent drift

  7. **STEP_DESCRIPTIONS key alignment risk**
     - generate-inspection-pdf/index.ts:247-314 hardcodes 11 toggle description keys
     - Section 5 toggle labels in form must match these keys exactly
     - Suspect mismatches:
       - Section 5 "Containment & PRV Preparation" vs EF key "Containment and Prep"
       - Section 5 "Surface Mould Remediation" vs EF key "Surface Remediation Treatment"
     - If labels don't match keys, descriptions silently drop from customer PDF
     - Action when decided: verify treatment_methods array values vs EF keys, align or remap

  8. **docs/COST_CALCULATION_SYSTEM.md is stale**
     - Says "Equipment is entered as a direct total cost (ex GST), not calculated from quantities and rates" — wrong
     - Reality: qty × rate × days is the canonical path
     - Doc version 1.0, last updated 2026-01-08

- **Why deferred:** Investigation surfaced 8 separate issues, multiple touch pricing code that's marked "sacred" with 13% discount cap CHECK constraint. Decisions affect customer-facing rates and money flow. Requires fresh head + verification against business records before any change ships.

### L2 — Variation context admin panel
- **Status:** ❌ CANCELLED 2026-05-12. UI panel work removed from launch scope.
- **What shipped:** Data-layer hook `src/hooks/useVariationContext.ts` (commit 30bf3bc) — kept in codebase as dormant code. Hook is unused, typechecks clean, no impact on production.
- **Reason for cancellation:** Michael's call. Variation context can be reviewed via the existing JobCompletionSummary card + audit_logs in Supabase Studio. Standalone admin panel UI deemed unnecessary for launch.
- **Future:** If a variation context UI is ever needed, the hook is ready to consume. Re-open as a post-launch backlog item, not a launch blocker.

### L3 — Framer → Supabase lead capture (FINAL pre-launch step)
- **Estimate:** 1-2h
- **Status:** Hold until customer-launch green flag (per launch model). The real Framer site form is intentionally NOT connected. Currently a fake Framer test form drives the entire pipeline end-to-end for testing.
- **Scope when activated:** Connect real Framer site form → `receive-framer-lead` Edge Function. EF is deployed and tested.
- **Tasks (deferred until green flag):**
  - [ ] Connect real Framer form to `receive-framer-lead` EF
  - [ ] End-to-end test: form submit → lead row → customer confirmation email → Slack notification

### L4 — Environment separation (dev Supabase + Vercel preview env vars)
- **Estimate:** 3-4h
- **Scope:** Stop preview deploys hitting production DB. Stand up dev Supabase project; run all migrations; wire Vercel Preview env vars.
- **Runbook:** `docs/L4-environment-separation-plan.md` (Phases 1–5) + `docs/KEY_ROTATION.md` (Phase 6 full rotation). Tagged [HUMAN]/[CC] sequence agreed 2026-06-02.
- **Progress (2026-06-02):**
  - [x] **Phase 0 [CC] — env-aware refs (prod-safe, on `main`):** Supabase origin de-hardcoded — `sentry.ts` trace target derives from `VITE_SUPABASE_URL`; `vercel.json` CSP uses `https://*.supabase.co` + `wss://*.supabase.co`; PDF-viewer fonts bundled locally (`public/fonts/`, `index.css`); `reportHash.test.ts` fixture neutralised. Commits `734a2af` / `8ee3aec` / `942e9b5`. Only remaining hardcoded ref is the server-rendered PDF template (intentional — public read-only fonts).
  - [x] **KEY_ROTATION.md added** (`e34dbec`) — secret inventory + Phase 6 runbook. Surfaced `INTERNAL_WEBHOOK_SECRET` (missing from the original L4 doc); confirmed `.env` git-history exposure (Oct–Dec 2025).
  - [x] **Dev project wired + local override live (2026-07-07):** Separate DEV Supabase project (ref `ctppzqnysmzynkxjlzta`) created via **Restore-to-New-Project** — schema + Storage + extensions verified present. Local `npm run dev` now points at DEV through `.env.development.local` (`VITE_SUPABASE_URL` override); production (mrcsystem.com) confirmed still on prod ref `ecyivrxjpsmjmexqatym`, verified by reading both deployed bundles. Satisfies the intent of Phases 1–2 via the restore path (not the planned empty-project + 86-migration replay). **Remaining optional check:** end-to-end write-divergence test — create a record → confirm it lands in DEV and is absent in PROD.
  - [ ] **Phase 1 [HUMAN] — NEXT (deferred):** create `mrc-system-dev` Supabase project (same org, `ap-southeast-2`, free tier), enable `pg_cron` + `pg_net`, paste dev ref/URL/anon/service_role → [CC] verifies `public` schema empty.
  - [ ] Phase 2 [HUMAN] apply 86 migrations (skip the 2 cron) + seed Storage; [CC] schema diff.
  - [ ] Phase 3 [HUMAN] set dev EF secrets (incl. `INTERNAL_WEBHOOK_SECRET` + new Slack dev webhook) + deploy 12 EFs; [CC] smoke test.
  - [ ] Phase 4 [HUMAN] 🔴 set Vercel **Preview-scope** env → dev (Preview only — the one prod-risk step).
  - [ ] Phase 5 [CC] verify preview hits DEV + prod untouched.
  - [ ] Phase 6 [HUMAN] full key rotation (new→verify→revoke; Supabase/GitHub PATs LAST) per KEY_ROTATION.md.
  - [ ] Create test technician accounts in dev for walkthrough.
- **Open input:** Q4 `ADMIN_FALLBACK_EMAIL` (dev) = current mrcsystem.com admin email — set literal at Phase 3.
- **Blocking:** can't safely run Glen/Clayton walkthrough on prod data.

### L5 — Email domain switch to `mouldandrestoration.com.au`
- **Estimate:** 3-4h (mostly DNS wait)
- **Tasks:**
  - [ ] Update DNS records (SPF, DKIM, DMARC)
  - [ ] Update Resend configuration
  - [ ] Test deliverability (inbox vs spam)
- **Blocking:** brand integrity. Customer-facing emails currently send from non-MRC domain.

### L6 — Activate Glen + Clayton + Vryan production accounts ✅ COMPLETE
- **Status:** Accounts activated (confirmed by Michael 2026-05-12). Glen + Clayton + Vryan can log in to production.

### L7 — Glen/Clayton E2E walkthrough on dev
- **Estimate:** 1 day wall-clock (mostly human time)
- **Dependency:** L4 (dev environment must exist). L1 parked, L2 cancelled — neither blocks.
- **Tasks:**
  - [ ] Run the 18 smoke scenarios in the T section against dev DB with a test tech account
  - [ ] Fix anything material before scheduling Glen + Clayton
  - [ ] Schedule and run actual Glen + Clayton walkthrough on dev
  - [ ] Address walkthrough feedback (variable — could be 0h to 1-2 days)
  - [ ] Author `docs/walkthrough-YYYY-MM-DD.md` per plan v2 §6.1.C Definition of Done (sign-off artefact)

---

## Should-Fix Before Launch (high-impact, not blockers)

### S1 — Stage 6.1 — `email_logs.sent_by` capture
- **Estimate:** 5 min (live runtime verification only)
- **Status:** CODE COMPLETE — implemented as part of Phase 2 audit foundation (commit `a0ae550`, 2026-05-01). The TODO entry that described this as outstanding was based on stale info.
- **Implementation verified in code:**
  - `send-email` EF schema accepts `userId` (`supabase/functions/send-email/index.ts:27-46`)
  - `send-email` EF writes `sent_by` to email_logs (line 214)
  - Frontend wrapper `sendEmail()` auto-fills `userId` from session (`src/lib/api/notifications.ts:312-322`)
  - System callers (`send-inspection-reminder`, `receive-framer-lead`) write `sent_by = SYSTEM_USER_UUID` directly
  - `email_logs.sent_by` column has existed since `20251111000008` (predates Phase 2)
- **Remaining work (live verification):**
  - [ ] Verify `SYSTEM_USER_UUID` env var is set in production Supabase secrets (`npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym`, expected value: `a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f` per CLAUDE.md memory)
  - [ ] Verify recent email_logs show non-NULL `sent_by`: `SELECT sent_by, COUNT(*) FROM email_logs WHERE sent_at > NOW() - INTERVAL '7 days' GROUP BY sent_by;`
  - If either fails: real S1 work is a config fix (set env var or fix attribution-missing callers), not code.

### S2 — Plan v2 missing footnote (PostgREST 400 sequencing)
- **Estimate:** 15 min
- **Scope:** Add the third footnote to plan v2's "Execution-time amendments (2026-05-10)" section. Grep confirms zero `PostgREST` / `PGRST` / `HTTP 400` hits in the plan today.
- **Why:** doc completeness from tonight's work. Other two footnotes (Stage 3.5 OR-predicate, Stage 4.2 RLS+offline) absorbed in commit `2ce5a55`.

### S3 — ~~Delete `src/pages/AdminInvoiceHelper.tsx` dead code~~ — STALE claim, corrected 2026-07-07
- **Correction (2026-07-07):** `AdminInvoiceHelper.tsx` is **NOT dead code**. On current disk it is imported (`src/App.tsx`) and actively routed + admin-gated at `/admin/invoice/:leadId`. The earlier "no route / route removed" note is stale — the route exists. **Do NOT delete.**
- **Follow-up (open):** [ ] Reconcile intent — decide whether the invoice-helper route is wanted for launch or should be removed. If kept, it needs runtime testing (covered by the Phase 2 E2E gate). Confirm with Glen/Clayton before any delete.

### S4 — Refresh CLAUDE.md "Current State" block
- **Estimate:** 15 min
- **Scope:** CLAUDE.md says "Phase 2: IN PROGRESS" — actually Phase 2 is functionally complete (one gap: L2). Same staleness pattern as the pre-refresh TODO.md. Separate commit so this TODO refresh stays scoped.
- **Why:** future sessions read CLAUDE.md first; stale status misdirects.

### S5 — Refresh `docs/PHASE_2_EXECUTION.md` "16 active tables" count
- **Estimate:** 15 min
- **Scope:** Table count is stale. New tables since: `job_completions`, `invoices`, `job_completion_pdf_versions`, `ai_summary_versions`, `photo_history`. Plus `photos.deleted_at` column. Refresh the schema overview table.
- **Why:** doc hygiene; reference doc cited from CLAUDE.md.

### S6 — Fix stale comment in `Section8Variations.tsx`
- **Estimate:** 5 min
- **Scope:** `src/components/job-completion/Section8Variations.tsx:54-57` has a code comment promising:
  1. "variation details are included in Job Report PDF page 7" — UNTRUE (grep of `generate-job-report-pdf/index.ts` and `job-report-template.html` returns zero variation hits)
  2. "invoice helper pre-populates a variation line item" — the `AdminInvoiceHelper.tsx` route exists and is admin-gated (NOT dead code — see S3 correction 2026-07-07); whether it actually pre-populates a variation line item is runtime-unverified
- **Fix:** Update comment to reflect reality: variations are captured for admin context (see L2 panel); customer-facing rendering is out of scope.
- **Why:** Stale comments mislead future readers and caused tonight's analysis confusion about variation handling.

---

## Untested Smoke Surfaces (Phase 3 + Phase 4 shipped tonight)

Tonight's deploy passed typecheck + unit tests + audit verification + programmatic smoke. **Zero E2E or manual UI testing.** Walked through under L7 with Glen + Clayton.

### Inspection form (technician)
- [ ] **T1** — Caption gating: try uploading a photo with empty caption → expect rejection. Verify PhotoCaptionPromptDialog appears for all 5 upload sites (standard area, cover, additional, subfloor, outdoor).
- [ ] **T2** — Cover photo caption persistence (Stage 1.2): set cover caption → upload next cover → previous cover's caption NOT blanked.
- [ ] **T3** — `stainRemovingAntimicrobial` toggle (Stage 1.1): toggle on → save → reload → still on.

### Photo upload + offline
- [ ] **T4** — Offline upload + caption gate (Stage 4.1.5): go offline, upload photo, complete caption, reconnect → photo syncs, history row created.
- [ ] **T5** — Quarantine path (Stage 4.1.5): force a captionless dequeue → photo lands in quarantine → QuarantinedPhotosBanner appears → "Add caption & retry" works → "Discard" works.

### Photo soft-delete (Stage 4.3)
- [ ] **T6** — Soft-delete from inspection form: delete → photo disappears from UI → DB row has `deleted_at` populated → Storage object unchanged → `photo_history` row with `action='deleted'`.
- [ ] **T7** — Soft-delete from ViewReportPDF: same flow from admin PDF edit surface.
- [ ] **T8** — Soft-deleted photos hidden everywhere: AI prompt, customer PDF, job completion before-photos picker, Section 3 picker, Section 4 picker, technician inspection form area display.
- [ ] **T9** — Cascade verification: delete a moisture reading → photo's `moisture_reading_id` goes to NULL (not cascade-deleted).

### AI summary versioning (Phase 3)
- [ ] **T10** — Initial generation (Stage 3.2): trigger AI summary → new `ai_summary_versions` row with `version_number=1`, `generation_type='initial'`, all metadata captured (model, prompts, tokens).
- [ ] **T11** — Regeneration with feedback (Stage 3.2): enter feedback text → regenerate → new version with `version_number=2`, feedback persisted, previous version `superseded_at` set.
- [ ] **T12** — Manual edit (Stage 3.3): edit a field → save → new version with `generation_type='manual_edit'`.
- [ ] **T13** — Approval (Stage 3.4): click "Approve & Send" → latest version row gets `approved_at` / `approved_by` populated.
- [ ] **T14** — StalePdfBanner (Stage 3.4.5): regenerate AI summary after PDF sent → banner shows "PDF is stale" → approve & regen PDF → banner clears.

### Job completion (Phase 2 — sections touched by Phase 4)
- [ ] **T15** — Section 3 Before Photos (Phase 4.2): toggle photo to/from job → `photo_history` row with `action='category_changed'` written, both deltas captured.
- [ ] **T16** — Section 4 After Photos: new photo upload from job site → caption-gated → history row `action='added'`.
- [ ] **T17** — Job report PDF generation: submit job completion → admin approves → PDF generates → email sends.

### Customer PDF (Phase 4.3)
- [ ] **T18** — Soft-deleted photos excluded from PDF: visual confirmation that PDF renders cleanly with the new `WHERE deleted_at IS NULL` predicate.

---

## Remaining Plan v2 Stages (post-launch)

26 stages from `docs/inspection-workflow-fix-plan-v2-2026-04-30.md` not yet shipped. None block launch. Sequence and priorities below.

### Customer-facing PDF changes (separate IP decision)
- **Stage 4.6** — PDF embeds captions as visible text (S, Low) — moved from S-tier per Michael's design IP boundary. Defer until separate design IP decision.
- **Stage 8.1 + 8.2** — PDF per-area env readings + subfloor landscape (S, Low) — moved from S-tier per Michael's design IP boundary. Defer until separate design IP decision.
- **Waste disposal on customer PDF (Brief 2 follow-up)** (S, Medium) — the customer inspection PDF cost breakdown does not yet render the confirmed waste-disposal line. Wire it through the `generate-inspection-pdf` EF (`{{waste_disposal}}` placeholder) + the Storage template `inspection-report-template-final.html`. **Plus a "Both options" gap:** in Both-options mode the Option 1/Option 2 subtotals deliberately exclude waste (it's a single job-level cost billed once via the invoice), so a customer reading the report sees option totals without waste → possible invoicing surprise. Decide how to surface the job-level waste line in Both-options mode. In-app surfaces (Section 9 total, editable PDF preview, invoice) already include waste; this is customer-render only. Code NOTE left in `src/components/pdf/ReportPreviewHTML.tsx`. Defer until the PDF/design-IP sprint.

### Phase 3 polish (after launch, low priority)
- **3.6** — Remove orphan AI Edge Functions (S, Low)
- **3.7** — Version history UI on InspectionAIReview (M, Low)

### Phase 4 polish
- **4.4** — Backfill review of 58 NULL-caption photos (L human time, Medium) — admin session
- **4.5** — AI prompt includes captions (S, Low)
- **4.7** — Customer email references key photos with thumbnails (S, Low)

### Phase 5 — PDF versioning hygiene
- **5.1** — FK `pdf_versions` → `ai_summary_versions` (S, Low)
- **5.2** — Supersession columns on `pdf_versions` (S, Low)
- **5.3** — Storage retention policy cron (M, Low) — significant Storage cost reduction
- **5.4** — Verify Stage 1.4 debounce holding (S, Low) — dependent on PR-B in production for ≥1 week

### Phase 6 — Email integrity
- **6.2** — Capture email body (`body_html` + `body_hash`) (S, Low)
- **6.3** — FK `email_logs` → `pdf_versions` (S, Low)
- **6.4** — Audit historic NULL `sent_by` rows (S, Low)

### Phase 7 — Pricing in DB (top-5 risk; do as one campaign)
- **7.0** — Pricing test fixture suite (S, **High**) — prerequisite to all of Phase 7
- **7.1** — `pricing_rates` table replaces constants (L, **High**)
- **7.2** — `quote_snapshots` table (M, Medium)
- **7.3** — Pricing engine reads from DB with feature-flag fallback (M, Medium)
- **7.4** — Snapshot writer (M, Medium)
- **7.5** — Pricing history UI (M, Low)
- **7.6** — Remove pricing constants (S, Medium) — final cleanup, dependent on 7.5 in prod ≥1 week

### Phase 8 — Render coverage sweep
- **8.3** — InspectionAIReview missing fields (S, Low)
- **8.4** — Lead Detail missing fields (M, Low)
- **8.5** — Resolve `external_moisture` DUP (M, **High**) — pre-flight diff required
- **8.6** — Persist `address` from Section 1 (S, Low)
- **8.7** — Surface triage / requested_by / attention_to (S, Low)

### Phase 9 — Hygiene + orphans
- **9.1** — Confirm orphan EFs removed (S, Low)
- **9.2** — `direction_photos_enabled` decision (S, Low) — user input required
- **9.3** — Audit dead columns (M, Low) — depends on Phases 1-8 + 9.4 done
- **9.4** — Drop redundant `inspections.last_edited_at` / `last_edited_by` columns (S, Low) — depends on Stage 2.1 in prod ≥2 weeks

### Phase 10 — Audit UI
- **10.1** — Per-field history popover (L, Medium)
- **10.2** — Dedicated `/admin/audit` page (XL, Medium) — exclusive surface for raw audit_logs
- **10.3** — Per-field "Revert" affordance (L, Medium)
- **10.4** — Activity timeline structured display (M, Low)

### Post-Launch UX improvements
- **UX: Raise DEMOLITION_PHOTO_LIMIT cap** — Cap currently exists due to UI/performance issues with re-arranging and editing photos after upload. Future work to fix underlying photo grid performance + editing UX so the cap can be raised. Tracked but not blocking launch.

---

## Post-Launch (deferred to MRC business accounts)

- [ ] Migrate all API services to dedicated MRC business accounts (Google Cloud, Resend, OpenRouter, Sentry)
- [ ] Switch email sender domain to `mouldandrestoration.com.au` (depends on L5)
- [ ] Transfer Resend domain verification to MRC account

---

## Post-Launch (Deferred)

### Revision Lifecycle — Tech Debt (deferred until dev DB exists)

- [ ] PR-T1: `revision_needed` status enum cutover
  - Replaces overloaded `job_scheduled` for sent-back jobs with a
    first-class `revision_needed` status
  - Eliminates the dashboard Next-Up Set-subtraction patch AND the
    LeadDetail.tsx discriminator override
  - 🔴 HIGH RISK: enum migration + data backfill on shared prod DB
  - Sequence: migration in Studio (human) → npx supabase gen types →
    backfill in Studio (human) → code merge → preview QA on tech
    account → prod promote. /plan + manager agent required.
  - BLOCKED until dev Supabase project exists (see Environment Separation)

- [ ] PR-T2-cleanup: collapse the discriminator override JSX in
  LeadDetail.tsx to a one-line statusConfig check. Only after PR-T1 lands.

---

## Completed

### Phase 4 — Photo integrity (Stages 4.1-4.3)
- [x] **2026-05-11** — Phase 4 Stage 4.3 deployed to production via merge commit `1636ade` (main → production), serving on mrcsystem.com.
- [x] **2026-05-10** — Phase 4 Stage 4.3: soft-delete on `photos` (deleted_at column, partial index, deleteInspectionPhoto rewrite, photo_history `deleted` action wired). Commit `831d169`, merged via PR #52 → `9d6c460`.
- [x] **2026-05-10** — Phase 4 Stage 4.3.5: consumer audit gate (`docs/stage-4.3-consumer-audit.md`) + plan v2 footnote corrections. Commits `6d2aca9`, `2ce5a55`.
- [x] **2026-05-07** — Phase 4 Stage 4.2: `photo_history` table + recordPhotoHistory() helper + wired callers (`added`, `category_changed` actions). Commits `8f8de6c`, `0006bc0`, `45d91bc`, `0e57d77`.
- [x] **2026-05-05** — Phase 4 Stage 4.1 + 4.1.5: pre-upload caption modal + 5 upload-site wiring + offline quarantine path + QuarantinedPhotosBanner. Commits `d2566ee`, `5d9cd4a`, `bc39adc`, `570a277`.

### Phase 3 — AI summary versioning
- [x] **2026-05-02** — Stage 3.5: drop legacy `inspections.ai_summary_*` columns (9 columns), backfill `ai_summary_versions`, dead-code cleanup in TechnicianInspectionForm. Commits `ae99897`, `675149f`, `2c3d04c`, `3470677`.
- [x] **2026-05-02** — Stage 3.4.5: `latest_ai_summary` view + consumer migrations. Commit `3290253`.
- [x] **2026-05-02** — Stage 3.4: approval flow targets latest version row. Commit `d35c545`.
- [x] **2026-05-02** — Stage 3.3: manual edit versioning in `InspectionAIReview.handleSave`. Commit `1f0ccd2`.
- [x] **2026-05-02** — Stage 3.2: EF refactor + regen feedback UI (absorbed deferred Stage 1.3). Commit `89bcce0`.
- [x] **2026-05-02** — Stage 3.1: `ai_summary_versions` table. Commit `e6dfe4b`.

### Phase 2 — Audit foundation
- [x] **2026-05-01** — Phase 2 audit_logs foundation + EF user_id propagation (29 audit triggers across 10 tables, SYSTEM_USER_UUID sentinel, Bucket A/B/C attribution canon). Commits `a0ae550` (main), `9963d07` (production via PR #46).

### Phase 1 — Tier 0 quick wins
- [x] **2026-05-01** — PR-B (Stage 1.4): make PDF regen user-explicit + Stale PDF banner. Commit `62c7e85` (main), `78da615` (production via PR #44).
- [x] **2026-05-01** — PR-A (Stages 1.1 + 1.2): `stainRemovingAntimicrobial` toggle fix + cover-photo caption-clearing fix. Commits `452c972` + `6765e8e` (main), `12fd877` + `eb72924` (production).

### Phase 2 — Job Completion Workflow
- [x] **2026-04** — Job Completion Workflow functionally complete: 10-section technician form, admin approval + send-back flows, job report PDF generation, email delivery, invoice tracking, payment tracking, audit trail, 15-status pipeline. Known gaps tracked under L1 (AFD rate) + L2 (variation invoice line items).

### Pre-Phase-2 consolidation (April 2026)
- [x] **2026-04-30** — Technician dashboard cleanup: non-overlapping tabs + This Month tab. Commits `7d49de5`, `4629b95`, `f71907a` (PR #43).
- [x] **2026-04-29** — Fix: visible append-only Internal Notes log + atomic status reversion. Commit `4f399dd` (PR #42).
- [x] **2026-04-29** — Fix: missing Calendar import in LeadBookingCard (latent bug from booking consolidation). Commit `59986a9`.
- [x] **2026-04-29** — Fix: server-side lead.status + booking.status filters in `useTechnicianJobs`. Commit `d3181d1`.
- [x] **2026-04-28** — Walkthrough doc restyle to navy + IBM Plex / Manrope, remove TOC sidebar. Commit `ecb1831`.
- [x] **2026-04-28** — Walkthrough doc sync for Schedule consolidation + inline-edit refactor. Commit `28058eb`.
- [x] **2026-04-28** — Stage E: inline-edit refactor — kill EditLeadSheet, click-to-edit on Lead Detail. Commit `1ba3ab9`.
- [x] **2026-04-28** — Stage B.5: append-only `internal_notes` + booking email defensive paths. Commit `4a82379`.
- [x] **2026-04-28** — Consolidate LeadDetail rendering: surface customer preference card, inline NewLeadView, delete orphan files, regenerate types. Commit `4d1066c`.
- [x] **2026-04-28** — Consolidate booking flow: Schedule sidebar canonical, delete BookInspectionModal. Commit `d1f3369`.
- [x] **2026-04-05** — API key rotation: Supabase anon + service role, Resend, OpenRouter, Google Maps. All env vars updated in Vercel + Supabase secrets.

### Phase 1 baseline (pre-2026-04-05)
- [x] Phase 1 Technician Role: dashboard, jobs, inspection form (all 10 sections)
- [x] Phase 1 Admin Role: dashboard, schedule, leads, technicians, reports
- [x] Inspection form → AI summary → PDF → email pipeline
- [x] Security remediation (RLS on all tables, rate limiting, XSS/CSP, audit triggers)
- [x] Codebase cleanup (15 dead routes, 9 unused tables, dead code removed)
- [x] Vercel deployment with security headers
- [x] Sentry error tracking + offline resilience
- [x] PDF page ordering fix
- [x] Lead detail improvements (inline editing, travel time, activity logging)
- [x] MCP server stack configured (Supabase, GitHub, Resend, Slack, Playwright, Context7, Memory)
- [x] Database cleanup & hardening (68/100 → 91/100: 12 legacy tables dropped, broken FKs/functions fixed, duplicate indexes removed)

---

## PARKED: Public Lead Form + Marketing Site Rebuild (code, not Framer)

Decision: stop maintaining the customer-facing form in Framer. The whole marketing
site will be rebuilt in code (React) at a later date. Until then, the current
published Framer form stays live as-is. All items below carry into the code rebuild.

### Form bugs + copy (currently unfixed on the live Framer form)
- Typo: page heading "CONTUCT" → "CONTACT"
- Label "number and address" → "Property Address"
- Phone placeholder → "04XX XXX XXX"
- Message placeholder → "Briefly describe the issue — which rooms are affected, how long has it been there, any known water damage or leaks?"
- Submit button → "Book My Free Inspection"
- Privacy line under button → "Your details are only used to contact you regarding your enquiry."
- Required asterisks on: Name, Phone, Email, Property Address, Suburb, Preferred Day, Preferred Time, Type of Issue, How Urgent Is This?

### Field changes
- Remove Date picker, Time picker, and Postcode fields
- Add dropdowns: Preferred Day (8 opts), Preferred Time (4 bands), Type of Issue (5 opts), How Urgent Is This? (3 opts), Property Type (3 opts)

### Google Maps Places autocomplete (NOT started)
- Autocomplete on the address field + auto-fill address components
- Decide whether to persist formatted address / lat-lng to the leads table — if yes, needs new columns (e.g. property_address_lat, property_address_lng) + receive-framer-lead EF update + RPC allowlist update
- Feeds existing calculate-travel-time / Distance Matrix accuracy downstream

### Optional photo upload (NOT started in any code form except React reference)
- Upload to lead-enquiry-photos Storage bucket → post resulting paths under initial_photos
- MUST be optional — form submits successfully with zero photos

### Canonical contract — already preserved, use as the spec (do NOT re-derive)
- Option strings: the 5 exported arrays in src/lib/validators/lead-creation.schemas.ts (PREFERRED_DAY_OPTIONS, PREFERRED_TIME_OPTIONS, ISSUE_TYPE_OPTIONS, URGENCY_OPTIONS, PROPERTY_TYPE_OPTIONS) — byte-canonical, single source of truth
- Field → webhook JSON-key contract: verified in plan file melodic-cooking-turtle.md
- React reference form (src/pages/RequestInspection.tsx) still in repo as the working visual + behavioural reference

### Backend infra — DONE and PERMANENT (do NOT rebuild or revert)
- leads table: 5 columns (preferred_day, issue_type, urgency, property_type, initial_photos)
- receive-framer-lead EF (verify_jwt: false), audited_insert_lead_via_framer RPC allowlist
- Customer confirmation email (4 fields, conditional render); Slack notification (issue_type + urgency)
- lead-enquiry-photos Storage bucket (anon INSERT, authenticated SELECT, image MIME, private)
- Admin LeadDetail Enquiry Details card; admin CreateNewLeadModal at full field parity

### Interim state
- Old published Framer form stays live — public submissions won't capture the new fields (columns stay null; handled/gated everywhere)
- Admin CreateNewLeadModal + React /request-inspection form both capture the full field set
- React reference form NOT deleted — deletion was gated on Framer going live with parity, now parked with this work
