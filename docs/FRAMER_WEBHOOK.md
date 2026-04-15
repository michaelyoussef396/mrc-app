# Framer → MRC Lead Capture Webhook

The `receive-framer-lead` Edge Function accepts public POSTs from the Framer site form and inserts a new lead, fires a Slack alert, and sends the customer a branded confirmation email.

## Endpoint

```
POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead
```

- **Method:** `POST`
- **Auth:** none (public, no bearer token required)
- **Content-Type:** `application/json` (recommended). Also accepts `multipart/form-data` and `application/x-www-form-urlencoded`.
- **CORS:** `*` with `POST, OPTIONS`
- **Rate limit:** 5 submissions per hour per IP → returns `429` when exceeded
- **Duplicate protection:** same `email` + `phone` within 24h returns `200` idempotently (no duplicate lead created)

## Request body

Required:

| Field | Type | Notes |
|---|---|---|
| `fullName` | string | 1–200 chars |
| `phone` | string | 8–20 chars |
| `email` | string | must be valid email, max 254 chars |

Optional:

| Field | Type | Notes |
|---|---|---|
| `street` | string | max 500 |
| `suburb` | string | max 100 |
| `preferredDate` | string | ideally `YYYY-MM-DD` |
| `preferredTime` | string | ideally `HH:MM` or `HH:MM:SS` |
| `issueDescription` | string | max 5000 |

The function also smart-detects misplaced fields (e.g. when Framer bundles the email into the phone array), so alternate casings like `full_name`, `Full Name`, `name` will also be matched — but stick to the canonical names above.

## Successful response

```json
{ "success": true, "message": "Lead received" }
```

Status `200`. The customer receives a confirmation email, `#leads` Slack channel gets an alert, and the lead appears in `/admin/leads` with `status = 'new_lead'` and `lead_source = 'website'`.

## Error responses

| Status | Meaning |
|---|---|
| `400` | Validation failed — response body includes `details.fieldErrors` |
| `405` | Wrong method (only POST allowed after the OPTIONS preflight) |
| `413` | Body exceeded 50,000 bytes |
| `429` | Rate limit (5/hour/IP) exceeded |
| `500` | Unexpected error — the customer can fall back to calling `1800 954 117` |

## Smoke test

Run from your laptop:

```bash
curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Webhook Test",
    "phone": "0400000000",
    "email": "test+webhook@mouldandrestoration.com.au",
    "street": "1 Test Street",
    "suburb": "Melbourne",
    "preferredDate": "2026-05-01",
    "preferredTime": "10:00",
    "issueDescription": "curl smoke test from docs/FRAMER_WEBHOOK.md"
  }'
```

Expect `200 { "success": true, "message": "Lead received" }`. Then verify:

1. Lead appears in `/admin/leads` with the above details.
2. `#leads` Slack channel receives the "🏠 New Lead Received" alert.
3. The `test+webhook@…` inbox receives the confirmation email.

## Framer setup

1. Open the form component in Framer.
2. Set the submission target / webhook URL to:
   ```
   https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead
   ```
3. Set request method to `POST`.
4. Map each form field to the canonical JSON key above (`fullName`, `phone`, `email`, `street`, `suburb`, `preferredDate`, `preferredTime`, `issueDescription`).
5. Send JSON (`Content-Type: application/json`) if Framer supports it; otherwise `application/x-www-form-urlencoded` works too.
6. Publish the site and run one real submission end-to-end to confirm.

## Secrets this function relies on

Set in Supabase → Project Settings → Edge Functions → Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_WEBHOOK_URL` (optional — skipped with a warning if unset)
- `RESEND_API_KEY` (optional — confirmation email is skipped if unset)

If any of the optional secrets are missing, the lead still saves and `success: true` still returns — the function logs a warning and continues.
