---
name: cluster-91
description: "Skill for the Cluster_91 area of mrc-app. 6 symbols across 4 files."
---

# Cluster_91

6 symbols | 4 files | Cohesion: 56%

## When to Use

- Working with code in `slack-mcp-server/`
- Understanding how getFromKeychain, getFromFile, loadTokens work
- Modifying cluster_91-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `slack-mcp-server/lib/token-store.js` | getFromKeychain, getFromFile, loadTokens |
| `slack-mcp-server/src/web-server.js` | main |
| `slack-mcp-server/src/server.js` | main |
| `slack-mcp-server/lib/handlers.js` | handleHealthCheck |

## Entry Points

Start here when exploring this area:

- **`getFromKeychain`** (Function) — `slack-mcp-server/lib/token-store.js:26`
- **`getFromFile`** (Function) — `slack-mcp-server/lib/token-store.js:57`
- **`loadTokens`** (Function) — `slack-mcp-server/lib/token-store.js:199`
- **`handleHealthCheck`** (Function) — `slack-mcp-server/lib/handlers.js:112`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getFromKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 26 |
| `getFromFile` | Function | `slack-mcp-server/lib/token-store.js` | 57 |
| `loadTokens` | Function | `slack-mcp-server/lib/token-store.js` | 199 |
| `handleHealthCheck` | Function | `slack-mcp-server/lib/handlers.js` | 112 |
| `main` | Function | `slack-mcp-server/src/web-server.js` | 283 |
| `main` | Function | `slack-mcp-server/src/server.js` | 271 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → AtomicWriteSync` | cross_community | 6 |
| `Main → ExtractFromChromeInternal` | cross_community | 5 |
| `Main → SaveToKeychain` | cross_community | 5 |
| `Main → GetFromFile` | cross_community | 5 |
| `Main → GetFromKeychain` | cross_community | 5 |
| `HandleListConversations → ExtractFromChromeInternal` | cross_community | 5 |
| `HandleListConversations → SaveToKeychain` | cross_community | 5 |
| `HandleListConversations → GetFromFile` | cross_community | 5 |
| `HandleListConversations → GetFromKeychain` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Scripts | 4 calls |

## How to Explore

1. `gitnexus_context({name: "getFromKeychain"})` — see callers and callees
2. `gitnexus_query({query: "cluster_91"})` — find related execution flows
3. Read key files listed above for implementation details
