---
name: schedule
description: "Skill for the Schedule area of mrc-app. 21 symbols across 11 files."
---

# Schedule

21 symbols | 11 files | Cohesion: 63%

## When to Use

- Working with code in `src/`
- Understanding how getEventStyles, getDurationLabel, CancelledBookingsList work
- Modifying schedule-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/bookingService.ts` | checkBookingConflict, bookInspection, formatDateForDisplay, formatTimeForDisplay |
| `src/hooks/useScheduleCalendar.ts` | getWeekDates, formatDayHeader, calculateEventPosition |
| `src/components/schedule/LeadBookingCard.tsx` | timer, handleBookInspection, performBooking |
| `src/components/schedule/scheduleUtils.ts` | getEventStyles, getDurationLabel |
| `src/components/schedule/ScheduleCalendar.tsx` | ScheduleCalendar, handleEventClick |
| `src/lib/dateUtils.ts` | formatTimeAU, formatMediumDateAU |
| `src/components/schedule/CancelledBookingsList.tsx` | CancelledBookingsList |
| `src/components/schedule/ScheduleDailyView.tsx` | DailyEventCard |
| `src/hooks/useTechnicianDetail.ts` | formatJobDateTime |
| `src/components/leads/BookJobSheet.tsx` | run |

## Entry Points

Start here when exploring this area:

- **`getEventStyles`** (Function) — `src/components/schedule/scheduleUtils.ts:8`
- **`getDurationLabel`** (Function) — `src/components/schedule/scheduleUtils.ts:49`
- **`CancelledBookingsList`** (Function) — `src/components/schedule/CancelledBookingsList.tsx:18`
- **`ScheduleCalendar`** (Function) — `src/components/schedule/ScheduleCalendar.tsx:29`
- **`handleEventClick`** (Function) — `src/components/schedule/ScheduleCalendar.tsx:38`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getEventStyles` | Function | `src/components/schedule/scheduleUtils.ts` | 8 |
| `getDurationLabel` | Function | `src/components/schedule/scheduleUtils.ts` | 49 |
| `CancelledBookingsList` | Function | `src/components/schedule/CancelledBookingsList.tsx` | 18 |
| `ScheduleCalendar` | Function | `src/components/schedule/ScheduleCalendar.tsx` | 29 |
| `handleEventClick` | Function | `src/components/schedule/ScheduleCalendar.tsx` | 38 |
| `getWeekDates` | Function | `src/hooks/useScheduleCalendar.ts` | 70 |
| `formatDayHeader` | Function | `src/hooks/useScheduleCalendar.ts` | 107 |
| `calculateEventPosition` | Function | `src/hooks/useScheduleCalendar.ts` | 347 |
| `formatJobDateTime` | Function | `src/hooks/useTechnicianDetail.ts` | 81 |
| `formatTimeAU` | Function | `src/lib/dateUtils.ts` | 14 |
| `run` | Function | `src/components/leads/BookJobSheet.tsx` | 350 |
| `timer` | Function | `src/components/schedule/LeadBookingCard.tsx` | 309 |
| `handleBookInspection` | Function | `src/components/schedule/LeadBookingCard.tsx` | 520 |
| `performBooking` | Function | `src/components/schedule/LeadBookingCard.tsx` | 539 |
| `checkBookingConflict` | Function | `src/lib/bookingService.ts` | 42 |
| `bookInspection` | Function | `src/lib/bookingService.ts` | 81 |
| `formatDateForDisplay` | Function | `src/lib/bookingService.ts` | 354 |
| `formatTimeForDisplay` | Function | `src/lib/bookingService.ts` | 365 |
| `formatMediumDateAU` | Function | `src/lib/dateUtils.ts` | 54 |
| `DailyEventCard` | Function | `src/components/schedule/ScheduleDailyView.tsx` | 72 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `AdminDashboard → FormatTimeAU` | cross_community | 4 |
| `HandleSubmit → FormatTimeAU` | cross_community | 4 |
| `HandleSaveNotes → FormatTimeAU` | cross_community | 4 |
| `ScheduleCalendar → FormatDateKey` | cross_community | 4 |
| `BookInspection → FormatDateAU` | cross_community | 4 |
| `BookInspection → FormatTimeAU` | cross_community | 4 |
| `BookInspection → NormaliseEmpty` | cross_community | 4 |
| `BookInspection → GetFieldLabel` | cross_community | 4 |
| `BookInspection → FormatDiffValueForDescription` | cross_community | 4 |
| `HandleSaveNote → FormatTimeAU` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 6 calls |
| Leads | 3 calls |
| Hooks | 2 calls |

## How to Explore

1. `context({name: "getEventStyles"})` — see callers and callees
2. `query({search_query: "schedule"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
