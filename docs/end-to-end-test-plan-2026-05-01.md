# End-to-End Test Plan — Post-Phase 1 + Phase 2 Production Verification

**Date:** 2026-05-01
**Production tip:** `d13c8f7` (PR #45 + PR #46 merged)
**Test scope:** Full inspection workflow on a fresh test lead. Verifies what shipped in Phase 1 (Stages 1.1, 1.2, 1.4) and Phase 2 (audit_logs foundation + attribution). Explicitly identifies what is NOT yet fixed so unfixed findings don't get flagged as regressions during this test.

**How to run this:** Sit down with the dashboard, an SQL editor (Supabase Studio), and Sentry open. Walk the steps in order. Don't multitask — the verification queries between steps are cumulative.

---

## 0. Pre-flight before starting

### 0.1 Confirm both PRs are on production

```sql
-- In Supabase Studio SQL editor or via gh on terminal
SELECT 'production tip should be d13c8f7' AS check;
```

```bash
git fetch origin production
git log --oneline origin/production -3
# Expected: d13c8f7 (PR #46 merge), d1e5a53 (PR #45 merge), ebbe513 (PR #44 base)
```

### 0.2 Confirm database is in expected Phase 2 state

```sql
-- Should return 29 trigger rows: 9 tables × 3 events + user_roles 2 events
SELECT event_object_table, COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND action_statement LIKE '%audit_log_trigger%'
GROUP BY event_object_table ORDER BY event_object_table;
```

Expected output: 10 tables (`inspection_areas`, `inspections`, `invoices`, `job_completions`, `leads`, `moisture_readings`, `photos`, `subfloor_data`, `subfloor_readings`, `user_roles`) with the `user_roles` row showing 2 (INSERT+DELETE only) and the others showing 3 (INSERT/UPDATE/DELETE).

### 0.3 Confirm Edge Functions are deployed

> **CRITICAL.** The 7 modified EFs from Phase 2 must be deployed before Bucket A attribution (admin-driven PDF regen, AI summary regen, email send) and Bucket B attribution (Framer webhook, cron jobs) work correctly. Until they are, those writes will store `audit_logs.user_id = NULL`.

```bash
# From the repo root
npx supabase functions deploy generate-inspection-pdf --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy generate-job-report-pdf --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy manage-users --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy send-email --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy receive-framer-lead --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy send-inspection-reminder --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy check-overdue-invoices --project-ref ecyivrxjpsmjmexqatym
```

Confirm in Supabase Dashboard → Edge Functions → version numbers all show recent timestamps.

### 0.4 Take a baseline

```sql
-- Snapshot row counts before testing
SELECT
  (SELECT COUNT(*) FROM leads) AS leads_count,
  (SELECT COUNT(*) FROM inspections) AS inspections_count,
  (SELECT COUNT(*) FROM inspection_areas) AS areas_count,
  (SELECT COUNT(*) FROM moisture_readings) AS moisture_count,
  (SELECT COUNT(*) FROM photos) AS photos_count,
  (SELECT COUNT(*) FROM pdf_versions) AS pdf_versions_count,
  (SELECT COUNT(*) FROM email_logs) AS email_logs_count,
  (SELECT COUNT(*) FROM audit_logs) AS audit_logs_count,
  NOW() AS baseline_taken_at;
```

Save the output — every step below references the delta from this baseline.

### 0.5 Capture your admin UUID

You'll need this to verify attribution. Run as your admin user in the app or via Studio while logged in:

```sql
SELECT auth.uid() AS my_admin_uuid;
-- Or look it up by email:
SELECT id FROM auth.users WHERE email = 'YOUR_ADMIN_EMAIL';
```

Substitute `<admin_uuid>` throughout the rest of this doc.

---

## 1. Lead creation (admin-initiated, frontend write)

### Step 1.1 — Create a test lead via the admin UI

**Action:** Admin Dashboard → Leads → New Lead. Fill in:
- Name: "Phase 2 E2E Test"
- Phone: `0400 000 000`
- Email: `phase2-e2e@mrcsystem.internal`
- Property address: 1 Test St, Testville VIC 3000
- Issue: "End-to-end test for Phase 1 + Phase 2 verification"
Submit.

**Expected:**
- Lead appears in the dashboard list with status "New Lead"
- Address shown on the lead card
- No console errors in browser DevTools

**Verification SQL:**

```sql
-- Confirm the lead was created with the right shape
SELECT id, full_name, status, lead_source, created_by
FROM leads
WHERE email = 'phase2-e2e@mrcsystem.internal';
-- Capture the lead id as <test_lead_id>

-- Confirm audit_logs row appears with admin attribution (NOT NULL)
SELECT user_id, action, entity_type, created_at
FROM audit_logs
WHERE entity_type = 'leads'
  AND action = 'lead_created'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC LIMIT 1;
-- user_id should equal <admin_uuid> — NOT NULL
```

**Pass criteria:**
- ✓ leads row exists
- ✓ audit_logs `lead_created` row carries admin's UUID
- ✓ `pass = true` if you compute `user_id = '<admin_uuid>'`

### Step 1.2 — Edit a lead field inline

**Action:** Open the lead in admin UI → click edit on the phone number → change to `0400 111 111` → save.

**Expected:** Field saves immediately, no errors.

**Verification SQL:**

```sql
SELECT user_id, action, metadata->'before'->>'phone' AS old_phone, metadata->'after'->>'phone' AS new_phone
FROM audit_logs
WHERE entity_type = 'leads'
  AND action = 'lead_updated'
  AND entity_id = '<test_lead_id>'
ORDER BY created_at DESC LIMIT 1;
```

**Pass criteria:**
- ✓ `lead_updated` audit row exists with admin's UUID
- ✓ `before.phone = '0400 000 000'`, `after.phone = '0400 111 111'`

---

## 2. Inspection scheduling (admin-initiated)

### Step 2.1 — Schedule an inspection on the lead

**Action:** Admin → open lead → "Book Inspection" → pick a technician + date + time → save.

**Expected:** Lead status advances to "Inspection Scheduled". Calendar booking row created.

**Verification SQL:**

```sql
-- Lead status updated
SELECT status, assigned_to, inspection_scheduled_date FROM leads WHERE id = '<test_lead_id>';

-- audit_logs captures the lead update with the new assigned_to
SELECT user_id, metadata->'before'->>'assigned_to' AS old_tech, metadata->'after'->>'assigned_to' AS new_tech
FROM audit_logs
WHERE entity_type = 'leads' AND entity_id = '<test_lead_id>'
  AND action = 'lead_updated' AND created_at > NOW() - INTERVAL '2 minutes'
ORDER BY created_at DESC LIMIT 1;
```

**Pass criteria:**
- ✓ Lead has `assigned_to` set, `status = 'inspection_scheduled'` (or similar)
- ✓ audit_logs row carries admin's UUID

> **NOTE:** `calendar_bookings` is NOT in the audit_log_trigger scope. The booking row creation will not appear in audit_logs. This is by design — the scope of Phase 2 is the 10 tables listed in 0.2.

---

## 3. Technician inspection (technician role, frontend writes)

> Login as the assigned technician for these steps.

### Step 3.1 — Open the inspection form

**Action:** Technician dashboard → assigned jobs → tap the test lead → "Start Inspection".

**Expected:** Inspection form Section 1 loads with the lead's data pre-filled (name, address, phone).

**Verification SQL:**

```sql
-- An inspection row should be created (or upserted) on form open
SELECT id, lead_id, inspector_id, created_at
FROM inspections WHERE lead_id = '<test_lead_id>';
-- Capture <test_inspection_id>

-- inspection_created audit row carries the technician's UUID
SELECT user_id, action FROM audit_logs
WHERE entity_type = 'inspections' AND entity_id = '<test_inspection_id>'
ORDER BY created_at DESC LIMIT 1;
```

**Pass criteria:**
- ✓ inspections row exists
- ✓ `inspector_id` is the technician's UUID (this is a snapshot per `docs/data-model-invariants.md`)
- ✓ audit_logs `inspection_created` carries the technician's UUID (NOT NULL)

### Step 3.2 — Complete Section 1 (Basic Info) and save

**Action:** Tap through Section 1, confirm all fields, tap Next.

**Expected:** Auto-save fires within 30s. Form moves to Section 2.

**Verification SQL:**

```sql
-- inspection_updated row from the auto-save
SELECT user_id, metadata->'after'->>'inspector_name' AS inspector_name, created_at
FROM audit_logs
WHERE entity_type = 'inspections' AND action = 'inspection_updated'
  AND entity_id = '<test_inspection_id>'
ORDER BY created_at DESC LIMIT 1;
```

**Pass criteria:**
- ✓ At least one `inspection_updated` audit row carries technician's UUID

### Step 3.3 — Section 2 (Property), Section 3 (Areas), add 2 inspection areas

**Action:** Add area "Bathroom" with temp/humidity readings + 1 photo. Add area "Kitchen" same. Save.

**Verification SQL:**

```sql
-- inspection_areas rows + audit_logs for each
SELECT id, area_name FROM inspection_areas WHERE inspection_id = '<test_inspection_id>';

SELECT user_id, action, metadata->'after'->>'area_name' AS area_name
FROM audit_logs
WHERE entity_type = 'inspection_areas'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 5;
-- Expect 2 'inspection_area_created' rows, technician's UUID

-- Photos
SELECT id, area_id, photo_type, caption FROM photos
WHERE inspection_id = '<test_inspection_id>'
ORDER BY created_at DESC;

SELECT user_id, action FROM audit_logs
WHERE entity_type = 'photos' AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 5;
-- Expect 'photo_created' rows, technician's UUID
```

**Pass criteria:**
- ✓ 2 inspection_areas rows
- ✓ Each generates an `inspection_area_created` audit row with technician's UUID
- ✓ Each photo generates a `photo_created` audit row with technician's UUID

> **UNFIXED FINDING (NOT a regression):** Photos uploaded in this step will likely have `caption = NULL`. The caption-required gating is Phase 4.1 work. **Don't flag NULL captions as a Phase 1/2 bug.**

### Step 3.4 — Section 4 (Subfloor), enable subfloor + add a moisture reading

**Verification SQL:**

```sql
SELECT id, observations FROM subfloor_data WHERE inspection_id = '<test_inspection_id>';
SELECT id, moisture_percentage, location FROM subfloor_readings WHERE subfloor_id = (SELECT id FROM subfloor_data WHERE inspection_id = '<test_inspection_id>');

-- audit_logs for subfloor_data + subfloor_readings
SELECT user_id, action, entity_type FROM audit_logs
WHERE entity_type IN ('subfloor_data', 'subfloor_readings')
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 5;
```

**Pass criteria:**
- ✓ subfloor_data row + audit row
- ✓ subfloor_reading row + audit row
- All carry technician's UUID

### Step 3.5 — Sections 5–8, fill required fields, save

Walk Section 5 (Outdoor), Section 6 (Direction Photos toggle), Section 7 (Work Procedure / treatment methods), Section 8 (Job Summary). Toggle a few options, save.

**Verification SQL:** Same pattern — `inspection_updated` audit rows accumulate, all with technician's UUID.

> **UNFIXED FINDINGS (NOT regressions):**
> - Per-area temperature/humidity/dew_point will not appear in the customer PDF (Phase 8.1 work).
> - Subfloor `landscape` field doesn't render in PDF (Phase 8.2).
> - `internal_office_notes` doesn't render in PDF or email (Phase 8.1).
> - `regenerationFeedback` form field still doesn't persist anywhere — that's deferred to Stage 3.2 in Phase 3 with the AI summary versioning work.

### Step 3.6 — Section 9 (Cost Calculator) — fill in pricing

**Action:** Enter labor hours, equipment selection, save the cost estimate.

**Verification SQL:**

```sql
SELECT total_inc_gst, discount_percent, manual_price_override
FROM inspections WHERE id = '<test_inspection_id>';

-- 13% cap sanity
SELECT discount_percent FROM inspections WHERE id = '<test_inspection_id>';
-- Should be ≤ 0.13
```

**Pass criteria:**
- ✓ Pricing fields populated
- ✓ `discount_percent <= 0.13` (the 13% cap holds — it's enforced upstream in `pricing.ts`)
- ✓ Audit row captures the update

> **UNFIXED FINDING (NOT a regression):** No `pricing_history` or `quote_snapshots` table yet. The 13% cap is in code constants, not the DB. Phase 7 work.

### Step 3.7 — Submit the inspection

**Action:** Section 10 (Review) → Submit.

**Expected:**
- Lead status advances to "Inspection Submitted" or similar
- AI summary generation EITHER fires immediately (technician-side) OR is queued for admin-side processing depending on flow
- Some toast confirms submission

**Verification SQL:**

```sql
SELECT status FROM leads WHERE id = '<test_lead_id>';
SELECT id, ai_summary_text IS NOT NULL AS has_ai_summary, pdf_url IS NOT NULL AS has_pdf
FROM inspections WHERE id = '<test_inspection_id>';

-- audit_logs for the submission
SELECT user_id, action FROM audit_logs
WHERE entity_id = '<test_lead_id>' OR entity_id = '<test_inspection_id>'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 5;
```

> **UNFIXED FINDING (NOT a regression):** The AI summary generation overwrites `inspections.ai_summary_text` with no version history. That's the entire Phase 3 work. Right now the most recent generation is what's stored — there's no replay/forensic capability for the AI step. Don't flag this.

---

## 4. Admin: AI summary review

> Switch back to admin role.

### Step 4.1 — Open InspectionAIReview for the test lead

**Action:** Admin Dashboard → Leads → test lead → "Review AI Summary" (or wherever the AI review entry is).

**Expected:**
- AI summary content loads (or empty state if generation hasn't run)
- "Regenerate All Sections", "Save Draft", "Regenerate PDF", "Approve & Next" buttons visible

**Verification:** Confirm UI loads. Note any console errors.

### Step 4.2 — Test the Stale PDF banner

**Action:** Click "Regenerate All Sections". Wait for completion. Click "Save Draft".

**Expected:**
- AI sections refresh with new content
- After save, **Stale PDF banner appears at top** with copy "PDF is out of date. Regenerate before sending to customer."

> **THIS IS A KEY PHASE 1 STAGE 1.4 CHECK.** The banner appears because `ai_summary_generated_at` is now newer than the latest `pdf_versions.created_at`. If the banner does NOT appear, that's a Phase 1.4 regression — flag immediately.

### Step 4.3 — Verify the storm halt (PDF regen does NOT auto-fire)

**Action:** With the banner visible, edit one of the AI sections inline (e.g. add a sentence to "What We Found"). Save Draft.

**Expected:**
- Save toast appears
- Banner stays visible
- **NO new pdf_versions row gets created** (this is the key storm-halt check from Stage 1.4)

**Verification SQL (run before AND after the edit):**

```sql
SELECT COUNT(*) FROM pdf_versions WHERE inspection_id = '<test_inspection_id>';
```

**Pass criteria:**
- ✓ Count is unchanged after the inline edit
- ✓ Banner still visible

If the count incremented, the regen storm has come back. Hard stop — flag as Phase 1.4 regression.

### Step 4.4 — Click the explicit "Regenerate PDF" button

**Action:** Click "Regenerate PDF" in the InspectionAIReview header.

**Expected:**
- Loading toast → success toast
- Banner disappears (because PDF is now newer than the AI summary)
- pdf_versions count increments by exactly 1

**Verification SQL:**

```sql
SELECT COUNT(*) FROM pdf_versions WHERE inspection_id = '<test_inspection_id>';
-- Should be exactly +1 from the count before clicking Regenerate

SELECT user_id, action FROM audit_logs
WHERE entity_type = 'inspections' AND action = 'inspection_updated'
  AND entity_id = '<test_inspection_id>'
  AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC LIMIT 1;
-- user_id should equal <admin_uuid> (Phase 2 attribution check, requires EF deploy)
```

**Pass criteria:**
- ✓ +1 pdf_versions row
- ✓ Banner disappears
- ✓ Audit row carries admin's UUID (this is the Phase 2 Bucket A attribution check — requires the `generate-inspection-pdf` EF redeploy from §0.3)

---

## 5. Admin approve + send

### Step 5.1 — Approve the inspection PDF

**Action:** ViewReportPDF or Approve flow → click "Approve & Send".

**Expected:**
- Lead status advances to "Inspection Email Approved" or similar
- Email is queued/sent to the customer
- Approval is logged

**Verification SQL:**

```sql
SELECT pdf_approved, pdf_approved_at, pdf_approved_by FROM inspections WHERE id = '<test_inspection_id>';

-- email_logs row with sent_by attribution (Phase 2 Stage 2.0c — Bucket A column-level)
SELECT recipient_email, template_name, sent_by, status FROM email_logs
WHERE inspection_id = '<test_inspection_id>'
ORDER BY created_at DESC LIMIT 1;
-- sent_by should equal <admin_uuid> — requires the send-email EF redeploy from §0.3
```

**Pass criteria:**
- ✓ Inspection has `pdf_approved = true`, `pdf_approved_by = <admin_uuid>`
- ✓ email_logs row exists with `sent_by = <admin_uuid>` (NOT NULL — Phase 2 attribution)
- ✓ audit_logs has an `inspection_updated` row capturing the approval

> **UNFIXED FINDING (NOT a regression):** The email body itself isn't stored anywhere — just the metadata. That's Phase 6.2 work.
>
> **UNFIXED FINDING (NOT a regression):** No FK from email_logs to pdf_versions. That's Phase 6.3 work.

---

## 6. Webhook attribution (Bucket B test — receive-framer-lead)

### Step 6.1 — Submit a Framer test form (or simulate the webhook)

**Action:** Either:
- Submit the actual website form at the Framer URL with test data
- OR `curl` the EF endpoint with the JSON shape it expects:

```bash
curl -X POST 'https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead' \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Phase 2 Webhook Test","email":"phase2-webhook@mrcsystem.internal","phone":"0400222333","street":"2 Webhook St","suburb":"Testville","postcode":"3000","preferred_date":"2026-06-01","preferred_time":"10:00","issue_description":"Phase 2 Bucket B attribution test"}'
```

**Expected:**
- HTTP 200 response
- New lead appears in admin dashboard within seconds
- Slack new-lead notification fires
- Confirmation email sent to the test address

**Verification SQL:**

```sql
SELECT id, full_name, lead_source, status FROM leads
WHERE email = 'phase2-webhook@mrcsystem.internal';

-- THE KEY PHASE 2 BUCKET B CHECK:
-- audit_logs row for the new lead should carry SYSTEM_USER_UUID
SELECT user_id,
       user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid AS pass
FROM audit_logs
WHERE entity_type = 'leads' AND action = 'lead_created'
  AND entity_id = (SELECT id FROM leads WHERE email = 'phase2-webhook@mrcsystem.internal')
ORDER BY created_at DESC LIMIT 1;

-- email_logs row for the confirmation email — sent_by should be SYSTEM_USER_UUID
SELECT recipient_email, template_name, sent_by FROM email_logs
WHERE recipient_email = 'phase2-webhook@mrcsystem.internal'
  AND template_name = 'framer_lead_confirmation';
```

**Pass criteria:**
- ✓ Lead created
- ✓ audit_logs `lead_created` carries `SYSTEM_USER_UUID` (`a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f`)
- ✓ email_logs has `sent_by = SYSTEM_USER_UUID`

> **THIS IS THE KEY POST-EF-DEPLOY VERIFICATION** for the Bucket B attribution pattern. If `user_id` is NULL instead of `SYSTEM_USER_UUID`, the `receive-framer-lead` EF wasn't deployed (or the `SYSTEM_USER_UUID` env var isn't set on Supabase).

---

## 7. Cron attribution (Bucket B test — check-overdue-invoices)

> This step requires an existing invoice with `status = 'sent'` and `due_date < today`. If none exists, skip this step or manually create a test invoice via SQL.

### Step 7.1 — Manually trigger the cron

**Action:** Supabase Studio → Edge Functions → `check-overdue-invoices` → Invoke.

**Expected:** EF returns `{success: true, overdueCount: <N>}` where N is the number of newly-overdue invoices it processed.

**Verification SQL:**

```sql
-- Confirm an invoice flipped to 'overdue' if there was one to flip
SELECT id, status, updated_at FROM invoices
WHERE status = 'overdue' AND updated_at > NOW() - INTERVAL '5 minutes';

-- THE KEY PHASE 2 BUCKET B CHECK:
SELECT user_id,
       user_id = 'a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f'::uuid AS pass
FROM audit_logs
WHERE entity_type = 'invoices' AND action = 'update_invoice'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC LIMIT 1;
```

**Pass criteria (only meaningful if there was an invoice to flip):**
- ✓ `audit_logs.user_id = SYSTEM_USER_UUID` for the invoice update

---

## 8. Daily integrity check (Section 6.1 exit criterion D)

> Save this query and run it daily for the next 30 days.

```sql
SELECT COUNT(*) AS unattributed_writes_last_24h
FROM public.audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND user_id IS NULL;
```

**Pass criteria:** **0 every day.**

If this returns non-zero:
1. Identify which write paths created the NULL-user_id rows:
   ```sql
   SELECT entity_type, action, COUNT(*)
   FROM audit_logs
   WHERE user_id IS NULL AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY entity_type, action;
   ```
2. That's a regression. Flag immediately. Some EF or write path skipped the attribution pattern.

---

## 9. What is NOT yet fixed (don't flag these as regressions)

The audit `docs/inspection-workflow-audit-2026-04-30.md` listed 44 findings. Phase 1 + Phase 2 closed:

**Closed in Phase 1:**
- Pillar 1 finding 14 — `stainRemovingAntimicrobial` HARDCODE → fixed by Stage 1.1
- Pillar 1 finding 17 — `regenerationFeedback` DROP → deferred to Stage 3.2 (Phase 3); no current data loss because the field has no UI input
- Pillar 2 finding 1 — caption-clearing path → fixed by Stage 1.2
- Pillar 3 finding 12 — pdf_versions over-captured → fixed by Stage 1.4

**Closed in Phase 2:**
- Pillar 3 finding 1 — audit_logs trigger absent on inspection-side tables → all 8 tables now audited (10 in total counting invoices and job_completions)
- Pillar 3 finding 2 — Lead `assigned_to` change tracking → audit_logs now captures
- Pillar 3 finding 5 — Inspection field changes untracked → audit_logs now captures
- Pillar 3 finding 14 — `email_logs.sent_by` NULL → captured by both buckets

**Still open (NOT regressions if you encounter them in this test):**

Pillar 1 (rendering / surfacing gaps — Phase 8 work):
- `address` field DROP from form save (still not persisted) — Stage 8.6
- `triage_description`, `requested_by`, `attention_to` INVISIBLE on Lead Detail — Stage 8.7
- Per-area temperature/humidity/dew_point INVISIBLE in PDF — Stage 8.1
- Subfloor `landscape` INVISIBLE in PDF — Stage 8.2
- `external_moisture` DUP — Stage 8.5
- Many PARTIAL/INVISIBLE fields on AI Review or Lead Detail — Stage 8.3, 8.4
- `internal_office_notes` INVISIBLE in PDF/email — Stage 8.1 + 4.7

Pillar 2 (photo work — Phase 4):
- 58 NULL-caption photos in production
- Photo upload UI doesn't gate on caption — Stage 4.1
- AI prompt ignores captions — Stage 4.5
- PDF doesn't render captions as visible text — Stage 4.6
- Customer email doesn't reference photos — Stage 4.7
- Section4AfterPhotos always nulls caption (Phase 2 future build territory)

Pillar 3 (history work — Phases 3, 5, 7):
- AI summary regenerations destroy prior content — Phase 3 (the big one)
- AI prompt + model name + tokens not preserved — Stage 3.2
- AI manual edits lose original — Stage 3.3
- Orphan AI Edge Functions in production — Stage 3.6
- Photo metadata changes untracked at domain layer (audit_logs covers raw) — Stage 4.2
- Pricing changes untracked, rate tables hardcoded — Phase 7
- pdf_versions FK to ai_summary_versions missing — Stage 5.1 (depends on 3.1)
- Email HTML body not stored — Stage 6.2
- No FK from email_logs to pdf_versions — Stage 6.3

Cross-cutting:
- No UI for showing field history — Phases 10.1, 10.2
- No "Revert this field" affordance — Stage 10.3
- Activity timeline still uses unstructured `description` rendering — Stage 10.4

---

## 10. Cleanup after testing

The 2 test leads created above (`phase2-e2e@mrcsystem.internal` and `phase2-webhook@mrcsystem.internal`) can be archived via the admin UI. Their `audit_logs` rows persist by design (audit logs are immutable; the `prevent_audit_log_delete` trigger blocks DELETE).

If you want to fully remove the test leads from the dashboard, archive them:

```sql
UPDATE leads SET archived_at = NOW()
WHERE email IN ('phase2-e2e@mrcsystem.internal', 'phase2-webhook@mrcsystem.internal');
```

This generates 2 more `lead_updated` audit rows with admin's UUID, then the rows disappear from the active leads view.

---

## 11. Pass / fail summary

After running this matrix:

- Sections 0, 1, 2, 3, 4, 5 — Phase 1 + Phase 2 verification on the admin/technician path. All `user_id` checks should be NOT NULL and equal the calling user's UUID.
- Section 6 — Bucket B Framer attribution. `user_id` should equal `SYSTEM_USER_UUID`.
- Section 7 — Bucket B cron attribution. Same.
- Section 8 — daily integrity check baseline (zero NULL writes).
- Section 9 — list of EXPECTED gaps; flag only if you find something NOT on this list misbehaving.

**If everything in 0–8 passes:** Phase 1 + Phase 2 are verified on production. Phase 3 (AI summary versioning) is authorised to start.

**If any pre-flight check (§0.1, 0.2, 0.3) fails:** stop and resolve before testing further.

**If any user_id attribution check returns NULL where it should be a UUID:** that's a Phase 2 regression OR the corresponding EF wasn't deployed. Cross-check §0.3 first.

**If the storm-halt check (§4.3) fails:** Phase 1 Stage 1.4 regression. Hard stop.

**If the Stale PDF banner doesn't appear (§4.2):** Phase 1 Stage 1.4 regression. Hard stop.
