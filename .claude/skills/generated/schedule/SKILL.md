---
name: schedule
description: "Skill for the Schedule area of mrc-app. 29 symbols across 11 files."
---

# Schedule

29 symbols | 11 files | Cohesion: 73%

## When to Use

- Working with code in `src/`
- Understanding how formatTimeAU, getWeekDates, isToday work
- Modifying schedule-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/schedule/LeadBookingCard.tsx` | handleBookInspection, performBooking, LeadBookingCard, handleTechnicianSelect, handleRecommendationClick (+2) |
| `src/hooks/useScheduleCalendar.ts` | getWeekDates, isToday, formatDayHeader, getEventsForDate, calculateEventPosition |
| `src/lib/bookingService.ts` | checkBookingConflict, bookInspection, formatDateForDisplay, formatTimeForDisplay |
| `src/lib/dateUtils.ts` | formatTimeAU, formatMediumDateAU |
| `src/components/schedule/scheduleUtils.ts` | getEventStyles, getDurationLabel |
| `src/components/schedule/ScheduleDailyView.tsx` | ScheduleDailyView, DailyEventCard |
| `src/components/schedule/ScheduleCalendar.tsx` | ScheduleCalendar, handleEventClick |
| `src/hooks/useBookingValidation.ts` | useBookingValidation, formatTimeDisplay |
| `src/components/schedule/CancelledBookingsList.tsx` | CancelledBookingsList |
| `src/components/leads/BookJobSheet.tsx` | run |

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
| `formatMediumDateAU` | Function | `src/lib/dateUtils.ts` | 54 |
| `checkBookingConflict` | Function | `src/lib/bookingService.ts` | 40 |
| `bookInspection` | Function | `src/lib/bookingService.ts` | 79 |
| `formatDateForDisplay` | Function | `src/lib/bookingService.ts` | 317 |
| `formatTimeForDisplay` | Function | `src/lib/bookingService.ts` | 324 |
| `handleBookInspection` | Function | `src/components/schedule/LeadBookingCard.tsx` | 365 |
| `performBooking` | Function | `src/components/schedule/LeadBookingCard.tsx` | 384 |
| `run` | Function | `src/components/leads/BookJobSheet.tsx` | 351 |

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
| `HandleBookInspection → CheckBookingConflict` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 4 calls |
| Hooks | 4 calls |
| Pages | 2 calls |
| Services | 1 calls |
| Leads | 1 calls |
| Ui | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatTimeAU"})` — see callers and callees
2. `gitnexus_query({query: "schedule"})` — find related execution flows
3. Read key files listed above for implementation details
