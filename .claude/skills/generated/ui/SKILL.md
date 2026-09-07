---
name: ui
description: "Skill for the Ui area of mrc-app. 149 symbols across 44 files."
---

# Ui

149 symbols | 44 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how useIsMobile, cn, TimeSlotValidator work
- Modifying ui-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/ui/sidebar.tsx` | useSidebar, SidebarProvider, setOpen, toggleSidebar, handleKeyDown (+21) |
| `src/lib/utils/timeOfDay.ts` | toMinutes, fromMinutes, timeOfDayFromMinutes, timeOfDayToMinutes, parseTimeOfDay (+7) |
| `src/components/ui/table.tsx` | Table, TableHeader, TableBody, TableFooter, TableRow (+3) |
| `src/components/ui/alert-dialog.tsx` | AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle (+3) |
| `src/components/ui/chart.tsx` | ChartContainer, ChartStyle, useChart, ChartTooltipContent, tooltipLabel (+2) |
| `src/components/schedule/LeadBookingCard.tsx` | LeadBookingCard, handleAddressSearchChange, handleSelectPrediction, loadRecommendations, handleTechnicianSelect (+2) |
| `src/components/ui/form.tsx` | FormField, FormItem, useFormField, FormLabel, FormControl (+2) |
| `src/components/ui/dropdown-menu.tsx` | DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel (+1) |
| `src/components/ui/select.tsx` | SelectScrollUpButton, SelectScrollDownButton, SelectContent, SelectLabel, SelectSeparator (+1) |
| `src/components/ui/toast.tsx` | ToastAction, ToastViewport, Toast, ToastClose, ToastTitle (+1) |

## Entry Points

Start here when exploring this area:

- **`useIsMobile`** (Function) — `src/hooks/use-mobile.tsx:4`
- **`cn`** (Function) — `src/lib/utils.ts:3`
- **`TimeSlotValidator`** (Function) — `src/components/booking/TimeSlotValidator.tsx:26`
- **`useBookingValidation`** (Function) — `src/hooks/useBookingValidation.ts:188`
- **`formatTimeDisplay`** (Function) — `src/hooks/useBookingValidation.ts:404`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useIsMobile` | Function | `src/hooks/use-mobile.tsx` | 4 |
| `cn` | Function | `src/lib/utils.ts` | 3 |
| `TimeSlotValidator` | Function | `src/components/booking/TimeSlotValidator.tsx` | 26 |
| `useBookingValidation` | Function | `src/hooks/useBookingValidation.ts` | 188 |
| `formatTimeDisplay` | Function | `src/hooks/useBookingValidation.ts` | 404 |
| `LeadNotesSection` | Function | `src/components/leads/LeadNotesSection.tsx` | 48 |
| `DuplicateSendDialog` | Function | `src/components/pdf/DuplicateSendDialog.tsx` | 23 |
| `MismatchSendDialog` | Function | `src/components/pdf/MismatchSendDialog.tsx` | 28 |
| `PhotoDeleteConfirm` | Function | `src/components/photos/PhotoDeleteConfirm.tsx` | 18 |
| `LeadBookingCard` | Function | `src/components/schedule/LeadBookingCard.tsx` | 91 |
| `handleAddressSearchChange` | Function | `src/components/schedule/LeadBookingCard.tsx` | 333 |
| `handleSelectPrediction` | Function | `src/components/schedule/LeadBookingCard.tsx` | 344 |
| `loadRecommendations` | Function | `src/components/schedule/LeadBookingCard.tsx` | 438 |
| `handleTechnicianSelect` | Function | `src/components/schedule/LeadBookingCard.tsx` | 492 |
| `handleRecommendationClick` | Function | `src/components/schedule/LeadBookingCard.tsx` | 506 |
| `handleDateChange` | Function | `src/components/schedule/LeadBookingCard.tsx` | 512 |
| `formatDateTimeAU` | Function | `src/lib/dateUtils.ts` | 26 |
| `TimePicker` | Function | `src/components/ui/TimePicker.tsx` | 49 |
| `commit` | Function | `src/components/ui/TimePicker.tsx` | 88 |
| `toMinutes` | Function | `src/lib/utils/timeOfDay.ts` | 30 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `LeadsManagement → ToSearchWords` | cross_community | 5 |
| `LeadsManagement → EscapeIlike` | cross_community | 5 |
| `HandleSubmit → NormalizeMinutes` | cross_community | 5 |
| `RenderSection → Cn` | cross_community | 5 |
| `LeadCard → NormalizeMinutes` | cross_community | 5 |
| `AreaPhotoSlotGrid → Cn` | cross_community | 5 |
| `SectionRenderer → Cn` | cross_community | 5 |
| `Section4AfterPhotos → Cn` | cross_community | 5 |
| `HandleSubmit → FormatDateAU` | cross_community | 4 |
| `HandleSubmit → FormatTimeAU` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 18 calls |
| Leads | 8 calls |
| Booking | 4 calls |
| Schedule | 3 calls |
| Hooks | 3 calls |
| Admin | 2 calls |
| Api | 2 calls |
| Cluster_16 | 1 calls |

## How to Explore

1. `context({name: "useIsMobile"})` — see callers and callees
2. `query({search_query: "ui"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
