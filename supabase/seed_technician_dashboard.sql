-- =============================================================================
-- Seed: 3 leads + 3 calendar bookings for Technician Dashboard testing
-- Target user: michaelyoussef396@gmail.com
-- Date: 2026-02-08 (today, Melbourne AEDT = UTC+11)
--
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql
-- 2. Paste this entire file
-- 3. Click "Run"
-- =============================================================================

DO $$
DECLARE
    target_user_id uuid := 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';
    lead1_id uuid := gen_random_uuid();
    lead2_id uuid := gen_random_uuid();
    lead3_id uuid := gen_random_uuid();
BEGIN
    -- 1. Insert 3 realistic Melbourne leads (uses lead_source, NOT source)
    INSERT INTO public.leads (
        id, full_name, phone, email,
        property_address_street, property_address_suburb, property_address_state, property_address_postcode,
        property_zone, issue_description, status, lead_source, urgency, property_type,
        assigned_to, inspection_scheduled_date, access_instructions
    ) VALUES (
        lead1_id,
        'Angela Rossi', '0412 345 678', 'angela.rossi@email.com',
        '14 Collins Street', 'Richmond', 'VIC', '3121',
        1, 'Black mould in bathroom ceiling and around window frames. Worsening after recent rain. Tenant reports musty smell throughout unit.',
        'inspection_waiting', 'Website', 'high', 'apartment',
        target_user_id, '2026-02-08',
        'Unit 4, buzzer at front gate. Tenant home all day.'
    ), (
        lead2_id,
        'David Nguyen', '0438 765 432', 'david.nguyen@email.com',
        '87 Glenferrie Road', 'Hawthorn', 'VIC', '3122',
        1, 'Mould discovered behind wardrobe in master bedroom after moving furniture. Possibly spreading to adjacent wall. Owner-occupied house.',
        'inspection_waiting', 'Google', 'medium', 'house',
        target_user_id, '2026-02-08',
        'Driveway parking available. Ring doorbell on arrival.'
    ), (
        lead3_id,
        'Karen Mitchell', '0455 123 890', 'karen.m@outlook.com',
        '22 Beach Road', 'Sandringham', 'VIC', '3191',
        2, 'Green mould on subfloor timbers found during renovation. Builder flagged it and recommended specialist inspection before proceeding.',
        'inspection_waiting', 'Referral', 'high', 'house',
        target_user_id, '2026-02-08',
        'Side gate is unlocked. Go through to backyard, subfloor access hatch near laundry.'
    );

    -- 2. Insert 3 calendar bookings for TODAY
    -- Melbourne AEDT = UTC+11, timestamps use AT TIME ZONE for correctness
    INSERT INTO public.calendar_bookings (
        title, event_type, status,
        start_datetime, end_datetime,
        location_address, description,
        lead_id, assigned_to, travel_time_minutes,
        travel_from_suburb, travel_to_suburb
    ) VALUES (
        'Mould Inspection - Angela Rossi', 'inspection', 'scheduled',
        '2026-02-08 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '2026-02-08 10:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '14 Collins Street, Richmond VIC 3121',
        'Bathroom ceiling and window frames. High urgency - tenant reported musty smell.',
        lead1_id, target_user_id, 18,
        'Warehouse', 'Richmond'
    ), (
        'Mould Inspection - David Nguyen', 'inspection', 'scheduled',
        '2026-02-08 11:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '2026-02-08 12:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '87 Glenferrie Road, Hawthorn VIC 3122',
        'Master bedroom wardrobe wall mould. Medium urgency - owner occupied.',
        lead2_id, target_user_id, 12,
        'Richmond', 'Hawthorn'
    ), (
        'Mould Inspection - Karen Mitchell', 'inspection', 'scheduled',
        '2026-02-08 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '2026-02-08 15:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne',
        '22 Beach Road, Sandringham VIC 3191',
        'Subfloor mould found during renovation. High urgency - builder waiting.',
        lead3_id, target_user_id, 25,
        'Hawthorn', 'Sandringham'
    );

    RAISE NOTICE 'Seeded 3 leads and 3 bookings for Feb 8 2026 (Melbourne time).';
    RAISE NOTICE 'Lead IDs: %, %, %', lead1_id, lead2_id, lead3_id;
END $$;

-- 3. Verification query
SELECT
    cb.title,
    cb.start_datetime AT TIME ZONE 'Australia/Melbourne' AS melbourne_time,
    cb.status,
    cb.travel_time_minutes AS travel_min,
    l.full_name,
    l.property_address_suburb AS suburb
FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE cb.assigned_to = 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e'
  AND (cb.start_datetime AT TIME ZONE 'Australia/Melbourne')::date = '2026-02-08'
ORDER BY cb.start_datetime;
