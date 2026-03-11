# Channel.md - Context & Handoff

**ROLE:** Lead Developer (Claude Code)

**TASK:** **IMPLEMENT VARIABLE DURATION INSPECTIONS & SMART SCHEDULING**

**CONTEXT:**
- **Goal:** Allow admins to set inspection duration (e.g., 1h, 1.5h, 2h) *before* selecting a technician.
- **Current State:** System hardcodes all inspections to 1 hour.
- **Requirement:**
    1.  Admin selects duration (default 1h).
    2.  "Smart Scheduling" (Edge Function) filters availability based on this duration (not just 1h slots).
    3.  Booking saves the correct `end_datetime` to the database.

**INSTRUCTIONS FOR CLAUDE CODE:**

Execute the following implementation plan.

### 1. FRONTEND: `LeadBookingCard.tsx`
*   **Add State:** `const [durationMinutes, setDurationMinutes] = useState(60);`
*   **UI:** Add a `<select>` or dropdown *before* the Technician list.
    *   Options: 60 min (1h), 90 min (1.5h), 120 min (2h), 150 min (2.5h), 180 min (3h), 240 min (4h).
    *   Label: "Est. Duration".
*   **Logic:**
    *   Pass `durationMinutes` to `handleTechnicianSelect`.
    *   Update `bookInspection` call to include `durationMinutes`.

### 2. HOOK: `src/hooks/useBookingValidation.ts`
*   **Update Interface:** Add `durationMinutes?: number` to `GetRecommendedDatesParams`.
*   **Update Function:** `getRecommendedDates` must pass `duration_minutes` in the body to the edge function.

### 3. EDGE FUNCTION: `supabase/functions/calculate-travel-time/index.ts`
*   **Update Interface:** Add `duration_minutes?: number` to `RecommendedDatesRequest` (default to 60 if missing).
*   **Update Logic (`get_recommended_dates` action):**
    *   In the loop where `availableSlots` are calculated (approx line 880):
    *   **OLD:** Checks if `hour:00` is free.
    *   **NEW:** Check if a block from `startTime` to `startTime + duration` overlaps with any `bookedTimes`.
    *   *Note:* The current logic uses a simple `Set` of strings. You may need to parse appointments into ranges `[start, end]` and check for overlaps with the candidate slot `[candidateStart, candidateStart + duration]`.

### 4. SERVICE: `src/lib/bookingService.ts`
*   **Update Interface:** Add `durationMinutes: number` to `BookInspectionParams`.
*   **Update Logic:**
    *   **OLD:** `const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);`
    *   **NEW:** `const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);`

### 5. VERIFICATION
*   **Test:**
    1.  Select 2 Hours.
    2.  Check availabilty (should show fewer slots than 1 Hour).
    3.  Book it.
    4.  Verify in Schedule Calendar that the block is 2 hours high (the calendar grid already handles duration dynamically, so this should just work visualy).
    5.  Verify `calendar_bookings` table has correct `end_datetime`.

**OUTPUT:**
Report back to Antigravity when the feature is implemented and verified.

## [PLANNING] 2026-02-14
**Task:** Admin AI Summary Review System
**Role:** High-Level Architect & Planner (Antigravity)
**Status:** READY FOR CLAUDE CODE EXECUTION

### System Architecture
Technician Mobile App (Complete Inspection) 
    ↓
[Trigger: Auto-Generate AI] 
    ↓
Edge Function (generate-inspection-summary)
    ↓
Database Update (leads.status = 'inspection_ai_summary')
    ↓
Admin Dashboard (Lead Management)
    ↓
[Action: Approve AI Generation]
    ↓
Admin Review Page (/admin/inspection-ai-summary/:leadId)
    ↓
[Review / Edit / Regenerate]
    ↓
[Action: Approve Report] -> Status 'approve_report'

### Database Changes
1.  **Enums**: Update `lead_status` to include `inspection_ai_summary`.
2.  **Schema**: Add the following columns to `inspections` table to support the 4-section review workflow:
    - `what_we_found_text` (TEXT)
    - `what_we_will_do_text` (TEXT)
    - `problem_analysis_content` (TEXT)
    - `demolition_content` (TEXT)

### Page Design: Inspection AI Summary
**URL:** `/admin/inspection-ai-summary/:leadId`
**Layout:** Desktop-first (Macbook optimized).
-   **Header**: Lead Name, Address, Status Indicator ("AI Generated").
-   **Main Content (2-Column)**:
    -   **Left (30%)**: Lead Context (Internal Notes, Key Inspection Data Summary).
    -   **Right (70%)**: 4 Editable Cards.
        1.  **What We Found** (Textarea + Regen Button)
        2.  **Problem Analysis & Recommendations** (Rich Text/Textarea + Regen Button)
        3.  **What We're Going To Do** (Textarea + Regen Button)
        4.  **Demolition Details** (Textarea + Regen Button - only if demolition required)
-   **Footer**: Sticky action bar.
    -   "Reject / Back to Technician" (Secondary)
    -   "Save Draft" (Secondary)
    -   "Approve & Next" (Primary) -> Moves to `approve_report`.

### Workflow Stages
1.  **Technician**: Completes Section 9. Clicks "Complete Inspection". System checks internet.
    -   If Online: Call `generate-inspection-summary` -> Update DB -> Move to `inspection_ai_summary`.
    -   If Offline: Queue sync.
2.  **Admin Check**: Sees lead in "Inspection AI Summary" column in Leads Management.
    -   New card action: "Approve AI".
3.  **Review**: Admin opens review page. Checks AI text against internal notes. Edits typos.
4.  **Approval**: Admin hits Approve. Lead moves to `approve_report` (ready for PDF generation/sending).

### Claude Code Execution Prompt
Please reference the plan above and execute the following:

**Phase 1: Database & Backend**
1.  Create migration to add `inspection_ai_summary` to `lead_status` enum (check `statusFlow.ts` too).
2.  Create migration to add the 4 text columns to `inspections` table.
3.  Update `generate-inspection-summary` Edge Function to populate these 4 new columns (map from AI JSON response).

**Phase 2: Technician Workflow**
1.  Modify `InspectionForm.tsx`:
    -   Remove Section 10 (AI Generation) UI.
    -   Change "Complete" button logic to trigger AI generation in background (with toast "Generating Report...") and then navigate home.

**Phase 3: Admin UI**
1.  Create `src/pages/InspectionAIReview.tsx`.
2.  Implement the 4-section editable layout.
3.  Add "Regenerate Section" functionality (calls Edge Function with section param).
4.  Update `LeadsManagement.tsx` and `LeadCard.tsx` to verify/handle the new status and routing.

**Phase 4: Routing**
1.  Add route `/admin/inspection-ai-summary/:id` to `App.tsx`.
2.  Ensure `ProtectedRoute` allows Admin/Developer access.

Start with Phase 1.
