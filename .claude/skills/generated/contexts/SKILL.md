---
name: contexts
description: "Skill for the Contexts area of mrc-app. 16 symbols across 3 files."
---

# Contexts

16 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how signOut, forceLogoutAllDevices, clearAuthTokens work
- Modifying contexts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/contexts/AuthContext.tsx` | signOut, forceLogoutAllDevices, signIn, getActiveSessions, getUserDevices (+3) |
| `src/services/sessionService.ts` | forceLogoutAllDevices, getActiveSessions, getUserDevices, removeDevice, trustDevice (+1) |
| `src/integrations/supabase/client.ts` | clearAuthTokens, setRememberMePreference |

## Entry Points

Start here when exploring this area:

- **`signOut`** (Function) — `src/contexts/AuthContext.tsx:201`
- **`forceLogoutAllDevices`** (Function) — `src/contexts/AuthContext.tsx:231`
- **`clearAuthTokens`** (Function) — `src/integrations/supabase/client.ts:91`
- **`forceLogoutAllDevices`** (Function) — `src/services/sessionService.ts:159`
- **`signIn`** (Function) — `src/contexts/AuthContext.tsx:179`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `signOut` | Function | `src/contexts/AuthContext.tsx` | 201 |
| `forceLogoutAllDevices` | Function | `src/contexts/AuthContext.tsx` | 231 |
| `clearAuthTokens` | Function | `src/integrations/supabase/client.ts` | 91 |
| `forceLogoutAllDevices` | Function | `src/services/sessionService.ts` | 159 |
| `signIn` | Function | `src/contexts/AuthContext.tsx` | 179 |
| `setRememberMePreference` | Function | `src/integrations/supabase/client.ts` | 74 |
| `getActiveSessions` | Function | `src/contexts/AuthContext.tsx` | 243 |
| `getActiveSessions` | Function | `src/services/sessionService.ts` | 195 |
| `getUserDevices` | Function | `src/contexts/AuthContext.tsx` | 249 |
| `getUserDevices` | Function | `src/services/sessionService.ts` | 230 |
| `removeDevice` | Function | `src/contexts/AuthContext.tsx` | 255 |
| `removeDevice` | Function | `src/services/sessionService.ts` | 253 |
| `trustDevice` | Function | `src/contexts/AuthContext.tsx` | 261 |
| `trustDevice` | Function | `src/services/sessionService.ts` | 291 |
| `untrustDevice` | Function | `src/contexts/AuthContext.tsx` | 267 |
| `untrustDevice` | Function | `src/services/sessionService.ts` | 317 |

## How to Explore

1. `context({name: "signOut"})` — see callers and callees
2. `query({search_query: "contexts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
