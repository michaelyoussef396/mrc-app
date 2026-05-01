---
name: pages
description: "Skill for the Pages area of mrc-app. 242 symbols across 47 files."
---

# Pages

242 symbols | 47 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how createSession, endSession, endSessionById work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/ViewReportPDF.tsx` | prefillEmailAndOpenStage, handleApprove, handlePage1FieldSave, handleJobFieldSave, handleJobPhotoUpload (+33) |
| `src/pages/TechnicianInspectionForm.tsx` | invokeEdgeFunction, buildAIPayload, handleRemoveArea, handleSave, mapInfraredToBooleans (+26) |
| `src/pages/LeadsManagement.tsx` | updateLeadStatus, loadMoreLeads, confirmArchive, handleApproveJobReport, handleNotProceeding (+9) |
| `src/pages/LeadDetail.tsx` | handleFinish, saveAddress, handleSaveNote, formatDate, formatTime (+9) |
| `src/pages/TechnicianJobs.tsx` | isRemediationJob, TechnicianJobs, handleCall, handleDirections, handleStartJob (+6) |
| `src/pages/InspectionAIReview.tsx` | handleSave, handleApprove, handleReject, invokeEdgeFunction, InspectionAIReview (+4) |
| `src/components/leads/InvoicePaymentCard.tsx` | defaultDueDate, loadLeadCustomer, handleCreate, handleEdit, handleMarkSent (+4) |
| `src/pages/ForgotPassword.tsx` | getResetAttempts, recordResetAttempt, isRateLimited, getRemainingLockoutTime, ForgotPassword (+4) |
| `src/services/sessionService.ts` | createSession, endSession, endSessionById, forceLogoutAllDevices, removeDevice (+3) |
| `src/pages/Profile.tsx` | resizeAvatarToJpeg, handleSave, handleAvatarChange, handleLogoutAllDevices, handleSignOut (+3) |

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
| `prefillEmailAndOpenStage` | Function | `src/pages/ViewReportPDF.tsx` | 309 |
| `handleApprove` | Function | `src/pages/ViewReportPDF.tsx` | 788 |
| `handlePage1FieldSave` | Function | `src/pages/ViewReportPDF.tsx` | 1904 |
| `handleRemoveArea` | Function | `src/pages/TechnicianInspectionForm.tsx` | 2867 |
| `handleSave` | Function | `src/pages/TechnicianInspectionForm.tsx` | 3217 |
| `mapInfraredToBooleans` | Function | `src/pages/TechnicianInspectionForm.tsx` | 3358 |
| `validateForm` | Function | `src/pages/TechnicianInspectionForm.tsx` | 3640 |
| `handlePrevious` | Function | `src/pages/TechnicianInspectionForm.tsx` | 3654 |
| `handleNext` | Function | `src/pages/TechnicianInspectionForm.tsx` | 3661 |
| `handleSave` | Function | `src/pages/Profile.tsx` | 212 |

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
| Api | 24 calls |
| Hooks | 14 calls |
| Leads | 9 calls |
| Tools | 5 calls |
| Technician | 3 calls |
| Dashboard | 3 calls |
| Schedule | 1 calls |
| Calculations | 1 calls |

## How to Explore

1. `gitnexus_context({name: "createSession"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
