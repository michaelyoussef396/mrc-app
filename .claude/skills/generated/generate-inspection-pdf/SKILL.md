---
name: generate-inspection-pdf
description: "Skill for the Generate-inspection-pdf area of mrc-app. 31 symbols across 1 files."
---

# Generate-inspection-pdf

31 symbols | 1 files | Cohesion: 79%

## When to Use

- Working with code in `supabase/`
- Understanding how escapeHtml, formatCurrency, formatDate work
- Modifying generate-inspection-pdf-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `supabase/functions/generate-inspection-pdf/index.ts` | escapeHtml, formatCurrency, formatDate, getValidValue, generateScopeStepsHtml (+26) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `escapeHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 168 |
| `formatCurrency` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 179 |
| `formatDate` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 189 |
| `getValidValue` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 230 |
| `generateScopeStepsHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 316 |
| `getTreatmentMethods` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 331 |
| `getEquipmentList` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 346 |
| `markdownToHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 361 |
| `stripMarkdown` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 417 |
| `getPhotoUrl` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 961 |
| `parseProblemAnalysis` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 968 |
| `rebuildProblemAnalysisMarkdown` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1028 |
| `duplicateAreaPages` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1056 |
| `estimateSubfloorTextHeight` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1144 |
| `handleSubfloorPage` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1157 |
| `generateReportHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1288 |
| `stripHtmlTags` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 442 |
| `estimateBlockHeight` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 449 |
| `splitParagraphAtHeight` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 504 |
| `fillPage` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 562 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GenerateReportHtml → Set` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Tools | 1 calls |

## How to Explore

1. `gitnexus_context({name: "escapeHtml"})` — see callers and callees
2. `gitnexus_query({query: "generate-inspection-pdf"})` — find related execution flows
3. Read key files listed above for implementation details
