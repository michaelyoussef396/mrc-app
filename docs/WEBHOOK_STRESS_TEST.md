# Webhook Stress Test — 100/100 Zero Silent Data Loss

**Date:** 20/04/2026
**Function:** receive-framer-lead v18
**Endpoint:** `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead`
**Result:** 100/100 PASS — zero silent data loss across all scenarios

## Pass Criteria

**PASS** = admin can recover the submission data via at least ONE of:
1. Lead created in `leads` table
2. Raw payload in `webhook_submissions` table
3. Admin email notification with raw payload
4. Admin Slack alert with raw payload
5. Supabase Edge Function console logs

**FAIL** = data disappeared with zero trace across all 5 channels.

## Defence Architecture

```
Framer Form POST
        |
        v
[1] Raw payload → webhook_submissions (BEFORE any processing)
        |
        v
[2] Body size check (>50KB → 413 + email + Slack)
        |
        v
[3] Rate limit check (>5/hr → 429 + email + Slack)
        |
        v
[4] Parse body (JSON / form-data / URL-encoded / fallback)
        |
        v
[5] Smart field extraction (30+ field name aliases)
        |
        v
[6] Zod validation (fail → 400 + email + Slack)
        |
        v
[7] Duplicate check (email+phone in 24h → 200 idempotent)
        |
        v
[8] Insert lead with retry (3x, exponential backoff)
        |
   success → status=processed, lead_id linked
   failure → status=failed + email + Slack (both channels)
        |
        v
[9] Fire-and-forget: Slack alert + customer confirmation email
```

Every POST is logged to `webhook_submissions` at step [1] — before any processing. Even if every subsequent step crashes, the raw payload is preserved.

## Notification Matrix

| Scenario | Lead | DB Log | Email | Slack | Console |
|---|---|---|---|---|---|
| Valid submission | Yes | processed | N/A | New Lead alert | Yes |
| Duplicate | No | duplicate | N/A | N/A | Yes |
| Validation fail | No | failed | Yes | Yes | Yes |
| DB insert fail | No | failed | Yes | Yes | Yes |
| Body too large | No | failed | Yes | Yes | Yes |
| Rate limited | No | rate_limited | Yes | Yes | Yes |
| Parse crash | No | failed | Yes | Yes | Yes |
| Top-level error | No | failed | Yes | Yes | Yes |
| GET/OPTIONS/405 | N/A | N/A | N/A | N/A | N/A |

**v18 fixes:** Body-too-large and rate-limited now fire BOTH email + Slack (previously had gaps).

## 100 Test Scenarios

### Core Attacks (1-10)

| # | Scenario | HTTP | Logged | Notified | Pass |
|---|---|---|---|---|---|
| 1 | Empty POST body | 500 | Yes (failed) | Email+Slack | PASS |
| 2 | Invalid JSON `{bad` | 500 | Yes (failed) | Email+Slack | PASS |
| 3 | Valid lead submission | 200 | Yes (processed) | N/A | PASS |
| 4 | Empty JSON `{}` | 400 | Yes (failed) | Email+Slack | PASS |
| 5 | Only email field | 400 | Yes (failed) | Email+Slack | PASS |
| 6 | XSS `<b>bold</b>` | 200 | Yes (processed) | Tags stripped | PASS |
| 7 | Unicode characters | 200 | Yes (processed) | Preserved | PASS |
| 8 | Wrong Content-Type XML | 400 | Yes (failed) | Email+Slack | PASS |
| 9 | Null required fields | 400 | Yes (failed) | Email+Slack | PASS |
| 10 | Whitespace-only name | 400 | Yes (failed) | Email+Slack | PASS |

### Dates & Validation (11-20)

| # | Scenario | HTTP | Logged | Result | Pass |
|---|---|---|---|---|---|
| 11 | Duplicate (same email+phone) | 200 | Yes (duplicate) | Dedup, lead_id linked | PASS |
| 12 | Invalid date "not-a-date" | 200 | Yes (processed) | Date cleared to null | PASS |
| 13 | Invalid email format | 400 | Yes (failed) | Zod caught | PASS |
| 14 | Extra unknown fields | 200 | Yes (processed) | Extras ignored | PASS |
| 15 | Nested JSON objects | 200 | Yes (processed) | toStr extracts first | PASS |
| 16 | Invalid leap year 29/02/2025 | 200 | Yes (processed) | Date cleared to null | PASS |
| 17 | Valid leap year 29/02/2028 | 200 | Yes (processed) | Date accepted | PASS |
| 18 | Invalid date 31/04/2026 | 200 | Yes (processed) | Date cleared to null | PASS |
| 19 | Far future 01/01/2099 | 200 | Yes (processed) | Accepted | PASS |
| 20 | Past date 01/01/2020 | 200 | Yes (processed) | Accepted | PASS |

### Phone Formats & Type Coercion (21-30)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 21 | +61 international format | 200 | Accepted | PASS |
| 22 | Phone with spaces | 200 | Accepted | PASS |
| 23 | Landline (03) format | 200 | Accepted | PASS |
| 24 | 1800 number | 200 | Accepted | PASS |
| 25 | Email with +tag | 200 | Accepted | PASS |
| 26 | Array value for Name | 200 | First element extracted | PASS |
| 27 | Numeric name 12345 | 200 | Coerced to string | PASS |
| 28 | Boolean phone true | 400 | "true" fails min(8) | PASS |
| 29 | Alias full_name/phone_number | 200 | Matched | PASS |
| 30 | Alias Your Name/Mobile | 200 | Matched | PASS |

### Field Aliases & Special Characters (31-40)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 31 | ALL CAPS field names | 200 | Case-insensitive match | PASS |
| 32 | Contact Number alias | 200 | Matched | PASS |
| 33 | Property Address alias | 200 | Matched | PASS |
| 34 | Backslash in message | 200 | Stored correctly | PASS |
| 35 | Ampersand & in message | 200 | Stored correctly | PASS |
| 36 | Quotes in message | 200 | Stored correctly | PASS |
| 37 | PUT method | 405 | Rejected (N/A) | PASS |
| 38 | PATCH method | 405 | Rejected (N/A) | PASS |
| 39 | DELETE method | 405 | Rejected (N/A) | PASS |
| 40 | Semicolons in message | 200 | Stored correctly | PASS |

### Content Types & Headers (41-50)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 41 | URL-encoded form data | 200 | Parsed correctly | PASS |
| 42 | Content-Type text/plain | 200 | JSON fallback | PASS |
| 43 | No Content-Type header | 200 | Fallback parsing | PASS |
| 44 | Explicit charset=utf-8 | 200 | Accepted | PASS |
| 45 | Evil Origin header | 200 | CORS * (public) | PASS |
| 46 | Empty User-Agent | 200 | No UA check | PASS |
| 47 | X-Forwarded-For spoofing | 200 | Rate limit per IP | PASS |
| 48 | HTML Accept header | 200 | JSON response | PASS |
| 49 | 24-hour time 14:30 | 200 | Accepted | PASS |
| 50 | 12-hour time 9:00 AM | 200 | Accepted | PASS |

### Times & Concurrency (51-60)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 51 | Time with seconds | 200 | Accepted | PASS |
| 52 | Midnight 12:00 AM | 200 | Accepted | PASS |
| 53 | Noon 12:00 PM | 200 | Accepted | PASS |
| 54-56 | 3 concurrent requests | 200x3 | All processed independently | PASS |
| 57 | Apostrophe name O'Brien | 200 | Stored correctly | PASS |
| 58 | Hyphenated Mary-Jane | 200 | Stored correctly | PASS |
| 59 | Short name Jr. | 200 | Passes min(1) | PASS |
| 60 | Body too large (100KB+) | 413 | Email+Slack fired (v18 fix) | PASS |

### Special Characters & International (61-70)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 61 | Pipe characters | 200 | Stored correctly | PASS |
| 62 | JSON string in message | 200 | Not double-parsed | PASS |
| 63 | URL in message | 200 | Stored correctly | PASS |
| 64 | Linebreak in message | 200 | Stored with newline | PASS |
| 65 | Tab in message | 200 | Stored with tab | PASS |
| 66 | HTML entities &gt; | 200 | Stored as-is | PASS |
| 67 | Multiple spaces in name | 200 | Stored as-is | PASS |
| 68 | Emoji in name | 200 | Preserved | PASS |
| 69 | CJK characters | 200 | Preserved | PASS |
| 70 | Arabic text | 200 | Preserved | PASS |

### Limits & Edge Formats (71-80)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 71 | 4999-char message (under) | 200 | Accepted | PASS |
| 72 | 5001-char message (over) | 400 | Zod max(5000) | PASS |
| 73 | 200-char name (at limit) | 200 | Accepted | PASS |
| 74 | 201-char name (over) | 400 | Zod max(200) | PASS |
| 75 | Email u.n+tag@example.com | 200 | Valid | PASS |
| 76 | Double JSON in field | 200 | Stored as string | PASS |
| 77 | International phone +1 | 200 | Accepted | PASS |
| 78 | Negative phone prefix | 200 | PHONE_RE allows - | PASS |
| 79 | Trailing comma in phone | 200 | Within 20 chars | PASS |
| 80 | Invalid date 00/00/2026 | 200 | Cleared to null | PASS |

### Spoofing, Encoding, XSS Variants (81-90)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 81 | Invalid date 13/13/2026 | 200 | Cleared to null | PASS |
| 82 | Control chars tab/newline | 200 | Stored | PASS |
| 83 | URL-encoded %20 in suburb | 200 | Stored literal | PASS |
| 84 | Referer spoofing | 200 | Ignored | PASS |
| 85 | Bot User-Agent Googlebot | 200 | No UA filtering | PASS |
| 86 | Homoglyph characters | 200 | Stored as-is | PASS |
| 87 | Zero-width characters | 200 | Stored as-is | PASS |
| 88 | Query param in body | 200 | Parsed from body | PASS |
| 89 | Spaces in field keys | 200 | Matched via normaliser | PASS |
| 90 | Full valid (all 8 fields) | 200 | All fields saved | PASS |

### Final Edge Cases (91-100)

| # | Scenario | HTTP | Result | Pass |
|---|---|---|---|---|
| 91 | Minimal valid (3 fields) | 200 | Sufficient | PASS |
| 92 | Conflicting date fields | 200 | First match wins | PASS |
| 93 | XSS img onerror | 200 | Tags stripped | PASS |
| 94 | CSS injection style tag | 200 | Tags stripped | PASS |
| 95 | SVG onload | 200 | Tags stripped | PASS |
| 96 | Multiline name | 200 | Stored with newline | PASS |
| 97 | Unicode normalisation | 200 | Stored as-is | PASS |
| 98 | RTL override chars | 200 | Stored as-is | PASS |
| 99 | Short timeout (3s max) | 200 | Completed in time | PASS |
| 100 | GET health check | 200 | `{"status":"ok","version":18}` | PASS |

## Vulnerabilities Found & Fixed (Cumulative)

| Version | Bug | Fix |
|---|---|---|
| v16 | Invalid date strings crash DB INSERT | Clear non-ISO dates after normalisation |
| v17 | Null bytes crash Postgres text encoding | stripHtml() strips `\0` |
| v17 | Invalid calendar dates (29/02/2025) crash DB | isValidCalendarDate() verifies Date roundtrip |
| v18 | Body-too-large (413) had no admin notification | Added email + Slack to 413 path |
| v18 | Rate-limited (429) had no admin email | Added email to 429 path (was Slack-only) |
| v18 | webhook_submissions failure had minimal logging | Enhanced console.error with raw payload dump |

## Recovery Procedures for Admin

### If a lead appears in webhook_submissions but NOT in leads:

1. Go to Supabase Dashboard → Table Editor → `webhook_submissions`
2. Filter: `status = 'failed'`
3. Open the row → `raw_payload` column has the full submission
4. Copy the customer's Name, Phone, Email from the payload
5. Go to MRC Admin → Leads → + New Lead → paste the details
6. Update the `webhook_submissions` row status to `'manually_recovered'`

### If webhook_submissions is also empty (Supabase outage):

1. Check Supabase Dashboard → Edge Functions → Logs → `receive-framer-lead`
2. Search for `CRITICAL: webhook_submissions insert failed. Raw payload:` in logs
3. The raw payload is in the log entry — extract and manually create the lead

### If admin email was received:

1. The email subject is "LEAD CAPTURE FAILURE — Manual Follow-up Required"
2. The email body contains the full raw payload + error message
3. Create the lead manually from the payload data

## Unrecoverable Scenarios (theoretical)

These scenarios would result in true data loss — none are practically exploitable:

1. **Supabase Edge Functions completely down** → Framer gets a connection error, form shows an error to the customer. The customer would retry or call 1800 954 117.
2. **Both Supabase DB AND Edge Function logs down simultaneously** → Infrastructure-level outage. Framer still shows error to customer.
3. **Framer itself drops the request before it reaches our endpoint** → Out of our control. Framer's own reliability is the bottleneck here.

In all three cases, the customer sees an error and can call the business directly.
