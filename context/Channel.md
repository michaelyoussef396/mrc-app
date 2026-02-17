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
