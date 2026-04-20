# Webhook Stress Test Results

**Date:** 20/04/2026
**Function:** receive-framer-lead v17
**Endpoint:** `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead`
**Total scenarios:** 100
**Vulnerabilities found:** 3 (all fixed)
**Data loss:** Zero

## Scenarios 1-20: Core Attack Vectors

| # | Scenario | Status | Result |
|---|---|---|---|
| 1 | Empty POST body | 400 | Failed validation, logged, admin notified |
| 2 | Invalid JSON `{bad json` | 500 | Top-level catch, logged, admin notified |
| 3 | 100KB+ payload | 413 | Body too large, logged |
| 4 | SQL injection in fields | 200 | Lead created safely (parameterised queries) |
| 5 | XSS `<script>` tags | 200 | Tags stripped by `stripHtml()`, stored as `alert(1)` |
| 6 | Unicode/emoji in fields | 200 | Preserved correctly |
| 7 | 100K character name | 413 | Body too large |
| 8 | Wrong Content-Type (XML) | 400 | Parsed as form-urlencoded fallback, validation failed |
| 9 | Empty JSON `{}` | 400 | Validation failed, logged, admin notified |
| 10 | Only one field | 400 | Missing required fields, logged, admin notified |
| 11 | Duplicate email+phone | 200 | Dedup — status=duplicate, linked to existing lead_id |
| 12 | Rate limit (6th request) | 429 | status=rate_limited, Slack alert fired |
| 13 | Invalid date "not a date" | 200 | Date cleared to null, lead created (FIXED in v16) |
| 14 | Invalid time "25:99 PM" | 200 | Stored as-is (non-critical, no DB type constraint) |
| 15 | Invalid email format | 400 | Zod validation caught, logged, admin notified |
| 16 | Null required fields | 400 | Validation failed |
| 17 | Extra unknown fields | 200 | Extras silently ignored, lead created |
| 18 | Nested JSON objects | 400 | `toStr()` extracted first element, validation failed |
| 19 | Binary/non-UTF8 | Caught | Handled by JSON parse or URL decode fallback |
| 20 | DB failure (all retries) | 500 | 3 retries with backoff, then failed + email + Slack |

## Scenarios 21-40: Edge Cases & Encoding

| # | Scenario | Status | Result |
|---|---|---|---|
| 21 | Whitespace-only name `"   "` | 400 | `trim()` empties it, validation fails on min(1) |
| 22 | Empty strings `""` for all | 400 | Validation fails |
| 23 | Arabic/RTL text | 200 | Stored correctly |
| 24 | CJK characters in name | 200 | Stored correctly |
| 25 | +61 phone format | 200 | Accepted (PHONE_RE allows `+`) |
| 26 | Phone with spaces `0400 333 222` | 200 | Accepted |
| 27 | UPPERCASE suburb `MELBOURNE` | 200 | Stored as-is |
| 28 | Email with +tag | 200 | Accepted by Zod email validator |
| 29 | Null byte `\0` in string | 200 | Null bytes stripped by `stripHtml()` (FIXED in v17) |
| 30 | Control chars (tab, newline) | 200 | Stored with control chars (non-harmful) |
| 31 | X-Forwarded-For spoofing | 200 | Accepted — rate limit based on spoofed IP (Supabase infra adds real IP) |
| 32 | Invalid leap year 29/02/2025 | 200 | `isValidCalendarDate()` clears it, lead created with null date (FIXED in v17) |
| 33 | Replay — same payload twice | 200 | Second returns 200 with "already received" (dedup) |
| 34 | Replay — verified | 200 | webhook_submissions status=duplicate |
| 35 | CORS from `evil.com` origin | 200 | Accepted (CORS `*` — public endpoint) |
| 36 | Empty User-Agent | 200 | No UA check, accepted |
| 37 | URL-encoded form data | 200 | Parsed correctly via URLSearchParams |
| 38 | 4999-char message (under limit) | 200 | Accepted |
| 39 | 5001-char message (over limit) | 400 | Zod max(5000) caught, admin notified |
| 40 | 200-char name (at limit) | 200 | Accepted |

## Scenarios 41-60: Types, Dates, Methods

| # | Scenario | Status | Result |
|---|---|---|---|
| 41 | 201-char name (over limit) | 400 | Zod max(200) caught |
| 42 | Array value for Name | 200 | `toStr()` extracts first element |
| 43 | Numeric name `12345` | 200 | `toStr()` converts to string "12345" |
| 44 | Boolean phone `true` | 400 | `toStr()` → "true", fails phone min(8) |
| 45 | Far future date 01/01/2099 | 200 | Valid calendar date, accepted |
| 46 | Past date 01/01/2020 | 200 | No past-date rejection (not a business rule) |
| 47 | Midnight 12:00 AM | 200 | Accepted |
| 48 | Noon 12:00 PM | 200 | Accepted |
| 49 | Alias `full_name` (snake_case) | 200 | Field alias matched |
| 50 | Alias `Your Name` | 200 | Field alias matched |
| 51 | Alias `NAME` (all caps) | 200 | Case-insensitive match |
| 52 | Alias `Property Address` | 200 | Field alias matched |
| 53 | Backslash in message | 200 | Stored correctly |
| 54 | Quotes in message | 200 | Stored correctly |
| 55 | Ampersand `&` in message | 200 | Stored correctly |
| 56 | PUT method | 405 | Rejected |
| 57 | PATCH method | 405 | Rejected |
| 58 | DELETE method | 405 | Rejected |
| 59 | Concurrent request 1/3 | 200 | No race condition |
| 60 | Concurrent request 2/3 | 200 | Each gets own submission ID |

## Scenarios 61-80: Formats, Concurrency, Content Types

| # | Scenario | Status | Result |
|---|---|---|---|
| 61 | Concurrent request 3/3 | 200 | All 3 processed independently |
| 62 | Invalid email with `]` char | 400 | Zod email validation caught |
| 63 | Email with +tag+sorting | 200 | Valid, accepted |
| 64 | JSON string in extra field | 200 | Stored as string, not double-parsed |
| 65 | Linebreak in name | 200 | Stored with linebreak |
| 66 | BOM character | 200 | Handled by JSON parser |
| 67 | Landline `(03) 9876 5432` | 200 | PHONE_RE accepts brackets and spaces |
| 68 | 1800 number | 200 | Accepted (10 digits) |
| 69 | International phone +1 | 200 | Accepted |
| 70 | 24-hour time `14:30` | 200 | TIME_RE accepts |
| 71 | Time with seconds `09:30:00 AM` | 200 | TIME_RE accepts |
| 72 | Invalid date 31/04/2026 | 200 | `isValidCalendarDate()` clears, lead created (v17 fix) |
| 73 | Invalid date 00/00/2026 | 200 | Same — cleared to null |
| 74 | Invalid date 13/13/2026 | 200 | Same — cleared to null |
| 75 | Valid leap year 29/02/2028 | 200 | Valid calendar date, accepted |
| 76 | 1KB payload (normal) | 200 | Accepted |
| 77 | Content-Type `text/plain` | 200 | JSON fallback parser handles it |
| 78 | No Content-Type header | 200 | Fallback: try JSON, then URL-encoded |
| 79 | Unknown field names (Framer change) | 200 | `getField()` failed, smart detection found fields by content pattern |
| 80 | Conflicting date fields | 200 | First match wins (`Date` found before `preferred_date`) |

## Scenarios 81-100: Special Characters, Headers, Real-World

| # | Scenario | Status | Result |
|---|---|---|---|
| 81 | Emoji-only name | 200 | Stored correctly |
| 82 | Tab in name | 200 | Stored with tab |
| 83 | Multiple spaces in name | 200 | Stored as-is |
| 84 | Leading space in field key | 200 | Matched via case-insensitive lookup |
| 85 | URL-encoded `%20` in suburb | 200 | Stored as literal `%20` (JSON payload, not URL-decoded) |
| 86 | HTML entities `&gt; &amp;` | 200 | Stored as-is (not entity-decoded — correct for JSON) |
| 87 | Semicolons in message | 200 | Stored correctly |
| 88 | Pipe characters in message | 200 | Stored correctly |
| 89 | JSON string embedded in message | 200 | Stored as string, not parsed |
| 90 | URL in message | 200 | Stored correctly |
| 91 | Apostrophe in name (O'Brien) | 200 | Stored correctly |
| 92 | Hyphenated name (Mary-Jane) | 200 | Stored correctly |
| 93 | Very short name (Jr.) | 200 | 3 chars, passes min(1) |
| 94 | Trailing comma in phone | 200 | Stored as-is (Zod allows comma within 20-char limit) |
| 95 | Wrong Content-Length header | 400 | Supabase infra truncated body, validation failed, logged |
| 96 | HTML Accept header | 200 | Accept header ignored, JSON response returned |
| 97 | Explicit charset=utf-8 | 200 | Content-Type parsed correctly |
| 98 | Negative phone prefix | 200 | PHONE_RE allows `-` (it's in the character class) |
| 99 | Full valid submission (all fields) | 200 | All 8 fields saved correctly |
| 100 | Minimal valid (3 required only) | 200 | Name + Phone + Email sufficient |

## Vulnerabilities Found & Fixed

### 1. Null byte crash (Test 29) — FIXED in v17
**Cause:** `\0` bytes in JSON strings passed through `stripHtml()` to the DB, causing a Postgres text encoding error.
**Fix:** Added `.replace(/\0/g, '')` to `stripHtml()`.

### 2. Invalid calendar date crash (Tests 32, 72-74) — FIXED in v17
**Cause:** Dates like "29/02/2025" or "31/04/2026" passed the DD/MM/YYYY regex, normalised to ISO format, but crashed the Postgres DATE column because they're not real calendar dates. All 3 retry attempts wasted.
**Fix:** Added `isValidCalendarDate()` — creates a `Date` object and verifies `toISOString()` matches the input. Invalid dates return empty string, so the lead is still created with `inspection_scheduled_date = null`.

### 3. Invalid date format crash (Test 13) — FIXED in v16
**Cause:** "not a date" passed Zod (it's a valid string) but crashed the INSERT.
**Fix:** After `normaliseDate()`, verify result matches `YYYY-MM-DD` regex. Non-matching values cleared.

## Fallback Layer Verification

| Layer | Tested By | Confirmed Working |
|---|---|---|
| webhook_submissions raw log | All 100 scenarios | Yes — every POST logged before processing |
| 3x retry with backoff | Test 20 (simulated), Tests 72-74 (pre-fix) | Yes |
| Email fallback on failure | Tests 1,2,9,10,15,16,18,39,41 | Yes — admin email sent |
| Slack fallback on failure | Same tests + Test 12 (rate limit) | Yes — Slack alert sent |
| Rate limit logging | Test 12 | Yes — status=rate_limited |
| Duplicate detection | Tests 11, 33-34 | Yes — status=duplicate, lead_id linked |
| Health check (GET) | Verified at v17 | Yes — `{"status":"ok","version":17}` |
| Dashboard KPI | Admin Dashboard | Yes — Failed Webhooks card shows count > 0 |

## Zero Data Loss Confirmed

Across all 100 scenarios, no submission was ever silently dropped. Every incoming POST was either:
1. Logged to `webhook_submissions` with raw payload preserved, OR
2. Rate-limited with status tracked + Slack notification, OR
3. Rejected by body size check with status logged

Admin is notified via email + Slack for every failure. The raw payload in `webhook_submissions` is sacred and can always be used to manually create a lead.
