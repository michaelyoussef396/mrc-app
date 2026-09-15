# Decision 1 — send-email cooldown → idempotency key

Read-only analysis by `[decisions-1-2]`, MRC Session 2, 2026-09-15. Nothing here is implemented.
Every code citation is `path:line` at tag `candidate/2026-09-15-587415e` (`587415e`), read with
`git show "${T}:<path>"`. Docs are read from `/Users/michaelyoussef/mrc-integration/docs`.
Anything not verifiable statically is marked **UNVERIFIED** with what would verify it.

Rulings this document obeys (Michael, 2026-09-15, `docs/sessions/2026-09-15-integration-2026-09-15.md`):

- F/C rule (`:562`): "fail when the caller can act, continue when they can't — and continue only with the failure written to error_logs or the timeline, never console-only, never shown as success."
- E rulings (`:572`): E-Q1 continue + `error_logs` write on audit-insert failure; E-Q2 (b) recipient cooldown writes rows, hourly gate logs once per window to `error_logs`; E-Q3 migration then function, per project, DEV then PROD, trigger and timeline render `suppressed` as suppressed; E-Q5 recorded under P0-5, "the send-email auth session moves up and takes the cooldown decision with it."
- X-Q1 (`:578`): P0-14 stays open until a suppressed confirmation reaches the sender as a failed status.
- Tracker rows: `docs/TODO.md:37` (L-E2), `:44` (deploy note c), `:110` (P0-5), `:119` (P0-14), `:120` (P0-15).

---

## 1. Premise check — where the code agrees and where it disagrees

Michael's premise: *recipient + templateName is DEAD as a dedupe key. Booking and rescheduling share one templateName (BookJobSheet.tsx:470-494 and 549-593), so a key on it still blocks the reschedule, and the failure reaches only the console.*

### 1.1 Confirmed at the tag

| Claim | Code | Verdict |
|---|---|---|
| Booking and rescheduling share one templateName | `src/components/leads/BookJobSheet.tsx:488` writes `job_rescheduled` vs `job_booked` to `activities`, but `:576` sends `templateName: 'job-booking-confirmation'` on both branches; there is no `isReschedule` in the email block `:549-580` | **CONFIRMED** |
| The failure reaches only the console | `:577-579` `.catch((err) => console.error('[BookJobSheet] Failed to send confirmation email:', err))` | **CONFIRMED** |
| …and is shown as success | `:589-593` `toast.success('Job booked…' / 'Job rescheduled…')` runs regardless; the email is a floating promise (`:551-580`, never awaited), so the outer `catch` at `:597-604` cannot see it | **CONFIRMED, and stronger than the premise** — it violates both halves of the F/C rule ("never console-only, never shown as success") |
| A lead with no email address | `:557` `if (!leadData?.email) return` — no `email_logs` row, no toast, no Sentry. Contrast `src/lib/bookingService.ts:312-325`, which writes a `failed` row with `'No email address on file'` for the inspection path | Additional silent-loss path, not in the premise |

### 1.2 Where the code disagrees with the premise

1. **"Dead" is too strong for the P0-14 incident itself.** The P0-14 sequence (`docs/TODO.md:119`) is report-approved at 13:42:33, then the job confirmation at 13:44:33. Those are distinct literals: `'report-approved'` (`src/pages/ViewReportPDF.tsx:1131`, also `src/pages/LeadsManagement.tsx:763`) and `'job-booking-confirmation'` (`BookJobSheet.tsx:576`). A recipient + templateName cooldown would have let the P0-14 confirmation through — the E authoring session recorded exactly this (`docs/sessions/2026-09-12-fix-send-email-cooldown-logging.md:206`). What recipient + templateName does **not** cover is the same-template pair booking → reschedule inside five minutes; that pair is real in code but the session log calls it "a hypothetical example grounded in existing code, not an observed customer incident" (`:212-214`, `:220`). So: recipient + templateName is *insufficient*, not dead — it fixes the observed incident and misses the hypothetical one.

2. **"Booking id" is the wrong entity for job bookings.** `BookJobSheet.tsx:415-421` deletes every `calendar_bookings` row with `event_type = 'job'` for the lead, and `:423-444` inserts fresh rows, **on every submit**. A true double-submit therefore mints *new* booking ids just as a reschedule does. A key that contains the booking id can never dedupe a double-submit and cannot tell a reschedule from a resubmit any better than a random nonce. The stable entity is the job, i.e. the lead (`leadId` prop, `:38`); the multi-day booking rows are derived state. For inspection bookings the premise holds: `bookingService.ts:118-132` inserts exactly one row and returns its id (`:131`, surfaced at `:262`), and there is no reschedule path in `bookingService.ts` at the tag (grep: no `reschedul` in that file; `src/components/schedule/LeadBookingCard.tsx:543` calls `bookInspection`, so an inspection "reschedule" is a second `bookInspection` with a second booking id and a second confirmation).

3. **Consequence for the key.** Because the entity for job bookings must be the lead, the *content hash* is what separates "same schedule again" (duplicate) from "different schedule" (reschedule). The hash is load-bearing, not decorative — see §3.3.

### 1.3 Today's recipient cooldown and hourly gate — the trace

`supabase/functions/send-email/index.ts` at the tag (the E unit, `4c81afa`, is in the candidate):

| Step | Lines | What happens |
|---|---|---|
| IP limiter | `:14-28`, applied `:125-133` | 10 requests / minute / `x-forwarded-for`; in-memory, per isolate; 429 before body validation |
| Schema | `:30-60` | `from` optional and unvalidated `:34`; `userId` client-supplied `:43`; `bypassRecipientRateLimit` `:59`; **no entity id field exists** |
| Service-role client | `:172-174` | all reads/writes bypass RLS |
| `suppressionResponse` | `:176-199` | inserts an `email_logs` row `status: 'suppressed'` (`:182`), reason in `error_message` (`:185`), `sent_by: userId` (`:188`, client-supplied); on insert failure `console.error` with the whole error object (`:193`, E-F1); returns HTTP 429 `{error: reason}` (`:195-198`) |
| Recipient cooldown | `:201-216` | unless `bypassRecipientRateLimit` (`:203`): any `email_logs` row with `recipient_email = to`, `status = 'sent'`, `sent_at` within 5 minutes (`:204-211`) → `suppressionResponse('Rate limit: wait 5 minutes before resending to same recipient')` (`:214`). Template, lead, entity are not consulted |
| Hourly gate | `:218-228` | count of `status = 'sent'` rows in the last hour (`:220-224`) ≥ 100 → suppressed row + 429 (`:227`). E-Q2 (b) moves this to a once-per-window `error_logs` write in L-E2 |
| Send | `:231-238` via `sendWithRetry` `:69-118` | no `Idempotency-Key` header (`:79-86`); 4xx except 429 is non-retryable (`:98-101`); 5xx/429 retried 3× with 1 s/2 s backoff (`:112-114`) |
| Audit insert | `:241-253` | **after** the send; `status` = `sent`/`failed` (`:245`); `sent_at = now` (`:252`) |
| Response | `:255-261` failure (status passthrough), `:263-266` success `{success, emailId}` |

Race: the cooldown and hourly checks read `email_logs` (`:205-211`, `:220-224`) and the audit row is written only after Resend answers (`:241-253`). Two concurrent identical requests both pass the check and both send. This is the check-then-send race point 5 closes.

### 1.4 What each caller sees today on a 429 / failure

`sendEmail()` in `src/lib/api/notifications.ts:324-349` is **not** fire-and-forget despite its JSDoc (`:319`, tracked as PDF-CL14): it throws with the server's `error` string (`:335-343`) or `data.error` (`:345-348`).

| Caller | Template | On throw the user sees | Timeline row | Can the caller act? |
|---|---|---|---|---|
| `BookJobSheet.tsx:571-579` | `job-booking-confirmation` | nothing; `console.error` `:578`; success toast `:589-593` | only what send-email wrote (suppressed/failed) — titled "sent" by `src/hooks/useActivityTimeline.ts:180` until L-E2 | yes (resend, phone) → today violates F/C twice |
| `bookingService.ts:328-345` | `booking-confirmation` | nothing; `captureBusinessError` → Sentry `:341-344`; called `void` `:252` | same as above | yes → console/Sentry-only |
| `ViewReportPDF.tsx:1125-1134` (`:1160-1166`) | `report-approved` | `toast.error(serverMessage)` — the 429 text reaches the admin | same | yes → already fails visibly; explicit bypass via `DuplicateSendDialog` `:1046-1057` sets `bypassRateLimitRef` `:1051` → `:1133` |
| `ViewReportPDF.tsx:1284-1296` (`:1326-1332`) | `job_report_sent` | `toast.error(msg)` | same | yes → fails visibly; same bypass `:1295` |
| `LeadsManagement.tsx:757-769` (`:796-799`) | `report-approved` (legacy, base64 attachment) | generic `'Failed to send email. Please try again.'` | same | yes → fails visibly, reason lost |
| `LeadDetail.tsx:2677-2682` via `notifications.ts:618-632` | `google_review_request` | **UNVERIFIED** — the `catch` is beyond `:2700` (not read); the status update at `:2684-2686` is skipped on throw | same | yes |

Downstream labels today: the Slack/notification trigger (`supabase/migrations/20260823090000_notifications_fan_out.sql:251-258`, `:283-291`) posts "`<label> sent | <recipient>`" and fans out `email_sent` for any status other than `failed`, so a `suppressed` (or a future `pending`) row is announced as **sent**; `useActivityTimeline.ts:180` titles it "sent". E-Q3 assigns both fixes to L-E2 (`docs/TODO.md:37`). This decision depends on L-E2 landing first.

---

## 2. The idempotency key — shape

```
dedupe_key = 'v1:' || templateName || '/' || entityType || ':' || entityId
             || '/' || <Melbourne date of the attempt, YYYY-MM-DD>
             || '/' || left(sha256(normalised(to) || subject || normalised(html) || normalised(attachment paths)), 16)
```

- `templateName` — the existing caller-supplied discriminator (`notifications.ts:26` → `send-email/index.ts:38`, stored as `template_name` `:181`, `:244`). The `custom` default (`:181`, `:244`) never gets a key (§3.2).
- `entityType:entityId` — a **new** request field (`entity: { type, id }`), validated as `z.enum([...])` + `z.string().uuid()`. See §3.2 for the value per caller.
- Date bucket — bounds how long "duplicate" lasts (Resend's own precedent is 24 h, §3.5); alternative in §3.5.
- Content hash — computed **inside send-email over the payload it actually sends**, never accepted from the client (§3.3, §3.7).
- Normalisation — `to` lower-cased and trimmed; attachment `path` URLs and any storage URL inside `html` stripped of `?token…` with the existing regex in `supabase/functions/_shared/reportHash.ts:6-11` (identical copies `src/lib/utils/reportHash.ts:14-19`, `api/_shared/reportHash.ts:7-12`).

Length: ≈ 90–110 characters; inside Resend's 256-character key limit if reused as the provider key (§3.5).

Behaviour: same key → the second attempt is a no-op that is **visible** (suppressed row, reason `idempotent_duplicate`, response `deduplicated: true` with the original `emailId`); different hash (a reschedule changes dates/time/technician/address in `buildJobBookingConfirmationHtml`, `notifications.ts:268-289`, and the subject, `BookJobSheet.tsx:558`) → sends.

---

## 3. The eight points

### 3.1 Point 1 — where the key persists

**Recommendation: a column on `email_logs` plus a partial unique index. It is a migration.**

```
ALTER TABLE public.email_logs ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX email_logs_dedupe_key_active_uidx
  ON public.email_logs (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'sent', 'delivered');
```

(Described, not written; a new append-only file under `supabase/migrations/`, Michael-applied. Ordering per the E ruling: DEV then PROD, migration before function (`docs/TODO.md:44`; `AGENTS.md` "Repository facts" records PROD-first as the *usual* order — the E ruling is the one to follow for this table). The E-Q4 constraint check (`docs/TODO.md:44`) is unaffected: this adds an index, not a CHECK.)

Why a column rather than a separate table:

- The `email_logs` row **is** the claim (point 5): `INSERT … status='pending'` either succeeds (this attempt owns the key) or raises 23505 (someone else does). One write, one row, one audit record; no join for the timeline (`useActivityTimeline.ts:101-105`), the history panels, or the Slack trigger.
- The partial predicate makes `failed`/`suppressed` rows non-blocking: a retry after a real failure inserts a new row under the same key. An `UPDATE pending → failed` drops the row out of the index atomically.
- `email_logs.metadata jsonb` already exists (`20251111000008_create_email_logs_table.sql:44`; `src/integrations/supabase/types.ts:369`) for `suppression_reason`, `duplicate_of`, `resend_of` — no further schema.
- Against a separate `email_sends(key PK, email_log_id)` table: cleaner claim semantics on paper, but two writes per send, a second table for the readers and the trigger, and the claim can drift from the audit row. Not worth it.

Index note: the existing single-column index `idx_email_logs_recipient_email` (`:61`) already serves the cooldown query; the new index serves the 23505 path only.

### 3.2 Point 2 — every caller at the tag, and the entity component

| Template | Call site | Ids available at the call site | Proposed `entityType:entityId` | Key? |
|---|---|---|---|---|
| `job-booking-confirmation` | `BookJobSheet.tsx:571-576` | `leadId` `:38`; `insertedBookings[].id` `:440-443` (volatile, §1.2); `lead_number` `:553`; schedule/tech/address | `lead:<leadId>` | **yes** — the P0-14 class |
| `booking-confirmation` | `bookingService.ts:328-339` (inside `sendBookingConfirmationEmail` `:299-346`) | `leadId`; `bookingData.id` is created at `:118-132` **before** the send but is not passed into `sendBookingConfirmationEmail` (`:252-258`) — one extra param | `booking:<calendar_bookings.id>` | **yes** |
| `report-approved` | `ViewReportPDF.tsx:1125-1134` | `lead.id`, `inspection.id`, hard-save `version.id`, recipient | `inspection_version:<version.id>` | **yes**; override already exists (`:1018-1041` guard → `DuplicateSendDialog` `:2857` → `:1051`) |
| `report-approved` (legacy) | `LeadsManagement.tsx:757-769` | `emailTargetLead.id`, `inspection.id`; **no version id** — HTML converted client-side (`:729-742`), base64 attachment `:764-768` | `inspection:<inspection.id>` (the hash covers subject + html; the base64 attachment content must be **excluded** from the hash — it differs per conversion) | yes; the path itself is the legacy send that bypasses the hard-save guard (memory note) — retiring it is the better fix |
| `job_report_sent` | `ViewReportPDF.tsx:1284-1296` | `lead.id`, `jobCompletion.id`, hard-save `version.id` | `job_version:<version.id>` | **yes**; override exists (`:969-992`, `:1046-1057`) |
| `job_report_sent` (helper) | `notifications.ts:396-414` `sendJobReportEmail` | `leadId`, `jobNumber`, `pdfUrl` | — | **no caller at the tag** (grep finds only the definition) → dead code; nothing to key |
| `google_review_request` | `LeadDetail.tsx:2677-2682` via `notifications.ts:618-632` | `lead.id`, `job_number` `:2667-2675` | `lead:<lead.id>` | yes — one request per job is the intent (`:2684-2686` flips status to `google_review`); a second is a resend → override |
| `inspection_reminder` | `supabase/functions/send-inspection-reminder/index.ts:399-405` | `booking.id` | already keyed **at Resend**: `Idempotency-Key: inspection-reminder/<booking.id>` (`:392-396`, header `:172`), plus an atomic claim (`docs/TODO.md:312` cites `:328-351`) | **not a send-email caller**; no send-email key. Optional: populate `email_logs.dedupe_key` from `:407-415` for uniformity (EF frozen; separate unit) |
| `framer_lead_confirmation` | `supabase/functions/receive-framer-lead/index.ts:938-972` | lead id | direct Resend call, **no** `Idempotency-Key` (`:943-953`); logged via `:914-935` | not a send-email caller. Gap: webhook redelivery (P0-C class, `docs/TODO.md:312`) can double-send; `Idempotency-Key: framer-lead-confirmation/<leadId>` would close it — separate unit, EF frozen |
| admin "LEAD CAPTURE FAILURE" | `receive-framer-lead/index.ts:415-440` | none | — | no key: internal alert, duplicates acceptable |
| invoices, incl. overdue | **none at the tag**: `check-overdue-invoices/index.ts` posts Slack (`:141-155`) and in-app fan-out (`:496-533`) only; `src/` has no invoice `sendEmail`/`mailto` (grep) | — | — | no caller → no key. Note P2-47 (`docs/TODO.md:222`): PROD `invoices` has zero rows |
| `custom` (no `templateName`) | any caller omitting it — at the tag none in `src/`; only the unauthenticated relay (P0-5) | none | — | **no key**; falls to the recipient cooldown + hourly gate. After P0-5 such callers cannot reach the function |

Two wrapper changes follow: `SendEmailParams` (`notifications.ts:18-41`) gains `entity?: { type, id }`, and the six `src/` call sites pass it. Callers that omit `entity` keep today's behaviour (cooldown), which is the migration path.

### 3.3 Point 3 — hash of template inputs vs hash of rendered output

| | Hash of inputs (date/time/technician/address fields) | Hash of rendered output (subject + html + to + attachment paths, normalised) |
|---|---|---|
| Who computes it | Either the client (forgeable, §3.7) or send-email after reading the entity rows itself (one DB read per template, per-template field lists inside a relay that today knows nothing about bookings) | send-email, over the bytes it is about to POST — no DB read, no template knowledge |
| Miss a field | **Silent loss**: a reschedule that changes only an unlisted field hashes equal → no-op → P0-14 class | Impossible by construction: if the message bytes differ, it sends; if they are identical, it *is* a duplicate |
| Unrelated template edit | No effect | Two attempts straddling a deploy of `wrapInBrandedTemplate` (`notifications.ts:105`) hash differently → one **extra** send (safe direction) |
| Timestamps / links in the output | n/a | The builders contain no `Date`, `Math.random` or `randomUUID` (grep over `notifications.ts` at the tag); the job-booking subject carries `dateRange` and `lead_number` (`BookJobSheet.tsx:558`), which are inputs, not volatility. Attachment `path` signed URLs rotate per attempt → strip `?token…` with the existing normaliser; base64 `content` attachments (legacy path) → exclude from the hash |
| Corrected customer name / address between attempts | Depends on the field list | Sends again — the customer sees corrected details (correct) |
| Admin-typed `customMessage` (`ViewReportPDF.tsx:1119`, `:1278`) | Not an input → two different messages collide | Part of the message → distinct |

**Recommendation: hash of rendered output**, computed server-side in send-email with the normaliser. Its only failure mode is an occasional extra send across a template deploy; the input hash's failure mode is the exact silent loss this decision exists to remove.

### 3.4 Point 4 — a legitimate identical resend ("customer didn't get it")

- **Path:** an explicit request flag `resend: { of: <email_logs.id> }`. send-email verifies the referenced row exists, has the same `entity`, `template_name` and recipient, then mints `dedupe_key = <key> || '/resend:' || <original id>` — unique, traceable, and it never disturbs the original row. `metadata.resend_of = <original id>`; the timeline can render "resent (of vN / HH:MM)". The existing `bypassRecipientRateLimit` (`send-email/index.ts:59`, `:203`) is folded into this flag rather than kept as a second override.
- **Who:** admins, checked server-side with `has_role(_user_id, 'admin')` — the RPC `generate-job-report-pdf/index.ts:138-141` already uses — against a **verified** caller identity. At the tag send-email has no verified identity (`userId` is a body field, `:43`; gateway `verify_jwt` accepts the anon key, `docs/TODO.md:120`), so the override is safe only after P0-5. Whether technicians may resend booking confirmations is a bring-to-Michael question (§6).
- **UI:** the `DuplicateSendDialog` pattern (`ViewReportPDF.tsx:1046-1057`) generalised: report sends already have it; booking confirmations need a "Resend confirmation" action on the lead timeline / Book Job sheet (new UI, separate unit).
- **Logged:** a fresh `email_logs` row (status sent/failed, `sent_by` = verified user, `metadata.resend_of`), so the Slack trigger and the timeline see it as an ordinary send with provenance; the original row is untouched.

### 3.5 Point 5 — insert the `email_logs` row BEFORE calling Resend

Sequence inside send-email (replaces `:201-253`):

1. Validate; derive `dedupe_key` (§2) when `entity` is present.
2. Hourly gate **before** any insert (count `status IN ('pending','sent')`, last hour) — a refusal writes no row and logs once per window to `error_logs` (E-Q2 b, unchanged in spirit; counting `pending` too bounds bursts that the current `sent`-only count `:223` lets through).
3. `INSERT … status='pending', dedupe_key, sent_at=now(), metadata={dedupe_key, attempt: 1}` — **this is the claim**.
   - 23505 → read the row holding the key:
     - `sent`/`delivered` → duplicate. Write a `suppressed` row (**no** `dedupe_key`, so it never collides) with `metadata.suppression_reason='idempotent_duplicate'`, `metadata.duplicate_of=<id>`; respond **200** `{success:true, deduplicated:true, emailId:<original provider id>, emailLogId:<original>}`.
     - `pending` younger than the stale window (recommend 10 min, i.e. 3 retries × ≤3 s + slack) → **409** `{error:'send in progress', emailLogId}`; the caller retries later.
     - `pending` older than the stale window → claim it: `UPDATE … SET sent_at=now(), metadata.attempt=attempt+1 WHERE id=<id> AND status='pending' AND sent_at < now()-interval` — exactly one claimant wins (same pattern as the reminder EF's claim, `docs/TODO.md:312`).
4. Recipient cooldown **only for un-keyed sends** (no `entity`): on hit, `UPDATE` the pending row to `suppressed` with the reason — one row per attempt, so "the recipient cooldown writes rows" (E-Q2 b) still holds. Keyed sends skip it: the key is the stronger dedupe, and the two legitimate cases the cooldown blocks (different template within 5 min = P0-14; same template, different content = reschedule) are exactly the ones the key admits. This is "the cooldown decision" the E-Q5 ruling reserved for the auth session — stated here as the recommendation, decided there.
5. `sendWithRetry` with `Idempotency-Key: <email_logs.id>` (per attempt row, not the logical key — see below).
6. `UPDATE` the row → `sent` (`provider_message_id`, `metadata.accepted_at`) or `failed` (`error_message`); on 4xx the row leaves the unique index so a corrected retry can insert.

Interactions:

- **Died mid-send.** The pending row stays; the next attempt hits 23505, finds a stale pending row and claims it (step 3). If Resend had actually accepted the first POST, the retry must not send twice: that is what the provider-side `Idempotency-Key` is for, but it only dedupes an *identical payload* — the same key with a different payload is `409 invalid_idempotent_request` and a concurrent same-key request is `409 concurrent_idempotent_requests` (Resend docs, https://resend.com/docs/dashboard/emails/idempotency-keys; keys kept 24 h, ≤256 chars). Report sends carry a fresh signed attachment `path` per attempt (`ViewReportPDF.tsx:1112`, `:1268`), so the payload is **not** byte-stable across attempts → use the **attempt row id** as the Resend key (stable across the 3 in-process retries `:77-115`, which reuse the same payload object) and accept that a claim after a lost response can double-send once within the stale window. The same trade-off is documented in `send-inspection-reminder/index.ts:427-440`.
- **`sent_at` semantics.** Keep `sent_at` = attempt time at insert (as `:189`, `:252` do today): the timeline orders by it (`useActivityTimeline.ts:104`, `:186`) and the cooldown filters on it (`:210`); a NULL would float pending rows to the top. Record provider acceptance in `metadata.accepted_at`.
- **The AFTER INSERT trigger.** `email_logs_after_insert_slack` fires on INSERT only (`20260527023540_email_logs_slack_notify_trigger.sql:79-82`) and its body treats everything but `failed` as "sent" (`20260823090000:251-258`, `:283-291`). With pending-first it would announce "sent" at the pending insert and **never see** the later `failed`. The trigger must become `AFTER INSERT OR UPDATE OF status … WHEN (NEW.status <> 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status))` and post once per terminal transition. That is a migration, and it is the same function L-E2 is already rewriting for E-Q3 — it belongs in that migration, not a fourth one.
- **CHECK constraint.** `pending` has been a permitted status since the table was created (`20251111000008:27-28`); no change beyond `20260912000000` (`suppressed`).
- **Hourly gate under E-Q2 (b).** Unchanged: it never writes a row; with step 2 before step 3 a cap refusal leaves no pending row behind.
- **Attribution.** `sent_by` is still the client-supplied `userId` until P0-5 verifies the JWT; pending-first does not change that.

### 3.6 Point 6 — a key hit reuses `suppressed` with a reason

- The CHECK after `20260912000000_email_logs_suppressed_status.sql:5-10` (header `:1` "NOT APPLIED", Michael applies DEV then PROD after the E-Q4 `pg_constraint` read, `docs/TODO.md:44`) already permits `suppressed`; `pending` is original. **No new status, no further CHECK migration.**
- Reason: `metadata.suppression_reason ∈ {'idempotent_duplicate', 'recipient_cooldown'}` (the hourly cap writes no row, E-Q2 b), plus `metadata.duplicate_of` / `metadata.dedupe_key`. Keep the human string in `error_message` (`:185`) for readers that show it (`InspectionReportHistory` renders raw status text; the timeline shows `e.subject`, `:181`).
- What the Slack trigger and the timeline show after E-Q3: "`<label> suppressed | <recipient>`" and a `suppressed` title. For an `idempotent_duplicate` that is the truth, but a Slack post per double-click is noise; recommendation: the trigger skips Slack/fan-out when `NEW.metadata->>'suppression_reason' = 'idempotent_duplicate'`, and the timeline keeps the row. Bring-to-Michael (§6) — it trades visibility for noise.

### 3.7 Point 7 — the unauthenticated relay

Facts at the tag: `supabase/config.toml` has no `[functions.send-email]` block (grep: only `receive-framer-lead` `:14-15` and `send-slack-notification` `:20-21` set `verify_jwt = false`), so the gateway default `verify_jwt = true` applies, and the tracker records that this "accepts the public anon key" (`docs/TODO.md:110` P0-5, `:120` P0-15; memory: confirmed live 2026-08-27). Inside the function nothing verifies a caller: `userId` is a body field (`:43`), `from` is free text (`:34`), the client is service-role (`:172-174`). E-Q5 (`docs/sessions/2026-09-15-integration-2026-09-15.md:395`) records the uncapped fan-out this already permits.

The forged-key attack: an attacker who can reach the relay and knows the victim's `entity` id pre-sends a message under the victim's key; when the real confirmation arrives it is "a duplicate" and no-ops — the customer receives the attacker's message instead of the confirmation.

- If the key (or the hash) is **client-supplied**, the attacker sets it freely. Never accept a client key.
- If the key is derived **server-side from the entity id plus a hash of the payload sent** (§3.3), the attacker must reproduce the exact subject + html — which requires the booking data (dates, technician, lead number, address). Anyone with read access to `leads`/`calendar_bookings` can; an anonymous caller cannot guess it.
- A server-side key derived from **DB rows** (send-email reads the booking itself) does not help either: a key dedupes, it does not authenticate — whoever can call the relay can occupy the key.
- Today's equivalent already exists: the recipient cooldown lets an anonymous caller block a victim's real emails for 5 minutes with one bogus send to the address (`:205-215`). The key widens that from "5 minutes, needs the email address" to "the key window, needs the entity UUID and the content". Same class, different reach.

**Where the key must be derived:** inside send-email, from `(templateName, entity)` in the request plus the hash of the payload the function is about to send. Never from a client-supplied key or hash.

**Ship order:** the *recording* half (pending-first rows, suppressed rows with reasons, `error_logs` writes) is safe to ship before P0-5 — it adds audit, not capability. The *no-op-on-hit* half is not: it lets an unauthenticated caller make the function skip a real send, and the only defence is a verified caller identity — which is P0-5 (JWT verified inside the function; `sent_by` from the token, not the body; `has_role` for the override). Recommendation: **one unit with P0-5, after it**, which is what the E-Q5 ruling already says ("the send-email auth session moves up and takes the cooldown decision with it"). Shipping the key before P0-5 buys P0-14's collision fix a few days earlier at the cost of a new anonymous denial-of-confirmation path; not worth it.

### 3.8 Point 8 — what the caller sees; does this close P0-14?

Under the F/C rule, per outcome:

| Outcome | Response | BookJobSheet must | Can the caller act? |
|---|---|---|---|
| Key hit, true duplicate | 200 `{deduplicated:true, emailId, emailLogId}` | show an informational toast "Confirmation already sent at HH:MM"; **no** error | No (customer already has it) → continue, truthfully labelled; the suppressed row makes it visible on the timeline |
| Send in progress | 409 | toast "Confirmation is already being sent"; no retry loop | No |
| Recipient cooldown (un-keyed only), hourly cap, Resend 4xx/5xx after retries | 429 / 4xx / 5xx with `error` | `toast.error('Job booked — confirmation email NOT sent: <reason>')` + `captureBusinessError`; the booking toast must not claim the email went out | **Yes** (resend later, phone the customer) → fail visibly. The booking itself stays committed (`:440-474` ran before the email), so nothing rolls back |
| No email on file (`:557`) | — | write a `failed` row like `bookingService.ts:315-324` and toast it | Yes |

Concretely `BookJobSheet.tsx:551-580` stops being a floating promise: await the email after the booking commit, route its rejection to a toast and Sentry, and split the success toast (`:589-593`) so "Job booked" and "confirmation sent" are separate truths.

**Does this close P0-14?** Not on its own.

- The **collision** half closes: report-approved and job-booking no longer share a key, and a same-template reschedule sends because its content differs (§1.2, §3.3).
- The **"reaches the sender as a failed status"** half (X-Q1, `docs/TODO.md:119`) closes only with the `BookJobSheet` change above **and** L-E2's labels (E-Q3), so a suppressed or failed confirmation shows as a failure in the toast, the timeline and Slack.
- Acceptance proof (`docs/TODO.md:119`): on DEV, approve a report then book the job two minutes later → confirmation sent; force a cooldown rejection on an un-keyed send → failed toast + a `suppressed` timeline row + `error_logs` where E-Q1/E-Q2 require it.
- P0-B (bounce recorded as `sent`, `docs/TODO.md:311`) is untouched by this decision.

---

## 4. Recommendation

1. **Key** = `v1:<template>/<entityType>:<entityId>/<Melbourne date>/<16-hex sha256 of normalised to + subject + html + attachment paths>`, derived inside send-email; `entity` is a new validated request field; **job bookings use `lead:<leadId>`** (booking ids are regenerated on every submit, `BookJobSheet.tsx:415-444`); inspection bookings `booking:<id>`; report sends `<inspection|job>_version:<version.id>`; google review `lead:<leadId>`; `custom` and entity-less sends get no key and keep the cooldown.
2. **Persist** as `email_logs.dedupe_key` with a partial unique index over `status IN ('pending','sent','delivered')` — one new migration, DEV then PROD, migration before function.
3. **Pending-first**: the insert is the claim; 23505 → duplicate / in-progress / stale-claim; the row is updated to `sent`/`failed`; Resend `Idempotency-Key` = the attempt row id; hourly gate before the insert; recipient cooldown only for un-keyed sends and applied as an `UPDATE` of the pending row.
4. **Trigger**: `AFTER INSERT OR UPDATE OF status`, ignore `pending`, fire once per terminal transition — inside L-E2's E-Q3 migration.
5. **Key hit** = `suppressed` row with `metadata.suppression_reason='idempotent_duplicate'` + `duplicate_of`; response 200 `deduplicated:true`; timeline shows it; Slack/fan-out skips it (Michael to confirm).
6. **Override** = `resend: { of }`, admin-only via `has_role` on a verified JWT; new key suffix; `metadata.resend_of`; `bypassRecipientRateLimit` folded in.
7. **Callers**: BookJobSheet awaits the send, fails visibly on failure, informs on dedup, writes a `failed` row when there is no email; `bookingService.sendBookingConfirmationEmail` receives the booking id; the six `src/` call sites pass `entity`.
8. **Order**: ships with P0-5 (send-email auth), after L-E2. Not before.

## 5. Stays open

- **P0-14** — until L-E2 lands (labels, `suppressed` rows, E-Q1/E-Q2 `error_logs`), this unit lands with the `BookJobSheet` change, and the DEV/PROD acceptance sequence in §3.8 is shown.
- **P0-5** — send-email auth; this decision depends on it and does not implement it.
- **P0-15** — sibling security row; unaffected.
- **P0-B** — bounce reconciliation; unaffected.
- **P0-C** — pg_net redelivery double-fires; `receive-framer-lead` still sends without a provider idempotency key (`:943-953`).
- **Legacy `LeadsManagement.tsx:757-769` send path** — keyed weakly (no version id); retiring it is the real fix.
- **`sendJobReportEmail`** (`notifications.ts:396-414`) — dead at the tag; delete or wire, not keyed.
- **Timeline icon** — `useActivityTimeline.ts:69-70` gives unknown statuses (`suppressed`, `pending`) the green `Mail` icon; L-E2 owns the label, the icon should follow.

## 6. Questions for Michael (bring-to-Michael only)

1. **Duplicate window**: same-day bucket in the key (recommended; a midnight seam allows one extra send), a 24 h window matching Resend (needs the stale-key retire step, an UPDATE of an old audit row), or indefinite (an identical re-booking weeks later would no-op without the override)?
2. **Keyed sends skip the recipient cooldown** — confirm this is the cooldown decision for the auth session, or keep the cooldown for keyed sends too (then P0-14's sequence still passes, but a booking → reschedule inside 5 minutes is blocked again).
3. **Slack/fan-out on `idempotent_duplicate`**: skip (recommended) or post as `suppressed` like the cooldown rows?
4. **Override role**: admins only, or may technicians resend booking confirmations (who can open `BookJobSheet` is UNVERIFIED here)?
5. **Ship order**: confirm "with P0-5, after L-E2", or authorise the recording half (pending-first + reasons) ahead of P0-5 with the no-op disabled.
6. **`receive-framer-lead` provider idempotency key** (frozen EF): schedule it under P0-C or leave it?

## 7. UNVERIFIED

- Live gateway `verify_jwt` for send-email accepting the anon key — recorded in `docs/TODO.md:110,120` and memory (2026-08-27), not re-tested here. Verify: an anon-key POST to the function returns something other than 401.
- Live `email_logs` CHECK constraint name and value set — E-Q4's `pg_constraint` read (`docs/TODO.md:44`).
- Whether a `suppressed` row at the tag would even land on PROD — depends on `20260912000000` being applied (header `:1` says NOT APPLIED).
- `GoogleReviewSection` failure UX (`LeadDetail.tsx` beyond `:2700` not read).
- Who can open `BookJobSheet` (admin only vs technician) — route/role guard not read.
- Resend's behaviour on `Idempotency-Key` for requests with `attachments[].path` — inferred from the docs' "different payload → 409"; not exercised.
- Live `email_logs_notify_slack` definition matches `20260823090000` — memory says the migration ledger is unreliable; verify with `pg_get_functiondef` before writing the E-Q3 migration.
- The frequency of same-template collisions in PROD history — `decision-1-prod-reads.sql` measures it (counts only; no PII).

## 8. PROD read

`decision-1-prod-reads.sql` (same directory) — four SELECT-only, PII-free queries over `email_logs`: same-recipient sends within five minutes grouped by template pair (does the cooldown ever bite a *same*-template pair, i.e. is the reschedule case real?), the same with lead numbers and timestamps, status × template for the last 30 days, and same-template same-lead sends within 24 h (the would-be duplicate population). They inform §1.2 (how strong "dead" is) and §6 Q1 (the window). Run in PROD Studio; no ref appears in the file.

---

## Rulings — Michael, 2026-09-15 (provisional on the results of `decision-1-prod-reads.sql` Q1–Q4)

Where a ruling differs from this document's recommendation above, the ruling wins. Nothing here is implemented.

1. **Duplicate window: 24 h rolling.**
   - Not a Melbourne calendar day (midnight edge), and not indefinite (a genuinely repeated send weeks later should go).
   - Revisit if the PROD reads show legitimate repeats inside 24 h.
   - *Supersedes* the calendar-date key component in the Recommendation.
   - CC note, a design consequence, not decided: a rolling window cannot be a static part of the key string. The uniqueness check has to be bounded in time, e.g. key holders older than 24 h are retired or excluded.
2. **Keyed sends bypass the 5-minute recipient cooldown.**
   - The hourly cap stays as the abuse backstop until P0-5, at a high threshold, with rejections logged per E-Q2 (no row; `error_logs` once per window).
   - **After P0-5, the recipient cooldown is deleted.**
3. **Duplicate hits do not post to Slack.**
   - The L-E2 trigger skips suppressions whose reason is `duplicate`.
   - Recipient-cooldown suppressions still post: they are the alert.
   - CC note: this document used `idempotent_duplicate`; Michael's ruling names the reason `duplicate`. The unit uses one literal.
4. **Resend override: admin role only for v1**, logged as a timeline event carrying the actor. Widening it to technicians is a Glen/Clayton question.
5. **Ship order: L-E2 → P0-5 → idempotency key → delete the recipient cooldown.** Agreed.
6. **Key derivation: inside the Edge Function, from entity id + template + a hash of the template inputs.**
   - No caller supplies the key.
   - If the framer payload carries no entity id, it is logged as the one unkeyed path until the file is unfrozen.
   - *Supersedes* §3's recommendation to hash the rendered output (normalised to + subject + html + attachment paths): the hash is over template inputs.
   - **CC note (verified at `587415e`), for Michael, not decided:**
     - `receive-framer-lead` does not go through `send-email`. It calls Resend directly: `receive-framer-lead/index.ts:421` (failure email) and `:943` (customer confirmation).
     - A key derived inside `send-email` therefore never sees the framer confirmation, and "the framer send gets one without touching the frozen file" does not hold at the tag.
     - Until that file is unfrozen, the framer confirmation stays unkeyed either way, which the second half of ruling 6 already provides for.

Status: **provisional** until Michael has the PROD read results.
