---
name: calculations
description: "Skill for the Calculations area of mrc-app. 9 symbols across 2 files."
---

# Calculations

9 symbols | 2 files | Cohesion: 84%

## When to Use

- Working with code in `src/`
- Understanding how interpolateCost, calculateLabourCostWithBreakdown, calculateLabourCost work
- Modifying calculations-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/calculations/pricing.ts` | interpolateCost, calculateLabourCostWithBreakdown, calculateLabourCost, calculateDiscount, calculateDays (+3) |
| `src/pages/TechnicianInspectionForm.tsx` | Section9CostEstimate |

## Entry Points

Start here when exploring this area:

- **`interpolateCost`** (Function) — `src/lib/calculations/pricing.ts:62`
- **`calculateLabourCostWithBreakdown`** (Function) — `src/lib/calculations/pricing.ts:80`
- **`calculateLabourCost`** (Function) — `src/lib/calculations/pricing.ts:136`
- **`calculateDiscount`** (Function) — `src/lib/calculations/pricing.ts:166`
- **`calculateDays`** (Function) — `src/lib/calculations/pricing.ts:179`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `interpolateCost` | Function | `src/lib/calculations/pricing.ts` | 62 |
| `calculateLabourCostWithBreakdown` | Function | `src/lib/calculations/pricing.ts` | 80 |
| `calculateLabourCost` | Function | `src/lib/calculations/pricing.ts` | 136 |
| `calculateDiscount` | Function | `src/lib/calculations/pricing.ts` | 166 |
| `calculateDays` | Function | `src/lib/calculations/pricing.ts` | 179 |
| `getDiscountTierDescription` | Function | `src/lib/calculations/pricing.ts` | 187 |
| `calculateEquipmentCost` | Function | `src/lib/calculations/pricing.ts` | 218 |
| `calculateCostEstimate` | Function | `src/lib/calculations/pricing.ts` | 304 |
| `Section9CostEstimate` | Function | `src/pages/TechnicianInspectionForm.tsx` | 1879 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleNext → InterpolateCost` | cross_community | 5 |
| `HandlePrevious → InterpolateCost` | cross_community | 5 |
| `HandleNext → CalculateDays` | cross_community | 4 |
| `HandleNext → CalculateEquipmentCost` | cross_community | 4 |
| `HandleNext → CalculateDiscount` | cross_community | 4 |
| `Section9CostEstimate → InterpolateCost` | intra_community | 4 |
| `HandlePrevious → CalculateDays` | cross_community | 4 |
| `HandlePrevious → CalculateEquipmentCost` | cross_community | 4 |
| `HandlePrevious → CalculateDiscount` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Leads | 1 calls |
| Job-completion | 1 calls |

## How to Explore

1. `gitnexus_context({name: "interpolateCost"})` — see callers and callees
2. `gitnexus_query({query: "calculations"})` — find related execution flows
3. Read key files listed above for implementation details
