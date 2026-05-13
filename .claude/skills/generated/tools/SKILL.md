---
name: tools
description: "Skill for the Tools area of mrc-app. 16 symbols across 11 files."
---

# Tools

16 symbols | 11 files | Cohesion: 55%

## When to Use

- Working with code in `mcp-send-email/`
- Understanding how addWebhookTools, addTopicTools, addSegmentTools work
- Modifying tools-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `supabase/functions/receive-framer-lead/index.ts` | buildConfirmationEmailHtml, sendFailureEmail, sendFailureSlack |
| `mcp-send-email/tools/domains.ts` | formatDnsRecords, addDomainTools |
| `supabase/functions/send-inspection-reminder/index.ts` | wrapInBrandedTemplate, buildReminderHtml |
| `src/lib/offline/SyncManager.ts` | saveDraft, getDraft |
| `mcp-send-email/tools/webhooks.ts` | addWebhookTools |
| `slack-mcp-server/lib/slack-client.js` | get |
| `mcp-send-email/tools/topics.ts` | addTopicTools |
| `mcp-send-email/tools/segments.ts` | addSegmentTools |
| `mcp-send-email/tools/contacts.ts` | addContactTools |
| `mcp-send-email/tools/broadcasts.ts` | addBroadcastTools |

## Entry Points

Start here when exploring this area:

- **`addWebhookTools`** (Function) — `mcp-send-email/tools/webhooks.ts:24`
- **`addTopicTools`** (Function) — `mcp-send-email/tools/topics.ts:4`
- **`addSegmentTools`** (Function) — `mcp-send-email/tools/segments.ts:4`
- **`addDomainTools`** (Function) — `mcp-send-email/tools/domains.ts:25`
- **`addContactTools`** (Function) — `mcp-send-email/tools/contacts.ts:9`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `addWebhookTools` | Function | `mcp-send-email/tools/webhooks.ts` | 24 |
| `addTopicTools` | Function | `mcp-send-email/tools/topics.ts` | 4 |
| `addSegmentTools` | Function | `mcp-send-email/tools/segments.ts` | 4 |
| `addDomainTools` | Function | `mcp-send-email/tools/domains.ts` | 25 |
| `addContactTools` | Function | `mcp-send-email/tools/contacts.ts` | 9 |
| `addBroadcastTools` | Function | `mcp-send-email/tools/broadcasts.ts` | 4 |
| `saveDraft` | Method | `src/lib/offline/SyncManager.ts` | 36 |
| `getDraft` | Method | `src/lib/offline/SyncManager.ts` | 104 |
| `formatDnsRecords` | Function | `mcp-send-email/tools/domains.ts` | 4 |
| `wrapInBrandedTemplate` | Function | `supabase/functions/send-inspection-reminder/index.ts` | 7 |
| `buildReminderHtml` | Function | `supabase/functions/send-inspection-reminder/index.ts` | 91 |
| `buildConfirmationEmailHtml` | Function | `supabase/functions/receive-framer-lead/index.ts` | 203 |
| `sendFailureEmail` | Function | `supabase/functions/receive-framer-lead/index.ts` | 319 |
| `sendFailureSlack` | Function | `supabase/functions/receive-framer-lead/index.ts` | 346 |
| `getPhotoUrl` | Function | `supabase/functions/generate-job-report-pdf/index.ts` | 233 |
| `get` | Method | `slack-mcp-server/lib/slack-client.js` | 46 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleNext → Set` | cross_community | 5 |
| `Section3BeforePhotos → Set` | cross_community | 5 |
| `HandlePrevious → Set` | cross_community | 5 |
| `QuarantinedPhotosBanner → Set` | cross_community | 5 |
| `LeadDetail → Set` | cross_community | 4 |
| `HandlePhotoCapture → Set` | cross_community | 4 |
| `GenerateReportHtml → Set` | cross_community | 4 |
| `OpenJobPhotoPicker → Set` | cross_community | 4 |
| `Notifications → Set` | cross_community | 4 |
| `HandleListConversations → Set` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 5 calls |
| Hooks | 1 calls |

## How to Explore

1. `gitnexus_context({name: "addWebhookTools"})` — see callers and callees
2. `gitnexus_query({query: "tools"})` — find related execution flows
3. Read key files listed above for implementation details
