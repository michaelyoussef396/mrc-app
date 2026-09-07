---
name: admin
description: "Skill for the Admin area of mrc-app. 34 symbols across 12 files."
---

# Admin

34 symbols | 12 files | Cohesion: 78%

## When to Use

- Working with code in `src/`
- Understanding how ProtectedRoute, RoleProtectedRoute, AdminHeader work
- Modifying admin-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/admin/AdminHeader.tsx` | AdminHeader, getTimeOfDay, getNotificationTypeIcon, isNotificationUnread, formatNotificationTime (+2) |
| `src/components/admin/AdminSearchBar.tsx` | AdminSearchBar, handleKeyDown, handleSelectLead, getStatusColor, formatStatus (+2) |
| `src/hooks/useNotifications.ts` | useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead |
| `src/components/admin/AdminSidebar.tsx` | AdminSidebar, isActive, handleNavClick, SidebarContent |
| `src/pages/NotFound.tsx` | NotFound, getDashboardUrl, getDashboardLabel |
| `src/hooks/useInspectionLeads.ts` | useInspectionLeads, useInspectionLeadsCount |
| `src/components/admin/StatsCard.tsx` | StatsCard, getTrendColor |
| `src/components/ProtectedRoute.tsx` | ProtectedRoute |
| `src/components/RoleProtectedRoute.tsx` | RoleProtectedRoute |
| `src/contexts/AuthContext.tsx` | useAuth |

## Entry Points

Start here when exploring this area:

- **`ProtectedRoute`** (Function) — `src/components/ProtectedRoute.tsx:3`
- **`RoleProtectedRoute`** (Function) — `src/components/RoleProtectedRoute.tsx:20`
- **`AdminHeader`** (Function) — `src/components/admin/AdminHeader.tsx:37`
- **`useInspectionLeads`** (Function) — `src/hooks/useInspectionLeads.ts:35`
- **`useInspectionLeadsCount`** (Function) — `src/hooks/useInspectionLeads.ts:113`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ProtectedRoute` | Function | `src/components/ProtectedRoute.tsx` | 3 |
| `RoleProtectedRoute` | Function | `src/components/RoleProtectedRoute.tsx` | 20 |
| `AdminHeader` | Function | `src/components/admin/AdminHeader.tsx` | 37 |
| `useInspectionLeads` | Function | `src/hooks/useInspectionLeads.ts` | 35 |
| `useInspectionLeadsCount` | Function | `src/hooks/useInspectionLeads.ts` | 113 |
| `useNotifications` | Function | `src/hooks/useNotifications.ts` | 19 |
| `useUnreadCount` | Function | `src/hooks/useNotifications.ts` | 92 |
| `useMarkAsRead` | Function | `src/hooks/useNotifications.ts` | 115 |
| `useMarkAllAsRead` | Function | `src/hooks/useNotifications.ts` | 167 |
| `useAuth` | Function | `src/contexts/AuthContext.tsx` | 300 |
| `isInternalPath` | Function | `src/lib/utils/navigation.ts` | 16 |
| `HelpSupport` | Function | `src/pages/HelpSupport.tsx` | 15 |
| `AdminSearchBar` | Function | `src/components/admin/AdminSearchBar.tsx` | 13 |
| `handleKeyDown` | Function | `src/components/admin/AdminSearchBar.tsx` | 44 |
| `handleSelectLead` | Function | `src/components/admin/AdminSearchBar.tsx` | 84 |
| `getStatusColor` | Function | `src/components/admin/AdminSearchBar.tsx` | 98 |
| `formatStatus` | Function | `src/components/admin/AdminSearchBar.tsx` | 130 |
| `highlightMatch` | Function | `src/components/admin/AdminSearchBar.tsx` | 139 |
| `getInitials` | Function | `src/components/admin/AdminSearchBar.tsx` | 161 |
| `AdminSidebar` | Function | `src/components/admin/AdminSidebar.tsx` | 38 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `AdminSearchBar → ToSearchWords` | cross_community | 5 |
| `AdminSearchBar → EscapeIlike` | cross_community | 5 |
| `AdminHeader → UseAuth` | intra_community | 4 |
| `LeadDetail → UseAuth` | cross_community | 3 |
| `TechnicianJobDetail → UseAuth` | cross_community | 3 |
| `TechnicianJobs → UseAuth` | cross_community | 3 |
| `TechnicianDashboard → UseAuth` | cross_community | 3 |
| `TechnicianAlerts → UseAuth` | cross_community | 3 |
| `AdminSearchBar → UseDebounce` | cross_community | 3 |
| `TechnicianBottomNav → UseAuth` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 2 calls |

## How to Explore

1. `context({name: "ProtectedRoute"})` — see callers and callees
2. `query({search_query: "admin"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
