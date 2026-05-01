---
name: ui
description: "Skill for the Ui area of mrc-app. 14 symbols across 10 files."
---

# Ui

14 symbols | 10 files | Cohesion: 90%

## When to Use

- Working with code in `src/`
- Understanding how cn, InspectionJobCard, getUrgencyBadge work
- Modifying ui-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/ui/sheet.tsx` | SheetHeader, SheetFooter |
| `src/components/ui/dialog.tsx` | DialogHeader, DialogFooter |
| `src/components/ui/alert-dialog.tsx` | AlertDialogHeader, AlertDialogFooter |
| `src/components/inspection/InspectionJobCard.tsx` | InspectionJobCard, getUrgencyBadge |
| `src/lib/utils.ts` | cn |
| `src/components/ui/skeleton.tsx` | Skeleton |
| `src/components/ui/dropdown-menu.tsx` | DropdownMenuShortcut |
| `src/components/ui/calendar.tsx` | Calendar |
| `src/components/ui/badge.tsx` | Badge |
| `src/components/booking/SmartBookingSlots.tsx` | SlotButton |

## Entry Points

Start here when exploring this area:

- **`cn`** (Function) — `src/lib/utils.ts:3`
- **`InspectionJobCard`** (Function) — `src/components/inspection/InspectionJobCard.tsx:33`
- **`getUrgencyBadge`** (Function) — `src/components/inspection/InspectionJobCard.tsx:40`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `cn` | Function | `src/lib/utils.ts` | 3 |
| `InspectionJobCard` | Function | `src/components/inspection/InspectionJobCard.tsx` | 33 |
| `getUrgencyBadge` | Function | `src/components/inspection/InspectionJobCard.tsx` | 40 |
| `Skeleton` | Function | `src/components/ui/skeleton.tsx` | 2 |
| `SheetHeader` | Function | `src/components/ui/sheet.tsx` | 69 |
| `SheetFooter` | Function | `src/components/ui/sheet.tsx` | 74 |
| `DropdownMenuShortcut` | Function | `src/components/ui/dropdown-menu.tsx` | 157 |
| `DialogHeader` | Function | `src/components/ui/dialog.tsx` | 53 |
| `DialogFooter` | Function | `src/components/ui/dialog.tsx` | 58 |
| `Calendar` | Function | `src/components/ui/calendar.tsx` | 9 |
| `Badge` | Function | `src/components/ui/badge.tsx` | 24 |
| `AlertDialogHeader` | Function | `src/components/ui/alert-dialog.tsx` | 45 |
| `AlertDialogFooter` | Function | `src/components/ui/alert-dialog.tsx` | 50 |
| `SlotButton` | Function | `src/components/booking/SmartBookingSlots.tsx` | 178 |

## How to Explore

1. `gitnexus_context({name: "cn"})` — see callers and callees
2. `gitnexus_query({query: "ui"})` — find related execution flows
3. Read key files listed above for implementation details
