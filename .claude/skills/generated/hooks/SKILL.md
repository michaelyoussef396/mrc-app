---
name: hooks
description: "Skill for the Hooks area of mrc-app. 103 symbols across 39 files."
---

# Hooks

103 symbols | 39 files | Cohesion: 77%

## When to Use

- Working with code in `src/`
- Understanding how HelpSupport, useNotifications, useUnreadCount work
- Modifying hooks-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/hooks/useScheduleCalendar.ts` | getWeekStart, getWeekEnd, formatWeekRange, formatDateKey, isSameDay (+5) |
| `src/hooks/useTechnicianJobs.ts` | getTodayDate, getThisWeekRange, getThisMonthRange, formatTime, extractDate (+2) |
| `src/hooks/useTechnicianDetail.ts` | fetchTechnicianDetail, formatJobDateTime, getEventTypeColor, getJobAccentColor, fetchUpcomingJobs (+2) |
| `src/hooks/useLeadsToSchedule.ts` | useLeadsToSchedule, parseFullName, formatDisplayName, getInitials, buildFullAddress (+1) |
| `src/hooks/useUnassignedLeads.ts` | useUnassignedLeads, fetchUnassignedLeads, parseFullName, formatDisplayName, getInitials (+1) |
| `src/hooks/useActivityTimeline.ts` | getActivityIcon, getEmailIcon, getNotificationIcon, formatTemplateName, useActivityTimeline |
| `src/hooks/useGoogleMaps.ts` | useAddressAutocomplete, getComponent, useLoadGoogleMaps, useTravelTime, useSmartBookingSlots |
| `src/hooks/useTechnicianStats.ts` | useTechnicianStats, getInitials, getTechnicianColor, fetchTechniciansWithStats |
| `src/hooks/useCancelledBookings.ts` | useCancelledBookings, getTechnicianColor, extractNameFromTitle, extractSuburbFromAddress |
| `src/hooks/useTodaysSchedule.ts` | useTodaysSchedule, fetchTodaysSchedule, formatTime, formatJobType |

## Entry Points

Start here when exploring this area:

- **`HelpSupport`** (Function) — `src/pages/HelpSupport.tsx:15`
- **`useNotifications`** (Function) — `src/hooks/useNotifications.ts:30`
- **`useUnreadCount`** (Function) — `src/hooks/useNotifications.ts:103`
- **`useMarkAllAsRead`** (Function) — `src/hooks/useNotifications.ts:178`
- **`useInspectionLeads`** (Function) — `src/hooks/useInspectionLeads.ts:38`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `HelpSupport` | Function | `src/pages/HelpSupport.tsx` | 15 |
| `useNotifications` | Function | `src/hooks/useNotifications.ts` | 30 |
| `useUnreadCount` | Function | `src/hooks/useNotifications.ts` | 103 |
| `useMarkAllAsRead` | Function | `src/hooks/useNotifications.ts` | 178 |
| `useInspectionLeads` | Function | `src/hooks/useInspectionLeads.ts` | 38 |
| `useInspectionLeadsCount` | Function | `src/hooks/useInspectionLeads.ts` | 144 |
| `useAuth` | Function | `src/contexts/AuthContext.tsx` | 300 |
| `RoleProtectedRoute` | Function | `src/components/RoleProtectedRoute.tsx` | 20 |
| `ProtectedRoute` | Function | `src/components/ProtectedRoute.tsx` | 3 |
| `AdminHeader` | Function | `src/components/admin/AdminHeader.tsx` | 26 |
| `getTimeAgo` | Function | `src/lib/bookingService.ts` | 334 |
| `useLeadsToSchedule` | Function | `src/hooks/useLeadsToSchedule.ts` | 44 |
| `LeadsQueue` | Function | `src/components/schedule/LeadsQueue.tsx` | 26 |
| `handleToggle` | Function | `src/components/schedule/LeadsQueue.tsx` | 46 |
| `getTechnicianColor` | Function | `src/hooks/useTechnicians.ts` | 31 |
| `useTechnicianStats` | Function | `src/hooks/useTechnicianStats.ts` | 274 |
| `AdminTechnicians` | Function | `src/pages/AdminTechnicians.tsx` | 109 |
| `AdminDashboard` | Function | `src/pages/AdminDashboard.tsx` | 61 |
| `formatCurrency` | Function | `src/pages/AdminDashboard.tsx` | 97 |
| `useAdminDashboardStats` | Function | `src/hooks/useAdminDashboardStats.ts` | 25 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `AdminDashboard → FormatShortDateAU` | cross_community | 5 |
| `LeadDetail → Set` | cross_community | 4 |
| `AdminDashboard → FormatTime` | cross_community | 4 |
| `AdminDashboard → FormatJobType` | cross_community | 4 |
| `AdminDashboard → ParseFullName` | cross_community | 4 |
| `AdminDashboard → FormatDisplayName` | cross_community | 4 |
| `AdminDashboard → GetInitials` | cross_community | 4 |
| `ScheduleCalendar → FormatDateKey` | cross_community | 4 |
| `AdminSearchBar → EscapeIlike` | cross_community | 4 |
| `AdminTechnicianDetail → GetInitials` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 3 calls |
| Tools | 2 calls |
| Schedule | 1 calls |
| Services | 1 calls |
| Api | 1 calls |
| Technician | 1 calls |
| Job-completion | 1 calls |
| Ui | 1 calls |

## How to Explore

1. `gitnexus_context({name: "HelpSupport"})` — see callers and callees
2. `gitnexus_query({query: "hooks"})` — find related execution flows
3. Read key files listed above for implementation details
