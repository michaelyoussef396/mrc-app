---
name: offline
description: "Skill for the Offline area of mrc-app. 21 symbols across 5 files."
---

# Offline

21 symbols | 5 files | Cohesion: 80%

## When to Use

- Working with code in `src/`
- Understanding how OfflineBanner, useNetworkStatus, useOfflineSync work
- Modifying offline-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/offline/SyncManager.ts` | getPendingCounts, PhotoQuarantinedError, isCaptionValid, syncPhoto, quarantinePhoto (+7) |
| `src/lib/offline/useQuarantinedPhotos.ts` | requeue, useQuarantinedPhotos, refresh, discard |
| `src/lib/offline/useOfflineSync.ts` | useOfflineSync, refreshCounts, syncNow |
| `src/components/OfflineBanner.tsx` | OfflineBanner |
| `src/lib/offline/useNetworkStatus.ts` | useNetworkStatus |

## Entry Points

Start here when exploring this area:

- **`OfflineBanner`** (Function) — `src/components/OfflineBanner.tsx:10`
- **`useNetworkStatus`** (Function) — `src/lib/offline/useNetworkStatus.ts:2`
- **`useOfflineSync`** (Function) — `src/lib/offline/useOfflineSync.ts:15`
- **`refreshCounts`** (Function) — `src/lib/offline/useOfflineSync.ts:23`
- **`syncNow`** (Function) — `src/lib/offline/useOfflineSync.ts:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PhotoQuarantinedError` | Class | `src/lib/offline/SyncManager.ts` | 13 |
| `OfflineBanner` | Function | `src/components/OfflineBanner.tsx` | 10 |
| `useNetworkStatus` | Function | `src/lib/offline/useNetworkStatus.ts` | 2 |
| `useOfflineSync` | Function | `src/lib/offline/useOfflineSync.ts` | 15 |
| `refreshCounts` | Function | `src/lib/offline/useOfflineSync.ts` | 23 |
| `syncNow` | Function | `src/lib/offline/useOfflineSync.ts` | 41 |
| `requeue` | Function | `src/lib/offline/useQuarantinedPhotos.ts` | 36 |
| `useQuarantinedPhotos` | Function | `src/lib/offline/useQuarantinedPhotos.ts` | 22 |
| `refresh` | Function | `src/lib/offline/useQuarantinedPhotos.ts` | 26 |
| `discard` | Function | `src/lib/offline/useQuarantinedPhotos.ts` | 41 |
| `getPendingCounts` | Method | `src/lib/offline/SyncManager.ts` | 89 |
| `syncPhoto` | Method | `src/lib/offline/SyncManager.ts` | 254 |
| `quarantinePhoto` | Method | `src/lib/offline/SyncManager.ts` | 374 |
| `requeueQuarantinedPhoto` | Method | `src/lib/offline/SyncManager.ts` | 425 |
| `getQuarantinedPhotos` | Method | `src/lib/offline/SyncManager.ts` | 408 |
| `discardQuarantinedPhoto` | Method | `src/lib/offline/SyncManager.ts` | 415 |
| `getPendingDrafts` | Method | `src/lib/offline/SyncManager.ts` | 68 |
| `getPendingPhotos` | Method | `src/lib/offline/SyncManager.ts` | 78 |
| `syncAll` | Method | `src/lib/offline/SyncManager.ts` | 122 |
| `syncDraft` | Method | `src/lib/offline/SyncManager.ts` | 191 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `TechnicianBottomNav → CaptureBusinessError` | cross_community | 8 |
| `TechnicianBottomNav → QuarantinePhoto` | cross_community | 7 |
| `TechnicianBottomNav → IsCaptionValid` | cross_community | 7 |
| `TechnicianBottomNav → PhotoQuarantinedError` | cross_community | 7 |
| `TechnicianBottomNav → GetPendingDrafts` | cross_community | 6 |
| `TechnicianBottomNav → SyncDraft` | cross_community | 6 |
| `TechnicianBottomNav → GetPendingPhotos` | cross_community | 6 |
| `TechnicianBottomNav → GetPendingCounts` | cross_community | 6 |
| `QuarantinedPhotosBanner → GetQuarantinedPhotos` | cross_community | 4 |
| `TechnicianBottomNav → UseNetworkStatus` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Photos | 1 calls |

## How to Explore

1. `context({name: "OfflineBanner"})` — see callers and callees
2. `query({search_query: "offline"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
