---
name: api
description: "Skill for the Api area of mrc-app. 75 symbols across 18 files."
---

# Api

75 symbols | 18 files | Cohesion: 65%

## When to Use

- Working with code in `src/`
- Understanding how captureBusinessError, addBusinessBreadcrumb, formatMediumDateAU work
- Modifying api-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/api/notifications.ts` | buildBookingConfirmationHtml, sendSlackNotification, notifyPaymentReceived, notifyInvoiceOverdue, notifyInvoiceSent (+8) |
| `src/lib/api/invoices.ts` | getInvoiceById, markInvoicePaid, markInvoiceOverdue, calculateInvoiceTotals, round2 (+6) |
| `src/lib/api/inspections.ts` | saveInspectionArea, getInspection, loadInspectionAreas, getInspectionByLeadId, sanitizeEnumValue (+5) |
| `src/lib/api/jobCompletions.ts` | generateJobNumber, createJobCompletion, submitJobCompletion, getJobCompletionByLeadId, getJobCompletionById (+2) |
| `src/pages/AdminInvoiceHelper.tsx` | AdminInvoiceHelper, load, addLineItem, removeLineItem, handleSaveDraft (+1) |
| `src/lib/bookingService.ts` | bookInspection, sendBookingConfirmationEmail, formatDateForDisplay, formatTimeForDisplay |
| `src/pages/LeadDetail.tsx` | handleSendBackToTechnician, handleDelete, handleRegeneratePDF, handleSend |
| `src/hooks/useNotifications.ts` | useMarkAsRead, useMarkAsUnread, useDeleteNotification |
| `src/lib/api/apiClient.ts` | translateError, supabaseMutation, logToErrorTable |
| `src/components/leads/JobCompletionEditSheet.tsx` | JobCompletionEditSheet, handleRequestClose, handleSave |

## Entry Points

Start here when exploring this area:

- **`captureBusinessError`** (Function) — `src/lib/sentry.ts:97`
- **`addBusinessBreadcrumb`** (Function) — `src/lib/sentry.ts:107`
- **`formatMediumDateAU`** (Function) — `src/lib/dateUtils.ts:54`
- **`bookInspection`** (Function) — `src/lib/bookingService.ts:79`
- **`formatDateForDisplay`** (Function) — `src/lib/bookingService.ts:317`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `captureBusinessError` | Function | `src/lib/sentry.ts` | 97 |
| `addBusinessBreadcrumb` | Function | `src/lib/sentry.ts` | 107 |
| `formatMediumDateAU` | Function | `src/lib/dateUtils.ts` | 54 |
| `bookInspection` | Function | `src/lib/bookingService.ts` | 79 |
| `formatDateForDisplay` | Function | `src/lib/bookingService.ts` | 317 |
| `formatTimeForDisplay` | Function | `src/lib/bookingService.ts` | 324 |
| `useMarkAsRead` | Function | `src/hooks/useNotifications.ts` | 126 |
| `useMarkAsUnread` | Function | `src/hooks/useNotifications.ts` | 152 |
| `useDeleteNotification` | Function | `src/hooks/useNotifications.ts` | 208 |
| `handleSendBackToTechnician` | Function | `src/pages/LeadDetail.tsx` | 515 |
| `handleDelete` | Function | `src/pages/LeadDetail.tsx` | 566 |
| `handleRegeneratePDF` | Function | `src/pages/LeadDetail.tsx` | 610 |
| `handleRegeneratePdf` | Function | `src/pages/InspectionAIReview.tsx` | 323 |
| `rowToFormData` | Function | `src/hooks/useJobCompletionForm.ts` | 24 |
| `init` | Function | `src/hooks/useJobCompletionForm.ts` | 153 |
| `generateInspectionPDF` | Function | `src/lib/api/pdfGeneration.ts` | 27 |
| `buildBookingConfirmationHtml` | Function | `src/lib/api/notifications.ts` | 188 |
| `sendSlackNotification` | Function | `src/lib/api/notifications.ts` | 402 |
| `notifyPaymentReceived` | Function | `src/lib/api/notifications.ts` | 484 |
| `notifyInvoiceOverdue` | Function | `src/lib/api/notifications.ts` | 503 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleBookInspection → FormatDateAU` | cross_community | 6 |
| `HandleBookInspection → FormatTimeAU` | cross_community | 6 |
| `JobCompletionForm → CaptureBusinessError` | cross_community | 5 |
| `JobCompletionForm → AddBusinessBreadcrumb` | cross_community | 5 |
| `JobCompletionForm → GenerateJobNumber` | cross_community | 5 |
| `JobCompletionForm → Dispatch` | cross_community | 5 |
| `InvoicePaymentCard → CaptureBusinessError` | cross_community | 5 |
| `InvoicePaymentCard → Dispatch` | cross_community | 5 |
| `InvoicePaymentCard → SendSlackNotification` | cross_community | 5 |
| `LeadCompleteBanner → CaptureBusinessError` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 22 calls |
| Leads | 3 calls |
| Cluster_142 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "captureBusinessError"})` — see callers and callees
2. `gitnexus_query({query: "api"})` — find related execution flows
3. Read key files listed above for implementation details
