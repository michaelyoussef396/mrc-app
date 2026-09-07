---
name: hooks
description: "Skill for the Hooks area of mrc-app. 149 symbols across 41 files."
---

# Hooks

149 symbols | 41 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how NeedsAttentionList, useActivityTimeline, useLeadsNeedsAttention work
- Modifying hooks-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/hooks/useScheduleCalendar.ts` | getWeekStart, getWeekEnd, formatWeekRange, useScheduleCalendar, formatDateKey (+8) |
| `src/hooks/useTechnicianJobs.ts` | getTodayDate, getThisWeekRange, fmt, getThisMonthRange, useTechnicianJobs (+6) |
| `src/hooks/use-toast.ts` | genId, addToRemoveQueue, timeout, reducer, dispatch (+4) |
| `src/hooks/useJobCompletionForm.ts` | rowToFormData, useJobCompletionForm, init, isNetworkLevelError, showOfflineToast (+2) |
| `src/hooks/useGoogleMaps.ts` | ensureInitialized, getPlacePredictions, getPlaceDetails, getComponent, calculateTravelTime (+2) |
| `src/hooks/useActivityTimeline.ts` | useActivityTimeline, getActivityIcon, getEmailIcon, getNotificationIcon, formatTemplateName (+1) |
| `src/hooks/useUnassignedLeads.ts` | useUnassignedLeads, fetchUnassignedLeads, parseFullName, formatDisplayName, getInitials (+1) |
| `src/hooks/useLeadsToSchedule.ts` | queryFn, parseFullName, formatDisplayName, getInitials, buildFullAddress (+1) |
| `src/hooks/useVariationContext.ts` | parseAuditMetadata, isPlainObject, extractScopeDeltas, toOriginalQuote, toCurrentVariation (+1) |
| `src/hooks/useReportsData.ts` | queryFn, getDateRange, useReportsData, bucketKey, generateTimeline |

## Entry Points

Start here when exploring this area:

- **`NeedsAttentionList`** (Function) — `src/components/admin/NeedsAttentionList.tsx:18`
- **`useActivityTimeline`** (Function) — `src/hooks/useActivityTimeline.ts:89`
- **`useLeadsNeedsAttention`** (Function) — `src/hooks/useLeadsNeedsAttention.ts:32`
- **`fetchLeads`** (Function) — `src/hooks/useLeadsNeedsAttention.ts:38`
- **`getTechnicianColor`** (Function) — `src/hooks/useTechnicians.ts:31`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NeedsAttentionList` | Function | `src/components/admin/NeedsAttentionList.tsx` | 18 |
| `useActivityTimeline` | Function | `src/hooks/useActivityTimeline.ts` | 89 |
| `useLeadsNeedsAttention` | Function | `src/hooks/useLeadsNeedsAttention.ts` | 32 |
| `fetchLeads` | Function | `src/hooks/useLeadsNeedsAttention.ts` | 38 |
| `getTechnicianColor` | Function | `src/hooks/useTechnicians.ts` | 31 |
| `useTodaysSchedule` | Function | `src/hooks/useTodaysSchedule.ts` | 23 |
| `fetchTodaysSchedule` | Function | `src/hooks/useTodaysSchedule.ts` | 32 |
| `AdminDashboard` | Function | `src/pages/AdminDashboard.tsx` | 62 |
| `formatCurrency` | Function | `src/pages/AdminDashboard.tsx` | 98 |
| `Notifications` | Function | `src/pages/Notifications.tsx` | 5 |
| `queryFn` | Function | `src/hooks/useReportsData.ts` | 120 |
| `queryFn` | Function | `src/hooks/useTechnicianDetail.ts` | 342 |
| `getInitials` | Function | `src/hooks/useTechnicianStats.ts` | 58 |
| `getTechnicianColor` | Function | `src/hooks/useTechnicianStats.ts` | 67 |
| `getPaidInvoices` | Function | `src/lib/api/invoices.ts` | 224 |
| `sumPaidRevenueFor` | Function | `src/lib/api/invoices.ts` | 260 |
| `parseLocalDate` | Function | `src/lib/dateUtils.ts` | 90 |
| `getWorkloadBucket` | Function | `src/lib/statusFlow.ts` | 288 |
| `getDateRange` | Function | `src/hooks/useReportsData.ts` | 51 |
| `useReportsData` | Function | `src/hooks/useReportsData.ts` | 112 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `JobCompletionForm → CaptureBusinessError` | cross_community | 6 |
| `AdminDashboard → StartOfDay` | cross_community | 5 |
| `AdminDashboard → FormatShortDateAU` | cross_community | 5 |
| `LeadsManagement → ToSearchWords` | cross_community | 5 |
| `LeadsManagement → EscapeIlike` | cross_community | 5 |
| `JobCompletionForm → AddBusinessBreadcrumb` | cross_community | 5 |
| `JobCompletionForm → FormatDateAU` | cross_community | 5 |
| `AdminSearchBar → ToSearchWords` | cross_community | 5 |
| `AdminSearchBar → EscapeIlike` | cross_community | 5 |
| `Reports → ToLocalDayKey` | intra_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 14 calls |
| Dashboard | 3 calls |
| Admin | 3 calls |
| Leads | 3 calls |
| Job-completion | 2 calls |
| Schedule | 2 calls |
| Pages | 1 calls |
| Technician | 1 calls |

## How to Explore

1. `context({name: "NeedsAttentionList"})` — see callers and callees
2. `query({search_query: "hooks"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
