---
name: offline
description: "Skill for the Offline area of mrc-app. 18 symbols across 7 files."
---

# Offline

18 symbols | 7 files | Cohesion: 69%

## When to Use

- Working with code in `src/`
- Understanding how OfflineBanner, useOfflineSync, useNetworkStatus work
- Modifying offline-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/offline/SyncManager.ts` | getPendingCounts, PhotoQuarantinedError, isCaptionValid, syncPhoto, quarantinePhoto (+7) |
| `src/components/OfflineBanner.tsx` | OfflineBanner |
| `src/lib/offline/useOfflineSync.ts` | useOfflineSync |
| `src/lib/offline/useNetworkStatus.ts` | useNetworkStatus |
| `src/lib/offline/SyncIndicator.tsx` | SyncIndicator |
| `src/components/QuarantinedPhotosBanner.tsx` | QuarantinedPhotosBanner |
| `src/lib/offline/useQuarantinedPhotos.ts` | useQuarantinedPhotos |

## Entry Points

Start here when exploring this area:

- **`OfflineBanner`** (Function) — `src/components/OfflineBanner.tsx:4`
- **`useOfflineSync`** (Function) — `src/lib/offline/useOfflineSync.ts:15`
- **`useNetworkStatus`** (Function) — `src/lib/offline/useNetworkStatus.ts:2`
- **`SyncIndicator`** (Function) — `src/lib/offline/SyncIndicator.tsx:11`
- **`QuarantinedPhotosBanner`** (Function) — `src/components/QuarantinedPhotosBanner.tsx:25`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PhotoQuarantinedError` | Class | `src/lib/offline/SyncManager.ts` | 13 |
| `OfflineBanner` | Function | `src/components/OfflineBanner.tsx` | 4 |
| `useOfflineSync` | Function | `src/lib/offline/useOfflineSync.ts` | 15 |
| `useNetworkStatus` | Function | `src/lib/offline/useNetworkStatus.ts` | 2 |
| `SyncIndicator` | Function | `src/lib/offline/SyncIndicator.tsx` | 11 |
| `QuarantinedPhotosBanner` | Function | `src/components/QuarantinedPhotosBanner.tsx` | 25 |
| `useQuarantinedPhotos` | Function | `src/lib/offline/useQuarantinedPhotos.ts` | 22 |
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
| `isCaptionValid` | Function | `src/lib/offline/SyncManager.ts` | 20 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `QuarantinedPhotosBanner → Set` | cross_community | 5 |
| `QuarantinedPhotosBanner → IsCaptionValid` | cross_community | 4 |
| `SyncAll → Dispatch` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 3 calls |
| Services | 3 calls |
| Tools | 1 calls |

## How to Explore

1. `gitnexus_context({name: "OfflineBanner"})` — see callers and callees
2. `gitnexus_query({query: "offline"})` — find related execution flows
3. Read key files listed above for implementation details
