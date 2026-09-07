---
name: dashboard
description: "Skill for the Dashboard area of mrc-app. 13 symbols across 3 files."
---

# Dashboard

13 symbols | 3 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how ActivityTimeline, getFieldLabel, formatDiffValueForDescription work
- Modifying dashboard-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/dashboard/ActivityTimeline.tsx` | humaniseEnumKey, formatDiffValue, getFieldEditMetadata, getSectionMilestoneChanges, SectionMilestoneRow (+4) |
| `src/lib/api/fieldEditLog.ts` | buildDescription, titleSummary |
| `src/lib/utils/fieldLabels.ts` | getFieldLabel, formatDiffValueForDescription |

## Entry Points

Start here when exploring this area:

- **`ActivityTimeline`** (Function) — `src/components/dashboard/ActivityTimeline.tsx:195`
- **`getFieldLabel`** (Function) — `src/lib/utils/fieldLabels.ts:170`
- **`formatDiffValueForDescription`** (Function) — `src/lib/utils/fieldLabels.ts:186`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ActivityTimeline` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 195 |
| `getFieldLabel` | Function | `src/lib/utils/fieldLabels.ts` | 170 |
| `formatDiffValueForDescription` | Function | `src/lib/utils/fieldLabels.ts` | 186 |
| `humaniseEnumKey` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 33 |
| `formatDiffValue` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 59 |
| `getFieldEditMetadata` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 78 |
| `getSectionMilestoneChanges` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 93 |
| `SectionMilestoneRow` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 106 |
| `formatRelativeTime` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 140 |
| `getSourceBadge` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 167 |
| `getPriorityBadge` | Function | `src/components/dashboard/ActivityTimeline.tsx` | 179 |
| `buildDescription` | Function | `src/lib/api/fieldEditLog.ts` | 257 |
| `titleSummary` | Function | `src/lib/api/fieldEditLog.ts` | 268 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleApproveJobCompletion → GetFieldLabel` | cross_community | 5 |
| `HandleApproveJobCompletion → FormatDiffValueForDescription` | cross_community | 5 |
| `InspectionAIReview → GetFieldLabel` | cross_community | 5 |
| `InspectionAIReview → FormatDiffValueForDescription` | cross_community | 5 |
| `HandleEdit → GetFieldLabel` | cross_community | 5 |
| `HandleEdit → FormatDiffValueForDescription` | cross_community | 5 |
| `HandleApprove → GetFieldLabel` | cross_community | 4 |
| `HandleApprove → FormatDiffValueForDescription` | cross_community | 4 |
| `HandleSendBackToTechnician → GetFieldLabel` | cross_community | 4 |
| `HandleSendBackToTechnician → FormatDiffValueForDescription` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Admin | 1 calls |
| Pdf | 1 calls |
| Ui | 1 calls |

## How to Explore

1. `context({name: "ActivityTimeline"})` — see callers and callees
2. `query({search_query: "dashboard"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
