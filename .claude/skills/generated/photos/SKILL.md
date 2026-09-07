---
name: photos
description: "Skill for the Photos area of mrc-app. 29 symbols across 11 files."
---

# Photos

29 symbols | 11 files | Cohesion: 77%

## When to Use

- Working with code in `src/`
- Understanding how handleFileChange, handleFileSelected, handleFileSelected work
- Modifying photos-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/photos/AreaPhotoSlotGrid.tsx` | handleFileSelected, handlePickExisting, photoForSlot, handleConfirmRemove, loadPool |
| `src/lib/utils/photoUpload.ts` | uploadInspectionPhoto, uploadMultiplePhotos, unplaceOutdoorPhoto, unplacePhoto, loadUnplacedPhotos |
| `src/components/photos/OutdoorPhotoSlotGrid.tsx` | handleFileSelected, handlePickExisting, handleConfirmRemove, loadPool |
| `src/components/photos/PhotoCollectionEditor.tsx` | buildMetadata, handleFileSelected, associationColumns, handlePickExisting |
| `src/components/photos/SubfloorPhotoSlotGrid.tsx` | handleFileSelected, handlePickExisting, handleConfirmRemove, loadPool |
| `src/components/photos/PhotoCaptionPromptDialog.tsx` | handleConfirm, handleKeyDown |
| `src/components/job-completion/Section4AfterPhotos.tsx` | handleFileChange |
| `src/lib/offline/photoResizer.ts` | resizePhoto |
| `src/pages/ViewReportPDF.tsx` | handlePhotoUpload |
| `src/components/job-completion/Section3BeforePhotos.tsx` | togglePhoto |

## Entry Points

Start here when exploring this area:

- **`handleFileChange`** (Function) — `src/components/job-completion/Section4AfterPhotos.tsx:195`
- **`handleFileSelected`** (Function) — `src/components/photos/AreaPhotoSlotGrid.tsx:140`
- **`handleFileSelected`** (Function) — `src/components/photos/OutdoorPhotoSlotGrid.tsx:71`
- **`handleFileSelected`** (Function) — `src/components/photos/PhotoCollectionEditor.tsx:130`
- **`handleFileSelected`** (Function) — `src/components/photos/SubfloorPhotoSlotGrid.tsx:73`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleFileChange` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 195 |
| `handleFileSelected` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 140 |
| `handleFileSelected` | Function | `src/components/photos/OutdoorPhotoSlotGrid.tsx` | 71 |
| `handleFileSelected` | Function | `src/components/photos/PhotoCollectionEditor.tsx` | 130 |
| `handleFileSelected` | Function | `src/components/photos/SubfloorPhotoSlotGrid.tsx` | 73 |
| `resizePhoto` | Function | `src/lib/offline/photoResizer.ts` | 7 |
| `uploadInspectionPhoto` | Function | `src/lib/utils/photoUpload.ts` | 81 |
| `uploadMultiplePhotos` | Function | `src/lib/utils/photoUpload.ts` | 227 |
| `handlePhotoUpload` | Function | `src/pages/ViewReportPDF.tsx` | 2144 |
| `togglePhoto` | Function | `src/components/job-completion/Section3BeforePhotos.tsx` | 205 |
| `handlePickExisting` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 166 |
| `handlePickExisting` | Function | `src/components/photos/OutdoorPhotoSlotGrid.tsx` | 96 |
| `handleConfirmRemove` | Function | `src/components/photos/OutdoorPhotoSlotGrid.tsx` | 131 |
| `handlePickExisting` | Function | `src/components/photos/PhotoCollectionEditor.tsx` | 150 |
| `handlePickExisting` | Function | `src/components/photos/SubfloorPhotoSlotGrid.tsx` | 99 |
| `recordPhotoHistory` | Function | `src/lib/utils/photoHistory.ts` | 47 |
| `unplaceOutdoorPhoto` | Function | `src/lib/utils/photoUpload.ts` | 428 |
| `photoForSlot` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 87 |
| `handleConfirmRemove` | Function | `src/components/photos/AreaPhotoSlotGrid.tsx` | 205 |
| `handleConfirmRemove` | Function | `src/components/photos/SubfloorPhotoSlotGrid.tsx` | 134 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `TechnicianBottomNav → CaptureBusinessError` | cross_community | 8 |
| `JobCompletionForm → CaptureBusinessError` | cross_community | 6 |
| `SectionRenderer → CaptureBusinessError` | cross_community | 5 |
| `HandleFileChange → PhotoCaptionRequiredError` | cross_community | 5 |
| `HandlePhotoInputChange → PhotoCaptionRequiredError` | cross_community | 4 |
| `HandlePhotoRemove → CaptureBusinessError` | cross_community | 4 |
| `HandlePhotoUpload → CaptureBusinessError` | cross_community | 4 |
| `HandlePhotoUpload → PhotoCaptionRequiredError` | cross_community | 4 |
| `HandleConfirmRemove → CaptureBusinessError` | cross_community | 4 |
| `HandleFileSelected → PhotoCaptionRequiredError` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Api | 3 calls |
| Pages | 2 calls |
| Pdf | 1 calls |

## How to Explore

1. `context({name: "handleFileChange"})` — see callers and callees
2. `query({search_query: "photos"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
