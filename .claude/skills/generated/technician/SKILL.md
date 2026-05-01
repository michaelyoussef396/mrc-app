---
name: technician
description: "Skill for the Technician area of mrc-app. 16 symbols across 8 files."
---

# Technician

16 symbols | 8 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how formatWeekdayDateAU, TechnicianHeader, getGreeting work
- Modifying technician-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/technician/JobsList.tsx` | JobsList, getStatusStyles, getStatusLabel, handleViewLead |
| `src/components/technician/TechnicianHeader.tsx` | TechnicianHeader, getGreeting, formatDate |
| `src/components/technician/TechnicianBottomNav.tsx` | TechnicianBottomNav, isActive, handleNavClick |
| `src/hooks/useTechnicianAlerts.ts` | mapActivityType, useTechnicianAlerts |
| `src/pages/TechnicianJobs.tsx` | formatDateHeader |
| `src/lib/dateUtils.ts` | formatWeekdayDateAU |
| `src/components/schedule/EventDetailsPanel.tsx` | EventDetailsPanel |
| `src/pages/TechnicianAlerts.tsx` | TechnicianAlerts |

## Entry Points

Start here when exploring this area:

- **`formatWeekdayDateAU`** (Function) — `src/lib/dateUtils.ts:35`
- **`TechnicianHeader`** (Function) — `src/components/technician/TechnicianHeader.tsx:12`
- **`getGreeting`** (Function) — `src/components/technician/TechnicianHeader.tsx:20`
- **`formatDate`** (Function) — `src/components/technician/TechnicianHeader.tsx:27`
- **`EventDetailsPanel`** (Function) — `src/components/schedule/EventDetailsPanel.tsx:30`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatWeekdayDateAU` | Function | `src/lib/dateUtils.ts` | 35 |
| `TechnicianHeader` | Function | `src/components/technician/TechnicianHeader.tsx` | 12 |
| `getGreeting` | Function | `src/components/technician/TechnicianHeader.tsx` | 20 |
| `formatDate` | Function | `src/components/technician/TechnicianHeader.tsx` | 27 |
| `EventDetailsPanel` | Function | `src/components/schedule/EventDetailsPanel.tsx` | 30 |
| `TechnicianAlerts` | Function | `src/pages/TechnicianAlerts.tsx` | 186 |
| `useTechnicianAlerts` | Function | `src/hooks/useTechnicianAlerts.ts` | 123 |
| `TechnicianBottomNav` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 23 |
| `isActive` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 42 |
| `handleNavClick` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 53 |
| `JobsList` | Function | `src/components/technician/JobsList.tsx` | 20 |
| `getStatusStyles` | Function | `src/components/technician/JobsList.tsx` | 23 |
| `getStatusLabel` | Function | `src/components/technician/JobsList.tsx` | 39 |
| `handleViewLead` | Function | `src/components/technician/JobsList.tsx` | 55 |
| `formatDateHeader` | Function | `src/pages/TechnicianJobs.tsx` | 53 |
| `mapActivityType` | Function | `src/hooks/useTechnicianAlerts.ts` | 66 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `TechnicianJobs → FormatDateAU` | cross_community | 4 |
| `TechnicianHeader → FormatDateAU` | cross_community | 4 |
| `ScheduleHeader → FormatDateAU` | cross_community | 4 |
| `TechnicianDashboard → MapActivityType` | cross_community | 3 |
| `TechnicianBottomNav → UseAuth` | cross_community | 3 |
| `TechnicianBottomNav → MapActivityType` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 2 calls |
| Leads | 1 calls |
| Schedule | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatWeekdayDateAU"})` — see callers and callees
2. `gitnexus_query({query: "technician"})` — find related execution flows
3. Read key files listed above for implementation details
