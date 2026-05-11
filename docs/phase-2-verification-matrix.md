# Phase 2 Verification Matrix

User-runnable verification of the Phase 2 audit infrastructure. Run after PR-C merges to production AND all modified Edge Functions are deployed.

**Modified EFs to deploy** (from `docs/edge-function-attribution-manifest.md`):
```bash
npx supabase functions deploy generate-inspection-pdf --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy generate-job-report-pdf --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy manage-users --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy send-email --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy receive-framer-lead --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy send-inspection-reminder --project-ref ecyivrxjpsmjmexqatym
npx supabase functions deploy check-overdue-invoices --project-ref ecyivrxjpsmjmexqatym
```

**Pre-flight checks already passed during execution (2026-05-01):**
- Test 3 — Session variable fallback: ✓ trigger captures `app.acting_user_id` when `auth.uid()` is NULL
- Test 4 — JWT precedence: ✓ trigger prefers `auth.uid()` over the session variable
- Test 5 — `audited_insert_lead_via_framer`: ✓ helper INSERTs lead, trigger captures SYSTEM_USER_UUID
- Test 6 — `audited_mark_invoice_overdue`: ✓ helper updates invoice, trigger captures SYSTEM_USER_UUID
- 29 triggers verified across 10 tables (full coverage)

The matrix below tests the **end-to-end flow** with real EFs and frontend interactions.

---

## Setup queries (run once before the matrix)

```sql
-- Pick a real test inspection lead and inspection ID for use throughout.
-- Capture for substitution into queries below.
SELECT id AS test_lead_id, full_name FROM public.leads WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 1;
SELECT id AS test_inspection_id FROM public.inspections ORDER BY created_at DESC LIMIT 1;

-- Take a baseline audit_logs row count.
SELECT COUNT(*) AS baseline FROM public.audit_logs;
```

Substitute `<lead_id>`, `<inspection_id>`, and the baseline count into the queries below.

---

## Trigger coverage (Stage 2.1)

| # | Test | Action | Expected | Verification SQL |
|---|---|---|---|---|
| 1 | `leads` INSERT | (Skip — `audited_insert_lead_via_framer` covers this; tested by row 11) | — | — |
| 2 | `leads` UPDATE | Edit a lead's name from admin UI | New `audit_logs` row with `entity_type='leads'`, `action='lead_updated'`, `user_id` = admin UUID | `SELECT user_id, action FROM audit_logs WHERE entity_type='leads' AND action='lead_updated' ORDER BY created_at DESC LIMIT 1;` |
| 3 | `leads` DELETE | (Soft-delete via UI archive instead — actual DELETE is admin-only via SQL) | If hard delete: `audit_logs` row with `action='lead_deleted'` | — |
| 4 | `inspections` UPDATE | Save the inspection form (auto-save fires every 30s) | `audit_logs` row, `action='inspection_updated'`, `user_id` = the technician UUID | `SELECT user_id, action FROM audit_logs WHERE entity_type='inspections' AND action='inspection_updated' ORDER BY created_at DESC LIMIT 1;` |
| 5 | `inspection_areas` INSERT | Add an area in the technician inspection form | `audit_logs`, `action='inspection_area_created'`, technician's UUID | `SELECT user_id, action FROM audit_logs WHERE entity_type='inspection_areas' ORDER BY created_at DESC LIMIT 1;` |
| 6 | `inspection_areas` UPDATE | Edit area observations or temperature inline | `audit_logs`, `action='inspection_area_updated'` | Same query as #5 |
| 7 | `inspection_areas` DELETE | Remove an area in the form | `audit_logs`, `action='inspection_area_deleted'` | Same query as #5 |
| 8 | `subfloor_data` write | Toggle subfloor fields and save | `audit_logs`, `action='subfloor_data_created'` or `_updated` | `SELECT user_id, action FROM audit_logs WHERE entity_type='subfloor_data' ORDER BY created_at DESC LIMIT 1;` |
| 9 | `moisture_readings` INSERT | Add a moisture reading via the form | `audit_logs`, `action='moisture_reading_created'` | `SELECT user_id, action FROM audit_logs WHERE entity_type='moisture_readings' ORDER BY created_at DESC LIMIT 1;` |
| 10 | `moisture_readings` UPDATE | Edit an existing moisture reading | `audit_logs`, `action='moisture_reading_updated'` | Same query as #9 |
| 11 | `subfloor_readings` write | Add or edit a subfloor reading | `audit_logs`, `action='subfloor_reading_created'` or `_updated` | `SELECT user_id, action FROM audit_logs WHERE entity_type='subfloor_readings' ORDER BY created_at DESC LIMIT 1;` |
| 12 | `photos` INSERT | Upload a new photo via the inspection form | `audit_logs`, `action='photo_created'` | `SELECT user_id, action FROM audit_logs WHERE entity_type='photos' AND action='photo_created' ORDER BY created_at DESC LIMIT 1;` |
| 13 | `photos` UPDATE | Edit a photo caption (e.g. cover photo swap on ViewReportPDF) | `audit_logs`, `action='photo_updated'` | `SELECT user_id, action FROM audit_logs WHERE entity_type='photos' AND action='photo_updated' ORDER BY created_at DESC LIMIT 1;` |
| 14 | `photos` DELETE | Delete a photo from area edit modal | `audit_logs`, `action='photo_deleted'` | `SELECT user_id, action FROM audit_logs WHERE entity_type='photos' AND action='photo_deleted' ORDER BY created_at DESC LIMIT 1;` |
| 15 | `user_roles` INSERT | Create a new technician via admin Users page | `audit_logs`, `action='grant_role'`, `user_id` = creating admin UUID | `SELECT user_id, action FROM audit_logs WHERE entity_type='user_roles' AND action='grant_role' ORDER BY created_at DESC LIMIT 1;` |
| 16 | `invoices` DELETE | (Skip unless intentional — invoices are rarely deleted) | If deleted: `audit_logs`, `action='delete_invoice'` | — |
| 17 | `job_completions` DELETE | (Skip unless intentional) | If deleted: `audit_logs`, `action='delete_job_completion'` | — |

---

## EF user attribution (Stage 2.0c)

| # | Test | Action | Expected | Verification |
|---|---|---|---|---|
| 18 | `generate-inspection-pdf` (Bucket A) | Click "Regenerate PDF" on ViewReportPDF as admin | `audit_logs.user_id` = admin's UUID for the `inspection_updated` row | `SELECT user_id FROM audit_logs WHERE entity_type='inspections' AND action='inspection_updated' ORDER BY created_at DESC LIMIT 1;` — should match the admin user, NOT NULL |
| 19 | `generate-job-report-pdf` (Bucket A) | Generate or regenerate a job report from LeadDetail | `audit_logs.user_id` = admin's UUID for `job_completion_updated` | `SELECT user_id FROM audit_logs WHERE entity_type='job_completions' AND action='update_job_completion' ORDER BY created_at DESC LIMIT 1;` |
| 20 | `manage-users` (Bucket A) | Add a new technician via admin Users page | `audit_logs.user_id` for the `grant_role` row = the admin who clicked Create | Same query as #15; verify NOT NULL |
| 21 | `send-email` `email_logs.sent_by` (Bucket A) | Trigger an email send (e.g. Approve & Send report) | `email_logs.sent_by` = calling admin's UUID | `SELECT sent_by, template_name FROM email_logs ORDER BY created_at DESC LIMIT 5;` — admin-initiated rows must have non-NULL `sent_by` |
| 22 | `receive-framer-lead` (Bucket B) | Submit a Framer test form | `audit_logs.user_id` for the new `lead_created` row = SYSTEM_USER_UUID (`a5ae96f1-af3d-4e50-b7ec-1cab01bdec3f`) | `SELECT user_id FROM audit_logs WHERE entity_type='leads' AND action='lead_created' ORDER BY created_at DESC LIMIT 1;` |
| 23 | `send-inspection-reminder` `email_logs.sent_by` (Bucket B) | Manually trigger the reminder cron from Supabase Studio | `email_logs.sent_by` for the `inspection_reminder` row = SYSTEM_USER_UUID | `SELECT sent_by, template_name FROM email_logs WHERE template_name='inspection_reminder' ORDER BY created_at DESC LIMIT 1;` |
| 24 | `check-overdue-invoices` (Bucket B) | Manually trigger the overdue cron when an invoice is overdue | `audit_logs.user_id` for the `update_invoice` row = SYSTEM_USER_UUID | `SELECT user_id, action FROM audit_logs WHERE entity_type='invoices' AND action='update_invoice' ORDER BY created_at DESC LIMIT 1;` |

---

## Pre-tested fallback semantics (Stage 2.0a)

These are confirmed working from the pre-flight Test 3 / Test 4 results, but listed here for completeness if you want to re-run.

| # | Test | Action | Expected |
|---|---|---|---|
| 25 | Session variable fallback | Run `docs/phase-2-verification-helpers.sql` Test 3 | Trigger captures `app.acting_user_id` when `auth.uid()` is NULL |
| 26 | JWT precedence | Run `docs/phase-2-verification-helpers.sql` Test 4 | Trigger prefers `auth.uid()` over the session variable |

---

## Invariants (Stage 2.0.5)

| # | Test | Action | Expected |
|---|---|---|---|
| 27 | `inspector_id` snapshot drift | Run the diff query from `docs/data-model-invariants.md` | Returns the documented expected drift (non-zero rows are normal — represent leads reassigned after inspection) — eyeball the rows to confirm they look like genuine reassignments |

---

## RLS sanity (post-Stage 2.1)

| # | Test | Action | Expected |
|---|---|---|---|
| 28 | Admin reads audit_logs | Login as admin, query audit_logs from app/Studio | Returns rows |
| 29 | Technician cannot read audit_logs | Login as technician, attempt to query audit_logs | Returns 0 rows (RLS blocks the SELECT) |

---

## Daily integrity check (Section 6.1 exit criterion D)

The fix plan's Definition of Done requires 30 consecutive days post-deploy with zero unattributed audit_logs writes. Daily query:

```sql
-- Count writes that escaped both auth.uid() AND the SYSTEM_USER_UUID sentinel
SELECT COUNT(*) AS unattributed_writes
FROM public.audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND user_id IS NULL;
```

Expected: **0 rows** every day. If non-zero, investigate which write path bypassed the attribution pattern (look at `entity_type` + `action` of the offending rows).

---

## Cleanup after running the matrix

Several rows above leave audit_logs entries behind. That's the design — audit_logs is immutable and the rows record real test interactions. Don't try to delete them (the `prevent_audit_log_delete` trigger blocks it).

If a test invoice or test lead got created and you want to remove them, do so via the standard admin UI flows (archive lead, hard-delete invoice via SQL if needed). Their audit_logs rows persist as a record of the test.
