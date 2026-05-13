---
name: dashboard
description: "Skill for the Dashboard area of mrc-app. 7 symbols across 3 files."
---

# Dashboard

7 symbols | 3 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how formatDateTimeAU, ActivityTimeline work
- Modifying dashboard-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/dashboard/ActivityTimeline.tsx` | formatDiffValue, getFieldEditMetadata, formatRelativeTime, getSourceBadge, ActivityTimeline |
| `src/lib/dateUtils.ts` | formatDateTimeAU |
| `src/components/leads/InspectionReportHistory.tsx` | formatDateTime |

## Entry Points

Start here when exploring this area:

- **`formatDateTimeAU`** (Function) — `src/lib/dateUtils.ts:26`
- **`ActivityTimeline`** (Function) — `src/components/dashboard/ActivityTimeline.tsx:108`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatDateTimeAU` | Function | `src/lib/dateUtils.ts` | 26 |
| `ActivityTimeline` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 108 |
| `formatDateTime` | Function | `src/components/leads/InspectionReportHistory.tsx` | 38 |
| `formatDiffValue` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 36 |
| `getFieldEditMetadata` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 53 |
| `formatRelativeTime` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 63 |
| `getSourceBadge` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 90 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleBookInspection → FormatDateAU` | cross_community | 6 |
| `HandleBookInspection → FormatTimeAU` | cross_community | 6 |
| `HandleSaveNotes → FormatDateAU` | cross_community | 4 |
| `HandleSaveNotes → FormatTimeAU` | cross_community | 4 |
| `HandleSaveNote → FormatDateAU` | cross_community | 4 |
| `HandleSaveNote → FormatTimeAU` | cross_community | 4 |
| `InspectionReportHistory → FormatDateAU` | cross_community | 4 |
| `InspectionReportHistory → FormatTimeAU` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Leads | 1 calls |
| Schedule | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatDateTimeAU"})` — see callers and callees
2. `gitnexus_query({query: "dashboard"})` — find related execution flows
3. Read key files listed above for implementation details
