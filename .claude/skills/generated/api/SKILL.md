---
name: api
description: "Skill for the Api area of mrc-app. 64 symbols across 18 files."
---

# Api

64 symbols | 18 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how captureBusinessError, addBusinessBreadcrumb, handleSendBackToTechnician work
- Modifying api-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/api/notifications.ts` | sendSlackNotification, notifyInvoiceSent, notifyPaymentReceived, notifyInvoiceOverdue, wrapInBrandedTemplate (+9) |
| `src/lib/api/inspections.ts` | getInspection, loadInspectionAreas, getInspectionByLeadId, sanitizeEnumValue, loadCompleteInspection (+4) |
| `src/lib/api/jobCompletions.ts` | generateJobNumber, formDataToRow, createJobCompletion, updateJobCompletion, submitJobCompletion (+2) |
| `src/lib/api/invoices.ts` | getInvoiceById, createInvoice, updateInvoice, markInvoiceSent, markInvoicePaid (+1) |
| `src/lib/utils/htmlToPdf.ts` | fetchAsBase64DataUrl, embedExternalResources, renderPageToCanvas, convertHtmlToPdf |
| `src/pages/LeadDetail.tsx` | handleSendBackToTechnician, handleRegeneratePDF, handleSend |
| `src/hooks/useJobCompletionForm.ts` | rowToFormData, useJobCompletionForm, init |
| `src/lib/api/apiClient.ts` | translateError, supabaseMutation, logToErrorTable |
| `src/components/leads/JobCompletionEditSheet.tsx` | JobCompletionEditSheet, handleRequestClose, handleSave |
| `src/lib/sentry.ts` | captureBusinessError, addBusinessBreadcrumb |

## Entry Points

Start here when exploring this area:

- **`captureBusinessError`** (Function) — `src/lib/sentry.ts:97`
- **`addBusinessBreadcrumb`** (Function) — `src/lib/sentry.ts:107`
- **`handleSendBackToTechnician`** (Function) — `src/pages/LeadDetail.tsx:515`
- **`handleRegeneratePDF`** (Function) — `src/pages/LeadDetail.tsx:610`
- **`handleRegeneratePdf`** (Function) — `src/pages/InspectionAIReview.tsx:434`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `captureBusinessError` | Function | `src/lib/sentry.ts` | 97 |
| `addBusinessBreadcrumb` | Function | `src/lib/sentry.ts` | 107 |
| `handleSendBackToTechnician` | Function | `src/pages/LeadDetail.tsx` | 515 |
| `handleRegeneratePDF` | Function | `src/pages/LeadDetail.tsx` | 610 |
| `handleRegeneratePdf` | Function | `src/pages/InspectionAIReview.tsx` | 434 |
| `handleSaveDraft` | Function | `src/pages/AdminInvoiceHelper.tsx` | 121 |
| `handleSendInvoice` | Function | `src/pages/AdminInvoiceHelper.tsx` | 168 |
| `useDeleteNotification` | Function | `src/hooks/useNotifications.ts` | 208 |
| `rowToFormData` | Function | `src/hooks/useJobCompletionForm.ts` | 24 |
| `useJobCompletionForm` | Function | `src/hooks/useJobCompletionForm.ts` | 127 |
| `init` | Function | `src/hooks/useJobCompletionForm.ts` | 153 |
| `generateInspectionPDF` | Function | `src/lib/api/pdfGeneration.ts` | 27 |
| `sendSlackNotification` | Function | `src/lib/api/notifications.ts` | 402 |
| `notifyInvoiceSent` | Function | `src/lib/api/notifications.ts` | 466 |
| `notifyPaymentReceived` | Function | `src/lib/api/notifications.ts` | 484 |
| `notifyInvoiceOverdue` | Function | `src/lib/api/notifications.ts` | 503 |
| `createJobCompletion` | Function | `src/lib/api/jobCompletions.ts` | 92 |
| `updateJobCompletion` | Function | `src/lib/api/jobCompletions.ts` | 185 |
| `submitJobCompletion` | Function | `src/lib/api/jobCompletions.ts` | 214 |
| `getJobCompletionByLeadId` | Function | `src/lib/api/jobCompletions.ts` | 284 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `JobCompletionForm → CaptureBusinessError` | cross_community | 5 |
| `JobCompletionForm → AddBusinessBreadcrumb` | cross_community | 5 |
| `JobCompletionForm → GenerateJobNumber` | cross_community | 5 |
| `JobCompletionForm → Dispatch` | cross_community | 5 |
| `JobCompletionForm → GetItem` | cross_community | 5 |
| `InvoicePaymentCard → CaptureBusinessError` | cross_community | 5 |
| `InvoicePaymentCard → Dispatch` | cross_community | 5 |
| `InvoicePaymentCard → SendSlackNotification` | cross_community | 5 |
| `HandleFileChange → CaptureBusinessError` | cross_community | 5 |
| `LeadCompleteBanner → CaptureBusinessError` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 12 calls |
| Services | 10 calls |
| Supabase | 2 calls |
| Leads | 1 calls |

## How to Explore

1. `gitnexus_context({name: "captureBusinessError"})` — see callers and callees
2. `gitnexus_query({query: "api"})` — find related execution flows
3. Read key files listed above for implementation details
