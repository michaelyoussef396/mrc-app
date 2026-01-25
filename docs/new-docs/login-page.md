# Login Page & Authentication System Documentation

## Overview

The MRC internal system uses a role-based authentication system with an Apple-style login page (`NewLogin.tsx`). Users select their role (Admin/Technician/Developer) before signing in, and are redirected to role-appropriate dashboards.

---

## Verification Status

**Last Verified:** 2025-01-26

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication & Password** | ✅ Verified | Empty form validation, invalid email format, wrong credentials all handled correctly |
| **Session Management & Tokens** | ✅ Verified | RememberMeStorage class working, localStorage/sessionStorage toggling properly |
| **Rate Limiting** | ✅ Verified | Client-side rate limiting with 5 attempts/15min window, 30min lockout |
| **Remember Me** | ✅ Verified | Toggle persists preference to localStorage before signIn |
| **Error Messages** | ✅ Verified | Generic "Invalid email or password" shown (prevents enumeration) |
| **Role-Based Routing** | ✅ Verified | Developer → /dashboard, Admin → /admin-coming-soon, Technician → /technician-coming-soon |
| **Login Activity Logging** | ✅ Verified | logLoginActivity called in background (non-blocking) on both success and failure |
| **Device Fingerprinting** | ✅ Verified | FingerprintJS integrated, device info captured on login |
| **IP Logging & Suspicious Activity** | ✅ Verified | Multiple fallback APIs (ip-api.com, ipwho.is, ipapi.co), 5-minute caching |
| **Session Tracking** | ✅ Verified | createSession called in background after login with device/location info |
| **Force Logout All Devices** | ✅ Verified | forceLogoutAllDevices method exposed in AuthContext |
| **Sign Out** | ✅ Verified | Clears tokens, ends session record, redirects to login page |

### Known Limitations

- **IP Geolocation**: May fail if all 3 fallback APIs are rate-limited or blocked; gracefully handles failure
- **Device Fingerprinting**: Not 100% unique across all browsers/devices; used as best-effort identifier
- **Session Monitor**: Development-only component (`import.meta.env.DEV`)

---

## Table of Contents

1. [User Flow](#user-flow)
2. [Role System](#role-system)
3. [Route Protection](#route-protection)
4. [Security Audit](#security-audit)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Session Management](#session-management)
8. [UI Components](#ui-components)
9. [Testing Checklist](#testing-checklist)
10. [File Structure](#file-structure)

---

## User Flow

1. User navigates to `/` (root)
2. System checks for lockout status (rate limiting)
3. User selects their role (Admin/Technician/Developer)
4. User enters email and password
5. Optionally enables "Remember me" for persistent session
6. Clicks "Sign In"
7. System validates:
   - Lockout status (rate limiting check)
   - Form fields (email format, password length)
   - Credentials (via Supabase Auth)
   - Role access (user must have selected role in `user_roles` table)
8. On success: Redirected based on role:
   - **Developer** → `/dashboard`
   - **Admin** → `/admin-coming-soon`
   - **Technician** → `/technician-coming-soon`
9. On failure: Error message displayed with appropriate styling

---

## Role System

### Database Structure

```sql
-- Roles are stored in user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'technician',  -- ENUM: 'admin', 'technician', 'developer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- RLS enabled - users can only see their own roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### Available Roles

| Role | Description | Dashboard Access |
|------|-------------|------------------|
| `admin` | Full system access, manage leads, view reports, assign work | `/admin-coming-soon` (future: full admin dashboard) |
| `technician` | View assigned leads, complete inspections, submit reports | `/technician-coming-soon` (future: technician app) |
| `developer` | Full system access for development and testing | `/dashboard` (current full dashboard) |

### Role Fetching (AuthContext.tsx)

```typescript
const fetchUserRoles = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`role_id, roles(name)`)
    .eq('user_id', userId);

  if (error || !data) return [];
  return data.map((r: any) => r.roles?.name).filter(Boolean);
};
```

### Role Validation at Login (NewLogin.tsx)

```typescript
// After successful authentication, check role access
const selectedRoleLower = role.toLowerCase();
if (!fetchedRoles.includes(selectedRoleLower)) {
  setErrors({ auth: `You don't have access to the ${role} role` });
  return;
}

// Set current role and redirect
setCurrentRole(selectedRoleLower);
redirectByRole(selectedRoleLower);
```

---

## Route Protection

### Components

#### 1. ProtectedRoute (`src/components/ProtectedRoute.tsx`)

Checks if user is authenticated. Redirects to login if not.

```typescript
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

#### 2. RoleProtectedRoute (`src/components/RoleProtectedRoute.tsx`)

Checks if user has required role. Redirects to login if not.

```typescript
export default function RoleProtectedRoute({ allowedRoles, children }) {
  const { hasRole, loading, session } = useAuth();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/" replace />;

  const hasAccess = allowedRoles.some(role => hasRole(role));
  if (!hasAccess) return <Navigate to="/" replace />;

  return <>{children}</>;
}
```

### Route Configuration (App.tsx)

```tsx
// Public routes
<Route path="/" element={<NewLogin />} />
<Route path="/login" element={<Login />} />
<Route path="/forgot-password" element={<ForgotPassword />} />

// Role-specific coming soon pages (protected)
<Route
  path="/admin-coming-soon"
  element={
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["admin"]}>
        <AdminComingSoon />
      </RoleProtectedRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="/technician-coming-soon"
  element={
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["technician"]}>
        <TechnicianComingSoon />
      </RoleProtectedRoute>
    </ProtectedRoute>
  }
/>

// Developer/Admin dashboard routes
<Route
  element={
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["developer", "admin"]}>
        <AppLayout />
      </RoleProtectedRoute>
    </ProtectedRoute>
  }
>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/leads" element={<LeadsManagement />} />
  <Route path="/inspection/:id" element={<InspectionForm />} />
  {/* ... other dashboard routes */}
</Route>
```

### Route Access Matrix

| Route | Public | Auth Required | Roles Required |
|-------|--------|---------------|----------------|
| `/` | Yes | No | - |
| `/login` | Yes | No | - |
| `/forgot-password` | Yes | No | - |
| `/request-inspection` | Yes | No | - |
| `/admin-coming-soon` | No | Yes | admin |
| `/technician-coming-soon` | No | Yes | technician |
| `/dashboard` | No | Yes | developer, admin |
| `/leads/*` | No | Yes | developer, admin |
| `/inspection/*` | No | Yes | developer, admin |
| `/calendar` | No | Yes | developer, admin |
| `/reports` | No | Yes | developer, admin |

---

## Security Audit

### Summary

| Security Aspect | Status | Details |
|----------------|--------|---------|
| Role-based Access (Backend) | Implemented | RLS policies enforce data access |
| Password Validation | Implemented | Supabase Auth handles validation |
| Session Management | Implemented | Configurable localStorage/sessionStorage |
| Token Management | Implemented | JWT with auto-refresh |
| Password Encryption | Implemented | HTTPS + Supabase bcrypt hashing |
| Rate Limiting | Implemented | Client-side: 5 attempts/15min, 30min lockout |
| Route Protection | Implemented | Auth + Role guards |
| Error Handling | Implemented | User-friendly messages, no data leakage |

### 1. Role-based Access - Backend Verification

**How it works:**
- `user_roles` table has RLS (Row Level Security) enabled
- Users can only view their own roles via policy: `auth.uid() = user_id`
- Admins can view/manage all roles via `is_admin()` function
- All data tables (leads, inspections, etc.) have RLS policies using role checks

**Database helper functions:**

```sql
-- Check if user has specific role
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin
CREATE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**RLS Policy Example (leads table):**

```sql
-- Technicians see only assigned leads, admins see all
CREATE POLICY "technicians_view_assigned_leads" ON leads
FOR SELECT USING (
  assigned_to = auth.uid() OR is_admin(auth.uid())
);
```

### 2. Password Validation

- Handled by Supabase Auth
- Wrong password returns generic "Invalid login credentials" error
- UI displays "Invalid email or password" to prevent enumeration attacks

### 3. Session Management

**Storage mechanism (`src/integrations/supabase/client.ts`):**

```typescript
class RememberMeStorage implements SupportedStorage {
  private getStorage(): Storage {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    return rememberMe ? localStorage : sessionStorage;
  }
  // ... getItem, setItem, removeItem methods
}
```

| Remember Me | Storage | Persistence |
|-------------|---------|-------------|
| OFF | sessionStorage | Expires on browser close |
| ON | localStorage | Persists ~30 days |

### 4. Token Management

- Supabase uses JWT tokens
- Auto-refresh enabled: `autoRefreshToken: true`
- Custom proactive refresh every 5 minutes (`useSessionRefresh` hook)
- Token validated on every API request

### 5. Password Encryption

- Transport: HTTPS (TLS 1.2+)
- Storage: Supabase uses bcrypt with per-password salt

### 6. Rate Limiting

See [Rate Limiting](#rate-limiting) section below.

### 7. Route Protection

- **Authentication:** ProtectedRoute checks for valid session
- **Authorization:** RoleProtectedRoute checks user has required role
- **Backend:** RLS policies enforce data access regardless of frontend

---

## Rate Limiting

### Overview

Client-side rate limiting prevents brute force attacks by tracking failed login attempts and locking out users after too many failures.

**File:** `src/utils/rateLimiter.ts`

### Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Max Attempts | 5 | Failed attempts before lockout |
| Window Duration | 15 minutes | Time window for counting attempts |
| Lockout Duration | 30 minutes | How long user is locked out |

### How It Works

1. **On Failed Login:**
   - Increment attempt counter
   - If first attempt in window, record timestamp
   - If max attempts reached, set lockout timestamp
   - Store in localStorage

2. **On Page Load:**
   - Check lockout status
   - If locked, display countdown timer
   - Disable form until lockout expires

3. **On Successful Login:**
   - Clear all attempt tracking
   - Remove from localStorage

### API Functions

```typescript
// Get current login attempt data from localStorage
export function getLoginAttempts(): LoginAttempt;

// Record a failed login attempt, returns updated data
export function recordFailedAttempt(): LoginAttempt;

// Clear all login attempt tracking (call on successful login)
export function clearLoginAttempts(): void;

// Check if user is currently locked out
export function isLockedOut(): { locked: boolean; remainingMs: number };

// Get remaining attempts before lockout
export function getRemainingAttempts(): number;

// Format remaining lockout time for display (e.g., "5 minutes")
export function formatLockoutTime(remainingMs: number): string;
```

### Data Structure

```typescript
interface LoginAttempt {
  count: number;          // Number of failed attempts
  firstAttempt: number;   // Timestamp of first attempt in window
  lockedUntil: number | null;  // Lockout expiry timestamp
}
```

### localStorage Key

| Key | Purpose |
|-----|---------|
| `mrc_login_attempts` | Stores attempt count, timestamps, lockout status |

### UI Behavior

When locked out:
- Orange warning banner with lock icon and countdown timer
- All form inputs disabled (50% opacity)
- Sign In button disabled
- Timer updates every second

```tsx
{lockoutRemaining > 0 && (
  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-orange-500">lock_clock</span>
      <div>
        <p className="text-orange-800 font-medium">Too many failed attempts</p>
        <p className="text-orange-600 text-sm">
          Please try again in {formatLockoutTime(lockoutRemaining)}
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Error Handling

### Error Types

The login form uses a typed error system to provide appropriate UI feedback:

```typescript
type ErrorType = "validation" | "auth" | "network" | "lockout" | "role";

interface FormErrors {
  email?: string;      // Email validation error
  password?: string;   // Password validation error
  auth?: string;       // Authentication error
  network?: string;    // Network/connectivity error
  type?: ErrorType;    // Error category for UI styling
}
```

### Error Message Translation

The `getErrorMessage()` function translates Supabase errors to user-friendly messages:

```typescript
const getErrorMessage = (error: unknown): { message: string; type: ErrorType } => {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { message: "Unable to connect. Please check your internet connection.", type: "network" };
  }

  // Supabase error codes
  const errorCode = (error as any)?.code;
  const errorMessage = (error as any)?.message?.toLowerCase() || '';

  // Invalid credentials (generic to prevent enumeration)
  if (errorCode === 'invalid_credentials' || errorMessage.includes('invalid login credentials')) {
    return { message: "Invalid email or password", type: "auth" };
  }

  // Email not confirmed
  if (errorCode === 'email_not_confirmed') {
    return { message: "Please verify your email address before signing in", type: "auth" };
  }

  // Rate limited by Supabase
  if (errorCode === 'over_request_rate_limit' || errorMessage.includes('rate limit')) {
    return { message: "Too many requests. Please wait a moment and try again.", type: "lockout" };
  }

  // ... other error handling
};
```

### Error Message Mapping

| Supabase Error | User Message | Type |
|----------------|--------------|------|
| `invalid_credentials` | "Invalid email or password" | auth |
| `email_not_confirmed` | "Please verify your email address before signing in" | auth |
| `over_request_rate_limit` | "Too many requests. Please wait a moment and try again." | lockout |
| `user_not_found` | "Invalid email or password" | auth |
| `session_expired` | "Your session has expired. Please sign in again." | auth |
| Network failure | "Unable to connect. Please check your internet connection." | network |
| Timeout | "Request timed out. Please try again." | network |
| Server error (500) | "Something went wrong. Please try again later." | auth |
| Unknown | "An unexpected error occurred. Please try again." | auth |

### Form Validation

The `validateForm()` function provides detailed client-side validation:

```typescript
const validateForm = (): boolean => {
  const newErrors: FormErrors = {};

  // Email validation
  if (!email.trim()) {
    newErrors.email = "Please enter your email";
    newErrors.type = "validation";
  } else if (email.length > 254) {
    newErrors.email = "Email address is too long";
    newErrors.type = "validation";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newErrors.email = "Please enter a valid email address";
    newErrors.type = "validation";
  }

  // Password validation
  if (!password) {
    newErrors.password = "Please enter your password";
    newErrors.type = "validation";
  } else if (password.length < 6) {
    newErrors.password = "Password must be at least 6 characters";
    newErrors.type = "validation";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Empty | "Please enter your email" |
| Email | > 254 chars | "Email address is too long" |
| Email | Invalid format | "Please enter a valid email address" |
| Password | Empty | "Please enter your password" |
| Password | < 6 chars | "Password must be at least 6 characters" |

### UI Error Display

#### 1. Lockout Banner (Orange)

```tsx
<div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
  <span className="material-symbols-outlined text-orange-500">lock_clock</span>
  <p className="text-orange-800 font-medium">Too many failed attempts</p>
  <p className="text-orange-600 text-sm">Please try again in X minutes</p>
</div>
```

#### 2. Network Error Banner (Orange)

```tsx
<div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
  <span className="material-symbols-outlined text-orange-500">wifi_off</span>
  <p className="text-orange-800 font-medium">Connection Issue</p>
  <p className="text-orange-600 text-sm">{errors.network}</p>
</div>
```

#### 3. Authentication Error Banner (Red)

```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-4">
  <span className="material-symbols-outlined text-red-500">error</span>
  <p className="text-red-700">{errors.auth}</p>
</div>
```

#### 4. Role Access Error Banner (Orange)

```tsx
<div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
  <span className="material-symbols-outlined text-orange-500">person_off</span>
  <p className="text-orange-700">{errors.auth}</p>
</div>
```

#### 5. Inline Field Errors (Red)

```tsx
<p className="text-[#FF3B30] text-sm flex items-center gap-1 mt-1.5">
  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
  {errors.email}
</p>
```

### Error Priority

Errors are displayed in this priority order:
1. Lockout (blocks all interaction)
2. Network (connection issues)
3. Role access (wrong role selected)
4. Authentication (wrong credentials)
5. Validation (inline field errors)

---

## Session Management

### localStorage Keys

| Key | Purpose | Set By |
|-----|---------|--------|
| `mrc_remember_me_preference` | Controls session persistence | AuthContext before login |
| `mrc_remembered_email` | Pre-fills email field | NewLogin on successful login |
| `mrc_selected_role` | Pre-selects role | NewLogin on role change |
| `mrc_current_role` | Currently active role | AuthContext after login |
| `mrc_login_attempts` | Rate limiting data | rateLimiter.ts |
| `sb-{project}-auth-token` | JWT session token | Supabase Auth |

### Session Refresh (`useSessionRefresh.ts`)

```typescript
// Checks session every 5 minutes
// Refreshes token if expiring in < 10 minutes
useEffect(() => {
  const interval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const timeUntilExpiry = session.expires_at - now;
      if (timeUntilExpiry < 600) {
        await supabase.auth.refreshSession();
      }
    }
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## UI Components

### Visual Design

| Element | Color |
|---------|-------|
| Primary (button, links, logo bg) | `#007AFF` |
| Error | `#FF3B30` |
| Warning (lockout, network) | `#F97316` (orange-500) |
| Success (toggle on) | `#34C759` |
| Background | `#f5f7f8` |
| Text | `#1d1d1f` |
| Muted text | `#86868b` |
| Input border | `#e5e5e5` |

### Layout Specifications

- Max width: 400px
- Logo container: 100x100px with `#007AFF` background, 22px border radius
- Logo image: 80x80px
- Input height: 52px
- Button height: 52px
- Touch targets: Minimum 48px (mobile requirement)

### Remember Me Toggle (iOS-style)

```tsx
<Switch
  className={cn(
    "h-[31px] w-[51px] data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#e5e5e5]",
    "[&>span]:h-[27px] [&>span]:w-[27px] [&>span]:data-[state=checked]:translate-x-[20px]",
    "[&>span]:shadow-md [&>span]:bg-white"
  )}
/>
```

### Error States

- Red border (`#FF3B30`) on invalid inputs
- Light red background tint on input container
- Inline error messages below inputs with error icon
- Auth errors displayed in red box above button
- Network/lockout errors displayed in orange box above button

### Loading State

- Spinner + "Signing in..." text on button
- All inputs disabled with 50% opacity
- Segmented control disabled

### Disabled State (Lockout)

- All inputs disabled with 50% opacity
- Segmented control disabled
- Orange lockout banner with countdown timer
- Sign In button disabled

---

## Testing Checklist

### Authentication

- [ ] Login with valid credentials redirects to appropriate dashboard
- [ ] Login with invalid credentials shows "Invalid email or password"
- [ ] Login with role user doesn't have shows "You don't have access to this role"
- [ ] Empty email shows "Please enter your email"
- [ ] Email > 254 chars shows "Email address is too long"
- [ ] Invalid email format shows "Please enter a valid email address"
- [ ] Empty password shows "Please enter your password"
- [ ] Password < 6 chars shows "Password must be at least 6 characters"

### Role-based Access

- [ ] Developer login → redirects to `/dashboard`
- [ ] Admin login → redirects to `/admin-coming-soon`
- [ ] Technician login → redirects to `/technician-coming-soon`
- [ ] Technician trying to access `/dashboard` → redirects to `/`
- [ ] Admin trying to access `/technician-coming-soon` → redirects to `/`
- [ ] Unauthenticated user trying `/dashboard` → redirects to `/`

### Rate Limiting

- [ ] After 5 failed attempts, lockout banner appears
- [ ] Lockout countdown timer updates every second
- [ ] Form is disabled during lockout (inputs, button greyed out)
- [ ] After 30 minutes, lockout expires and form is enabled
- [ ] Successful login clears attempt counter
- [ ] Closing browser and reopening preserves lockout state

### Error Handling

- [ ] Network error shows orange banner with wifi_off icon
- [ ] Auth error shows red banner with error icon
- [ ] Role error shows orange banner with person_off icon
- [ ] Inline errors show red text with error icon
- [ ] Supabase rate limit error shows appropriate message

### Session Management

- [ ] Remember Me OFF: session expires on browser close
- [ ] Remember Me ON: session persists after browser close
- [ ] Session auto-refreshes before expiry
- [ ] Sign out clears session from both storages

### UI/UX

- [ ] Touch targets are at least 48px
- [ ] No horizontal scroll on 375px viewport
- [ ] Role selection persists to localStorage
- [ ] Email pre-fills if previously remembered
- [ ] Show/hide password toggle works
- [ ] Loading state disables all inputs
- [ ] Lockout state disables all inputs

---

## File Structure

```
src/
├── pages/
│   ├── NewLogin.tsx              # Main login page (Apple-style)
│   ├── Login.tsx                 # Legacy login (fallback)
│   ├── AdminComingSoon.tsx       # Admin placeholder dashboard
│   └── TechnicianComingSoon.tsx  # Technician placeholder dashboard
├── components/
│   ├── ProtectedRoute.tsx        # Auth guard (checks session)
│   ├── RoleProtectedRoute.tsx    # Role guard (checks role access)
│   └── ui/
│       └── switch.tsx            # iOS-style toggle component
├── contexts/
│   └── AuthContext.tsx           # Auth provider (signIn, roles, session)
├── integrations/
│   └── supabase/
│       └── client.ts             # Supabase client with RememberMeStorage
├── lib/
│   └── hooks/
│       └── useSessionRefresh.ts  # Proactive token refresh hook
├── utils/
│   └── rateLimiter.ts            # Client-side rate limiting utility
└── assets/
    └── logo-large.png            # MRC logo (white, for blue background)

supabase/
└── migrations/
    ├── 20251028135212_*.sql      # user_roles table + RLS policies
    ├── 20251111000001_*.sql      # RLS on leads table
    └── 20260109000003_*.sql      # Fixed is_admin() function

docs/
└── new-docs/
    └── login-page.md             # This documentation
```

---

## Maintenance Notes

1. **Role changes:** To add/remove roles, update both:
   - `app_role` ENUM in database
   - Role selector in `NewLogin.tsx`
   - Route guards in `App.tsx`

2. **Coming soon pages:** When building full dashboards:
   - Replace `AdminComingSoon` with full admin dashboard
   - Replace `TechnicianComingSoon` with technician app
   - Update route guards accordingly

3. **Rate limiting adjustments:** To change rate limiting settings:
   - Update constants in `src/utils/rateLimiter.ts`:
     - `MAX_ATTEMPTS` (default: 5)
     - `WINDOW_MS` (default: 15 minutes)
     - `LOCKOUT_MS` (default: 30 minutes)

4. **Error message customization:** To add/modify error messages:
   - Update `getErrorMessage()` function in `NewLogin.tsx`
   - Add new error codes to the switch statement
   - Ensure consistent error types for UI styling

5. **Security improvements to consider:**
   - CAPTCHA after failed attempts
   - Session timeout warnings

6. **Offline support:** Google Fonts loaded externally; consider self-hosting for PWA offline support.

---

## Login Security System

### Overview

The MRC system includes comprehensive login security features:
- **Activity Logging**: Every login attempt (success/failure) is recorded
- **Device Detection**: Devices are fingerprinted and tracked per user
- **Location Tracking**: IP geolocation for each login attempt
- **Suspicious Activity Detection**: Automatic flagging of anomalies
- **Session Management**: Force logout from all devices capability

### Database Tables

| Table | Purpose |
|-------|---------|
| `login_activity` | Records all login attempts with device/location info |
| `user_devices` | Stores known devices per user with trust status |
| `user_sessions` | Tracks active sessions for force logout |
| `suspicious_activity` | Flags suspicious events for review |

### Device Fingerprinting

**File:** `src/utils/deviceFingerprint.ts`

Uses FingerprintJS to generate unique device identifiers:

```typescript
interface DeviceInfo {
  fingerprint: string;           // Unique device ID
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;               // Chrome, Safari, Firefox, etc.
  browserVersion: string;
  os: string;                    // Windows, macOS, iOS, Android
  osVersion: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

// Get device info
const deviceInfo = await getDeviceInfo();

// Get human-readable device name
const name = getDeviceName(deviceInfo); // "Chrome on Windows"
```

### IP & Location Service

**File:** `src/utils/ipLocation.ts`

Fetches user's IP and geographic location:

```typescript
interface LocationInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat?: number;
  lon?: number;
  isp?: string;
}

// Get location (cached for 5 minutes)
const location = await getLocationInfo();

// Format for display
const display = formatLocation(location); // "Melbourne, Australia"

// Check for impossible travel
const isSuspicious = isImpossibleTravel(lastLocation, currentLocation, timeDiffMs);
```

### Login Activity Logging

**File:** `src/services/loginActivityService.ts`

Every login attempt is automatically logged:

```typescript
// Logged on every signIn call (success or failure)
await logLoginActivity({
  userId: user?.id,           // null for failed attempts
  email: 'user@example.com',
  success: true,
  errorMessage: null,         // Error message for failed attempts
});
```

**Logged Data:**
- User ID (if successful)
- Email address
- Success/failure status
- Device fingerprint, type, browser, OS
- IP address, city, region, country
- User agent string
- Error message (if failed)
- Timestamp

### Suspicious Activity Detection

Automatically detects and flags:

| Activity Type | Severity | Trigger |
|--------------|----------|---------|
| `new_device` | Medium | First login from unknown device |
| `new_location` | Low | First login from new country |
| `multiple_failures` | Medium/High | 3+ failed attempts in 15 minutes |
| `impossible_travel` | High | Login from different country within 2 hours |

```typescript
// Check for suspicious patterns after successful login
await checkForSuspiciousActivity(userId, currentLocation, currentDevice);
```

### Session Management

**File:** `src/services/sessionService.ts`

Manage user sessions and devices:

```typescript
// Create session record on login
await createSession(userId, deviceId, sessionToken, ipAddress, location);

// End session on logout
await endSession(userId, sessionToken, 'logout');

// Force logout from all devices (except current)
await forceLogoutAllDevices(userId, currentSessionToken);

// Get all active sessions
const sessions = await getActiveSessions(userId);

// Get all user devices
const devices = await getUserDevices(userId);

// Trust/untrust a device
await trustDevice(userId, deviceId);
await untrustDevice(userId, deviceId);

// Remove a device (ends all its sessions)
await removeDevice(userId, deviceId);
```

### AuthContext Integration

New methods available in `useAuth()`:

```typescript
const {
  // Existing methods...
  signIn,
  signOut,

  // New session/device management
  forceLogoutAllDevices,  // Force logout from all/other devices
  getActiveSessions,      // Get list of active sessions
  getUserDevices,         // Get list of known devices
  removeDevice,           // Remove a device
  trustDevice,            // Mark device as trusted
  untrustDevice,          // Remove trust from device
} = useAuth();
```

### RLS Policies

| Table | User Access | Admin Access |
|-------|-------------|--------------|
| `login_activity` | View own | View all |
| `user_devices` | Full CRUD own | - |
| `user_sessions` | View/manage own | - |
| `suspicious_activity` | View own | View all, update |

### Testing Checklist (Security)

- [ ] Login creates entry in `login_activity` table
- [ ] Failed login records error message
- [ ] New device creates `user_devices` entry
- [ ] New device flags `suspicious_activity` (new_device)
- [ ] Login from new country flags `suspicious_activity` (new_location)
- [ ] 3+ failed attempts flags `suspicious_activity` (multiple_failures)
- [ ] Force logout ends all other sessions
- [ ] Removing device ends its sessions
- [ ] Trust/untrust device updates correctly

### File Structure (Security)

```
src/
├── utils/
│   ├── deviceFingerprint.ts    # Device detection & fingerprinting
│   ├── ipLocation.ts           # IP geolocation service
│   └── rateLimiter.ts          # Client-side rate limiting
├── services/
│   ├── loginActivityService.ts # Login logging & suspicious activity
│   └── sessionService.ts       # Session & device management
└── contexts/
    └── AuthContext.tsx         # Auth provider with security integration

supabase/migrations/
└── 20260125000001_login_security_tables.sql  # Security tables
```
