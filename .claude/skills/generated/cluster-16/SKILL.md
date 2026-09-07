---
name: cluster-16
description: "Skill for the Cluster_16 area of mrc-app. 23 symbols across 1 files."
---

# Cluster_16

23 symbols | 1 files | Cohesion: 96%

## When to Use

- Working with code in `src/`
- Understanding how AdminSchedule, AdminTechnicians, AdminTechnicianDetail work
- Modifying cluster_16-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/App.tsx` | AdminSchedule, AdminTechnicians, AdminTechnicianDetail, LeadsManagement, Profile (+18) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AdminSchedule` | Function | `src/App.tsx` | 28 |
| `AdminTechnicians` | Function | `src/App.tsx` | 29 |
| `AdminTechnicianDetail` | Function | `src/App.tsx` | 30 |
| `LeadsManagement` | Function | `src/App.tsx` | 32 |
| `Profile` | Function | `src/App.tsx` | 33 |
| `Settings` | Function | `src/App.tsx` | 34 |
| `LeadDetail` | Function | `src/App.tsx` | 35 |
| `AdminInvoiceHelper` | Function | `src/App.tsx` | 36 |
| `Reports` | Function | `src/App.tsx` | 37 |
| `Notifications` | Function | `src/App.tsx` | 38 |
| `ViewReportPDF` | Function | `src/App.tsx` | 39 |
| `ResetPassword` | Function | `src/App.tsx` | 40 |
| `HelpSupport` | Function | `src/App.tsx` | 41 |
| `TechnicianJobs` | Function | `src/App.tsx` | 42 |
| `TechnicianAlerts` | Function | `src/App.tsx` | 43 |
| `TechnicianInspectionForm` | Function | `src/App.tsx` | 44 |
| `JobCompletionForm` | Function | `src/App.tsx` | 46 |
| `InspectionAIReview` | Function | `src/App.tsx` | 47 |
| `RenderPdfTest` | Function | `src/App.tsx` | 50 |
| `RequestInspection` | Function | `src/App.tsx` | 51 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Components | 1 calls |

## How to Explore

1. `context({name: "AdminSchedule"})` — see callers and callees
2. `query({search_query: "cluster_16"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
