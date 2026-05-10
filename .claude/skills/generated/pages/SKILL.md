---
name: pages
description: "Skill for the Pages area of mrc-app. 239 symbols across 50 files."
---

# Pages

239 symbols | 50 files | Cohesion: 68%

## When to Use

- Working with code in `src/`
- Understanding how refetch, handleJobPhotoUpload, handleJobPhotoSwap work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/ViewReportPDF.tsx` | handleJobPhotoUpload, handleJobPhotoSwap, handleOutdoorFieldSave, handleSubfloorFieldSave, handleSubfloorReadingSave (+32) |
| `src/pages/TechnicianInspectionForm.tsx` | handleRemoveArea, openFilePicker, handlePhotoCapture, handleCaptionPromptConfirm, invokeEdgeFunction (+29) |
| `src/pages/LeadsManagement.tsx` | loadMoreLeads, confirmArchive, handleApproveJobReport, handleNotProceeding, handleViewHistory (+8) |
| `src/pages/LeadDetail.tsx` | saveAddress, handleSaveNote, formatDate, formatTime, getInitials (+8) |
| `src/pages/TechnicianJobs.tsx` | isRemediationJob, TechnicianJobs, handleCall, handleDirections, handleStartJob (+6) |
| `src/components/leads/InvoicePaymentCard.tsx` | defaultDueDate, loadLeadCustomer, handleCreate, handleEdit, handleMarkSent (+4) |
| `src/pages/InspectionAIReview.tsx` | handleSave, handleApprove, handleReject, invokeEdgeFunction, InspectionAIReview (+4) |
| `src/pages/ForgotPassword.tsx` | getResetAttempts, recordResetAttempt, isRateLimited, getRemainingLockoutTime, ForgotPassword (+4) |
| `src/pages/Profile.tsx` | resizeAvatarToJpeg, handleSave, handleAvatarChange, handleLogoutAllDevices, handleSignOut (+3) |
| `src/hooks/use-toast.ts` | genId, dispatch, toast, dismiss, addToRemoveQueue (+2) |

## Entry Points

Start here when exploring this area:

- **`refetch`** (Function) — `src/hooks/useTechnicianAlerts.ts:223`
- **`handleJobPhotoUpload`** (Function) — `src/pages/ViewReportPDF.tsx:761`
- **`handleJobPhotoSwap`** (Function) — `src/pages/ViewReportPDF.tsx:791`
- **`handleOutdoorFieldSave`** (Function) — `src/pages/ViewReportPDF.tsx:1534`
- **`handleSubfloorFieldSave`** (Function) — `src/pages/ViewReportPDF.tsx:1560`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `refetch` | Function | `src/hooks/useTechnicianAlerts.ts` | 223 |
| `handleJobPhotoUpload` | Function | `src/pages/ViewReportPDF.tsx` | 761 |
| `handleJobPhotoSwap` | Function | `src/pages/ViewReportPDF.tsx` | 791 |
| `handleOutdoorFieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 1534 |
| `handleSubfloorFieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 1560 |
| `handleSubfloorReadingSave` | Function | `src/pages/ViewReportPDF.tsx` | 1591 |
| `handleCostSave` | Function | `src/pages/ViewReportPDF.tsx` | 1613 |
| `saveAreaForm` | Function | `src/pages/ViewReportPDF.tsx` | 1762 |
| `handleDeleteAreaPhoto` | Function | `src/pages/ViewReportPDF.tsx` | 1884 |
| `handleComplete` | Function | `src/pages/JobCompletionForm.tsx` | 128 |
| `uploadMultiplePhotos` | Function | `src/lib/utils/photoUpload.ts` | 209 |
| `deleteInspectionPhoto` | Function | `src/lib/utils/photoUpload.ts` | 278 |
| `recordPhotoHistory` | Function | `src/lib/utils/photoHistory.ts` | 47 |
| `voidInvoice` | Function | `src/lib/api/invoices.ts` | 341 |
| `loadLeadCustomer` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 157 |
| `handleCreate` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 166 |
| `handleEdit` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 229 |
| `handleMarkSent` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 261 |
| `handleMarkPaid` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 272 |
| `handleVoid` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 302 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSubmit → GetItem` | cross_community | 6 |
| `HandleResendEmail → GetStorage` | cross_community | 6 |
| `HandleResendEmail → GetItem` | cross_community | 6 |
| `HandleBookInspection → FormatDateAU` | cross_community | 6 |
| `HandleBookInspection → FormatTimeAU` | cross_community | 6 |
| `HandleNext → InterpolateCost` | cross_community | 5 |
| `HandleNext → Set` | cross_community | 5 |
| `TechnicianJobDetail → Dispatch` | cross_community | 5 |
| `HandleApprove → Dispatch` | intra_community | 5 |
| `HandleSaveNotes → Dispatch` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 27 calls |
| Api | 20 calls |
| Tools | 12 calls |
| Hooks | 12 calls |
| Leads | 9 calls |
| Supabase | 6 calls |
| Technician | 3 calls |
| Dashboard | 3 calls |

## How to Explore

1. `gitnexus_context({name: "refetch"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
