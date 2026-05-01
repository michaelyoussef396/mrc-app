---
name: dashboard
description: "Skill for the Dashboard area of mrc-app. 6 symbols across 2 files."
---

# Dashboard

6 symbols | 2 files | Cohesion: 63%

## When to Use

- Working with code in `src/`
- Understanding how formatDateTimeAU, ActivityTimeline work
- Modifying dashboard-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/dashboard/ActivityTimeline.tsx` | formatDiffValue, getFieldEditMetadata, formatRelativeTime, getSourceBadge, ActivityTimeline |
| `src/lib/dateUtils.ts` | formatDateTimeAU |

## Entry Points

Start here when exploring this area:

- **`formatDateTimeAU`** (Function) — `src/lib/dateUtils.ts:26`
- **`ActivityTimeline`** (Function) — `src/components/dashboard/ActivityTimeline.tsx:108`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatDateTimeAU` | Function | `src/lib/dateUtils.ts` | 26 |
| `ActivityTimeline` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 108 |
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
| `RenderPrimaryCTA → FormatDateAU` | cross_community | 3 |
| `RenderPrimaryCTA → FormatTimeAU` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Leads | 1 calls |
| Schedule | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatDateTimeAU"})` — see callers and callees
2. `gitnexus_query({query: "dashboard"})` — find related execution flows
3. Read key files listed above for implementation details
