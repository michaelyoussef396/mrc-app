# MCP Server Stack — MRC Lead Management System

**Date:** 2026-04-03
**Purpose:** Document all MCP servers for the MRC project — what's connected, what's recommended, and why.

---

## Currently Connected

### 1. Supabase MCP (Essential)

| Detail | Value |
|--------|-------|
| **Status** | Connected and active |
| **What it does** | Direct database operations, migrations, table management, SQL execution |
| **Why MRC needs it** | Core backend — every feature depends on Supabase. Run migrations for Phase 2 tables, query data for debugging, manage RLS policies. |
| **Priority** | Essential |

**Config (`.mcp.json`):**
```json
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=ecyivrxjpsmjmexqatym"],
  "env": { "SUPABASE_ACCESS_TOKEN": "sbp_..." }
}
```

**Required Env Vars:** `SUPABASE_ACCESS_TOKEN` (personal access token from supabase.com/dashboard/account/tokens)

**What it unlocks:**
- `execute_sql` — Run queries directly (debug data, verify RLS, check audit logs)
- `list_tables` — See current schema
- `apply_migration` — Apply Phase 2 migrations (job_completions, invoices, etc.)
- `get_project_url` — Verify project endpoint
- `get_publishable_keys` — Check anon key
- `list_migrations` — Verify migration history
- `list_extensions` — Check pg_cron, pg_net status

**Security:** Access token grants full project management. Rotate regularly. Never commit `.mcp.json`.

**Allowed Tools (settings.local.json):**
- `mcp__supabase__execute_sql`
- `mcp__supabase__list_tables`
- `mcp__supabase__apply_migration`
- `mcp__supabase__get_project_url`
- `mcp__supabase__get_publishable_keys`

---

### 2. GitHub MCP (Essential)

| Detail | Value |
|--------|-------|
| **Status** | Connected |
| **What it does** | GitHub operations — issues, PRs, code search, file management |
| **Why MRC needs it** | PR workflow, issue tracking, code reviews for Phase 2 development |
| **Priority** | Essential |

**Config:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_..." }
}
```

**Required Env Vars:** `GITHUB_PERSONAL_ACCESS_TOKEN` (fine-grained PAT with repo access)

**What it unlocks:**
- Create/manage PRs for Phase 2 feature branches
- Search code across the repo
- Create issues for Phase 2 tasks
- Review PR diffs and comments

**Security:** PAT should be scoped to MRC repo only. Fine-grained tokens preferred over classic.

---

### 3. Context7 MCP (Recommended)

| Detail | Value |
|--------|-------|
| **Status** | Connected |
| **What it does** | Fetches current documentation for libraries, frameworks, SDKs |
| **Why MRC needs it** | React 18, Supabase JS client, Tailwind, shadcn/ui, Vite, React Router v6 — ensures Claude uses current API syntax, not stale training data |
| **Priority** | Recommended |

**Config:**
```json
{
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}
```

**Required Env Vars:** None

**What it unlocks:**
- Up-to-date docs for React Query, Supabase client, Zod, react-hook-form
- Correct API usage for Phase 2 development
- Version migration guidance

---

### 4. Memory MCP (Recommended)

| Detail | Value |
|--------|-------|
| **Status** | Connected |
| **What it does** | Persistent knowledge graph across sessions |
| **Why MRC needs it** | Remembers project context, decisions, patterns across Claude Code sessions |
| **Priority** | Recommended |

**Config:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**Required Env Vars:** None

**What it unlocks:**
- Cross-session context retention (project decisions, architecture patterns)
- Entity and relationship tracking

**Note:** Claude Code also has its own built-in memory system (MEMORY.md + memory files). The MCP Memory server is complementary but may overlap. Consider which to rely on for which type of information.

---

### 5. Fetch MCP (Nice-to-Have)

| Detail | Value |
|--------|-------|
| **Status** | Connected |
| **What it does** | HTTP requests — fetch URLs, APIs, web pages |
| **Why MRC needs it** | Test Edge Function endpoints, verify deployed URLs, fetch API docs |
| **Priority** | Nice-to-have |

**Config:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-fetch"]
}
```

**Required Env Vars:** None

**What it unlocks:**
- Test Edge Function responses directly
- Verify Vercel deployment endpoints
- Fetch external API docs

---

### 6. Slack MCP (Recommended)

| Detail | Value |
|--------|-------|
| **Status** | Connected (custom local server) |
| **What it does** | Read/send Slack messages |
| **Why MRC needs it** | Verify Slack notifications are firing correctly, debug notification formatting |
| **Priority** | Recommended |

**Config:**
```json
{
  "command": "node",
  "args": ["/Users/michaelyoussef/mrc-app-1/slack-mcp-server"]
}
```

**Required Env Vars:** Configured within the local server

**What it unlocks:**
- Verify notification delivery
- Test new Slack event types for Phase 2 (job_completed, invoice_sent, etc.)
- Read channel history for debugging

---

### 7. Resend MCP (Recommended)

| Detail | Value |
|--------|-------|
| **Status** | Connected (custom local server) |
| **What it does** | Send emails via Resend API |
| **Why MRC needs it** | Test email templates directly, verify delivery, debug email formatting |
| **Priority** | Recommended |

**Config:**
```json
{
  "command": "node",
  "args": ["/Users/michaelyoussef/mrc-app-1/mcp-send-email/build/index.js"],
  "env": {
    "RESEND_API_KEY": "re_...",
    "SENDER_EMAIL_ADDRESS": "admin@mrcsystem.com"
  }
}
```

**Required Env Vars:** `RESEND_API_KEY`, `SENDER_EMAIL_ADDRESS`

**What it unlocks:**
- Send test emails for Phase 2 templates (job report, invoice, Google review)
- Verify branded template rendering
- Debug email delivery issues

---

## Connected via Claude.ai (Remote MCPs)

These are connected through Claude.ai's built-in MCP integration, not via `.mcp.json`:

### 8. Playwright MCP (Essential for Testing)

| Detail | Value |
|--------|-------|
| **Status** | Available via Claude.ai |
| **What it does** | Browser automation — navigate, click, screenshot, form interaction |
| **Why MRC needs it** | Visual testing at 375px/768px/1440px, verify mobile UI, test form flows |
| **Priority** | Essential (for testing) |

**What it unlocks:**
- Screenshot pages at 375px viewport (mobile-first verification)
- Test touch target sizes (48px minimum)
- Navigate through form flows (inspection, job completion)
- Verify PDF rendering in browser
- Test offline banner behavior

**Allowed Tools (settings.local.json):**
- `mcp__playwright__browser_resize`
- `mcp__playwright__browser_navigate`
- `mcp__playwright__browser_wait_for`
- `mcp__playwright__browser_take_screenshot`
- `mcp__playwright__browser_close`
- `mcp__playwright__browser_click`

---

### 9. Sentry MCP (Recommended)

| Detail | Value |
|--------|-------|
| **Status** | Available via Claude.ai |
| **What it does** | Query Sentry issues, events, traces |
| **Why MRC needs it** | Debug production errors, trace performance issues, review error trends |
| **Priority** | Recommended |

**What it unlocks:**
- Search production issues by error type
- Analyze error frequency and user impact
- Review performance traces for slow operations
- Triage exceptions during Phase 2 deployment

---

### 10. Figma MCP (Nice-to-Have)

| Detail | Value |
|--------|-------|
| **Status** | Available via Claude.ai |
| **What it does** | Read Figma designs, extract design tokens, generate code from designs |
| **Why MRC needs it** | Only if MRC designs are in Figma. Currently not using Figma. |
| **Priority** | Nice-to-have (skip unless Figma is adopted) |

---

### 11. PSD Parser MCP (Nice-to-Have)

| Detail | Value |
|--------|-------|
| **Status** | Available via Claude.ai |
| **What it does** | Parse PSD files, extract layers, colors, text, vectors |
| **Why MRC needs it** | MRC has PSD files in the repo (logo, report template). Useful for extracting design assets. |
| **Priority** | Nice-to-have |

---

## Recommended Additions

### 12. Puppeteer MCP (Consider for Phase 2)

| Detail | Value |
|--------|-------|
| **What it does** | Headless Chrome automation for PDF generation testing |
| **Why MRC needs it** | Test PDF generation pipeline (HTML → Canvas → PDF). Verify multi-page PDF rendering. |
| **Priority** | Consider |
| **Install** | Already have `puppeteer@^24.29.1` as devDependency |

**Use Cases for MRC:**
- Headless PDF generation testing
- Verify job report PDF renders correctly (9 pages)
- Screenshot comparison for visual regression

---

## Summary Table

| MCP Server | Status | Priority | Purpose |
|------------|--------|----------|---------|
| Supabase | Connected | Essential | Database, migrations, RLS |
| GitHub | Connected | Essential | PRs, issues, code search |
| Playwright | Claude.ai | Essential | Visual testing at 375px |
| Context7 | Connected | Recommended | Current library docs |
| Memory | Connected | Recommended | Cross-session knowledge |
| Slack | Connected | Recommended | Notification verification |
| Resend | Connected | Recommended | Email template testing |
| Sentry | Claude.ai | Recommended | Production error triage |
| Fetch | Connected | Nice-to-have | API testing |
| Figma | Claude.ai | Nice-to-have | Only if using Figma |
| PSD Parser | Claude.ai | Nice-to-have | Extract design assets |

---

## Security Considerations

1. **Never commit `.mcp.json`** — Contains API keys. Already in `.gitignore`.
2. **Rotate keys in `.mcp.json`** regularly — Supabase access token, GitHub PAT, Resend key all need rotation (see API_AUDIT.md).
3. **Scope tokens minimally** — GitHub PAT should be fine-grained, repo-scoped. Supabase token for specific project only.
4. **MCP servers run locally** — They execute on your machine as child processes. Custom servers (Slack, Resend) should be reviewed for security.
5. **Allowed tools whitelist** — `settings.local.json` restricts which MCP tools Claude can use. Review and expand as needed for Phase 2.

---

*Review this stack periodically. Add MCPs that reduce friction; remove ones that don't earn their keep.*
