---
name: scripts
description: "Skill for the Scripts area of mrc-app. 74 symbols across 9 files."
---

# Scripts

74 symbols | 9 files | Cohesion: 78%

## When to Use

- Working with code in `slack-mcp-server/`
- Understanding how saveToKeychain, saveToFile, extractFromChrome work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/preview-emails.ts` | buildGoogleReviewEmailHtml, fmtDateLong, fmtDateShort, fmtDateShortYear, fmtDateAU (+10) |
| `slack-mcp-server/scripts/setup-wizard.js` | print, printBox, warn, error, info (+8) |
| `slack-mcp-server/lib/handlers.js` | parseBool, atomicWriteSync, loadDMCache, saveDMCache, handleTokenStatus (+5) |
| `scripts/send-preview-emails.ts` | wrapInBrandedTemplate, buildConfirmationEmailHtml, buildBookingConfirmationHtml, buildReminderHtml, buildReportApprovedHtml (+3) |
| `slack-mcp-server/lib/token-store.js` | saveToKeychain, atomicWriteSync, saveToFile, extractFromChromeInternal, extractFromChrome (+2) |
| `slack-mcp-server/scripts/token-cli.js` | main, showStatus, manualRefresh, question, autoExtract (+1) |
| `slack-mcp-server/scripts/verify-web.js` | cleanup, startServer, testDemoPage, testDashboard, testApiWithKey (+1) |
| `slack-mcp-server/lib/slack-client.js` | stats, checkTokenHealth, slackAPI, getUserCacheStats, sleep |
| `slack-mcp-server/scripts/verify-core.js` | atomicWriteSync, testAtomicWrite, testServerExit, main |

## Entry Points

Start here when exploring this area:

- **`saveToKeychain`** (Function) — `slack-mcp-server/lib/token-store.js:39`
- **`saveToFile`** (Function) — `slack-mcp-server/lib/token-store.js:89`
- **`extractFromChrome`** (Function) — `slack-mcp-server/lib/token-store.js:175`
- **`saveTokens`** (Function) — `slack-mcp-server/lib/token-store.js:251`
- **`checkTokenHealth`** (Function) — `slack-mcp-server/lib/slack-client.js:94`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `saveToKeychain` | Function | `slack-mcp-server/lib/token-store.js` | 39 |
| `saveToFile` | Function | `slack-mcp-server/lib/token-store.js` | 89 |
| `extractFromChrome` | Function | `slack-mcp-server/lib/token-store.js` | 175 |
| `saveTokens` | Function | `slack-mcp-server/lib/token-store.js` | 251 |
| `checkTokenHealth` | Function | `slack-mcp-server/lib/slack-client.js` | 94 |
| `slackAPI` | Function | `slack-mcp-server/lib/slack-client.js` | 147 |
| `getUserCacheStats` | Function | `slack-mcp-server/lib/slack-client.js` | 271 |
| `sleep` | Function | `slack-mcp-server/lib/slack-client.js` | 292 |
| `handleTokenStatus` | Function | `slack-mcp-server/lib/handlers.js` | 75 |
| `handleRefreshTokens` | Function | `slack-mcp-server/lib/handlers.js` | 151 |
| `handleListConversations` | Function | `slack-mcp-server/lib/handlers.js` | 198 |
| `handleUsersInfo` | Function | `slack-mcp-server/lib/handlers.js` | 464 |
| `handleSendMessage` | Function | `slack-mcp-server/lib/handlers.js` | 490 |
| `handleListUsers` | Function | `slack-mcp-server/lib/handlers.js` | 545 |
| `isAutoRefreshAvailable` | Function | `slack-mcp-server/lib/token-store.js` | 193 |
| `main` | Function | `slack-mcp-server/scripts/token-cli.js` | 11 |
| `showStatus` | Function | `slack-mcp-server/scripts/token-cli.js` | 36 |
| `manualRefresh` | Function | `slack-mcp-server/scripts/token-cli.js` | 63 |
| `question` | Function | `slack-mcp-server/scripts/token-cli.js` | 79 |
| `autoExtract` | Function | `slack-mcp-server/scripts/token-cli.js` | 104 |

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
| `JobCompletionForm → Print` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_91 | 4 calls |
| Pages | 3 calls |
| Job-completion | 1 calls |
| Tools | 1 calls |
| Cluster_101 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "saveToKeychain"})` — see callers and callees
2. `gitnexus_query({query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
