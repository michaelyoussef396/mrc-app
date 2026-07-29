# Verification declaration — branch `launch/checks` (PR #72)

**Written:** 2026-07-29 · **Author:** launch-verification stream (CC session)
**Covers every commit in `git log main..HEAD`:** `91dd58f`, `396ca9c`, `0ee439e`, `87952cd` (docs), `ed75377` (docs), `0a2fbac`, `3e687f2` (docs), `3ccb58d` (docs), `b4d4cc3`, `130f1b7` (docs), `d50b117`.
Docs-only commits carry no user-visible change; every behavioural change from the code commits is declared below, ungrouped.

**Prior-verification caveat:** items marked "Already verified: yes" were checked on the pinned preview `https://mrc-system-l2w60bwsy-michaelyoussef396s-projects.vercel.app` (build of `0ee439e`, 28 Jul, DEV data) — behaviour + numbers vs DEV ground truth at 375px. Commits after `0ee439e` (`b4d4cc3` Settings, `d50b117` tab order) and everything PROD-dependent are visually unverified. Anything not explicitly cited is unverified.

---

### 1. Overdue Invoices card derives from due_date (count + dollars + cents)

- **Commit / Files:** `91dd58f` — `src/hooks/useAdminDashboardStats.ts`, `src/pages/AdminDashboard.tsx`
- **Observable at:** `/admin` (Admin Dashboard) → "Overdue Invoices" card
- **Viewport:** 375 primary (field use); 768/1920 sanity only — card layout is shared
- **Role required:** admin
- **Preconditions:** invoices past due_date in status sent/viewed/overdue. PROD has INV-2026-0001 and INV-2026-0003 (both overdue). DEV has no equivalent rows — seed one `sent` invoice with a past due_date to test there.
- **PASS looks like:** card count and total ≡ the Outstanding/overdue panel exactly (on PROD as of 29 Jul: 2 invoices, $4,987.88 — both figures with cents, `$X,XXX.XX`). Card derives from `getDaysOverdue(due_date, status) > 0`, NOT from `status = 'overdue'`.
- **FAIL signal:** card shows fewer invoices than the panel (old behaviour: 1 · $290.00 vs 2 · $4,987.88), or whole-dollar amounts with no cents.
- **Environment:** DEV-verifiable with seeded row; PROD confirmation needed against the two real invoices (those rows exist only on PROD).
- **Already verified:** yes (structurally, DEV numbers) — pinned preview above. PROD-row confirmation outstanding.
- **Risk if unverified:** admin under-sees overdue money; chases the wrong ledger.

### 2. Count alignment — sidebar Leads badge ≡ Leads-to-Assign card ≡ panel

- **Commit / Files:** `91dd58f` — `src/components/admin/AdminSidebar.tsx`, `src/hooks/useUnassignedLeads.ts`
- **Observable at:** `/admin` sidebar badge next to "Leads"; dashboard Leads-to-Assign card; unassigned panel list
- **Viewport:** 375 (badge legibility), others sanity
- **Role required:** admin
- **Preconditions:** unassigned leads in `new_lead`/`hipages_lead`, not archived. DEV has 14 (28-lead dataset, 29 Jul).
- **PASS looks like:** all three surfaces show the SAME number (14 on DEV as of 29 Jul). Query: `assigned_to IS NULL AND status IN (new_lead, hipages_lead) AND archived_at IS NULL`.
- **FAIL signal:** badge/card/panel disagree (the audited bug was 14 vs 16 vs 12 — panel's old `.or()` leaked 2 terminal-status leads).
- **Environment:** DEV-verifiable fully.
- **Already verified:** yes — pinned preview above.
- **Risk if unverified:** admin triages from contradictory counts; trust in dashboard numbers erodes at launch.

### 3. "+N more" affordance on Leads-to-Assign (list caps at 5)

- **Commit / Files:** `91dd58f` — `src/pages/AdminDashboard.tsx` (also `useUnassignedLeads` limit 10→50)
- **Observable at:** `/admin` → Leads-to-Assign card, below the 5th row
- **Viewport:** 375 — button is full-width, min-h 48px (touch target rule)
- **Role required:** admin
- **Preconditions:** >5 unassigned leads (DEV has 14 → button reads "+9 more")
- **PASS looks like:** literal "+9 more" (DEV data) in #007AFF, ≥48px tall; tap navigates to `/admin/leads`.
- **FAIL signal:** exactly 5 rows with no affordance (old behaviour silently hid 9), or a button under 48px.
- **Environment:** DEV-verifiable fully.
- **Already verified:** yes — pinned preview above (including 48px measurement).
- **Risk if unverified:** leads 6+ are invisible from the dashboard; assignment queue silently starves.

### 4. Revenue This Week = paid invoices by payment_date

- **Commit / Files:** `91dd58f` — `src/hooks/useAdminDashboardStats.ts`
- **Observable at:** `/admin` → Revenue This Week KPI
- **Viewport:** any (number only); 375 for format
- **Role required:** admin
- **Preconditions:** an invoice with `status='paid'` and `payment_date` in the current Melbourne week. Neither DEV nor PROD had one on 29 Jul → PASS currently displays `$0.00`.
- **PASS looks like:** `$0.00` today; after marking an invoice paid this week, the KPI equals that invoice's `total_amount` with cents.
- **FAIL signal:** non-zero revenue with zero paid invoices (old behaviour counted lead-status heuristics), or missing cents.
- **Environment:** DEV-verifiable by marking a seeded invoice paid.
- **Already verified:** yes ($0.00 state only) — pinned preview above. The non-zero path is unexercised.
- **Risk if unverified:** revenue over/under-reported to the owners in week one.

### 5. Today's Jobs KPI reads calendar_bookings with day-span overlap

- **Commit / Files:** `91dd58f` — `src/hooks/useAdminDashboardStats.ts`
- **Observable at:** `/admin` → Today's Jobs KPI
- **Viewport:** any
- **Role required:** admin
- **Preconditions:** a booking overlapping today (`start_datetime < end-of-today AND end_datetime > start-of-today`, status ≠ cancelled). **Critical fixture: QA Test PR57 on PROD — 7 job bookings spanning 29 Jul–4 Aug, 8:00am AEST. Expires 4 Aug.**
- **PASS looks like:** on PROD, count ≥1 every day through 4 Aug (the multi-day booking counts on EVERY overlapped day, not only its start day).
- **FAIL signal:** 0 on a day mid-span (old behaviour read the inspections table — always 0 for jobs).
- **Environment:** **PROD-only for the span proof** — QA Test PR57 exists only on PROD; DEV has no multi-day booking. Structural logic verified on preview, span-vs-real-row not.
- **Already verified:** partially — logic on pinned preview; the mid-span day-count against a real booking is NOT verified and the window closes 4 Aug.
- **Risk if unverified:** multi-day jobs vanish from the dashboard after day 1 — scheduling blind spot on real jobs.

### 6. Today's Schedule panel reads calendar_bookings (multi-day, all-day, type label, tech names)

- **Commit / Files:** `91dd58f` — `src/hooks/useTodaysSchedule.ts` (full rewrite)
- **Observable at:** `/admin` → Today's Schedule panel
- **Viewport:** 375 primary (row truncation), 768/1920 sanity
- **Role required:** admin
- **Preconditions:** same booking fixtures as #5; technician profiles for name resolution (separate `profiles` lookup — no FK embed exists).
- **PASS looks like:** QA Test PR57 rows appear with time "8:00 AM" (or "All day" when `all_day`), Type chip "Job" (event_type='job'; anything else renders "Inspection"), technician name resolved, every day through 4 Aug.
- **FAIL signal:** empty panel while Today's Jobs counts >0; "Inspection" label on a job booking; missing/UUID-ish technician names.
- **Environment:** PROD-only for the real multi-day row (same reason as #5); DEV covered structure only.
- **Already verified:** partially — pinned preview (structure, DEV data); real-span rendering NOT verified, window closes 4 Aug.
- **Risk if unverified:** schedule panel contradicts the KPI it sits beside.

### 7. Dashboard empty-state copy: "No bookings scheduled for today"

- **Commit / Files:** `91dd58f` — `src/pages/AdminDashboard.tsx` (2 occurrences)
- **Observable at:** `/admin` → Today's Schedule panel on a day with zero bookings
- **Viewport:** any
- **Role required:** admin
- **Preconditions:** no bookings overlapping today (true on DEV most days)
- **PASS looks like:** literal "No bookings scheduled for today" (was "No inspections scheduled for today" — wrong now that jobs are included).
- **FAIL signal:** old "inspections" wording.
- **Environment:** DEV-verifiable.
- **Already verified:** yes — pinned preview above.
- **Risk if unverified:** cosmetic only.

### 8. `?status=` deep links honoured on /admin/leads

- **Commit / Files:** `396ca9c` — `src/pages/LeadsManagement.tsx` (useSearchParams + `isValidStatusFilter`)
- **Observable at:** `/admin/leads?status=<value>` — reached from dashboard cards/quick actions (e.g. Needs Attention → `?status=pending_review`)
- **Viewport:** 375 (tab row scroll-to-active), others sanity
- **Role required:** admin
- **Preconditions:** none (filter works on empty results too)
- **PASS looks like:** landing on the URL pre-selects the matching pipeline tab and filters the list; an invalid value (e.g. `?status=bogus`) falls back to All.
- **FAIL signal:** list always shows All regardless of query param (pre-fix behaviour).
- **Environment:** DEV-verifiable fully.
- **Already verified:** yes — all three dashboard-sourced links on pinned preview above.
- **Risk if unverified:** dashboard cards navigate to an unfiltered list; the number clicked doesn't match the list shown.

### 9. Invoice dates stamped as Melbourne calendar day

- **Commit / Files:** `0ee439e` — `src/lib/api/invoices.ts` (`melbourneDateISO`, `defaultDueDate`, `markInvoicePaid`)
- **Observable at:** LeadDetail → invoice card: create an invoice (due_date) or mark paid (payment_date); values visible in card + DB row
- **Viewport:** n/a (data behaviour)
- **Role required:** admin
- **Preconditions:** a lead at invoice-eligible status. Decisive test window: **before 10:00/11:00am AEST**, when UTC is still yesterday.
- **PASS looks like:** a row created 29 Jul 08:00 AEST carries due_date/payment_date dated with a 29 Jul base (old code used UTC `toISOString()` → 28 Jul).
- **FAIL signal:** date one day behind Melbourne when created in the morning.
- **Environment:** DEV-verifiable (must be exercised in the morning window to prove the fix).
- **Already verified:** no — pure-logic only (build/tests); never exercised through UI.
- **Risk if unverified:** off-by-one due dates feed the penalty ladder → overdue flags fire a day early/late.

### 10. Payment terms restart at send — markInvoiceSent sets due_date = send + 14

- **Commit / Files:** `0ee439e` — `src/lib/api/invoices.ts` (`markInvoiceSent`)
- **Observable at:** LeadDetail → invoice card → "Mark as Sent"; due_date visible on card/DB
- **Viewport:** n/a
- **Role required:** admin
- **Preconditions:** a draft invoice whose creation date is days in the past (to see the due_date move)
- **PASS looks like:** after marking sent, due_date = Melbourne send-date + 14 days exactly (this is the fix that closes the INV-2026-0003 trap: 22 days in draft no longer eats the payment window).
- **FAIL signal:** due_date unchanged from creation after send. Known accepted behaviour: a manually set due_date is also overwritten (logged in TODO as a Xero-sprint revisit).
- **Environment:** DEV-verifiable.
- **Already verified:** no — pure-logic only; never exercised through UI.
- **Risk if unverified:** repeat of INV-2026-0003 — invoice born overdue, warranty-void ladder fires on day one.

### 11. check-overdue-invoices EF rewrite (Melbourne day-math, ladder milestones, idempotency, single Slack digest, dry-run)

- **Commit / Files:** `0a2fbac` — `supabase/functions/check-overdue-invoices/index.ts`
- **Observable at:** no UI. Slack channel (digest at 9:00am AEST cron), `invoices.status` flips, `invoice_overdue` activity rows, audit rows attributed to SYSTEM_USER_UUID.
- **Viewport:** n/a
- **Role required:** n/a (system); Slack workspace access to observe
- **Preconditions:** an invoice crossing a ladder boundary [1/8/15/16/29] or the 60-day escalation. **Next natural event: INV-2026-0003 hits day 29 ("Warranty VOID — Ongoing") on 4 Aug.**
- **PASS looks like:** on 4 Aug, exactly ONE Slack digest: milestone section naming INV-2026-0003 entering "Warranty VOID — Ongoing", outstanding total, dashboard-link footer, no per-invoice spam, no duplicate message.
- **FAIL signal:** two identical digests (residual <20ms double-delivery — accepted risk), per-invoice messages (old behaviour), wrong tier label, or day-count off by one vs Melbourne calendar.
- **Environment:** **PROD-only** — DEV has no Edge Functions deployed, no cron, no eligible invoices. Dry-run against PROD already proven write-free (29 Jul, byte-identical pre/post DB state).
- **Already verified:** partially — deployed to PROD as v9 (29 Jul); dry-run output verified; first REAL run with a milestone event is 4 Aug and unverified by definition until it fires.
- **Risk if unverified:** wrong warranty-void messaging to the business on a real customer invoice. ⚠️ **Merge-ordering hazard: main/production still hold the OLD index.ts — any EF deploy from a non-`launch/checks` checkout before merge silently reverts v9.**

### 12. Settings page: "Log out from ALL devices" option removed

- **Commit / Files:** `b4d4cc3` — `src/pages/Settings.tsx` (−52 lines: button row, handler, confirm dialog, state, unused imports)
- **Observable at:** `/settings` (admin account) → Danger Zone
- **Viewport:** 375 — check spacing where the row was
- **Role required:** admin (the removed row was admin-gated; technicians never saw it)
- **Preconditions:** none
- **PASS looks like:** Danger Zone shows exactly two rows — Sign Out, then Delete Account — with a single divider between them; no gap or double border.
- **FAIL signal:** orange "Log out from ALL devices" row still present, or a visible spacing artifact between the two remaining rows.
- **Environment:** DEV-verifiable.
- **Already verified:** no — post-preview commit; never opened in a browser. (Deliberate scope note: the Profile page keeps its own "Log Out All Devices" — one place instead of two.)
- **Risk if unverified:** low — worst case is a cosmetic gap; the underlying auth capability is untouched (`AuthContext.forceLogoutAllDevices` still consumed by Profile.tsx).

### 13. Leads pipeline tab order matches canonical ALL_STATUSES

- **Commit / Files:** `d50b117` — `src/pages/LeadsManagement.tsx` (statusOptions lines 74/75 swapped)
- **Observable at:** `/admin/leads` → horizontal pipeline tab row
- **Viewport:** 375 — the row is `overflow-x-auto`; confirm it still scrolls with no clipping
- **Role required:** admin
- **Preconditions:** none
- **PASS looks like:** tab sequence reads … Job Scheduled → **Job Completed → Pending Review** → Report Sent … (pending_review directly after job_completed, matching ALL_STATUSES).
- **FAIL signal:** Pending Review before Job Completed (old order), or tab row clipped/not scrolling at 375px.
- **Environment:** DEV-verifiable.
- **Already verified:** no — post-preview commit; never opened in a browser. Order-only change inside an unchanged scroll container.
- **Risk if unverified:** low — cosmetic ordering; underlying filtering is membership-based and unaffected.

---

## Files I touched

`src/hooks/useAdminDashboardStats.ts` · `src/hooks/useTodaysSchedule.ts` · `src/hooks/useUnassignedLeads.ts` · `src/components/admin/AdminSidebar.tsx` · `src/pages/AdminDashboard.tsx` · `src/pages/LeadsManagement.tsx` · `src/pages/Settings.tsx` · `src/lib/api/invoices.ts` · `supabase/functions/check-overdue-invoices/index.ts` · `docs/TODO.md` (docs commits only)

## Could not verify and why

- **#5/#6 multi-day span against a real booking** — QA Test PR57 exists only on PROD, and PROD serves pre-fix code until PR #72 merges. Window closes 4 Aug (booking expires).
- **#11 first real digest** — requires a real milestone event; next is 4 Aug (INV-2026-0003 → day 29). Cannot be simulated without PROD writes (prohibited).
- **Team Workload panel (adjacent, not changed by me)** — unverifiable on DEV: `manage-users` EF not deployed there → "No technicians found" on any preview. PROD-only check.
- **#9/#10 invoice date behaviour through UI** — no browser pass this stream (declared-only per instruction); #9 additionally needs a before-10am-AEST test window to be probative.
- **#12/#13** — commits landed after the pinned-preview pass; no browser opened since (prohibited this stream).

## Ordering constraints

1. **Merge PR #72 before 4 Aug** — or the QA Test PR57 span-confirm window closes AND the first real digest fires against pre-fix production code paths (the EF itself is already v9, but the dashboard/invoice code it feeds is not merged).
2. **No EF deploy of `check-overdue-invoices` from ANY checkout except `launch/checks` until merge** — main and production hold the old index.ts; a deploy silently reverts Melbourne day-math, the idempotency guard, and the digest.
3. **INV-2026-0003 data correction (Michael, Studio)** must be two fields together — due_date → 2026-08-11 AND status 'overdue' → 'sent' — or the row self-contradicts (future due date, overdue status). If done BEFORE 4 Aug, the day-29 digest expectation in #11 no longer fires that day — sequence the correction and the digest-watch deliberately.
4. `docs/TODO.md` conflict on merge is guaranteed-ish (both streams append) — resolve by keeping both sections; it's append-only by convention.
5. `ALL_STATUSES` is frozen (LeadDetail.tsx:500-543 index-threshold hazard, logged in TODO 29 Jul) — nothing in this branch reorders it; keep it that way through the merge.
