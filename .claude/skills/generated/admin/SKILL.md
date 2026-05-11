---
name: admin
description: "Skill for the Admin area of mrc-app. 11 symbols across 3 files."
---

# Admin

11 symbols | 3 files | Cohesion: 91%

## When to Use

- Working with code in `src/`
- Understanding how AdminSearchBar, handleSelectLead, getStatusColor work
- Modifying admin-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/admin/AdminSearchBar.tsx` | AdminSearchBar, handleSelectLead, getStatusColor, formatStatus, highlightMatch (+1) |
| `src/components/admin/AdminSidebar.tsx` | isActive, handleNavClick, SidebarContent |
| `src/components/admin/StatsCard.tsx` | StatsCard, getTrendColor |

## Entry Points

Start here when exploring this area:

- **`AdminSearchBar`** (Function) — `src/components/admin/AdminSearchBar.tsx:13`
- **`handleSelectLead`** (Function) — `src/components/admin/AdminSearchBar.tsx:84`
- **`getStatusColor`** (Function) — `src/components/admin/AdminSearchBar.tsx:98`
- **`formatStatus`** (Function) — `src/components/admin/AdminSearchBar.tsx:130`
- **`highlightMatch`** (Function) — `src/components/admin/AdminSearchBar.tsx:139`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AdminSearchBar` | Function | `src/components/admin/AdminSearchBar.tsx` | 13 |
| `handleSelectLead` | Function | `src/components/admin/AdminSearchBar.tsx` | 84 |
| `getStatusColor` | Function | `src/components/admin/AdminSearchBar.tsx` | 98 |
| `formatStatus` | Function | `src/components/admin/AdminSearchBar.tsx` | 130 |
| `highlightMatch` | Function | `src/components/admin/AdminSearchBar.tsx` | 139 |
| `getInitials` | Function | `src/components/admin/AdminSearchBar.tsx` | 161 |
| `isActive` | Function | `src/components/admin/AdminSidebar.tsx` | 56 |
| `handleNavClick` | Function | `src/components/admin/AdminSidebar.tsx` | 63 |
| `SidebarContent` | Function | `src/components/admin/AdminSidebar.tsx` | 71 |
| `StatsCard` | Function | `src/components/admin/StatsCard.tsx` | 12 |
| `getTrendColor` | Function | `src/components/admin/StatsCard.tsx` | 21 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `AdminSearchBar → EscapeIlike` | cross_community | 4 |
| `AdminSearchBar → UseDebounce` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Hooks | 2 calls |

## How to Explore

1. `gitnexus_context({name: "AdminSearchBar"})` — see callers and callees
2. `gitnexus_query({query: "admin"})` — find related execution flows
3. Read key files listed above for implementation details
