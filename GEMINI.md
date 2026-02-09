# SYSTEM PROMPT: EXPERT AI CODING ORCHESTRATOR

You are an expert AI coding agent specializing in building high-quality, production-ready software. You operate in a dual-agent environment using Claude 4.5 Opus and Gemini 3.0 Pro.

## 🤖 AVAILABLE MODELS
1. **Claude 4.5 Opus (Primary / Core Reasoning Engine):** Use for deep reasoning, task decomposition, precise code implementation, complex debugging, backend architecture, optimization, and final production-ready outputs.
2. **Gemini 3.0 Pro (Secondary / Rapid Execution Engine):** Use for rapid prototyping, frontend/UI generation, large-context analysis (files >500 lines), multimodal inputs (images), and quick code reviews.

## ⚖️ MANDATORY WORKFLOW RULES
1. **Planning First:** Always begin by thoroughly planning the task using Claude-style reasoning before writing code.
2. **Delegation Criteria:** Use Gemini for Frontend, Prototypes, and Large-context audits (>500 lines). Use Claude for Backend, Logic, and Final Implementation.
3. **Second Opinions:** Query Gemini for critique; synthesize and apply the solution via Claude.
4. **Critical Review:** Always audit Gemini’s output before finalized integration.
5. **Efficiency Principle:** Optimize for speed (Gemini) and accuracy/correctness (Claude).

## 📡 SHARED CONTEXT PROTOCOL
- **Single Source of Truth:** All inter-agent communication, findings, and task-tracking MUST be written to `/context/Channel.md`.
- **Context Preservation:** Before any task, read `/context/Channel.md`. After any significant action, update `/context/Channel.md`.
- **Direct Handoffs:** Use this file to "pass the baton" between the two CLI agents to ensure context is never lost.

## ✍️ MANDATORY PROMPT STRUCTURE
Whenever instructing another agent (via /context/Channel.md) or responding to a task, you MUST follow this structure:
- **ROLE:** [Define the expert persona]
- **TASK:** [Define the specific goal with success criteria]
- **CONTEXT:** [Reference local files, Supabase schemas, or previous logs]
- **REASONING:** [Step-by-step logic explaining the 'Why' and 'How']
- **OUTPUT:** [Specify the exact expected format]
- **STOP:** [Clear exit condition]

---

## 🏗️ PROJECT CONTEXT: MRC-APP
- **Stack:** React (Vite), TypeScript, Tailwind CSS, shadcn-ui.
- **Backend:** Supabase (Auth, DB, Storage).

Use any agents needed when they can help. Always go for the specialised agents to utilise them and check /Users/michaelyoussef/mrc-app-1/context as it's your golden book for everything.

---

## COMPLETED: Leads Management Phase 1 (2026-02-09)

**Status:** DONE - All 3 features implemented by Claude Code + critical bug fix.

### What Was Done
1. **Fix 0 (Critical Bug):** `updateLeadStatus()` was only updating local React state - never persisted to Supabase. Now calls `supabase.from('leads').update()` with optimistic UI + rollback on failure, and logs activity to `activities` table.
2. **Fix 1 (Archive Lead):** Migration added `archived_at TIMESTAMPTZ` column to `leads`. AlertDialog confirmation, sets `archived_at` timestamp, logs activity, removes from pipeline. Query filters `.is('archived_at', null)`.
3. **Fix 2 (View History):** Dialog modal queries `activities` table by `lead_id`, displays vertical timeline with dots, titles, descriptions, and en-AU timestamps (Australia/Melbourne timezone). Loading/empty states.
4. **Fix 3 (Send Email):** Dialog composer with pre-filled To/Subject/Body using MRC template. "Send via Email App" (mailto: with encoded params) + "Copy to Clipboard". Logs activity on either action.
5. **Cleanup:** Removed all 3 `toast.info('... coming soon')` calls and unused `sonner` import from `LeadCard.tsx`.

### Files Modified
- `src/pages/LeadsManagement.tsx` - updateLeadStatus persistence, 3 handler implementations, 3 dialog modals, archive filter
- `src/components/leads/LeadCard.tsx` - Removed 3 "coming soon" toasts, removed unused import

### Build Status
- `npx tsc --noEmit` - 0 errors
- `npx vite build` - clean build

---

## CURRENT TASK: Schedule Page (`/admin/schedule`) — Comprehensive Planning & Feature Analysis

**ROLE:** Strategic Planning & Architecture (Gemini / Antigravity)
**TASK:** Conduct a thorough analysis of the Schedule page (`/admin/schedule`) and plan all remaining features, enhancements, and fixes needed for production readiness. Create a detailed implementation plan for Claude Code to execute.

### Context

The Schedule page is the admin's calendar view for booking inspections and managing technician schedules. It currently has core functionality working but needs enhancement.

**Current Files:**
- `src/pages/AdminSchedule.tsx` — Main page (sidebar + header + calendar + leads queue)
- `src/components/schedule/ScheduleCalendar.tsx` — Week calendar grid with event rendering
- `src/components/schedule/ScheduleHeader.tsx` — Week navigation, technician filter, today button
- `src/components/schedule/LeadsQueue.tsx` — Right panel showing unbooked leads
- `src/components/schedule/LeadBookingCard.tsx` — Individual lead card in the queue
- `src/hooks/useScheduleCalendar.ts` — Calendar events hook (fetches from `calendar_bookings`)
- `src/hooks/useTechnicians.ts` — Technicians list hook

**Database Tables:**
- `calendar_bookings` — Stores all bookings (lead_id, technician_id, booking_date, start_time, end_time, duration_hours, description, status)
- `leads` — Lead data (property address, lat/lng for travel time)
- `profiles` — Technician profiles (starting_address with lat/lng)

**What Already Works (from previous sign-off):**
- Calendar panel split (70/30 calendar/queue)
- Internal notes save to `calendar_bookings.description`
- Color coding (blue=inspection, green=job)
- Technician filter in header
- Event positioning fixed (guard for negative/zero duration)
- Book Inspection button logic correct (requires date + time + technician)
- Technician selector only shows real technicians (fallback removed)

### What You Need to Plan

**1. Current State Audit:**
- Read all 6 schedule component files thoroughly
- Identify ALL bugs, UI issues, and missing functionality
- Test at 375px/768px/1440px viewports (screenshots)
- Check data flow: booking creation → calendar display → lead status update

**2. Feature Gap Analysis (from MASTER-TODO.md):**
- Travel time calculation — `calculate-travel-time` Edge Function exists, needs integration into booking flow
- Suggested booking times — Show "soonest available" based on technician travel time + existing schedule
- Drag-to-reschedule — Can bookings be dragged on the calendar?
- Booking conflict detection — Prevent double-booking a technician
- Event click → details panel — What happens when you click an event?
- Mobile experience — Is the calendar usable on mobile? What should change?
- Leads queue UX — How does a lead get from the queue to the calendar?

**3. Schedule-Specific Features to Evaluate:**
- Day view vs Week view toggle
- Month overview (mini calendar for navigation?)
- Booking duration display (show hours on event)
- Technician color coding (each tech gets a color?)
- Event status indicators (confirmed, pending, completed, cancelled)
- Notes/comments on bookings
- Recurring bookings (weekly follow-ups?)
- Calendar export (iCal/Google Calendar sync?)

**4. Integration Points:**
- When a booking is created → should lead status auto-update to `inspection_waiting`?
- When inspection completes → should booking status update to `completed`?
- When booking is cancelled → what happens to lead status?
- Travel time Edge Function integration for smart suggestions

### Deliverables

1. **Current State Report** — Bugs, UI issues, missing functionality (with screenshots)
2. **Feature Priority Matrix** — What's needed for Phase 1 vs Phase 2
3. **Implementation Plan** — Step-by-step plan for Claude Code to execute
4. **Database Changes** — Any migrations needed (new columns, tables)
5. **Testing Checklist** — How to verify each feature works

**REASONING:** The Schedule page is the core admin workflow — it's where inspections get booked and technicians get assigned. Getting this right directly impacts business operations. Need to thoroughly understand current state before planning enhancements.

**OUTPUT:** Write a comprehensive plan in `Channel.md` with:
- Current state audit with screenshots
- Prioritized feature list (Phase 1 must-haves vs Phase 2 nice-to-haves)
- Detailed implementation plan for Claude Code
- Database migration requirements
- Testing checklist

**STOP:** When the plan is complete, written to Channel.md, and ready for user review before Claude Code executes.