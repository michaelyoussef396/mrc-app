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
- **Duplicate handling:** every valid submission creates a lead. If the same `email` + `phone` were seen on another lead within the last 24h, the new lead is captured with `is_possible_duplicate = true` and `possible_duplicate_of = <earlier_lead_id>` for admin review — never silently dropped.

## Field mapping

The function accepts many field name variations. Framer sends fields named after the input label, so all of these work:

### Required fields

| Framer label | Also accepted as | DB column |
|---|---|---|
| Name | `fullName`, `full_name`, `Full Name`, `name`, `Your Name` | `full_name` |
| Phone | `phone`, `Phone Number`, `mobile`, `contact`, `Contact Number` | `phone` |
| Email | `email`, `Email Address`, `Your Email` | `email` |

### Optional fields

| Framer label | Also accepted as | DB column | Format |
|---|---|---|---|
| Date | `preferred_date`, `Preferred Date`, `date`, `Inspection Date` | `inspection_scheduled_date` | DD/MM/YYYY or YYYY-MM-DD (auto-detected) |
| Time | `preferred_time`, `Preferred Time`, `time`, `Inspection Time` | `scheduled_time` | "9:00 AM" or "14:00" |
| number and address | `street`, `Street Address`, `address`, `Property Address` | `property_address_street` | Free text |
| Suburb | `suburb`, `city`, `location`, `town` | `property_address_suburb` | Free text |
| Your Message | `message`, `Message`, `description`, `issue_description`, `comments`, `notes`, `details` | `issue_description` | Free text, max 5000 chars |

### Auto-set fields

| DB column | Value |
|---|---|
| `lead_source` | `website` |
| `status` | `new_lead` |
| `property_address_state` | `VIC` |

## Successful response

```json
{ "success": true, "message": "Lead received" }
```

Status `200`. The customer receives a confirmation email, `#leads` Slack channel gets an alert (prefixed "🔁 Possible repeat —" if the new lead matched an existing email+phone within 24h), and the lead appears in `/admin/leads` with `status = 'new_lead'` and `lead_source = 'website'`. Duplicates appear with an amber "Possible duplicate of MRC-XXXX-XXXX" badge on the lead detail screen.

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
    "Name": "Webhook Test",
    "Phone": "0400000000",
    "Email": "test+webhook@mouldandrestoration.com.au",
    "number and address": "1 Test Street",
    "Suburb": "Melbourne",
    "Date": "15/05/2026",
    "Time": "10:00 AM",
    "Your Message": "curl smoke test from docs/FRAMER_WEBHOOK.md"
  }'
```

Expect `200 { "success": true, "message": "Lead received" }`. Then verify:

1. Lead appears in `/admin/leads` with the above details.
2. `#leads` Slack channel receives the "New Lead Received" alert.
3. The `test+webhook@…` inbox receives the confirmation email.

## Framer setup

1. Open the contact form page in Framer.
2. Select the form component.
3. In the form settings, set **Action** to **Webhook**.
4. Paste the webhook URL:
   ```
   https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead
   ```
5. Set method to `POST`.
6. Form fields will be sent using their label names (e.g. "Name", "Phone", "Email", "Date", "Time", "number and address", "Suburb", "Your Message") — the Edge Function handles all these variations automatically.
7. Publish the site and submit one real test to confirm the lead appears in the system.

## Secrets this function relies on

Set in Supabase → Project Settings → Edge Functions → Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_WEBHOOK_URL` (optional — skipped with a warning if unset)
- `RESEND_API_KEY` (optional — confirmation email is skipped if unset)

If any of the optional secrets are missing, the lead still saves and `success: true` still returns — the function logs a warning and continues.
