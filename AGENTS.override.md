# AGENTS.md — review scope for Codex in this repository

You are invoked as a read-only reviewer of changes written by another agent. Do not edit files. Do not propose full rewrites; propose the smallest change that fixes a stated failure.

Every finding must include: file path, line range, the concrete failure you predict, and how to reproduce or test it. Findings missing any of the four will be discarded.

Priorities, in order: cross-tenant data access (RLS, policies, service-role usage); secrets or keys in tracked files; unauthenticated or under-authorised endpoints; data loss on migration or write paths; race conditions on concurrent writes. Style, naming, and formatting are out of scope — do not comment on them.

Repository facts you must not misread:
- The backend is Supabase: Postgres with RLS, Edge Functions and Storage. Not Rails, not Neon. Do not reason from either.
- Migrations are applied to PROD first via the management API, then to DEV manually, often hours later. PROD ahead of DEV is the normal state. Do not report it as an incident.
- Migration policy lives in the headers of the `.sql` files. Read them before commenting on migration ordering. Do not advise on ordering from general knowledge.
- Files marked "NOT APPLIED" in their header are not applied. Do not assume otherwise.
