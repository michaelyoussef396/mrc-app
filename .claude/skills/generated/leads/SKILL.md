---
name: leads
description: "Skill for the Leads area of mrc-app. 85 symbols across 19 files."
---

# Leads

85 symbols | 19 files | Cohesion: 79%

## When to Use

- Working with code in `src/`
- Understanding how formatTimeAgo, formatDateAU, formatRelativeOrDateAU work
- Modifying leads-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/leads/InspectionDataDisplay.tsx` | fmtDate, BasicInfoSection, fmtNum, fmtBool, fmtMins (+11) |
| `src/components/leads/BookJobSheet.tsx` | toDateInputValue, getTomorrowStr, addDays, buildLocalDateTime, computeDaySchedule (+8) |
| `src/components/leads/LeadCard.tsx` | getInitials, formatDate, formatPhone, LeadCard, handleArchive (+4) |
| `src/components/leads/CreateNewLeadModal.tsx` | sanitizeInput, checkRateLimit, checkForDuplicates, logAuditEntry, validateForm (+3) |
| `src/components/leads/JobBookingDetails.tsx` | fetchJobBookings, fetchTechnicianName, formatDay, formatTime, hoursBetween (+1) |
| `src/components/leads/InspectionReportHistory.tsx` | formatDateTime, fetchPdfVersions, fetchEmailLogs, fetchGeneratorNames, statusBadgeClass (+1) |
| `src/components/leads/InlineEditField.tsx` | InlineEditField, cancel, save, handleKeyDown, handleDraftChange |
| `src/components/leads/InvoiceSummaryCard.tsx` | defaultDueDate, buildClipboardText, InvoiceSummaryCard, handleCopySummary, handleStartTracking |
| `src/lib/leadUtils.ts` | formatTimeAgo, calculatePropertyZone |
| `src/lib/dateUtils.ts` | formatDateAU, formatRelativeOrDateAU |

## Entry Points

Start here when exploring this area:

- **`formatTimeAgo`** (Function) — `src/lib/leadUtils.ts:66`
- **`formatDateAU`** (Function) — `src/lib/dateUtils.ts:2`
- **`formatRelativeOrDateAU`** (Function) — `src/lib/dateUtils.ts:66`
- **`JobCompletionForm`** (Function) — `src/pages/JobCompletionForm.tsx:36`
- **`renderSection`** (Function) — `src/pages/JobCompletionForm.tsx:227`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatTimeAgo` | Function | `src/lib/leadUtils.ts` | 66 |
| `formatDateAU` | Function | `src/lib/dateUtils.ts` | 2 |
| `formatRelativeOrDateAU` | Function | `src/lib/dateUtils.ts` | 66 |
| `JobCompletionForm` | Function | `src/pages/JobCompletionForm.tsx` | 36 |
| `renderSection` | Function | `src/pages/JobCompletionForm.tsx` | 227 |
| `useLeadsNeedsAttention` | Function | `src/hooks/useLeadsNeedsAttention.ts` | 32 |
| `fetchLeads` | Function | `src/hooks/useLeadsNeedsAttention.ts` | 38 |
| `JobCompletionSummary` | Function | `src/components/leads/JobCompletionSummary.tsx` | 173 |
| `NeedsAttentionList` | Function | `src/components/admin/NeedsAttentionList.tsx` | 18 |
| `calculatePropertyZone` | Function | `src/lib/leadUtils.ts` | 37 |
| `saveValidatedAddress` | Function | `src/components/schedule/LeadBookingCard.tsx` | 248 |
| `handleConfirmNewAddress` | Function | `src/components/schedule/LeadBookingCard.tsx` | 281 |
| `checkForDuplicates` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 256 |
| `logAuditEntry` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 283 |
| `validateForm` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 301 |
| `handleSubmit` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 361 |
| `addEmailTools` | Function | `mcp-send-email/tools/emails.ts` | 5 |
| `updateInspectionField` | Function | `src/lib/api/pdfGeneration.ts` | 129 |
| `validate` | Function | `src/components/pdf/EditFieldModal.tsx` | 93 |
| `handleSave` | Function | `src/components/pdf/EditFieldModal.tsx` | 140 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleBookInspection → FormatDateAU` | cross_community | 6 |
| `HandleSubmit → GetItem` | cross_community | 5 |
| `JobCompletionForm → CaptureBusinessError` | cross_community | 5 |
| `JobCompletionForm → AddBusinessBreadcrumb` | cross_community | 5 |
| `JobCompletionForm → GenerateJobNumber` | cross_community | 5 |
| `JobCompletionForm → Dispatch` | cross_community | 5 |
| `JobCompletionForm → GetItem` | cross_community | 5 |
| `HandleSubmit → GetStorage` | cross_community | 4 |
| `HandleSubmit → RemoveItem` | cross_community | 4 |
| `TechnicianJobs → FormatDateAU` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 8 calls |
| Services | 4 calls |
| Pages | 4 calls |
| Hooks | 3 calls |
| Supabase | 2 calls |
| Tools | 1 calls |
| Dashboard | 1 calls |
| Schedule | 1 calls |

## How to Explore

1. `gitnexus_context({name: "formatTimeAgo"})` — see callers and callees
2. `gitnexus_query({query: "leads"})` — find related execution flows
3. Read key files listed above for implementation details
