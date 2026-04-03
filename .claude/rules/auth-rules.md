---
paths:
  - "src/auth/**"
  - "src/services/login*"
  - "src/services/session*"
---

# Authentication Rules

## Session Management
- Auth tokens managed by Supabase Auth — never store tokens manually
- Use `supabase.auth.getSession()` for current session
- Handle token refresh automatically via Supabase client
- Clear session state on logout — no stale auth data

## Role-Based Access
- Two roles: `admin` and `technician`
- Check roles server-side via RLS policies, not just client-side guards
- Technician routes: all under `/technician/*`
- Admin routes: all other authenticated routes

## Security
- Never log auth tokens, passwords, or session data
- Rate-limit login attempts (handled by Supabase, but respect the limits)
- Redirect unauthenticated users to `/login`
- Use constant-time comparison for any secret/token checks
