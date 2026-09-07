---
name: components
description: "Skill for the Components area of mrc-app. 12 symbols across 4 files."
---

# Components

12 symbols | 4 files | Cohesion: 95%

## When to Use

- Working with code in `src/`
- Understanding how ErrorBoundary, PageErrorBoundary, FormRecoveryToast work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/components/ErrorBoundary.tsx` | ErrorFallback, ErrorBoundary, PageErrorFallback, PageErrorBoundary |
| `src/components/FormRecoveryToast.tsx` | FormRecoveryToast, checkForDraft, onClick |
| `src/components/OfflineBanner.tsx` | goOffline, goOnline, checkNow |
| `src/lib/offline/SyncManager.ts` | getDraftByLeadId, deleteDraft |

## Entry Points

Start here when exploring this area:

- **`ErrorBoundary`** (Function) — `src/components/ErrorBoundary.tsx:34`
- **`PageErrorBoundary`** (Function) — `src/components/ErrorBoundary.tsx:80`
- **`FormRecoveryToast`** (Function) — `src/components/FormRecoveryToast.tsx:9`
- **`checkForDraft`** (Function) — `src/components/FormRecoveryToast.tsx:16`
- **`goOffline`** (Function) — `src/components/OfflineBanner.tsx:17`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ErrorBoundary` | Function | `src/components/ErrorBoundary.tsx` | 34 |
| `PageErrorBoundary` | Function | `src/components/ErrorBoundary.tsx` | 80 |
| `FormRecoveryToast` | Function | `src/components/FormRecoveryToast.tsx` | 9 |
| `checkForDraft` | Function | `src/components/FormRecoveryToast.tsx` | 16 |
| `goOffline` | Function | `src/components/OfflineBanner.tsx` | 17 |
| `goOnline` | Function | `src/components/OfflineBanner.tsx` | 25 |
| `checkNow` | Function | `src/components/OfflineBanner.tsx` | 29 |
| `onClick` | Function | `src/components/FormRecoveryToast.tsx` | 24 |
| `getDraftByLeadId` | Method | `src/lib/offline/SyncManager.ts` | 111 |
| `deleteDraft` | Method | `src/lib/offline/SyncManager.ts` | 357 |
| `ErrorFallback` | Function | `src/components/ErrorBoundary.tsx` | 7 |
| `PageErrorFallback` | Function | `src/components/ErrorBoundary.tsx` | 53 |

## How to Explore

1. `context({name: "ErrorBoundary"})` — see callers and callees
2. `query({search_query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
