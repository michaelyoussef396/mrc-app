---
name: scripts
description: "Skill for the Scripts area of mrc-app. 74 symbols across 12 files."
---

# Scripts

74 symbols | 12 files | Cohesion: 84%

## When to Use

- Working with code in `slack-mcp-server/`
- Understanding how handleHealthCheck, handleRefreshTokens, handleUsersInfo work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/preview-emails.ts` | buildGoogleReviewEmailHtml, fmtDateLong, fmtDateShort, fmtDateShortYear, fmtDateAU (+10) |
| `slack-mcp-server/scripts/setup-wizard.js` | print, printBox, success, warn, error (+9) |
| `slack-mcp-server/lib/token-store.js` | getFromKeychain, saveToKeychain, getFromFile, atomicWriteSync, saveToFile (+5) |
| `scripts/send-preview-emails.ts` | wrapInBrandedTemplate, buildConfirmationEmailHtml, buildBookingConfirmationHtml, buildReminderHtml, buildReportApprovedHtml (+3) |
| `slack-mcp-server/scripts/verify-web.js` | log, cleanup, startServer, testDemoPage, testDashboard (+2) |
| `slack-mcp-server/scripts/token-cli.js` | main, showStatus, manualRefresh, question, autoExtract (+1) |
| `slack-mcp-server/lib/handlers.js` | handleHealthCheck, handleRefreshTokens, handleUsersInfo, handleSendMessage |
| `slack-mcp-server/scripts/verify-core.js` | atomicWriteSync, testAtomicWrite, testServerExit, main |
| `slack-mcp-server/lib/slack-client.js` | checkTokenHealth, slackAPI |
| `slack-mcp-server/src/server.js` | main, backgroundTimer |

## Entry Points

Start here when exploring this area:

- **`handleHealthCheck`** (Function) — `slack-mcp-server/lib/handlers.js:112`
- **`handleRefreshTokens`** (Function) — `slack-mcp-server/lib/handlers.js:151`
- **`handleUsersInfo`** (Function) — `slack-mcp-server/lib/handlers.js:464`
- **`handleSendMessage`** (Function) — `slack-mcp-server/lib/handlers.js:490`
- **`checkTokenHealth`** (Function) — `slack-mcp-server/lib/slack-client.js:94`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleHealthCheck` | Function | `slack-mcp-server/lib/handlers.js` | 112 |
| `handleRefreshTokens` | Function | `slack-mcp-server/lib/handlers.js` | 151 |
| `handleUsersInfo` | Function | `slack-mcp-server/lib/handlers.js` | 464 |
| `handleSendMessage` | Function | `slack-mcp-server/lib/handlers.js` | 490 |
| `checkTokenHealth` | Function | `slack-mcp-server/lib/slack-client.js` | 94 |
| `slackAPI` | Function | `slack-mcp-server/lib/slack-client.js` | 147 |
| `getFromKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 26 |
| `saveToKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 39 |
| `getFromFile` | Function | `slack-mcp-server/lib/token-store.js` | 57 |
| `saveToFile` | Function | `slack-mcp-server/lib/token-store.js` | 89 |
| `extractFromChrome` | Function | `slack-mcp-server/lib/token-store.js` | 175 |
| `isAutoRefreshAvailable` | Function | `slack-mcp-server/lib/token-store.js` | 193 |
| `loadTokens` | Function | `slack-mcp-server/lib/token-store.js` | 199 |
| `saveTokens` | Function | `slack-mcp-server/lib/token-store.js` | 251 |
| `fetch` | Method | `slack-mcp-server/workers/mcp-worker.js` | 362 |
| `atomicWriteSync` | Function | `slack-mcp-server/lib/token-store.js` | 74 |
| `extractFromChromeInternal` | Function | `slack-mcp-server/lib/token-store.js` | 116 |
| `main` | Function | `slack-mcp-server/scripts/token-cli.js` | 11 |
| `showStatus` | Function | `slack-mcp-server/scripts/token-cli.js` | 36 |
| `manualRefresh` | Function | `slack-mcp-server/scripts/token-cli.js` | 63 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → SlackApi` | cross_community | 6 |
| `Main → AtomicWriteSync` | cross_community | 6 |
| `Main → JsonRpcResponse` | cross_community | 5 |
| `Main → JsonRpcError` | cross_community | 5 |
| `Main → ExtractFromChromeInternal` | cross_community | 5 |
| `Main → SaveToKeychain` | cross_community | 5 |
| `Main → GetFromFile` | cross_community | 5 |
| `Main → GetFromKeychain` | cross_community | 5 |
| `HandleListConversations → ExtractFromChromeInternal` | cross_community | 5 |
| `HandleListConversations → SaveToKeychain` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Workers | 1 calls |
| Cluster_64 | 1 calls |

## How to Explore

1. `context({name: "handleHealthCheck"})` — see callers and callees
2. `query({search_query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
