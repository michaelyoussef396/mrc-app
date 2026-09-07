---
name: technicians
description: "Skill for the Technicians area of mrc-app. 13 symbols across 7 files."
---

# Technicians

13 symbols | 7 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how UpcomingBookingCard, UpcomingBookingsList, getEventTypeColor work
- Modifying technicians-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/technicians/UpcomingBookingsList.tsx` | BookingCardSkeleton, EmptyState, UpcomingBookingsList |
| `src/components/technicians/TechnicianCard.tsx` | Stat, TechnicianCard, getInitialsBackground |
| `src/hooks/useTechnicianDetail.ts` | getEventTypeColor, getJobAccentColor |
| `src/components/technicians/TechnicianStatsGrid.tsx` | StatCard, TechnicianStatsGrid |
| `src/components/technicians/UpcomingBookingCard.tsx` | UpcomingBookingCard |
| `src/lib/bookingTypeColors.ts` | toBookingType |
| `src/hooks/useTechnicianStats.ts` | formatRevenue |

## Entry Points

Start here when exploring this area:

- **`UpcomingBookingCard`** (Function) — `src/components/technicians/UpcomingBookingCard.tsx:9`
- **`UpcomingBookingsList`** (Function) — `src/components/technicians/UpcomingBookingsList.tsx:55`
- **`getEventTypeColor`** (Function) — `src/hooks/useTechnicianDetail.ts:102`
- **`getJobAccentColor`** (Function) — `src/hooks/useTechnicianDetail.ts:109`
- **`toBookingType`** (Function) — `src/lib/bookingTypeColors.ts:2`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `UpcomingBookingCard` | Function | `src/components/technicians/UpcomingBookingCard.tsx` | 9 |
| `UpcomingBookingsList` | Function | `src/components/technicians/UpcomingBookingsList.tsx` | 55 |
| `getEventTypeColor` | Function | `src/hooks/useTechnicianDetail.ts` | 102 |
| `getJobAccentColor` | Function | `src/hooks/useTechnicianDetail.ts` | 109 |
| `toBookingType` | Function | `src/lib/bookingTypeColors.ts` | 2 |
| `TechnicianCard` | Function | `src/components/technicians/TechnicianCard.tsx` | 24 |
| `getInitialsBackground` | Function | `src/components/technicians/TechnicianCard.tsx` | 28 |
| `TechnicianStatsGrid` | Function | `src/components/technicians/TechnicianStatsGrid.tsx` | 54 |
| `formatRevenue` | Function | `src/hooks/useTechnicianStats.ts` | 75 |
| `BookingCardSkeleton` | Function | `src/components/technicians/UpcomingBookingsList.tsx` | 9 |
| `EmptyState` | Function | `src/components/technicians/UpcomingBookingsList.tsx` | 33 |
| `Stat` | Function | `src/components/technicians/TechnicianCard.tsx` | 8 |
| `StatCard` | Function | `src/components/technicians/TechnicianStatsGrid.tsx` | 19 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 2 calls |
| Schedule | 1 calls |

## How to Explore

1. `context({name: "UpcomingBookingCard"})` — see callers and callees
2. `query({search_query: "technicians"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
