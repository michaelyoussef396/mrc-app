# Email Previews

Local-only preview artefacts for the 7 customer emails MRC sends.

The rendered `.html` files in this folder are **gitignored** — they contain real test-lead PII (name, address, phone, email) and are regenerated on demand. Only this README is checked in.

## What gets rendered

| File | Email | Builder |
|---|---|---|
| `01-enquiry-confirmation.html` | Framer enquiry confirmation | `buildConfirmationEmailHtml` (inline in `supabase/functions/receive-framer-lead/index.ts:204-313`) |
| `02-booking-confirmation.html` | Inspection booking confirmation | `buildBookingConfirmationHtml` (`src/lib/api/notifications.ts:185`) |
| `03-inspection-reminder.html` | T-2 day inspection reminder | `buildReminderHtml` (inline in `supabase/functions/send-inspection-reminder/index.ts:92`) |
| `04-inspection-report.html` | Inspection report sent / approved | `buildReportApprovedHtml` (`src/lib/api/notifications.ts:205`) |
| `05-job-booking-confirmation.html` | Multi-day job booking confirmation | `buildJobBookingConfirmationHtml` (`src/lib/api/notifications.ts:252`) |
| `06-job-completion-report.html` | Job completion report sent | `buildJobReportEmailHtml` (`src/lib/api/notifications.ts:329`) |
| `07-google-review-request.html` | Post-payment Google review request | `buildGoogleReviewEmailHtml` (`src/lib/api/notifications.ts:420`) |

## Test lead

All previews use lead `85fca3d1-f30b-4942-ba6c-f9c7d27269d8` (`mrcsystem.com` test record).

The script pulls real values from Supabase at runtime — full name, property address, phone, email, scheduled dates, inspection number, job number, calendar bookings — so previews show what an actual customer would receive, not lorem ipsum.

## Regenerate

From repo root:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run preview-emails
```

The script needs a service-role key (anon RLS doesn't expose all the joined rows). Provide it inline as above, or export it once in your shell. `VITE_SUPABASE_URL` is read from `.env` automatically.

If either env var is missing the script exits non-zero with a clear error — it never falls back to production secrets and never writes to the database.

## How to view

Either:

- **VS Code Live Server**: right-click any `.html` → "Open with Live Server". Re-runs auto-reload on regenerate.
- **Browser direct**: double-click any `.html`.
- **Side-by-side compare**: open two previews in separate tabs to spot differences (the 5 templates that share `wrapInBrandedTemplate` should have identical headers, signatures, and footers).

## Caveats

- The signature logo `<img>` URL in the rendered HTML points at the **production** Storage public bucket (the same URL real customers receive). The image will load if you have an internet connection.
- The Job Completion Report's "View Job Report" CTA links to a real Storage HTML URL for the test lead — it'll open the actual rendered job report.
- The Google review CTA links to MRC's real Google Business profile — don't click "Submit" if you actually open it.
- The Framer enquiry confirmation and Inspection reminder templates are **duplicated** between this script and their respective Edge Functions. If you change either Edge Function, also update `scripts/preview-emails.ts` to keep previews in sync. There's a TODO in the script to extract these into shared helpers.

## Workflow for design changes

1. `npm run preview-emails` — generate all 7
2. Open in Live Server, screenshot or annotate any issues
3. Edit `src/lib/api/notifications.ts` and/or the two Edge Functions to fix
4. `npm run preview-emails` again — re-renders pick up changes immediately for the 5 in `notifications.ts` (script imports them); the 2 inline Edge Function copies need the script updated by hand (see TODO above)
5. When happy, commit the source changes — the rendered HTMLs stay gitignored
