---
name: pdf
description: "Skill for the Pdf area of mrc-app. 34 symbols across 10 files."
---

# Pdf

34 symbols | 10 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how ReportPreviewHTML, fetchHTML, startP1Edit work
- Modifying pdf-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/pdf/ReportPreviewHTML.tsx` | ReportPreviewHTML, fetchHTML, startP1Edit, startVPEdit, startOutdoorEdit (+12) |
| `src/components/pdf/ReportVersionHistory.tsx` | formatMelbourne, generationLabel, ReportVersionHistory, fetch, VersionCard |
| `src/lib/utils/photoUpload.ts` | PhotoCaptionRequiredError, validatePhotoCaption, queuePhotoOffline |
| `src/components/pdf/ImageUploadModal.tsx` | handleUpload, mapFieldKeyToPhotoType |
| `src/components/pdf/EditFieldModal.tsx` | validate, handleSave |
| `src/components/booking/SmartBookingSlots.tsx` | SlotButton |
| `src/components/leads/InvoicePaymentCard.tsx` | statusBadge |
| `src/components/ui/badge.tsx` | Badge |
| `src/lib/offline/SyncManager.ts` | queuePhoto |
| `src/lib/api/pdfGeneration.ts` | updateInspectionField |

## Entry Points

Start here when exploring this area:

- **`ReportPreviewHTML`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:197`
- **`fetchHTML`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:278`
- **`startP1Edit`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:546`
- **`startVPEdit`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:598`
- **`startOutdoorEdit`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:681`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PhotoCaptionRequiredError` | Class | `src/lib/utils/photoUpload.ts` | 28 |
| `ReportPreviewHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 197 |
| `fetchHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 278 |
| `startP1Edit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 546 |
| `startVPEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 598 |
| `startOutdoorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 681 |
| `startSubfloorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 709 |
| `startCostEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 765 |
| `recalcTotals` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 779 |
| `updateCostField` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 798 |
| `toggleTreatmentMethod` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 802 |
| `setOptionSelected` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 811 |
| `ReportVersionHistory` | Function | `src/components/pdf/ReportVersionHistory.tsx` | 58 |
| `fetch` | Function | `src/components/pdf/ReportVersionHistory.tsx` | 66 |
| `handleUpload` | Function | `src/components/pdf/ImageUploadModal.tsx` | 80 |
| `mapFieldKeyToPhotoType` | Function | `src/components/pdf/ImageUploadModal.tsx` | 160 |
| `validatePhotoCaption` | Function | `src/lib/utils/photoUpload.ts` | 40 |
| `queuePhotoOffline` | Function | `src/lib/utils/photoUpload.ts` | 50 |
| `validate` | Function | `src/components/pdf/EditFieldModal.tsx` | 93 |
| `handleSave` | Function | `src/components/pdf/EditFieldModal.tsx` | 140 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFileChange → PhotoCaptionRequiredError` | cross_community | 5 |
| `HandlePhotoInputChange → PhotoCaptionRequiredError` | cross_community | 4 |
| `HandlePhotoUpload → PhotoCaptionRequiredError` | cross_community | 4 |
| `InvoicePaymentCard → Cn` | cross_community | 4 |
| `Notifications → Cn` | cross_community | 4 |
| `ReportVersionHistory → Cn` | cross_community | 4 |
| `HandleFileSelected → PhotoCaptionRequiredError` | cross_community | 4 |
| `JobCompletionSummary → Cn` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 4 calls |
| Ui | 2 calls |
| Photos | 1 calls |
| Api | 1 calls |

## How to Explore

1. `context({name: "ReportPreviewHTML"})` — see callers and callees
2. `query({search_query: "pdf"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
