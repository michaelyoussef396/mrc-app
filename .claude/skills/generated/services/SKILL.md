---
name: services
description: "Skill for the Services area of mrc-app. 27 symbols across 12 files."
---

# Services

27 symbols | 12 files | Cohesion: 47%

## When to Use

- Working with code in `src/`
- Understanding how createSession, endSession, endSessionById work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/services/sessionService.ts` | createSession, endSession, endSessionById, forceLogoutAllDevices, removeDevice (+3) |
| `src/services/loginActivityService.ts` | logLoginActivity, handleDeviceTracking, checkForMultipleFailures, reviewSuspiciousActivity |
| `src/pages/ViewReportPDF.tsx` | prefillEmailAndOpenStage, handleJobFieldSave, handleApprove, handlePage1FieldSave |
| `src/pages/LeadDetail.tsx` | handleDelete, handleFinish |
| `src/hooks/useNotifications.ts` | useMarkAsRead, useMarkAsUnread |
| `src/hooks/use-toast.ts` | update |
| `supabase/functions/receive-framer-lead/index.ts` | updateSubmission |
| `supabase/functions/generate-inspection-summary/index.ts` | persistVersionRow |
| `src/lib/api/pdfGeneration.ts` | approvePDF |
| `src/lib/api/invoices.ts` | markInvoiceOverdue |

## Entry Points

Start here when exploring this area:

- **`createSession`** (Function) — `src/services/sessionService.ts:44`
- **`endSession`** (Function) — `src/services/sessionService.ts:97`
- **`endSessionById`** (Function) — `src/services/sessionService.ts:128`
- **`forceLogoutAllDevices`** (Function) — `src/services/sessionService.ts:159`
- **`removeDevice`** (Function) — `src/services/sessionService.ts:253`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createSession` | Function | `src/services/sessionService.ts` | 44 |
| `endSession` | Function | `src/services/sessionService.ts` | 97 |
| `endSessionById` | Function | `src/services/sessionService.ts` | 128 |
| `forceLogoutAllDevices` | Function | `src/services/sessionService.ts` | 159 |
| `removeDevice` | Function | `src/services/sessionService.ts` | 253 |
| `trustDevice` | Function | `src/services/sessionService.ts` | 291 |
| `untrustDevice` | Function | `src/services/sessionService.ts` | 317 |
| `updateSessionActivity` | Function | `src/services/sessionService.ts` | 343 |
| `logLoginActivity` | Function | `src/services/loginActivityService.ts` | 43 |
| `reviewSuspiciousActivity` | Function | `src/services/loginActivityService.ts` | 382 |
| `prefillEmailAndOpenStage` | Function | `src/pages/ViewReportPDF.tsx` | 310 |
| `handleJobFieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 667 |
| `handleApprove` | Function | `src/pages/ViewReportPDF.tsx` | 835 |
| `handlePage1FieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 2050 |
| `handleDelete` | Function | `src/pages/LeadDetail.tsx` | 566 |
| `useMarkAsRead` | Function | `src/hooks/useNotifications.ts` | 126 |
| `useMarkAsUnread` | Function | `src/hooks/useNotifications.ts` | 152 |
| `approvePDF` | Function | `src/lib/api/pdfGeneration.ts` | 240 |
| `markInvoiceOverdue` | Function | `src/lib/api/invoices.ts` | 329 |
| `saveInspectionArea` | Function | `src/lib/api/inspections.ts` | 225 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `JobCompletionForm → Dispatch` | cross_community | 5 |
| `InvoicePaymentCard → Dispatch` | cross_community | 5 |
| `LeadCompleteBanner → Dispatch` | cross_community | 5 |
| `HandleBookInspection → Dispatch` | cross_community | 5 |
| `HandleNext → Dispatch` | cross_community | 4 |
| `HandleApprove → Dispatch` | cross_community | 4 |
| `HandleSendInvoice → Dispatch` | cross_community | 4 |
| `HandleSaveNote → Dispatch` | cross_community | 4 |
| `HandleSaveDraft → Dispatch` | cross_community | 4 |
| `HandleStartTracking → Dispatch` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 6 calls |
| Pages | 5 calls |

## How to Explore

1. `gitnexus_context({name: "createSession"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
