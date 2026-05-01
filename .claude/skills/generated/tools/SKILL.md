---
name: tools
description: "Skill for the Tools area of mrc-app. 16 symbols across 11 files."
---

# Tools

16 symbols | 11 files | Cohesion: 56%

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
| `mcp-send-email/tools/topics.ts` | addTopicTools |
| `slack-mcp-server/lib/slack-client.js` | get |
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
| `saveDraft` | Method | `src/lib/offline/SyncManager.ts` | 18 |
| `getDraft` | Method | `src/lib/offline/SyncManager.ts` | 86 |
| `formatDnsRecords` | Function | `mcp-send-email/tools/domains.ts` | 4 |
| `buildConfirmationEmailHtml` | Function | `supabase/functions/receive-framer-lead/index.ts` | 203 |
| `sendFailureEmail` | Function | `supabase/functions/receive-framer-lead/index.ts` | 319 |
| `sendFailureSlack` | Function | `supabase/functions/receive-framer-lead/index.ts` | 346 |
| `wrapInBrandedTemplate` | Function | `supabase/functions/send-inspection-reminder/index.ts` | 7 |
| `buildReminderHtml` | Function | `supabase/functions/send-inspection-reminder/index.ts` | 91 |
| `getPhotoUrl` | Function | `supabase/functions/generate-job-report-pdf/index.ts` | 232 |
| `get` | Method | `slack-mcp-server/lib/slack-client.js` | 46 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleNext → Set` | cross_community | 5 |
| `Section3BeforePhotos → Set` | cross_community | 5 |
| `HandlePrevious → Set` | cross_community | 5 |
| `LeadDetail → Set` | cross_community | 4 |
| `GenerateReportHtml → Set` | cross_community | 4 |
| `OpenJobPhotoPicker → Set` | cross_community | 4 |
| `Notifications → Set` | cross_community | 4 |
| `HandleListConversations → Set` | cross_community | 4 |
| `ViewReportPDF → Set` | cross_community | 3 |
| `TechnicianInspectionForm → Set` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 5 calls |
| Job-completion | 1 calls |

## How to Explore

1. `gitnexus_context({name: "addWebhookTools"})` — see callers and callees
2. `gitnexus_query({query: "tools"})` — find related execution flows
3. Read key files listed above for implementation details
