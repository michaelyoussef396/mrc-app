---
name: offline
description: "Skill for the Offline area of mrc-app. 10 symbols across 5 files."
---

# Offline

10 symbols | 5 files | Cohesion: 73%

## When to Use

- Working with code in `src/`
- Understanding how OfflineBanner, useOfflineSync, useNetworkStatus work
- Modifying offline-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/offline/SyncManager.ts` | getPendingCounts, getPendingDrafts, getPendingPhotos, syncAll, syncDraft (+1) |
| `src/components/OfflineBanner.tsx` | OfflineBanner |
| `src/lib/offline/useOfflineSync.ts` | useOfflineSync |
| `src/lib/offline/useNetworkStatus.ts` | useNetworkStatus |
| `src/lib/offline/SyncIndicator.tsx` | SyncIndicator |

## Entry Points

Start here when exploring this area:

- **`OfflineBanner`** (Function) — `src/components/OfflineBanner.tsx:4`
- **`useOfflineSync`** (Function) — `src/lib/offline/useOfflineSync.ts:15`
- **`useNetworkStatus`** (Function) — `src/lib/offline/useNetworkStatus.ts:2`
- **`SyncIndicator`** (Function) — `src/lib/offline/SyncIndicator.tsx:11`
- **`getPendingCounts`** (Method) — `src/lib/offline/SyncManager.ts:71`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `OfflineBanner` | Function | `src/components/OfflineBanner.tsx` | 4 |
| `useOfflineSync` | Function | `src/lib/offline/useOfflineSync.ts` | 15 |
| `useNetworkStatus` | Function | `src/lib/offline/useNetworkStatus.ts` | 2 |
| `SyncIndicator` | Function | `src/lib/offline/SyncIndicator.tsx` | 11 |
| `getPendingCounts` | Method | `src/lib/offline/SyncManager.ts` | 71 |
| `getPendingDrafts` | Method | `src/lib/offline/SyncManager.ts` | 50 |
| `getPendingPhotos` | Method | `src/lib/offline/SyncManager.ts` | 60 |
| `syncAll` | Method | `src/lib/offline/SyncManager.ts` | 104 |
| `syncDraft` | Method | `src/lib/offline/SyncManager.ts` | 164 |
| `syncPhoto` | Method | `src/lib/offline/SyncManager.ts` | 227 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `UseOfflineSync → Dispatch` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 4 calls |

## How to Explore

1. `gitnexus_context({name: "OfflineBanner"})` — see callers and callees
2. `gitnexus_query({query: "offline"})` — find related execution flows
3. Read key files listed above for implementation details
