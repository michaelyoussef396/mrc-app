# MRC Lead Management System - Operational Runbook

**Purpose:** Day-to-day operations, monitoring, and incident response.

---

## Table of Contents

1. [Daily Checks](#daily-checks)
2. [Monitoring & Health](#monitoring--health)
3. [Alert Responses](#alert-responses)
4. [Backup & Recovery](#backup--recovery)

---

## Daily Checks

Run these checks each morning (~5 minutes):

### 1. App Health Check

- [ ] Open the app URL -- login page loads
- [ ] Log in as admin -- dashboard loads with current stats
- [ ] Check "Leads to Assign" count -- action any unassigned leads
- [ ] Check today's schedule shows correct bookings

### 2. Email Delivery Check

Check that emails from the previous day were delivered:

```sql
SELECT
  recipient_email,
  subject,
  status,
  error_message,
  sent_at
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

**Expected:** All rows have `status = 'sent'`. If any show `'failed'`, investigate the `error_message`.

### 3. Reminder Emails Check

Verify 48-hour reminder emails are being sent for upcoming bookings:

```sql
SELECT
  cb.title,
  cb.start_datetime,
  cb.reminder_sent,
  cb.reminder_sent_at,
  l.full_name,
  l.email
FROM calendar_bookings cb
JOIN leads l ON l.id = cb.lead_id
WHERE cb.start_datetime BETWEEN NOW() AND NOW() + INTERVAL '72 hours'
  AND cb.status = 'scheduled'
ORDER BY cb.start_datetime;
```

**Expected:** Bookings within 48 hours should have `reminder_sent = true`. If not, manually trigger:

```bash
curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-inspection-reminder
```

### 4. Stuck Leads Check

Find leads that haven't progressed in 7+ days:

```sql
SELECT
  id,
  full_name,
  status,
  updated_at,
  NOW() - updated_at AS stale_for
FROM leads
WHERE archived_at IS NULL
  AND status NOT IN ('closed', 'not_landed', 'finished')
  AND updated_at < NOW() - INTERVAL '7 days'
ORDER BY updated_at ASC;
```

**Action:** Review each stale lead and either follow up or archive.

---

## Monitoring & Health

### Supabase Dashboard Checks

**Database:**
- Go to Supabase Dashboard > Database > Database Health
- Check connection pool usage (<80% is healthy)
- Check disk usage (<70% is healthy)

**Edge Functions:**
- Go to Edge Functions > each function > Logs
- Look for recurring errors (5xx status codes)
- Check invocation counts (spikes may indicate issues)

**Storage:**
- Go to Storage > Buckets
- Check `inspection-photos` bucket size
- Check `inspection-reports` bucket size
- Check `pdf-templates` bucket has the template file

**Auth:**
- Go to Authentication > Users
- Verify active user count matches expectations
- Check for any banned/suspended accounts

### Key Metrics to Watch

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| DB connections | <80% pool | 80-90% pool | >90% pool |
| Edge function errors | <1% of calls | 1-5% | >5% |
| Email delivery rate | >98% sent | 95-98% | <95% |
| Storage usage | <5GB | 5-8GB | >8GB |
| API response time | <500ms avg | 500ms-2s | >2s |

### Vercel Monitoring

- Go to Vercel Dashboard > Project > Analytics
- Check: Core Web Vitals (LCP, FID, CLS)
- Check: Deployment success rate
- Check: Error rate in Functions tab (if applicable)

---

## Alert Responses

### Slack #mrc-alerts Channel

The app sends Slack notifications for key events. If you're not receiving them:

1. Verify `SLACK_WEBHOOK_URL` in Supabase Edge Function Secrets
2. Check the Slack channel hasn't been archived
3. Test manually:
   ```bash
   curl -X POST https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/send-slack-notification \
     -H "Content-Type: application/json" \
     -d '{"event":"new_lead","full_name":"Test Alert"}'
   ```

### Alert: Edge Function Failing Repeatedly

**Symptoms:** Users report errors, edge function logs show 5xx errors.

**Response:**
1. Check edge function logs for the specific error message
2. Common causes:
   - **Missing secret** - Re-set the environment variable: `supabase secrets set KEY=value`
   - **External API down** - Check Resend status, OpenRouter status, Google Maps status
   - **Rate limited** - Wait and retry; check if usage is unexpectedly high
3. If the function code is broken, redeploy the previous version (see Deployment Guide)

### Alert: Database Connection Pool Exhausted

**Symptoms:** All queries timeout, app shows loading spinners indefinitely.

**Response:**
1. Go to Supabase Dashboard > Database > Database Health
2. Check active connections count
3. If connections are stuck, restart the database:
   - Supabase Dashboard > Settings > General > Restart Server
4. Investigate what caused the spike (missing connection cleanup, N+1 queries, etc.)

### Alert: Storage Bucket Full

**Symptoms:** Photo uploads fail, PDF generation fails.

**Response:**
1. Check Storage usage in Supabase Dashboard
2. If approaching limits, clean up old PDF versions:
   ```sql
   -- Find old PDF versions (keep latest 3 per inspection)
   SELECT pv.id, pv.inspection_id, pv.version_number, pv.pdf_url
   FROM pdf_versions pv
   WHERE pv.version_number < (
     SELECT MAX(version_number) - 2
     FROM pdf_versions pv2
     WHERE pv2.inspection_id = pv.inspection_id
   );
   ```
3. Delete old files from Storage and remove corresponding `pdf_versions` rows

### Alert: Resend Rate Limit Hit

**Symptoms:** Emails failing with 429 status code.

**Response:**
1. Check Resend dashboard for current usage vs. plan limits
2. The send-email function retries 3 times with backoff -- transient rate limits resolve automatically
3. If persistent, check for loops or unintended batch sends
4. Consider upgrading Resend plan if legitimate volume increase

---

## Backup & Recovery

### Database Backups

**Automatic Backups (Supabase Pro plan):**
- Supabase automatically creates daily backups
- Retention: 7 days (Pro plan)
- Access: Supabase Dashboard > Database > Backups

**Manual Backup:**
```bash
# Export schema + data
supabase db dump -f backup_$(date +%Y%m%d).sql --project-ref ecyivrxjpsmjmexqatym

# Export data only
supabase db dump -f data_$(date +%Y%m%d).sql --data-only --project-ref ecyivrxjpsmjmexqatym
```

### Storage Backups

Supabase Storage files (photos, PDFs, templates) are not automatically backed up. For critical files:

1. Download the PDF template periodically:
   - Storage > pdf-templates > `inspection-report-template-final.html`
2. Inspection photos are the source of truth -- ensure the `inspection-photos` bucket is not accidentally purged

### Recovery Procedures

#### Restore from Supabase Backup
1. Go to Supabase Dashboard > Database > Backups
2. Select the backup point
3. Click "Restore"
4. Wait for restoration (may take 5-30 minutes depending on size)

#### Restore from Manual Backup
```bash
# Restore from SQL dump
psql -h db.ecyivrxjpsmjmexqatym.supabase.co -U postgres -d postgres < backup_20260217.sql
```

#### Recover Deleted Lead
If a lead was accidentally archived:
```sql
UPDATE leads SET archived_at = NULL WHERE id = 'uuid-here';
```

If a lead was hard-deleted (shouldn't happen with current RLS):
- Restore from the most recent backup

#### Recover Missing PDF Template
If the PDF template is accidentally deleted from Storage:
1. The template HTML is also committed in the git repository
2. Re-upload to Storage: Supabase Dashboard > Storage > pdf-templates
3. Verify the URL matches `TEMPLATE_URL` in the generate-inspection-pdf function

---

*Last Updated: 2026-02-17*
