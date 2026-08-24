# Notifications Schema Reconciliation — PROD Drift, Idempotency Verdict, user_id Decision Input

**Date:** 2026-08-21
**Scope:** Follow-up to `docs/NOTIFICATIONS_INVESTIGATION.md` (2026-08-20). Read-only against PROD; draft-only in the repo. Nothing was applied, deployed, or altered — the one migration in this wave is a **draft file** at `supabase/migrations/20260821000000_reconcile_notifications_schema_drift.sql`, human-applied only.
**Method:** Live PROD evidence gathered inline (see access record below), then a 6-agent workflow (supabase-specialist ×2 for Tasks 1–2, planner-researcher for Task 3, plus one adversarial verifier per task). All three verifiers passed their targets; their corrections are folded in below.

### How PROD was read (access record)

Target: **PROD `ecyivrxjpsmjmexqatym`**, read-only, as authorized in the brief. What worked and what didn't:

- ❌ Supabase MCP: `get_project_url` resolves (PROD) but every authenticated call returns *Unauthorized* — the MCP access token is still dead, as memory recorded.
- ✅ **Authed Supabase CLI** (token in the OS keychain, used by the CLI itself): `migration list --linked` (full remote history), `gen types typescript --linked` (fresh live column snapshot), `migration fetch --linked` into an **isolated scratchpad workdir** (all 114 remote-recorded migrations with their SQL — nothing written into the repo).
- ❌ `db dump` and raw SQL via Management API + keychain token: denied by the session's permission classifier. Not retried or worked around; the gaps are closed instead by the **Studio verification snippet** below (for Michael to run).
- Consequence: **columns, nullability, FK relationships, and the full migration history are live-attested tonight**; exact defaults, the FK delete rule, CHECK constraints, current index definitions, triggers, RLS policy text, and row count remain **repo/remote-history-attested only** — each is individually flagged below.

---

## Task 1 — PROD vs repo: the exact drift on `public.notifications`

### Headline finding: the drift is unrecorded Studio SQL, and the histories themselves have forked

1. The **remote migration history does not contain the six-column drift either.** The remote twin of the repo's CREATE TABLE (`20251029103509`, applied 3 seconds before the repo file's version id `20251029103512`) defines the same **10-column** table with `read BOOLEAN` — byte-identical mod a trailing `;`. The six changed/added columns appear in **no migration, local or remote**: they were applied via raw Studio SQL that was never saved as a migration. Bounding evidence: by **2026-02-17T07:12:19Z**, remote-only migration `20260217071219` was already dropping `idx_notifications_read` as "duplicates `idx_notifications_is_read`" — so the rename and additions predate that timestamp.
2. **The investigation's six-column list is CONFIRMED, not corrected**: `read → is_read` (rename) plus five additions — `lead_id`, `metadata`, `related_entity_id`, `related_entity_type`, `read_at`.
3. **Local and remote migration histories are structurally divergent** beyond this table (`scratchpad/prod_migration_list.txt`, captured this session): dozens of remote-only version ids (dashboard-applied), dozens of local-only ids, and same-change "twins" recorded under different ids. Directly notifications-relevant divergences:
   - CREATE-table twin: local `20251029103512` ↔ remote `20251029103509` (identical content).
   - INSERT-policy fix twin: local `20260217081500_fix_rls_always_true.sql` ↔ remote `20260217075032_fix_rls_always_true.sql` (73 lines each, byte-identical mod trailing `;`, applied ~25 min apart on the same day) — so the current INSERT policy **is** live despite the local file's version id being absent from the remote record.
   - Five remote-only migrations have **no local file at all** (`20260217071111/071135/071154/071219/071241`); only `071219` touches notifications (the `idx_notifications_read` drop).
   - `20260217074203/074235/074249` match on both sides under the same ids (comment-text-only diffs) — the RLS-initplan and index-prune fixes are confirmed applied.

### Column diff (live snapshot: fresh `gen types --linked`, 2026-08-20 late evening)

| Column | Repo (only CREATE TABLE, `20251029103512:10-21`) | Live PROD (tonight) | Drift |
|---|---|---|---|
| id, user_id, type, title, message, action_url, priority, created_at, updated_at | 9 columns as originally defined; `user_id/type/title/message` NOT NULL | Present; nullability matches on all 9 | None detectable. Caveat: `VARCHAR(n)` vs `TEXT` widths and whether `DEFAULT 'normal'` / `DEFAULT NOW()` survive are **not** exposed by gen types. |
| `read` | `read BOOLEAN DEFAULT FALSE` (`:18`) | **Gone** | Renamed out-of-band. |
| `is_read` | — | `boolean`, nullable | **Unrecorded rename** of `read` (assumption: rename, not drop+add). |
| `lead_id` | — | `uuid`, nullable, **FK `notifications_lead_id_fkey` → leads.id** (the table's only FK; delete rule not exposed by gen types) | **Unrecorded addition.** |
| `metadata` | — | `Json`, nullable (json vs jsonb indistinguishable in types; jsonb assumed per project convention) | **Unrecorded addition.** |
| `related_entity_id` / `related_entity_type` | — | both nullable `string` (UUID/TEXT/VARCHAR indistinguishable in types) | **Unrecorded additions.** |
| `read_at` | — | nullable `string` (TIMESTAMPTZ inferred from table pattern) | **Unrecorded addition.** |

### Constraints, indexes, RLS, triggers

| Property | Repo end-state | Live PROD | Confidence |
|---|---|---|---|
| PK `id` | `20251029103512:11` | present | Live-attested (types) |
| FK `notifications_lead_id_fkey` | absent from repo | exists (name + target attested); **ON DELETE rule unknown** | Partially live-attested |
| CHECK constraints on `type`/`priority` | none defined | **unknown** — no evidence either way | Unverified |
| `idx_notifications_user_id` | created `:79`, never dropped anywhere | presumed present | Repo-attested |
| `idx_notifications_read` | created `:80`, **never dropped by any local migration** | **gone** — dropped by remote-only `20260217071219:27-28` | Remote-history-attested |
| `idx_notifications_type` / `idx_notifications_created_at` | dropped by `20260217074249:62-64` (they pre-existed via the same unrecorded wave) | gone (migration confirmed applied both sides) | Remote-history-attested |
| `idx_notifications_is_read` | never created by any recorded migration | existed by 2026-02-17 (named in the remote drop's comment); **current definition unknown** | Name-only attested |
| `idx_notifications_user_unread` | only ever *referenced* in a comment (`20260217074249:62`) | existence implied, **never captured anywhere** | Comment-only attested |
| RLS enablement | `20251029103512:35`, never disabled | presumed enabled | Repo-attested |
| SELECT/UPDATE/DELETE policies (`user_id = auth.uid()`) | `20260217074235:106-120` | confirmed applied on remote under the same version id | Strong (same-id parity) |
| INSERT policy (`TO authenticated WITH CHECK auth.uid() IS NOT NULL`) | `20260217081500:55-59` | live via byte-identical remote twin `20260217075032` | Strong (twin parity) |
| Trigger `update_notifications_updated_at` | `20251029103512:83-86`, never dropped | presumed present | Repo-attested |
| Row count | — | docs/TODO.md:1950-1951 claims 0 all-time | **Unverified live** |

### The draft reconciliation migration

`supabase/migrations/20260821000000_reconcile_notifications_schema_drift.sql` — **draft, not applied.** Adversarially verified: guaranteed schema no-op on current PROD, brings a fresh repo-built DB to the live 15-column shape, idempotent on re-run, zero destructive statements. It contains, in order: (1) a guarded `read → is_read` rename (fires only when `read` exists and `is_read` doesn't); (2) `ADD COLUMN IF NOT EXISTS` for the five additions; (3) the `lead_id` FK guarded by exact constraint name (delete rule `SET NULL` is a **flagged judgment call** — never overwrites PROD's real rule because the guard skips when the name exists); (4) `DROP INDEX IF EXISTS idx_notifications_read` to mirror the remote-only drop. Deliberately **excluded**: recreations of `idx_notifications_is_read` / `idx_notifications_user_unread` (definitions were never captured — a fresh build has no is_read index until they're captured from PROD and added in a follow-up), and any defaults/CHECKs/type-widths that evidence can't attest.

### Drift not safely expressible as a forward migration (stated, not guessed)

1. **Exact live defaults** for `is_read` (was `DEFAULT FALSE` pre-rename; renames preserve defaults, but unconfirmed) and for all five added columns (gen types never exposes defaults). The draft adds them default-less; a fresh build could diverge silently if live has e.g. `metadata DEFAULT '{}'::jsonb`.
2. **Exact pg types** of `related_entity_id`/`related_entity_type` (UUID/TEXT inferred) and `metadata` (jsonb assumed) — indistinguishable in generated types.
3. Whether `type`/`title`/`priority` are still `VARCHAR(50/255/20)` or were silently widened to TEXT — indistinguishable; left untouched (altering blind risks a destructive change).
4. **`notifications_lead_id_fkey` ON DELETE rule** — the draft's `SET NULL` is for fresh builds only.
5. **Definitions of `idx_notifications_is_read` / `idx_notifications_user_unread`** (columns, uniqueness, partial WHERE) — names attested, DDL never captured; deliberately omitted.
6. **Any CHECK constraints** — presence itself is unknown, not just definitions.
7. **Live RLS policy text and trigger state** — inferred from applied-migration parity (strong for policies via same-id/twin matches), not from a live catalog dump.
8. **Row count** (TODO.md claim) and **any further invisible-to-gen-types change** (COMMENTs, extra UNIQUEs, column order).

### Read-only verification snippet for Michael (Supabase Studio, PROD)

Running this closes every "unverified" cell above; SELECT-only.

```sql
-- 1) Columns: types, lengths, nullability, defaults
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2) All constraints incl. the lead_id FK's ON DELETE rule
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition,
  CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS fk_on_delete
FROM pg_constraint con WHERE con.conrelid = 'public.notifications'::regclass;

-- 3) All indexes with full definitions (closes the is_read / user_unread gap)
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'notifications' ORDER BY indexname;

-- 4) Triggers
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid = 'public.notifications'::regclass AND NOT tgisinternal;

-- 5) RLS policies
SELECT polname,
  CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END AS command,
  polroles::regrole[] AS roles,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy WHERE polrelid = 'public.notifications'::regclass;

-- 6) RLS enablement
SELECT relrowsecurity, relforcerowsecurity FROM pg_class
WHERE oid = 'public.notifications'::regclass;

-- 7) Comments (out-of-band documentation, if any)
SELECT c.column_name,
  pg_catalog.col_description('public.notifications'::regclass, c.ordinal_position) AS column_comment
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'notifications'
ORDER BY c.ordinal_position;
SELECT pg_catalog.obj_description('public.notifications'::regclass, 'pg_class') AS table_comment;

-- 8) Row count (checks the "0 rows all-time" claim)
SELECT count(*) AS row_count FROM public.notifications;
```

---

## Task 2 — activities-as-idempotency-store: mechanism confirmed, and the answer is **NO, no separate dedup mechanism is required**

*(GitNexus note: the reindex itself succeeded — `node .gitnexus/run.cjs analyze`, exit 0, 17.3s, 10,720 nodes / 300 flows — but the MCP query layer could not read the fresh index: it only exposes a 2026-05-20 snapshot of a different path plus a 2026-07-30 index whose storage version (42) outruns the running server's reader (40). Every claim below was therefore established by direct file reads + bash grep + git history, per the brief's cross-verification requirement; GitNexus contributed no usable evidence and no conflicting evidence.)*

### The mechanism — three independent guards, and one thing that is *not* a guard

All in `supabase/functions/check-overdue-invoices/index.ts`:

1. **`sent → overdue` transition + its `invoice_overdue` activity row** — arbitrated by the RPC **`audited_mark_invoice_overdue`** (called `:353-356`), *not* by activities. Per `supabase/migrations/20260817120000_invoice_overdue_compare_and_set.sql` (function body `:71-102`): `UPDATE invoices SET status='overdue' … WHERE id=$1 AND status='sent'; GET DIAGNOSTICS ROW_COUNT; RETURN v_updated=1` — **`RETURNS BOOLEAN`**. The EF rejects a non-boolean result (`:367-373`, guarding against a stale deployed RPC), treats `false` as "another invocation won" (`:378-382`), and only a `true` reaches the activities INSERT (`:384-396`). This is a genuine DB-level compare-and-set on the `invoices` row.
2. **`invoice_milestone` activity row** — arbitrated by an **`app_settings` PRIMARY-KEY claim** (`mayRecordMilestone`, `:289-309`, invoked `:404-419`): `INSERT INTO app_settings (key, …) VALUES ('milestone:invoice-overdue:{invoice}:{melDay}', …)`; success ⇒ may write, error `23505` ⇒ already claimed. `app_settings` DDL: `supabase/migrations/20251111000012_fix_inspection_number_race.sql:30-37` — **`key TEXT PRIMARY KEY`**, which is what makes every claim a true unique-index-enforced compare-and-set. An unconsumed claim (write failed / null lead_id) is released (`:445-453`); dry runs never take the claim (`:292-300`, `:445` gate).
3. **Slack digest post** — same `app_settings` mechanism, key `'digest:invoice-overdue:{melDay}'` (`claimTodaysDigest`, `:480-488`); released on failed post (`:530-540`) so retries aren't blocked.

**The activities read is explicitly not a concurrency guard.** The `doneToday` set (`:259-283`) — `SELECT … FROM activities WHERE activity_type='invoice_overdue' AND created_at >= now()-26h`, keyed as `{type}:{lead_id}:{regex-extracted INV-number from description}` — is, per the code's own comment (`:248-257`), a *"cheap early-out only — NOT a concurrency guard"*. It is an **application-level check-then-write over free-text with no unique constraint behind it**: cross-verified by grep that **no UNIQUE constraint or unique index exists on `activities` anywhere** — not in the local migrations, not in any of the 114 fetched remote-history migrations. It short-circuits an already-committed earlier run (e.g. a same-day manual re-invocation); it cannot arbitrate a race.

### Race safety — safe today; provably unsafe before 2026-08-17

- The 8-Aug DEV reproduction (docs/TODO.md:1763-1780) produced duplicate `invoice_overdue` rows 193ms apart and duplicate `invoice_milestone` rows 191ms apart — the same signature as the 28-Jul PROD incident (TODO.md:785, 35ms). Root cause: the old RPC `RETURNS void`, so both invocations saw `(data:null, error:null)` and both fell through to the activities INSERT; `doneToday` couldn't help (both saw it empty).
- The 17-Aug fix (migration `20260817120000` + commit `da3ec5c`) made the RPC boolean-returning and moved the milestone path onto the `app_settings` PK claim. The digest claim (structurally identical) is **DEV-verified at 0.0ms concurrent gap** — "Fix 3 ✅ PASS: one `slackPosted:true`, one `digestSuppressed`, one `app_settings` key, one Slack message" (docs/TODO.md:1684). The reminder fix is likewise DEV-verified (Fix 1 ✅ PASS, TODO.md:1683). No equivalent zero-gap test is recorded for the 17-Aug invoice-boolean/milestone-claim change specifically (it postdates the 8-Aug test session), but the mechanism is structurally identical to the verified digest claim.
- **PROD liveness**: the migration is confirmed applied to PROD via commit `39a9527` — `src/integrations/supabase/types.ts:2178-2181` now reads `Returns: boolean`, a value only obtainable by regenerating types against the post-migration PROD catalog (plus TODO.md:1864-1872, "PROD, 2026-08-17, post-apply"). **Caveat:** no local artifact proves the *paired EF deploy* to PROD happened after 17 Aug — migration-first order is safe, but until the EF deploy is confirmed the old EF's duplicate-activities behavior could still be live. Worth one glance at the PROD EF version in the dashboard.

### The answer

| Write path | Guarded by | Separate dedup needed? |
|---|---|---|
| `send-inspection-reminder` — reminder claim | Atomic compare-and-set UPDATE on `calendar_bookings`: `.update({reminder_sent:true,…}).eq('id',X).eq('reminder_sent',false)` (`index.ts:333-338`) — one SQL statement, loser matches zero rows (`:348-352`). Plus a Resend `Idempotency-Key` `inspection-reminder/{booking.id}` (`:396`) as sink-side defense. Transient-failure claims are released via a second CAS (`:460-464`). **Uses the activities table nowhere** (grep: zero matches). | **No.** Race-safe per-row by construction; DEV-verified at 0.0ms gap. |
| `check-overdue-invoices` — invoices `sent→overdue` + `invoice_overdue` activity | `audited_mark_invoice_overdue` boolean compare-and-set (17 Aug) | **No** (post-17-Aug code; confirm the EF deploy). |
| `check-overdue-invoices` — `invoice_milestone` activity | `app_settings` PK claim per invoice per Melbourne day | **No.** |
| `check-overdue-invoices` — Slack digest | `app_settings` PK claim per Melbourne day | **No** for double-fire. One qualified residual, *not* a concurrency race: if `postSlack` delivers but reports a false-negative failure, the claim is released and a later invocation can post a second digest (`:530-540`; TODO.md:1686 marks release-on-failure UNTESTED). Requires a failure + false negative, and is the deliberately chosen release policy. |

**Bottom line: the existing machinery already solves the pg_net double-fire problem for both Edge Functions. The activities-based `doneToday` guard neither provides that safety nor needs to — the real arbitrators (RPC boolean, `app_settings` PK claims, `calendar_bookings` CAS) own every write.** No new dedup mechanism is required.

**Documentation staleness found while verifying (flagged, not fixed):** docs/TODO.md:787 (29-Jul "advisory-lock needed, declined" note, superseded by Fix 3 but never struck) and docs/TODO.md:1793-1794 ("WRITTEN 2026-08-17, NOT YET APPLIED", contradicted by :1819/:1864 and the `39a9527` types regen).

---

## Task 3 — `notifications.user_id`: decision input for Glen and Clayton (no recommendation)

Two paths for carrying broadcast-shaped events in a table whose `user_id` is `UUID NOT NULL`:
**Path A** — keep `user_id NOT NULL`; the writer fans out one row per recipient.
**Path B** — make `user_id` nullable; a NULL (or a new scope column) means broadcast, resolved at read time.

### Facts true under both paths

- **Zero writers exist** (all 7 code refs are reads/updates/deletes); both paths are net-new writer code at every site. Only 3 notification consumers are mounted anywhere (`useUnreadCount`, `useMarkAllAsRead` in AdminHeader; the timeline leg); the list hook with the realtime subscription has zero mounts.
- **No event payload carries a user id** — but recipient UUIDs exist in *enclosing scope* at several writer sites (`technicianId` in `bookingService.ts:91→:130`; `assignedTo`/`oldTechId`/`newTechId` in `BookJobSheet.tsx:428,444,515-516`; `lead.assigned_to` resolved in `LeadDetail.tsx:346-358`).
- **Non-auth origins already have bypass machinery** (service-role clients in `receive-framer-lead/index.ts:523-524` and `check-overdue-invoices/index.ts:196-200`; SECURITY DEFINER email trigger `20260813115000:37-42`). Only frontend writers depend on the INSERT policy at all.
- **The INSERT policy (`20260217081500:56-59`) never references `user_id`** — and *both paths equally depend on it staying that way for frontend writers*: tightening it to `WITH CHECK (user_id = auth.uid())` breaks A's fan-out (addresses other users) and breaks B's broadcasts (NULL fails the check) identically.
- `SYSTEM_USER_UUID` is an actor sentinel with no auth account (docs/system-user-uuid.md:10) — unusable as an addressee under a `user_id = auth.uid()` SELECT policy.
- The `custom`-event payloads have **no title** (`notifications.ts:481-516`; email trigger `20260813115000:95-99`) while `title` is NOT NULL — synthesis needed either way. Interface drift (`action_url`/`priority` invisible to readers) and the `is_read` nullability trap apply either way. `type`/`priority` are free text — no enum work either way.
- **Role-lookup surface is partially unattested**: the two-hop `roles → user_roles` pattern exists (`useTechnicians.ts:92-114`; `calculate-travel-time/index.ts:519-535`), but **no repo migration creates `public.roles` or any RLS on it** (repo defines `user_roles` + an `app_role` enum instead — the live role model drifted too: live `user_roles.role_id` FK, live helpers `has_role(_role_name,_user_id)`/`is_admin()`, live enum `admin|technician|manager`). Repo-attested `user_roles` SELECT: own-row for non-admins (`20260217074235:197-200`) + admins-see-all via `is_admin` (`20251028135212:168-171`). Note: profiles SELECT is **not** own-row-only — a second permissive policy `Users can view profiles` `USING (auth.uid() = id OR is_admin(auth.uid()))` exists (`20251029025609:24-32`) and is never dropped, so an admin session can read all profiles. Net: **an admin session can resolve the admin list; a technician session can resolve nobody but itself** (and `manage-users` 403s non-admins, `index.ts:169-174`).
- The merged timeline queries notifications **with no user_id filter** (`useActivityTimeline.ts:103-107`) — RLS alone decides what all four consumer surfaces show. It selects only id/type/title/message/created_at/lead_id (+ the leads join) — never `is_read`/`action_url`/`priority`.

### Path comparison

| Axis | Path A — fan-out (keep NOT NULL) | Path B — nullable user_id / broadcast |
|---|---|---|
| **RLS: SELECT/UPDATE/DELETE** | Work **unmodified** — every row has one owner; per-user isolation intact by construction. | **All three break as-is**: `user_id = auth.uid()` returns NULL rows to nobody (including the intended audience), and no user session can mark-read or delete a broadcast row. SELECT needs a rewrite (`… OR user_id IS NULL`, or a scope predicate via `has_role`); each disjunct **widens what every authenticated session reads** on a table whose INSERT policy lets any authenticated session write. Widening UPDATE means one user's mark-as-read mutates the row every reader shares. |
| **RLS: INSERT** | Works as-is (policy doesn't bind user_id). EF/service-role writes bypass RLS wholesale — recipient lists are trusted entirely from the writer's role lookup. | Works as-is (accepts NULL). Same service-role facts. |
| **Read state** | `is_read`/`read_at` are per-row = per-recipient. Per-alert read state expressible with existing (unmounted) hooks. | **Structurally unavailable on shared rows**: one scalar `is_read` per row — one reader's mark marks it for everyone; `read_at` records one timestamp for a set of people. Per-viewer unread needs a **separate mechanism**: (a) a read-receipts table keyed `(notification_id, user_id)` — own RLS/index/audit classification, unread becomes an anti-join, `useUnreadCount`/`useMarkAllAsRead` both rewritten, row multiplication reappears on the read side (payload-free); or (b) a per-user watermark as TechnicianAlerts already does — O(1) storage, but cannot express "read item 3 but not item 1". Either way the table carries two read-state regimes at once (`is_read` still meaningful for any addressed rows). |
| **AdminHeader badge** | `useUnreadCount`, `useMarkAllAsRead`, and the realtime filter (`user_id=eq.{id}`) all work **unchanged** and would start counting for the first time. Badge and dropdown list converge for notification rows (both RLS-scoped to my copies). | `useUnreadCount` breaks **independently of RLS**: `.eq('user_id', me)` excludes NULL rows at the query layer even after the policy rewrite; same for `useMarkAllAsRead` and the realtime filter (`eq` never matches NULL — no client gets a realtime event for a broadcast insert; the 30s poll is the fallback). The dropdown *list* needs no change once SELECT admits NULL rows — so badge and list diverge for a new reason: list shows broadcasts, unmodified badge never counts them, and "Mark all as read" (rendered only when the count > 0) never appears for them. |
| **TechnicianAlerts** (currently reads `activities`, touches notifications nowhere) | If repointed: writer addresses the technician's UUID (in scope at the booking writers); query becomes `.eq('user_id', me)` — matches existing per-user policy, no RLS change. Per-row read state **replaces** the watermark; the "cancelled booking keeps feeding the feed" behavior disappears (audience decided at write time). | If repointed: the `bookings→leadIds` two-step *pattern* transfers (`.in('lead_id', leadIds)` against notifications instead of activities) — but note it currently routes **activities** rows; delivery of broadcasts still requires the reader repoint **plus** the SELECT rewrite. Permanent-scope behavior persists (read-time scoping). Watermark read-state carries over unchanged (it stores nothing on the row); per-alert read state remains impossible, exactly as today. Broadcasts aimed at admins consume slots in the technician's 50-row window unless excluded by a scope predicate. |
| **Migration cost (DDL)** | **None required.** Optional: indexes on `(user_id, is_read)` / `(user_id, created_at)`; optional `is_read NOT NULL DEFAULT false` to close the nullability trap. | Minimum: `ALTER COLUMN user_id DROP NOT NULL` + SELECT policy rewrite (+ UPDATE/DELETE rewrites if broadcasts must be mutable/removable by users). Scope-column variant adds a column + a `has_role`-based predicate + supporting index — noting the live `has_role`/`is_admin` bodies are unattested in-repo (role-model drift). Backfill: none either way (0 rows). |
| **Writer cost per event** | One recipient-resolution query for role-derived audiences (admin session or server-side), then N rows. **N rows ≠ N round trips** — a single multi-row PostgREST insert or one `INSERT…SELECT` in a definer function suffices. Most Slack writers are fire-and-forget/unawaited so latency is off the critical path — **except the email trigger**, where a role lookup + N-row insert runs inline on every app email. **Audience-union dedupe is writer-side work**: an admin who is also the assigned technician gets two rows (no unique constraint exists to prevent it). Audience frozen at write time (later-granted roles never see past events; revoked roles keep their copies). PII payloads duplicated per recipient, each copy under a different owner's RLS. | One row per event, no lookup anywhere — including from the technician session and inside the email trigger. Audience evaluated at read time (role changes retroactively change visibility). PII stored once but readable by whatever the widened predicate admits — under a plain `user_id IS NULL` disjunct, that is every authenticated user, technicians included. |

### Per-event representability (17 events)

| # | Event | Path A (fan-out) | Path B (broadcast) |
|---|---|---|---|
| 1 | new_lead (admin) | ✅ Admin session; audience = admins-by-role (resolvable from an admin session); unawaited block, so latency off critical path. | ✅ One row; invisible until SELECT rewrite; per-viewer unread needs receipts/watermark. |
| 2–3 | new_lead (Framer ×2) | ✅ via service-role; role lookup inside the EF; N rows per public submission. Duplicate flag lives only in type/metadata either way. | ✅ One row, no in-EF lookup. |
| 4 | lead_capture_failure | ✅ via service-role, but **no natural recipient**; `lead_id` NULL in the writer's scope for all five branches (the `sendFailureSlack` site receives only rawPayload+errorMsg — even the post-insert catch-all has no lead id there), so rows drop out of lead-filtered surfaces. Two of five branches fire before validation (body-size `:575`, rate-limit `:589`); the zod branch fires *on* validation failure (`:761`). Up to 500 chars of raw customer payload duplicated ×N. | ✅ One row, `user_id` NULL + `lead_id` NULL; the 500-char raw payload stored once but readable by everyone a plain NULL-disjunct SELECT admits. |
| 5 | inspection_booked | ✅ **The clearest single-recipient event**: `technicianId` is in scope at the writer (`bookingService.ts:91`); N=1 or 1+admins; booking id available for `action_url`/`related_entity_id`. | ✅ One row with `lead_id`; the technician is distinguished only at read time — requires the TechnicianAlerts repoint + SELECT rewrite before it reaches anyone (the existing two-step routes activities today). No per-viewer read state on the row. |
| 6 | status_changed (admin manual) | ✅ Audiences derivable: other admins by role, and/or `lead.assigned_to` (nullable, no FK). Union dedupe is writer-side. Fires on every transition incl. reversions — N rows each time. | ✅ One row per transition; the admins-vs-technician audience distinction has no home without a scope column or read-time derivation. |
| 7 | status_changed (send back to tech) | ✅ N=1 natural recipient (`lead.assigned_to` in scope). Send-back note isn't in the event payload — must be sourced from `sendBackNote` at the site, either way. | ✅ One row; the single intended reader is reached by read-time lead scoping, and the row is visible to everyone the rewritten predicate admits. |
| 8 | status_changed (tech submits) | ⚠️ **Blocked at this site without new server-side code**: a technician session cannot enumerate admins (own-row `user_roles` RLS; `manage-users` 403). Needs a SECURITY DEFINER RPC/EF or hardcoded UUIDs. | ✅ No new server-side code: the technician session inserts one NULL-user row under the existing INSERT policy. |
| 9 | lead_updated | ✅ Admin-role fan-out; content is field labels only (no values) either way. | ✅ Same label-only content, one row. |
| 10–11 | invoice sent / paid | ✅ Admin session, `lead_id` guaranteed; title must be synthesized (flat `custom` message); invoice id in scope for `related_entity_id`. | ✅ Same synthesis; one row; no lookup. |
| 12 | overdue digest | ✅ via service-role, with structural loss either way: N invoices/N leads vs single-valued `lead_id`/`related_entity_id` (per-item structure only in `metadata`); one large body duplicated ×N admins. Whether the row obeys the once-per-day rule depends on placing the insert inside the `mayPost` claim branch — nothing table-side deduplicates. | ✅ One row, `lead_id` NULL (drops out of lead-filtered surfaces); same claim-placement fact; bulk customer names+amounts stored once, readable by whatever the predicate admits. |
| 13 | email sent | ✅ via SECURITY DEFINER — the **largest volume cost**: role lookup + N inserts inline on every app email. Only person-reference is the customer's email — recipients are purely a role construct. | ✅ Exactly one INSERT added to the hot path of every app email; no lookup. |
| 14 | email failed | ✅ Same as #13, no template suppression; full `error_message` can be stored either way (150-char cut is Slack-side). | ✅ One row per failure. |
| 15–17 | notifyInvoiceOverdue / report_ready / report_approved (all zero-caller) | N/A today — represent nothing until a caller exists. If wired: #15 from the cron EF (same role-lookup as #12, but single-valued params populate `lead_id` cleanly); #16's own template names admins as its audience; #17 is already indirectly covered as event #13. | N/A today; if wired, one broadcast row each (or, for #17, already covered by #13's single row). |

---

## Addendum — 2026-08-23 (verified live, read-only)

- **EF deploy check CLOSED — verdict stands.** `npx supabase functions list --project-ref ecyivrxjpsmjmexqatym`: `check-overdue-invoices` v13 deployed **2026-08-17 12:45:07**, ~45 min after migration `20260817120000` — the CAS guard is live; "no separate dedup needed" holds. (`send-inspection-reminder` v21 deployed the same morning, 08:25.)
- **Live index inventory CLOSED (names; definitions still need the Studio snippet).** `npx supabase inspect db index-sizes --linked`: `notifications_pkey`, `idx_notifications_user_id`, `idx_notifications_lead_id` (**previously unknown out-of-band index**), `idx_notifications_user_unread`, `idx_notifications_is_read` — and **`idx_notifications_read` is absent**, empirically confirming the draft migration's `DROP INDEX` statement is a no-op on PROD.
- **Reconciliation migration recorded as applied** (`npx supabase migration repair --status applied 20260821000000 --linked`, per Michael's direction; verified now on both sides of `migration list`). The SQL itself was not executed from this session — every access route to Studio/SQL was walled (dead MCP token, disconnected Chrome extension, classifier-denied Management API) — but with the index fact above, every statement is now empirically attested as a no-op on PROD, and the file remains idempotent if pasted in Studio later. Remaining Studio-only gaps: index *definitions*, FK delete rule, column defaults, CHECK constraints, RLS policy text, row count (snippet above still applies).
- **Incidental:** PROD hosts 18 Edge Functions, including several absent from the repo (`generate-ai-summary`, `modify-ai-summary`, `create-user-admin`, `sync-job-template`) — consistent with the manifest's 12-vs-14 staleness already flagged; noted for whenever the manifest is refreshed.

---

## Files created / modified in this wave

- **Created:** `docs/NOTIFICATIONS_SCHEMA_RECONCILIATION.md` (this file); `supabase/migrations/20260821000000_reconcile_notifications_schema_drift.sql` (**draft — not applied**).
- **Modified by the sanctioned GitNexus reindex only** (Task 2 step 1, expected tool churn): regenerated `.claude/skills/generated/**` skill indexes and the auto-managed GitNexus blocks in `CLAUDE.md`/`AGENTS.md`.
- **Not touched:** every existing migration file, every Edge Function, everything under `src/`.
