---
name: leads
description: "Skill for the Leads area of mrc-app. 135 symbols across 33 files."
---

# Leads

135 symbols | 33 files | Cohesion: 68%

## When to Use

- Working with code in `src/`
- Understanding how BookJobSheet, prefill, adjustHours work
- Modifying leads-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/leads/InspectionDataDisplay.tsx` | fmtCurrency, InspectionDataDisplay, AccordionSection, KV, BasicInfoSection (+25) |
| `src/components/leads/BookJobSheet.tsx` | toDateInputValue, getTomorrowStr, fetchTechnicians, BookJobSheet, prefill (+9) |
| `src/components/leads/CreateNewLeadModal.tsx` | sanitizeInput, checkRateLimit, recordAttempt, runDuplicateCheck, logAuditEntry (+7) |
| `src/components/leads/LeadCard.tsx` | getInitials, formatDate, formatPhone, LeadCard, handleArchive (+4) |
| `src/components/leads/InspectionReportHistory.tsx` | formatDateTime, statusBadgeClass, InspectionReportHistory, handleViewPdf, fetchPdfVersions (+3) |
| `src/components/leads/JobBookingDetails.tsx` | formatDay, formatTime, hoursBetween, StatusIcon, JobBookingDetails (+3) |
| `src/components/leads/JobCompletionSummary.tsx` | FieldLabel, FieldValue, BoolRow, PhotoGrid, SubHeading (+2) |
| `src/components/ui/sheet.tsx` | SheetOverlay, SheetContent, SheetHeader, SheetTitle, SheetDescription |
| `src/components/leads/InlineEditField.tsx` | InlineEditField, cancel, save, handleKeyDown, handleDraftChange |
| `src/components/booking/AddressAutocomplete.tsx` | AddressAutocomplete, handleSelectPlace, handleKeyDown |

## Entry Points

Start here when exploring this area:

- **`BookJobSheet`** (Function) — `src/components/leads/BookJobSheet.tsx:186`
- **`prefill`** (Function) — `src/components/leads/BookJobSheet.tsx:231`
- **`adjustHours`** (Function) — `src/components/leads/BookJobSheet.tsx:392`
- **`InlineEditAddress`** (Function) — `src/components/leads/InlineEditAddress.tsx:40`
- **`useCancelledBookings`** (Function) — `src/hooks/useCancelledBookings.ts:14`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BookJobSheet` | Function | `src/components/leads/BookJobSheet.tsx` | 186 |
| `prefill` | Function | `src/components/leads/BookJobSheet.tsx` | 231 |
| `adjustHours` | Function | `src/components/leads/BookJobSheet.tsx` | 392 |
| `InlineEditAddress` | Function | `src/components/leads/InlineEditAddress.tsx` | 40 |
| `useCancelledBookings` | Function | `src/hooks/useCancelledBookings.ts` | 14 |
| `useLeadsToSchedule` | Function | `src/hooks/useLeadsToSchedule.ts` | 44 |
| `JobCompletionEditSheet` | Function | `src/components/leads/JobCompletionEditSheet.tsx` | 146 |
| `handleRequestClose` | Function | `src/components/leads/JobCompletionEditSheet.tsx` | 185 |
| `EventDetailsPanel` | Function | `src/components/schedule/EventDetailsPanel.tsx` | 32 |
| `LeadsQueue` | Function | `src/components/schedule/LeadsQueue.tsx` | 26 |
| `handleToggle` | Function | `src/components/schedule/LeadsQueue.tsx` | 46 |
| `useTechnicians` | Function | `src/hooks/useTechnicians.ts` | 147 |
| `AdminSchedule` | Function | `src/pages/AdminSchedule.tsx` | 22 |
| `runDuplicateCheck` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 233 |
| `logAuditEntry` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 239 |
| `validateForm` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 257 |
| `handleSubmit` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 263 |
| `normalizePhoneDigits` | Function | `src/lib/api/leadDuplicates.ts` | 24 |
| `findDuplicateLead` | Function | `src/lib/api/leadDuplicates.ts` | 28 |
| `validateCreateLeadForm` | Function | `src/lib/validators/create-lead-form.ts` | 33 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSubmit → NormalizeMinutes` | cross_community | 5 |
| `AdminInvoiceHelper → MelbourneDateISO` | cross_community | 5 |
| `JobCompletionForm → FormatDateAU` | cross_community | 5 |
| `LeadCard → NormalizeMinutes` | cross_community | 5 |
| `InvoiceSummaryCard → MelbourneDateISO` | cross_community | 5 |
| `AdminSchedule → GetWeekStart` | cross_community | 4 |
| `HandleSubmit → FormatDateAU` | cross_community | 4 |
| `HandleSubmit → FormatTimeAU` | cross_community | 4 |
| `HandleSubmit → ToMinutes` | cross_community | 4 |
| `HandleSubmit → IsValidVictorianPostcode` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Ui | 19 calls |
| Pages | 14 calls |
| Api | 12 calls |
| Hooks | 7 calls |
| Schedule | 5 calls |
| Job-completion | 4 calls |
| Admin | 3 calls |
| Pdf | 3 calls |

## How to Explore

1. `context({name: "BookJobSheet"})` — see callers and callees
2. `query({search_query: "leads"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
