---
name: technician
description: "Skill for the Technician area of mrc-app. 14 symbols across 7 files."
---

# Technician

14 symbols | 7 files | Cohesion: 73%

## When to Use

- Working with code in `src/`
- Understanding how TechnicianBottomNav, isActive, handleNavClick work
- Modifying technician-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/technician/JobsList.tsx` | JobsList, getStatusStyles, getStatusLabel, handleViewLead |
| `src/components/technician/TechnicianBottomNav.tsx` | TechnicianBottomNav, isActive, handleNavClick |
| `src/components/technician/TechnicianHeader.tsx` | TechnicianHeader, getGreeting, formatDate |
| `src/hooks/useTechnicianAlerts.ts` | useTechnicianAlerts |
| `src/lib/offline/SyncIndicator.tsx` | SyncIndicator |
| `src/lib/dateUtils.ts` | formatWeekdayDateAU |
| `src/pages/TechnicianJobs.tsx` | formatDateHeader |

## Entry Points

Start here when exploring this area:

- **`TechnicianBottomNav`** (Function) — `src/components/technician/TechnicianBottomNav.tsx:23`
- **`isActive`** (Function) — `src/components/technician/TechnicianBottomNav.tsx:42`
- **`handleNavClick`** (Function) — `src/components/technician/TechnicianBottomNav.tsx:53`
- **`useTechnicianAlerts`** (Function) — `src/hooks/useTechnicianAlerts.ts:123`
- **`SyncIndicator`** (Function) — `src/lib/offline/SyncIndicator.tsx:11`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TechnicianBottomNav` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 23 |
| `isActive` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 42 |
| `handleNavClick` | Function | `src/components/technician/TechnicianBottomNav.tsx` | 53 |
| `useTechnicianAlerts` | Function | `src/hooks/useTechnicianAlerts.ts` | 123 |
| `SyncIndicator` | Function | `src/lib/offline/SyncIndicator.tsx` | 11 |
| `TechnicianHeader` | Function | `src/components/technician/TechnicianHeader.tsx` | 12 |
| `getGreeting` | Function | `src/components/technician/TechnicianHeader.tsx` | 20 |
| `formatDate` | Function | `src/components/technician/TechnicianHeader.tsx` | 27 |
| `formatWeekdayDateAU` | Function | `src/lib/dateUtils.ts` | 35 |
| `JobsList` | Function | `src/components/technician/JobsList.tsx` | 20 |
| `getStatusStyles` | Function | `src/components/technician/JobsList.tsx` | 23 |
| `getStatusLabel` | Function | `src/components/technician/JobsList.tsx` | 39 |
| `handleViewLead` | Function | `src/components/technician/JobsList.tsx` | 55 |
| `formatDateHeader` | Function | `src/pages/TechnicianJobs.tsx` | 54 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `TechnicianBottomNav → CaptureBusinessError` | cross_community | 8 |
| `TechnicianBottomNav → QuarantinePhoto` | cross_community | 7 |
| `TechnicianBottomNav → IsCaptionValid` | cross_community | 7 |
| `TechnicianBottomNav → PhotoQuarantinedError` | cross_community | 7 |
| `TechnicianBottomNav → GetPendingDrafts` | cross_community | 6 |
| `TechnicianBottomNav → SyncDraft` | cross_community | 6 |
| `TechnicianBottomNav → GetPendingPhotos` | cross_community | 6 |
| `TechnicianBottomNav → GetPendingCounts` | cross_community | 6 |
| `TechnicianBottomNav → UseNetworkStatus` | cross_community | 4 |
| `TechnicianHeader → FormatDateAU` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Admin | 2 calls |
| Leads | 1 calls |
| Offline | 1 calls |

## How to Explore

1. `context({name: "TechnicianBottomNav"})` — see callers and callees
2. `query({search_query: "technician"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
