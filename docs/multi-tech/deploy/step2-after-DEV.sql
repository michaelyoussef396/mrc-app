-- STEP 2 · AFTER checks for 0a on DEV (ctppzqnysmzynkxjlzta — sandbox)
-- Run each block ON ITS OWN (Studio shows only the last result set).
-- Every value below is an identity against the DEV BEFORE numbers captured 2026-08-30:
--   B1 = 3 rows · B4 = 9 indexes · B7 = 0 audit rows · B5 fingerprint = e92d84bdba558ccf08fa97828f26d217

-- A1 · Column shape. Expect exactly one row: booking_group_id | uuid | NO | gen_random_uuid()
--      is_nullable = YES ⇒ STOP. column_default NULL ⇒ STOP and roll back (every INSERT would now fail).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'calendar_bookings'
  AND column_name = 'booking_group_id';

-- A2 · One distinct group per row (GUARD 2 restated). Expect 3 | 3 | 0
SELECT count(*)                                          AS bookings,
       count(DISTINCT booking_group_id)                  AS distinct_groups,
       count(*) FILTER (WHERE booking_group_id IS NULL)  AS nulls
FROM public.calendar_bookings;

-- A3 · Indexes. Expect the 9 from D7 plus idx_calendar_bookings_booking_group_id = 10, nothing removed.
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'calendar_bookings'
ORDER BY indexname;

-- A4 · updated_at fingerprint — SAME t0 literal as D12. Expect row_count = 3, fingerprint = e92d84bdba558ccf08fa97828f26d217
SELECT count(*)        AS row_count,
       max(updated_at) AS newest_updated_at,
       md5(string_agg(id::text || '|' ||
                      coalesce(extract(epoch FROM updated_at)::text, 'NULL'),
                      ',' ORDER BY id)) AS fingerprint
FROM public.calendar_bookings
WHERE coalesce(created_at, '-infinity'::timestamptz) <= '2026-08-30 19:30:00+10'::timestamptz;

-- A4 discriminator · only if the fingerprint changed. Expect 0.
SELECT count(*) AS rows_touched_since_t0
FROM public.calendar_bookings
WHERE coalesce(created_at, '-infinity'::timestamptz) <= '2026-08-30 19:30:00+10'::timestamptz
  AND updated_at > '2026-08-30 19:30:00+10'::timestamptz;

-- A5 · Audit rows for this table. Expect 0 (identical to D10c).
SELECT count(*) AS audit_rows_after
FROM public.audit_logs WHERE entity_type = 'calendar_bookings';

-- A6 · GUARD 1 restated. Expect 0 rows.
SELECT lead_id, event_type, start_datetime,
       count(*)                         AS rows_in_group,
       array_agg(DISTINCT status::text) AS statuses,
       array_agg(id ORDER BY id)        AS booking_ids
FROM public.calendar_bookings
WHERE lead_id IS NOT NULL
  AND (status IS NULL OR status NOT IN ('cancelled', 'rescheduled'))
GROUP BY lead_id, event_type, start_datetime
HAVING count(*) > 1;

-- A7 · Readiness for 0b: every group holds exactly one row. Expect one row: rows_in_group = 1, number_of_groups = 3
SELECT rows_in_group, count(*) AS number_of_groups FROM (
  SELECT booking_group_id, count(*) AS rows_in_group
  FROM public.calendar_bookings GROUP BY booking_group_id
) g GROUP BY rows_in_group ORDER BY rows_in_group;

-- A8 · COMMENT landed (informational). Expect one non-null row.
SELECT col_description('public.calendar_bookings'::regclass,
       (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.calendar_bookings'::regclass AND attname = 'booking_group_id')) IS NOT NULL AS has_comment;
