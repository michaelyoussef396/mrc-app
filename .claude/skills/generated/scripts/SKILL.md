---
name: scripts
description: "Skill for the Scripts area of mrc-app. 80 symbols across 11 files."
---

# Scripts

80 symbols | 11 files | Cohesion: 81%

## When to Use

- Working with code in `slack-mcp-server/`
- Understanding how getFromKeychain, saveToKeychain, getFromFile work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/preview-emails.ts` | buildGoogleReviewEmailHtml, fmtDateLong, fmtDateShort, fmtDateShortYear, fmtDateAU (+10) |
| `slack-mcp-server/scripts/setup-wizard.js` | print, printBox, warn, error, info (+8) |
| `slack-mcp-server/lib/handlers.js` | parseBool, atomicWriteSync, loadDMCache, saveDMCache, handleTokenStatus (+6) |
| `slack-mcp-server/lib/token-store.js` | getFromKeychain, saveToKeychain, getFromFile, atomicWriteSync, saveToFile (+5) |
| `scripts/send-preview-emails.ts` | wrapInBrandedTemplate, buildConfirmationEmailHtml, buildBookingConfirmationHtml, buildReminderHtml, buildReportApprovedHtml (+3) |
| `slack-mcp-server/scripts/token-cli.js` | main, showStatus, manualRefresh, question, autoExtract (+1) |
| `slack-mcp-server/scripts/verify-web.js` | cleanup, startServer, testDemoPage, testDashboard, testApiWithKey (+1) |
| `slack-mcp-server/lib/slack-client.js` | stats, checkTokenHealth, slackAPI, getUserCacheStats, sleep |
| `slack-mcp-server/scripts/verify-core.js` | atomicWriteSync, testAtomicWrite, testServerExit, main |
| `slack-mcp-server/src/web-server.js` | main |

## Entry Points

Start here when exploring this area:

- **`getFromKeychain`** (Function) — `slack-mcp-server/lib/token-store.js:26`
- **`saveToKeychain`** (Function) — `slack-mcp-server/lib/token-store.js:39`
- **`getFromFile`** (Function) — `slack-mcp-server/lib/token-store.js:57`
- **`saveToFile`** (Function) — `slack-mcp-server/lib/token-store.js:89`
- **`extractFromChrome`** (Function) — `slack-mcp-server/lib/token-store.js:175`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getFromKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 26 |
| `saveToKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 39 |
| `getFromFile` | Function | `slack-mcp-server/lib/token-store.js` | 57 |
| `saveToFile` | Function | `slack-mcp-server/lib/token-store.js` | 89 |
| `extractFromChrome` | Function | `slack-mcp-server/lib/token-store.js` | 175 |
| `loadTokens` | Function | `slack-mcp-server/lib/token-store.js` | 199 |
| `saveTokens` | Function | `slack-mcp-server/lib/token-store.js` | 251 |
| `checkTokenHealth` | Function | `slack-mcp-server/lib/slack-client.js` | 94 |
| `slackAPI` | Function | `slack-mcp-server/lib/slack-client.js` | 147 |
| `getUserCacheStats` | Function | `slack-mcp-server/lib/slack-client.js` | 271 |
| `sleep` | Function | `slack-mcp-server/lib/slack-client.js` | 292 |
| `handleTokenStatus` | Function | `slack-mcp-server/lib/handlers.js` | 75 |
| `handleHealthCheck` | Function | `slack-mcp-server/lib/handlers.js` | 112 |
| `handleRefreshTokens` | Function | `slack-mcp-server/lib/handlers.js` | 151 |
| `handleListConversations` | Function | `slack-mcp-server/lib/handlers.js` | 198 |
| `handleUsersInfo` | Function | `slack-mcp-server/lib/handlers.js` | 464 |
| `handleSendMessage` | Function | `slack-mcp-server/lib/handlers.js` | 490 |
| `handleListUsers` | Function | `slack-mcp-server/lib/handlers.js` | 545 |
| `isAutoRefreshAvailable` | Function | `slack-mcp-server/lib/token-store.js` | 193 |
| `main` | Function | `slack-mcp-server/src/web-server.js` | 283 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → AtomicWriteSync` | cross_community | 6 |
| `Main → ExtractFromChromeInternal` | cross_community | 5 |
| `Main → SaveToKeychain` | cross_community | 5 |
| `Main → GetFromFile` | cross_community | 5 |
| `Main → GetFromKeychain` | cross_community | 5 |
| `HandleListConversations → ExtractFromChromeInternal` | intra_community | 5 |
| `HandleListConversations → SaveToKeychain` | intra_community | 5 |
| `HandleListConversations → GetFromFile` | intra_community | 5 |
| `HandleListConversations → GetFromKeychain` | intra_community | 5 |
| `JobCompletionForm → Print` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 4 calls |
| Tools | 1 calls |
| Cluster_104 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getFromKeychain"})` — see callers and callees
2. `gitnexus_query({query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
