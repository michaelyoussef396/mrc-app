# Test Lead Purge Runbook — "ZZ TEST — MICHAEL — DELETE" (written 26 Aug 2026)

Run by Michael in the Supabase SQL editor. Claude Code does not execute any step here.

**TARGET: PROD `ecyivrxjpsmjmexqatym` — LIVE, mrcsystem.com, real customers.**
SQL editor: https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql/new

Confirm the project ref in the dashboard header before pasting anything. The DEV clone is
`ctppzqnysmzynkxjlzta` — but DEV has neither the Phase 2 note tables nor the
`lead-note-attachments` bucket, so a DEV dry run is not available for this one.

## What gets deleted

One lead and everything hanging off it, created to test notes, mentions, Slack and attachments
after PR #87 (production merge `4b5059b`).

| | |
|---|---|
| Lead | `ZZ TEST — MICHAEL — DELETE` — id resolved in A1 |
| DB children | **all CASCADE from `leads`** — `lead_notes`, `lead_note_mentions`, `lead_note_attachments`, `notifications`, `activities`, `inspections`, `job_completions` |
| Storage | objects under `lead-note-attachments/<LEAD_ID>/` — **do NOT cascade** |

**The DB side is one `DELETE`.** Verified against `information_schema.referential_constraints`
on PROD: every child listed above has `delete_rule = CASCADE` from `leads`. There is no
child-first ordering to get right. `calendar_bookings`, `email_logs`, `invoices` and
`webhook_submissions` are `SET NULL`, so they survive with a null `lead_id` — that is intended
and matches the existing 4-lead runbook.

**Storage is the part that bites.** `storage.objects` rows are keyed
`<lead_id>/<note_id>/<filename>`. Once the `lead_note_attachments` rows are gone there is
nothing left that references those paths, so if you delete the lead first the files are orphaned
with no way to find them. **Storage goes first — that ordering is the whole point of this runbook.**

**`audit_logs` is NOT touched.** It is append-only and protected by `prevent_audit_logs_delete`.
Every deleted row's full before-state survives there permanently, plus a `delete_*` audit row per
deletion.

---

## BLOCK A — pre-flight, READ-ONLY. Run alone, read the output, change nothing.

```sql
-- A1. Resolve the test lead. EXPECT exactly one row.
-- If this returns 0 rows, or more than one, or anything that is not obviously
-- the test lead, STOP. Copy the id into every <LEAD_ID> below.
SELECT id, full_name, email, phone, status, created_at
FROM public.leads
WHERE full_name ILIKE 'ZZ TEST%'
ORDER BY created_at DESC;
```

```sql
-- A2. Everything that will disappear with it. Read these numbers and remember them —
-- Block D asserts every one of them is 0 afterwards.
SELECT 'lead_notes'            AS child, count(*) FROM public.lead_notes            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_mentions',    count(*) FROM public.lead_note_mentions    WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_attachments', count(*) FROM public.lead_note_attachments WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'notifications',         count(*) FROM public.notifications         WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'activities',            count(*) FROM public.activities            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'inspections',           count(*) FROM public.inspections           WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'job_completions',       count(*) FROM public.job_completions       WHERE lead_id = '<LEAD_ID>'
ORDER BY 1;
```

```sql
-- A3. The Storage objects. THIS IS THE LIST YOU MUST ACT ON IN BLOCK B.
-- Screenshot it or copy it out — after the lead is deleted, nothing references
-- these paths and you will not be able to reconstruct them.
SELECT o.name                                   AS object_path,
       o.path_tokens[2]                         AS note_id,
       pg_size_pretty((o.metadata->>'size')::bigint) AS size,
       o.metadata->>'mimetype'                  AS mimetype,
       o.created_at
FROM storage.objects o
WHERE o.bucket_id = 'lead-note-attachments'
  AND o.name LIKE '<LEAD_ID>/%'
ORDER BY o.name;
```

```sql
-- A4. Cross-check A3 against the DB rows. These two counts MUST match.
-- A mismatch means either an upload left an orphan (object with no row) or a
-- row lost its object — resolve that before deleting anything.
SELECT (SELECT count(*) FROM storage.objects
         WHERE bucket_id = 'lead-note-attachments' AND name LIKE '<LEAD_ID>/%') AS storage_objects,
       (SELECT count(*) FROM public.lead_note_attachments
         WHERE lead_id = '<LEAD_ID>' AND deleted_at IS NULL)                    AS live_attachment_rows,
       (SELECT count(*) FROM public.lead_note_attachments
         WHERE lead_id = '<LEAD_ID>')                                           AS all_attachment_rows;
-- Note: a soft-deleted attachment (deleted_at set) keeps its Storage object unless
-- the UI's delete path removed it, so `all_attachment_rows` is the number to compare
-- against storage_objects, not `live_attachment_rows`.
```

```sql
-- A5. Confirm the cascade claim for yourself rather than trusting this document.
SELECT tc.table_name AS child_table, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'leads'
GROUP BY 1, 2
ORDER BY 2, 1;
```

---

## BLOCK B — the deletion. Storage FIRST, then one DB transaction.

### B1 — Storage objects. Do this BEFORE B2.

**Preferred: the Dashboard.** Storage → `lead-note-attachments` → open the `<LEAD_ID>` folder →
select all → Delete.

Use the Dashboard rather than SQL because the Storage API delete removes **both** the
`storage.objects` row **and** the file in the storage backend. A raw `DELETE FROM storage.objects`
removes only the index row — the backing file stays behind, unreferenced and unlistable, which is
the exact orphaning this runbook exists to prevent.

**SQL fallback**, only if the Dashboard folder will not open or the objects are not visible there.
Accept that this leaves the backend blob behind:

```sql
-- B1-fallback. Index rows only. Run A3 first and keep its output.
BEGIN;

DELETE FROM storage.objects
WHERE bucket_id = 'lead-note-attachments'
  AND name LIKE '<LEAD_ID>/%';
-- EXPECT the row count to equal A3's row count exactly. If it is higher, the
-- LIKE matched something it should not have — ROLLBACK and re-read A3.

COMMIT;   -- or ROLLBACK;
```

### B2 — the lead. One transaction, nothing commits until Block C.

```sql
BEGIN;

DELETE FROM public.leads WHERE id = '<LEAD_ID>';
-- EXPECT: DELETE 1. If it says DELETE 0 you have the wrong id — ROLLBACK.

-- Still inside the transaction: every count below must now be 0.
SELECT 'lead_notes'            AS child, count(*) FROM public.lead_notes            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_mentions',    count(*) FROM public.lead_note_mentions    WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_attachments', count(*) FROM public.lead_note_attachments WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'notifications',         count(*) FROM public.notifications         WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'activities',            count(*) FROM public.activities            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'inspections',           count(*) FROM public.inspections           WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'job_completions',       count(*) FROM public.job_completions       WHERE lead_id = '<LEAD_ID>'
ORDER BY 1;
```

---

## BLOCK C — commit, or abandon

```sql
COMMIT;     -- only if DELETE reported 1 and every Block B2 count was 0
-- ROLLBACK;   -- if anything looked wrong; nothing is lost
```

---

## BLOCK D — post-commit verification

```sql
-- D1. The lead is gone.
SELECT count(*) AS should_be_zero FROM public.leads WHERE id = '<LEAD_ID>';
```

```sql
-- D2. The bucket folder is empty. THIS IS THE ONE THAT PROVES NOTHING WAS ORPHANED.
SELECT count(*) AS should_be_zero
FROM storage.objects
WHERE bucket_id = 'lead-note-attachments'
  AND name LIKE '<LEAD_ID>/%';
```

```sql
-- D3. Every child row is gone.
SELECT 'lead_notes'            AS child, count(*) FROM public.lead_notes            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_mentions',    count(*) FROM public.lead_note_mentions    WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'lead_note_attachments', count(*) FROM public.lead_note_attachments WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'notifications',         count(*) FROM public.notifications         WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'activities',            count(*) FROM public.activities            WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'inspections',           count(*) FROM public.inspections           WHERE lead_id = '<LEAD_ID>'
UNION ALL SELECT 'job_completions',       count(*) FROM public.job_completions       WHERE lead_id = '<LEAD_ID>'
ORDER BY 1;
-- EXPECT: all zero.
```

```sql
-- D4. No stray ZZ TEST leads left behind from an earlier round.
SELECT id, full_name, created_at
FROM public.leads
WHERE full_name ILIKE 'ZZ TEST%'
ORDER BY created_at DESC;
-- EXPECT: 0 rows.
```

```sql
-- D5. Whole-bucket orphan sweep. Catches anything left by an earlier test where
-- the lead was deleted before its Storage objects were.
SELECT o.path_tokens[1] AS orphan_lead_id, count(*) AS objects
FROM storage.objects o
WHERE o.bucket_id = 'lead-note-attachments'
  AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.id::text = o.path_tokens[1])
GROUP BY 1
ORDER BY 1;
-- EXPECT: 0 rows. Anything here is an orphaned file whose lead no longer exists —
-- delete it from the Dashboard using the path shown.
```

```sql
-- D6. Audit trail intact — this MUST still return rows.
SELECT entity_type, count(*) FROM public.audit_logs GROUP BY 1 ORDER BY 1;
```

---

## After this runbook

The `lead-note-attachments` bucket held **0 objects** as of 26 Aug 2026 (checked before the test
lead existed), so D5 returning anything at all means this test round orphaned something — go back
to B1 and clear it from the Dashboard.

Nothing here touches Edge Functions, migrations, or the `leads` sequence. No `db push`,
`db reset` or `migration repair` at any point.
