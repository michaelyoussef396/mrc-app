# MRC Lead Management System - Troubleshooting Guide

---

## Table of Contents

1. [Common Errors & Fixes](#common-errors--fixes)
2. [How to Debug Issues](#how-to-debug-issues)
3. [Support Contact](#support-contact)

---

## Common Errors & Fixes

### Authentication

#### "Invalid login credentials"
**Cause:** Wrong email or password.
**Fix:**
1. Check for typos in your email address
2. Use "Forgot Password" to reset your password
3. If persists, ask an admin to verify your account exists

#### Session expired / logged out unexpectedly
**Cause:** JWT token expired (default: 1 hour without refresh).
**Fix:**
1. Log in again
2. Enable "Remember Me" to persist your session
3. The app refreshes tokens automatically every 5 minutes -- this should be rare

#### "You don't have permission to access this page"
**Cause:** Your role doesn't match the required route.
**Fix:**
1. Ensure you're on the correct URL (`/technician` for technicians, `/admin` for admins)
2. Ask an admin to verify your role assignment in Manage Users

---

### Data Loading

#### Leads page shows spinner forever
**Cause:** Supabase query failing or RLS policy blocking access.
**Fix:**
1. Open browser DevTools > Console -- look for red errors
2. Check the Network tab for failed Supabase requests (look for 4xx/5xx status)
3. If you see `PGRST200`, this means a foreign key relationship is missing from the query
4. If you see `401 Unauthorized`, your session may have expired -- log out and back in

#### "Failed to load leads. Please refresh the page."
**Cause:** Network error or Supabase service issue.
**Fix:**
1. Check your internet connection
2. Refresh the page
3. If Supabase is down, check [status.supabase.com](https://status.supabase.com)

#### Dashboard stats show 0 for everything
**Cause:** RLS policies may be blocking queries for your user.
**Fix:**
1. Verify you're logged in as an admin (technicians see a different dashboard)
2. Check Console for permission errors
3. Verify your role in Supabase > Authentication > Users

---

### PDF Generation

#### "Failed to generate PDF" or PDF takes >15 seconds
**Cause:** Edge function timeout, template fetch failure, or too many photos.
**Fix:**
1. Try again -- first attempt may be a cold start (2-3s extra)
2. If the inspection has 30+ photos, generation may take up to 8 seconds -- this is normal
3. Check edge function logs: Supabase Dashboard > Edge Functions > generate-inspection-pdf > Logs
4. Verify the HTML template exists in Storage: Supabase Dashboard > Storage > pdf-templates

#### PDF shows broken images
**Cause:** Photo signed URLs expired (1 hour expiry) or photos failed to upload.
**Fix:**
1. Regenerate the PDF -- this creates fresh signed URLs
2. Check if the photos exist in Storage: Supabase Dashboard > Storage > inspection-photos
3. If photos are missing, the original upload may have failed -- re-upload from the inspection form

#### "Inspection not complete" error when generating PDF
**Cause:** The lead is still in a pre-inspection status (new_lead, contacted, inspection_waiting).
**Fix:**
1. Complete the inspection form first
2. Submit the inspection -- this updates the lead status
3. Then generate the PDF

---

### Email

#### "Failed to send email"
**Cause:** Resend API failure or missing API key.
**Fix:**
1. Check edge function logs for specific Resend error
2. Verify `RESEND_API_KEY` is set: Supabase Dashboard > Edge Functions > Secrets
3. Check Resend dashboard for rate limit status: [resend.com/emails](https://resend.com/emails)
4. Verify the recipient email is valid

#### Customer didn't receive email
**Cause:** Email in spam, Resend delivery issue, or wrong email address.
**Fix:**
1. Ask customer to check spam/junk folder
2. Check `email_logs` table for the delivery status:
   ```sql
   SELECT * FROM email_logs WHERE recipient_email = 'customer@example.com' ORDER BY created_at DESC;
   ```
3. Check Resend dashboard for bounce/complaint reports
4. Verify the email address on the lead record is correct

#### Reminder emails not sending
**Cause:** CRON scheduler not configured, or `reminder_scheduled_for` not set on bookings.
**Fix:**
1. Check that bookings have `reminder_scheduled_for` set (48 hours before `start_datetime`)
2. Manually trigger the function:
   ```bash
   curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder
   ```
3. Check function logs for errors

---

### Inspection Form

#### Form data not saving
**Cause:** Auto-save failed silently, or lost connection.
**Fix:**
1. Check the browser Console for save errors
2. Verify internet connection
3. The form auto-saves every 30 seconds -- manually trigger save by navigating to the next section
4. If using the technician form, check that `inspector_id` matches your user ID

#### Photos not uploading
**Cause:** Large file size, network timeout, or storage permissions.
**Fix:**
1. Check file size -- photos are auto-compressed to 1600px max width, JPEG 0.85 quality
2. Try on a stronger connection (Wi-Fi instead of mobile data)
3. Check Supabase Storage bucket permissions for `inspection-photos`
4. Check Console for specific upload error messages

#### Dew point showing wrong value
**Cause:** Invalid temperature or humidity input.
**Fix:**
1. Dew point is auto-calculated from temperature and humidity using the Magnus formula
2. Verify temperature is in Celsius and humidity is 0-100%
3. If both inputs are correct, the dew point calculation is deterministic

#### Cost estimate seems wrong
**Cause:** Incorrect hours, equipment quantities, or discount percentage.
**Fix:**
1. Verify equipment quantities and daily rates:
   - Dehumidifier: $132/day
   - Air Mover: $46/day
   - RCD Box: $5/day
2. Check discount percentage (maximum 13%)
3. GST is always 10% on top of the ex-GST total
4. Equipment costs are never discounted -- only labour gets the discount

---

### Calendar & Scheduling

#### "Booking conflict" error
**Cause:** The technician already has a booking at the requested time.
**Fix:**
1. Check the technician's schedule on the Calendar page
2. Choose a different time slot
3. The system shows available time slots when booking

#### Travel time showing "Unknown"
**Cause:** Google Maps API failure or technician has no starting address.
**Fix:**
1. Verify the technician has a home/starting address set in their profile
2. Check `GOOGLE_MAPS_API_KEY` is configured
3. The system falls back to Haversine estimation (straight-line distance at 40km/h average)

---

### PWA / Mobile

#### App not installing to home screen
**Cause:** Browser doesn't support PWA, or HTTPS not configured.
**Fix:**
1. Use Safari on iOS or Chrome on Android
2. The app must be served over HTTPS (Vercel handles this automatically)
3. Clear browser cache and try again

#### App shows old version after update
**Cause:** Service worker serving cached content.
**Fix:**
1. Close all tabs of the app
2. Reopen the app -- the service worker auto-updates
3. If still stale, clear browser cache:
   - iOS Safari: Settings > Safari > Clear History and Website Data
   - Chrome: Settings > Privacy > Clear Browsing Data
4. Force reload: pull down to refresh (mobile) or Ctrl+Shift+R (desktop)

#### Offline data not syncing
**Cause:** Sync manager failed, or device hasn't reconnected.
**Fix:**
1. Ensure you have a stable internet connection
2. Open the app -- sync triggers on app open
3. Check Console for sync errors
4. If data is stuck, check IndexedDB in DevTools > Application > IndexedDB

---

### Performance

#### Page loads slowly (>3 seconds)
**Cause:** Large payload, cold start, or slow network.
**Fix:**
1. Check Network tab for slow requests
2. First load after deploy may be slower (code splitting, cold starts)
3. Subsequent navigation should be fast (React Query caches data for 2 minutes)
4. On slow mobile networks, the PWA caches static assets after first load

#### "Load More Leads" keeps loading
**Cause:** Network error on pagination request.
**Fix:**
1. Check internet connection
2. Check Console for Supabase errors
3. Refresh the page to reset state

---

## How to Debug Issues

### Browser DevTools

1. **Console tab** - Shows JavaScript errors (red) and warnings (yellow)
2. **Network tab** - Shows all API requests and their status codes
3. **Application tab** - Shows localStorage, sessionStorage, IndexedDB, Service Worker

### Common Network Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | All good |
| 401 | Unauthorized | Session expired -- log out and back in |
| 403 | Forbidden | RLS policy blocking access -- check user role |
| 404 | Not Found | Wrong endpoint or missing record |
| 409 | Conflict | Duplicate record or booking conflict |
| 429 | Rate Limited | Too many requests -- wait and retry |
| 500 | Server Error | Check edge function logs |
| PGRST200 | PostgREST Error | Missing FK relationship in query -- check join syntax |

### Checking Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select the function
4. Click "Logs" tab
5. Filter by time range and log level

### Checking Database State

Use Supabase Dashboard > SQL Editor:

```sql
-- Check a specific lead
SELECT id, full_name, status, assigned_to FROM leads WHERE id = 'uuid-here';

-- Check inspection for a lead
SELECT id, lead_id, pdf_url, pdf_version FROM inspections WHERE lead_id = 'uuid-here';

-- Check recent email logs
SELECT recipient_email, subject, status, error_message, sent_at
FROM email_logs ORDER BY created_at DESC LIMIT 10;

-- Check bookings for a technician
SELECT title, start_datetime, end_datetime, status
FROM calendar_bookings WHERE assigned_to = 'technician-uuid'
ORDER BY start_datetime DESC;
```

### Reproducing Issues

1. **Get the user's role** - Admin or technician?
2. **Get the URL** - What page were they on?
3. **Get the device** - Mobile (iOS/Android) or desktop?
4. **Check Console** - Ask for screenshot of browser Console errors
5. **Check Network** - Look for failed API requests
6. **Check edge function logs** - If the error involves an API call

---

## Support Contact

For technical issues:

- **Developer:** Michael Youssef
- **Email:** michaelyoussef396@gmail.com
- **Slack:** #mrc-alerts channel (automated notifications)

For business/operations issues:

- **Admin Portal:** Log in at the app URL
- **Phone:** 0433 880 403
- **Email:** admin@mouldandrestoration.com.au

---

*Last Updated: 2026-02-17*
