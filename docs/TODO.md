# MRC Lead Management System — Current TODO

## ✅ CLOSED: Email Domain DNS Cutover — DNS verified 2026-08-02

**`mouldandrestoration.com.au` is VERIFIED in Resend as of 2 Aug 2026, 8:11pm AEST.
DKIM and SPF both verified. The pending-DNS blocker is CLOSED.** The earlier framing
("NOT yet configured", "do NOT switch sending domain until verified", "launch on the
current working domain if it isn't verified in time") is now obsolete — the gate it
guarded has passed.

**What this unblocks, and what it does NOT.** DNS verification made the new domain
*sendable*, and the envelope cutover has since shipped in code — verified 2026-08-04
(`docs/_audit/DOCS_AUDIT_2026-08-04.md`, Finding 1): zero `noreply@` or `@mrcsystem.com`
email literals remain anywhere in `src/` or `supabase/`. The only remaining
sender-address work is the `seed-admin` item below.

### Also completed 2026-08-02 (same session)

- **PROD Auth SMTP now routes through Resend** — `smtp.resend.com:465`, sender
  `noreply@mrcsystem.com`, API key named `supabase-auth-smtp`. Supabase Auth emails
  (confirmation, recovery, invite, email_change, magic_link, reauthentication — the six
  templates in `supabase/templates/`) no longer use the Supabase default SMTP.
  Note the sender is still `@mrcsystem.com`, so this inherits the same envelope-layer
  gap as the Edge Functions.
- **Auth redirect allowlist fixed** — `mrcsystem.com/**` added.
- **15 stale Supabase marketplace env vars deleted** from Vercel Production scope.
- **Supabase↔Vercel marketplace integration removed entirely.** This closes the
  clobber hazard behind the 23 Jul blank-page outage — the integration owned env-var
  naming and could re-sync over the hand-maintained `VITE_*` vars. See the related
  open item in the 23 Jul follow-ups, which this supersedes.
- **Production redeployed cache-free on `29a5808`**; bundle verified to contain the
  PROD ref only (`ecyivrxjpsmjmexqatym`, no `ctppzqnysmzynkxjlzta`).

### OUTSTANDING — carried forward from this session

- [ ] **Site URL is `https://mrcsystem.com/admin`, should be the root
      `https://mrcsystem.com`.** Auth redirects currently resolve against an admin
      subpath.
- [x] ~~**Envelope layer still sends from `noreply@mrcsystem.com`**~~ **DONE —
      verified 2026-08-04 (`docs/_audit/DOCS_AUDIT_2026-08-04.md`, Finding 1).**
      The cutover shipped with the batch A merge: `grep -rn "noreply@" src supabase`
      returns zero hits, and `@mrcsystem.com` survives only inside dashboard URLs,
      never as an email address. `send-email/index.ts:203` (from) and `:207`
      (reply_to) now default to `admin@mouldandrestoration.com.au`, and
      `send-inspection-reminder` and `receive-framer-lead` (customer confirmation
      and the internal failure alert) send from the same address. Envelope and
      footer now agree. The six line-number references previously listed here were
      re-checked by the audit and point at unrelated code — removed.
- [ ] **`seed-admin` still uses `admin@mrc.com.au`** (`supabase/functions/seed-admin/index.ts:50`).
      A wrong-brand domain that is neither the old nor the new one. Left untouched in
      the 2 Aug display-layer fix because it is an Edge Function and is an account
      login address, not a display string — editing the literal alone would not rename
      the existing account, only change what the next seed creates. **With the
      envelope cutover done (above), this is now the single remaining open
      sender-address item** (re-verified 2026-08-04: exact line, exact value).
- [ ] **`ADMIN_FALLBACK_EMAIL` may be unset in PROD.** Only consumer is
      `receive-framer-lead/index.ts:410`, and the code fallback is now
      `admin@mouldandrestoration.com.au` (facts corrected per the 2026-08-04 audit —
      the previously cited `:354` / `admin@mrcsystem.com` are stale), so an unset
      secret no longer routes alerts to a retiring domain. Still verify with
      `npx supabase secrets list --project-ref ecyivrxjpsmjmexqatym` that no stale
      override value is set.
- [ ] **Post-cutover send test still required** — booking confirmation + inspection
      report, with headers checked to pass SPF/DKIM/DMARC before production email
      delivery is trusted. (Carried over from the original DNS item; verification
      alone does not discharge it.)

**Done 2026-08-02 (`fd0c942`), display layer only:** personal mobile `0433 553 199`
removed from the job-booking confirmation email (`notifications.ts:286`) and both
preview scripts; stale `support@mrc.com.au` / `1300 665 673` replaced with
`admin@mouldandrestoration.com.au` / `1800 954 117` on NotFound and CheckEmail;
ForgotPassword placeholder rebranded. No Edge Function or Resend literal touched.

---

## Email sender logo (BIMI) — researched 5 Aug 2026, parked

Gmail and Outlook show a grey initial instead of the MRC logo on app-sent
email. Researched properly; recording so this isn't re-litigated.

Verified facts:
- Outlook/Microsoft does not render BIMI at all. Sender-only stance confirmed
  on Microsoft Q&A 2025-09-29, reaffirmed 2026-05-21. No path exists.
- Gmail requires a certificate — VMC or CMC. Self-asserted BIMI does not
  display in Gmail.
- Apple Mail also requires a certificate (Apple Support article 108340).
- Free self-asserted BIMI displays only in Yahoo, Fastmail, AOL, La Poste.
  Negligible for an Australian residential customer base.
- Gmail shows the Workspace profile photo on mail sent through Gmail's own
  servers, but not on mail relayed via Resend. That is the gap BIMI fills.

Prerequisites:
- DMARC at p=quarantine or p=reject with pct=100. Changed from p=none on
  5 Aug 2026. Verify with: dig TXT _dmarc.mouldandrestoration.com.au +short
- Logo as SVG Tiny PS: square, under 32KB, no raster, text, scripts or
  animation, served over HTTPS from mouldandrestoration.com.au.
  Validator: bimigroup.org/svg-validator
  Note: 28.2% of published BIMI records are broken (404 or failed validation).
- CMC certificate from DigiCert or Entrust — the only two authorised CAs as of
  2026. No registered trademark required; evidence of 12+ months logo use.
  1-3 weeks processing. VMC is NOT required — it only adds Gmail's blue
  checkmark and does need a registered trademark.

Alternative worth evaluating first: Apple "Branded Mail" via Apple Business
Connect, shipped iOS 18.2. Uploaded PNG/JPEG, DMARC at enforcement, no VMC, no
CMC, no SVG. Separate programme from BIMI. Low effort, and both techs and many
customers are on iPhone.

Also outstanding: email footer logo is served from the Supabase storage domain,
which Resend flags as suspicious. Move to mouldandrestoration.com.au.

---

## Post-rotation follow-ups (from docs/KEY_ROTATION_RUNBOOK.md)

- [ ] URGENT — test address autocomplete on mrcsystem.com. VITE_GOOGLE_MAPS_API_KEY
      is a single 176-day-old Vercel entry spanning Production+Preview+Development,
      the same value throwing "API key expired" on previews and baked into the
      production bundle. If autocomplete is dead on prod, this is an incident.
- [ ] ADMIN_FALLBACK_EMAIL is unset on PROD (DEV only). Lead-capture failure
      alerts currently fall back to a mailbox on the domain being retired.
- [ ] SUPABASE_SERVICE_ROLE_KEY still present in Vercel — deletion, not rotation.
- [ ] PROD Auth SMTP sender is still noreply@mrcsystem.com. DEV was corrected
      and verified 5 Aug (from: admin@mouldandrestoration.com.au, DKIM signed by
      mouldandrestoration.com.au). PROD change needs a Resend SMTP key entered
      at the same time — the password field does not persist across a sender edit.

---

## PARKED — Per-item equipment days on the quote (launch-testing issue 15)

Deferred out of the Batch C launch-fix branch (`batch-c-forms-ui`, 3 Aug 2026) because it
needs **both** a migration and an edit to the pricing engine, and the batch was scoped to
allow neither. Everything needed to execute it in one sitting is below. Severity is LOW —
the shared auto day count is correct for typical jobs.

**What it is.** HEPA Air Scrubber Details has a Days stepper showing `Auto (N)` with the hint
"Days defaults to the job's equipment days", so the tech can accept or override. Commercial
Dehumidifier, Air Movers and RCD Box have quantity steppers only. Extend the pattern.

**Blocker 1 — schema.** `inspections` has exactly two day columns, `equipment_days` and
`hepa_air_scrubber_days`. Needs a migration adding three, nullable, `NULL` = auto:

```sql
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS commercial_dehumidifier_days integer,
  ADD COLUMN IF NOT EXISTS air_movers_days integer,
  ADD COLUMN IF NOT EXISTS rcd_box_days integer;
-- Rollback: DROP COLUMN for each. Additive and nullable, safe to re-run.
```

⚠️ Ordering is unforgiving: the code writes these columns on every save, so the migration
must be applied **before** the frontend merges or every inspection save 500s with "column
does not exist". Same trap as the HEPA/waste rollout runbook.

**Blocker 2 — pricing.** `pricing.ts:234-236` gives dehumidifier, air mover and RCD the
shared `days`. Only HEPA has a per-item branch (`:238-244`), and it lives inside
`pricing.ts`. Without mirroring that branch for the other three, the new field would change
nothing — recreating issue 14 from the same test run ("the field implies a pricing
consequence that does not exist"). Sacred file: run impact analysis on
`calculateEquipmentCost`, keep the 13% cap and the 60/60 pricing tests green, and add parity
tests proving absent/0 days leaves every existing quote byte-identical.

**Where the code goes.** Three sentinels stay consistent with HEPA: form state `0` = auto,
pricing input `undefined`/`0` = auto, DB `NULL` = auto.

- UI pattern to clone: `TechnicianInspectionForm.tsx:2174-2195` (the HEPA Days stepper,
  including the `Auto (${sharedEquipmentDays})` label and the clamp-at-0 behaviour).
- Target rows: `:2060-2142` (dehumidifier, air movers, RCD).
- `EquipmentInput` / `EquipmentResult`: `pricing.ts:203-222`; `CostEstimateInput:319-328`.
- Four `calculateCostEstimate` call sites: `:2281-2290`, `:2294-2303`, `:3798-3808`,
  `:3837-3846`.
- Save: `:3942-3948`. Load: `:3250-3258`. Form type: `types/inspection.ts:109-125`.

Note `job_completions` already has per-item day columns (`actual_dehumidifier_days` etc.), so
only the quote side is missing them.

---

## ✅ CLOSED — Drying Equipment toggle did not gate its quantities

Found and fixed 3 Aug 2026 on `batch-c-forms-ui` while verifying launch-testing issue 16.
**Issue 16 as written was already implemented** (`TechnicianInspectionForm.tsx:2148` gates
the HEPA detail section on the treatment-method toggle, symmetric with Drying Equipment at
`:2054`, and was present on `main` before the 2 Aug test run). The real divergence ran the
other way.

HEPA has `getEffectiveHepaQty` (`:1938-1943`), so turning its method toggle off stops the
quantity feeding pricing and saves. Drying Equipment has no equivalent: turning it off hides
the UI while `commercialDehumidifierQty` / `airMoversQty` / `rcdBoxQty` keep flowing into
`calculateCostEstimate` and keep being persisted and billed. The per-item `*Enabled` booleans
are never persisted either — on reload they are re-derived from `qty > 0` (`:3251/3253/3255`),
so a tech who flicks one off without stepping the quantity to 0 finds it back on after a
reload, still billing.

**Fixed in `bcb9e99`.** `getEffectiveDryingQty` mirrors the HEPA helper — `pricing.ts`
untouched, only the quantity passed in changes. Applied to both pricing call sites, the DB
write, the Section 9 breakdown rows and the AI payload.

**No existing quote changes, and no data migration was needed.** The load path now
reconciles the two states rather than letting the gate act retroactively: stored quantities
are treated as evidence the equipment was on, so a pre-gate record with `qty > 0` and
`'Drying Equipment'` missing has the method restored on load instead of silently losing its
equipment. Only a deliberate toggle-off from here zeroes anything.

This supersedes the pre-flight SELECT originally planned for this change — the count no
longer gates anything. If you ever want it for curiosity, it is:

```sql
SELECT id, job_number, commercial_dehumidifier_qty, air_movers_qty, rcd_box_qty
FROM inspections
WHERE (COALESCE(commercial_dehumidifier_qty,0) > 0
    OR COALESCE(air_movers_qty,0) > 0
    OR COALESCE(rcd_box_qty,0) > 0)
  AND NOT ('Drying Equipment' = ANY(COALESCE(treatment_methods, '{}')));
```

---

## PENDING DECISION — Sent-folder visibility for system email

**Problem.** The system sends customer email via Resend. Reply-To is
`admin@mouldandrestoration.com.au` (live as of 2 Aug), so customer replies reach the
Workspace inbox and admin can respond normally. What's missing is a record of the
OUTBOUND message — nothing appears in Gmail's Sent folder, so admin sees replies
without seeing what was sent.

### Option A — BCC to a dedicated address

Add `bcc` to Resend calls, pointing at `sent@mouldandrestoration.com.au` (not
`admin@`, to keep the main inbox clean). Gmail filter auto-labels.

- ✅ ~20 min, one line per send site
- ✅ Transport unchanged — Resend logs, bounce tracking, delivery history all retained
- ✅ No new failure modes
- ❌ Copies land in an inbox, not literally the Sent folder
- ❌ Slightly indirect

### Option B — Route through Gmail SMTP

Swap transport in every Edge Function so mail genuinely appears in Sent.

- ✅ Exactly the desired result — indistinguishable from admin sending manually
- ✅ Single unified mail history
- ❌ Gmail app password needed as a secret in every EF
- ❌ 2,000/day cap, tighter per-recipient limits
- ❌ Single point of failure: if Gmail SMTP or the app password fails, ALL app email
  stops including password resets
- ❌ Loses Resend delivery logs, bounce tracking, send history

### Michael's position

Prefers **Option B**. Reason: Option A puts system copies in an inbox, which risks
admin confusing what to read vs what to respond to. B keeps the mental model clean —
sent mail lives in Sent, incoming lives in Inbox.

### Status

**Deferred.** Not to be built before the team's first week on the system — swapping
email transport is the highest-risk change available and the current path was only
stabilised 2 Aug. Revisit once the system has run clean for a week. Include in the
team how-to doc so Glen and Clayton can weigh in, since it affects their daily
workflow.

---

## Team guide doc — items to cover

Content for the team how-to referenced above. Written for Glen, Clayton and Vryan,
not for developers — keep the plain-English phrasing when the guide is authored.

### Technicians (Glen, Clayton)

**Updating your own starting address.** Profile → Edit → Starting Address. Start
typing, then **pick your address from the dropdown that appears**. Don't just type it
and hit Save.

Why it matters: your starting address is where the app measures travel time from for
your first job each day. If you type without picking from the dropdown, in the normal
case **nothing saves at all** — the old address stays and it looks like the change
didn't take. If Google's address lookup happens to be down, the text saves but the
postcode is left blank, which is what the app falls back to when it can't reach Google
for a live travel estimate. Either way, picking from the dropdown is what makes it
stick.

Technicians can do this themselves — no admin involvement needed.

### Admin

**Customer replies.** Replies to system emails land in the
`admin@mouldandrestoration.com.au` inbox. Reply from there as normal.

**Google review "reply STOP".** The review request email carries a line offering
customers a way to opt out of follow-ups. **Nothing parses those replies
automatically.** If a customer replies STOP, note it and don't trigger the review
email for that customer again. An unsubscribe offer that isn't honoured is worse than
not offering one.

**System email doesn't appear in Sent.** Emails the system sends won't show in Gmail's
Sent folder — only replies you write yourself. See the Sent-folder pending decision
above; Option B is preferred but deferred until the system has run clean for a week.

### Developer context (not for the guide itself)

- Starting address lives in **auth `user_metadata.starting_address`**, not a table.
  Self-service works because `Profile.tsx:218` calls `supabase.auth.updateUser()`,
  which writes the caller's own metadata — no RLS policy involved.
- The dropdown requirement is real: `AddressAutocomplete.tsx:209` wires the input to
  `handleInputChange`, which only sets local state. `onChange` fires solely from
  `handleSelectPlace` (`:109`). The `!isLoaded` fallback branch (`:167-176`) is the
  exception — it commits typed text with empty `suburb`/`state`/`postcode`.
- Travel time reads `starting_address.fullAddress` **as a string** for the Google
  Distance Matrix call (`calculate-travel-time/index.ts:708, 898`); the haversine
  fallback keys on `postcode` against `MELBOURNE_POSTCODE_COORDS` (`:602-606`). The
  stored `lat`/`lng` are read **only** by `Profile.tsx:174-175` to repopulate the form
  — no calculation consumes them.
- **Clayton's address was changed Footscray → Toorak on 2026-08-02** by direct admin-API
  update, not through the UI. `lat`/`lng` were deliberately left null rather than
  fabricated; they self-heal the next time he saves through the dropdown. Full
  pre-change metadata backed up at `dev-setup/clayton-address-2026-08-02/`
  (gitignored). Both `3011` and `3142` are present in the postcode fallback table, so
  travel calculations were correct immediately.

---

## DEFERRED — Full API key rotation

Rotate all production API keys: Resend, Supabase (anon + service role), Slack
webhook, Google Maps, OpenRouter, Sentry.

> Existing runbook: `docs/KEY_ROTATION.md` (secret inventory + new→verify→revoke
> sequence, Supabase/GitHub PATs LAST). This is the same work tracked as **L4 Phase 6**
> further down this file — do not plan it twice. Check that runbook's inventory against
> the scope list below before starting; it carries at least one secret this list omits.

### Why deferred

Rotation touches every Edge Function secret and every Vercel env var. A missed key
fails silently — email, AI summaries, or Slack notifications stop working with no
error surfaced until someone hits the wall. The email path was only stabilised
2 Aug 2026 and the team starts using the system 3 Aug. Rotating the night before
first use puts the highest-blast-radius change directly in front of the least
tolerance for breakage.

### When

After the system has run clean for a full week with the team on it.

### Scope when it happens

- `RESEND_API_KEY` (note: the `supabase-auth-smtp` key is separate — it lives in
  Supabase Auth SMTP config, not as an EF secret. Rotate both, independently.)
- `SUPABASE_SERVICE_ROLE_KEY` (also still present in Vercel Preview + Production
  scopes — remove there as part of this, see **PDF-CL6**)
- `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `SLACK_WEBHOOK_URL`
- `GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`
- `OPENROUTER_API_KEY`
- `SENTRY_AUTH_TOKEN`

### Verification required after each

Every EF that consumes the key must be **re-invoked and confirmed working**, not just
deployed. Build passing is not proof.

---

## ⚠️ PENDING: Invoice data integrity — 2 SQL blocks for Michael to run

> ⛔ DO NOT RUN BEFORE 4 AUG 2026. INV-2026-0003 hits day 29 on 4 Aug and fires
> the first real Slack digest — the only live test of the check-overdue-invoices
> v9 rewrite, and it fires once. Correct order: (1) digest fires 4 Aug ~9:00 AEST,
> (2) Michael confirms Slack output, (3) runbook block A (delete 4 invoice rows),
> (4) runbook block B (apply 20260729153000 constraint migration). Block B MUST
> follow A — the CHECK constraints reject the existing rows. Deletion supersedes
> the previously planned INV-2026-0003 two-field correction; that item is void.

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

**The other two rows also go — test data, not defective.** Both are
arithmetically perfect and came through the proper `saveCalculatedInvoice` path;
neither is a real invoice. `INV-2026-0004` (paid, $28,603.75): email
`user.name+tag+sorting@example.com` on an IANA-reserved domain, notes reading
`notes optial in invocie`, a line item named `testing custom line`, equipment of
10 × 10 days for every item ($18,300), address just "VIC", zero inspections /
job completions / bookings, whole create→sent→paid lifecycle in 50 minutes.
`INV-2026-0003` (overdue, $4,697.48): email is a variant of Michael's own
address, a line item named `custom one`.

**The invoices table ends empty.** Nothing has ever been billed through this
system, so $0.00 is the honest figure.

- [ ] **Run `docs/INVOICE_INTEGRITY_RUNBOOK.md` — DEV (`ctppzqnysmzynkxjlzta`)
      first, confirm clean, then PROD (`ecyivrxjpsmjmexqatym`).** Two ordered
      blocks: **A** deletes all four rows with bracketing verification SELECTs;
      **B** applies `supabase/migrations/20260729153000_invoice_totals_integrity_checks.sql`
      (two CHECK constraints, both `VALID`). **A before B** — a VALID constraint
      aborts while the two defective rows are present.

**Only invoice rows are deleted (verified read-only 2026-07-29).** No table in
the DB has an `invoice_id` column — all 26 public tables probed — so no FK
references `invoices.id`; nothing cascades, nothing blocks. `INV-2026-0003`'s
linked inspection and calendar booking **survive**: neither table has an
`invoice_id`, both link to the *lead*, and the invoice FKs point outward
(`invoices.lead_id → leads`), so deleting the referencing side cannot touch the
parent. Runbook step A7 asserts this. Leads, activities and email_logs untouched.
The full before-state of all four rows is preserved permanently in `audit_logs`
(24 rows, append-only, protected by `prevent_audit_logs_delete`), plus a
`delete_invoice` audit row each. `invoice_number_seq` is not rewound by a DELETE
— the next real invoice is `INV-2026-0005`, never a reused number; step A8
verifies the sequence directly.

**Expected, not a regression:** Reports year revenue **$39,633.52 → $0.00**;
month view and technician revenue stay $0.00; Outstanding **$4,987.88 → $0.00**.
The dashboard Outstanding Invoices widget will be empty.

Both constraints are required — neither alone catches both defects.
`INV-2026-0001` **passes** the sum check (290.40 + 0.00 = 290.40 is
arithmetically consistent) and is caught only by the GST relation.

---

**Last Updated:** 2026-08-02
**Production state:** production redeployed cache-free on `29a5808` (2026-08-02), bundle
verified to carry the PROD ref only. Supabase↔Vercel marketplace integration removed and 15
stale marketplace env vars deleted from Production scope the same day. Earlier baseline: main @
`b50d07b`, production @ `9fdc853` (merge of PRs #67–#71 + login-footer fix), mrcsystem.com live
and verified 2026-07-23. NOTE 2026-07-29: the `check-overdue-invoices` EF on PROD now runs the rewritten version from `launch/checks` `0a2fbac` (EFs deploy independently of the production branch); PR #72 (dashboard fixes) open, unmerged.
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
- ~~**DEV has ZERO Edge Functions deployed**~~ **[STALE — corrected 2026-08-01:
  DEV now has 4 EFs, deployed 28–30 Jul: generate-inspection-pdf,
  generate-job-report-pdf, generate-inspection-summary, manage-users.]**
  (Original context: restore never carried EFs; the generate-inspection-pdf deploy
  below was the first, so EF/template ordering was moot on DEV. That EF needs no
  custom secrets — Supabase-only.)

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
  is live: it fails fast with 500 "AI service not configured" because ~~**DEV has ONLY the
  platform-auto secrets** (CLI-verified 29 Jul: no OPENROUTER_API_KEY, no SYSTEM_USER_UUID,
  no Resend/Slack/INTERNAL_WEBHOOK_SECRET — the L4 "set dev EF secrets" step never ran)~~
  **[STALE — corrected 2026-08-08: CLI-verified `secrets list` on DEV now returns
  ADMIN_FALLBACK_EMAIL, GOOGLE_MAPS_API_KEY, OPENROUTER_API_KEY, RESEND_API_KEY and
  SYSTEM_USER_UUID. SLACK_WEBHOOK_URL was still absent and was set 2026-08-08 for the
  duplicate-guard testing (see the 8 Aug session log). INTERNAL_WEBHOOK_SECRET remains
  unset.]**
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

- [x] ~~**Decide Supabase↔Vercel marketplace integration fate.**~~ **RESOLVED 2026-08-02 —
      integration REMOVED entirely**, plus 15 stale marketplace env vars deleted from Vercel
      Production scope. The clobber hazard behind the 23 Jul outage is gone at the source, not
      merely documented around. Production redeployed cache-free on `29a5808`; bundle verified to
      carry the PROD ref only. The pre-deploy check
      (`npx vercel env ls production --project mrc-system`) is still worth keeping as habit.
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

## Follow-ups from 28 Jul 2026 session (admin dashboard accuracy audit + fix batches 1–2)

Context: launch-verification session audited every admin-dashboard number against PROD (read-only),
then shipped fixes on `launch/checks` (`91dd58f` dashboard reporting, `396ca9c` ?status= deep links,
`0ee439e` Melbourne date stamps + due_date restart at send). Runtime verification on a pinned preview
pending.

- [x] ~~Verify Today's Jobs / Today's Schedule show QA Test PR57 on 29 Jul~~ **FOLDED 2026-07-29 into the next item** — production still runs pre-fix code (PR #72 unmerged), so the observation is only possible after merge; the after-merge line below covers it.
- [ ] PROD-side confirmation after merge: QA Test PR57 bookings and both overdue invoices (INV-2026-0001/0003) exist only on PROD, not the DEV clone — preview verification covered the span/overdue logic structurally, not against those rows; re-check on production once `launch/checks` ships.
- [ ] Team Workload internal naming: `useTechnicianStats.inspectionsThisWeek` actually holds active-assigned-lead counts, and its `weekStart` computation is dead code — rename + clean (feature session).
- [ ] 14-day payment term hardcoded in three places (`createInvoice`, `autoPopulateFromLead`, `markInvoiceSent`) — no `payment_terms_days` column; feeds penalty ladder; scope into Xero sprint.
- [ ] `markInvoiceSent` now overwrites any manually-set `due_date` with send-date + 14 (intended: terms start at send) — revisit if per-invoice terms arrive with Xero.
- [ ] "Needs attention" wording collision: Leads-to-Assign card subtitle vs the Needs Attention panel — rename the subtitle (one-liner, cosmetic).
- [ ] Locate the "27 July" element from the dashboard date-contradiction report (Michael — no dashboard code path can render it for a 28 Jul view; need the exact element/screenshot).
- [x] ~~`check-overdue-invoices` cron not firing on PROD~~ **RESOLVED 2026-07-29 — misdiagnosis.** Cron fired at 23:00 UTC (9am AEST) and correctly flagged INV-2026-0003 the first morning it was eligible; the 22-day gap was the invoice sitting in `draft` (cron only scans `sent`), the exact trap the `markInvoiceSent` due-date restart now closes. EF deployed (v8), Vault auth header working, audit row attributed to SYSTEM_USER_UUID.
- [ ] `check-overdue-invoices` double-fired 28 Jul: two identical `invoice_overdue` activity rows 35ms apart (23:00:00.863/.898 UTC). Duplicate schedule RULED OUT 29 Jul — `cron.job` has exactly one job (jobid 3, `0 23 * * *`); internal double-processing ruled out by code path. Remaining hypothesis: duplicate HTTP delivery of a single cron tick (pg_net retry or gateway). Attributing it needs the EF request logs in the Supabase dashboard (Michael, low priority — ~~the idempotency guard shipped 29 Jul makes duplicates a no-op either way~~ **[CORRECTED 2026-08-08: the 29 Jul guard does NOT make duplicates a no-op. Reproduced on DEV under a genuine race — two `invoice_overdue` rows 193ms apart, two `invoice_milestone` rows 191ms apart, the same signature as this 28 Jul observation. The Slack digest is now guarded (v12, 8 Aug); the per-invoice DB writes are NOT. See P1 in the 8 Aug backlog.]**). **Root cause of the double delivery itself was localised 2026-08-08 — see the 8 Aug session log: the duplication is below our code, between pg_net and the Edge Functions gateway.**
- [x] ~~`check-overdue-invoices` EF computes daysOverdue from server UTC midnight~~ **RESOLVED 2026-07-29** — EF rewritten (Melbourne day-math, ladder-aligned milestones [1/8/15/16/29] + 60-day admin-escalation prompt, idempotency guard, single Slack digest with dry-run). Residuals below.
- [ ] Overdue-EF residual (accepted 2026-07-29): near-simultaneous invocations <~20ms apart can still double-post the Slack digest — closing it needs an advisory-lock RPC (migration); declined for now.
- [ ] Overdue-EF residual: invoices in `viewed` status are never scanned for overdue flagging (status quo preserved; nothing sets `viewed` today — latent until something does).
- [ ] Overdue cron `0 23 * * *` is fixed UTC: digest lands 9:00am AEST but will shift to 10:00am when Melbourne enters AEDT in October — decide whether to re-schedule to `0 22 * * *` for DST or accept the drift (Michael).
- [ ] INV-2026-0003 due_date data correction (Michael — one-row fix in Studio; code fix `0ee439e` prevents recurrence, does not touch existing rows). NOTE 2026-07-29: if correcting due_date to send-date+14 (2026-08-11), also revert `status` from 'overdue' back to 'sent' — the cron flagged it on 29 Jul, so a one-field fix would leave a contradictory 'overdue' row with a future due date.
- [ ] Rotate the DEV admin password (Michael — it was pasted into a CC chat on 29 Jul 2026; DEV-only exposure, rotate when convenient).
- [ ] Team Workload on DEV — ~~`manage-users` EF fails CORS on the DEV project (likely not deployed there)~~ **[STALE — corrected 2026-08-01: `manage-users` was deployed to DEV 28–30 Jul and answers 200.]** Re-verify the panel renders technicians on a DEV-backed preview, then close this item.
- [ ] Google Fonts woff2 (`fonts.gstatic.com` Inter) fails to load on the preview — check `font-src`/CSP vs the local-font bundling done in L4 Phase 0; page falls back cleanly, cosmetic.
- [ ] "Completed This Week" counts leads *updated* while sitting in a completed-ish status (updated_at filter), not actual completion events — semantics decision for a future batch.

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

## Follow-ups from 29 Jul 2026 session (admin analytics audit)

- [ ] **Revenue-query failure takes down the whole Reports page; the technician
      surfaces degrade instead.** `useReportsData` folds `revenueQuery.error` into
      the page-level `error`, so if `getPaidInvoices` throws, Reports renders its
      full-page "Failed to load reports" state and no KPI, chart or insight is
      shown — including the ones that have nothing to do with revenue.
      `useTechnicianStats` and `useTechnicianDetail` wrap the same call in
      try/catch and fall back to `revenueThisMonth = 0`, so a revenue outage
      costs them one tile, not the page.

      Not introduced by the revenue rewrite — the inspections query it replaced
      was wired the same way, so this is pre-existing shape, not a regression.
      Worth unifying so Reports degrades like the others (render the page, show
      the revenue tile as unavailable), but deliberately **not** done during the
      analytics work: it changes error-handling behaviour on a page that was
      already being reworked, and it deserves its own scoped change.

---

## Bugs & decisions found 2 Jun 2026

Surfaced during the business-logic / flow audits (read-only investigations). Code fixes are each their own session — logged here, not yet actioned.

1. **Manual-invoice GST = $0 lump-sum branch is latent dead code (low priority).** *Corrected 3 Jun 2026 — the earlier "GST=$0 is the default path" claim was a misreading.* In normal use the live invoice-create path is `InvoiceSummaryCard → createInvoice`, which **splits GST correctly** (and only renders at status `job_report_pdf_sent` with no existing invoice). The `gst_amount = 0` lump-sum branch in `InvoicePaymentCard.handleCreate` is **UNREACHABLE**: the card only mounts when an invoice already exists (`LeadDetail.tsx:2413`, `if (invoice)`), but that create branch only runs when there is *no* invoice — so it never renders. **Not current behaviour; no customer impact today.** Fix (low priority, own session): harden the unreachable branch to split GST so it's safe if the gating is ever re-wired.

2. ~~**AFD not wired + not captured as billable equipment.**~~ **RESOLVED — see the
   Open Questions entry above (verified 2026-08-02).** AFD is the HEPA Air Scrubber, rate
   $100/unit/day, fully wired through quote → invoice → PDF. The description below is the
   2 Jun state and is kept only for history: *AFD is a method toggle only, `$75` in
   `Section7Equipment.tsx` is a placeholder, qty/days captured but never SELECTed in
   `autoPopulateFromLead`, no line emitted, absent from `pricing.ts`, bills $0.* Every one
   of those clauses is now false — `pricing.ts:30` has `hepaAirScrubber: 100`,
   `invoices.ts:757` SELECTs `actual_afd_qty, actual_afd_days`, and `:822-831` emits the
   line item.

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

- [x] ~~**AFD equipment daily rate** — `Section7Equipment.tsx:9` uses `$75/day` as a
      placeholder~~ **RESOLVED — verified 2026-08-02, no code change needed.** AFD **is**
      the HEPA Air Scrubber; same equipment, confirmed by Glen and Clayton and renamed
      throughout the codebase on 25 June 2026. Rate is **$100/unit/day ex GST**.
      - `df4c115` (PR #67) replaced `afd: 75` with `hepaAirScrubber: 100`. Confirmed
        present in production `9fdc853`, so the correct rate has been **live since
        23 July**. `git show 9fdc853:src/components/job-completion/Section7Equipment.tsx`
        if you need to see it.
      - `1c663e8` removed the last duplicate: Section 7 held its own local
        `EQUIPMENT_RATES` const rather than importing the canonical one. It now imports
        from `pricing.ts` (`Section7Equipment.tsx:6`, used at `:403-410`, `:424-463`).
        Reached production today in `29a5808`.
      - The `$75` figure was never wired into billing at all — there was no line item, so
        customers were charged $0, not $75.
      - Billing is verified end to end: `pricing.test.ts:168-174` (2 × 3 days = $600),
        `invoices.hepaLineItem.test.ts` (line item $600 at unit_price 100, labelled "HEPA
        Air Scrubber", `is_equipment: true`), and `generate-job-report-pdf/index.ts:327`.
      - `equipmentRateDrift.test.ts` now pins the two Edge Function rate copies against
        `EQUIPMENT_RATES`, so the next drift fails CI instead of reaching a customer PDF.

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
- **Estimate:** ~1h remaining (the DNS wait is spent)
- **Tasks:**
  - [x] ~~Update DNS records (SPF, DKIM, DMARC)~~ **DONE 2026-08-02 8:11pm AEST — DKIM + SPF
        verified in Resend.**
  - [x] ~~Update Resend configuration~~ **DONE — domain verified; PROD Auth SMTP moved onto
        Resend (`smtp.resend.com:465`, key `supabase-auth-smtp`).**
  - [x] ~~**Cut the envelope over**~~ **DONE — verified 2026-08-04
        (`docs/_audit/DOCS_AUDIT_2026-08-04.md`, Finding 1):** zero `noreply@` /
        `@mrcsystem.com` email literals remain in `src/` or `supabase/`; every Edge
        Function sender defaults to `admin@mouldandrestoration.com.au`
        (`send-email/index.ts:203`, `:207`). Remaining sender scope is only
        `seed-admin/index.ts:50` (`admin@mrc.com.au`) — see the OUTSTANDING item at
        the top of this file.
  - [ ] Test deliverability (inbox vs spam) + verify headers pass SPF/DKIM/DMARC
- **Blocking:** envelope no longer blocks — code sends from the MRC domain. The
  deliverability/headers test above is the remaining gate before production email
  delivery is fully trusted.

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

---

## Merge-day checklist — launch/checks (PR #72)

Written 2026-07-29 at session close. PR #72 stays OPEN until the other session's
work lands and both branches reconcile. The open items in "Follow-ups from 28 Jul
2026 session" above are the merge-day checklist — do not tidy them away.

### ~~⚠️ CRITICAL — EF runtime is ahead of every branch~~ RESOLVED 2026-07-30

> **[STALE — corrected 2026-08-08.]** The divergence closed when `launch/checks`
> merged: `check-overdue-invoices/index.ts` has been byte-identical on `main` and
> `production` since `8fe47e9` (30/07), so the deploy-from-the-wrong-branch hazard
> below no longer exists. PROD now runs v12 (8 Aug, adds the Slack digest claim).
> Left in place as the historical record of why PR #72 was ordered the way it was.

PROD's `check-overdue-invoices` Edge Function is ALREADY RUNNING the `0a2fbac`
rewrite (deployed 2026-07-29, v9): Melbourne day-math, ladder-aligned milestones
[1/8/15/16/29] + 60-day escalation, idempotency guard, single Slack digest with
dry-run. `main` and `production` still hold the OLD `index.ts`. **Anyone who runs
`npx supabase functions deploy check-overdue-invoices` from any checkout other
than `launch/checks` before this merges silently reverts the fix** (UTC day-math
back, per-invoice Slack spam back, no guard). Do not deploy this EF from another
branch; merge PR #72 first.

### Commits on this branch (code)

- `91dd58f` fix(dashboard): overdue card derives from due_date + cents; count alignment across badge/card/panel; +N more; Revenue = paid invoices; Today's Jobs/Schedule read calendar_bookings with day-span overlap
- `396ca9c` fix(leads): honour ?status= deep links from dashboard cards and quick actions
- `0ee439e` fix(invoices): stamp due_date/payment_date as Melbourne calendar day; restart 14-day payment terms at send
- `0a2fbac` feat(ef): check-overdue-invoices rewrite (see CRITICAL above)
- `b4d4cc3` fix(settings): remove "Log out from ALL devices" option from Settings.tsx — unrelated to the dashboard work this branch is named for; the capability deliberately remains on the Profile page only (one place instead of two)

(Plus three docs-only commits: `87952cd`, `ed75377`, `3e687f2` — TODO.md.)

### Files touched (for conflict prediction vs the other session)

- `src/hooks/useAdminDashboardStats.ts` (heavily rewritten queries)
- `src/hooks/useTodaysSchedule.ts` (rewritten onto calendar_bookings)
- `src/hooks/useUnassignedLeads.ts` (query + limit)
- `src/components/admin/AdminSidebar.tsx` (one filter line)
- `src/pages/AdminDashboard.tsx` (formatCurrency, +N more block, empty-state copy)
- `src/pages/LeadsManagement.tsx` (useSearchParams wiring)
- `src/lib/api/invoices.ts` (melbourneDateISO, defaultDueDate, markInvoicePaid date, markInvoiceSent due_date)
- `supabase/functions/check-overdue-invoices/index.ts` (full rewrite)
- `docs/TODO.md`

### Verified vs NOT verified

- VERIFIED: every dashboard metric against DEV ground truth on pinned preview
  `mrc-system-l2w60bwsy` (counts, overdue card ≡ panel, cents, +9 more @48px, all
  three ?status= deep links, 375px zero-overflow, console/network clean); EF
  dry-run against PROD (write-free proven by identical pre/post DB state).
- NOT verified: multi-day span logic against a real PROD booking (QA Test PR57
  exists only on PROD; production runs pre-fix code until merge); Team Workload
  (manage-users EF absent on DEV → "No technicians found" on preview); the live
  Slack digest (no invoice has become newly eligible since deploy).

### Post-merge checks on PROD (Michael) — with deadlines

- [ ] **Multi-day span (window CLOSES 4 Aug):** QA Test PR57 must appear in
      Today's Jobs and Today's Schedule at 8:00 am, Type "Job", every day through
      4 Aug. The booking expires after that — merge before 4 Aug or stage a new
      multi-day booking to verify against.
- [ ] **First real Slack digest — 4 Aug:** INV-2026-0003 hits day 29 ("Warranty
      VOID — Ongoing") at the 9:00 am AEST cron. Expect ONE digest, milestone
      section, outstanding total; no per-invoice spam, no duplicate.
- [ ] **Team Workload renders technicians on PROD** (manage-users EF exists
      there; DEV could never show this).

---

## Follow-ups from 29 Jul 2026 session (pipeline tab reorder investigation)

Context: investigation of leads-page pipeline order vs the real customer journey.
Fix shipped this session: `LeadsManagement.tsx` statusOptions swap so pending_review
sits directly after job_completed, matching canonical ALL_STATUSES. statusFlow.ts
deliberately untouched. Findings below are logged, not actioned.

- [ ] **HIGH — `LeadDetail.tsx:500-543` reversion logic is index-fragile.** It nulls
      booking dates, `invoice_amount`/`invoice_sent_date` and `payment_received_date`
      based on hardcoded `ALL_STATUSES.indexOf` thresholds (`newRank < 1/2/6/7/10/11`).
      Any future reorder of ALL_STATUSES silently changes which customer financial
      data gets wiped on status reversion. MUST be refactored to named-status
      comparisons before ALL_STATUSES is ever reordered (natural home: the PR-T1
      `revision_needed` session, which reopens this logic anyway).
- [ ] **Type drift — `LeadStatus` union vs Postgres enum.** `statusFlow.ts` union is
      missing `hipages_lead` (live in the DB enum and queried by
      `useUnassignedLeads.ts`) plus 3 legacy enum values (`contacted`,
      `inspection_completed`, `inspection_report_pdf_completed`). Reconcile in a
      typed-cleanup session — either extend the union or migrate the legacy values out.
- [ ] **`LeadDetail.tsx:2554` renders `config.icon` but `StatusFlowConfig` defines
      `iconName`** — Change Status dialog icons likely render blank. Verify in UI,
      then fix the property name (one-liner, cosmetic).

---

## Known issues logged 30 Jul 2026 (merge reconciliation, launch/checks × analytics)

- [ ] **Revenue bucketing divergence (log only, do not fix):** dashboard "Revenue This
      Week" buckets by `payment_date` (Melbourne DATE); Reports revenue buckets by
      `paid_at` (timestamptz). The two surfaces can disagree at day boundaries for
      custom-dated payments.
- [ ] **/admin/reports scrolls horizontally at 375px (521px doc). Pre-existing.**
      `PeriodFilter.tsx:22` — inline-flex row of four buttons, no wrap. Violates §3.4.
      Playwright has a scoped `test.fail()` armed that flips red when fixed.

---

## Deferred from Manual QA Pass — 30 Jul 2026 (commit 8fe47e9)

Context: manual QA pass over the merged `main` (`8fe47e9`) on a DEV-backed Preview.
Items below were consciously deferred out of that pass, with the reason recorded so a
later session does not mistake them for untested-and-forgotten. Nothing here blocks
launch. Cross-references are given where an existing entry above already covers part
of the ground — those entries are left as they stand.

- [ ] **Money accuracy verification (overdue + revenue cards).** Deferred: the DEV
      fixture invoices are not genuinely late, so neither the overdue card nor the
      revenue card can be meaningfully verified against them. Admin reviews both
      daily against real invoices in PROD. Revisit after real leads accumulate
      genuine overdue/paid history. Covers: overdue card derives from `due_date`
      rather than `status='overdue'`; revenue card sourced from PAID invoices
      bucketed by `payment_date`; cents visible on all money displays; invoice
      helper totals (GST 10% on subtotal, equipment never discounted). Related, not
      duplicated: the after-merge PROD row confirmation in the 28 Jul dashboard-audit
      list, and the two 4 Aug deadline checks in the merge-reconciliation section.
- [ ] **Dashboard count consistency.** Deferred: the unassigned-lead count must read
      identically across the dashboard card, the sidebar badge and the panel. Also
      the "+N more" affordance, and Today's Jobs / Today's Schedule reading
      `calendar_bookings` so JOBS appear and not only inspections. Not blocking
      launch. Note the tension to resolve on revisit: the merge-reconciliation
      section records these as VERIFIED on the earlier pinned preview
      `mrc-system-l2w60bwsy` (counts, overdue card ≡ panel, cents, +9 more @48px);
      this pass deferred re-verification on `8fe47e9` rather than contradicting that.
- [ ] **Launch-stream surface checks.** Deferred: covered by the Playwright breadth
      suite (`tests/e2e/pre-merge`, 88/88 on DEV), so manual re-verification was
      judged unnecessary. Items: "log out all devices" ABSENT on Settings and
      PRESENT on Profile (`b4d4cc3`); pipeline tab order matches canonical
      `ALL_STATUSES` with `pending_review` immediately after `job_completed`
      (`d50b117`); `?status=` deep links pre-filter the leads page (`396ca9c`). The
      shipped fixes are already recorded above — this entry records only why the
      manual pass skipped them.
- [ ] **Real-device ergonomics — job completion form.** Deferred to a dedicated
      on-phone run. Desktop 375px emulation verifies layout and DB writes but not
      touch targets under work gloves, real scroll behaviour, or on-device keyboard
      interference. 48px minimum touch targets to be confirmed on hardware.
- [ ] **Admin surfaces on phone.** Deferred to a separate later run, after the
      technician phone pass above.
- [x] ~~375px horizontal-scroll sweep~~ **CLOSED 2026-07-30 — not deferred.**
      Playwright already covers static route renders at 375px. Manual scope narrowed
      to interactive overlays (dialogs, dropdowns, date pickers, toasts, stage
      selectors), which are absolutely positioned and fall outside the automated
      measurement — these are now checked inline during the lifecycle run rather than
      as a standalone item. Does not close the `/admin/reports` 521px overflow logged
      in the section above, which remains open.

---

## Noticed during 1 Aug QA — not yet actioned

- [ ] **Dexie offline layer is never fed by the UI.** `queuePhotoOffline` and
      `syncManager.saveDraft` have zero production callers, and
      `uploadInspectionPhoto`'s docstring claims it auto-queues offline when it does
      not. Real offline persistence today is the localStorage crash backups, not
      Dexie. Gap between what the code implies and what actually runs — resolve
      before offline behaviour is relied on further.
- [ ] **OfflineBanner overlays page headers while visible.** Back button and header
      Save icon sit behind it until dismissed. Pre-existing positioning, only visible
      now that the banner renders. Fix would be a layout-reserving banner slot, which
      means touching page headers.
- [ ] **Offline banner unverified on real hardware.** The iOS Safari event-firing
      quirk cannot be reproduced in desktop Chromium. Needs an airplane-mode
      walkthrough on a real iPhone against a pinned deployment URL before it can be
      called fixed.
- [ ] **Lightbox full-size photo render not visually confirmed.** Staged DEV photos
      are the known storage-seeding artifact (DB rows exist, Storage objects do
      not), so the viewer showed broken-image placeholders. Chrome, gestures and
      layout are proven; actual photo render needs a production-side look.
- [ ] **`TECH_EMAIL` / `TECH_PASSWORD` in `.env.test` are rejected by DEV Auth** —
      likely fallout from the 29 Jul DEV password rotation. Any technician-login e2e
      spec will fail until updated. Admin account works and carries the technician
      role on DEV.
- [ ] **shadcn toast limit** — one toast at a time, so during an offline spell the
      newest offline warning replaces the previous one. Noted in case message
      sequencing matters.
- [ ] **Stale docs corrected 2026-08-01 in this file:** the "DEV has ZERO Edge
      Functions deployed" claim (HANDOFF section) and "manage-users fails CORS on
      DEV" (28 Jul follow-ups) were both false as of 28–30 Jul — DEV has 4 EFs
      deployed (generate-inspection-pdf, generate-job-report-pdf,
      generate-inspection-summary, manage-users) and manage-users answers 200.
      Corrections applied in place with strikethrough; historical records in the
      merge-reconciliation section left as written.

---

## Credential rotation — post SECURITY_AUDIT redaction (Aug 2026)

> **NOTE:** git history rewrite was deliberately NOT performed — the values are
> already distributed (collaborators, local clones), and a force-push across
> `main` and `production` carries more risk than the exposure does. **Rotation is
> the remediation.** Context: `docs/SECURITY_AUDIT.md` was redacted in the working
> tree on 2026-08-04, but four full-length live credentials remain in git history
> at commit `b3b3f30`. Repo is private, so exposure is limited to collaborators
> and local clones — not urgent, but the keys are compromised. This block is
> narrower than the DEFERRED full API key rotation (L4 Phase 6 /
> `docs/KEY_ROTATION.md`) above and does not replace it — it covers only the keys
> exposed via `SECURITY_AUDIT.md` / git history.

- [x] **DONE — Resend API key rotated.** Verify: Supabase EF secret updated and
      one live send through `send-email` lands from
      `admin@mouldandrestoration.com.au`.
- [ ] **Supabase PAT (current, `sbp_066e...`) — ROTATE.**
      Reason: account-scoped across both PROD (`ecyivrxjpsmjmexqatym`) and DEV
      (`ctppzqnysmzynkxjlzta`), plus the stale `SUPABASE_ACCESS_TOKEN` in
      `~/.zshrc` is already causing 401s on EF deploys. One rotation fixes both.
      Steps: revoke in Supabase account settings → issue new → update
      `.mcp.json` → update `~/.zshrc` → open a FRESH shell → verify with
      `npx supabase functions list` against both project refs.
      Do this at the START of a session, never mid-runbook.
- [ ] **Supabase PAT (old, `sbp_2178...`) — VERIFY ONLY.**
      Confirm it is actually revoked in account settings rather than assumed.
      If still active, revoke.
- [ ] **GitHub fine-grained PAT — CHECK SCOPES FIRST.**
      If it has write access to the repo, rotate and update `.mcp.json`.
      If read-only, leave it. Decision, not an automatic rotation.
- [ ] **Confirm `.env` and `.mcp.json` are both in `.gitignore` and have never
      been committed.** Check with `git log --oneline -- .env .mcp.json`.
      A tracked `.mcp.json` is a larger exposure than the audit doc was.
- [ ] **Slack webhook for `#mrc-dev-test` was exposed in a chat transcript**
      (2026-08-08, set as the DEV `SLACK_WEBHOOK_URL`). Anyone holding it can post
      to that channel. Dev channel only, so low severity — rotate with the batch.

---

## Session log — 8 Aug 2026 (duplicate-invocation fixes + DEV verification)

Three concurrency fixes shipped to PRODUCTION and verified on DEV. The duplicate-cron
root cause was localised but is **not ours to fix**. Two pre-existing defects surfaced
during verification — logged in the backlog section below, deliberately not fixed here.

### Shipped (commit `c9761b6`, pushed to `main`)

**No `production` branch merge required — Edge-Function-only. Vercel does not build
`supabase/functions`, so EFs deploy independently of the branch.**

| Function | Ver | Fix |
|---|---|---|
| `send-inspection-reminder` | v20 | **Fix 1 — atomic claim** replacing read-then-write. Conditional UPDATE on `reminder_sent`; ownership guard via `.eq('reminder_sent', true)` rather than timestamp equality. |
| `send-inspection-reminder` | v20 | **Fix 2 — Resend `Idempotency-Key`**, derived as `inspection-reminder/${booking.id}`. |
| `check-overdue-invoices` | v12 | **Fix 3 — `app_settings` PRIMARY KEY compare-and-set** guarding the Slack digest, with release-on-failure when `postSlack` returns false (covers a Slack outage *and* an unset `SLACK_WEBHOOK_URL`). |

**Send-failure policy, chosen deliberately:** release the claim on transient failure
(5xx / 429 / network), retain it on permanent 4xx. The reminder lands 2 days
pre-inspection, so a silently dropped reminder is worse for MRC than a rare duplicate
— and Fix 2 is what makes releasing safe, because the retry reuses the same key.

### DEV verification (`ctppzqnysmzynkxjlzta`) — all three PASS

Both races were genuine, not sequential: 0.0 ms start gap, both invocations in flight
simultaneously (fired from a thread barrier). For Fix 1 **both invocations returned
`processed: 1`** — i.e. both cleared the SELECT before either wrote, which is the exact
race the fix exists to arbitrate.

| Guard | Verdict | Evidence |
|---|---|---|
| Fix 1 | ✅ PASS | One `sent:1/alreadyClaimed:0`, one `sent:0/alreadyClaimed:1`. Single `reminder_sent_at` stamp. **Resend recorded exactly 1 email.** |
| Fix 2 | ✅ PASS | Claim reset, re-invoked once → **no new email**; Resend returned the original email ID and timestamp. Key honoured. |
| Fix 3 | ✅ PASS | One `slackPosted:true`, one `digestSuppressed`. One `app_settings` key, **one Slack message** in `#mrc-dev-test`. |
| Fix 1 transient-release | ⬜ UNTESTED | Cannot induce a Resend 5xx by configuration alone. Not faked. |
| Fix 3 release-on-failure | ⬜ UNTESTED | Needs an invalid webhook **plus** DB re-arm (reset invoice to `sent`, clear activity rows and the claim key). |

Note on Fix 2: Resend's API does **not** expose received headers, so the key value was
never read back directly. The pass rests on behaviour — an independent invocation with
a re-claimed row produced no second email, which nothing else in the path could cause.

### Duplicate cron invocation — root cause localised, NOT fixed by us

Three-layer trace proves the duplication sits **below our code**:

| Layer | Fires |
|---|---|
| pg_cron (`cron.job_run_details`, 48 h) | **once** per slot — all `succeeded`, `"1 row"` |
| pg_net (`net._http_response`) | **once** per tick — ids sequential, no gaps |
| Edge Function | **twice** — distinct request ids, both `200`, both full execution |

21 of 23 hourly ticks (~91%), gap 5–537 ms. Scope is pg_net-specific — browser-invoked
functions are single. Exactly **one** pg_net worker (0.19.5), so "two workers" is ruled
out. Leading hypothesis: HTTP request replay on a stale keep-alive connection (libcurl
re-sends when a pooled connection closes mid-flight); gateway-side retry cannot be
excluded without inbound gateway logs. **Support ticket raised with Supabase.**

The three fixes above do not stop the duplication — they make it harmless.

### Sentry "3-day outage" — DISPROVEN

The apparent baseline (177 events 9 days ago) was `environment:development` — Michael's
laptop. Production has produced **13 events in 30 days**; three quiet days is that
curve's normal shape. Live bundle confirmed instrumented: DSN inlined,
`environment:"production"`, source maps uploading.

### Also done this session

- **Automated health check live.** Twice-daily scheduled task (08:00 / 20:00 Melbourne)
  covering Sentry, Resend, Supabase EF logs, DB state, and Slack notification
  reconciliation. Delivery by push + email. Prompt hardened after the first run produced
  a **FALSE CLEAN** by checking only the Sentry Issues stream.
- **Google Maps referrer block FIXED.** `API_KEY_HTTP_REFERRER_BLOCKED` on
  `https://www.mrcsystem.com/` since 04/08 — **Places autocomplete had been dead in
  production for 4 days.** The `www.` subdomain was added to the browser key's HTTP
  referrer restrictions.
- **Four uncontacted real leads actioned** (oldest 67 h). Admin notified.

### Open verification — nothing below is proven in PRODUCTION

- [ ] **Fix 1 claim path unproven in PROD** — `calendar_bookings` is empty. First signal
      is `alreadyClaimed > 0` on the tick after the first real booking. Ask Glen or
      Clayton to flag when they book one.
- [ ] **Fix 3 digest guard unproven in PROD** — `invoices` is empty. First signal is
      exactly one Slack digest on the first genuinely overdue invoice.
- [ ] **Health check email delivery not confirmed end to end.** Verify an email actually
      arrives after the 20:00 run.

---

## Backlog from the 8 Aug 2026 session (defects found, none fixed)

### P1 — `email_logs` insert fails silently in production code

`await supabase.from('email_logs').insert({...})` in `send-inspection-reminder` has no
`.select()` and no error check, so any failure is invisible. Observed on DEV: the
function reported `sent: 1` while writing **zero** log rows.

**This bears directly on Fix 1.** The retain-on-4xx policy means the `status:'failed'`
row is the ONLY record that a reminder will never be retried. If the insert can fail
invisibly, a permanently-failed reminder leaves the booking reading `reminder_sent=true`
forever — indistinguishable from success.

Separately, `email_logs` has **0 rows all-time in production**, so no sends are being
logged at all. That also blocks the health check's silent-suppression cross-reference,
which depends on the table. (Supersedes the S1 verification item above, which currently
has nothing to check.)

*DEV-specific cause, not the production one:* `email_logs.sent_by` has a FK to
`auth.users(id)` and `SYSTEM_USER_UUID` (`a5ae96f1-…`) does not exist in DEV's
`auth.users`, so every DEV insert is a FK violation. The silence is what generalises.

### P1 — `check-overdue-invoices` per-invoice guard does not hold under concurrency

Verified on DEV: **two `invoice_overdue` rows 193 ms apart, two `invoice_milestone` rows
191 ms apart.** Reproduces the 28/07 production signature.

Mechanism — **corrected 2026-08-17** (the earlier wording said the RPC's UPDATE was
unconditional; that was wrong, and rebuilding a guard that already exists is the mistake
it invites). `audited_mark_invoice_overdue`'s UPDATE has **always** been conditional
(`AND status <> 'overdue'`), and under READ COMMITTED Postgres re-evaluates that predicate
against the committed new row version once the row lock releases, so the second invocation
matches **zero rows**. `audit_invoices_update` is `AFTER UPDATE … FOR EACH ROW`, so the
loser fires no trigger either. **`invoices` and `audit_logs` were never racing.**

The real defect is one layer up: the RPC `RETURNS void`, so supabase-js hands *both*
invocations `(data: null, error: null)`. The EF cannot tell the winner from the loser and
both fall through to an unconditional `activities` INSERT. `doneToday` cannot help — it is
built from a plain SELECT at invocation start, which both invocations see empty.

Separately, the `invoice_milestone` insert has **no** DB-level guard at all: it transitions
no column, so there is nothing for a conditional UPDATE to arbitrate.

**The code comment at `check-overdue-invoices/index.ts:260` asserting "the atomic
transition is the tie-breaker between near-simultaneous invocations" IS FALSE** — a
SELECT followed by an RPC UPDATE is read-then-write, not compare-and-set. **Correct that
comment as part of the fix so nobody trusts it again.**

Fix requires a **migration to the RPC** (narrow the UPDATE to `status = 'sent'` and return
rows-affected so the caller can tell a win from a loss), which is why it was not done in the
8 Aug session.

**WRITTEN 2026-08-17, NOT YET APPLIED —
`supabase/migrations/20260817120000_invoice_overdue_compare_and_set.sql`.** `RETURNS BOOLEAN`
via `GET DIAGNOSTICS ROW_COUNT`; `DROP` + `CREATE` because the return type changes. It also
**drops `authenticated` EXECUTE** (service_role only — closes the
`authenticated_security_definer_function_executable` WARN in
`docs/SUPABASE_ADVISOR_AUDIT.md`), and re-`REVOKE`s `PUBLIC`/`anon` because `CREATE FUNCTION`
restores the default `PUBLIC EXECUTE` and would otherwise silently undo
`20260709120000_revoke_anon_execute_audit_rpcs.sql`. The matching `check-overdue-invoices`
changes are committed alongside it: boolean consumed, a `typeof !== 'boolean'` guard for the
wrong-order case, `alreadyFlagged` + `alreadyMilestoned` counters in the response, both
`activities` inserts error-checked, and the milestone path moved onto an `app_settings`
PRIMARY KEY claim (no schema change — mirrors `claimTodaysDigest`).

⚠️ **Apply order: migration in Studio FIRST, EF deploy SECOND.** The reverse leaves the new
EF receiving `null` from the old RPC, tripping the typeof guard and skipping **every**
activity row until the migration lands. Migration-first is safe — the old EF ignores the
return value. Regenerate `src/integrations/supabase/types.ts` **after** applying (it still
says `Returns: undefined`). The `'viewed'` status gap stays deliberately open and gets its
own change.

Impact bounded: final invoice status correct, no money touched, no customer email, and
Fix 3 correctly prevented the duplicate Slack. Cost is duplicate rows on the lead's
activity timeline.

### P1 — `ALTER DEFAULT PRIVILEGES`: every new `public` function auto-grants `anon` + `authenticated` EXECUTE

Surfaced 2026-08-17 while applying `20260817120000_invoice_overdue_compare_and_set.sql`.
That migration's `REVOKE`s of `PUBLIC` and `anon` held, but `authenticated` came back
anyway — because `DROP` + `CREATE FUNCTION` re-runs the schema default ACL, and nothing
in the migration revoked `authenticated` explicitly.

**Verified on PROD 2026-08-17 (`pg_default_acl`, read-only). TWO default ACLs on
`public` functions, one per granting role, and both grant `anon` and `authenticated`:**

```
granting_role  | default_acl
---------------+-------------------------------------------------------------------------------
postgres       | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
supabase_admin | {postgres=X/supabase_admin,anon=X/supabase_admin,authenticated=X/supabase_admin,service_role=X/supabase_admin}
```

**Consequence — this is the part that matters.**
`20260709120000_revoke_anon_execute_audit_rpcs.sql` is **not permanent**. It revoked a
grant; it did not change the default that re-creates it. Any migration that `DROP`s and
re-`CREATE`s a `SECURITY DEFINER` function in `public` silently regains `anon EXECUTE` at
the moment of `CREATE`. For `audited_mark_invoice_overdue` and
`audited_insert_lead_via_framer` that means an unauthenticated caller could execute an
RLS-bypassing function with a forged `p_acting_user_id`.

**Interim rule — follow it until the proper fix lands.** Every migration that
`DROP`/`CREATE`s a function in `public` MUST carry, inside the same transaction:

```sql
REVOKE ALL ON FUNCTION public.<fn>(<args>) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.<fn>(<args>) FROM anon;
-- and, if the function should not be reachable by logged-in users:
REVOKE ALL ON FUNCTION public.<fn>(<args>) FROM authenticated;
```

…then verify with `information_schema.routine_privileges` in the same session. The verify
step is not optional: the failure is silent and widens access rather than narrowing it.

**Proper fix — needs its own session and a security review.** `ALTER DEFAULT PRIVILEGES`
against **both** granting roles (`postgres` and `supabase_admin`) to stop auto-granting
`anon`/`authenticated` EXECUTE on new `public` functions. This is **schema-wide and affects
every future function**, including ones PostgREST is expected to expose to `anon` (e.g.
`calculate_gst`, `calculate_dew_point`, `generate_lead_number`). Deliberately NOT done as a
footnote to the invoice work. Scope it properly: inventory which `public` functions are
*meant* to be anon/authenticated-callable first, because flipping the default will break
any that rely on it.

**Current state of `audited_mark_invoice_overdue` (PROD, 2026-08-17, post-apply):**
`returns = bool`, `security_definer = true`, `owner = postgres`, grantees =
`authenticated, postgres, service_role`. `anon` and `PUBLIC` are **absent** — so this is
identical to the pre-migration grant set, **no widening, no open hole**. The
`authenticated` tightening the migration intended simply did not take, and is deferred to
the session above. NOTE: the migration file's own comment claims `authenticated` "is
deliberately NOT re-granted" — that describes the intent, not the achieved outcome. The
file is left unmodified because it is already applied and is the historical record of what
ran; this entry is the correction.

### CONVENTION — `src/integrations/supabase/types.ts` is generated from **PROD**, never DEV

Established 2026-08-17 after finding the committed file carried DEV's values.

**The rule.** The committed `types.ts` must always be generated from PROD:

```bash
npx supabase gen types typescript --project-id ecyivrxjpsmjmexqatym > src/integrations/supabase/types.ts
```

Regenerating from DEV **locally** while testing a DEV-only migration is fine and often
necessary — just don't commit that output. Re-run against PROD once the migration has
actually landed there, and commit that.

**Why it matters.** This file compiles into the production bundle, and it is not only a
schema map: `__InternalSupabase.PostgrestVersion` feeds
`createClient<Database, { PostgrestVersion: 'XX' }>`, so it can shift inferred types
across the app. The two projects genuinely differ — verified with the same CLI in the
same minute on 2026-08-17:

| Project | `PostgrestVersion` |
|---|---|
| PROD `ecyivrxjpsmjmexqatym` | `13.0.5` |
| DEV `ctppzqnysmzynkxjlzta` | `14.5` |

**What happened.** `0362c39` ("chore(types): regenerate from DEV after HEPA +
job-completion waste migrations", 28 Jul) committed DEV's `14.5`. It sat wrong until
2026-08-17, when the regeneration for `audited_mark_invoice_overdue`'s `boolean` return
corrected it to `13.0.5`. Traced with `git log -S'PostgrestVersion: "14.5"'`.

**No harm done that time** — the diff was only those two lines, so DEV and PROD schemas
were identical and nothing else was mistyped. That is luck, not a guarantee: DEV is a
restore-to-new-project clone and migrations are applied to it first, so a DEV-generated
file can carry columns PROD does not have yet. Committing that would type the frontend
against a schema production cannot serve.

**Known, accepted wrinkle.** Local dev points at DEV via `.env.development.local`, so
after a PROD regeneration the `PostgrestVersion` marker is "wrong" for local dev. This is
deliberate — it is a type-level hint only, the schemas are identical, and PROD is what
ships. Do not "fix" it by regenerating from DEV.

**Check before committing this file:** `git diff src/integrations/supabase/types.ts`
should show only what your migration changed. A `PostgrestVersion` flip to `14.5` means
it came from DEV — regenerate from PROD.

### P2 — DEV shares the PRODUCTION Resend account

The same API key that sends real customer mail is used on DEV. **One mistyped address in
a DEV test reaches a real customer.** Needs a separate DEV key, or at minimum a
documented rule that DEV only ever sends to `delivered@resend.dev`.

### P2 — Sentry `ignoreErrors` contains `"Failed to fetch"`

Confirmed harmful, not theoretical: it swallowed a real production failure on 07/08
13:44 — `[useTechnicianStats] Failed to fetch users`, a Supabase connectivity error, and
the admin technician view silently rendered an empty user list. It reached the `logs`
dataset only because of `consoleLoggingIntegration`; `captureException` discarded it.

### P2 — Edge Functions have no Sentry SDK

`send-email`, `generate-inspection-summary` and `check-overdue-invoices` have never
reported to Sentry and cannot under the current config. Supabase EF logs (24 h
retention) are the only server-side source.

### P2 — Swallow-and-continue audit

`useTechnicianStats` catches, returns an empty list, and renders as if valid. Same shape
as the known `TechnicianInspectionForm` defect where area save errors are swallowed and
"Saved" shows unconditionally. **Audit whether this is a codebase-wide pattern.**

### P3

- [ ] Sentry release is always `mrc-app@0.0.0` (`package.json` version never bumped).
      No per-release regression detection.
- [ ] `property_type` NULL on all Framer-sourced leads — intake never populates it.
      Upstream cause of the inspection-vs-job-completion mismatch.
- [ ] `notifications` table 0 rows all-time. In-app notification surface dead while
      Slack works.
- [ ] Supabase EF log retention is 24 h. Log invocations to a table for durable history.
- [ ] Supabase CLI is v2.101.0; current is v2.112.0.
- [ ] `toDisplayTitleCase` renders "JR Smith" as "Jr Smith". Cosmetic.
