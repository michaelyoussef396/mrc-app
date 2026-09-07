---
name: api
description: "Skill for the Api area of mrc-app. 139 symbols across 32 files."
---

# Api

139 symbols | 32 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how handleMarkPaid, handleVoid, onError work
- Modifying api-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/api/notifications.ts` | wrapInBrandedTemplate, buildBookingConfirmationHtml, buildReportApprovedHtml, buildJobBookingConfirmationHtml, buildInspectionReminderHtml (+12) |
| `src/lib/api/invoices.ts` | getOutstandingInvoices, markInvoiceOverdue, voidInvoice, calculateInvoiceTotals, round2 (+8) |
| `src/lib/api/fieldEditLog.ts` | filterNoiseChanges, logFieldEdits, logSectionMilestone, normaliseEmpty, diffRows (+5) |
| `src/lib/api/inspections.ts` | createInspection, updateInspection, saveInspectionArea, saveCompleteInspection, getInspection (+4) |
| `api/render-pdf.ts` | allowedOrigin, readEnv, extractBearer, readBody, applyCors (+4) |
| `api/render-job-report-pdf.ts` | allowedOrigin, readEnv, extractBearer, readBody, applyCors (+4) |
| `src/lib/api/reportPipeline.ts` | HardSaveError, toHardSaveNetworkError, hardSaveReport, downloadBlobAs, checkSendMismatch (+3) |
| `src/lib/api/jobReportPipeline.ts` | HardSaveJobReportError, toJobReportNetworkError, hardSaveJobReport, downloadJobVersionPdfAsBase64, markJobVersionEmailed (+2) |
| `src/pages/LeadDetail.tsx` | handleSendBackToTechnician, handleDelete, handleRegeneratePDF, handleSend, mutationFn (+1) |
| `src/pages/ViewReportPDF.tsx` | handleDownload, performJobReportSend, handleJobMismatchChoice, performInspectionSend, handleMismatchChoice (+1) |

## Entry Points

Start here when exploring this area:

- **`handleMarkPaid`** (Function) — `src/components/leads/InvoicePaymentCard.tsx:154`
- **`handleVoid`** (Function) — `src/components/leads/InvoicePaymentCard.tsx:183`
- **`onError`** (Function) — `src/hooks/useNotifications.ts:134`
- **`queryFn`** (Function) — `src/components/leads/LeadNotesSection.tsx:64`
- **`handleCancelBooking`** (Function) — `src/components/schedule/EventDetailsPanel.tsx:44`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `HardSaveError` | Class | `src/lib/api/reportPipeline.ts` | 27 |
| `HardSaveJobReportError` | Class | `src/lib/api/jobReportPipeline.ts` | 35 |
| `LeadNoteError` | Class | `src/lib/api/leadNotes.ts` | 40 |
| `LeadSubmissionError` | Class | `src/lib/api/public-leads.ts` | 25 |
| `handleMarkPaid` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 154 |
| `handleVoid` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 183 |
| `onError` | Function | `src/hooks/useNotifications.ts` | 134 |
| `queryFn` | Function | `src/components/leads/LeadNotesSection.tsx` | 64 |
| `handleCancelBooking` | Function | `src/components/schedule/EventDetailsPanel.tsx` | 44 |
| `filterNoiseChanges` | Function | `src/lib/api/fieldEditLog.ts` | 23 |
| `logFieldEdits` | Function | `src/lib/api/fieldEditLog.ts` | 59 |
| `logSectionMilestone` | Function | `src/lib/api/fieldEditLog.ts` | 222 |
| `createInspection` | Function | `src/lib/api/inspections.ts` | 105 |
| `updateInspection` | Function | `src/lib/api/inspections.ts` | 131 |
| `saveInspectionArea` | Function | `src/lib/api/inspections.ts` | 186 |
| `saveCompleteInspection` | Function | `src/lib/api/inspections.ts` | 281 |
| `getOutstandingInvoices` | Function | `src/lib/api/invoices.ts` | 171 |
| `markInvoiceOverdue` | Function | `src/lib/api/invoices.ts` | 670 |
| `voidInvoice` | Function | `src/lib/api/invoices.ts` | 682 |
| `getJobCompletionById` | Function | `src/lib/api/jobCompletions.ts` | 342 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `TechnicianBottomNav → CaptureBusinessError` | cross_community | 8 |
| `JobCompletionForm → CaptureBusinessError` | cross_community | 6 |
| `HandleConfirmPaid → BuildLeadDetailPath` | cross_community | 6 |
| `AdminInvoiceHelper → MelbourneDateISO` | cross_community | 5 |
| `HandleConfirmSent → FanOutNotification` | cross_community | 5 |
| `HandleApproveJobCompletion → NormaliseEmpty` | cross_community | 5 |
| `HandleApproveJobCompletion → GetFieldLabel` | cross_community | 5 |
| `HandleApproveJobCompletion → FormatDiffValueForDescription` | cross_community | 5 |
| `HandleApproveJobCompletion → BuildLeadDetailPath` | cross_community | 5 |
| `HandleSendEmail → NormalizeHtmlForHash` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Dashboard | 2 calls |
| Leads | 1 calls |

## How to Explore

1. `context({name: "handleMarkPaid"})` — see callers and callees
2. `query({search_query: "api"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
