---
name: schedule
description: "Skill for the Schedule area of mrc-app. 23 symbols across 9 files."
---

# Schedule

23 symbols | 9 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how formatTimeAU, getWeekDates, isToday work
- Modifying schedule-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/schedule/LeadBookingCard.tsx` | LeadBookingCard, handleTechnicianSelect, handleRecommendationClick, handleDateChange, getTimeSlots (+2) |
| `src/hooks/useScheduleCalendar.ts` | getWeekDates, isToday, formatDayHeader, getEventsForDate, calculateEventPosition |
| `src/components/schedule/scheduleUtils.ts` | getEventStyles, getDurationLabel |
| `src/components/schedule/ScheduleDailyView.tsx` | ScheduleDailyView, DailyEventCard |
| `src/components/schedule/ScheduleCalendar.tsx` | ScheduleCalendar, handleEventClick |
| `src/hooks/useBookingValidation.ts` | useBookingValidation, formatTimeDisplay |
| `src/lib/dateUtils.ts` | formatTimeAU |
| `src/components/schedule/CancelledBookingsList.tsx` | CancelledBookingsList |
| `src/components/booking/TimeSlotValidator.tsx` | TimeSlotValidator |

## Entry Points

Start here when exploring this area:

- **`formatTimeAU`** (Function) — `src/lib/dateUtils.ts:14`
- **`getWeekDates`** (Function) — `src/hooks/useScheduleCalendar.ts:70`
- **`isToday`** (Function) — `src/hooks/useScheduleCalendar.ts:100`
- **`formatDayHeader`** (Function) — `src/hooks/useScheduleCalendar.ts:107`
- **`getEventsForDate`** (Function) — `src/hooks/useScheduleCalendar.ts:331`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatTimeAU` | Function | `src/lib/dateUtils.ts` | 14 |
| `getWeekDates` | Function | `src/hooks/useScheduleCalendar.ts` | 70 |
| `isToday` | Function | `src/hooks/useScheduleCalendar.ts` | 100 |
| `formatDayHeader` | Function | `src/hooks/useScheduleCalendar.ts` | 107 |
| `getEventsForDate` | Function | `src/hooks/useScheduleCalendar.ts` | 331 |
| `calculateEventPosition` | Function | `src/hooks/useScheduleCalendar.ts` | 347 |
| `getEventStyles` | Function | `src/components/schedule/scheduleUtils.ts` | 6 |
| `getDurationLabel` | Function | `src/components/schedule/scheduleUtils.ts` | 47 |
| `ScheduleDailyView` | Function | `src/components/schedule/ScheduleDailyView.tsx` | 12 |
| `ScheduleCalendar` | Function | `src/components/schedule/ScheduleCalendar.tsx` | 29 |
| `handleEventClick` | Function | `src/components/schedule/ScheduleCalendar.tsx` | 38 |
| `CancelledBookingsList` | Function | `src/components/schedule/CancelledBookingsList.tsx` | 18 |
| `useBookingValidation` | Function | `src/hooks/useBookingValidation.ts` | 84 |
| `formatTimeDisplay` | Function | `src/hooks/useBookingValidation.ts` | 231 |
| `LeadBookingCard` | Function | `src/components/schedule/LeadBookingCard.tsx` | 84 |
| `handleTechnicianSelect` | Function | `src/components/schedule/LeadBookingCard.tsx` | 304 |
| `handleRecommendationClick` | Function | `src/components/schedule/LeadBookingCard.tsx` | 342 |
| `handleDateChange` | Function | `src/components/schedule/LeadBookingCard.tsx` | 348 |
| `getTimeSlots` | Function | `src/components/schedule/LeadBookingCard.tsx` | 355 |
| `handleBookInspection` | Function | `src/components/schedule/LeadBookingCard.tsx` | 365 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleBookInspection → FormatDateAU` | cross_community | 6 |
| `HandleBookInspection → FormatTimeAU` | cross_community | 6 |
| `HandleBookInspection → Dispatch` | cross_community | 5 |
| `HandleSaveNotes → FormatTimeAU` | cross_community | 4 |
| `HandleSaveNote → FormatTimeAU` | cross_community | 4 |
| `ScheduleCalendar → FormatDateKey` | cross_community | 4 |
| `InspectionReportHistory → FormatTimeAU` | cross_community | 4 |
| `ScheduleDailyView → FormatDateKey` | cross_community | 4 |
| `HandleBookInspection → AddBusinessBreadcrumb` | cross_community | 4 |
| `HandleBookInspection → CheckBookingConflict` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 4 calls |
| Api | 2 calls |
| Pages | 1 calls |
| Leads | 1 calls |
| Ui | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatTimeAU"})` — see callers and callees
2. `gitnexus_query({query: "schedule"})` — find related execution flows
3. Read key files listed above for implementation details
