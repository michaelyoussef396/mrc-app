---
name: supabase
description: "Skill for the Supabase area of mrc-app. 9 symbols across 4 files."
---

# Supabase

9 symbols | 4 files | Cohesion: 61%

## When to Use

- Working with code in `src/`
- Understanding how AuthProvider, getRememberMePreference work
- Modifying supabase-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/integrations/supabase/client.ts` | getStorage, getItem, setItem, getRememberMePreference |
| `src/pages/Login.tsx` | Login, handleEmailChange, handlePasswordChange |
| `src/contexts/AuthContext.tsx` | AuthProvider |
| `src/components/leads/CreateNewLeadModal.tsx` | recordAttempt |

## Entry Points

Start here when exploring this area:

- **`AuthProvider`** (Function) — `src/contexts/AuthContext.tsx:51`
- **`getRememberMePreference`** (Function) — `src/integrations/supabase/client.ts:84`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AuthProvider` | Function | `src/contexts/AuthContext.tsx` | 51 |
| `getRememberMePreference` | Function | `src/integrations/supabase/client.ts` | 84 |
| `Login` | Function | `src/pages/Login.tsx` | 120 |
| `handleEmailChange` | Function | `src/pages/Login.tsx` | 185 |
| `handlePasswordChange` | Function | `src/pages/Login.tsx` | 195 |
| `recordAttempt` | Function | `src/components/leads/CreateNewLeadModal.tsx` | 144 |
| `getStorage` | Method | `src/integrations/supabase/client.ts` | 28 |
| `getItem` | Method | `src/integrations/supabase/client.ts` | 34 |
| `setItem` | Method | `src/integrations/supabase/client.ts` | 45 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSubmit → GetItem` | cross_community | 6 |
| `HandleResendEmail → GetStorage` | cross_community | 6 |
| `HandleResendEmail → GetItem` | cross_community | 6 |
| `HandleSubmit → GetItem` | cross_community | 5 |
| `HandleSubmit → RemoveItem` | cross_community | 5 |
| `HandleResendEmail → RemoveItem` | cross_community | 5 |
| `JobCompletionForm → GetItem` | cross_community | 5 |
| `ForgotPassword → GetStorage` | cross_community | 5 |
| `HandleSubmit → GetStorage` | cross_community | 4 |
| `HandleSubmit → RemoveItem` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 2 calls |
| Hooks | 1 calls |
| Ui | 1 calls |

## How to Explore

1. `gitnexus_context({name: "AuthProvider"})` — see callers and callees
2. `gitnexus_query({query: "supabase"})` — find related execution flows
3. Read key files listed above for implementation details
