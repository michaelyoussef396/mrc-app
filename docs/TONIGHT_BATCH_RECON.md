# Tonight Batch — Read-Only Reconnaissance

**Date:** 2026-08-24 (session started 2026-08-23 late evening)
**Target:** PROD `ecyivrxjpsmjmexqatym` (LIVE — mrcsystem.com). **Zero writes.** No migration file authored or applied. No `db push`.
**Status of this doc:** findings + DDL *proposals*. Nothing here has been executed.

## 0. How the evidence was gathered

| Source | Method | Notes |
|---|---|---|
| Live DB schema | `npx supabase db query --linked -o json -f <file>` (Supabase CLI 2.101.0, Management API path, linked ref = PROD per `supabase/.temp/project-ref`) | `mcp__supabase__execute_sql` still rejects every call ("Unauthorized… SUPABASE_ACCESS_TOKEN") — the stale-token memory is still accurate. 21 SELECT-only queries over `information_schema` / `pg_catalog` / `pg_policies` plus count-only data probes (no PII printed). Raw JSON kept in the session scratchpad, not in the repo. |
| Migration state | `npx supabase migration list --linked` | **Fork confirmed:** 16 versions in both local+remote, **104 local-only**, **102 remote-only**. A `db push` would attempt to replay 104 files. Several live objects (e.g. `leads.property_lat/lng`) have no repo migration at all, and at least one repo migration body differs from the deployed function (see §3.7). Repo files are therefore used only as *attribution* for live objects, never as evidence of live state. |
| Edge Functions | `npx supabase functions list --project-ref ecyivrxjpsmjmexqatym` | 18 ACTIVE. `receive-framer-lead` redeployed 2026-08-23 13:20 UTC. |
| Code | 5 parallel grep-backed finder agents + 5 adversarial verifier agents (each re-ran every negative claim with camelCase/snake_case/`-i` variants across `src/ api/ supabase/functions/ supabase/migrations/ scripts/`), then line-by-line `sed -n` spot checks. GitNexus was **not** relied on. Every "not found" below is backed by a literal grep that returned nothing. | Line numbers are as of working tree on 2026-08-24 (main @ 463c596 + uncommitted skill/doc changes; no `src/` files were dirty). |

Public schema inventory (live): 29 RLS-enabled tables + 1 view (`latest_ai_summary`). 73 RLS policies. 21 functions. 10 enums. No junction tables of any kind.

---

## 1. ADDRESS STORAGE

### 1.1 Current state — DB (live)

`leads` stores the address as **components**, not a single string:

| Column | Type | Null | Default |
|---|---|---|---|
| `property_address_street` | varchar | **NOT NULL** | — |
| `property_address_suburb` | varchar | **NOT NULL** | — |
| `property_address_state` | varchar | NULL | `'VIC'` |
| `property_address_postcode` | varchar | **NOT NULL** | — |
| `property_lat` / `property_lng` | numeric | NULL | — (no repo migration — added out-of-band) |
| `property_zone` | int4 | NULL | CHECK 1..4 |
| `search_text` | text **GENERATED ALWAYS STORED** | — | concat of full_name, email, phone, street, suburb, postcode, lead_source, notes, issue_description (gin_trgm index `idx_leads_search_text_trgm`) |

Denormalised **single-text** copies elsewhere: `calendar_bookings.location_address` varchar NULL, `invoices.property_address` text NULL, `job_completions.address_snapshot` text NULL.

**No unit / subpremise / apartment / flat column exists in any public table.** Live query over `information_schema.columns` for `%unit%|%subpremise%|%apartment%|%address%|%street%|%suburb%|%postcode%` returns only the columns above (plus `login_activity.ip_address`, `user_sessions.ip_address`, `webhook_submissions.ip_address`, `login_activity.country`). The `dwelling_type` enum has `units`/`apartment` labels but that is the inspection property type, not an address part.

### 1.2 Current state — Google Places integration (code)

**Single loader + single parser:** `src/hooks/useGoogleMaps.ts`.
- `useLoadGoogleMaps()` :253-308 — key `VITE_GOOGLE_MAPS_API_KEY` (:263), loads `maps/api/js?…&libraries=places&loading=async` (:287).
- `useAddressAutocomplete()` :103-249 — **new** Places API: `AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, includedRegionCodes: ['au'] … })` (:143-149).
- **`getPlaceDetails(placeId)` :188-232 is the only component parser.** `place.fetchFields({ fields: ['formattedAddress','addressComponents','location'] })` (:197-199); `getComponent = type => place.addressComponents?.find(c => c.types.includes(type))?.longText` (:207-209).

| Extracted (`:211-220`) | → field |
|---|---|
| `formattedAddress` | `formatted_address` |
| `street_number` | `street_number` |
| `route` | `street_name` |
| `locality` (fallback `sublocality`) | `suburb` |
| `administrative_area_level_1` | `state` |
| `postal_code` | `postcode` |
| `location.lat()/lng()` | `lat` / `lng` |

**Discarded:** everything else — **`subpremise` (the unit/apartment component) is never read.** `grep -rn -i subpremise` over the whole repo excluding `node_modules` → **no output**. The legacy snake_case `address_components` string also appears nowhere; the code uses the new camelCase `addressComponents` (only at `useGoogleMaps.ts:199,209`). No Edge Function parses Places components (`calculate-travel-time` uses `GOOGLE_MAPS_API_KEY` for Distance Matrix only, :452).

**Street line assembly** (all three callers): `street_number && street_name ? street_number + ' ' + street_name : (formatted_address | description).split(',')[0]` — `src/components/booking/AddressAutocomplete.tsx:98-100`, `src/components/leads/CreateNewLeadModal.tsx:240-242`, `src/components/schedule/LeadBookingCard.tsx:306-308`. When Google returns both `street_number` and `route` (the normal case for a unit address) the unit is **silently dropped**; only the fallback branch could incidentally keep a `3/12 Smith St` prefix.

**Can a user hand-type "Unit 3/12 Smith St"?** Surface-dependent:

| Surface | Free text persisted? | Evidence |
|---|---|---|
| `CreateNewLeadModal` (admin new lead) | **Yes** — stored verbatim (only `<>`/`javascript:`/`on*=` stripped by `sanitizeInput` :123-130) | input :679-694, `handleAddressChange` :221-232, validation ≥5 chars :333-337, insert :423. **Bug:** editing after a Places pick keeps the stale `lat/lng` (:439-442). |
| Shared `AddressAutocomplete` (LeadDetail admin inline edit via `InlineEditAddress.tsx:113`, `Profile.tsx:577`; `TechnicianJobDetail.tsx:890` is unrouted) | **No** when Maps is loaded — `handleInputChange` :74-86 never calls `onChange`; only `handleSelectPlace` :109 / `handleClear` :144 do. When Maps is *not* loaded (:155-194) typed text is saved as street with suburb/state/postcode blanked. | |
| `LeadBookingCard` address-confirm | **No** — `handleConfirmNewAddress` :365-372 requires a Places selection (`toast.error('Please select an address…')`). Also never writes `property_address_state` (:336-341). | |
| Report Page-1 inline address edit (`ViewReportPDF.tsx:2044-2054` ← `ReportPreviewHTML.tsx:963-988`) | **Yes** — four bare text inputs, no Places, no validation, lat/lng untouched. (Missed by the first pass; found by the verifier.) | |
| Public `/request-inspection` (`RequestInspection.tsx:227`) | Plain `<Input>` → EF `property_address` → street. No Places. | |
| `TechnicianInspectionForm.tsx:791-797` "Address" field | Editable but **never persisted** — only feeds the AI summary prompt (:2805). | |

**Framer / public path:** `supabase/functions/receive-framer-lead/index.ts` receives flat `street` / `suburb` / `postcode` strings (`getField` aliases :661-663; Zod :75-79 `street max(500).optional()`), hard-codes `property_address_state: 'VIC'` and `postcode || ''` (:812-816). Only splitting logic is the "Suburb VIC 3006" bundle (:741-747). No unit key anywhere; `docs/FRAMER_FIELD_MAPPING.md` documents only street/suburb/postcode (:49-51, :75-77). The insert goes through RPC **`audited_insert_lead_via_framer`**, whose **live body explicitly whitelists columns** (verified from `pg_get_functiondef` on PROD) — a new column added to the EF payload would be **silently dropped** until the RPC is redefined.

**Where the single-text copies are built:** `calendar_bookings.location_address` ← `src/lib/bookingService.ts:129` (inspection; 4-part string from `useLeadsToSchedule.ts:177-186 buildFullAddress`) and `src/components/leads/BookJobSheet.tsx:427` (job; **`LeadDetail.tsx:2600` passes street+suburb only**, `LeadsQueue.tsx:184` passes 4-part). `invoices.property_address` ← `src/lib/api/invoices.ts:747-752`. `job_completions.address_snapshot` ← `src/lib/api/jobCompletions.ts:108-112` (hard-codes `VIC`, never selects state) — display-only; the job PDF re-reads live lead columns (`generate-job-report-pdf/index.ts:296-301`).

**Consumer set that a unit column must be threaded through:** `grep -rln property_address_street src api supabase/functions` → **33 files** (6 components, 8 hooks, 7 lib/types/tests, 6 pages, 6 EFs; 0 in `api/`), plus `scripts/preview-emails.ts`, three `supabase/seed_*.sql`, and the two RPC migrations. There is **no shared `formatAddress` helper** — 15+ inline 4-part concatenations (e.g. `useLeadsToSchedule.ts:177-186`, `TechnicianInspectionForm.tsx:254-262`, `useTechnicianJobs.ts:297-330`, `TechnicianJobDetail.tsx:264,350,356-357`, `LeadDetail.tsx:722,2600`, `InlineEditAddress.tsx:55-62`, `InspectionJobCard.tsx:40`, `ViewReportPDF.tsx:338,352,968,1120,1402-1405,1439-1442`, `generate-inspection-pdf/index.ts:1374-1379`, `generate-job-report-pdf/index.ts:296-301`, `calculate-travel-time/index.ts:509-514,760`, `send-inspection-reminder/index.ts:380-381`). Two parsers assume the street segment contains no comma: `useScheduleCalendar.ts:320-328` and `useCancelledBookings.ts:143-151` (`extractSuburbFromAddress` = `split(',')[1]`) — a `Unit 3, 12 Smith St, Kew…` format would resolve suburb to `12 Smith St`.

### 1.3 Migration required? **YES** (for a first-class unit field)

Proposed DDL — **PROPOSAL ONLY, not a migration file**:

```sql
-- 1. Column (nullable; houses stay NULL)
ALTER TABLE public.leads
  ADD COLUMN property_address_unit varchar(50) NULL;
COMMENT ON COLUMN public.leads.property_address_unit IS
  'Unit / apartment / subpremise (Google Places "subpremise"). NULL for houses.';

-- 2. OPTIONAL — let admin search (AdminSearchBar/useLeadSearch over search_text) match unit numbers.
--    search_text is GENERATED ALWAYS STORED and cannot be ALTERed in place: drop + recreate + reindex.
--    (Only dependent is idx_leads_search_text_trgm; the one view, latest_ai_summary, does not touch leads.)
DROP INDEX IF EXISTS public.idx_leads_search_text_trgm;
ALTER TABLE public.leads DROP COLUMN search_text;
ALTER TABLE public.leads ADD COLUMN search_text text GENERATED ALWAYS AS (
    coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,'') || ' '
 || coalesce(property_address_unit,'') || ' '
 || coalesce(property_address_street,'') || ' ' || coalesce(property_address_suburb,'') || ' '
 || coalesce(property_address_postcode,'') || ' ' || coalesce(lead_source,'') || ' '
 || coalesce(notes,'') || ' ' || coalesce(issue_description,'')
) STORED;
CREATE INDEX idx_leads_search_text_trgm ON public.leads USING gin (search_text gin_trgm_ops);

-- 3. REQUIRED if Framer/public leads should carry a unit: redefine the whitelist RPC.
--    CREATE OR REPLACE FUNCTION public.audited_insert_lead_via_framer(p_acting_user_id uuid, p_payload jsonb)
--    … add  property_address_unit  to the INSERT column list and
--          p_payload->>'property_address_unit'  to VALUES, keeping the rest of the live body byte-identical
--    (live body retrieved 2026-08-24; repo copy 20260625090100_extend_framer_insert_rpc.sql matches it).
```

Code blast radius (not DB): `useGoogleMaps.ts:211-220` add `unit: getComponent('subpremise')`; 5 writers (`CreateNewLeadModal.tsx:423`, `LeadBookingCard.tsx:336-347`, `InlineEditAddress.tsx:76-83`→`useLeadUpdate.ts:17-36,76-79`, `ViewReportPDF.tsx:2044-2054`, `receive-framer-lead/index.ts:810-829`); the 33-file consumer set; `types.ts` regen; decide a canonical display format (`Unit 3/12 Smith St` vs `3/12 Smith St`) before touching the two comma-splitting parsers.

Open decisions: (a) display/concatenation format; (b) whether `search_text` rebuild is worth the table rewrite now (80 rows → trivial) ; (c) whether to also fix the stale-lat/lng-after-edit bug in `CreateNewLeadModal` while there.

---

## 2. TECHNICIAN ASSIGNMENT — target: many techs per booking, all equal

### 2.1 Current state — DB (live)

**Single FK, no junction table.**
- `leads.assigned_to uuid NULL` → `auth.users(id)` (`leads_assigned_to_fkey`). Index `idx_leads_assigned_to`, plus composite `idx_leads_status_assigned_created`, partial `idx_leads_inspection_scheduled`/`idx_leads_job_scheduled (…, assigned_to)`.
- `calendar_bookings.assigned_to uuid NOT NULL` → `auth.users(id)`. Indexes `idx_calendar_bookings_technician_time (assigned_to,start,end) WHERE status NOT IN (cancelled,completed)`, `idx_calendar_bookings_tech_end_time`, `idx_calendar_bookings_tech_date_status`, `idx_calendar_bookings_technician_id`.
- `inspections.inspector_id uuid NOT NULL` → `auth.users`; `job_completions.completed_by uuid NOT NULL` → `auth.users` — both stamped from the **saving user**, never copied from `leads.assigned_to` (`TechnicianInspectionForm.tsx:3962` + `SyncManager.ts:201`; `useJobCompletionForm.ts:256` → `jobCompletions.ts:187`).
- No table named like `lead_technicians` / `assignments` exists (30 relations total, listed live). No DB function or trigger reads `assigned_to` (live `pg_proc` scan: only `audited_insert_lead_via_framer` mentions `leads`, and it never touches `assigned_to`). `has_travel_time_conflict(p_assigned_to …)` exists in repo migration `20251111000016` but **is not a live function** (absent from live `pg_proc`), and the `20251112000020` lead-activity trigger is **not live** either.
- Live data: 80 leads, 53 with `assigned_to IS NULL`.

### 2.2 Every live RLS policy that reads the assignment

Keyed on **`leads.assigned_to = auth.uid()`** (direct or via join) — *all* of these must change for a second technician to read/write the same lead and forms:

| Table | Policy | Cmd | Predicate (live) | Repo origin |
|---|---|---|---|---|
| leads | `tech_select_assigned_leads` | SELECT | `assigned_to = auth.uid()` | `20260414000005_harden_leads_inspections_rls.sql:16` |
| leads | `tech_update_assigned_leads` | UPDATE | USING + CHECK `assigned_to = auth.uid()` | same :20 |
| inspections | `tech_select_own_inspections` | SELECT | `EXISTS (leads l WHERE l.id = inspections.lead_id AND l.assigned_to = auth.uid())` | same :38 |
| inspections | `tech_insert_own_inspections` | INSERT | CHECK same | same :42 |
| inspections | `tech_update_own_inspections` | UPDATE | USING + CHECK same | same :46 |
| inspection_areas | `tech_all_own_inspection_areas` | ALL | via `inspections i JOIN leads l … l.assigned_to = auth.uid()` | same :59 |
| photos | `tech_select_photos` / `tech_insert_photos` / `tech_update_photos` / `tech_delete_photos` | S/I/U/D | `(inspections⋈leads … l.assigned_to = auth.uid()) OR (job_completions jc … jc.completed_by = auth.uid())` | `20260414000003_harden_photos_rls.sql:17,35,54,86` |
| photo_history | `tech_select_photo_history` / `tech_insert_photo_history` | S/I | via `inspections⋈leads … l.assigned_to = auth.uid()` | `20260507093812_…photo_history.sql:54,42` |
| invoices | `tech_read_invoices` | SELECT | `EXISTS (leads l … l.assigned_to = auth.uid())` | `20260414000004_create_invoices_table.sql:83` |

Keyed on **other per-user columns** — also block a co-technician today:

| Table | Policy | Predicate (live) | Effect for tech #2 |
|---|---|---|---|
| ai_summary_versions | `technicians_see_assigned` | `inspection_id IN (SELECT id FROM inspections WHERE inspector_id = auth.uid())` | cannot see AI summary versions unless they were the saver |
| job_completions | `Technicians can view/insert/update own job completions` | `completed_by = auth.uid() OR is_admin()` | cannot open/edit a job completion the other tech created |

**No change needed** (already any-authenticated): `calendar_bookings` (`authenticated_full_access_bookings` ALL — the only policy on the table), `moisture_readings`, `subfloor_data`, `subfloor_readings`, `activities`, `email_logs`, `pdf_versions` (SELECT true), `job_completion_pdf_versions` (SELECT true), `user_roles` (SELECT true), `notifications` (`user_id = auth.uid()`, per-inbox). Admin policies (`admin_all_*`, `is_admin()`) unchanged.

### 2.3 Every query / hook / component / EF that reads or writes the assignment (code)

`grep -rn -E "assigned_to|assignedTo" src api supabase/functions scripts` → **88 hits in 24 files** (0 in `api/`, 0 in `scripts/`). Verifier re-ran case-insensitively: no additional files.

**Writers of `leads.assigned_to`** (only three):
- `src/lib/bookingService.ts:161` `bookInspection` → `leads.update({ assigned_to: technicianId, status:'inspection_waiting', … })` (after inserting the booking :130; rollback-deletes the booking if the lead update fails :177-181).
- `src/components/leads/BookJobSheet.tsx:444` → `leads.update({ assigned_to: assignedTo, status:'job_scheduled', … })` after `calendar_bookings.delete(lead_id, event_type='job')` :409-414 and per-day inserts :417-437. **No rollback** if the lead update fails → `calendar_bookings.assigned_to ≠ leads.assigned_to`. Overwrites the inspection tech at job booking.
- `src/pages/LeadDetail.tsx:514` `handleChangeStatus` reversion (newRank < 1) sets `assigned_to = null` (applied :545-548 via a **direct** `supabase.from('leads').update`, bypassing `useLeadUpdate`). Two other "back to new_lead" paths do **not** clear it: `EventDetailsPanel.tsx:59-63` and `LeadsManagement.tsx:203-205/307-310` — leaving `new_lead` rows invisible to every `assigned_to IS NULL` queue while the old tech keeps RLS access.

**Writers of `calendar_bookings.assigned_to`:** `bookingService.ts:130`, `BookJobSheet.tsx:428`. No UPDATE ever changes `assigned_to`, `start_datetime` or `end_datetime` on a booking (no drag/drop, no in-place reschedule — `grep -rn -i -E "onDrag|draggable|dnd"` → only `draggable={false}` on an image).

**Technician pickers** (all single-select, all admin-facing):
- `LeadBookingCard.tsx:121` `useState<string>('')`, button grid :1088-1115, `handleTechnicianSelect` :448 → `bookInspection({ technicianId })` :509-522. List from `useTechnicians()` (`src/hooks/useTechnicians.ts:148`, role-filtered via `user_roles`) through `AdminSchedule.tsx:44` → `LeadsQueue.tsx:159-162`.
- `BookJobSheet.tsx:206` `useState<string>('')`, `<Select value={assignedTo} onValueChange={setAssignedTo}>` :744; list from its own `fetchTechnicians()` :166-184 (**all active users, not role-filtered**). Reachable by technicians: `LeadDetail` is mounted on `/technician/job/:id` (`App.tsx:349-362`) and the `job_waiting` "Book Remediation Job" CTA (`LeadDetail.tsx:959-968`) is not role-gated; only the reschedule entry is (`:1001`).
- `CreateNewLeadModal` — **no** technician field. `useLeadUpdate` — **no** `assigned_to` key. Job completion "completed by" is free text (`Section2Summary.tsx:141-147` → `remediation_completed_by`).
- No multi-select anywhere (`technicianIds|technician_ids|assigned_technicians|assignees` → only name-lookup arrays).

**Technician-scoped reads (`= current user`):**
- `src/hooks/useTechnicianJobs.ts:283` `.eq('assigned_to', user.id)` on **calendar_bookings** (+ `leads!inner`, status filters) — "My Jobs" (`TechnicianJobs.tsx:379`, `TechnicianDashboard.tsx:35`); realtime `filter: assigned_to=eq.${user.id}` :368 (the only realtime subscription on the table).
- `src/hooks/useTechnicianAlerts.ts:143` `.eq('assigned_to', user.id)` on calendar_bookings → activity feed.
- `src/hooks/useRevisionJobs.ts:42` `.eq('assigned_to', user.id)` on **leads** (live: `TechnicianDashboard.tsx:37`, despite the CLAUDE.md "dormant" note).
- No role branch inside any hook; admin/tech separation is route-level (`App.tsx` RoleProtectedRoute).

**Admin-parameterised reads:** `useScheduleCalendar.ts:173` (`technicianFilter`, null = all), `useTechnicianDetail.ts:217` (leads) / `:297` (bookings), `useTechnicianStats.ts:204` (bookings `.in`) / `:216` (leads `.in`), `calculate-travel-time/index.ts:725,938` (EF; `leads.assigned_to` by `inspection_scheduled_date` — job bookings invisible to its availability logic).

**Unassigned queues (all `assigned_to IS NULL`):** `useLeadsToSchedule.ts:74`, `useUnassignedLeads.ts:42`, `AdminSidebar.tsx:50`, `useAdminDashboardStats.ts:98`.

**Display readers:** `LeadsManagement.tsx:140,360,385-390` → `LeadCard.tsx:55,293,340` ("Awaiting technician: {name}"); `JobBookingDetails.tsx:32,108` (takes `bookings[0].assigned_to` as "the" tech); `useScheduleCalendar.ts:156,190,235,261` → `EventDetailsPanel.tsx:166`; `useTodaysSchedule.ts:55,75,91`; `useCancelledBookings.ts:29,47,82,104`; `LeadDetail.tsx:345-358` (`techProfile` fetched, never rendered); `lib/api/invoices.ts:228,243,248` (revenue attribution: `completed_by ?? lead.assigned_to`; tests `:133,145,157`); `fieldLabels.ts:36`; `types.ts:212,234,256,1243,1293,1343`.

**Notifications:** **no** fan-out targets the assigned tech. `fan_out_notification` (live, `20260823090000_notifications_fan_out.sql:123-163`) inserts one row per user in `p_roles` (default `{admin,technician}` = everyone); no caller passes `p_roles`. `send-inspection-reminder` emails the **customer** (`to: [lead.email]` :401) and never selects `assigned_to`.

### 2.4 Migration required? **YES**

Proposed DDL — **PROPOSAL ONLY**. Model: a junction table is the source of truth; `leads.assigned_to` is kept as a nullable legacy column (backfilled, still written by the two booking paths during transition) and dropped in a later wave once the 88 call sites are migrated.

```sql
-- A. Junction (equal members, no role/hierarchy column — per the decided business rule)
CREATE TABLE public.lead_assignments (
  lead_id     uuid NOT NULL REFERENCES public.leads(id)  ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NULL REFERENCES auth.users(id)        ON DELETE SET NULL,
  PRIMARY KEY (lead_id, user_id)
);
CREATE INDEX idx_lead_assignments_user_id ON public.lead_assignments (user_id);
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- B. Membership helper (mirrors the existing is_admin()/has_role() style: STABLE SECURITY DEFINER, empty search_path)
CREATE OR REPLACE FUNCTION public.is_assigned_to_lead(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.lead_assignments la
                 WHERE la.lead_id = _lead_id AND la.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_assigned_to_lead(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_lead(uuid) TO authenticated;

-- C. Backfill from the single FK
INSERT INTO public.lead_assignments (lead_id, user_id)
SELECT id, assigned_to FROM public.leads WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- D. RLS on the junction
CREATE POLICY admin_all_lead_assignments ON public.lead_assignments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY tech_select_lead_assignments ON public.lead_assignments
  FOR SELECT TO authenticated USING (public.is_assigned_to_lead(lead_id));  -- co-assignees can see each other
-- (technicians get no INSERT/UPDATE/DELETE: assignment stays an admin action — confirm with Glen/Clayton)

-- E. Re-point the 13 assignment policies (ALTER POLICY keeps names/grants; no DROP needed)
ALTER POLICY tech_select_assigned_leads ON public.leads
  USING (public.is_assigned_to_lead(id));
ALTER POLICY tech_update_assigned_leads ON public.leads
  USING (public.is_assigned_to_lead(id)) WITH CHECK (public.is_assigned_to_lead(id));

ALTER POLICY tech_select_own_inspections ON public.inspections USING (public.is_assigned_to_lead(lead_id));
ALTER POLICY tech_insert_own_inspections ON public.inspections WITH CHECK (public.is_assigned_to_lead(lead_id));
ALTER POLICY tech_update_own_inspections ON public.inspections
  USING (public.is_assigned_to_lead(lead_id)) WITH CHECK (public.is_assigned_to_lead(lead_id));

ALTER POLICY tech_all_own_inspection_areas ON public.inspection_areas
  USING (EXISTS (SELECT 1 FROM public.inspections i
                 WHERE i.id = inspection_areas.inspection_id AND public.is_assigned_to_lead(i.lead_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i
                 WHERE i.id = inspection_areas.inspection_id AND public.is_assigned_to_lead(i.lead_id)));

-- photos ×4 (tech_select_photos / tech_insert_photos / tech_update_photos / tech_delete_photos): same shape —
--   (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = photos.inspection_id AND public.is_assigned_to_lead(i.lead_id)))
--   OR (EXISTS (SELECT 1 FROM public.job_completions jc WHERE jc.id = photos.job_completion_id AND public.is_assigned_to_lead(jc.lead_id)))
-- photo_history ×2: inspections-join branch only, as above.
ALTER POLICY tech_read_invoices ON public.invoices USING (public.is_assigned_to_lead(lead_id));

-- F. The two non-assigned_to gates that would still lock out technician #2
ALTER POLICY technicians_see_assigned ON public.ai_summary_versions
  USING (inspection_id IN (SELECT i.id FROM public.inspections i WHERE public.is_assigned_to_lead(i.lead_id)));
ALTER POLICY "Technicians can view own job completions"   ON public.job_completions USING (public.is_assigned_to_lead(lead_id) OR public.is_admin());
ALTER POLICY "Technicians can insert own job completions" ON public.job_completions WITH CHECK (public.is_assigned_to_lead(lead_id) OR public.is_admin());
ALTER POLICY "Technicians can update own job completions" ON public.job_completions
  USING (public.is_assigned_to_lead(lead_id) OR public.is_admin()) WITH CHECK (public.is_assigned_to_lead(lead_id) OR public.is_admin());

-- G. Audit: per the "29 audit triggers — do not add without instruction" rule, adding audit_lead_assignments_* triggers
--    is a separate explicit decision (recommended, since assignment changes are currently unlogged).
```

**`calendar_bookings` — two options (decision needed):**

| | Option A — one booking row per technician (+ `booking_group_id uuid` to fan out cancel/reschedule) | Option B — junction `calendar_booking_technicians(booking_id, user_id)` |
|---|---|---|
| DDL | `ALTER TABLE calendar_bookings ADD COLUMN booking_group_id uuid NULL; CREATE INDEX … (booking_group_id);` | new table + drop NOT NULL on `assigned_to` (or keep as "any one member") |
| `checkBookingConflict` (`bookingService.ts:42-75`, `.eq('assigned_to')`) | unchanged | must join/`IN (SELECT …)` |
| Tech "My Jobs" + realtime filter `assigned_to=eq.uid` (`useTechnicianJobs.ts:283,368`) | unchanged | rewrite (realtime cannot filter through a join) |
| 9 booking hooks + `EventDetailsPanel`/`JobBookingDetails` `bookings[0].assigned_to` | cancel/reschedule must target the group (today `EventDetailsPanel.tsx:52-55` cancels one row; `BookJobSheet.tsx:409` deletes by lead+type) | every reader changes |
| Recommendation | **A** — least churn; the existing partial indexes keep working | only if per-booking member lists are needed in UI |

Code blast radius either way: the 88 `assigned_to` hits (24 files), the 4 `assigned_to IS NULL` queues → `NOT EXISTS (lead_assignments)`, two single-select pickers → multi-select, `BookJobSheet.tsx:409-466` write ordering (no rollback today), `EventDetailsPanel`/`LeadsManagement` reversion paths that leave stale assignments, `LeadCard` "Awaiting technician: {name}" → list, `invoices.ts:248` revenue attribution (which tech?), `types.ts` regen, and the inspection form re-stamping `inspector_id` to whoever saves last (`TechnicianInspectionForm.tsx:3962`, also on the admin `/admin/inspection/:leadId` route).

---

## 3. CALENDAR BOOKINGS — target: non-client bookings

### 3.1 `lead_id` nullability — **NULLABLE** (live)
`calendar_bookings.lead_id uuid NULL`, FK `calendar_bookings_lead_id_fkey … ON DELETE SET NULL`. `inspection_id uuid NULL`, FK ON DELETE SET NULL. Live data: 28 rows, **0 with NULL lead_id** (so null-lead rendering paths have never been exercised in PROD).

### 3.2 Booking type column — **`event_type varchar NOT NULL`, free text**
- **No enum, no CHECK constraint.** Live constraints on the table: PK, 3 FKs, `calendar_bookings_time_order_check (end_datetime > start_datetime)` only.
- Live distinct values: `inspection` (17: 16 scheduled, 1 cancelled), `job` (11 scheduled). Code writes only these two literals (`bookingService.ts:125`, `BookJobSheet.tsx:420`). TS type is plain `string` (`types.ts:216/238/260`); app-level unions `'inspection' | 'job'` at `useScheduleCalendar.ts:18,25`, `useTechnicianDetail.ts:47`.
- The live enum that *does* exist is **`booking_status`** = `{scheduled, in_progress, completed, cancelled, rescheduled}` (default `'scheduled'`). Only `scheduled` (insert) and `cancelled` (update) are ever written; `in_progress`/`completed`/`rescheduled` are dead labels (and `checkBookingConflict` only excludes `cancelled`, so a future `completed` row would still block).
- Other NOT NULLs a non-client booking must satisfy: `title`, `start_datetime`, `end_datetime`, `assigned_to` (a "blocked time" row is therefore always per-technician — consistent with the target).

**Unknown `event_type` behaviour today (no crashes):** data hooks coerce to `'inspection'` (`useScheduleCalendar.ts:259`, `useCancelledBookings.ts:102`, `useTechnicianDetail.ts:326`, `useTodaysSchedule.ts:101`); style helpers default to *job* colouring (`scheduleUtils.ts:35-41`, `useTechnicianDetail.ts:102-122`); `TechnicianJobs.tsx:72-99` substring-matches `'job'`/`'removal'` else treats as inspection; `AdminSchedule.tsx:174-176` filter pills are hard-coded `['all','inspection','job']`; `EventDetailsPanel.tsx:181-187` shows "Start Inspection" for any non-cancelled/completed event and its cancel handler (:52-63) reverts the lead to `new_lead` whatever the type.

### 3.3 RLS policies that read `lead_id` — **none on `calendar_bookings`**
The table has exactly one policy: `authenticated_full_access_bookings` — `FOR ALL TO public USING ((select auth.uid()) IS NOT NULL) WITH CHECK (same)` (repo: `20260217074235_fix_rls_initplan_and_dedup.sql:58`). It reads neither `lead_id` nor `assigned_to`. No other policy in the schema references `calendar_bookings`. No view references it. → **RLS needs no change** for null-lead rows.

### 3.4 Availability / conflict engine — reads the table **directly**
**File: `src/lib/bookingService.ts`, `checkBookingConflict()` :42-75** (exported). Query :48-53:
```
.from('calendar_bookings').select('id, title, start_datetime, end_datetime')
.eq('assigned_to', technicianId).neq('status', 'cancelled')
.lt('start_datetime', end).gt('end_datetime', start)
```
Direct table read; no view, no RPC (`grep -rn -i "\.rpc(['\"][^'\"]*book"` → nothing; no views exist). Filters: `assigned_to`, `status ≠ cancelled`, interval overlap. **No `event_type` filter, does not read `lead_id`** → a null-lead "blocked time" / "equipment pickup" row **will correctly block the slot** with zero engine changes. Fails open on query error (:55-58). Callers: `bookInspection` :107 and `BookJobSheet.tsx:358` (per day). It is the **only** engine that gates a write; the EF-backed availability UI is advisory only (`LeadBookingCard.tsx:547` `canBook` ignores `is_feasible`). No daily-hours cap anywhere (`MAX_HOURS_PER_DAY = 8` at `BookJobSheet.tsx:24` is the day-splitting block size; the EF's `appointmentCount >= 6` at `calculate-travel-time/index.ts:1029-1033` is a scoring heuristic).

Two other "engines" exist and do **not** read `calendar_bookings`: `calculate-travel-time` EF `check_availability`/`get_recommended_dates` (reads `leads.inspection_scheduled_date` + `leads.assigned_to` at :712-724 / :927-938, assumes 60-min appointments — job bookings and non-client bookings are invisible to it), and the dead `useSmartBookingSlots` (`useGoogleMaps.ts:334-464`, no mount).

### 3.5 Everything else that touches `calendar_bookings` (28 sites, classified)
Writes: inserts `bookingService.ts:122-135`, `BookJobSheet.tsx:434-437`; deletes `bookingService.ts:180` (rollback), `BookJobSheet.tsx:410-414` (hard delete of prior job rows); updates `EventDetailsPanel.tsx:52-55`, `LeadDetail.tsx:572-576` (bulk cancel on rank<1 reversion), `send-inspection-reminder/index.ts:334-338,461-465` (claim/release). Reads: `useScheduleCalendar.ts:147-179` (LEFT join `lead:leads(...)`, keeps null-lead rows via `safeData` :228-230, falls back to `extractNameFromTitle`/`location_address`), `useCancelledBookings.ts:20-38`, `useTodaysSchedule.ts:47-67`, `useTechnicianDetail.ts:281-299`, `useTechnicianStats.ts:202-206`, `useAdminDashboardStats.ts:88-92`, `useReportsData.ts:148-151`, `useTechnicianAlerts.ts:141-144`, `JobBookingDetails.tsx:31-35`, `BookJobSheet.tsx:256-261`, `TechnicianInspectionForm.tsx:3041-3046`, `TechnicianJobDetail.tsx:149-154` (unrouted), `LeadDetail.tsx:317-322,565-569`, `export-inspection-context/index.ts:94-99`, `send-inspection-reminder/index.ts:273-287`, `scripts/preview-emails.ts:465-469`. Realtime: `useTechnicianJobs.ts:360-370` only.

**Null-`lead_id` consequences (what a non-client booking would hit):**
- `useTechnicianJobs.ts:269` uses `lead:leads!inner(...)` + `.in('lead.status', …)` — **intentionally** drops lead-less rows (comment :240-243). A tech's own blocked time / equipment pickup would **not appear in "My Jobs"** though it still blocks their calendar. Needs a deliberate second query or a relaxed join.
- `send-inspection-reminder/index.ts:287` `.not('lead_id','is',null)` + `:323-327` skip → safe. Additionally the **live** trigger `set_reminder_scheduled_for` only sets `reminder_scheduled_for` when `NEW.event_type = 'inspection' AND NEW.status = 'scheduled'` (body read from PROD; the repo file `20260218000001` differs — it references a `'no_show'` status that is not in the live enum) → new types never get reminders. Safe.
- Admin calendar / Today / Cancelled / Technician detail / stats: render with `'Unknown'`/`''` fallbacks, no crash. `useTechnicianDetail.ts:310` and `useTechnicianStats.ts:261` key engagements by `${lead_id}|${event_type}` → all null-lead rows of one type **merge into a single engagement** ("Unknown", stretched dates). Needs keying by `id` for non-client types.
- `EventDetailsPanel.tsx:59-63` cancel handler only touches the lead `if (event.leadId)` → safe; but the "Start Inspection" button :181-187 renders regardless of type.
- No Zod/validation requires `lead_id` anywhere (`grep -rn -E "(lead_id|leadId)\s*:\s*z\." src` → nothing; booking forms have no Zod); the TS `Insert` type already allows `lead_id?: string | null`.
- No creation UI exists for a lead-less booking: both insert paths require a lead prop (`bookingService.ts:14`, `BookJobSheet.tsx:33`) and derive `title`/`location_address` from it.

### 3.6 Migration required? **NO (strictly). RECOMMENDED: one CHECK constraint.**
The schema already permits `lead_id NULL` and any `event_type` string. Proposed DDL — **PROPOSAL ONLY**:
```sql
-- Pin the vocabulary so typos cannot create silent "inspection-coloured" rows (28 live rows are all 'inspection'/'job' → VALID immediately)
ALTER TABLE public.calendar_bookings
  ADD CONSTRAINT calendar_bookings_event_type_check
  CHECK (event_type IN ('inspection', 'job', 'equipment_pickup', 'blocked'));   -- exact label set TBD with Glen/Clayton

-- NOT recommended: CHECK (event_type NOT IN ('inspection','job') OR lead_id IS NOT NULL)
-- because calendar_bookings_lead_id_fkey is ON DELETE SET NULL — deleting a lead would then fail the CHECK.
```
Code work (no DB): new booking dialog for non-client rows (title required, `assigned_to` required, `lead_id: null`, `location_address` optional); `useTechnicianJobs` second path; `AdminSchedule` filter pills + colour/label maps (`scheduleUtils.ts:35`, `useTechnicianDetail.ts:102-122`, `TechnicianJobs.tsx:72-99`); `EventDetailsPanel` hide "Start Inspection" for non-client types; engagement keying in `useTechnicianDetail`/`useTechnicianStats`; `types.ts` union if the CHECK is added.

### 3.7 Adjacent findings worth knowing before touching bookings
- Archiving a lead (`LeadsManagement.tsx:529-532`, `LeadDetail.tsx:706-709`) never cancels its bookings; no booking consumer filters `archived_at` → archived leads keep blocking slots and keep getting reminders.
- Only the rank<1 reversion cancels bookings (`LeadDetail.tsx:563`); `job_scheduled → job_waiting`, `not_landed`, `closed` leave `scheduled` rows live.
- `bookInspection` never cancels a prior inspection booking → "Reschedule Inspection" creates a second live row.
- Cancelling a multi-day job from the schedule cancels **one** day-row (`EventDetailsPanel.tsx:55`).
- `BookJobSheet.tsx:358` conflict-checks against the lead's own existing job rows before deleting them at :410 — re-booking the same tech/dates may self-conflict (not runtime-verified).

---

## 4. LEAD REQUIRED FIELDS — target: preferred date/time OPTIONAL

### 4.1 DB level (live) — **already NULLABLE**
`leads.customer_preferred_date date NULL`, `leads.customer_preferred_time text NULL`, `leads.preferred_day text NULL` — no default, no CHECK, no trigger touches them (live leads triggers: 3× `audit_log_trigger`, `trigger_auto_generate_lead_number`, `update_leads_updated_at`). Live data: 80/80 rows non-null for both (every PROD lead so far came through a path that requires them or a Framer payload that carried them). Live NOT NULL set on `leads`: `id, status, full_name, email, phone, property_address_street, property_address_suburb, property_address_postcode`.

### 4.2 Manual lead-entry validation — **there is no Zod schema behind it; they are required by hand-rolled code**
- Manual form = `src/components/leads/CreateNewLeadModal.tsx` (mounted `LeadsManagement.tsx:1028`, `AdminDashboard.tsx:693`). It imports only `isValidAustralianState, isValidVictorianPostcode, leadSourceSchema` (:7-11) and validates in `validateForm()` **:309-377**:
  - `:353-357` `if (!formData.preferredDate) newErrors.preferredDate = 'Preferred date is required'; else if (formData.preferredDate < minDate) 'Date must be in the future'` (`minDate` = tomorrow, computed with `toISOString()` at :490-493 — UTC date, not Australia/Melbourne; also `<input type="date" min={minDate}>` :610).
  - `:359-361` `if (!formData.preferredTime) newErrors.preferredTime = 'Preferred time is required'` (select with `<option value="">Select time...</option>` + 30-min slots 07:00-18:00, `TIME_SLOTS` :89-96).
  - Labels `Preferred Date *` :604, `Preferred Time *` :648. No HTML `required`; submit is only disabled while submitting (:917). Insert writes both unconditionally `:435-436` and forwards them to Slack `:467-468` → `notifications.ts:474-475` (`?? null` does not coalesce `''`).
- Full required set enforced by that form: fullName, phone (≥10 digits), email, propertyAddress (≥5), suburb, state, postcode (3XXX), **preferredDate, preferredTime**, issueDescription (20-1000), source. (Form requires 5 fields the DB does not.)
- `src/lib/validators/lead-creation.schemas.ts`: `normalLeadSchema` :245-263 (documented as "admin Create New Lead", **zero callers, no preferred keys**) and `hiPagesLeadSchema` :207-217 (zero callers) are dead exports. `requestInspectionSchema` :286-300 (public `/request-inspection`, `RequestInspection.tsx:76`) requires `preferred_day` (:292) and `preferred_time` (:293) with **no `preferred_date` key** and label-style times (`'Morning (8am–12pm)'`).
- **No edit path exposes them**: `useLeadUpdate.ts:17-36` payload type omits both; no `saveField("customer_preferred…` anywhere; read-only after create.

### 4.3 Other layers
- `receive-framer-lead/index.ts`: `preferredDate: z.string().max(30).optional()` :80, `preferredTime: z.string().max(40).optional()` :81; inserted as `|| null` :817-818. Only `fullName/phone/email` required (:73-75). Date is normalised (:754-757); **time is stored verbatim** (no HH:mm enforcement) — `formatTimeForDisplay` (`bookingService.ts:361-366`) and the `calculate-travel-time` regex `^\d{2}:\d{2}$` (:53 → 400 at :467-475) both assume HH:mm.
- Live RPC `audited_insert_lead_via_framer` casts `(p_payload->>'customer_preferred_date')::date` with no COALESCE → NULL passes through.
- Public in-app path (`src/lib/api/public-leads.ts:107-121`) sends **no** `preferred_date` → designed to insert NULL date + label time (matches migration comment `20260625090000_add_lead_form_fields.sql:11-13`).
- "NEVER cleared (PR #39)" is convention only: `LeadDetail.tsx:506-541` reversion clear-lists exclude `customer_preferred_*` (written via a direct `supabase.from('leads').update`, :547, bypassing `useLeadUpdate`); column COMMENTs (`20260428174022:17-21` "Never overwritten by the booking flow"). No trigger/constraint. The rule governs UPDATE; **making them optional at CREATE does not conflict with it.**
- Display consumers are all null-guarded (`LeadBookingCard.tsx:587-594,624-661,1255`, `LeadDetail.tsx:1482-1504,1641-1644`, `useLeadsToSchedule.ts:108-109`, `useBookingValidation.ts:334-335`, `send-slack-notification/index.ts:119-133`, `receive-framer-lead/index.ts:146-151,291-302`). The "Customer's Preferred Time" cards gate on **date** — a time-only preference would only show in the Enquiry Details card.

### 4.4 Migration required? **NO.**
Code-only change: `CreateNewLeadModal.tsx:353-361` (drop the two required branches, keep the future-date check when a date is present), labels `:604,:648`, insert `:435-436` → `formData.preferredDate || null` / `formData.preferredTime || null` (an empty string into a `date` column would error), Slack payload `:467-468` → `|| undefined`. Optional tidy-ups: delete the dead `normalLeadSchema`/`hiPagesLeadSchema`; compute `minDate` in Australia/Melbourne.

---

## 5. DUPLICATE PREVENTION — target: duplicates FULLY ALLOWED

### 5.1 DB level (live) — **duplicates already allowed**
- UNIQUE on `leads`: **only** `leads_pkey (id)` and `leads_lead_number_key (lead_number)`. `idx_leads_email_phone (email, phone)` is a **non-unique** btree; `idx_leads_full_name_trgm` gin. No unique index or constraint on email / phone / name / any address column. No exclusion constraint.
- Triggers on `leads`: audit ×3, `trigger_auto_generate_lead_number`, `update_leads_updated_at` — **no duplicate check**.
- Only live function whose body mentions "duplicate": `audited_insert_lead_via_framer` — it **inserts unconditionally** and passes `is_possible_duplicate` / `possible_duplicate_of` through from the payload (`COALESCE(...::boolean, FALSE)`). No `ON CONFLICT`.
- Proof by existence: PROD already holds **5 duplicate-email groups, 3 duplicate-phone groups, 3 duplicate-name groups** (counts only; 80 leads).
- Soft-flag columns exist: `is_possible_duplicate bool default false`, `possible_duplicate_of uuid → leads(id) ON DELETE SET NULL`, partial index `idx_leads_possible_duplicate`.

### 5.2 Client-side duplicate blocker — **YES, one hard block in the admin modal**
**`src/components/leads/CreateNewLeadModal.tsx`**
- `checkForDuplicates()` **:264-288** — `phoneDigits = phone.replace(/\D/g,'')`, `emailLower = email.toLowerCase().trim()`; `supabase.from('leads').select('id, full_name, phone, email').or("phone.eq.<digits>,email.ilike.<lowercased email>").limit(1)`; returns `{ isDuplicate: true, message: 'A lead with this <phone number|email address> already exists: <full_name>' }` on any match. **No time window, no status/`archived_at` filter** (an archived or `not_landed` lead blocks re-creation and is invisible in every list). **Fails open** on error (:275, :286-287). `_` in the email is an unescaped ILIKE wildcard (false positives).
- `handleSubmit` **:398-403**: `if (duplicateCheck.isDuplicate) { setDuplicateWarning(msg); setModalState('idle'); return; }` — **hard stop, no "create anyway"** (grep `anyway|override|proceed|force|skipDuplicate|ignoreDuplicate` in the file → only a comment at :433).
- Banner :565-576 "Duplicate Lead Detected". Warning cleared when phone/email edited (:216-217). Runs as admin (route-gated), so `admin_all_leads` lets it see every lead.
- Phone format drift makes the block inconsistent: modal stores digits (:421, `+` kept for non-04 numbers), Framer stores raw, in-app strips spaces but keeps `+`, `useLeadUpdate.ts:62-63` stores digits — so the same customer can be blocked from one path and missed from another.
- Net effect today: the `lead_source = 'repeat'` ("Repeat Customer", `leadUtils.ts:108`) option is unusable for a true repeat with unchanged phone/email.

### 5.3 Anything else that would reject a duplicate — **nothing**
- **Zod `.refine`/`.superRefine`:** only format checks (`lead-creation.schemas.ts:47,60,72,103` — mobile regex, postcode, email regex, name word count; `inspectionSchema.ts:39,45`). No uniqueness refine. No `.upsert(`/`onConflict` anywhere in `src/`.
- **Edge Function** `receive-framer-lead/index.ts:793-804`: **flag-only, never rejects** — `.eq('email', email).eq('phone', phone).gte('created_at', now-24h).order(created_at desc).limit(1)`; exact, case-sensitive, un-normalised, AND-ed; on match inserts a new row with `is_possible_duplicate: true, possible_duplicate_of: <most recent match>` (:822-823) and still returns `200 { success: true, message: 'Lead received' }` (:972-975); Slack/in-app title becomes "possible repeat" (:153-155, :890). No webhook idempotency (no payload hash / submission id; `webhook_submissions` has no unique index). The EF's Zod (:73-84) has no uniqueness rule.
- **DB trigger:** none. **RLS:** `authenticated_insert_leads` CHECK `auth.uid() IS NOT NULL`, `allow_public_insert_leads` CHECK `lead_source = 'website'` — neither inspects content.
- **Public `/request-inspection`** (`RequestInspection.tsx`): no check at all (→ EF flag path).
- UI surfacing of the flag: `LeadDetail.tsx:329-342` (fetch original's `lead_number`) + `:1294-1306` admin-only amber badge "🔁 Possible duplicate of MRC-…" linking to the original (dead-links if the original was archived, since `LeadDetail.tsx:234-238` filters `archived_at IS NULL`). **No list/filter/dismiss/merge anywhere**; `LeadsManagement.tsx:1093` "Duplicate Lead" is just a removal-reason option that is never persisted. `is_possible_duplicate` is never set back to false by any code.
- **Lead number** (`generate_lead_number`, live body read: `MAX(seq)+1` per year, content-independent) cannot collide on same name/address; concurrency race → `23505 leads_lead_number_key` surfaces raw in the modal (:444-448, no retry) while the EF's `insertLeadWithRetry` (:463-496) retries 3× on any error.

### 5.4 Migration required? **NO.**
Nothing at the DB layer rejects duplicates. Code-only change: in `CreateNewLeadModal.tsx` either delete `checkForDuplicates` (:264-288) + the gate (:398-403) + banner (:565-576), or downgrade it to a non-blocking notice (e.g. keep the query, show "Existing lead: <name> (MRC-…)", always allow submit). The EF flag path (:793-804) is already non-blocking and can stay as an informational signal; consider lowercasing email / digit-stripping phone on both sides if the flag is to stay meaningful. No DDL. (If a triage surface for flagged leads is ever wanted, `idx_leads_possible_duplicate` already exists for it.)

---

## 6. Summary matrix

| # | Area | Live state | Migration? | Size |
|---|---|---|---|---|
| 1 | Address / unit | components; **no unit column**; Places parser drops `subpremise` | **Yes** — add `leads.property_address_unit`; optional `search_text` rebuild; **must** redefine the whitelist RPC for Framer | DB small; code: 33 consumer files + 5 writers, no shared formatter |
| 2 | Multi-tech equal assignment | single nullable FK `leads.assigned_to`; 13 RLS policies + 2 more (`inspector_id`, `completed_by`) gate on one user; no junction | **Yes** — `lead_assignments` junction + `is_assigned_to_lead()` + 16 `ALTER POLICY`; bookings: Option A `booking_group_id` vs Option B junction | DB medium; code: 88 hits / 24 files |
| 3 | Non-client bookings | `lead_id` nullable; `event_type` free varchar (live: inspection/job); 1 open RLS policy; engine reads table directly (`bookingService.ts:42-75`) with no type/lead filter | **No** (recommended CHECK on `event_type`) | code: new dialog, `useTechnicianJobs` inner-join, colour/label maps, engagement keying |
| 4 | Preferred date/time optional | both columns already NULL-able; required only by `CreateNewLeadModal.validateForm` :353-361 | **No** | code: ~6 lines + `|| null` on insert |
| 5 | Duplicates allowed | no unique constraints; PROD already has duplicates; EF flags only; modal hard-blocks | **No** | code: remove/soften `CreateNewLeadModal.checkForDuplicates` :264-288 + gate :398-403 |

## 7. Follow-ups this pass could not settle (read-only)
1. `mcp__supabase` server token is still dead; `npx supabase db query --linked` is the working SELECT path (add to `docs/MCP_STACK.md` / memory).
2. Repo migration `20260218000001_add_reminder_scheduled_for.sql` does not match the deployed `set_reminder_scheduled_for` body (repo references `'no_show'`, live does not) — one more data point for the forked history; do not treat repo trigger bodies as live.
3. `useRevisionJobs` is live (`TechnicianDashboard.tsx:37`) despite the CLAUDE.md "left dormant" rule.
4. Business decisions needed before any migration is written: event-type label set; bookings Option A vs B; whether technicians may self-assign (junction RLS); unit display format.
