-- =============================================================================
-- Seed: 50 realistic Melbourne inspection_waiting leads with calendar bookings
-- Target technician: michaelyoussef396@gmail.com
-- Date range: March 3 - March 28, 2026 (20 business days)
-- Phone range: 0412300051 - 0412300100 (for idempotent cleanup)
--
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard/project/ecyivrxjpsmjmexqatym/sql
-- 2. Paste this entire file
-- 3. Click "Run"
--
-- Distribution:
--   Complexity: 15 simple (60m), 20 moderate (75m), 10 complex (90m), 5 urgent (90m)
--   Urgency:    5 emergency, 15 high, 20 medium, 10 low
--   Sources:    15 Website, 10 Phone, 10 Referral, 10 Google, 5 Other
--   Zones:      Zone 1 (inner), Zone 2 (middle), Zone 3 (outer)
-- =============================================================================

DO $$
DECLARE
  tech_id uuid := 'd22fa3bb-9bf0-4e27-8681-1f09841f0d8e';
  lid_01 uuid; lid_02 uuid; lid_03 uuid; lid_04 uuid; lid_05 uuid;
  lid_06 uuid; lid_07 uuid; lid_08 uuid; lid_09 uuid; lid_10 uuid;
  lid_11 uuid; lid_12 uuid; lid_13 uuid; lid_14 uuid; lid_15 uuid;
  lid_16 uuid; lid_17 uuid; lid_18 uuid; lid_19 uuid; lid_20 uuid;
  lid_21 uuid; lid_22 uuid; lid_23 uuid; lid_24 uuid; lid_25 uuid;
  lid_26 uuid; lid_27 uuid; lid_28 uuid; lid_29 uuid; lid_30 uuid;
  lid_31 uuid; lid_32 uuid; lid_33 uuid; lid_34 uuid; lid_35 uuid;
  lid_36 uuid; lid_37 uuid; lid_38 uuid; lid_39 uuid; lid_40 uuid;
  lid_41 uuid; lid_42 uuid; lid_43 uuid; lid_44 uuid; lid_45 uuid;
  lid_46 uuid; lid_47 uuid; lid_48 uuid; lid_49 uuid; lid_50 uuid;
BEGIN

-- =========================================================================
-- CLEANUP: Delete previously seeded data (idempotent re-runs)
-- =========================================================================
DELETE FROM public.calendar_bookings WHERE lead_id IN (
  SELECT id FROM public.leads WHERE phone >= '0412300051' AND phone <= '0412300100'
);
DELETE FROM public.leads WHERE phone >= '0412300051' AND phone <= '0412300100';

-- =========================================================================
-- DAY 1: Tuesday March 3, 2026 — 3 leads
-- =========================================================================

-- #1: Liam Fitzgerald — Richmond, 08:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Liam Fitzgerald', 'liam.fitzgerald@gmail.com', '0412300051', '18 Swan Street', 'Richmond', 'VIC', '3121', 1, 'Website Form', 'Black mould appearing on the bathroom ceiling near the exhaust fan. The fan doesn''t seem to be extracting properly. Noticed it about two weeks ago and it''s slowly getting bigger.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-03', '08:00', NULL, '2026-02-21 09:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_01;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_01, 'inspection', 'Mould Inspection - Liam Fitzgerald', '2026-03-03 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-03 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '18 Swan Street, Richmond VIC 3121', tech_id, 'scheduled', 'Richmond', 'Richmond');

-- #2: Anh Nguyen — South Yarra, 11:00, moderate/75m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Anh Nguyen', 'anh.nguyen@outlook.com', '0412300052', 'Unit 4/55 Chapel Street', 'South Yarra', 'VIC', '3141', 1, 'Phone Call (Direct)', 'Mould growing on bedroom walls and window frames in our apartment. The building has poor ventilation and we get a lot of condensation in winter. My wife is pregnant and we''re worried about health effects.', 'high', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-03', '11:00', 'Customer called very concerned about pregnant wife. Prefers morning appointments. Building access via intercom — Unit 4.', '2026-02-20 14:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_02;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_02, 'inspection', 'Mould Inspection - Anh Nguyen', '2026-03-03 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-03 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', 'Unit 4/55 Chapel Street, South Yarra VIC 3141', tech_id, 'scheduled', 'Richmond', 'South Yarra');

-- #3: Patrick O'Sullivan — Camberwell, 14:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Patrick O''Sullivan', 'patrick.osullivan@email.com', '0412300053', '37 Burke Road', 'Camberwell', 'VIC', '3124', 2, 'Customer Referral', 'Found mould behind furniture in the study and along the skirting boards in the hallway. The house is on a slope and I think moisture may be coming up from the subfloor. Referred by a friend who used your services.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-03', '14:00', 'Referred by Anthony Rossi (existing customer). Has flexible schedule. House has easy rear access for equipment.', '2026-02-22 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_03;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_03, 'inspection', 'Mould Inspection - Patrick O''Sullivan', '2026-03-03 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-03 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '37 Burke Road, Camberwell VIC 3124', tech_id, 'scheduled', 'South Yarra', 'Camberwell');

-- =========================================================================
-- DAY 2: Wednesday March 4, 2026 — 2 leads
-- =========================================================================

-- #4: Gemma Harrison — Hawthorn, 09:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Gemma Harrison', 'gemma.harrison@yahoo.com.au', '0412300054', '82 Glenferrie Road', 'Hawthorn', 'VIC', '3122', 2, 'Google Search (Organic)', 'Small patches of mould on the bathroom grout and around the shower screen. It keeps coming back after cleaning. Looking for advice on whether this is something that needs professional treatment.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-04', '09:00', NULL, '2026-02-23 10:20:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_04;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_04, 'inspection', 'Mould Inspection - Gemma Harrison', '2026-03-04 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-04 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '82 Glenferrie Road, Hawthorn VIC 3122', tech_id, 'scheduled', 'Richmond', 'Hawthorn');

-- #5: Raj Patel — Fitzroy, 13:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Raj Patel', 'raj.patel@gmail.com', '0412300055', '15 Smith Street', 'Fitzroy', 'VIC', '3065', 1, 'Google Ads', 'Extensive mould discovered during bathroom renovation. The builder found it behind the tiles and into the wall cavity. Work has stopped until we get a professional assessment. Mould appears to extend into the adjacent bedroom wall.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-04', '13:00', 'Builder on site can provide access. Renovation currently on hold. May need to coordinate with builder''s schedule.', '2026-02-21 16:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_05;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_05, 'inspection', 'Mould Inspection - Raj Patel', '2026-03-04 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-04 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '15 Smith Street, Fitzroy VIC 3065', tech_id, 'scheduled', 'Hawthorn', 'Fitzroy');

-- =========================================================================
-- DAY 3: Thursday March 5, 2026 — 3 leads
-- =========================================================================

-- #6: Natalie Costa — Carlton, 08:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Natalie Costa', 'natalie.costa@hotmail.com', '0412300056', '44 Nicholson Street', 'Carlton', 'VIC', '3053', 1, 'Phone Call (Direct)', 'Light mould spots on the laundry ceiling where the dryer vents. The room has no window and minimal ventilation. Would like an assessment and recommendations for preventing recurrence.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-05', '08:00', 'Tenant — landlord has approved inspection. Access via front door. Parking available on street.', '2026-02-24 08:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_06;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_06, 'inspection', 'Mould Inspection - Natalie Costa', '2026-03-05 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-05 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '44 Nicholson Street, Carlton VIC 3053', tech_id, 'scheduled', 'Richmond', 'Carlton');

-- #7: David Kim — Collingwood, 10:00, moderate/75m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('David Kim', 'david.kim@email.com', '0412300057', '9 Johnston Street', 'Collingwood', 'VIC', '3066', 1, 'Customer Referral', 'Mould growing along external walls in two bedrooms. The paint is peeling and the walls feel damp. House is a 1920s weatherboard with no insulation. Concerned it may be related to a roof leak we had last winter.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-05', '10:00', 'Older weatherboard home — may need to check subfloor access. Customer works from home, available any day.', '2026-02-22 13:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_07;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_07, 'inspection', 'Mould Inspection - David Kim', '2026-03-05 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-05 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '9 Johnston Street, Collingwood VIC 3066', tech_id, 'scheduled', 'Carlton', 'Collingwood');

-- #8: Isabelle Martin — Brunswick, 15:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Isabelle Martin', 'isabelle.martin@gmail.com', '0412300058', '120 Sydney Road', 'Brunswick', 'VIC', '3056', 1, 'Website Form', 'Noticed some grey mould spots forming on the ceiling in the spare bedroom. The room doesn''t get much use and is quite cold in winter. Just want someone to take a look and advise.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-05', '15:00', NULL, '2026-02-25 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_08;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_08, 'inspection', 'Mould Inspection - Isabelle Martin', '2026-03-05 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-05 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '120 Sydney Road, Brunswick VIC 3056', tech_id, 'scheduled', 'Collingwood', 'Brunswick');

-- =========================================================================
-- DAY 4: Friday March 6, 2026 — 2 leads
-- =========================================================================

-- #9: Steve Angelopoulos — Box Hill, 09:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Steve Angelopoulos', 'steve.angelopoulos@gmail.com', '0412300059', '28 Whitehorse Road', 'Box Hill', 'VIC', '3128', 2, 'Google Ads', 'Mould in the ensuite bathroom and walk-in wardrobe. The wardrobe has a musty smell and some clothing has been damaged. The ensuite shower recess has persistent black mould despite regular cleaning.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-06', '09:00', NULL, '2026-02-24 15:40:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_09;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_09, 'inspection', 'Mould Inspection - Steve Angelopoulos', '2026-03-06 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-06 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '28 Whitehorse Road, Box Hill VIC 3128', tech_id, 'scheduled', 'Richmond', 'Box Hill');

-- #10: Rachel Green — Glen Waverley, 14:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Rachel Green', 'rachel.green@icloud.com', '0412300060', '63 Springvale Road', 'Glen Waverley', 'VIC', '3150', 2, 'Phone Call (Direct)', 'Significant mould growth in the subfloor area discovered by a plumber during pipe repairs. The subfloor has poor ventilation and standing water in some areas. The plumber said it needs professional mould assessment before he can continue work.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-06', '14:00', 'Plumber recommended us. Subfloor access via external hatch on south side. Bring torch and coveralls.', '2026-02-23 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_10;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_10, 'inspection', 'Mould Inspection - Rachel Green', '2026-03-06 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-06 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '63 Springvale Road, Glen Waverley VIC 3150', tech_id, 'scheduled', 'Box Hill', 'Glen Waverley');

-- =========================================================================
-- DAY 5: Saturday March 7, 2026 — 3 leads
-- =========================================================================

-- #11: Oliver Wright — Frankston, 08:00, urgent/90m, emergency
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Oliver Wright', 'oliver.wright@gmail.com', '0412300061', '7 Young Street', 'Frankston', 'VIC', '3199', 3, 'Website Form', 'Flooding from a burst pipe last week has caused mould to appear on walls and carpet within days. The affected area covers the living room and two bedrooms. We need urgent assessment — my daughter has asthma and is already showing symptoms.', 'emergency', 'residential_house', 'inspection_waiting', tech_id, '2026-03-07', '08:00', 'URGENT — child with asthma in household. Contents insurer involved. Customer needs assessment report ASAP for claim.', '2026-02-28 07:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_11;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_11, 'inspection', 'Mould Inspection - Oliver Wright', '2026-03-07 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-07 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '7 Young Street, Frankston VIC 3199', tech_id, 'scheduled', 'Richmond', 'Frankston');

-- #12: Zara Hussain — Carnegie, 11:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Zara Hussain', 'zara.hussain@outlook.com', '0412300062', 'Unit 6/22 Koornang Road', 'Carnegie', 'VIC', '3163', 2, 'Customer Referral', 'Mould on the bathroom ceiling and around the kitchen rangehood area. The apartment ventilation system doesn''t seem adequate. We''ve been using dehumidifiers but the mould keeps returning.', 'medium', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-07', '11:00', 'Body corp contact: Margaret 0412 555 789. Apartment on ground floor. Parking in visitor bay.', '2026-02-25 11:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_12;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_12, 'inspection', 'Mould Inspection - Zara Hussain', '2026-03-07 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-07 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', 'Unit 6/22 Koornang Road, Carnegie VIC 3163', tech_id, 'scheduled', 'Frankston', 'Carnegie');

-- #13: Marcus Lee — Frankston, 16:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Marcus Lee', 'marcus.lee@protonmail.com', '0412300063', '51 Cranbourne Road', 'Frankston', 'VIC', '3199', 3, 'Google Search (Organic)', 'Extensive mould under the house in the subfloor area. The property has poor drainage on the south side and previous water damage from blocked gutters. Need a full assessment including air quality testing. Insurance may be involved.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-07', '16:00', 'Large property — inspection may take longer than standard. Bring moisture meter for subfloor. Previous water damage documented by insurance.', '2026-02-24 14:20:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_13;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_13, 'inspection', 'Mould Inspection - Marcus Lee', '2026-03-07 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-07 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '51 Cranbourne Road, Frankston VIC 3199', tech_id, 'scheduled', 'Carnegie', 'Frankston');

-- =========================================================================
-- DAY 6: Tuesday March 10, 2026 — 2 leads
-- =========================================================================

-- #14: Sophie Taylor — Balwyn, 10:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Sophie Taylor', 'sophie.taylor@gmail.com', '0412300064', '14 Balwyn Road', 'Balwyn', 'VIC', '3103', 2, 'Website Form', 'Minor mould spots on window sills in the living room. Only appears during the colder months. Looking for a professional opinion on whether it''s a structural issue or just condensation.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-10', '10:00', NULL, '2026-02-28 09:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_14;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_14, 'inspection', 'Mould Inspection - Sophie Taylor', '2026-03-10 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-10 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '14 Balwyn Road, Balwyn VIC 3103', tech_id, 'scheduled', 'Richmond', 'Balwyn');

-- #15: Tariq Mohammed — Malvern, 14:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Tariq Mohammed', 'tariq.mohammed@email.com', '0412300065', '89 Wattletree Road', 'Malvern', 'VIC', '3144', 2, 'Phone Call (Direct)', 'Mould growing behind the kitchen cabinets near the external wall. Discovered when removing old splashback tiles. The plaster underneath is soft and damp. Want to know the extent before proceeding with the kitchen renovation.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-10', '14:00', 'Kitchen reno in progress — some areas are partially demolished. Customer will clear access before appointment.', '2026-02-27 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_15;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_15, 'inspection', 'Mould Inspection - Tariq Mohammed', '2026-03-10 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-10 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '89 Wattletree Road, Malvern VIC 3144', tech_id, 'scheduled', 'Balwyn', 'Malvern');

-- =========================================================================
-- DAY 7: Wednesday March 11, 2026 — 3 leads
-- =========================================================================

-- #16: Emily Chen — Carlton, 08:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Emily Chen', 'emily.chen@business.com', '0412300066', '3 Lygon Street', 'Carlton', 'VIC', '3053', 1, 'Website Form', 'Mould found in the ceiling cavity and behind wall panelling of our retail shop. Two staff members have reported respiratory issues. Need urgent professional assessment for WorkSafe compliance documentation.', 'high', 'commercial_retail', 'inspection_waiting', tech_id, '2026-03-11', '08:00', 'WorkSafe deadline in 2 weeks. Need formal report with air quality recommendations. Contact: Emily Chen (owner).', '2026-03-01 10:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_16;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_16, 'inspection', 'Mould Inspection - Emily Chen', '2026-03-11 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-11 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '3 Lygon Street, Carlton VIC 3053', tech_id, 'scheduled', 'Richmond', 'Carlton');

-- #17: Jake Morrison — Richmond, 11:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Jake Morrison', 'jake.morrison@yahoo.com.au', '0412300067', '46 Bridge Road', 'Richmond', 'VIC', '3121', 1, 'Customer Referral', 'Mould on the bathroom ceiling that keeps coming back despite treating it with Exit Mould. The exhaust fan is old and probably needs replacing. Want a professional assessment and quote.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-11', '11:00', 'Repeat customer — used us for bathroom mould treatment in 2025. Straightforward job. Ground floor access.', '2026-02-28 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_17;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_17, 'inspection', 'Mould Inspection - Jake Morrison', '2026-03-11 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-11 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '46 Bridge Road, Richmond VIC 3121', tech_id, 'scheduled', 'Carlton', 'Richmond');

-- #18: Priscilla Ramirez — Caulfield, 15:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Priscilla Ramirez', 'priscilla.ramirez@outlook.com', '0412300068', 'Unit 11/78 Glenhuntly Road', 'Caulfield', 'VIC', '3162', 2, 'Phone Call (Direct)', 'Small amount of mould around the bedroom window frame. The window gets a lot of condensation. Just moved in three months ago and want to address it before it gets worse.', 'low', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-11', '15:00', NULL, '2026-03-02 11:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_18;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_18, 'inspection', 'Mould Inspection - Priscilla Ramirez', '2026-03-11 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-11 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', 'Unit 11/78 Glenhuntly Road, Caulfield VIC 3162', tech_id, 'scheduled', 'Richmond', 'Caulfield');

-- =========================================================================
-- DAY 8: Thursday March 12, 2026 — 2 leads
-- =========================================================================

-- #19: Andrew Campbell — Bentleigh, 09:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Andrew Campbell', 'andrew.campbell@gmail.com', '0412300069', '55 Centre Road', 'Bentleigh', 'VIC', '3204', 2, 'Google Ads', 'Mould in the garage and adjoining laundry room. The garage gets wet when it rains and the laundry has internal venting from the dryer. Both areas smell musty and have visible mould on the walls.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-12', '09:00', 'Garage floods in heavy rain — drainage issue. May need to inspect during or after rain for best assessment.', '2026-03-02 09:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_19;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_19, 'inspection', 'Mould Inspection - Andrew Campbell', '2026-03-12 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-12 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '55 Centre Road, Bentleigh VIC 3204', tech_id, 'scheduled', 'Richmond', 'Bentleigh');

-- #20: Kylie Bennett — Cranbourne, 13:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Kylie Bennett', 'kylie.bennett@email.com', '0412300070', '31 High Street', 'Cranbourne', 'VIC', '3977', 3, 'Website Form', 'Major water damage from a roof leak during recent storms has led to mould growth in two bedrooms and the hallway ceiling. The ceiling plasterboard is sagging in one area. Insurance claim has been lodged — need assessment report for the claim.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-12', '13:00', 'Insurance claim lodged with AAMI — claim #CLM-2026-78901. Need detailed report with photos for assessor.', '2026-02-28 14:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_20;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_20, 'inspection', 'Mould Inspection - Kylie Bennett', '2026-03-12 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-12 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '31 High Street, Cranbourne VIC 3977', tech_id, 'scheduled', 'Bentleigh', 'Cranbourne');

-- =========================================================================
-- DAY 9: Friday March 13, 2026 — 3 leads
-- =========================================================================

-- #21: Hassan Ali — Epping, 08:00, urgent/90m, emergency
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Hassan Ali', 'hassan.ali@gmail.com', '0412300071', '72 Plenty Road', 'Epping', 'VIC', '3076', 3, 'Google Ads', 'Flash flooding affected our garage and ground floor two weeks ago. Mould is now spreading rapidly across the affected walls and flooring. We''ve been told not to touch it. Need emergency assessment and remediation plan.', 'emergency', 'residential_house', 'inspection_waiting', tech_id, '2026-03-13', '08:00', 'EMERGENCY — family staying with relatives. House keys with neighbour at #74. Need assessment within 48 hours.', '2026-03-07 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_21;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_21, 'inspection', 'Mould Inspection - Hassan Ali', '2026-03-13 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-13 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '72 Plenty Road, Epping VIC 3076', tech_id, 'scheduled', 'Richmond', 'Epping');

-- #22: Charlotte Evans — Richmond, 10:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Charlotte Evans', 'charlotte.evans@hotmail.com', '0412300072', '19 Church Street', 'Richmond', 'VIC', '3121', 1, 'Customer Referral', 'Mould spots on the bathroom ceiling and around the exhaust fan. It''s a recurring issue that keeps coming back every winter. Would like to understand the root cause.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-13', '10:00', NULL, '2026-03-03 10:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_22;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_22, 'inspection', 'Mould Inspection - Charlotte Evans', '2026-03-13 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-13 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '19 Church Street, Richmond VIC 3121', tech_id, 'scheduled', 'Epping', 'Richmond');

-- #23: Ben Kaplan — South Yarra, 14:00, moderate/75m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Ben Kaplan', 'ben.kaplan@gmail.com', '0412300073', 'Unit 2/40 Toorak Road', 'South Yarra', 'VIC', '3141', 1, 'Website Form', 'Mould growing on the walls and ceiling of the apartment bedroom that faces south. The wall is cold to touch and gets condensation. Building management has been slow to respond. Need independent assessment report.', 'high', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-13', '14:00', 'Body corp has been notified. Strata manager: Peter Smith 0398765432. Customer may pursue building defect claim.', '2026-03-02 15:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_23;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_23, 'inspection', 'Mould Inspection - Ben Kaplan', '2026-03-13 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-13 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', 'Unit 2/40 Toorak Road, South Yarra VIC 3141', tech_id, 'scheduled', 'Richmond', 'South Yarra');

-- =========================================================================
-- DAY 10: Saturday March 14, 2026 — 2 leads
-- =========================================================================

-- #24: Lucy Zhang — Malvern, 09:00, moderate/75m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Lucy Zhang', 'lucy.zhang@email.com', '0412300074', '25 Wattletree Road', 'Malvern', 'VIC', '3144', 2, 'Real Estate Agent', 'Pre-purchase mould inspection requested. The property is a 1960s house and the building inspector noted potential mould in the bathroom and subfloor. Need detailed assessment before settlement in three weeks.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-14', '09:00', 'Settlement date: April 2. Need report before March 28. Real estate agent: David Liu, Ray White Glen Waverley.', '2026-03-04 09:20:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_24;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_24, 'inspection', 'Mould Inspection - Lucy Zhang', '2026-03-14 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-14 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '25 Wattletree Road, Malvern VIC 3144', tech_id, 'scheduled', 'Richmond', 'Malvern');

-- #25: Tom Bradshaw — Narre Warren, 15:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Tom Bradshaw', 'tom.bradshaw@protonmail.com', '0412300075', '8 Narre Warren North Road', 'Narre Warren', 'VIC', '3805', 3, 'Google Search (Organic)', 'Multiple rooms affected by mould — bathroom, laundry, and master bedroom. The house has a history of plumbing leaks and poor subfloor ventilation. Previous owner may have painted over mould. Need comprehensive assessment.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-14', '15:00', 'Complex property with multiple issues. Allow extra time. Previous owner disclosed some water damage. Customer has home warranty insurance.', '2026-03-03 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_25;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_25, 'inspection', 'Mould Inspection - Tom Bradshaw', '2026-03-14 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-14 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '8 Narre Warren North Road, Narre Warren VIC 3805', tech_id, 'scheduled', 'Malvern', 'Narre Warren');

-- =========================================================================
-- DAY 11: Tuesday March 17, 2026 — 3 leads
-- =========================================================================

-- #26: Megan O'Connor — Brunswick, 08:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Megan O''Connor', 'megan.oconnor@icloud.com', '0412300076', '41 Lygon Street', 'Brunswick', 'VIC', '3056', 1, 'Website Form', 'Mould along the bottom of the bedroom wall where it meets the floor. The carpet feels damp in the corner. Suspect rising damp from the foundations. The house is a double-brick Victorian terrace.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-17', '08:00', NULL, '2026-03-06 14:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_26;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_26, 'inspection', 'Mould Inspection - Megan O''Connor', '2026-03-17 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-17 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '41 Lygon Street, Brunswick VIC 3056', tech_id, 'scheduled', 'Richmond', 'Brunswick');

-- #27: Daniel Russo — Hawthorn, 11:00, moderate/75m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Daniel Russo', 'daniel.russo@gmail.com', '0412300077', '16 Auburn Road', 'Hawthorn', 'VIC', '3122', 2, 'Phone Call (Direct)', 'Mould in the children''s bedroom along the external wall and around the window. Both kids have been getting frequent colds. The wall appears to have a bridged damp course. Need assessment and solutions.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-17', '11:00', 'Concerned parent — wants to understand health implications. May need to reference EPA guidelines in report. Children ages 3 and 5.', '2026-03-05 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_27;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_27, 'inspection', 'Mould Inspection - Daniel Russo', '2026-03-17 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-17 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '16 Auburn Road, Hawthorn VIC 3122', tech_id, 'scheduled', 'Brunswick', 'Hawthorn');

-- #28: Amara Okafor — Berwick, 14:00, urgent/90m, emergency
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Amara Okafor', 'amara.okafor@outlook.com', '0412300078', '93 Clyde Road', 'Berwick', 'VIC', '3806', 3, 'Customer Referral', 'Severe mould outbreak after a prolonged roof leak went undetected for weeks. Three bedrooms and the hallway ceiling are affected. We''ve had to move out temporarily. Insurance assessor requires professional mould report.', 'emergency', 'residential_house', 'inspection_waiting', tech_id, '2026-03-17', '14:00', 'URGENT — insurance assessor visiting March 20. Must have professional report ready. Family relocated to hotel — cost mounting.', '2026-03-10 08:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_28;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_28, 'inspection', 'Mould Inspection - Amara Okafor', '2026-03-17 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-17 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '93 Clyde Road, Berwick VIC 3806', tech_id, 'scheduled', 'Hawthorn', 'Berwick');

-- =========================================================================
-- DAY 12: Wednesday March 18, 2026 — 2 leads
-- =========================================================================

-- #29: Grace Sullivan — South Yarra, 09:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Grace Sullivan', 'grace.sullivan@gmail.com', '0412300079', 'Apt 8/12 Albert Road', 'South Yarra', 'VIC', '3141', 1, 'Phone Call (Direct)', 'Mould appearing on the bedroom wall behind the bed. It''s a ground floor apartment with limited airflow. Want professional advice on whether it''s a structural moisture issue or ventilation problem.', 'medium', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-18', '09:00', NULL, '2026-03-07 11:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_29;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_29, 'inspection', 'Mould Inspection - Grace Sullivan', '2026-03-18 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-18 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', 'Apt 8/12 Albert Road, South Yarra VIC 3141', tech_id, 'scheduled', 'Richmond', 'South Yarra');

-- #30: William Tan — Box Hill, 13:00, moderate/75m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('William Tan', 'william.tan@business.com', '0412300080', '67 Whitehorse Road', 'Box Hill', 'VIC', '3128', 2, 'Google Ads', 'Mould found in the office building air conditioning ducts during routine maintenance. Staff have complained about musty odours. Need assessment to determine extent and recommend remediation for commercial space.', 'low', 'commercial_office', 'inspection_waiting', tech_id, '2026-03-18', '13:00', 'Commercial lease tenant — landlord authorised inspection. After-hours access preferred. Building manager: Tony 0412 888 999.', '2026-03-08 09:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_30;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_30, 'inspection', 'Mould Inspection - William Tan', '2026-03-18 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-18 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '67 Whitehorse Road, Box Hill VIC 3128', tech_id, 'scheduled', 'South Yarra', 'Box Hill');

-- =========================================================================
-- DAY 13: Thursday March 19, 2026 — 3 leads
-- =========================================================================

-- #31: Chloe Peterson — Fitzroy, 08:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Chloe Peterson', 'chloe.peterson@icloud.com', '0412300081', '5 Johnston Street', 'Fitzroy', 'VIC', '3065', 1, 'Website Form', 'Mould throughout the basement storage area and creeping up into the ground floor living room. Recent heavy rains made it much worse. The property has a high water table and no effective waterproofing. Need full assessment.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-19', '08:00', 'Property near creek — flooding history. Basement has sump pump but it failed last month. Check pump status during inspection.', '2026-03-07 16:20:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_31;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_31, 'inspection', 'Mould Inspection - Chloe Peterson', '2026-03-19 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-19 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '5 Johnston Street, Fitzroy VIC 3065', tech_id, 'scheduled', 'Richmond', 'Fitzroy');

-- #32: Alex Dimitriou — Balwyn, 10:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Alex Dimitriou', 'alex.dimitriou@gmail.com', '0412300082', '30 Balwyn Road', 'Balwyn', 'VIC', '3103', 2, 'Customer Referral', 'Mould on the bathroom walls and ceiling that has spread to the adjacent linen cupboard. The grout is badly affected and some tiles are loose. The bathroom hasn''t been renovated since the house was built in the 1980s.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-19', '10:00', 'Elderly customer — please explain findings in plain language. Hearing impaired — face customer when speaking. Ground floor, easy access.', '2026-03-09 10:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_32;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_32, 'inspection', 'Mould Inspection - Alex Dimitriou', '2026-03-19 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-19 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '30 Balwyn Road, Balwyn VIC 3103', tech_id, 'scheduled', 'Fitzroy', 'Balwyn');

-- #33: Nina Kowalski — Werribee, 16:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Nina Kowalski', 'nina.kowalski@email.com', '0412300083', '48 Watton Street', 'Werribee', 'VIC', '3030', 3, 'Phone Call (Direct)', 'Mould affecting multiple areas of the house — bathroom, kitchen, and laundry. The house has poor cross-ventilation and sits on a low-lying block that retains water. Need comprehensive assessment with moisture mapping.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-19', '16:00', 'Large single-storey home on quarter-acre block. Allow extra time for full inspection. Subfloor access via manhole in hallway.', '2026-03-08 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_33;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_33, 'inspection', 'Mould Inspection - Nina Kowalski', '2026-03-19 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-19 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '48 Watton Street, Werribee VIC 3030', tech_id, 'scheduled', 'Balwyn', 'Werribee');

-- =========================================================================
-- DAY 14: Friday March 20, 2026 — 2 leads
-- =========================================================================

-- #34: Sam Fletcher — Carnegie, 09:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Sam Fletcher', 'sam.fletcher@outlook.com', '0412300084', '22 Koornang Road', 'Carnegie', 'VIC', '3163', 2, 'Website Form', 'Noticed mould spots on the apartment bathroom ceiling after returning from holiday. The exhaust fan was off while we were away for three weeks. Want someone to check if it''s surface level or deeper.', 'low', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-20', '09:00', NULL, '2026-03-10 11:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_34;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_34, 'inspection', 'Mould Inspection - Sam Fletcher', '2026-03-20 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-20 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '22 Koornang Road, Carnegie VIC 3163', tech_id, 'scheduled', 'Richmond', 'Carnegie');

-- #35: Fatima Abboud — Glen Waverley, 14:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Fatima Abboud', 'fatima.abboud@gmail.com', '0412300085', '74 Springvale Road', 'Glen Waverley', 'VIC', '3150', 2, 'Property Manager', 'Property manager requesting mould inspection for a tenant-occupied unit. Tenant has reported mould in the bedroom and bathroom. Need professional report for landlord to determine responsibility and required repairs.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-20', '14:00', 'Property manager: Sarah at Ray White Malvern. Tenant present during inspection. Report to be sent to property manager, not tenant.', '2026-03-09 15:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_35;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_35, 'inspection', 'Mould Inspection - Fatima Abboud', '2026-03-20 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-20 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '74 Springvale Road, Glen Waverley VIC 3150', tech_id, 'scheduled', 'Carnegie', 'Glen Waverley');

-- =========================================================================
-- DAY 15: Saturday March 21, 2026 — 3 leads
-- =========================================================================

-- #36: Jordan Gallagher — Frankston, 08:00, urgent/90m, emergency
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Jordan Gallagher', 'jordan.gallagher@yahoo.com.au', '0412300086', '11 High Street', 'Frankston', 'VIC', '3199', 3, 'Google Search (Organic)', 'Emergency — our home was flooded during the recent storm event and mould has appeared within a week. The entire ground floor is affected including carpets, walls, and built-in wardrobes. Family relocated to hotel. Need immediate assessment.', 'emergency', 'residential_house', 'inspection_waiting', tech_id, '2026-03-21', '08:00', 'EMERGENCY — SES attended initial flood. Contents removal in progress. Insurance: RACV claim #INS-2026-45678. Large two-storey home.', '2026-03-14 07:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_36;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_36, 'inspection', 'Mould Inspection - Jordan Gallagher', '2026-03-21 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-21 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '11 High Street, Frankston VIC 3199', tech_id, 'scheduled', 'Richmond', 'Frankston');

-- #37: Lisa Beaumont — Camberwell, 11:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Lisa Beaumont', 'lisa.beaumont@email.com', '0412300087', '56 Camberwell Road', 'Camberwell', 'VIC', '3124', 2, 'Customer Referral', 'Mould growing behind the wardrobe in the master bedroom. Discovered when rearranging furniture. The wall is damp and the paint is peeling. The house backs onto a retaining wall and I suspect water seepage.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-21', '11:00', 'Retaining wall behind property may be source of moisture. Previous owner built it without proper drainage. Check for water ingress.', '2026-03-10 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_37;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_37, 'inspection', 'Mould Inspection - Lisa Beaumont', '2026-03-21 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-21 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '56 Camberwell Road, Camberwell VIC 3124', tech_id, 'scheduled', 'Frankston', 'Camberwell');

-- #38: Michael Andersen — Collingwood, 15:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Michael Andersen', 'michael.andersen@hotmail.com', '0412300088', 'Unit 3/15 Smith Street', 'Collingwood', 'VIC', '3066', 1, 'Website Form', 'Mould on the kitchen ceiling near the rangehood. The apartment kitchen has no external window and the rangehood vents into the ceiling cavity. Want assessment and advice on proper ventilation solutions.', 'medium', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-21', '15:00', NULL, '2026-03-11 09:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_38;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_38, 'inspection', 'Mould Inspection - Michael Andersen', '2026-03-21 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-21 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', 'Unit 3/15 Smith Street, Collingwood VIC 3066', tech_id, 'scheduled', 'Camberwell', 'Collingwood');

-- =========================================================================
-- DAY 16: Tuesday March 24, 2026 — 2 leads
-- =========================================================================

-- #39: Helen Park — Bentleigh, 10:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Helen Park', 'helen.park@gmail.com', '0412300089', '83 Centre Road', 'Bentleigh', 'VIC', '3204', 2, 'Phone Call (Direct)', 'Light mould patches on the garage walls. The garage has no ventilation and gets quite humid. Mostly cosmetic but want professional confirmation it''s not a bigger issue.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-24', '10:00', NULL, '2026-03-13 10:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_39;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_39, 'inspection', 'Mould Inspection - Helen Park', '2026-03-24 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-24 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '83 Centre Road, Bentleigh VIC 3204', tech_id, 'scheduled', 'Richmond', 'Bentleigh');

-- #40: Chris Murray — Narre Warren, 14:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Chris Murray', 'chris.murray@yahoo.com.au', '0412300090', '29 Cranbourne Road', 'Narre Warren', 'VIC', '3805', 3, 'Website Form', 'Mould in the ensuite and main bathroom. Both rooms have older exhaust fans that don''t seem effective. The house is well-sealed with double glazing which may be contributing to poor airflow. Need assessment.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-24', '14:00', 'Customer requested comprehensive moisture mapping. Has own dehumidifier running. Both bathrooms similarly affected — possibly connected issue.', '2026-03-12 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_40;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_40, 'inspection', 'Mould Inspection - Chris Murray', '2026-03-24 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-24 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '29 Cranbourne Road, Narre Warren VIC 3805', tech_id, 'scheduled', 'Bentleigh', 'Narre Warren');

-- =========================================================================
-- DAY 17: Wednesday March 25, 2026 — 3 leads
-- =========================================================================

-- #41: Angela Moretti — Richmond, 08:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Angela Moretti', 'angela.moretti@business.com', '0412300091', '6 Bridge Road', 'Richmond', 'VIC', '3121', 1, 'Customer Referral', 'Mould found behind display shelving in our retail store. The wall backs onto a laneway and gets wet when it rains. Customers have commented on a musty smell. Need assessment and remediation quote.', 'medium', 'commercial_retail', 'inspection_waiting', tech_id, '2026-03-25', '08:00', 'Retail store — inspect outside business hours if possible (before 9am or after 5pm). Street parking available on Bridge Road.', '2026-03-14 11:20:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_41;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_41, 'inspection', 'Mould Inspection - Angela Moretti', '2026-03-25 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-25 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '6 Bridge Road, Richmond VIC 3121', tech_id, 'scheduled', 'Richmond', 'Richmond');

-- #42: Paul Dempsey — Hawthorn, 11:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Paul Dempsey', 'paul.dempsey@icloud.com', '0412300092', '38 Glenferrie Road', 'Hawthorn', 'VIC', '3122', 2, 'Facebook/Instagram', 'Mould discovered in the wall cavity during electrical work. The electrician found extensive mould growth behind the plasterboard in multiple rooms. The source appears to be a failed waterproof membrane in the upstairs bathroom.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-25', '11:00', 'Electrical work halted until mould assessment completed. Electrician: Dave''s Electrical 0412 777 888. Wall cavities already exposed.', '2026-03-13 08:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_42;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_42, 'inspection', 'Mould Inspection - Paul Dempsey', '2026-03-25 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-25 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '38 Glenferrie Road, Hawthorn VIC 3122', tech_id, 'scheduled', 'Richmond', 'Hawthorn');

-- #43: Yolanda Cruz — Berwick, 15:00, urgent/90m, emergency
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Yolanda Cruz', 'yolanda.cruz@gmail.com', '0412300093', '21 Clyde Road', 'Berwick', 'VIC', '3806', 3, 'Google Ads', 'Burst hot water system flooded the laundry and adjacent rooms five days ago. Mould already appearing on walls and floor coverings. Our toddler has started wheezing. Need emergency assessment and treatment plan.', 'emergency', 'residential_house', 'inspection_waiting', tech_id, '2026-03-25', '15:00', 'URGENT — toddler showing respiratory symptoms. Paediatrician letter available. Hot water system replaced, plumber confirmed source.', '2026-03-18 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_43;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_43, 'inspection', 'Mould Inspection - Yolanda Cruz', '2026-03-25 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-25 15:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '21 Clyde Road, Berwick VIC 3806', tech_id, 'scheduled', 'Hawthorn', 'Berwick');

-- =========================================================================
-- DAY 18: Thursday March 26, 2026 — 2 leads
-- =========================================================================

-- #44: Thomas Kelly — Camberwell, 09:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Thomas Kelly', 'thomas.kelly@hotmail.com', '0412300094', '60 Burke Road', 'Camberwell', 'VIC', '3124', 2, 'Website Form', 'Mould on the ceiling of the spare room that comes and goes with the seasons. It''s been there for a couple of years but seems worse this year. Want professional assessment to identify the root cause.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-26', '09:00', NULL, '2026-03-15 14:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_44;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_44, 'inspection', 'Mould Inspection - Thomas Kelly', '2026-03-26 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-26 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '60 Burke Road, Camberwell VIC 3124', tech_id, 'scheduled', 'Richmond', 'Camberwell');

-- #45: Diane Sharma — Fitzroy, 13:00, simple/60m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Diane Sharma', 'diane.sharma@gmail.com', '0412300095', 'Unit 9/45 Nicholson Street', 'Fitzroy', 'VIC', '3065', 1, 'Real Estate Agent', 'Pre-sale inspection — real estate agent recommended mould assessment before listing the property. Minor visible mould in the bathroom. Need report to provide transparency to potential buyers.', 'low', 'residential_apartment', 'inspection_waiting', tech_id, '2026-03-26', '13:00', 'Pre-sale inspection for real estate. Agent: Julie Barnes, Jellis Craig. Standard report format preferred. Property vacant — lockbox code 4521.', '2026-03-16 10:15:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_45;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_45, 'inspection', 'Mould Inspection - Diane Sharma', '2026-03-26 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-26 13:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', 'Unit 9/45 Nicholson Street, Fitzroy VIC 3065', tech_id, 'scheduled', 'Camberwell', 'Fitzroy');

-- =========================================================================
-- DAY 19: Friday March 27, 2026 — 3 leads
-- =========================================================================

-- #46: Roberto Vargas — Epping, 08:00, complex/90m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Roberto Vargas', 'roberto.vargas@outlook.com', '0412300096', '15 Plenty Road', 'Epping', 'VIC', '3076', 3, 'Property Manager', 'Property manager referral — large family home with mould in four rooms including bedrooms and living areas. The tenants have young children with reported health issues. Need comprehensive inspection and detailed report.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-27', '08:00', 'Property manager: REA Epping. Tenants are a family of 6. Multiple rooms affected — may need full day. Bring extra equipment.', '2026-03-16 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_46;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_46, 'inspection', 'Mould Inspection - Roberto Vargas', '2026-03-27 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-27 08:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '90 minutes', '15 Plenty Road, Epping VIC 3076', tech_id, 'scheduled', 'Richmond', 'Epping');

-- #47: Karen Mitchell — Caulfield, 10:00, moderate/75m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Karen Mitchell', 'karen.mitchell@email.com', '0412300097', '42 Wattletree Road', 'Caulfield', 'VIC', '3162', 2, 'Customer Referral', 'Mould along the external wall of the bedroom and in the built-in wardrobe. The wardrobe doors were stuck shut and we found mould on clothing and shelving. Suspect rising damp or external water ingress.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-27', '10:00', 'Built-in wardrobe contents need to be assessed for mould contamination. Customer has already cleaned some items. Photograph all affected areas.', '2026-03-17 09:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_47;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_47, 'inspection', 'Mould Inspection - Karen Mitchell', '2026-03-27 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-27 10:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '42 Wattletree Road, Caulfield VIC 3162', tech_id, 'scheduled', 'Epping', 'Caulfield');

-- #48: Brian Stewart — Werribee, 16:00, moderate/75m, low
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Brian Stewart', 'brian.stewart@protonmail.com', '0412300098', '77 Watton Street', 'Werribee', 'VIC', '3030', 3, 'Website Form', 'Mould in the shed and garage area. Some items in storage have been damaged. The concrete slab seems to sweat in humid weather. Want to understand if there is a moisture barrier issue.', 'low', 'residential_house', 'inspection_waiting', tech_id, '2026-03-27', '16:00', NULL, '2026-03-17 13:45:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_48;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_48, 'inspection', 'Mould Inspection - Brian Stewart', '2026-03-27 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-27 16:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '77 Watton Street, Werribee VIC 3030', tech_id, 'scheduled', 'Caulfield', 'Werribee');

-- =========================================================================
-- DAY 20: Saturday March 28, 2026 — 2 leads
-- =========================================================================

-- #49: Jessica Lam — Malvern, 09:00, moderate/75m, high
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Jessica Lam', 'jessica.lam@icloud.com', '0412300099', '34 Glenhuntly Road', 'Malvern', 'VIC', '3144', 2, 'Website Form', 'Mould growing in the nursery room and walk-in pantry. We noticed it shortly after installing new carpet. Concerned the subfloor moisture is causing the issue. Baby is due next month — need urgent resolution.', 'high', 'residential_house', 'inspection_waiting', tech_id, '2026-03-28', '09:00', 'New carpet installed 6 weeks ago. Carpet installer denies responsibility. Customer may need subfloor moisture evidence for warranty claim.', '2026-03-18 11:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_49;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_49, 'inspection', 'Mould Inspection - Jessica Lam', '2026-03-28 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-28 09:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '75 minutes', '34 Glenhuntly Road, Malvern VIC 3144', tech_id, 'scheduled', 'Richmond', 'Malvern');

-- #50: Sean O'Dowd — Cranbourne, 14:00, simple/60m, medium
INSERT INTO public.leads (full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, property_zone, lead_source, issue_description, urgency, property_type, status, assigned_to, inspection_scheduled_date, scheduled_time, internal_notes, created_at)
VALUES ('Sean O''Dowd', 'sean.odowd@gmail.com', '0412300100', '10 High Street', 'Cranbourne', 'VIC', '3977', 3, 'Phone Call (Direct)', 'Mould on the bathroom tiles and ceiling. Standard bathroom mould that keeps returning despite cleaning. The exhaust fan doesn''t seem powerful enough. Want assessment and permanent solution quote.', 'medium', 'residential_house', 'inspection_waiting', tech_id, '2026-03-28', '14:00', NULL, '2026-03-19 08:30:00'::timestamp AT TIME ZONE 'Australia/Melbourne')
RETURNING id INTO lid_50;

INSERT INTO public.calendar_bookings (lead_id, event_type, title, start_datetime, end_datetime, location_address, assigned_to, status, travel_from_suburb, travel_to_suburb)
VALUES (lid_50, 'inspection', 'Mould Inspection - Sean O''Dowd', '2026-03-28 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne', '2026-03-28 14:00:00'::timestamp AT TIME ZONE 'Australia/Melbourne' + INTERVAL '60 minutes', '10 High Street, Cranbourne VIC 3977', tech_id, 'scheduled', 'Malvern', 'Cranbourne');

END $$;

-- =============================================================================
-- VERIFICATION QUERIES (run these after the seed to confirm data)
-- =============================================================================

-- 1. Count leads by status (expect 50 inspection_waiting)
SELECT status, count(*) FROM public.leads
WHERE phone >= '0412300051' AND phone <= '0412300100'
GROUP BY status;

-- 2. Count leads by inspection date (expect 2-3 per day across March 3-28)
SELECT inspection_scheduled_date, count(*) FROM public.leads
WHERE phone >= '0412300051' AND phone <= '0412300100'
GROUP BY inspection_scheduled_date ORDER BY inspection_scheduled_date;

-- 3. Count matching calendar bookings (expect 50)
SELECT count(*) FROM public.calendar_bookings cb
JOIN public.leads l ON l.id = cb.lead_id
WHERE l.phone >= '0412300051' AND l.phone <= '0412300100';

-- 4. Verify internal_notes distribution (expect ~35 with notes, ~15 null)
SELECT
  count(*) FILTER (WHERE internal_notes IS NOT NULL) AS with_notes,
  count(*) FILTER (WHERE internal_notes IS NULL) AS without_notes
FROM public.leads
WHERE phone >= '0412300051' AND phone <= '0412300100';

-- 5. Verify scheduled_time set on all 50
SELECT count(*) FILTER (WHERE scheduled_time IS NOT NULL) AS has_time,
       count(*) FILTER (WHERE scheduled_time IS NULL) AS no_time
FROM public.leads
WHERE phone >= '0412300051' AND phone <= '0412300100';

-- 6. Sample: first 5 leads with descriptions and booking times
SELECT l.full_name, l.property_address_suburb, l.inspection_scheduled_date, l.scheduled_time,
       l.urgency, l.internal_notes IS NOT NULL AS has_notes,
       cb.start_datetime, cb.end_datetime, cb.travel_from_suburb, cb.travel_to_suburb
FROM public.leads l
JOIN public.calendar_bookings cb ON cb.lead_id = l.id
WHERE l.phone >= '0412300051' AND l.phone <= '0412300100'
ORDER BY l.inspection_scheduled_date, l.scheduled_time
LIMIT 10;
