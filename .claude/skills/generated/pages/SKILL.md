---
name: pages
description: "Skill for the Pages area of mrc-app. 244 symbols across 51 files."
---

# Pages

244 symbols | 51 files | Cohesion: 68%

## When to Use

- Working with code in `src/`
- Understanding how refetch, handleJobFieldSave, handleJobPhotoUpload work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/ViewReportPDF.tsx` | handleJobFieldSave, handleJobPhotoUpload, handleJobPhotoSwap, handleCostSave, saveAreaForm (+29) |
| `src/pages/TechnicianInspectionForm.tsx` | generateJobNumber, formatDate, TechnicianInspectionForm, handleRemoveArea, invokeEdgeFunction (+29) |
| `src/pages/LeadsManagement.tsx` | loadMoreLeads, confirmArchive, handleApproveJobReport, handleNotProceeding, handleViewHistory (+8) |
| `src/pages/LeadDetail.tsx` | formatCurrency, formatDate, formatTime, getInitials, LeadDetail (+7) |
| `src/pages/TechnicianJobs.tsx` | isRemediationJob, TechnicianJobs, handleCall, handleDirections, handleStartJob (+6) |
| `src/pages/InspectionAIReview.tsx` | handleSave, handleApprove, handleReject, invokeEdgeFunction, InspectionAIReview (+4) |
| `src/pages/ForgotPassword.tsx` | getResetAttempts, recordResetAttempt, isRateLimited, getRemainingLockoutTime, ForgotPassword (+4) |
| `src/lib/utils/photoUpload.ts` | uploadMultiplePhotos, deleteInspectionPhoto, getPhotoSignedUrl, PhotoCaptionRequiredError, validatePhotoCaption (+3) |
| `src/pages/Profile.tsx` | resizeAvatarToJpeg, handleSave, handleAvatarChange, handleLogoutAllDevices, handleSignOut (+3) |
| `src/components/leads/InvoicePaymentCard.tsx` | defaultDueDate, loadLeadCustomer, handleCreate, handleEdit, handleMarkSent (+2) |

## Entry Points

Start here when exploring this area:

- **`refetch`** (Function) — `src/hooks/useTechnicianAlerts.ts:223`
- **`handleJobFieldSave`** (Function) — `src/pages/ViewReportPDF.tsx:668`
- **`handleJobPhotoUpload`** (Function) — `src/pages/ViewReportPDF.tsx:763`
- **`handleJobPhotoSwap`** (Function) — `src/pages/ViewReportPDF.tsx:793`
- **`handleCostSave`** (Function) — `src/pages/ViewReportPDF.tsx:1618`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PhotoCaptionRequiredError` | Class | `src/lib/utils/photoUpload.ts` | 28 |
| `refetch` | Function | `src/hooks/useTechnicianAlerts.ts` | 223 |
| `handleJobFieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 668 |
| `handleJobPhotoUpload` | Function | `src/pages/ViewReportPDF.tsx` | 763 |
| `handleJobPhotoSwap` | Function | `src/pages/ViewReportPDF.tsx` | 793 |
| `handleCostSave` | Function | `src/pages/ViewReportPDF.tsx` | 1618 |
| `saveAreaForm` | Function | `src/pages/ViewReportPDF.tsx` | 1771 |
| `handleDeleteAreaPhoto` | Function | `src/pages/ViewReportPDF.tsx` | 1897 |
| `handleComplete` | Function | `src/pages/JobCompletionForm.tsx` | 128 |
| `uploadMultiplePhotos` | Function | `src/lib/utils/photoUpload.ts` | 209 |
| `deleteInspectionPhoto` | Function | `src/lib/utils/photoUpload.ts` | 294 |
| `recordPhotoHistory` | Function | `src/lib/utils/photoHistory.ts` | 47 |
| `voidInvoice` | Function | `src/lib/api/invoices.ts` | 341 |
| `handleCancelBooking` | Function | `src/components/schedule/EventDetailsPanel.tsx` | 44 |
| `handleFileChange` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 191 |
| `handleDelete` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 240 |
| `loadLeadCustomer` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 157 |
| `handleCreate` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 166 |
| `handleEdit` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 229 |
| `handleMarkSent` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 261 |

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
| `HandleSubmit → GetItem` | cross_community | 5 |
| `HandleApprove → Dispatch` | intra_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 27 calls |
| Api | 23 calls |
| Hooks | 16 calls |
| Leads | 8 calls |
| Tools | 7 calls |
| Technician | 3 calls |
| Dashboard | 3 calls |
| Schedule | 1 calls |

## How to Explore

1. `gitnexus_context({name: "refetch"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
