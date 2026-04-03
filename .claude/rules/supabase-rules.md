---
paths:
  - "supabase/**"
  - "src/lib/supabase*"
---

# Supabase Conventions

## Row Level Security
- ALL tables MUST have RLS policies — no exceptions
- Test RLS with both admin and technician roles
- Use `auth.uid()` for ownership checks, never trust client-provided user IDs

## Migrations
- Never modify existing migration files
- One concern per migration (don't mix schema + data + RLS)
- Always include a reversible path (document how to undo)
- Test migrations against the dev project before production

## Edge Functions
- Deploy via `supabase functions deploy <name>`
- Set secrets via `supabase secrets set KEY=value`
- Always validate input at the function boundary
- Return consistent JSON response shapes with appropriate status codes
- Use `SUPABASE_SERVICE_ROLE_KEY` only when bypassing RLS is required

## Client Usage
- Use the typed Supabase client from `src/lib/supabase.ts`
- Handle PostgREST errors (PGRST200 = missing FK relationship in join query)
- Prefer `.select()` with explicit columns over `SELECT *`
