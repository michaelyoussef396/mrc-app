# Pre-Handover Audit — MRC Lead Management System

**Date:** 20/04/2026
**Auditor:** Claude Code
**Function:** receive-framer-lead v19, all Edge Functions deployed
**Method:** Automated codebase scan + DB integrity check + Edge Function log review

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 5 |
| LOW | 12 |

No blockers. 5 high-priority items to address soon. 12 nice-to-fix items.

---

## HIGH Priority (fix soon)

### H1. No double-payment prevention on invoices
**File:** `src/lib/api/invoices.ts:285` — `markInvoicePaid()`
**Problem:** No check if invoice is already `'paid'` before updating. Admin could accidentally mark paid twice, overwriting payment date/method.
**Fix:** Add early return if status is already `'paid'`.
**Effort:** S

### H2. In-memory rate limiting resets on cold start
**Files:** `supabase/functions/send-email/index.ts:11-25`, `supabase/functions/receive-framer-lead/index.ts:11-27`
**Problem:** Rate limiter uses in-memory `Map` that resets when Edge Function instance restarts (~5 min idle). Multiple concurrent instances don't share state.
**Fix:** For send-email, use the existing `email_logs` table to check recent sends. For receive-framer-lead, use `webhook_submissions` table. Both already have timestamps.
**Effort:** M

### H3. `generate_invoice_number` function has mutable search_path
**Location:** Database function `public.generate_invoice_number`
**Problem:** Supabase linter warns search_path is not set — potential privilege escalation vector.
**Fix:** `ALTER FUNCTION public.generate_invoice_number() SET search_path = public;`
**Effort:** S

### H4. Orphaned Edge Function: `create-user-admin`
**Location:** Deployed Edge Function (v8, ACTIVE)
**Problem:** No codebase references. Accepts POST without strong auth. Could be a backdoor if discovered.
**Fix:** Delete via Supabase Dashboard → Edge Functions, or deploy a disabled version that returns 410.
**Effort:** S

### H5. No timeout handling in PDF generation Edge Functions
**Files:** `supabase/functions/generate-inspection-pdf/index.ts`, `supabase/functions/generate-job-report-pdf/index.ts`
**Problem:** Large reports with many photos can exceed Edge Function timeout (~30s). No timeout race or progress tracking.
**Fix:** Add `Promise.race([pdfPromise, timeoutPromise])` with 25s limit. Return partial result or error.
**Effort:** M

---

## LOW Priority (nice to fix)

### L1. `webhook_submissions` INSERT policy too permissive
**Location:** RLS policy on `webhook_submissions`
**Problem:** `WITH CHECK (true)` allows any authenticated user to insert. Intended for service-role-only Edge Function use.
**Impact:** Low — table is only written by Edge Functions using service role key. No client-side writes.
**Fix:** Change to `WITH CHECK (auth.role() = 'service_role')` or keep as-is since Edge Functions bypass RLS anyway.
**Effort:** S

### L2. Public storage buckets allow file listing
**Location:** 5 buckets: `company-assets`, `inspection-reports`, `pdf-assets`, `pdf-templates`, `profile-photos`
**Problem:** SELECT policies allow enumeration of all files. Users could discover file paths.
**Impact:** Low — files are publicly accessible by URL anyway (public buckets).
**Fix:** Remove broad SELECT policies if listing isn't needed by the app.
**Effort:** S

### L3. 22+ unindexed foreign key columns
**Location:** Various tables (error_logs.user_id, invoices.created_by, job_completion_pdf_versions.job_completion_id, etc.)
**Problem:** JOINs on these columns do sequential scans.
**Impact:** Low now (small dataset), will matter at scale.
**Fix:** Create indexes in a migration. Prioritise: invoices.lead_id, inspections.lead_id, photos.inspection_id.
**Effort:** M

### L4. `.select('*')` used in 50+ Supabase queries
**Location:** Throughout `src/lib/api/`, `src/hooks/`, `src/services/`
**Problem:** Fetches all columns when only a few are needed. Wastes bandwidth.
**Impact:** Low — dataset is small. Matters at scale.
**Fix:** Audit high-traffic queries (LeadDetail, InspectionForm) and specify columns.
**Effort:** L

### L5. No max photo count per inspection
**File:** `src/lib/utils/photoUpload.ts`
**Problem:** No limit on total photos per inspection. A technician could upload thousands.
**Fix:** Add count check before upload (e.g., max 200 per inspection).
**Effort:** S

### L6. Photos not deleted when lead archived
**Problem:** Archiving a lead soft-deletes it but leaves photos in storage. Storage grows with orphaned files.
**Fix:** Add cleanup job or cascade trigger.
**Effort:** M

### L7. No invoice amount validation (zero/negative)
**File:** `src/lib/api/invoices.ts:87-121` — `calculateInvoiceTotals()`
**Problem:** Doesn't reject zero or negative line item amounts.
**Fix:** Add `if (subtotal <= 0)` guard.
**Effort:** S

### L8. No Resend bounce/complaint webhook
**Problem:** Bounced emails aren't tracked. No unsubscribe handling.
**Fix:** Add Resend webhook endpoint + update email_logs on bounce events.
**Effort:** M

### L9. No pagination on photo loads
**File:** `src/lib/utils/photoUpload.ts:291`
**Problem:** `loadInspectionPhotos()` fetches all photos without limit.
**Fix:** Add `.limit(100)` with lazy loading.
**Effort:** S

### L10. `dangerouslySetInnerHTML` in chart component
**File:** `src/components/ui/chart.tsx:70`
**Problem:** Injects CSS via innerHTML. Low risk (values from config objects, not user input).
**Fix:** Use CSS custom properties instead.
**Effort:** S

### L11. SENTRY_AUTH_TOKEN not set in Vercel
**Problem:** Source maps not uploaded — Sentry shows minified stack traces.
**Fix:** Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Vercel env vars.
**Effort:** S

### L12. `create-user-admin` and `seed-admin` — orphaned functions
**Problem:** `seed-admin` returns 403 (disabled). `create-user-admin` has no codebase references.
**Fix:** Delete both from Supabase Dashboard.
**Effort:** S

---

## Verified CLEAN Areas

| Area | Status | Notes |
|---|---|---|
| Route coverage | PASS | All 29 routes resolve to existing components |
| Dead onClick handlers | PASS | No empty `() => {}` handlers found |
| Dead links / navigate() | PASS | All targets exist in App.tsx |
| Form validation | PASS | All forms have Zod or inline validation |
| Destructive action confirmations | PASS | All archive/delete use AlertDialog |
| Loading states | PASS | All async pages have loading spinners |
| Error states | PASS | All pages handle query errors |
| Empty states | PASS | Pipeline, jobs, technicians all show empty copy |
| RLS coverage | PASS | 27/27 public tables have RLS enabled |
| Foreign key integrity | PASS | 27 constraints valid, no orphans |
| SQL injection | PASS | All queries use parameterized Supabase client |
| RBAC (RoleProtectedRoute) | PASS | All admin routes wrapped, no bypasses |
| XSS protection | PASS | DOMPurify in ReportPreviewHTML, stripHtml in webhook |
| Auth templates | PASS | All 6 Supabase auth templates updated |
| Cron jobs | PASS | 2 active (send-inspection-reminder hourly, check-overdue-invoices daily 9am AEST) |
| Edge Function health | PASS | <2% error rate, no 500s in recent logs |
| Webhook zero-loss pipeline | PASS | 100/100 stress test, v18 deployed |
| Date formatting | PASS | DD/MM/YYYY via central dateUtils.ts |
| Email routing | PASS | All through mrcsystem.com |

---

## Pre-Handover Checklist

- [x] Full pipeline: new_lead → ... → finished (no dead ends)
- [x] All 16 Edge Functions deployed and active
- [x] Cron jobs running (overdue invoices, inspection reminders)
- [x] Webhook bulletproofed (100/100 stress test)
- [x] Email routing through mrcsystem.com
- [x] DD/MM/YYYY date formatting standardised
- [x] Admin Dashboard: 7 KPI cards (including Failed Webhooks)
- [x] Playwright E2E suite: 51 tests (23 pass without fixtures)
- [x] Manual testing checklist: 13 sections, ~200 checkboxes
- [x] Profile photo upload working
- [x] Schedule page fixed (duplicate import crash)
- [ ] Set SENTRY_AUTH_TOKEN in Vercel (L11)
- [ ] Delete orphaned Edge Functions (H4, L12)
- [ ] Add markInvoicePaid idempotency guard (H1)
- [ ] Fix generate_invoice_number search_path (H3)
- [ ] Create technician accounts for Glen + Clayton
- [ ] Walkthrough session with Glen + Clayton
