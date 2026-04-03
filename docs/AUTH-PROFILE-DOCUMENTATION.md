# MRC Lead Management System - Authentication & Profile Pages Documentation

**Version:** 1.0.0
**Last Updated:** 2026-01-10
**System:** MRC Lead Management System (Mould & Restoration Co.)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Architecture](#2-data-architecture)
3. [Page Documentation](#3-page-documentation)
   - [Login Page](#31-login-page-login)
   - [Forgot Password Page](#32-forgot-password-page-forgot-password)
   - [Reset Password Page](#33-reset-password-page-reset-password)
   - [Profile Page](#34-profile-page-profile)
   - [Settings Page](#35-settings-page-settings)
4. [Edge Functions](#4-edge-functions)
5. [Supabase Configuration](#5-supabase-configuration)
6. [Component Reference](#6-component-reference)
7. [Environment Variables](#7-environment-variables)
8. [Migrations](#8-migrations)

---

## 1. System Overview

### Authentication Architecture

The MRC Lead Management System uses **Supabase Auth** as the sole authentication provider. User data is stored in two locations:

| Data Type | Storage Location |
|-----------|------------------|
| Authentication (email, password) | `auth.users` (managed by Supabase) |
| Profile data (first_name, last_name, phone) | `auth.users.raw_user_meta_data` (JSONB) |

### Key Design Decisions

1. **No `profiles` table** - All user profile data is stored in `user_metadata` within `auth.users`
2. **No `user_roles` table** - Roles are currently disabled (RLS uses simple authenticated checks)
3. **Edge Functions for admin operations** - User CRUD requires service role key (handled by `manage-users` Edge Function)
4. **Implicit auth flow** - Required for password reset to work correctly

---

## 2. Data Architecture

### User Data Storage

```
auth.users (Supabase Auth - managed by Supabase)
├── id (UUID) - Primary key
├── email (TEXT) - Login email
├── encrypted_password - Managed by Supabase
├── created_at (TIMESTAMPTZ)
├── last_sign_in_at (TIMESTAMPTZ)
└── raw_user_meta_data (JSONB)
    ├── first_name (STRING)
    ├── last_name (STRING)
    ├── phone (STRING)
    └── is_active (BOOLEAN)
```

### Accessing User Data

| Method | When to Use | Access Level |
|--------|-------------|--------------|
| `supabase.auth.getUser()` | Get current authenticated user | Authenticated user only |
| `supabase.auth.updateUser()` | Update current user's data | Authenticated user only |
| `supabase.auth.admin.listUsers()` | List all users | Service role key required |
| `supabase.auth.admin.getUserById()` | Get specific user | Service role key required |
| `supabase.auth.admin.updateUserById()` | Update any user | Service role key required |
| `supabase.auth.admin.deleteUser()` | Delete user | Service role key required |

---

## 3. Page Documentation

---

### 3.1 Login Page (`/login`)

**File:** `src/pages/Login.tsx`

#### Purpose
Authenticates users using email and password credentials.

#### Supabase Auth Methods Used

| Method | Location | Purpose |
|--------|----------|---------|
| `signInWithPassword()` | AuthContext.tsx:78 | Authenticate user with email/password |
| `onAuthStateChange()` | AuthContext.tsx:29 | Listen for auth state changes |
| `getSession()` | AuthContext.tsx:67 | Check for existing session on load |

#### Data Flow

```
User submits form
    ↓
Login.tsx:33 → useAuth().signIn(email, password)
    ↓
AuthContext.tsx:76-86 → supabase.auth.signInWithPassword()
    ↓
Supabase validates credentials against auth.users
    ↓
AuthContext.tsx:36-57 → onAuthStateChange('SIGNED_IN')
    ↓
Auto-navigate to /dashboard
```

#### Form Validation (Zod Schema)

```typescript
// Login.tsx:11-14
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
```

#### UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `useForm` | react-hook-form | Form state management |
| `zodResolver` | @hookform/resolvers/zod | Form validation |
| `useToast` | @/hooks/use-toast | Error notifications |
| `Logo` | @/components/Logo | Company branding |
| Icons (Eye, EyeOff, Mail, Lock, ArrowRight) | lucide-react | UI icons |

#### Key Code Sections

```typescript
// Login.tsx:33-54 - Form submission
const onSubmit = async (data: LoginForm) => {
  setIsLoading(true);
  try {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password",
      });
    }
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "An unexpected error occurred",
    });
  } finally {
    setIsLoading(false);
  }
};
```

#### Error Handling

| Error | User Message |
|-------|--------------|
| Invalid credentials | "Invalid email or password" |
| Network error | "An unexpected error occurred" |

---

### 3.2 Forgot Password Page (`/forgot-password`)

**File:** `src/pages/ForgotPassword.tsx`

#### Purpose
Initiates password reset flow by sending a reset email to the user.

#### Supabase Auth Methods Used

| Method | Location | Purpose |
|--------|----------|---------|
| `resetPasswordForEmail()` | ForgotPassword.tsx:29 | Send password reset email |

#### Data Flow

```
User enters email and submits
    ↓
ForgotPassword.tsx:14-46 → handleSubmit()
    ↓
ForgotPassword.tsx:29-31 → supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
})
    ↓
Supabase sends email via configured SMTP/email provider
    ↓
User receives email with reset link
    ↓
Link contains: /reset-password?token_hash=xxx&type=recovery
               OR /reset-password?code=xxx (PKCE flow)
```

#### Key Code Section

```typescript
// ForgotPassword.tsx:29-31
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

#### UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `Button` | @/components/ui/button | Submit button (shadcn/ui) |
| Icons (ArrowLeft, Lock, Mail, CheckCircle, AlertCircle, Loader2) | lucide-react | UI icons |

#### UI States

1. **Form State** - Email input with submit button
2. **Loading State** - Shows spinner while sending email
3. **Success State** - Shows confirmation with instructions
4. **Error State** - Shows error message with retry option

#### Supabase Dashboard Configuration Required

| Setting | Location | Value |
|---------|----------|-------|
| Site URL | Authentication > URL Configuration | `https://mrc-app.vercel.app` |
| Redirect URLs | Authentication > URL Configuration | `https://mrc-app.vercel.app/reset-password` |
| Email Template | Authentication > Email Templates | Custom "Reset Password" template |

---

### 3.3 Reset Password Page (`/reset-password`)

**File:** `src/pages/ResetPassword.tsx`

#### Purpose
Handles password reset after user clicks the email link. Supports multiple Supabase auth flows.

#### Supabase Auth Methods Used

| Method | Location | Purpose |
|--------|----------|---------|
| `updateUser()` | ResetPassword.tsx:125 | Update user's password |
| `getSession()` | ResetPassword.tsx:57 | Check for active session |
| `onAuthStateChange()` | ResetPassword.tsx:73 | Listen for auth events |
| `signOut()` | ResetPassword.tsx:163 | Force fresh login after reset |

#### Supported URL Formats

The page handles multiple Supabase auth token formats:

| Format | URL Pattern | Detection |
|--------|-------------|-----------|
| Token Hash | `?token_hash=xxx&type=recovery` | `searchParams.has('token_hash')` |
| Recovery Hash | `#access_token=xxx&type=recovery` | `hash.includes('type=recovery')` |
| PKCE Code | `?code=xxx` | `searchParams.has('code')` |

#### Data Flow

```
User clicks reset link in email
    ↓
Browser navigates to /reset-password with token
    ↓
ResetPassword.tsx:14-101 → useEffect detects token format
    ↓
Supabase processes token via onAuthStateChange
    ↓
Auth event: 'SIGNED_IN', 'PASSWORD_RECOVERY', or 'INITIAL_SESSION'
    ↓
Show password reset form (showForm = true)
    ↓
User enters new password
    ↓
ResetPassword.tsx:125 → supabase.auth.updateUser({ password })
    ↓
ResetPassword.tsx:163 → supabase.auth.signOut()
    ↓
Navigate to /login
```

#### Key Code Sections

```typescript
// ResetPassword.tsx:22-25 - Token detection
const hasTokenHash = searchParams.has('token_hash') && searchParams.get('type') === 'recovery';
const hasRecoveryHash = window.location.hash.includes('type=recovery') && window.location.hash.includes('access_token');
const hasResetCode = searchParams.has('code');

// ResetPassword.tsx:125-127 - Password update
const { data, error: updateError } = await supabase.auth.updateUser({
  password: password,
});

// ResetPassword.tsx:163 - Force re-login
await supabase.auth.signOut();
```

#### Validation Rules

| Field | Validation | Message |
|-------|------------|---------|
| Password | min 8 characters | "Password must be at least 8 characters" |
| Confirm Password | must match password | "Passwords do not match" |

#### UI States

1. **Loading State** - "Validating Reset Link" with spinner
2. **Error State** - Shows error and redirects to /forgot-password
3. **Form State** - Password entry with confirmation

---

### 3.4 Profile Page (`/profile`)

**File:** `src/pages/Profile.tsx`

#### Purpose
Displays and allows editing of user profile information stored in `user_metadata`.

#### Supabase Auth Methods Used

| Method | Location | Purpose |
|--------|----------|---------|
| `getUser()` | Profile.tsx:55 | Load current user data |
| `updateUser()` | Profile.tsx:129 | Save profile changes to user_metadata |

#### Data Mapping

| UI Field | user_metadata Key | TypeScript Field |
|----------|-------------------|------------------|
| First Name | `first_name` | `profileData.firstName` |
| Last Name | `last_name` | `profileData.lastName` |
| Phone | `phone` | `profileData.phone` |
| Email | (from user.email) | `profileData.email` (read-only) |
| Join Date | (from user.created_at) | `profileData.joinDate` (read-only) |

#### Data Flow - Load

```
Profile.tsx:49-122 → useEffect on mount
    ↓
Profile.tsx:55 → supabase.auth.getUser()
    ↓
Profile.tsx:69 → Extract user.user_metadata
    ↓
Profile.tsx:72-80 → Parse first_name, last_name (with full_name fallback)
    ↓
Profile.tsx:106-107 → setProfileData() + setEditData()
```

#### Data Flow - Save

```
User clicks "Save Changes"
    ↓
Profile.tsx:124-164 → handleSave()
    ↓
Profile.tsx:129-135 → supabase.auth.updateUser({
    data: {
        first_name: editData.firstName,
        last_name: editData.lastName,
        phone: editData.phone || '',
    }
})
    ↓
Profile.tsx:143-146 → Update local state
```

#### Key Code Sections

```typescript
// Profile.tsx:55 - Load user
const { data: { user }, error: authError } = await supabase.auth.getUser();

// Profile.tsx:69-80 - Parse user_metadata
const meta = user.user_metadata || {};
let firstName = meta.first_name || '';
let lastName = meta.last_name || '';

// Fallback: if no first/last name in metadata, try to parse from full_name
if (!firstName && !lastName && meta.full_name) {
  const nameParts = meta.full_name.trim().split(' ');
  firstName = nameParts[0] || '';
  lastName = nameParts.slice(1).join(' ') || '';
}

// Profile.tsx:129-135 - Save user_metadata
const { error } = await supabase.auth.updateUser({
  data: {
    first_name: editData.firstName,
    last_name: editData.lastName,
    phone: editData.phone || '',
  }
});
```

#### UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `MobileBottomNav` | @/components/dashboard/MobileBottomNav | Mobile navigation |
| `useToast` | @/hooks/use-toast | Notifications |
| Icons (ArrowLeft, User, Mail, Phone, Calendar, Edit2, Save, X, Camera, Key, Loader2) | lucide-react | UI icons |

#### UI States

1. **Loading State** - Full-screen spinner "Loading profile..."
2. **View Mode** - Display profile data (default)
3. **Edit Mode** - Editable form fields
4. **Saving State** - Disabled buttons with spinner

#### Read-Only Fields

| Field | Reason |
|-------|--------|
| Email | Requires email verification to change |
| Join Date | System-generated, immutable |

---

### 3.5 Settings Page (`/settings`)

**File:** `src/pages/Settings.tsx`

#### Purpose
Provides account management options including sign out, password change link, user management link, and account deletion.

#### Supabase Auth Methods Used

| Method | Location | Purpose |
|--------|----------|---------|
| `signOut()` | Settings.tsx:28 | Sign out current user |
| `getUser()` | Settings.tsx:67 | Get user ID for deletion |
| `getSession()` | Settings.tsx:78 | Get access token for Edge Function auth |

#### Edge Function Used

| Function | Method | Purpose |
|----------|--------|---------|
| `manage-users` | DELETE | Delete user account |

#### Data Flow - Sign Out

```
User clicks "Sign Out"
    ↓
Settings.tsx:23-48 → handleSignOut()
    ↓
Settings.tsx:28 → supabase.auth.signOut()
    ↓
Settings.tsx:36 → navigate('/login')
```

#### Data Flow - Delete Account

```
User clicks "Delete Account"
    ↓
Settings.tsx:50-114 → handleDeleteAccount()
    ↓
Settings.tsx:51-62 → Two-step confirmation (confirm + "DELETE" prompt)
    ↓
Settings.tsx:67 → supabase.auth.getUser()
Settings.tsx:78 → supabase.auth.getSession()
    ↓
Settings.tsx:79-88 → fetch(`${SUPABASE_URL}/functions/v1/manage-users?userId=${user.id}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${session.session?.access_token}`
    }
})
    ↓
Settings.tsx:96 → supabase.auth.signOut()
    ↓
Settings.tsx:103 → navigate('/login')
```

#### Key Code Sections

```typescript
// Settings.tsx:28 - Sign out
const { error } = await supabase.auth.signOut();

// Settings.tsx:79-88 - Delete account via Edge Function
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?userId=${user.id}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

#### Navigation Links

| Button | Destination | Purpose |
|--------|-------------|---------|
| My Profile | `/profile` | Edit profile |
| Change Password | `/forgot-password` | Initiate password reset |
| Manage Users | `/manage-users` | User administration |

#### UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `MobileBottomNav` | @/components/dashboard/MobileBottomNav | Mobile navigation |
| `useToast` | @/hooks/use-toast | Notifications |
| Icons (ArrowLeft, User, Users, ChevronRight, Trash2, LogOut, Key, Loader2) | lucide-react | UI icons |

---

## 4. Edge Functions

---

### 4.1 manage-users Edge Function

**File:** `supabase/functions/manage-users/index.ts`

#### Purpose
Provides secure user management operations using Supabase Admin API. Required because client-side code cannot access admin methods.

#### Authentication
- Requires valid JWT in `Authorization` header
- JWT is decoded and validated before any operation
- Uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations

#### Endpoints

| Method | Purpose | Request | Response |
|--------|---------|---------|----------|
| GET | List all users | - | `{ success: true, users: [...] }` |
| POST | Invite new user | `{ email, first_name, last_name?, phone? }` | `{ success: true, user: {...} }` |
| PATCH | Update user | `?userId=xxx` + `{ email?, password?, first_name?, last_name?, phone?, is_active? }` | `{ success: true }` |
| DELETE | Delete user | `?userId=xxx` | `{ success: true }` |

#### User Data Returned (GET)

```typescript
{
  id: string,
  email: string,
  first_name: string,
  last_name: string,
  full_name: string,
  phone: string,
  is_active: boolean,
  created_at: string,
  last_sign_in_at: string
}
```

#### Key Implementation Details

```typescript
// Authorization check (manage-users/index.ts:70-88)
const authHeader = req.headers.get('Authorization');
const token = authHeader.replace('Bearer ', '');
const jwtPayload = decodeJWT(token);

// Check token expiration (manage-users/index.ts:90-97)
const now = Math.floor(Date.now() / 1000);
if (jwtPayload.exp && jwtPayload.exp < now) {
  return new Response(
    JSON.stringify({ success: false, error: 'Token expired' }),
    { status: 401, ... }
  )
}

// List users with user_metadata (manage-users/index.ts:117-155)
const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
const users = authUsers.users.map(authUser => ({
  id: authUser.id,
  email: authUser.email,
  first_name: meta.first_name || '',
  last_name: meta.last_name || '',
  ...
}));

// Delete user (manage-users/index.ts:263)
await supabaseAdmin.auth.admin.deleteUser(targetUserId);
```

#### Used By

| Page/Component | Method | Purpose |
|----------------|--------|---------|
| Settings.tsx | DELETE | Account deletion |
| AddLeadDialog.tsx | GET | Load technicians for dropdown |
| notifications.ts | GET | Get active technicians for notifications |
| ManageUsers.tsx (implied) | GET, POST, PATCH, DELETE | User administration |

---

### 4.2 seed-admin Edge Function

**File:** `supabase/functions/seed-admin/index.ts`

#### Purpose
Creates or updates admin users with predefined credentials. Used for initial setup or password recovery.

#### Admin Users Created

| Email | Full Name | Default Password |
|-------|-----------|------------------|
| admin@mrc.com.au | System Administrator | Admin123! |
| michaelyoussef396@gmail.com | Michael Youssef | Admin123! |

#### Key Implementation

```typescript
// seed-admin/index.ts:62-68 - Update existing user
const { data: updated } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
  password: adminUser.password,
  user_metadata: {
    full_name: adminUser.full_name,
    phone: adminUser.phone,
    role: 'admin'
  }
});

// seed-admin/index.ts:79-88 - Create new user
const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
  email: adminUser.email,
  password: adminUser.password,
  email_confirm: true,
  user_metadata: {...}
});
```

---

## 5. Supabase Configuration

---

### 5.1 Client Configuration

**File:** `src/integrations/supabase/client.ts`

#### Key Settings

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,           // Keep session across page reloads
    storage: window.localStorage,   // Use localStorage for persistence
    autoRefreshToken: true,         // Auto-refresh tokens before expiry
    detectSessionInUrl: true,       // Handle password reset URLs
    flowType: 'implicit',           // CRITICAL: Required for password reset
    debug: import.meta.env.DEV,     // Debug logging in development
  },
  global: {
    headers: {
      'x-application-name': 'mrc-lead-management',
    },
  },
});
```

#### Critical: Why `flowType: 'implicit'`

PKCE flow (default) converts `?token_hash=` to `?code=` which creates a regular session, not a recovery session. Password updates require a recovery session, otherwise you get a 403 error. Implicit flow preserves the recovery session.

---

### 5.2 Supabase Dashboard Settings

#### Authentication > URL Configuration

| Setting | Value |
|---------|-------|
| Site URL | `https://mrc-app.vercel.app` |
| Redirect URLs | `https://mrc-app.vercel.app/**` |
| | `http://localhost:5173/**` (dev) |

#### Authentication > Email Templates

| Template | Subject | Purpose |
|----------|---------|---------|
| Reset Password | "Reset Your Password" | Password reset link |
| Confirm Signup | "Confirm Your Email" | Email verification |
| Invite User | "You've been invited" | User invitation |

#### Authentication > Providers

| Provider | Status |
|----------|--------|
| Email | Enabled |
| All others | Disabled |

---

## 6. Component Reference

---

### 6.1 AuthContext

**File:** `src/contexts/AuthContext.tsx`

#### Purpose
Provides authentication state and methods throughout the app.

#### Interface

```typescript
interface AuthContextType {
  user: User | null;               // Current user or null
  session: Session | null;         // Current session or null
  loading: boolean;                // True during initial load
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}
```

#### Usage

```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, session, loading, signIn, signOut } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;

  // ...
}
```

#### Smart Navigation Logic

The AuthContext handles navigation carefully to avoid conflicts:

```typescript
// AuthContext.tsx:36-57 - Only redirect on actual login, not session restoration
if (event === 'SIGNED_IN') {
  const isPasswordRecovery = onResetPasswordPage || isRecoveryHash || ...;
  const isOnLoginPage = window.location.pathname === '/' || window.location.pathname === '/login';

  // Only redirect if NOT password recovery AND on login page
  if (!isPasswordRecovery && isOnLoginPage) {
    navigate('/dashboard');
  }
}
```

---

### 6.2 MobileBottomNav

**File:** `src/components/dashboard/MobileBottomNav.tsx`

Used by: Profile.tsx, Settings.tsx

Provides consistent bottom navigation for mobile users.

---

### 6.3 Logo

**File:** `src/components/Logo.tsx`

Used by: Login.tsx

Company branding component.

---

### 6.4 Button (shadcn/ui)

**File:** `src/components/ui/button.tsx`

Used by: ForgotPassword.tsx, Settings.tsx

Standard button component from shadcn/ui library.

---

## 7. Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function admin access | (secret, in Supabase dashboard) |
| `SITE_URL` | Edge Function redirect URL | `https://mrc-app.vercel.app` |

---

## 8. Migrations

---

### 8.1 Drop Legacy Users Table

**File:** `supabase/migrations/20260109000002_drop_legacy_users_table.sql`

**Purpose:** Removed unused `public.users` table that had a dangerous `password_hash` column. The app uses `auth.users` for authentication.

```sql
DROP TABLE IF EXISTS public.users;
```

---

### 8.2 Fix is_admin Function

**File:** `supabase/migrations/20260109000003_fix_is_admin_function.sql`

**Purpose:** Fixed `is_admin()` function after dropping the `users` table. Now queries `user_roles` table.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$function$;
```

**Note:** The `user_roles` table is referenced by this function but is no longer actively used in the application. RLS policies have been simplified to authenticated-only checks.

---

## Summary

### Authentication Flow

```
Login → AuthContext.signIn() → supabase.auth.signInWithPassword()
                                      ↓
                              Supabase Auth validates
                                      ↓
                              Session created in auth.users
                                      ↓
                              onAuthStateChange('SIGNED_IN')
                                      ↓
                              Navigate to /dashboard
```

### Password Reset Flow

```
Forgot Password → supabase.auth.resetPasswordForEmail()
                                      ↓
                              Email sent with token
                                      ↓
                              User clicks link → /reset-password
                                      ↓
                              Token validated by Supabase
                                      ↓
                              onAuthStateChange('SIGNED_IN' or 'PASSWORD_RECOVERY')
                                      ↓
                              supabase.auth.updateUser({ password })
                                      ↓
                              supabase.auth.signOut()
                                      ↓
                              Navigate to /login
```

### Profile Update Flow

```
Profile Page → supabase.auth.getUser()
                                      ↓
                              Extract user_metadata
                                      ↓
                              Display/Edit form
                                      ↓
                              supabase.auth.updateUser({ data: {...} })
                                      ↓
                              user_metadata updated in auth.users
```

### Account Deletion Flow

```
Settings Page → Confirmation prompts
                                      ↓
                              GET userId and session
                                      ↓
                              fetch('/functions/v1/manage-users?userId=xxx', {
                                method: 'DELETE',
                                headers: { Authorization: Bearer ... }
                              })
                                      ↓
                              Edge Function: supabaseAdmin.auth.admin.deleteUser()
                                      ↓
                              User removed from auth.users
                                      ↓
                              supabase.auth.signOut()
                                      ↓
                              Navigate to /login
```

---

**End of Documentation**
