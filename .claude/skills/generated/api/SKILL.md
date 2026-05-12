---
name: api
description: "Skill for the Api area of mrc-app. 69 symbols across 20 files."
---

# Api

69 symbols | 20 files | Cohesion: 70%

## When to Use

- Working with code in `src/`
- Understanding how captureBusinessError, addBusinessBreadcrumb, formatMediumDateAU work
- Modifying api-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/api/notifications.ts` | buildBookingConfirmationHtml, sendSlackNotification, notifyInvoiceSent, notifyPaymentReceived, notifyInvoiceOverdue (+9) |
| `src/lib/api/inspections.ts` | getInspection, loadInspectionAreas, getInspectionByLeadId, sanitizeEnumValue, loadCompleteInspection (+4) |
| `src/lib/api/jobCompletions.ts` | generateJobNumber, createJobCompletion, submitJobCompletion, getJobCompletionByLeadId, getJobCompletionById (+2) |
| `src/lib/api/invoices.ts` | getInvoiceById, createInvoice, updateInvoice, markInvoiceSent, markInvoicePaid (+1) |
| `src/lib/bookingService.ts` | bookInspection, sendBookingConfirmationEmail, formatDateForDisplay, formatTimeForDisplay |
| `src/pages/LeadDetail.tsx` | handleSendBackToTechnician, handleRegeneratePDF, InvoiceSection, handleSend |
| `src/lib/utils/htmlToPdf.ts` | fetchAsBase64DataUrl, embedExternalResources, renderPageToCanvas, convertHtmlToPdf |
| `src/lib/api/apiClient.ts` | translateError, supabaseMutation, logToErrorTable |
| `src/components/leads/JobCompletionEditSheet.tsx` | JobCompletionEditSheet, handleRequestClose, handleSave |
| `src/lib/sentry.ts` | captureBusinessError, addBusinessBreadcrumb |

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
| `handleSendBackToTechnician` | Function | `src/pages/LeadDetail.tsx` | 515 |
| `handleRegeneratePDF` | Function | `src/pages/LeadDetail.tsx` | 610 |
| `handleRegeneratePdf` | Function | `src/pages/InspectionAIReview.tsx` | 434 |
| `handleSaveDraft` | Function | `src/pages/AdminInvoiceHelper.tsx` | 121 |
| `handleSendInvoice` | Function | `src/pages/AdminInvoiceHelper.tsx` | 168 |
| `usePaymentTracking` | Function | `src/hooks/usePaymentTracking.ts` | 14 |
| `useDeleteNotification` | Function | `src/hooks/useNotifications.ts` | 208 |
| `rowToFormData` | Function | `src/hooks/useJobCompletionForm.ts` | 24 |
| `init` | Function | `src/hooks/useJobCompletionForm.ts` | 153 |
| `generateInspectionPDF` | Function | `src/lib/api/pdfGeneration.ts` | 27 |
| `buildBookingConfirmationHtml` | Function | `src/lib/api/notifications.ts` | 188 |
| `sendSlackNotification` | Function | `src/lib/api/notifications.ts` | 402 |
| `notifyInvoiceSent` | Function | `src/lib/api/notifications.ts` | 466 |
| `notifyPaymentReceived` | Function | `src/lib/api/notifications.ts` | 484 |

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
| `HandleFileChange → CaptureBusinessError` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 11 calls |
| Services | 11 calls |
| Leads | 2 calls |

## How to Explore

1. `gitnexus_context({name: "captureBusinessError"})` — see callers and callees
2. `gitnexus_query({query: "api"})` — find related execution flows
3. Read key files listed above for implementation details
