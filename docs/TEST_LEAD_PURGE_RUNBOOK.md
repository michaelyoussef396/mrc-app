# Test Lead Purge Runbook — 4 leads, pre-Framer-launch (written 5 Aug 2026)

Run by Michael in the Supabase SQL editor. Claude Code does not execute any step here.

**TARGET: PROD `ecyivrxjpsmjmexqatym` — LIVE, mrcsystem.com, real customers.**
SQL editor: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new

Confirm the project ref in the dashboard header before pasting anything. The DEV clone is
`ctppzqnysmzynkxjlzta` — if you want a dry run, run Block A + B there first, but note DEV
holds different rows so counts will not match.

## What gets deleted

| # | lead_id | Who | Children |
|---|---|---|---|
| 1 | `5b41b8b2-6c5e-416f-b257-7fce5971e458` | michael youssef / michaelyoussef396@gmail.com — QA full lifecycle, INS-2026-0001, archived 4 Aug | full chain |
| 2 | `29f6b2a8-9aeb-4fe4-aab2-6a59cda0d9a2` | michael youssef / mhy22413@gmail.com — QA 4 Aug, INS-2026-0002 | full chain |
| 3 | `e2025731-9094-4c02-b0ea-d29eab48c98f` | "vryan stan" / michaelyousse**s**f396@gmail.com — empty stub | none |
| 4 | `e1f05808-4b23-4e32-9bf8-c7f837d6eaf4` | Sean A / sean.abass@gmail.com — handled outside the system (Michael, 5 Aug) | 1 webhook_submission |

**`audit_logs` is NOT touched.** It is append-only and protected by
`prevent_audit_logs_delete`. Every deleted row's full before-state — including Sean A's
enquiry text — survives there permanently, plus a `delete_*` audit row per deletion.

**Storage objects are NOT touched.** Photos and PDFs in `inspection-photos` /
`inspection-reports` do not cascade from a DB delete. Block D lists what becomes orphaned.
Do not clear Storage without a separate decision.

---

## BLOCK A — pre-flight, READ-ONLY. Run alone, read the output, change nothing.

```sql
-- A1. Confirm exactly these 4 leads exist and NO real lead has arrived since.
-- If this returns any row not in the table above, STOP.
SELECT id, full_name, email, status, created_at, archived_at
FROM public.leads
ORDER BY created_at;

-- A2. FK delete rules on every child of the tables we touch.
-- Read this before trusting any assumption about NOT NULL / SET NULL / CASCADE.
SELECT tc.table_name  AS child_table,
       kcu.column_name AS child_column,
       ccu.table_name AS parent_table,
       rc.delete_rule,
       c.is_nullable
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
JOIN information_schema.columns c
  ON c.table_schema = tc.table_schema AND c.table_name = tc.table_name
 AND c.column_name = kcu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name IN ('leads','inspections','job_completions','invoices',
                         'inspection_areas','subfloor_data','photos','moisture_readings')
ORDER BY parent_table, child_table;

-- A3. Self-reference check: does any lead point at another via possible_duplicate_of?
-- A surviving lead pointing at a deleted one could block the delete or null out.
SELECT id, full_name, possible_duplicate_of
FROM public.leads
WHERE possible_duplicate_of IS NOT NULL;

-- A4. EXACT ROW COUNTS ABOUT TO BE DELETED, per table, per lead.
WITH tgt AS (
  SELECT unnest(ARRAY[
    '5b41b8b2-6c5e-416f-b257-7fce5971e458',
    '29f6b2a8-9aeb-4fe4-aab2-6a59cda0d9a2',
    'e2025731-9094-4c02-b0ea-d29eab48c98f',
    'e1f05808-4b23-4e32-9bf8-c7f837d6eaf4'
  ]::uuid[]) AS lead_id
),
ins AS (SELECT i.id, i.lead_id FROM public.inspections i JOIN tgt ON i.lead_id = tgt.lead_id),
jc  AS (SELECT j.id, j.lead_id FROM public.job_completions j JOIN tgt ON j.lead_id = tgt.lead_id),
ar  AS (SELECT a.id, ins.lead_id FROM public.inspection_areas a JOIN ins ON a.inspection_id = ins.id),
sf  AS (SELECT s.id, ins.lead_id FROM public.subfloor_data s JOIN ins ON s.inspection_id = ins.id),
ph  AS (SELECT p.id, COALESCE(ins.lead_id, jc.lead_id) AS lead_id
        FROM public.photos p
        LEFT JOIN ins ON p.inspection_id = ins.id
        LEFT JOIN jc  ON p.job_completion_id = jc.id
        WHERE ins.id IS NOT NULL OR jc.id IS NOT NULL)
SELECT 'job_completion_pdf_versions' AS tbl, jc.lead_id, count(*) FROM public.job_completion_pdf_versions v JOIN jc ON v.job_completion_id = jc.id GROUP BY 2
UNION ALL SELECT 'job_completions',   lead_id, count(*) FROM jc GROUP BY 2
UNION ALL SELECT 'invoices',          i.lead_id, count(*) FROM public.invoices i JOIN tgt ON i.lead_id = tgt.lead_id GROUP BY 2
UNION ALL SELECT 'pdf_versions',      ins.lead_id, count(*) FROM public.pdf_versions v JOIN ins ON v.inspection_id = ins.id GROUP BY 2
UNION ALL SELECT 'ai_summary_versions', ins.lead_id, count(*) FROM public.ai_summary_versions v JOIN ins ON v.inspection_id = ins.id GROUP BY 2
UNION ALL SELECT 'photo_history',     ph.lead_id, count(*) FROM public.photo_history h JOIN ph ON h.photo_id = ph.id GROUP BY 2
UNION ALL SELECT 'photos',            lead_id, count(*) FROM ph GROUP BY 2
UNION ALL SELECT 'moisture_readings', ar.lead_id, count(*) FROM public.moisture_readings m JOIN ar ON m.area_id = ar.id GROUP BY 2
UNION ALL SELECT 'subfloor_readings', sf.lead_id, count(*) FROM public.subfloor_readings r JOIN sf ON r.subfloor_id = sf.id GROUP BY 2
UNION ALL SELECT 'subfloor_data',     lead_id, count(*) FROM sf GROUP BY 2
UNION ALL SELECT 'inspection_areas',  lead_id, count(*) FROM ar GROUP BY 2
UNION ALL SELECT 'inspections',       lead_id, count(*) FROM ins GROUP BY 2
UNION ALL SELECT 'calendar_bookings', b.lead_id, count(*) FROM public.calendar_bookings b JOIN tgt ON b.lead_id = tgt.lead_id GROUP BY 2
UNION ALL SELECT 'email_logs',        e.lead_id, count(*) FROM public.email_logs e JOIN tgt ON e.lead_id = tgt.lead_id GROUP BY 2
UNION ALL SELECT 'activities',        a.lead_id, count(*) FROM public.activities a JOIN tgt ON a.lead_id = tgt.lead_id GROUP BY 2
UNION ALL SELECT 'webhook_submissions', w.lead_id, count(*) FROM public.webhook_submissions w JOIN tgt ON w.lead_id = tgt.lead_id GROUP BY 2
UNION ALL SELECT 'leads',             l.id, count(*) FROM public.leads l JOIN tgt ON l.id = tgt.lead_id GROUP BY 2
ORDER BY 1, 2;
```

**Expected shape** (from the 5 Aug read-only pass — treat A4's live output as authoritative;
if it disagrees materially, STOP and re-investigate):

- Lead 1: 3 jc_pdf_versions, 1 job_completion, 1 invoice, 2 pdf_versions, 1 ai_summary_version,
  24 photos, 2 moisture_readings, 1 subfloor_reading, 1 subfloor_data, 1 area, 1 inspection,
  6 calendar_bookings, 4 email_logs, 35 activities, 1 webhook_submission
- Lead 2: 3 jc_pdf_versions, 1 job_completion, 1 invoice, 1 pdf_version, 3 ai_summary_versions,
  20 photos, 2 moisture_readings, 1 subfloor_reading, 1 subfloor_data, 1 area, 1 inspection,
  5 calendar_bookings, 4 email_logs, 56 activities, 0 webhook_submissions
- Lead 3: nothing but the lead row
- Lead 4: 1 webhook_submission + the lead row
- photo_history: 54 rows total across leads 1+2

---

## BLOCK B — the deletion. ONE transaction. Paste and run as a single statement batch.

Ordering note: `photo_history` → `photos` run BEFORE `job_completions`, which is safer than
job-completions-first under every possible FK rule (A2 shows which you actually have).

Nothing commits until you run Block C. If the RAISE output looks wrong, run `ROLLBACK;`.

```sql
BEGIN;

CREATE TEMP TABLE _tgt ON COMMIT DROP AS
SELECT unnest(ARRAY[
  '5b41b8b2-6c5e-416f-b257-7fce5971e458',
  '29f6b2a8-9aeb-4fe4-aab2-6a59cda0d9a2',
  'e2025731-9094-4c02-b0ea-d29eab48c98f',
  'e1f05808-4b23-4e32-9bf8-c7f837d6eaf4'
]::uuid[]) AS lead_id;

CREATE TEMP TABLE _ins ON COMMIT DROP AS
SELECT id FROM public.inspections WHERE lead_id IN (SELECT lead_id FROM _tgt);

CREATE TEMP TABLE _jc ON COMMIT DROP AS
SELECT id FROM public.job_completions WHERE lead_id IN (SELECT lead_id FROM _tgt);

CREATE TEMP TABLE _ar ON COMMIT DROP AS
SELECT id FROM public.inspection_areas WHERE inspection_id IN (SELECT id FROM _ins);

CREATE TEMP TABLE _sf ON COMMIT DROP AS
SELECT id FROM public.subfloor_data WHERE inspection_id IN (SELECT id FROM _ins);

CREATE TEMP TABLE _ph ON COMMIT DROP AS
SELECT id FROM public.photos
WHERE inspection_id IN (SELECT id FROM _ins)
   OR job_completion_id IN (SELECT id FROM _jc);

-- Deepest children first.
DELETE FROM public.photo_history               WHERE photo_id          IN (SELECT id FROM _ph);
DELETE FROM public.photos                      WHERE id                IN (SELECT id FROM _ph);
DELETE FROM public.job_completion_pdf_versions WHERE job_completion_id IN (SELECT id FROM _jc);
DELETE FROM public.job_completions             WHERE id                IN (SELECT id FROM _jc);
DELETE FROM public.invoices                    WHERE lead_id           IN (SELECT lead_id FROM _tgt);
DELETE FROM public.pdf_versions                WHERE inspection_id     IN (SELECT id FROM _ins);
DELETE FROM public.ai_summary_versions         WHERE inspection_id     IN (SELECT id FROM _ins);
DELETE FROM public.moisture_readings           WHERE area_id           IN (SELECT id FROM _ar);
DELETE FROM public.subfloor_readings           WHERE subfloor_id       IN (SELECT id FROM _sf);
DELETE FROM public.subfloor_data               WHERE id                IN (SELECT id FROM _sf);
DELETE FROM public.inspection_areas            WHERE id                IN (SELECT id FROM _ar);
DELETE FROM public.inspections                 WHERE id                IN (SELECT id FROM _ins);
DELETE FROM public.calendar_bookings           WHERE lead_id           IN (SELECT lead_id FROM _tgt);
DELETE FROM public.email_logs                  WHERE lead_id           IN (SELECT lead_id FROM _tgt);
DELETE FROM public.activities                  WHERE lead_id           IN (SELECT lead_id FROM _tgt);
DELETE FROM public.webhook_submissions         WHERE lead_id           IN (SELECT lead_id FROM _tgt);
DELETE FROM public.leads                       WHERE id                IN (SELECT lead_id FROM _tgt);

-- In-transaction verification. Every count MUST be 0.
SELECT 'leads' t, count(*) FROM public.leads
UNION ALL SELECT 'inspections', count(*) FROM public.inspections
UNION ALL SELECT 'inspection_areas', count(*) FROM public.inspection_areas
UNION ALL SELECT 'moisture_readings', count(*) FROM public.moisture_readings
UNION ALL SELECT 'subfloor_data', count(*) FROM public.subfloor_data
UNION ALL SELECT 'subfloor_readings', count(*) FROM public.subfloor_readings
UNION ALL SELECT 'photos', count(*) FROM public.photos
UNION ALL SELECT 'photo_history', count(*) FROM public.photo_history
UNION ALL SELECT 'ai_summary_versions', count(*) FROM public.ai_summary_versions
UNION ALL SELECT 'pdf_versions', count(*) FROM public.pdf_versions
UNION ALL SELECT 'job_completions', count(*) FROM public.job_completions
UNION ALL SELECT 'job_completion_pdf_versions', count(*) FROM public.job_completion_pdf_versions
UNION ALL SELECT 'invoices', count(*) FROM public.invoices
UNION ALL SELECT 'calendar_bookings', count(*) FROM public.calendar_bookings
UNION ALL SELECT 'email_logs', count(*) FROM public.email_logs
UNION ALL SELECT 'activities', count(*) FROM public.activities
UNION ALL SELECT 'webhook_submissions', count(*) FROM public.webhook_submissions
ORDER BY 1;
```

These tables hold ONLY the 4 test leads' data, so every count above should be **0**.
A non-zero count means something else lives in that table — `ROLLBACK;` and investigate.

## BLOCK C — commit, or abandon

```sql
COMMIT;   -- only if every Block B count was 0
-- ROLLBACK;  -- if anything looked wrong; nothing is lost
```

## BLOCK D — post-commit verification + sequences

```sql
-- D1. All four leads gone.
SELECT count(*) AS should_be_zero FROM public.leads
WHERE id IN ('5b41b8b2-6c5e-416f-b257-7fce5971e458',
             '29f6b2a8-9aeb-4fe4-aab2-6a59cda0d9a2',
             'e2025731-9094-4c02-b0ea-d29eab48c98f',
             'e1f05808-4b23-4e32-9bf8-c7f837d6eaf4');

-- D2. Audit trail intact — these MUST still return rows.
SELECT entity_type, count(*) FROM public.audit_logs GROUP BY 1 ORDER BY 1;

-- D3. Sequences — what the next real record will be numbered.
-- last_value with is_called=true means the NEXT value is last_value + 1.
SELECT sequencename, last_value, is_called
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- D4. Storage objects now orphaned (DB rows gone, files remain).
-- Read-only inventory. Do NOT delete without a separate decision.
SELECT bucket_id, count(*) AS objects, pg_size_pretty(sum((metadata->>'size')::bigint)) AS bytes
FROM storage.objects
WHERE bucket_id IN ('inspection-photos','inspection-reports','job-reports')
GROUP BY bucket_id ORDER BY bucket_id;

SELECT bucket_id, name, created_at
FROM storage.objects
WHERE bucket_id IN ('inspection-photos','inspection-reports','job-reports')
ORDER BY bucket_id, created_at;
```

### Sequence note — read D3 carefully

`invoice_number_seq` was expected to sit at 4 (next = INV-2026-0005) per the July invoice
cleanup, yet the QA invoices created since are INV-2026-0001 and INV-2026-0002 — so the
sequence was evidently reset at some point. A DELETE does **not** rewind a sequence, so
after this purge the next numbers continue from wherever D3 reports, not from 1. Confirm
the three number sequences (invoice / job / inspection) read what you expect before the
first real customer record is created.

---

## After this runbook

- Framer webhook can be pointed at
  `https://ecyivrxjpsmjmexqatym.supabase.co/functions/v1/receive-framer-lead`
  (ACTIVE, platform v41, deployed 2026-08-04; `verify_jwt = false`; rate limit 100/IP/hr,
  which is site-wide because Framer posts server-side).
- The dashboard will show zero leads, zero revenue, empty Outstanding Invoices. That is
  correct and expected — nothing has ever been billed through this system.
- Storage cleanup (Block D4 inventory) remains an open decision.
