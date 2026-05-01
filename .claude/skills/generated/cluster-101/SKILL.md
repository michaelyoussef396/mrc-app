---
name: cluster-101
description: "Skill for the Cluster_101 area of mrc-app. 6 symbols across 2 files."
---

# Cluster_101

6 symbols | 2 files | Cohesion: 64%

## When to Use

- Working with code in `slack-mcp-server/`
- Understanding how resolveUser, formatTimestamp, handleConversationsHistory work
- Modifying cluster_101-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `slack-mcp-server/lib/handlers.js` | handleConversationsHistory, handleGetFullConversation, handleSearchMessages, handleGetThread |
| `slack-mcp-server/lib/slack-client.js` | resolveUser, formatTimestamp |

## Entry Points

Start here when exploring this area:

- **`resolveUser`** (Function) — `slack-mcp-server/lib/slack-client.js:243`
- **`formatTimestamp`** (Function) — `slack-mcp-server/lib/slack-client.js:278`
- **`handleConversationsHistory`** (Function) — `slack-mcp-server/lib/handlers.js:294`
- **`handleGetFullConversation`** (Function) — `slack-mcp-server/lib/handlers.js:333`
- **`handleSearchMessages`** (Function) — `slack-mcp-server/lib/handlers.js:431`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `resolveUser` | Function | `slack-mcp-server/lib/slack-client.js` | 243 |
| `formatTimestamp` | Function | `slack-mcp-server/lib/slack-client.js` | 278 |
| `handleConversationsHistory` | Function | `slack-mcp-server/lib/handlers.js` | 294 |
| `handleGetFullConversation` | Function | `slack-mcp-server/lib/handlers.js` | 333 |
| `handleSearchMessages` | Function | `slack-mcp-server/lib/handlers.js` | 431 |
| `handleGetThread` | Function | `slack-mcp-server/lib/handlers.js` | 514 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleListConversations → Set` | cross_community | 4 |
| `HandleListConversations → Sleep` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Scripts | 6 calls |
| Tools | 1 calls |
| Job-completion | 1 calls |

## How to Explore

1. `gitnexus_context({name: "resolveUser"})` — see callers and callees
2. `gitnexus_query({query: "cluster_101"})` — find related execution flows
3. Read key files listed above for implementation details
