---
name: pages
description: "Skill for the Pages area of mrc-app. 296 symbols across 62 files."
---

# Pages

296 symbols | 62 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how QuarantinedPhotosBanner, InvoicePaymentCard, EditFieldModal work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/TechnicianInspectionForm.tsx` | formatDate, Header, FormField, ReadOnlyInput, ToggleSwitch (+56) |
| `src/pages/ViewReportPDF.tsx` | JobReportPreview, fetchHtml, ViewReportPDF, getJobFieldValue, openJobFieldEdit (+26) |
| `src/pages/AdminInvoiceHelper.tsx` | todayISO, RefChip, AdminInvoiceHelper, updateEquipment, removeCustomItem (+18) |
| `src/pages/LeadsManagement.tsx` | reactivate, markClosed, handleApproveReport, confirmRemoveLead, updateLeadStatus (+15) |
| `src/pages/TechnicianJobs.tsx` | handleStartJob, JobsHeader, EmptyState, LoadingState, ErrorState (+9) |
| `src/pages/LeadDetail.tsx` | getInitials, EnquiryPhotos, LeadDetail, saveField, handleCopy (+8) |
| `src/pages/ForgotPassword.tsx` | getResetAttempts, recordResetAttempt, isRateLimited, getRemainingLockoutTime, ForgotPassword (+4) |
| `src/pages/InspectionAIReview.tsx` | invokeEdgeFunction, reconstructInfraredObservations, InspectionAIReview, loadData, handleRegenerateAll (+4) |
| `src/pages/Login.tsx` | Login, handleEmailChange, handlePasswordChange, getErrorMessage, validateForm (+2) |
| `src/pages/AdminTechnicianDetail.tsx` | ProfileHeaderSkeleton, StatsGridSkeleton, WorkloadSkeleton, ErrorState, NotFoundState (+1) |

## Entry Points

Start here when exploring this area:

- **`QuarantinedPhotosBanner`** (Function) — `src/components/QuarantinedPhotosBanner.tsx:25`
- **`InvoicePaymentCard`** (Function) — `src/components/leads/InvoicePaymentCard.tsx:54`
- **`EditFieldModal`** (Function) — `src/components/pdf/EditFieldModal.tsx:56`
- **`renderInput`** (Function) — `src/components/pdf/EditFieldModal.tsx:183`
- **`ImageUploadModal`** (Function) — `src/components/pdf/ImageUploadModal.tsx:40`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `QuarantinedPhotosBanner` | Function | `src/components/QuarantinedPhotosBanner.tsx` | 25 |
| `InvoicePaymentCard` | Function | `src/components/leads/InvoicePaymentCard.tsx` | 54 |
| `EditFieldModal` | Function | `src/components/pdf/EditFieldModal.tsx` | 56 |
| `renderInput` | Function | `src/components/pdf/EditFieldModal.tsx` | 183 |
| `ImageUploadModal` | Function | `src/components/pdf/ImageUploadModal.tsx` | 40 |
| `StalePdfBanner` | Function | `src/components/pdf/StalePdfBanner.tsx` | 16 |
| `fetchStaleness` | Function | `src/components/pdf/StalePdfBanner.tsx` | 22 |
| `AreaPhotoSlotGrid` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 67 |
| `handleAddUpload` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 126 |
| `OutdoorPhotoSlotGrid` | Function | `src/components/photos/OutdoorPhotoSlotGrid.tsx` | 31 |
| `PhotoCaptionPromptDialog` | Function | `src/components/photos/PhotoCaptionPromptDialog.tsx` | 43 |
| `PhotoCollectionEditor` | Function | `src/components/photos/PhotoCollectionEditor.tsx` | 74 |
| `PhotoPickerDialog` | Function | `src/components/photos/PhotoPickerDialog.tsx` | 30 |
| `SubfloorPhotoSlotGrid` | Function | `src/components/photos/SubfloorPhotoSlotGrid.tsx` | 31 |
| `getPhotoSignedUrl` | Function | `src/lib/utils/photoUpload.ts` | 275 |
| `loadInspectionPhotos` | Function | `src/lib/utils/photoUpload.ts` | 472 |
| `loadOutdoorPhotos` | Function | `src/lib/utils/photoUpload.ts` | 568 |
| `AdminInvoiceHelper` | Function | `src/pages/AdminInvoiceHelper.tsx` | 161 |
| `updateEquipment` | Function | `src/pages/AdminInvoiceHelper.tsx` | 366 |
| `removeCustomItem` | Function | `src/pages/AdminInvoiceHelper.tsx` | 388 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleConfirmSent → Round2` | cross_community | 6 |
| `HandleSaveDraft → Round2` | cross_community | 6 |
| `HandleSaveDraft → InterpolateCost` | cross_community | 6 |
| `HandleConfirmPaid → BuildLeadDetailPath` | cross_community | 6 |
| `HandleNext → Round2` | cross_community | 5 |
| `HandleNext → InterpolateCost` | cross_community | 5 |
| `LeadsManagement → ToSearchWords` | cross_community | 5 |
| `LeadsManagement → EscapeIlike` | cross_community | 5 |
| `AdminInvoiceHelper → MelbourneDateISO` | cross_community | 5 |
| `HandleConfirmSent → CalculateDays` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Ui | 36 calls |
| Api | 26 calls |
| Leads | 19 calls |
| Admin | 11 calls |
| Hooks | 8 calls |
| Pdf | 7 calls |
| Job-completion | 6 calls |
| Booking | 6 calls |

## How to Explore

1. `context({name: "QuarantinedPhotosBanner"})` — see callers and callees
2. `query({search_query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
