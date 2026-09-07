---
name: generate-inspection-pdf
description: "Skill for the Generate-inspection-pdf area of mrc-app. 38 symbols across 1 files."
---

# Generate-inspection-pdf

38 symbols | 1 files | Cohesion: 81%

## When to Use

- Working with code in `supabase/`
- Understanding how formatCurrency, formatDate, getValidValue work
- Modifying generate-inspection-pdf-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `supabase/functions/generate-inspection-pdf/index.ts` | formatCurrency, formatDate, getValidValue, generateScopeStepsHtml, getTreatmentMethods (+33) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatCurrency` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 182 |
| `formatDate` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 192 |
| `getValidValue` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 225 |
| `generateScopeStepsHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 322 |
| `getTreatmentMethods` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 338 |
| `getEquipmentList` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 353 |
| `markdownToHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 371 |
| `stripMarkdown` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 427 |
| `getPhotoUrl` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 953 |
| `parseProblemAnalysis` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 960 |
| `rebuildProblemAnalysisMarkdown` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1020 |
| `estimateSubfloorTextHeight` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1459 |
| `handleSubfloorPage` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1472 |
| `generateReportHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1603 |
| `escapeHtml` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 171 |
| `getMouldDescription` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 211 |
| `buildInfraredObservationsBlock` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1049 |
| `glyphAdvance` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1103 |
| `countHeadingLines` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1112 |
| `computeAreaHeadingLayout` | Function | `supabase/functions/generate-inspection-pdf/index.ts` | 1154 |

## How to Explore

1. `context({name: "formatCurrency"})` — see callers and callees
2. `query({search_query: "generate-inspection-pdf"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
