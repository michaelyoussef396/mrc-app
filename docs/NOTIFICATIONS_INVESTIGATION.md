# In-App Notifications — Read-Only Investigation

**Date:** 2026-08-20
**Scope:** Reconnaissance for building in-app notifications (admin + technician) mirroring what currently only goes to Slack. No code changes were made. The routing decision (who sees what) is deliberately deferred to a follow-up session — this document contains findings only, no routing/permissions design.
> **⚠️ SUPERSEDED IN PART — 2026-08-25.** This document predates the fan-out migration
> (`supabase/migrations/20260823090000_notifications_fan_out.sql`, applied to PROD 23 Aug 2026).
> Every statement below that `notifications` has "0 rows all-time" / "zero writers" is now
> FALSE: `public.fan_out_notification()` has been writing since 24 Aug — verified 25 Aug at
> **64 rows / 16 events / exactly 4 rows per event**, DISTINCT dedup on `user_id` correct, one
> Slack post per event, read state per-recipient. The `user_metadata.last_alerts_read_at`
> watermark read model described in Q3 **no longer exists**. Superseded lines are marked inline
> with `[SUPERSEDED 2026-08-25]`. Still-open gap: `notifications` is not in the
> `supabase_realtime` publication, so the `useNotifications.ts` subscription never fires — see
> `docs/TODO.md`, 25 Aug section. The Slack-event inventory (Q1) and the `activities` facts (Q4)
> are unaffected.

**Method:** Multi-agent sweep (4 investigation agents, 1 adversarial verifier, 1 completeness critic, 1 schema-fit synthesizer; 271 tool calls). Every Slack-event claim below was re-verified against the cited file:line by an independent agent instructed to refute it — **17/17 events confirmed, zero corrections, zero missed senders**. Known limitations are listed in the Appendix.

---

## Q1. Every event currently firing to Slack

### Transport architecture — three independent send paths

All Slack traffic converges on **one** deploy-time secret, `SLACK_WEBHOOK_URL`, via three mechanisms:

1. **Hub EF** — `supabase/functions/send-slack-notification/index.ts`. Frontend wrapper `sendSlackNotification()` at `src/lib/api/notifications.ts:416` → `supabase.functions.invoke('send-slack-notification')` (`:418`) → HTTP POST to the webhook at `index.ts:409`. Auth is dual-path: `x-internal-secret` shared secret or Bearer JWT (`index.ts:324-357`); `verify_jwt=false` in `supabase/config.toml:11-12`. Zod-validated payload (`index.ts:5-30`), in-memory 10 req/60s per-IP rate limit (`index.ts:40-41, 360-367`).
2. **Direct webhook POSTs** — two EFs bypass the hub entirely: `receive-framer-lead` (success post at `index.ts:851`, failure post at `index.ts:444`) and `check-overdue-invoices` (`postSlack()` fetch at `index.ts:139`, called at `:519`). They share only the secret name (comment at `check-overdue-invoices/index.ts:136`).
3. **DB trigger** — `email_logs_after_insert_slack` AFTER INSERT ON `email_logs` (bound at `supabase/migrations/20260527023540_email_logs_slack_notify_trigger.sql:79-82`; current function body in `supabase/migrations/20260813115000_email_logs_slack_suppress_system_sends.sql:37-107`) → Vault lookup of `internal_webhook_secret` (`:48-55`) → `net.http_post` to the hub EF with `x-internal-secret` (`:88`). **This is the highest-volume Slack source: every app email produces one Slack message** (via `send-email/index.ts:212`, `receive-framer-lead/index.ts:872`, `send-inspection-reminder/index.ts:250`, and the frontend insert at `src/lib/bookingService.ts:318`).

### Live events (14)

| # | Event | Trigger call site | Send path | Trigger condition |
|---|---|---|---|---|
| 1 | **new_lead (admin-created)** | `src/components/leads/CreateNewLeadModal.tsx:455` | Hub EF `formatNewLeadBlocks()` (`index.ts:100`, dispatch `:392`) | Admin submits Create New Lead modal and the leads INSERT succeeds. Fire-and-forget, not awaited (`CreateNewLeadModal.tsx:452`). |
| 2 | **new_lead (public/Framer, non-duplicate)** | `supabase/functions/receive-framer-lead/index.ts:851` | Direct webhook, `buildSlackBlocks()` (`index.ts:133`) | Payload passes zod (`:756`), audited leads INSERT succeeds (`:808-826`), `isPossibleDuplicate === false` (`:780`). Reached from the public form `src/pages/RequestInspection.tsx:139` → `src/lib/api/public-leads.ts:125`, and from the external Framer site (unauthenticated; `verify_jwt=false`, `supabase/config.toml:5-6`). |
| 3 | **new_lead (public/Framer, possible repeat)** | Same fetch, header branch `receive-framer-lead/index.ts:152-154` | Direct webhook | Same as #2 but a lead with same email AND phone exists within 24h (`:772-780`). Lead is still inserted — flagged only (`:769-771`). |
| 4 | **lead_capture_failure** | `receive-framer-lead/index.ts:575, :589, :761, :820, :944` | Direct webhook via `sendFailureSlack()` (`:437`, POST `:444`) | Any of five intake failures: body too large, IP rate limit, zod validation failure, leads INSERT failed after 3 retries, uncaught top-level error. |
| 5 | **inspection_booked** | `src/lib/bookingService.ts:239` | Hub EF generic branch (`index.ts:404`, case `:208`) | Inspection booking committed by `bookInspection()`; fires in the "fire-and-forget notifications" block (`bookingService.ts:235`), unconditional, not awaited. |
| 6 | **status_changed (admin manual)** | `src/pages/LeadDetail.tsx:612` | Hub EF `formatStatusChanged()` (`index.ts:254`) | Admin changes pipeline status on Lead Detail; fires after the leads UPDATE succeeds, on EVERY transition including reversions (`LeadDetail.tsx:504`). Also emitted when approving a job completion (`handleApproveJobCompletion` → `handleChangeStatus`, `LeadDetail.tsx:633`). |
| 7 | **status_changed (sent back to technician)** | `src/pages/LeadDetail.tsx:680` | Hub EF `formatStatusChanged()` | Admin submits "Send back to technician" with a non-empty note (`:653`), after leads → `job_scheduled` and `job_completions` reset (`:656-669`). The send-back note itself is NOT in the Slack message — it goes only to activity-log metadata (`:676`). |
| 8 | **status_changed (technician submits job completion)** | `src/lib/api/jobCompletions.ts:304` | Hub EF `formatStatusChanged()` (dynamic import at `jobCompletions.ts:303`) | Technician submits a job completion; destination status depends on `request_review` (`:277`). The only technician-originated Slack send. |
| 9 | **lead_updated** | `src/hooks/useLeadUpdate.ts:119` | Hub EF `formatLeadUpdated()` (`index.ts:304`) | Any lead field edit with ≥1 non-internal-notes change (`:107`); no-op saves send nothing (`:71-74`); internal-notes-only edits take the `logNoteAdded` path and don't send (`:100`). Field LABELS only — never values (`:116-118`). |
| 10 | **invoice marked sent** | `src/lib/api/invoices.ts:606` (UI: `usePaymentTracking.ts:45`, `AdminInvoiceHelper.tsx:444`) | Hub EF `custom` branch (`index.ts:401`) via `notifyInvoiceSent()` (`notifications.ts:481`) | Invoice marked sent AND returned row has non-null `lead_id` (`invoices.ts:595`). |
| 11 | **invoice payment received** | `src/lib/api/invoices.ts:661` (UI: `usePaymentTracking.ts:34`, `AdminInvoiceHelper.tsx:467`) | Hub EF `custom` branch via `notifyPaymentReceived()` (`notifications.ts:499`) | Invoice marked paid AND non-null `lead_id` (`invoices.ts:650`); short-circuits when already paid (`:622`). |
| 12 | **overdue invoice daily digest** | `supabase/functions/check-overdue-invoices/index.ts:519` | Direct webhook, `buildDigest()` (`:155-188`) | Daily pg_cron at `0 23 * * *` UTC = 9:00am AEST (`supabase/migrations/20260601120000_fix_cron_auth_headers.sql:10-12`). At most one digest per run, only when something happened (`:494`), gated by an `app_settings` day-key claim (`:480-488, :517`). |
| 13 | **email sent (success post)** | DB trigger on `email_logs` INSERT | DB trigger → hub EF `custom` branch | Every `email_logs` INSERT with status ≠ 'failed', EXCEPT templates `framer_lead_confirmation` and `inspection_reminder` which are suppressed (`20260813115000:60-63`). |
| 14 | **email failed (failure post)** | Same DB trigger | DB trigger → hub EF `custom` branch | Any `email_logs` INSERT with status = 'failed' — NO template suppression (filter requires `NEW.status <> 'failed'`, `20260813115000:60-61`). Includes the frontend no-email-on-file insert (`src/lib/bookingService.ts:318-327`). |

### Message content / format per event

- **#1 admin new_lead** — Block Kit (`send-slack-notification/index.ts:134-200`): header `🏠 New Lead Received`; field sections for Full Name / Phone / Email / Lead Source / Street Address / Suburb / Preferred Date (DD/MM/YYYY) / Preferred Time; optional Issue Description; `⚠️ ACTION REQUIRED — 📞 CALL LEAD AND BOOK THEM IN`; link to `https://www.mrcsystem.com/admin/leads`; en-AU/Melbourne timestamp context (`:102`).
- **#2 Framer new_lead** — distinct template (`receive-framer-lead/index.ts:156-235`): same shape plus a **Postcode** field, Lead Source hardcoded `Website (Framer)` (`:168`), optional Type of Issue / Urgency fields (`:187-197`, in-app `/request-inspection` payloads only).
- **#3 possible repeat** — byte-identical body to #2 with header `🔁 Possible repeat — 🏠 New Lead Received` (`:153`).
- **#4 lead_capture_failure** — header `🚨 LEAD CAPTURE FAILURE`; `*Error:* {msg}` + Melbourne timestamp; **first 500 chars of the raw customer-submitted payload** in a code block (`:442-443`); link to admin dashboard (`:448-454`).
- **#5 inspection_booked** — attachment, color `#f39c12`: `*Inspection Booked*` + Lead / Address / Technician / `{displayDate} at {displayTime}` (`index.ts:209`, `bookingService.ts:245`).
- **#6-8 status_changed** — shared Block Kit template (`index.ts:269-301`): header `🔄 Lead Status Changed`, `{fromEmoji} {oldLabel} → {toEmoji} {newLabel}`, optional address, colored attachment via `STATUS_COLOR` (`:244-252`). Note: `pending_review`/`job_scheduled`/`job_completed` are absent from `STATUS_EMOJI`/`STATUS_COLOR`, so events #7/#8 always render fallback `:arrow_right:` + grey `#6b7280`.
- **#9 lead_updated** — attachment, color `#3498db`: `*Lead Details Updated — {leadName}*\n*Fields changed:* {comma-joined labels}` (`index.ts:309`). `changedFields` is zod-capped at 500 chars (`index.ts:28`).
- **#10** — plain text: `💰 Invoice {number} marked as sent for {leadName} — ${total.toFixed(2)}` (`notifications.ts:492`). Bare `$`, no thousands separators.
- **#11** — plain text: `✅ Payment received for {number} from {leadName} — ${total.toFixed(2)} via {paymentMethod}` (`notifications.ts:511`). `paymentMethod` is the raw enum value.
- **#12 digest** — plain text, newline-joined (`check-overdue-invoices/index.ts:164-187`): `:receipt: *Overdue invoice digest — {DD/MM/YYYY}*`; bulleted Newly overdue / Penalty milestones / Admin escalation groups; `*Outstanding total:* N invoices — $X,XXX.XX` (en-AU `formatAUD`, `:132-134`); dashboard link. Bulk customer names + amounts.
- **#13** — plain text built in SQL (`20260813115000:81-82`): `{label} sent | {recipient_email}` where label comes from a CASE on `template_name` (`:65-74`; e.g. `booking-confirmation` → "Booking confirmation"; unknown → raw template name; `send-email` defaults omitted names to `custom` → renders `custom sent | …`). **Customer email addresses posted in plaintext.**
- **#14** — `{label} FAILED | {recipient_email or '?'} | {first 150 chars of error_message}` (`20260813115000:77-79`).

### Defined but unreachable (3)

| Event | Where it exists | Status |
|---|---|---|
| `notifyInvoiceOverdue` | `src/lib/api/notifications.ts:518` | **Zero call sites** repo-wide — dead code. Template: `⏰ Invoice {n} for {lead} is {d} days overdue — ${amt}`. The overdue path that actually fires is the daily digest (#12), a completely different template. |
| `report_ready` | Hub EF zod enum `index.ts:6`, switch case `:212`; param type `notifications.ts:57` | **No caller constructs it.** Template exists (`Inspection Report Ready for Approval`, color `#e74c3c`). |
| `report_approved` | Hub EF `index.ts:6`, `:216`; `notifications.ts:57` | **No caller.** Report approval reaches Slack today only indirectly via the `report-approved` email template hitting the email_logs trigger (`src/pages/ViewReportPDF.tsx:990`, `src/pages/LeadsManagement.tsx:738`). `docs/NOTIFICATIONS-AND-TRIGGERS.md:126` documents this event as active — docs and code disagree. |

The hub EF advertises 7 event types in its zod enum; only 5 are reachable (`new_lead`, `status_changed`, `lead_updated`, `custom`, `inspection_booked`).

### Channel binding

**The channel ID `C0AEU9J7WSC` appears nowhere in the codebase** (repo-wide grep: zero hits). Every send resolves its destination from the single `SLACK_WEBHOOK_URL` Supabase secret at runtime (`send-slack-notification/index.ts:370`, `receive-framer-lead/index.ts:849/:439`, `check-overdue-invoices/index.ts:197`). Channel routing is a deploy-time secret binding, not code. The only in-repo channel claim is static UI copy saying "#leads" (`CreateNewLeadModal.tsx:901`). No hardcoded webhook URL exists anywhere (only docs placeholders at `docs/DEPLOYMENT.md:76`). No Slack bot tokens, Web API SDK, interactivity handlers, or second webhook exist. (The vendored `slack-mcp-server/` at repo root is developer tooling, not imported by app code.)

### Per-Edge-Function Slack coverage (all 14 on disk)

| EF | Sends Slack? | How |
|---|---|---|
| send-slack-notification | ✅ direct | The hub (POST at `index.ts:409`) |
| receive-framer-lead | ✅ direct + indirect | Two direct POSTs (`:851`, `:444`) + email_logs insert (`:872`) fires the DB trigger |
| check-overdue-invoices | ✅ direct | `postSlack()` (`:139`/`:519`) |
| send-email | ✅ indirect only | email_logs insert (`index.ts:212`) → DB trigger; every app email = one Slack message |
| send-inspection-reminder | ✅ indirect only | email_logs insert (`:250`); success posts suppressed, failures still post |
| calculate-travel-time, export-inspection-context, seed-admin, manage-users, generate-inspection-pdf, generate-inspection-summary, generate-job-report-pdf | ❌ | No slack refs, no email_logs writes |
| fetch-resend-email | ❌ | Reads email_logs only (`:77-83`) — **not listed in the EF manifest** |
| check-photo-moisture-orphans | ❌ | Read-only — **not listed in the EF manifest** |

⚠️ `docs/edge-function-attribution-manifest.md` claims 12 EFs (`:3`, `:24`); 14 exist on disk. Its "No DB writes (informational only)" claim for send-slack-notification (`:51`) is also contradicted: on caught exceptions the EF writes to `error_logs` via PostgREST with the service-role key (`index.ts:436`, payload `:443-449`).

---

## Q2. Does the notifications table schema support these events?

### The table as it actually exists (and a schema-drift warning)

The brief quoted 8 columns. The **PROD-regenerated types** (`src/integrations/supabase/types.ts:1498-1559`, regenerated from PROD in commit 39a9527) show **15**:

| Column | Type | Nullability |
|---|---|---|
| id | uuid | NOT NULL, default |
| user_id | uuid | **NOT NULL** — no FK (only FK on the table is `notifications_lead_id_fkey` → leads.id, `types.ts:1551-1557`) |
| type | varchar(50) | NOT NULL — **free text, no CHECK, no enum** (`20251029103512:13`; no `Database.public.Enums` entry) |
| title | varchar(255) | NOT NULL |
| message | text | NOT NULL |
| action_url | text | nullable |
| priority | varchar(20) | nullable, DEFAULT 'normal' — **free text, no CHECK** (`20251029103512:17`) |
| is_read | boolean | **nullable**, optional on insert (`types.ts:1503, :1520`) |
| read_at | timestamptz | nullable |
| lead_id | uuid | nullable, FK → leads.id |
| metadata | jsonb | nullable |
| related_entity_type / related_entity_id | text/uuid | nullable |
| created_at / updated_at | timestamptz | nullable, defaults |

**Schema drift:** the only CREATE TABLE in the repo (`supabase/migrations/20251029103512_5cf87f7e…sql:10-21`) has just **10 columns**, including `read BOOLEAN` (not `is_read`). Six PROD columns (`is_read`, `read_at`, `lead_id`, `metadata`, `related_entity_type`, `related_entity_id`) and the `read → is_read` rename **exist in no repo migration** (grep across all 118 files: zero hits). Three notifications indexes referenced/dropped by `20260217074249_fix_indexes.sql:62-64` were never created by any repo migration either. **The live table was altered out-of-band**, so repo-based attestation of its constraints is weak — see Open Questions.

**RLS (from migrations):** SELECT/UPDATE/DELETE are per-user (`user_id = auth.uid()`, `20260217074235:106-120`). The sole INSERT policy — "System can insert notifications", `20260217081500_fix_rls_always_true.sql:56-60` — is `TO authenticated WITH CHECK (auth.uid() IS NOT NULL)`. Two structural facts: (a) it does **not** bind `user_id` to `auth.uid()` — any authenticated session may insert a row addressed to any user; (b) it is **unsatisfiable** from the contexts where several events originate (unauthenticated `receive-framer-lead`, pg_cron-driven `check-overdue-invoices`, the email_logs DB trigger — none has an `auth.uid()`). `service_role` bypasses RLS entirely.

**[SUPERSEDED 2026-08-25 — see banner: `fan_out_notification()` now writes; 64 rows at 25 Aug.]** ~~**Writers: zero.**~~ No code path in `src/`, `supabase/functions/`, `api/`, or any migration inserts into `notifications` (five independent search strategies documented in the sweep; the only trigger on the table is the BEFORE UPDATE `updated_at` stamp, `20251029103512:83-86`). Consistent with `docs/TODO.md:1950-1951`: "0 rows all-time. In-app notification surface dead while Slack works." There is nothing to extend — any event carried into this table requires net-new insertion code.

### Per-event fit

Because `type` is unconstrained free text and the table ~~has zero rows and zero writers~~ **[SUPERSEDED 2026-08-25: it now has rows and one writer, the fan-out RPC]**, **"needs a new type value" is not a schema constraint for any event** — every type string is definitionally new. Column-wise, **all 14 live events fit** the 15-column shape (title/message/type/lead_id/metadata/related_entity_* can carry each payload). What varies is which structural gaps below apply:

| Event | lead_id available? | Notable fit facts |
|---|---|---|
| new_lead (admin) | ✅ (post-INSERT) | Block Kit fields flatten into message; structured set fits metadata; action_url derivable (`/admin/leads`). |
| new_lead (Framer ×2) | ✅ | Origin EF is **unauthenticated** — INSERT policy unsatisfiable from there. Duplicate flag survives only as type/metadata convention. |
| lead_capture_failure | ❌ NULL (no lead exists in all 5 branches) | No user context at all at origin. Row would carry up to 500 chars of raw customer payload. NULL lead_id makes it invisible to lead-filtered timelines (`useActivityTimeline.ts:118`). |
| inspection_booked | ✅ | Payload has `technicianName` as a display string only — **no user UUID anywhere in the event** (`bookingService.ts:239-245`). |
| status_changed ×3 | ✅ | One type value spans 3+ business meanings (incl. job-completion approval), distinguishable only via metadata. Send-back note is not in the event payload at all. |
| lead_updated | ✅ | Labels only, no values — message/metadata cannot include old→new without changing the event construction. |
| invoice sent / payment received | ✅ (guarded non-null) | `custom` events carry a **single flat message string with no title field** (`notifications.ts:487-511`) — `title` is NOT NULL, so one must be synthesized. `related_entity_id` for the invoice is in scope at the call site but not in the payload. |
| overdue digest | ❌ NULL (aggregates N invoices/N leads) | Pure system event (cron), no auth context. `lead_id`/`related_entity_id` are single-valued — per-item structure survives only in metadata JSON. Once-per-day suppression is Slack-post-side (`app_settings` claim); nothing table-side would deduplicate an insert. |
| email sent / failed | ✅ (NEW.lead_id, nullable both sides) | Only person-reference is the **customer's email address** — not an app user. DB-trigger origin has no `auth.uid()` for system-originated inserts. Full error_message could be stored (the 150-char cut is a Slack choice). |

### Structural gaps (the ones that matter)

1. **`user_id` NOT NULL vs. broadcast events.** Every row needs exactly one recipient; **none of the 17 events carries a recipient user ID in its payload** — all are channel broadcasts. The closest thing to a person in any payload is a display name or a customer email. (Routing is deferred; the fact stands that the column cannot be populated from any event payload as constructed.)
2. **No writers exist, and several origins can't satisfy the INSERT policy** (unauthenticated EF, cron EF, DB trigger). `user_id` also has no FK, so nothing validates whatever UUID a writer supplies.
3. **Reader-side drift makes two columns useless today.** The hand-written `Notification` interface (`src/hooks/useNotifications.ts:8-22`) omits `action_url` and `priority` — `.select('*')` returns them at runtime but no typed consumer can read them, so click-through and severity are dead ends without a cast. The interface is not derived from the generated `Row` type, so regeneration will never surface this as a compile error.
4. **`is_read` nullability trap.** It's nullable and optional on insert, while the unread-count filter is `.eq('is_read', false)` (`useNotifications.ts:112-116`) and the interface types it non-nullable. A writer omitting `is_read` produces rows present in the list but silently absent from the unread badge.
5. **Nullability mismatches** on `metadata`, `created_at`, `updated_at` (interface non-nullable vs. Row nullable) — latent runtime hazards on the `.select('*')` path.
6. **Aggregates and lead-less events** (digest, capture failures) get NULL `lead_id` and drop out of every lead-filtered surface.
7. **Slack presentation structure has no column counterpart** — Block Kit headers/fields/colors must flatten into `title` + `message`, with `metadata` JSON as the only structured carrier.

---

## Q3. What TechnicianAlerts was mocked to display

### Premise correction: the mock is gone — the page is live

`useTechnicianAlerts` **no longer returns mock data**. It queries two real tables: `calendar_bookings` (scoping: `.select('lead_id').eq('assigned_to', user.id)`, `src/hooks/useTechnicianAlerts.ts:140-143`) then `activities` for those lead IDs (`.in('lead_id', leadIds).order('created_at', desc).limit(50)`, `:154-159`), polling every 60s (`:164-165`). Repo-wide grep for mock symbols: zero hits.

The mock survives only in git history — commit `0b259f3` ("feat: Technician Role UI - Phase 1 Progress"), `src/hooks/useTechnicianAlerts.ts:63-112` (`MOCK_ALERTS`). Its authoring TODOs are the implicit spec statement: `:63` *"TODO: Replace with real notifications table when created"* and `:64` *"TODO: Connect to Slack integration for triggers"*. **Neither happened as written** — the built implementation went to the existing `activities` table, not a notifications table, and no Slack send writes an activities row, so nothing that goes to Slack reaches TechnicianAlerts.

### The mock as implicit spec — five alerts, each mapped to its real source

| Mock alert (type / title / message) | Real source today | Status |
|---|---|---|
| **new_job** — "New Inspection Assigned" / "John Smith - 123 Main St, Melbourne" (10m ago, unread) | `bookInspection()` inserts the `calendar_bookings` row with `assigned_to` (`src/lib/bookingService.ts:122-130`) — the exact row the alerts query pivots on — and writes activity `inspection_booked` (`:214-219`). Mapped → `new_job` (`useTechnicianAlerts.ts:69-70`). | ✅ Wired, but the real message is "Scheduled to {tech} for {date} at {time}", not the customer+address framing the mock specified. Insert errors are swallowed (`bookingService.ts:221-224`) so an alert can silently never exist. **Second producer unmapped:** remediation `job_booked` (`BookJobSheet.tsx:479-486`) falls to the `system` bucket. |
| **schedule_change** — "Schedule Changed" / "Inspection moved to 2:00 PM tomorrow" (1h ago, unread) | The genuine reschedule writer is `job_rescheduled` (`src/components/leads/BookJobSheet.tsx:481-486`) — **not in `mapActivityType`, renders as grey `system`**. What actually renders as `schedule_change` is `status_change` (`useTechnicianAlerts.ts:73-74`), written by pipeline drags and **job-report approvals** (`LeadsManagement.tsx:315-320, :575-580`; `ViewReportPDF.tsx:772-776`). | ⚠️ Mis-mapped: an admin approving a PDF shows the technician an orange-Clock "schedule change"; an actual reschedule shows as "system". |
| **reminder** — "Upcoming Inspection" / "Reminder: 456 Oak Ave in 30 minutes" (2h ago, read) | **No producer exists.** `mapActivityType` never returns `reminder` (`:67-80`) — the config entry (`:46-50`) is unreachable. The only reminder machinery is customer-facing: a DB trigger computes `reminder_scheduled_for = start − 48h` (`20260218000001:14,34-37`) and `send-inspection-reminder` emails the **customer** (`index.ts:286-288, :122`), writing only email_logs (`:251`), never activities. | ❌ Zero real backing; also a horizon mismatch (mock implies same-day tech nudge; real timer is 48h, customer-addressed). Needs a new event source. |
| **cancelled** — "Inspection Cancelled" / "Client cancelled - 789 Pine Ln" (1d ago, read) | `handleCancelBooking` (`EventDetailsPanel.tsx:46`): sets booking status cancelled (`:51-54`), reverts lead to `new_lead` (`:59-63`), writes activity `booking_cancelled` (`:65-70`). Mapped → `cancelled` (`:71-72`). | ✅ Wired. No actor/reason recorded ("Client cancelled" has no real analogue). **Coverage quirk:** cancel never clears `assigned_to`, so the lead stays in the technician's alert scope forever. |
| **system** — "System Update" / "App updated to version 2.4.1" (3d ago, read, **no leadId**) | **Structurally unrepresentable**: `activities.lead_id` is NOT NULL (`types.ts:23`) and the query hard-filters by the technician's lead IDs (`:147-157`, returns `[]` with no bookings). A leadId-less alert is also a dead tap (`TechnicianAlerts.tsx:62-66`). What actually renders as `system` is `email_sent` (`:75-76`) plus **every unmapped activity_type** via the default branch (`:77-78`): `job_booked`, `job_rescheduled`, `field_edit`, `note_added`, `contact_attempt`, `section_milestone`, `archived`, `lead_not_proceeding`, `job_completion_*`, `google_review_sent`, `lead_closed`, `invoice_overdue`, `invoice_milestone`. | ❌ The grey Info bucket is a firehose of internal admin churn, not the curated app-level announcement the mock specified. |

### Alert shape & behavior facts (current implementation)

- `TechnicianAlert` = `{ id, type: 'new_job'|'schedule_change'|'reminder'|'cancelled'|'system', title, message, timestamp: Date, isRead, leadId? }` (`useTechnicianAlerts.ts:13-23`). The mock-era `bookingId` field was **removed** — booking identity is lost even though the query starts from `calendar_bookings`; all taps navigate lead-scoped to `/technician/job/{leadId}` (`TechnicianAlerts.tsx:199-201`), type-agnostic.
- Title/message come **verbatim** from `activities.title` / `activities.description || ''` (`:179-180`) — the alert copy is whatever each of the ~44 activities writers wrote.
- **[SUPERSEDED 2026-08-25 — this watermark read model no longer exists; read state is per-recipient on `notifications.is_read`.]** ~~**Read state is a single watermark, not per-row**~~: `isRead = timestamp <= user.user_metadata.last_alerts_read_at` (`:129-131, :174`); `markAllAsRead` does `supabase.auth.updateUser(...)` (`:215-217`), silent on failure. No per-alert markAsRead exists (the mock era had one). Fresh technicians see all 50 rows as unread.
- Recent/older bucketing: strict `> now − 24h` (`:189-205`). `formatTimeAgo` buckets down to `DD/MM` en-AU beyond 7 days (`:86-106`, `dateUtils.ts:44-52`).
- **Three** mounts of the hook (critic-verified): the page (`TechnicianAlerts.tsx:197`), the bottom-nav badge (`TechnicianBottomNav.tsx:28`), and `TechnicianDashboard.tsx:36` → bell + unread dot in `TechnicianHeader.tsx:69-84` — deduped by the shared query key.
- **Error state is invisible**: the hook surfaces `error` (`:234`) but the page never renders it — a failed query is indistinguishable from "All caught up!" (`TechnicianAlerts.tsx:207-211`).
- `refetch`/`markAllAsRead` invalidate the queryKey **without the user ID** (`:219, :225`), prefix-matching all users' cached entries.

---

## Q4. The activities table's role

### Schema (verified in-repo)

`CREATE TABLE public.activities` at `supabase/migrations/20251028135212_32f4908a…sql:719-732`, header comment literally: *"ACTIVITIES TABLE (Timeline/Audit Log)"*. 8 columns (`types.ts:18-27`): `id`, `lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE` (`:721` — every row is bound to a lead and dies with it), `activity_type varchar(100) NOT NULL` (**free text — no CHECK, no enum**), `title NOT NULL`, `description`, `user_id uuid NULL REFERENCES auth.users ON DELETE SET NULL` (**the actor**), `metadata jsonb`, `created_at`.

RLS: any authenticated user can read and insert **every** row — four coexisting permissive policies from two migrations (`20251028135212:741-749`; `20251112000020:106-129`). **No UPDATE and no DELETE policy exists** in any migration, yet `deleteLastContactAttempt` issues a DELETE (`src/lib/api/fieldEditLog.ts:196-199`).

Current indexes: `idx_activities_lead_id`, `idx_activities_lead_created_type`, `idx_activities_user_created` (+PK), after the prunes in `20260217074249_fix_indexes.sql:54-56`.

### Writers — ~44 sites, six families

1. **DB triggers** (SECURITY DEFINER, fire regardless of app): `log_lead_creation` (`lead_created`, on every leads INSERT) and `log_lead_status_change` (`status_changed`, on every leads status UPDATE) — `20251112000020:7-78`. Note the spelling collision: the trigger writes `status_changed`; app code writes `status_change` (`LeadsManagement.tsx:317`) — reconciled only by the icon map (`useActivityTimeline.ts:32-34`). **Every app-driven status change produces at least two rows** (trigger + app write).
2. **`fieldEditLog.ts` helpers** (15 call sites): `logFieldEdits` (`field_edit`, versioned diff rows with `metadata.changes[]`), `logNoteAdded`, `logContactAttempt` (rethrows; "immutable" per its doc yet paired with a DELETE helper), `logSectionMilestone`.
3. **`logInvoiceActivity`** (`invoices.ts:712-719`): `invoice_updated` / `invoice_sent`, fire-and-forget from `AdminInvoiceHelper.tsx:429-450`.
4. **Edge Function (cron)**: `check-overdue-invoices` writes `invoice_overdue` (`index.ts:385-390`) and `invoice_milestone` (`:424-432`) rows — no user_id, no metadata.
5. **Hand-rolled page inserts**: `LeadsManagement.tsx` (`status_change`, `archived`, `lead_not_proceeding`, `email_sent` — the latter fires **even on the clipboard-copy branch**, `:634-657`; plus a hand-built `field_edit` at `:756-762` that lacks the standard metadata keys), `LeadDetail.tsx` (`google_review_sent`, `lead_closed`), `EventDetailsPanel.tsx:65-70` (`booking_cancelled` — notably does **not** invalidate the timeline; only the 5s poll picks it up), `BookJobSheet.tsx:479-487` (`job_booked`/`job_rescheduled`), `useJobCompletionForm.ts` (`job_completion_started`/`_submitted`), `bookingService.ts:214-219` (`inspection_booked`, deliberately redundant with its diff row per the comment at `:210-212`).
6. **Migrations**: one-time backfill + seed fixtures.

### Readers — 11 sites, two of them load-bearing system-of-record uses

- **`useActivityTimeline.ts:91-95`** — the primary reader: merges `activities` + `email_logs` + `notifications` into one `TimelineEvent` stream (`:116-120`), resolves actor names from profiles for activities only (`:125-138`), 5s poll (`:237`). Consumers: **AdminHeader dropdown** (`AdminHeader.tsx:216`), **/admin/activity page** (`src/pages/Notifications.tsx:7` — named Notifications.tsx but reads zero notifications rows directly), **LeadDetail per-lead timeline** (`LeadDetail.tsx:246`), **AdminDashboard feed** (`AdminDashboard.tsx:96`).
- **`useTechnicianAlerts.ts:154-160`** — the technician inbox (Q3).
- **`LeadsManagement.tsx:623-627`** — raw activities-only "Activity History" dialog (different event set than the merged LeadDetail timeline for the same lead).
- **Count/lookup readers**: `logFieldEdits` version counter (`fieldEditLog.ts:66-70` — read-before-write, non-atomic under concurrency), `getContactAttemptCount` (`:169-175`), `deleteLastContactAttempt` id-resolve (`:185-192`).
- **System-of-record use #1 — cron idempotency state**: `check-overdue-invoices/index.ts:259-283` reads `invoice_overdue` activities to decide whether work already ran today, recovering the invoice number by **regex over the free-text description** (`/INV-\d{4}-\d{4}/`, `:282`) because the writer stored no metadata; a failed read aborts a real run with HTTP 500 (`:264-273`).
- **System-of-record use #2 — sole storage of the admin send-back note**: `metadata.send_back_note` (written `LeadDetail.tsx:671-677`) is read via unindexed `metadata->>'trigger'` JSONB filters by `useRevisionJobs.ts:61-67` and `JobCompletionForm.tsx:69-76`. ⚠️ CLAUDE.md says `useRevisionJobs.ts` is "left dormant — do not activate", but `TechnicianDashboard.tsx:5,:37` imports and calls it in the live bundle (see Open Questions).

### Overlap with notifications — actual current facts

| Concern | `activities` | `notifications` |
|---|---|---|
| Purpose (per DDL comment + usage) | Per-**lead** audit trail / timeline | Per-**user** inbox |
| kind | `activity_type` free text NOT NULL | `type` free text NOT NULL |
| headline / body | `title` NOT NULL / `description` NULL | `title` NOT NULL / `message` NOT NULL |
| lead link | `lead_id` **NOT NULL**, CASCADE | `lead_id` nullable |
| person column meaning | `user_id` nullable = **actor** (who did it) | `user_id` NOT NULL = **recipient** (who sees it) |
| read state / routing / target | none | `is_read`, `read_at`, `action_url`, `priority`, `related_entity_*` |
| RLS | every authenticated user sees every row | per-user isolation |
| Writers | ~44 sites | **zero** |
| Rows | live, high volume | ~~0 all-time (per TODO.md at 20 Aug)~~ **64 rows / 16 events at 25 Aug — [SUPERSEDED 2026-08-25]** |

The sharpest structural fact: nullability inverts on both linking columns — an activities row cannot exist apart from a lead; a notifications row cannot exist apart from a person but need not concern any lead. `user_id` overlaps in name but **inverts in meaning** (actor vs. addressee).

**[SUPERSEDED 2026-08-25 — the "0 rows" / "INSERTs no code emits" reasoning below is stale; the fan-out RPC now populates the table and the badge counts real rows. The realtime subscription still never fires, but because the table is missing from the `supabase_realtime` publication, not because nothing writes.]** **Observed coupling in AdminHeader** (`AdminHeader.tsx:214-296`): one dropdown runs three hooks over two tables. The red badge is per-user, read-state-aware, from `notifications` (`useUnreadCount`, 30s poll); the list beneath it is the global, read-state-less merged timeline (5s poll); "Mark all as read" mutates only the notifications table — **it changes nothing about the five events displayed**. Badge count and list contents are drawn from disjoint populations, and since notifications has 0 rows, the badge can only ever count rows created outside this repo, and the realtime subscription (`useNotifications.ts:76-93`) listens for INSERTs no code emits. The shared renderer badges notification rows with a blue pill but leaves activities rows bare (`ActivityTimeline.tsx:165-175`).

**Three parallel unread/inbox mechanisms coexist today** **[SUPERSEDED 2026-08-25 — the auth-metadata watermark is gone; read state is per-recipient on `notifications.is_read`]**: `notifications.is_read` (admin badge), ~~the auth-metadata watermark (technician badge)~~, and none at all (the merged timeline list). Whether the tables should remain separate or feed each other is a design decision **deferred with the routing work** — the facts above are what that decision must reconcile.

### Adjacent modalities checked (for completeness)

- **Realtime**: besides `useNotifications`, two more `postgres_changes` subscriptions exist — `useTechnicianJobs.ts:361-367` (on `calendar_bookings`, per-technician channel) and `useInspectionLeads.ts:84-90` (on `leads`). TechnicianAlerts itself has none (poll-only).
- **Web push / service worker**: not implemented — no PushManager/Notification-API usage anywhere; VitePWA is caching-only (`vite.config.ts`). `docs/NOTIFICATIONS-AND-TRIGGERS.md:869-880` confirms.
- **SMS**: `sms_logs` table exists (`20251111000009`) with **zero** references in src/ or EFs — dead channel.
- **Offline replay**: `offline_queue`'s CHECK list includes `'activities'` (`20251111000010:32`) but `SyncManager.ts` replays only inspections/photos — dormant capacity, not a live writer.
- **error_logs**: written by send-slack-notification on exceptions (`index.ts:436`) and by the three PDF/AI EFs + `apiClient.ts` — an adjacent failure-event sink no notification surface reads.

---

## Open questions for Michael

1. **Channel binding.** Which Slack channel does the PROD `SLACK_WEBHOOK_URL` secret actually point to today (the brief says #notifications / C0AEU9J7WSC; the only in-repo claim is UI copy saying "#leads"), and does DEV hold a different webhook? All 14 live event templates share this one destination. Verification requires the secrets CLI/dashboard per the env-var rule — code cannot answer it.
2. **PROD introspection permission.** May a follow-up session run **read-only** introspection against PROD (ref `ecyivrxjpsmjmexqatym`, with your explicit confirmation per CLAUDE.md) to capture: the live `email_logs_notify_slack` body, live pg_cron entries, the notifications table's real constraints/indexes, and its actual row count? Every current claim about these rests on repo files that are **proven** not to be this table's source of truth.
3. **Schema-drift backfill.** Six PROD-only notifications columns and the `read → is_read` rename exist in no repo migration. Do you have the out-of-band SQL (dashboard history), and should it be backfilled into `supabase/migrations/` before any new schema work touches this table?
4. **useRevisionJobs contradiction.** CLAUDE.md says "left dormant — do not activate", but `TechnicianDashboard.tsx:5,:37` imports and calls it live. Which is authoritative — unwind the activation, or retire the rule?
5. **Dead-code disposition.** `notifyInvoiceOverdue` (zero call sites) and the `report_ready`/`report_approved` EF branches (no callers) — delete, or treat as intended targets for the writer work to wire up? (`docs/NOTIFICATIONS-AND-TRIGGERS.md:126` documents report_approved as active.)
6. **Double-post on booking.** One inspection booking currently produces two Slack messages (`inspection_booked` + the booking-confirmation email's trigger post). Intentional behavior to preserve when events are re-plumbed?
7. **PII policy for in-app rows.** Slack currently receives plaintext customer emails (every email post), up to 500 chars of raw submitted payload (capture failures), and bulk customer names+amounts (digest). Any constraints on persisting this content into `notifications` rows — noting the current INSERT policy lets any authenticated session address a row to any user?
8. **Cancelled-booking scoping.** Cancelling a booking never clears `calendar_bookings.assigned_to`, so the lead stays in the technician's alert feed permanently. Intended, or an accident to correct before technician-facing scoping is formalized?
9. **The `reminder` alert type.** It has no producer anywhere and the only reminder machinery is the 48h customer email. Is a technician-facing pre-job reminder event source in scope for the writer work, or should the type be dropped?
10. **Stale canon docs.** `docs/NOTIFICATIONS-AND-TRIGGERS.md` (dead module/symbol references at `:883-885`, stale event matrix at `:929`) and `docs/edge-function-attribution-manifest.md` (12 vs 14 EFs; contradicted "no DB writes" claim for send-slack-notification) are both cited as canon by CLAUDE.md. Fold corrections into the writer work?
11. **Mock-vs-real copy.** TechnicianAlerts renders raw `activities.title/description` written by ~44 heterogeneous writers, while the mock specified curated technician-facing copy (customer name + address). Should the follow-up treat the mock's copy as the target (implying dedicated notification-writing, not activities reuse for this surface)?

---

## Appendix — verification notes & known limitations

- **Adversarial verification**: every event's file:line, trigger condition, and message format was independently re-checked against the source; 17/17 confirmed, 0 corrections. Missed-sender hunt (10 search strategies incl. `hooks.slack.com`, `SLACK_`, `C0AEU9J7WSC`, `chat.postMessage`, across `src/ supabase/ api/ scripts/ tests/ public/`) found nothing beyond the inventory.
- **Live-DB claims are repo-attested only**, against the project's own pre-flight rule (live introspection was out of scope for this read-only pass and needs explicit PROD confirmation — Open Question 2). Specifically unverified live: the deployed `email_logs_notify_slack` body, the pg_cron schedule, PROD notifications constraints, the 0-rows claim (rests on `docs/TODO.md:1950-1951`), and the possibility of out-of-band writers (the out-of-band column additions prove out-of-band changes happen on this exact table).
- The external Framer site actually POSTing to `receive-framer-lead` is inference from `verify_jwt=false` + naming; its configuration is out-of-repo. Vercel-side deploy→Slack integrations (configured outside the repo) also cannot be ruled out from code.
- Git-history line numbers for the mock (commit `0b259f3`) were confirmed to reference an existing commit; in-commit line numbers were not independently re-verified.
- One agent's `types.ts` line cites for the `activities` Row were off by 1–2 lines; this document uses the corrected cites (`lead_id` :23, `created_at` :20, `description` :21). Substantive claims were unaffected.
- Out of scope by instruction and therefore not investigated here: invoice pipeline logic, the lead pipeline state, Sentry configuration, and shell hooks. Slack sends living in invoice-related code are inventoried as send events only.
