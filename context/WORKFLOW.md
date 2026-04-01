# MRC Lead Management System - Session History

**Purpose:** Record of significant development sessions and decisions.
**Last Updated:** 2026-04-01

---

## Session: PDF Page Ordering Fix (April 2026)

**Problem:** PDF report pages were rendering as blank white space due to a mismatch between the Edge Function processing order and the HTML template page sequence.

**Changes:**
- Corrected page order in local PDF template (`ea6f611`)
- Added working page reorder logic (`ec7d1e6`)
- Updated Edge Function page number references to match reordered template (`74c4020`)
- Reordered EF processing to match template page sequence (`ae2c617`)
- Fixed pages still rendering as blank white space (`5930919`)

**Result:** PDF report renders all pages correctly in the expected order.

---

## Session: Security Remediation (March 2026)

**Problem:** Deep research audit identified vulnerabilities: RLS bypasses, missing input validation, hardcoded secrets, no rate limiting on public endpoints.

**Changes:**
- XSS sanitization with DOMPurify + Zod input validation on all Edge Functions (`8e4242a`)
- CSP headers added to Vercel config
- Admin-only user management + audit triggers + email rate limiting (`69aa6e8`)
- RLS policy fixes for error_logs, login_activity, suspicious_activity tables (migration `20260318000001`)
- Hardcoded password removed from seed-admin Edge Function (`2bb6ded`)
- Hardcoded Supabase URLs replaced with env vars in email templates (`e25dc2d`)
- Rate limiting added to receive-framer-lead (5/hr) and send-email (10/min) (`b1d982a`)
- npm audit vulnerabilities reduced 18 → 6, all remaining are low/info (`ff3767e`)

**Result:** Zero high/critical vulnerabilities. All tables have RLS. All public endpoints rate-limited.

---

## Session: Codebase Cleanup (Feb-March 2026)

**Problem:** Dead code, unused routes, and dropped tables cluttering the codebase.

**Changes:**
- Removed 15 dead dev/test routes, migrated to role-based routing (`7b01904`)
- Removed unused developer role + fixed 404 redirect (`9a328a6`)
- Deleted unused Logo.tsx component (`9d01a72`)
- Removed dead handleComingSoon code from AdminDashboard (`abea16d`)
- Removed unused racking_required field from subfloor data (`81c1672`)
- Database cleanup: dropped 9 unused tables (inspection_reports, invoices, sms_logs, client_booking_tokens, equipment_bookings, equipment, booking_tokens, company_settings, operating_hours, pricing_settings, offline_queue, password_reset_tokens)
- Dropped unused functions (check_booking_conflicts, has_travel_time_conflict, get_suburb_details, get_zone_by_suburb, get_pending_sync_items)

**Result:** Cleaner codebase with only active code and tables. 22 → 16 tables.

---

## Session: Environment Separation (March 2026)

**Problem:** No deployment configuration, no separation between dev and production.

**Changes:**
- Added vercel.json with security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) (`32258dc`)
- SPA rewrites configured for React Router
- Deployment documentation added

**Result:** Vercel deployment working with proper security headers.

---

## Session: E2E Testing & Bug Fixes (Feb-March 2026)

**Problem:** Systematic testing at 375px revealed multiple UI issues.

**Changes:**
- Admin mobile responsiveness fixes at 375px viewport (`cc14974`)
- Search dropdown widened, text truncation removed (`f475cd6`)
- Replaced 9-field unindexed search with GIN-indexed search_text column (`66a1401`)
- Dynamic page count in PDF viewer instead of hard-coded 9 (`2b4dff3`)
- Inspection duration corrected from 1-2 hours to max 1 hour (`611cbd6`)

**Result:** All admin and technician pages verified at 375px. Search performance improved significantly.

---

## Session: Lead Detail Improvements (Feb 2026)

**Problem:** Lead detail view missing key data, limited editing, no activity history.

**Changes:**
- Inline lead editing on detail fields (`acd28b2`)
- Real-time travel buffer calculation and info panel (`cdf0586`)
- Always-editable internal notes and reschedule button (`899eb44`)
- Rebuilt TechnicianJobDetail to match admin NewLeadView layout (`e1d58cb`)
- Estimate editor with dual-option pricing (Option 1/Option 2/Both) (`60dd1bb`)
- Treatment method selection with "Both" hybrid option (`e7931d8`)
- Seed script for 50 inspection_waiting leads with calendar bookings (`352ff5e`)

**Result:** Rich lead detail view with inline editing, travel time, and comprehensive activity logging.

---

## Session: Error Handling & Monitoring (Feb 2026)

**Problem:** No production error tracking, no offline resilience indicators.

**Changes:**
- Sentry integration for error tracking with user context and role tags (`6c6b22e`)
- ErrorBoundary component for graceful error display
- FormRecoveryToast for form data recovery after crashes
- OfflineBanner component for network status
- Service worker bypass for Supabase Storage requests (`1d5321f`)

**Result:** Production-ready error handling with Sentry monitoring and offline resilience.

---

## Session: Email & Communication (Feb 2026)

**Problem:** No email confirmation for public inspection requests, no branded templates.

**Changes:**
- Email confirmation on public inspection request submission (`c877198`)
- MRC branded email signature + Supabase Auth templates (`c252560`)
- Email composer in LeadsManagement with MRC template
- PDF attachment support via base64 encoding in send-email Edge Function

**Result:** Professional email automation at every pipeline stage with branded templates.

---

## Session: PDF Generation Pipeline (Jan-Feb 2026)

**Problem:** PDF reports needed to be generated from inspection data and emailed to customers.

**Changes:**
- Browser-rendered PDF stored for email attachment (`609cb7f`)
- SVG foreignObject approach for PDF generation (`5ffc983`)
- Treatment methods show only selected steps, not hardcoded 8 (`fe3865b`)
- PDF scope steps use indexOf replacement for nested div matching (`d396660`)

**Result:** Complete PDF pipeline: Edge Function generates HTML → browser renders → stores in Supabase Storage → attaches to email.
