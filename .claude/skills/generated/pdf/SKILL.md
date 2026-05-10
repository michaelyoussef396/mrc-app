---
name: pdf
description: "Skill for the Pdf area of mrc-app. 24 symbols across 6 files."
---

# Pdf

24 symbols | 6 files | Cohesion: 96%

## When to Use

- Working with code in `src/`
- Understanding how ReportPreviewHTML, fetchHTML, findHeadings work
- Modifying pdf-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/pdf/ReportPreviewHTML.tsx` | getPositionInContainer, ReportPreviewHTML, fetchHTML, findHeadings, startP1Edit (+9) |
| `src/lib/utils/photoUpload.ts` | PhotoCaptionRequiredError, validatePhotoCaption, queuePhotoOffline |
| `src/components/pdf/ImageUploadModal.tsx` | handleUpload, mapFieldKeyToPhotoType |
| `src/components/pdf/StalePdfBanner.tsx` | StalePdfBanner, fetchStaleness |
| `src/components/pdf/EditFieldModal.tsx` | EditFieldModal, renderInput |
| `src/lib/offline/SyncManager.ts` | queuePhoto |

## Entry Points

Start here when exploring this area:

- **`ReportPreviewHTML`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:194`
- **`fetchHTML`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:275`
- **`findHeadings`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:342`
- **`startP1Edit`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:538`
- **`startVPEdit`** (Function) — `src/components/pdf/ReportPreviewHTML.tsx:590`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PhotoCaptionRequiredError` | Class | `src/lib/utils/photoUpload.ts` | 28 |
| `ReportPreviewHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 194 |
| `fetchHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 275 |
| `findHeadings` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 342 |
| `startP1Edit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 538 |
| `startVPEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 590 |
| `startOutdoorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 673 |
| `startSubfloorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 701 |
| `updateCostField` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 785 |
| `validatePhotoCaption` | Function | `src/lib/utils/photoUpload.ts` | 40 |
| `queuePhotoOffline` | Function | `src/lib/utils/photoUpload.ts` | 50 |
| `handleUpload` | Function | `src/components/pdf/ImageUploadModal.tsx` | 80 |
| `mapFieldKeyToPhotoType` | Function | `src/components/pdf/ImageUploadModal.tsx` | 160 |
| `scrollToPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 501 |
| `goToPreviousPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 510 |
| `goToNextPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 516 |
| `StalePdfBanner` | Function | `src/components/pdf/StalePdfBanner.tsx` | 16 |
| `fetchStaleness` | Function | `src/components/pdf/StalePdfBanner.tsx` | 22 |
| `startCostEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 757 |
| `recalcTotals` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 771 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFileChange → PhotoCaptionRequiredError` | cross_community | 5 |
| `HandlePhotoInputChange → PhotoCaptionRequiredError` | cross_community | 4 |
| `HandleUploadNewAreaPhoto → PhotoCaptionRequiredError` | cross_community | 4 |
| `HandlePhotoUpload → PhotoCaptionRequiredError` | cross_community | 4 |
| `ReportPreviewHTML → GetPositionInContainer` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ReportPreviewHTML"})` — see callers and callees
2. `gitnexus_query({query: "pdf"})` — find related execution flows
3. Read key files listed above for implementation details
