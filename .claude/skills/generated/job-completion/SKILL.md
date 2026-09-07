---
name: job-completion
description: "Skill for the Job-completion area of mrc-app. 46 symbols across 14 files."
---

# Job-completion

46 symbols | 14 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how Section10OfficeNotes, Section1OfficeInfo, Section3BeforePhotos work
- Modifying job-completion-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/job-completion/Section4AfterPhotos.tsx` | pointerDistance, PhotoLightbox, applyScale, toggleZoom, handlePointerDown (+8) |
| `src/components/job-completion/Section7Equipment.tsx` | Stepper, EquipmentCard, Section7Equipment, WasteCard, applyM3 (+1) |
| `src/components/job-completion/Section2Summary.tsx` | ToggleRow, Section2Summary, handleRemoveArea, formatDateDisplay, handleAddArea (+1) |
| `src/components/job-completion/Section3BeforePhotos.tsx` | Section3BeforePhotos, fetchInspectionPhotos, queryFn, groupPhotos, photoGroups |
| `src/components/job-completion/Section9JobNotes.tsx` | ToggleRow, ConditionalTextarea, Section9JobNotes |
| `src/components/job-completion/Section1OfficeInfo.tsx` | InfoRow, Section1OfficeInfo |
| `src/components/job-completion/Section8Variations.tsx` | VariationTextarea, Section8Variations |
| `src/components/leads/InvoiceSummaryCard.tsx` | buildClipboardText, handleCopySummary |
| `src/lib/calculations/pricing.ts` | formatCurrency, calculateWasteDisposalCost |
| `src/components/job-completion/Section10OfficeNotes.tsx` | Section10OfficeNotes |

## Entry Points

Start here when exploring this area:

- **`Section10OfficeNotes`** (Function) — `src/components/job-completion/Section10OfficeNotes.tsx:36`
- **`Section1OfficeInfo`** (Function) — `src/components/job-completion/Section1OfficeInfo.tsx:35`
- **`Section3BeforePhotos`** (Function) — `src/components/job-completion/Section3BeforePhotos.tsx:174`
- **`Section5TreatmentMethods`** (Function) — `src/components/job-completion/Section5TreatmentMethods.tsx:39`
- **`Section6ChemicalToggles`** (Function) — `src/components/job-completion/Section6ChemicalToggles.tsx:32`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Section10OfficeNotes` | Function | `src/components/job-completion/Section10OfficeNotes.tsx` | 36 |
| `Section1OfficeInfo` | Function | `src/components/job-completion/Section1OfficeInfo.tsx` | 35 |
| `Section3BeforePhotos` | Function | `src/components/job-completion/Section3BeforePhotos.tsx` | 174 |
| `Section5TreatmentMethods` | Function | `src/components/job-completion/Section5TreatmentMethods.tsx` | 39 |
| `Section6ChemicalToggles` | Function | `src/components/job-completion/Section6ChemicalToggles.tsx` | 32 |
| `Section8Variations` | Function | `src/components/job-completion/Section8Variations.tsx` | 63 |
| `Section9JobNotes` | Function | `src/components/job-completion/Section9JobNotes.tsx` | 103 |
| `renderSection` | Function | `src/pages/JobCompletionForm.tsx` | 248 |
| `Section7Equipment` | Function | `src/components/job-completion/Section7Equipment.tsx` | 400 |
| `handleCopySummary` | Function | `src/components/leads/InvoiceSummaryCard.tsx` | 115 |
| `formatCurrency` | Function | `src/lib/calculations/pricing.ts` | 477 |
| `Section2Summary` | Function | `src/components/job-completion/Section2Summary.tsx` | 64 |
| `handleRemoveArea` | Function | `src/components/job-completion/Section2Summary.tsx` | 78 |
| `formatDateDisplay` | Function | `src/components/job-completion/Section2Summary.tsx` | 89 |
| `Section4AfterPhotos` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 94 |
| `triggerUpload` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 160 |
| `calculateWasteDisposalCost` | Function | `src/lib/calculations/pricing.ts` | 283 |
| `queryFn` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 134 |
| `handleAddArea` | Function | `src/components/job-completion/Section2Summary.tsx` | 68 |
| `handleAreaInputKeyDown` | Function | `src/components/job-completion/Section2Summary.tsx` | 82 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `JobCompletionForm → CaptureBusinessError` | cross_community | 6 |
| `RenderSection → Cn` | cross_community | 5 |
| `JobCompletionForm → FormatDateAU` | cross_community | 5 |
| `Section6WasteDisposal → Round2` | cross_community | 5 |
| `SectionRenderer → CaptureBusinessError` | cross_community | 5 |
| `SectionRenderer → Cn` | cross_community | 5 |
| `Section4AfterPhotos → Cn` | cross_community | 5 |
| `JobCompletionForm → InfoRow` | cross_community | 4 |
| `JobCompletionForm → ToggleRow` | cross_community | 4 |
| `JobCompletionForm → HandleRemoveArea` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 4 calls |
| Leads | 2 calls |
| Photos | 1 calls |

## How to Explore

1. `context({name: "Section10OfficeNotes"})` — see callers and callees
2. `query({search_query: "job-completion"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
