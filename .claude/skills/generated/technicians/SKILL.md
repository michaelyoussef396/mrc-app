---
name: technicians
description: "Skill for the Technicians area of mrc-app. 9 symbols across 5 files."
---

# Technicians

9 symbols | 5 files | Cohesion: 94%

## When to Use

- Working with code in `src/`
- Understanding how formatRevenue, formatLastSeen, TechnicianStatsGrid work
- Modifying technicians-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/hooks/useTechnicianStats.ts` | formatRevenue, formatLastSeen |
| `src/components/technicians/TechnicianCard.tsx` | TechnicianCard, getInitialsBackground |
| `src/components/technicians/WorkloadBreakdown.tsx` | WorkloadBreakdown, getPercentage |
| `src/components/technicians/TechnicianProfileHeader.tsx` | TechnicianProfileHeader, getInitialsBackground |
| `src/components/technicians/TechnicianStatsGrid.tsx` | TechnicianStatsGrid |

## Entry Points

Start here when exploring this area:

- **`formatRevenue`** (Function) — `src/hooks/useTechnicianStats.ts:64`
- **`formatLastSeen`** (Function) — `src/hooks/useTechnicianStats.ts:74`
- **`TechnicianStatsGrid`** (Function) — `src/components/technicians/TechnicianStatsGrid.tsx:54`
- **`TechnicianCard`** (Function) — `src/components/technicians/TechnicianCard.tsx:8`
- **`getInitialsBackground`** (Function) — `src/components/technicians/TechnicianCard.tsx:12`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatRevenue` | Function | `src/hooks/useTechnicianStats.ts` | 64 |
| `formatLastSeen` | Function | `src/hooks/useTechnicianStats.ts` | 74 |
| `TechnicianStatsGrid` | Function | `src/components/technicians/TechnicianStatsGrid.tsx` | 54 |
| `TechnicianCard` | Function | `src/components/technicians/TechnicianCard.tsx` | 8 |
| `getInitialsBackground` | Function | `src/components/technicians/TechnicianCard.tsx` | 12 |
| `WorkloadBreakdown` | Function | `src/components/technicians/WorkloadBreakdown.tsx` | 35 |
| `getPercentage` | Function | `src/components/technicians/WorkloadBreakdown.tsx` | 44 |
| `TechnicianProfileHeader` | Function | `src/components/technicians/TechnicianProfileHeader.tsx` | 7 |
| `getInitialsBackground` | Function | `src/components/technicians/TechnicianProfileHeader.tsx` | 9 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatRevenue"})` — see callers and callees
2. `gitnexus_query({query: "technicians"})` — find related execution flows
3. Read key files listed above for implementation details
