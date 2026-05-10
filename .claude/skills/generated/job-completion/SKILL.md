---
name: job-completion
description: "Skill for the Job-completion area of mrc-app. 40 symbols across 13 files."
---

# Job-completion

40 symbols | 13 files | Cohesion: 94%

## When to Use

- Working with code in `src/`
- Understanding how onChange, PeriodFilter, Section9JobNotes work
- Modifying job-completion-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/pages/TechnicianInspectionForm.tsx` | ToggleSwitch, SelectInput, NumberInput, Section1BasicInfo, Section2PropertyDetails (+7) |
| `src/components/job-completion/Section7Equipment.tsx` | Stepper, decrement, increment, formatCurrency, EquipmentCard (+1) |
| `src/components/job-completion/Section2Summary.tsx` | Section2Summary, handleAddArea, handleRemoveArea, handleAreaInputKeyDown, formatDateDisplay |
| `src/components/job-completion/Section4AfterPhotos.tsx` | fetchInspectionId, fetchJobCompletionPhotos, fetchBeforePhotoCount, Section4AfterPhotos, triggerUpload |
| `src/components/job-completion/Section9JobNotes.tsx` | ToggleRow, ConditionalTextarea, Section9JobNotes |
| `src/components/job-completion/Section8Variations.tsx` | VariationTextarea, Section8Variations |
| `src/pages/InspectionAIReview.tsx` | SectionCard |
| `src/hooks/use-mobile.tsx` | onChange |
| `src/components/reports/PeriodFilter.tsx` | PeriodFilter |
| `src/components/job-completion/Section6ChemicalToggles.tsx` | Section6ChemicalToggles |

## Entry Points

Start here when exploring this area:

- **`onChange`** (Function) — `src/hooks/use-mobile.tsx:9`
- **`PeriodFilter`** (Function) — `src/components/reports/PeriodFilter.tsx:19`
- **`Section9JobNotes`** (Function) — `src/components/job-completion/Section9JobNotes.tsx:103`
- **`Section8Variations`** (Function) — `src/components/job-completion/Section8Variations.tsx:65`
- **`Section6ChemicalToggles`** (Function) — `src/components/job-completion/Section6ChemicalToggles.tsx:32`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `onChange` | Function | `src/hooks/use-mobile.tsx` | 9 |
| `PeriodFilter` | Function | `src/components/reports/PeriodFilter.tsx` | 19 |
| `Section9JobNotes` | Function | `src/components/job-completion/Section9JobNotes.tsx` | 103 |
| `Section8Variations` | Function | `src/components/job-completion/Section8Variations.tsx` | 65 |
| `Section6ChemicalToggles` | Function | `src/components/job-completion/Section6ChemicalToggles.tsx` | 32 |
| `Section5TreatmentMethods` | Function | `src/components/job-completion/Section5TreatmentMethods.tsx` | 39 |
| `Section2Summary` | Function | `src/components/job-completion/Section2Summary.tsx` | 64 |
| `handleAddArea` | Function | `src/components/job-completion/Section2Summary.tsx` | 68 |
| `handleRemoveArea` | Function | `src/components/job-completion/Section2Summary.tsx` | 78 |
| `handleAreaInputKeyDown` | Function | `src/components/job-completion/Section2Summary.tsx` | 82 |
| `formatDateDisplay` | Function | `src/components/job-completion/Section2Summary.tsx` | 89 |
| `Section1OfficeInfo` | Function | `src/components/job-completion/Section1OfficeInfo.tsx` | 35 |
| `Section10OfficeNotes` | Function | `src/components/job-completion/Section10OfficeNotes.tsx` | 36 |
| `Section4AfterPhotos` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 87 |
| `triggerUpload` | Function | `src/components/job-completion/Section4AfterPhotos.tsx` | 152 |
| `Section7Equipment` | Function | `src/components/job-completion/Section7Equipment.tsx` | 171 |
| `ToggleSwitch` | Function | `src/pages/TechnicianInspectionForm.tsx` | 496 |
| `SelectInput` | Function | `src/pages/TechnicianInspectionForm.tsx` | 523 |
| `NumberInput` | Function | `src/pages/TechnicianInspectionForm.tsx` | 551 |
| `Section1BasicInfo` | Function | `src/pages/TechnicianInspectionForm.tsx` | 734 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Leads | 1 calls |

## How to Explore

1. `gitnexus_context({name: "onChange"})` — see callers and callees
2. `gitnexus_query({query: "job-completion"})` — find related execution flows
3. Read key files listed above for implementation details
