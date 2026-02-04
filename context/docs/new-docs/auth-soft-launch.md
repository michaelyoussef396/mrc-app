# Auth System - Soft Launch Configuration

**Date:** 2025-02-02
**Purpose:** Slim down enterprise-grade auth for 4 internal users
**Status:** Active (re-enable features when scaling to white-label)

---

## What Was Disabled

The auth system was designed for enterprise scale but causes overhead for 4 internal users:

| Issue | Solution |
|-------|----------|
| 4 onAuthStateChange listeners fighting each other | Reduced to 2 listeners |
| "Loading timeout" and "Role fetch timeout" warnings | Removed Promise.race timeout wrappers |
| Console spam (#_acquireLock lines) | Disabled debug mode in client.ts |
| 30-minute lockout after 5 failed attempts | Removed rate limiting (bad for gloved technicians) |
| External API calls on every login | Disabled FingerprintJS + 3 IP geolocation APIs |
| SessionMonitor widget overlay | Component returns null |

---

## Files Modified

### 1. `src/contexts/AuthContext.tsx`
- Commented out imports: `logLoginActivity`, `createSession`, `endSession`, `getDeviceInfo`, `getLocationInfo`, `formatLocation`
- Removed 10-second loading timeout
- Removed Promise.race wrappers around `fetchUserRoles()`
- Disabled security logging in `signIn()` function
- Disabled session ending in `signOut()` function

### 2. `src/integrations/supabase/client.ts`
- Disabled `debug: import.meta.env.DEV` (was causing #_acquireLock spam)
- Simplified auth state logging to single line

### 3. `src/components/debug/SessionMonitor.tsx`
- Added early `return null` to disable component
- Removes one onAuthStateChange listener and 30s polling interval

### 4. `src/lib/hooks/useSessionRefresh.ts`
- Removed all console.log except errors
- Silent operation for normal session checks

### 5. `src/pages/Login.tsx`
- Commented out rateLimiter imports
- Removed lockout state and UI
- Removed failed attempt tracking
- Simplified error handling

---

## What Stays Active

These features remain fully functional:

- **Role-based access control** (RLS policies + RoleProtectedRoute)
- **Password reset flow** (email link + password update)
- **Remember Me toggle** (localStorage vs sessionStorage)
- **Session persistence** (tokens saved across page reloads)
- **Auto token refresh** (Supabase built-in + useSessionRefresh hook)
- **User role fetching** (from user_roles + roles tables)
- **Route protection** (redirects unauthorized users)

---

## onAuthStateChange Listeners (Current Count: 2)

1. `src/integrations/supabase/client.ts` - Minimal logger (dev only, single line)
2. `src/contexts/AuthContext.tsx` - Main auth state management

**Removed listeners:**
- SessionMonitor.tsx (disabled)
- Verbose client.ts logging (simplified)

---

## Checklist to Re-Enable for White-Label

When scaling to multiple clients, uncomment these in order:

### Phase 1: Monitoring
- [ ] `SessionMonitor.tsx` - Remove early return null
- [ ] `client.ts` - Re-enable `debug: import.meta.env.DEV`
- [ ] `useSessionRefresh.ts` - Restore console logs if needed for debugging

### Phase 2: Security Logging
- [ ] `AuthContext.tsx` - Uncomment imports at top
- [ ] `AuthContext.tsx` - Uncomment `logLoginActivity()` calls in signIn
- [ ] `AuthContext.tsx` - Uncomment session creation/ending

### Phase 3: Device Tracking
- [ ] `AuthContext.tsx` - Uncomment `getDeviceInfo()` and `getLocationInfo()` calls
- [ ] Verify FingerprintJS and IP geolocation APIs are still configured

### Phase 4: Rate Limiting
- [ ] `Login.tsx` - Uncomment rateLimiter imports
- [ ] `Login.tsx` - Restore lockoutRemaining state
- [ ] `Login.tsx` - Restore lockout check useEffect
- [ ] `Login.tsx` - Restore lockout UI banner
- [ ] `Login.tsx` - Restore recordFailedAttempt/clearLoginAttempts calls

---

## Risk Assessment

**Rollback:** All changes are comment-outs. Uncomment to restore.

**Security impact:**
- Rate limiting disabled (acceptable for 4 trusted users)
- Login activity not logged (can re-enable when auditing needed)
- Device fingerprinting disabled (was for multi-device management)

**Performance impact:**
- Faster login (no external API calls)
- Cleaner console (no debug spam)
- Fewer listeners (reduced memory/CPU)
