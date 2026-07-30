# Pre-Merge Testing Checklist — HEPA/waste + admin analytics + invoice integrity

**Written:** 2026-07-29 · **Audience:** a fresh session with zero context, or Michael running cold
**Nothing in this document has been executed against a database. All SQL is human-run.**

Two streams of work are queued for production. This is the single checklist covering both.

> **Read this first — the two streams do NOT conflict.**
> `main` is a direct ancestor of `fix/admin-analytics-accuracy` (verified:
> `git merge-base main HEAD` == `git rev-parse main` == `008e6aa`). The HEPA/waste
> work is already *in* the analytics branch. There is no merge conflict possible
> between them. The only conflict risk is Michael's **parallel debugging session**,
> which is not represented here — see §6.

---

## 1. WHAT SHIPPED

### Stream A — HEPA/waste consistency · **20 commits** · already on `main` (`a350400..008e6aa`)

| Commit | What changed |
|---|---|
| `a350400` | HEPA Air Scrubber added to the equipment pricing engine (own qty + own days). Absent = byte-identical output. |
| `725b764` | Migration `20260728120000_hepa_quote_columns.sql` — `inspections.hepa_air_scrubber_qty/_days`, `job_completions.quoted_afd_qty/_days`. |
| `0362c39` | Regenerated Supabase types from DEV after both migrations. |
| `277cc86` | Inspection form Section 7 HEPA panel (units/days, "Auto (N) days"); wired into all 4 calc/save sites + Section 9 + InspectionDataDisplay. First writer of `inspections.equipment_days`. |
| `1c663e8` | Job completion WasteCard (quoted vs actual m³, confirm/override, reset-on-edit); quoted HEPA/waste snapshot written at job creation. |
| `8be4c83` | Invoice helper estimate/actual reference chips + "Use" buttons for equipment and waste. |
| `a68710d` | Inspection report PDF page 8: HEPA + waste lines; fixed the scope-of-work steps silent no-op via `{{option_1_steps}}` / `{{option_2_steps}}` placeholders. |
| `dc17242` | Rules file: dehumidifier rate corrected $132 → $119; HEPA added to the rate line. |
| `e04b410` | SUPERSEDED banner on `COST_CALCULATION_SYSTEM.md` (documents retired volume-discount tiers). |
| `9eb0439` | AI summary: HEPA in the payload + prompt; prompt now prefers the canonical `treatmentMethods` array over 4 legacy booleans. |
| `7dae371` | Job report PDF: equipment + waste summary on the contents page via new `{{equipment_summary}}` placeholder, plus a defensive catch-all placeholder strip the job EF lacked. |
| `41c99ad` | Independent-review follow-ups for `1c663e8` (see §2). |
| 8 others | Docs/TODO/guide updates. |

### Stream B — admin analytics + invoice integrity · **13 commits** · branch `fix/admin-analytics-accuracy`

| Commit | What changed |
|---|---|
| `526bf1d` | **Two real bugs.** Reports timeline bucketed data points by UTC date but axis buckets by local-midnight-converted-to-UTC, so points plotted a day late and any lead created after 10:00 AEST vanished from the chart while the KPI still counted it. Avg Response Time rounded to whole hours before formatting, so every sub-30-minute response rendered "0 min". |
| `5adb122` | Revenue re-pointed from `inspections.total_inc_gst` (a *quote*) to paid invoices, across Reports + both technician surfaces. |
| `613a4a7` | Technician card showed an active-lead count under the label "Inspections". Split into two stats; added a real count by `inspections.inspector_id`. |
| `48702a3` | **Behaviour change.** Exhaustive `Record<LeadStatus, …>` status maps. Conversion rate now counts six previously-excluded won statuses; workload categoriser had 3 dead branches and silently binned 7 real statuses as "Scheduled". |
| `c354d28` | "Upcoming" counted calendar rows not jobs (a 6-day job read as 6); cancelled bookings counted; `limit(10)` cap; Pipeline Health with no sample guard; DATE columns parsed as UTC midnight. |
| `491af48` | Moved the paid-revenue helpers into the QUERIES section of `invoices.ts`. |
| `5792211` | Deleted unreachable `handleCreate` in `InvoicePaymentCard.tsx` — a raw insert bypassing `calculateInvoiceTotals` that wrote an inc-GST figure into the ex-GST column with `gst_amount: 0`. |
| `6674771`, `d71347c`, `5dabdd2` | Invoice integrity runbook: delete all four invoice rows, then add two CHECK constraints. |
| `3214a77` | 25 tests pinning empty-set behaviour ahead of the invoices table being emptied. |
| `a452dc9` | Centred 7 empty/error-state icons that sat left of their centred text. |
| `fb80695` | Logged the Reports error-propagation asymmetry as a follow-up. |

---

## 2. ALREADY VERIFIED — and exactly how

The distinction below is deliberate. **"Runtime-verified"** means code actually
executed and output was inspected. **"Static only"** means it compiles, builds and
passes unit tests but **has never run**. Do not treat the second as tested.

### Runtime-verified

| What | Evidence | Whose |
|---|---|---|
| Inspection report PDF render on DEV | Single mode 7/7 PASS · Both mode 8/8 PASS · legacy fallback 5/5 PASS, against the deployed DEV EF + live DEV Storage template. HEPA line, waste single + "billed once" wording, scope steps from real treatment methods with scaled type, zero leaked `{{…}}`, DOM-measured geometry (equipment list 695→809px vs photos 827px). | Recorded in `docs/TODO.md` by the HEPA session |
| Job report PDF render on DEV | 11/11 PASS — all four equipment lines with exact totals, equipment total $1,881.00, waste "(6 m³) — billed once: $550.00 ex GST", section heading on the contents card, zero leaked placeholders, dynamic contents page numbers intact, zeroed-row empty fallback. | Recorded in `docs/TODO.md` by the HEPA session |
| AI summary EF deployed to DEV | Probe-verified live; fails fast with 500 "AI service not configured" because DEV has no `OPENROUTER_API_KEY`. | Recorded in `docs/TODO.md` |
| DEV schema has the HEPA columns | Behavioural probes returned 200 | Recorded in `docs/TODO.md` |
| PROD schema does **not** yet have them | Behavioural probes returned 400 | Recorded in `docs/TODO.md` |
| Every analytics figure traced to its query | Read-only SELECTs against PROD; each displayed number reproduced from source data | This session |
| Timeline bug reproduced **and** proven fixed | Replayed the real lead (`899f976c`, created 28/07 18:52 AEST) at three pinned clocks. Viewed 28 Jul evening: KPI 1, chart 0 — the exact reported contradiction. Old bucketing gives total 4 vs 5 on a 5-lead set and drops a lead created today; new gives 5. | This session |
| Response time true value | 5.5 minutes, computed from the real lead/booking pair — not 0 | This session |
| Invoice defect root cause | `git show bb1ee91` produced the exact deleted `handleEdit` block; INV-2026-0002 last updated ~10h before that fix landed | This session |
| Invoice delete has no FK dependents | All 26 public tables probed for an `invoice_id` column — none has one | This session |
| Empty-set behaviour of every analytics aggregate | Code-inspected + 25 tests | This session |

### Static only — compiles and passes tests, has NEVER been run

- **Every UI flow in Stream A**: HEPA panel, autosave/localStorage round-trip, WasteCard confirm/override, invoice estimate/actual chips, quoted-snapshot writes at job creation, invoice seeding precedence on real rows.
- **Every UI flow in Stream B**: the Reports page, both Technicians pages and the Admin Dashboard have not been opened in a browser since the rewrite.
- **375px rendering** of anything in either stream.
- Stream B gate: typecheck clean · `npm run build` clean · **346/346 tests** (24 files, including 60/60 pricing untouched).

### Reviewed, not executed

- Stream A Phase 2 adversarially reviewed: agent 2a APPROVE; 2b died on a rate limit and was reviewed manually line-by-line, 2 fixes applied pre-commit.
- `1c663e8` independently re-reviewed: no criticals. 1 major **fixed** (`createJobCompletion` swallowed inspection-fetch errors, permanently forging a "never quoted" snapshot on a transient failure — now captures + throws, retryable). 3 minors fixed. 1 accepted as design.

---

## 3. NEEDS MY TESTING — by page

All DEV work uses ref **`ctppzqnysmzynkxjlzta`**. Test on the Vercel preview build of
the merged branch. **Check every screen at 375px width** — that is the primary
viewport and nothing in either stream has been seen at it.

### DEV fixtures (staged, ready to use)

| Fixture | ID | Reach it via |
|---|---|---|
| **Inspection** — Both-options mode | `fc568a31-f9f3-44b3-9915-0173abd617ff` | Lead **nardine youssef** `8f49753a-6901-44e1-9c12-4d548597ad63` (status `inspection_email_approval`) |
| **Job completion** — full actuals | `1b81f7e7-c094-43f0-9321-7424042433c5` (JOB-2026-2237) | Lead **Michael Youssef** `24422eb2-053b-4450-af8b-8ee36aba622e` (status `inspection_email_approval`) |

**Inspection fixture actual values** (verified in DEV this session):
`option_selected = 3` (Both) · HEPA qty **2** × **3 days** · `equipment_days = 1`
(HEPA days are deliberately independent) · waste **6 m³** with
`waste_disposal_confirmed_cost = 550.00` · 5 treatment methods (`HEPA Vacuuming`,
`Surface Remediation Treatment`, `ULV Fogging - Property`, `HEPA Air Scrubber
Installation`, `Drying Equipment`) · option totals **3000 / 5000**.

**Job completion fixture actual values**: dehumidifier 2 × 3d · air mover 4 × 3d ·
HEPA (`actual_afd_*`) 2 × 3d · RCD 1 × 3d · waste 6 m³ / $550 · `demolition_works = true`.

> ⚠️ **Important caveat on the job fixture.** Its **quoted** snapshot columns are
> empty — `quoted_afd_qty` and `quoted_waste_disposal_cost` are `NULL`,
> `quoted_dehumidifier_qty` is `0`. This row was created *before* the snapshot code
> shipped, so it exercises the **legacy / never-quoted path**, not the fresh-snapshot
> path. Em-dashes and "no quote recorded" states on this row are **correct** — that is
> the null-tolerance fix from `1c663e8` working, not a bug.
> **To test the fresh-snapshot path you must create a NEW job completion** from the
> inspection fixture and check that the quoted values land.

---

### 3.1 Technician inspection form — Section 7 (HEPA)

Open the inspection fixture's lead → technician inspection form → Section 7.

- [ ] **HEPA panel visibility gating.** The units/days panel appears **only** when the HEPA toggle is on. Toggle off → panel disappears. Toggle on → panel returns.
- [ ] **Days field defaults.** Shows "Auto (N) days" until you type an explicit value. With the fixture: HEPA should read 2 units × 3 days while general `equipment_days` is 1 — **HEPA days are deliberately independent of the other equipment**. If HEPA days snap to match equipment days, that is a bug.
- [ ] **Section 9 total.** The HEPA line appears in the Section 9 cost summary and the total moves when you change qty or days.
- [ ] **Rate check.** HEPA is **$100/unit/day**. 2 × 3 = **$600.00** ex GST. Dehumidifier is **$119/day** (NOT $132 — that figure is retired and was corrected in `dc17242`).
- [ ] **Autosave round-trip.** Change HEPA qty → wait for autosave (~30s) or navigate away and back → value persists. Then hard-reload the page → value still there.
- [ ] **375px.** No horizontal scroll. Number steppers ≥ 48px touch targets.

### 3.2 Job completion form — WasteCard + equipment

Open the job completion fixture → Section 7 (Equipment) and the waste card.

- [ ] **No false amber on HEPA.** With the fixture's NULL quoted values you should see a neutral "not quoted" state, **not** an amber over-budget warning. Amber here = the null-tolerance fix regressed.
- [ ] **WasteCard confirm flow.** Quoted vs actual m³ displayed; "Confirm" accepts the quoted price and **clears the override flag**.
- [ ] **WasteCard override flow.** "Save Override" shows the amount being saved, so a cleared field saving as $0.00 is visibly deliberate.
- [ ] **Reset-on-edit.** Change the m³ value after confirming → the confirmed price resets and must be re-confirmed.
- [ ] **Fresh snapshot (separate test).** Create a **new** job completion from the inspection fixture → its `quoted_afd_qty` / `quoted_afd_days` / `quoted_waste_disposal_*` should be populated from the inspection (2 HEPA × 3d, 6 m³ / $550), not NULL.
- [ ] **375px.** Confirm/override buttons ≥ 48px, no overflow.

### 3.3 Admin invoice helper (`/admin/invoice/:leadId`)

- [ ] **Estimate vs actual chips.** Equipment and waste rows show both figures with a "Use" button.
- [ ] **"Use" applies the value** to the editable line and the totals recalculate.
- [ ] **Reference values never become line items** on their own — only pressing "Use" writes one.
- [ ] **Waste precedence.** `autoPopulateFromLead` prefers the *job-actual* waste over the quoted figure.
- [ ] **13% discount cap holds.** Try to exceed it — it must clamp. This is a hard business rule.

### 3.4 Reports page (`/admin/reports`) — Stream B

- [ ] **Total Leads vs chart Total agree.** Open with period = **This Month**. The "Total Leads" KPI and the "Lead Volume Over Time" chart's "Total:" must show the **same number**. They disagreed before (KPI 1, chart 0). *This is the headline fix — check it first.*
- [ ] **Chart label alignment.** A lead created on day D plots under the bucket labelled **D**, not D+1. Cross-check one lead's `created_at` against where its point sits.
- [ ] **Create a lead late in the day and re-check.** Any lead created after 10:00 AEST used to vanish from the chart while still counting in the KPI. Create a smoke lead now, reload Reports, confirm both numbers moved by 1. Delete the smoke lead after.
- [ ] **Avg Response Time.** Must render minutes for fast responses — e.g. "6 min", never "0 min". With no data it shows an em-dash "—", not "0 min" or blank.
- [ ] **Conversion Rate.** Now counts `job_waiting`, `job_scheduled`, `pending_review`, `job_report_pdf_sent`, `invoicing_sent`, `google_review` as won — six statuses it previously excluded. **Expect the number to go UP** (measured on PROD year view: 7% → 17%). This is intended, not a regression.
- [ ] **Pipeline Health.** With fewer than 5 leads in the period it must read **"Not enough data"** in grey, not a red "Needs Attention" computed off a 1-lead sample.
- [ ] **Period switching.** Today / Week / Month / Year all render without error and the KPI/chart agreement holds in each.
- [ ] **375px.** KPI cards stack, chart does not overflow.

### 3.5 Technicians list (`/admin/technicians`) — Stream B

Four technicians exist: michael youssef, vryan, Clayton Jenkins, Glen.

- [ ] **Four stats per card**: Active Leads · Inspections · Upcoming · Revenue, in a **2×2 grid at 375px** and 1×4 from `sm` up. Caption reads "Inspections: all time · Revenue: this month".
- [ ] **"Inspections" is now a real inspection count.** On PROD before the invoice delete this reads: michael **12 / 10**, vryan **1 / 1**, Clayton **0 / 1**, Glen **0 / 0** (ActiveLeads / Inspections). **Clayton showing 1 inspection is the proof the fix works** — he did one and the old card said 0.
- [ ] **Upcoming counts jobs, not calendar rows.** michael should read **2**, not 7 — his 7 bookings are one 6-day job plus one inspection.
- [ ] **Last seen** renders DD/MM (Australian) — Glen `04/05`, Clayton `02/03`, vryan `10/03`. If you see `03/09` for vryan the timezone handling has regressed.
- [ ] **375px.** Four labels legible, no truncation, no horizontal scroll.

### 3.6 Technician profile (`/admin/technicians/:id`)

- [ ] **Today / This Week / This Month** are real inspection counts. All three read 0 on PROD today (latest inspection is 10/06) — **correct, not broken**.
- [ ] **Workload breakdown** legend reads Scheduled · In Progress · Completed · **Not Landed** (was "Cancelled"). `closed` now counts as **Completed**, not cancelled.
- [ ] **Upcoming jobs list matches the card count.** A multi-day job appears as **one** entry with a "6 days · to 03/08" chip, not six separate rows.
- [ ] **No cancelled bookings** appear in the list.
- [ ] **375px.** Stats grid 2×2, workload bar and legend wrap cleanly.

### 3.7 Admin dashboard (`/admin`)

- [ ] **Team Workload** shows "{n} leads" per technician (unchanged wording) and the bar scales correctly.
- [ ] **Empty-state icons are centred** — "No technicians found", "All leads assigned!", "No inspections scheduled for today". They previously sat hard against the left edge above centred text.

### 3.8 PDF output (both streams)

- [ ] **Inspection report page 8** — HEPA line reads like "$100/day × 2 (3 days)"; waste reads "6 m³ — $550.00 +GST" in single mode and "billed once" in Both mode; scope-of-work steps show the **actual selected treatment methods**, not the generic template text.
- [ ] **No leaked `{{placeholders}}`** anywhere in either PDF.
- [ ] **Job report contents page** carries the EQUIPMENT & WASTE section.

---

## 4. NEEDS VERIFICATION AFTER THE PROD INVOICE DELETE

Running `docs/INVOICE_INTEGRITY_RUNBOOK.md` empties the invoices table. Every
revenue figure then aggregates over **zero rows**. This was audited and 25 tests
pin it, but it has not been seen in a browser.

**Expected values after the delete — these are correct, not failures:**

| Surface | Expected | Must NOT show |
|---|---|---|
| Reports → Total Revenue (all periods) | **$0** | `$NaN`, blank, `undefined` |
| Reports → other KPIs | unchanged and populated | a full-page error state |
| Technicians list → Revenue (all four cards) | **$0** | `$NaN`, blank |
| Technician profile → Revenue | **$0** | `$NaN`, blank |
| Admin dashboard → Outstanding Invoices widget | "No outstanding invoices" with a **centred** green tick | left-aligned icon, `NaN` |
| Admin dashboard → overdue count/total KPI | **0** / **$0** | `NaN` |
| Invoice Helper on any lead | falls back to the **live estimate** (no saved invoice exists) | crash, blank totals, `NaN` |
| Lead Detail → invoice card | the card does not mount (it only renders when an invoice exists) | a broken/empty card |

- [ ] Confirm each of the above.
- [ ] **The first new invoice must be numbered `INV-2026-0005`**, never a reused number. Runbook step A8 asserts the sequence; confirm again on the first real invoice created.

---

## 5. PROD ROLLOUT SEQUENCE

**The one ordering principle:** three layers activate the HEPA/waste feature and each
must exist before the next needs it. **DB columns before code** (merged code writes
`hepa_air_scrubber_*` / waste columns — without the migrations every inspection and
job-completion save on live 500s with "column does not exist"). **EF code before
templates** (the live inspection EF strips unknown `{{placeholders}}`, so a
template-first upload renders blank values; the live job EF has **no** catch-all, so
template-first prints literal `{{equipment_summary}}` on customer PDFs). **All of that
before the production merge**, because the merge is what puts the column-writing
frontend in front of customers.

### GATE — do not start until both are ticked

- [ ] §3 testing passed at 375px on the DEV/preview build.
- [ ] The parallel debugging session's stream is ready and its steps are pasted into §6.

### Step 0 — invoice integrity (independent; DEV first)

Runs against a different table from everything else, so it can happen at any point.

- [ ] **DEV** `ctppzqnysmzynkxjlzta`: `docs/INVOICE_INTEGRITY_RUNBOOK.md` **Block A** (delete 4 rows), verify A3 returns 0, then **Block B** (2 CHECK constraints).
- [ ] Confirm DEV clean.
- [ ] **PROD** `ecyivrxjpsmjmexqatym`: same, Block A then Block B.

*Block B adds both constraints as `VALID`, so it **aborts** if Block A has not run.*

### Step 1 — HEPA migrations (PROD Studio, in this order)

https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new

- [ ] `20260624113911_job_completion_waste.sql`
- [ ] `20260728120000_hepa_quote_columns.sql`

Both additive and `IF NOT EXISTS`, safe to re-run. Verify — expect 4 rows:

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE (table_name='inspections'     AND column_name LIKE 'hepa_air_scrubber%')
   OR (table_name='job_completions' AND column_name IN ('quoted_afd_qty','actual_waste_disposal_cost'));
```

### Step 2 — deploy three Edge Functions (order among them irrelevant)

```
npx supabase functions deploy generate-inspection-pdf     --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy generate-job-report-pdf     --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy generate-inspection-summary --project-ref ecyivrxjpsmjmexqatym
```

**Deploying EFs first is harmless** — new `.replace` calls no-op against the old
templates. Deploying them *after* step 3 leaves a window where old EFs render new
templates: blank values on inspection PDFs, literal `{{equipment_summary}}` on job PDFs.

### Step 3 — upload two templates to PROD Storage

Dashboard → Storage → `pdf-templates` → Upload, overwrite:
https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/storage/buckets/pdf-templates

| Source (repo) | Upload AS |
|---|---|
| `src/templates/inspection-report-template.html` | `inspection-report-template-final.html` ← **RENAME on upload** |
| `src/templates/job-report-template.html` | `job-report-template.html` (same name) |

This step is the ON switch. Skipping it is non-destructive — features simply stay
dormant. Rollback: `git show a68710d^:src/templates/inspection-report-template.html`
and `git show 7dae371^:src/templates/job-report-template.html`, re-upload.

### Step 4 — merge, in this order

Repo rule: **merge commit only — never squash, never rebase.**

- [ ] Parallel session's branch → `main` (resolve any conflicts per §6)
- [ ] `fix/admin-analytics-accuracy` → `main` — **should be conflict-free against HEPA** (`main` is its ancestor); conflicts can only come from the parallel stream
- [ ] `main` → `production`:

```
git checkout production && git pull origin production
git merge main --no-ff
git push origin production
git checkout main
```

Vercel auto-deploys production (mrcsystem.com) from the push.

### Step 5 — post-merge verification

- [ ] Vercel dashboard: production deployment green — project **`mrc-system`** (the repo `.vercel` link is stale; always pass the project explicitly).
- [ ] **Bundle points at PROD Supabase** — view-source of https://mrcsystem.com → fetch the main JS bundle → must contain `ecyivrxjpsmjmexqatym` and **NOT** `ctppzqnysmzynkxjlzta`.
- [ ] **Env vars intact** (guards the 23 Jul outage, when the Supabase↔Vercel marketplace integration clobbered Production-scope `VITE_*` vars and shipped a blank page):
  ```
  npx vercel env ls production --project mrc-system
  ```
  Confirm `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (and the other two `VITE_*`) exist in **Production** scope with PROD values.
- [ ] Live smoke on mrcsystem.com: log in → open a lead → inspection form opens and Section 7 shows the HEPA panel when its toggle is on → create a smoke lead, confirm it appears, delete it.
- [ ] Complete §4 (empty-invoices verification) on production.

---

## 6. KNOWN CONFLICT RISK

### Between the two streams documented here: **none**

Verified: `git merge-base main fix/admin-analytics-accuracy` == `git rev-parse main`
== `008e6aa`. The analytics branch is a descendant of `main`, so it already contains
all 20 HEPA commits. **Only two files are touched by both streams, and both were
already reconciled** because the analytics work was written on top:

| File | Stream A (HEPA) | Stream B (analytics) |
|---|---|---|
| `src/lib/api/invoices.ts` | +10/−5 — estimate/actual chip helpers | added `getPaidInvoices` / `sumPaidRevenue` / `sumPaidRevenueFor` in the QUERIES section |
| `docs/TODO.md` | rollout runbook | invoice integrity item + follow-ups |

### With the parallel debugging session: **unknown — check before merging**

Files the two documented streams touch. If the parallel session touched any of the
starred ones, resolve carefully:

- ⭐ `src/lib/calculations/pricing.ts` (+ `pricing.test.ts`) — **sacred money engine**
- ⭐ `src/lib/api/invoices.ts` — touched by **both** documented streams
- ⭐ `src/pages/TechnicianInspectionForm.tsx`
- ⭐ `src/pages/JobCompletionForm.tsx`, `src/hooks/useJobCompletionForm.ts`, `src/lib/api/jobCompletions.ts`, `src/components/job-completion/Section7Equipment.tsx`
- ⭐ `src/pages/AdminInvoiceHelper.tsx`
- ⭐ `src/templates/inspection-report-template.html`, `src/templates/job-report-template.html` — **Storage serves ONE copy per file**; if the parallel session edited either, both must be re-uploaded together
- `src/hooks/useReportsData.ts`, `useTechnicianStats.ts`, `useTechnicianDetail.ts`
- `src/lib/statusFlow.ts`, `src/lib/dateUtils.ts`
- `src/pages/Reports.tsx`, `AdminDashboard.tsx`, `AdminTechnicianDetail.tsx`
- `src/components/leads/InvoicePaymentCard.tsx`, `InspectionDataDisplay.tsx`, `JobCompletionEditSheet.tsx`, `JobCompletionSummary.tsx`
- `src/components/technicians/*`, `src/components/admin/AdminSidebar.tsx`
- `src/components/pdf/ReportPreviewHTML.tsx`
- `src/types/inspection.ts`, `src/types/jobCompletion.ts`, `src/integrations/supabase/types.ts` (**regenerate from DB if both streams touched it**)
- `supabase/functions/generate-inspection-pdf/`, `generate-job-report-pdf/`, `generate-inspection-summary/`
- `supabase/migrations/20260728120000_hepa_quote_columns.sql`, `20260729153000_invoice_totals_integrity_checks.sql`

**PARALLEL SESSION STEPS — paste before running:**
```
(pre-merge checks, migrations, deploys and verification steps from the other
 session, slotted into the §5 sequence)
```

**Pre-merge build gate — run on every branch involved:**
```
npm run typecheck && npm run build && npx vitest run
```
Expected for `fix/admin-analytics-accuracy`: typecheck clean, build clean, **346/346**.

---

## 7. OPEN ITEMS — NOT BLOCKING MERGE

1. **Reports hard-fails on a revenue-query error.** `useReportsData` folds `revenueQuery.error` into the page-level error, so a `getPaidInvoices` failure blanks every KPI, chart and insight — including ones unrelated to revenue. `useTechnicianStats` / `useTechnicianDetail` catch it and degrade to $0, costing one tile. Pre-existing shape (the inspections query it replaced was wired the same way), so not a regression. Logged in `docs/TODO.md`.
2. **GitNexus gives false negatives on inline-declared components.** `impact()` returned 0 callers / LOW risk for `calculateWasteDisposalCost` while grep proved a live call at `TechnicianInspectionForm.tsx:1696` — the symbol lives inside a component declared inline in that file. **Always grep-verify a LOW/zero-impact GitNexus result.** Separately, the local GitNexus index points at two other repo paths, neither of which is this working tree, so its data is stale here regardless.
3. **`INV-2026-0003` and `INV-2026-0004` were test data, now deleted.** Neither was a real customer invoice. Reported revenue legitimately becomes $0.00.
4. **`docs/COST_CALCULATION_SYSTEM.md` is actively wrong**, not merely stale — documents the retired volume-discount tier system as live. It now carries a SUPERSEDED banner (`e04b410`) but has not been rewritten.
5. **AFD daily rate still unconfirmed.** `Section7Equipment.tsx` uses `$75/day` as a placeholder with a "confirm before going live" comment. Every job using AFD quotes wrong until the real rate is set.
6. **`OPENROUTER_API_KEY` absent on DEV**, so AI summary generation cannot be tested there. Set with `npx supabase secrets set OPENROUTER_API_KEY=<from vault> --project-ref ctppzqnysmzynkxjlzta` (value from Michael's vault, never pasted into chat).
7. **Empty-state icon centring** was fixed in `a452dc9` for 7 icons on the analytics surfaces. Other pages were not swept.
