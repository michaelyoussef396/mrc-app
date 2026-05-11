---
name: pdf
description: "Skill for the Pdf area of mrc-app. 20 symbols across 4 files."
---

# Pdf

20 symbols | 4 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how ReportPreviewHTML, fetchHTML, findHeadings work
- Modifying pdf-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/pdf/ReportPreviewHTML.tsx` | getPositionInContainer, ReportPreviewHTML, fetchHTML, findHeadings, startP1Edit (+9) |
| `src/components/pdf/StalePdfBanner.tsx` | StalePdfBanner, fetchStaleness |
| `src/components/pdf/ImageUploadModal.tsx` | handleUpload, mapFieldKeyToPhotoType |
| `src/components/pdf/EditFieldModal.tsx` | EditFieldModal, renderInput |

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
| `ReportPreviewHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 194 |
| `fetchHTML` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 275 |
| `findHeadings` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 342 |
| `startP1Edit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 538 |
| `startVPEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 590 |
| `startOutdoorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 673 |
| `startSubfloorEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 701 |
| `updateCostField` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 785 |
| `scrollToPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 501 |
| `goToPreviousPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 510 |
| `goToNextPage` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 516 |
| `StalePdfBanner` | Function | `src/components/pdf/StalePdfBanner.tsx` | 18 |
| `fetchStaleness` | Function | `src/components/pdf/StalePdfBanner.tsx` | 24 |
| `startCostEdit` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 757 |
| `recalcTotals` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 771 |
| `handleUpload` | Function | `src/components/pdf/ImageUploadModal.tsx` | 75 |
| `mapFieldKeyToPhotoType` | Function | `src/components/pdf/ImageUploadModal.tsx` | 145 |
| `EditFieldModal` | Function | `src/components/pdf/EditFieldModal.tsx` | 56 |
| `renderInput` | Function | `src/components/pdf/EditFieldModal.tsx` | 183 |
| `getPositionInContainer` | Function | `src/components/pdf/ReportPreviewHTML.tsx` | 90 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ReportPreviewHTML → GetPositionInContainer` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "ReportPreviewHTML"})` — see callers and callees
2. `gitnexus_query({query: "pdf"})` — find related execution flows
3. Read key files listed above for implementation details
