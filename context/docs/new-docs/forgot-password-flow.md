# Forgot Password / Reset Password Flow

## Overview

| Attribute | Value |
|-----------|-------|
| **What it does** | Allows users to reset their password if forgotten |
| **Who accesses it** | All authenticated roles (Developer, Admin, Technician) - accessed while logged OUT |
| **Entry point** | Login page "Forgot Password?" link |
| **Exit point** | Login page (with success message) |
| **Why it exists** | Security requirement - users need a way to regain account access |

---

## User Flow

### Happy Path

```
1. User on Login page clicks "Forgot Password?"
   └─→ Navigates to /forgot-password

2. User enters email on Forgot Password page
   └─→ Email validated (format check)

3. User clicks "Send Reset Link"
   └─→ Button shows loading spinner

4. System sends email via Supabase Auth
   └─→ resetPasswordForEmail() called

5. Success screen displayed
   └─→ "Check your email" with email shown

6. User receives email with reset link
   └─→ Link format: /reset-password#access_token=xxx&type=recovery

7. User clicks link → opens Reset Password page
   └─→ Token validated (5 second timeout)

8. User enters new password + confirms
   └─→ Real-time password match indicator

9. User clicks "Update Password"
   └─→ supabase.auth.updateUser() called

10. Password updated in Supabase Auth
    └─→ Success screen with spinner

11. User redirected to Login with success message
    └─→ After 3 second delay

12. Security notification email sent (via Supabase)
```

### Error Paths

| Scenario | Error Message |
|----------|---------------|
| Empty email | "Please enter your email address" |
| Invalid email format | "Please enter a valid email address" |
| Email too long (>254 chars) | "Please enter a valid email address" |
| Rate limited | "Too many requests. Please wait X minutes before trying again." |
| Network error | "Something went wrong. Please try again." |
| Invalid/expired token | "Invalid or expired reset link. Please request a new one." |
| Passwords don't match | "Passwords do not match" |
| Password too short | "Password must be at least 6 characters" |
| Empty password | "Please enter a new password" |
| Session expired during update | "Your reset link has expired. Please request a new one." |

---

## Frontend

### Pages

| Page | File | Purpose |
|------|------|---------|
| Forgot Password | `src/pages/ForgotPassword.tsx` | Email input form |
| Reset Password | `src/pages/ResetPassword.tsx` | New password form |

### ForgotPassword.tsx Layout

**Default State (375px mobile):**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │   [MRC Logo]     │       │
│      │   Blue bg #007AFF│       │
│      └──────────────────┘       │
│                                 │
│      MRC Internal System        │
│         Staff Portal            │
│                                 │
│  Enter your email to receive    │
│         a reset link.           │
│                                 │
│   ┌─────────────────────────┐   │
│   │ 📧  staff@mrc.com       │   │
│   └─────────────────────────┘   │
│   [Error message if any]        │
│                                 │
│   ┌─────────────────────────┐   │
│   │   Send Reset Link       │   │  52px height
│   └─────────────────────────┘   │
│                                 │
│                                 │
│      ← Back to Sign In          │  48px min-height
│                                 │
└─────────────────────────────────┘
```

**Success State:**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │      ✓           │       │
│      │   Green circle   │       │
│      │   #34C759        │       │
│      └──────────────────┘       │
│                                 │
│      Check your email           │
│                                 │
│   We've sent a password reset   │
│           link to               │
│     michael@example.com         │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Didn't receive email?   │   │
│   │ Check spam folder or    │   │
│   │ try again in a few min. │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │   Back to Sign In       │   │
│   └─────────────────────────┘   │
│                                 │
│     Resend email (45s)          │  Countdown timer
│                                 │
│   ┌─────────────────────────┐   │  (if rate limited)
│   │ ⚠️ Rate limited. Try    │   │
│   │ again in X minutes.     │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### ResetPassword.tsx Layout

**Validating State:**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │   [Spinner]      │       │
│      │   Blue bg        │       │
│      └──────────────────┘       │
│                                 │
│    Validating Reset Link        │
│                                 │
│   Please wait while we verify   │
│   your password reset link...   │
│                                 │
└─────────────────────────────────┘
```

**Password Form State:**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │   [MRC Logo]     │       │
│      └──────────────────┘       │
│                                 │
│     Create New Password         │
│                                 │
│    Enter your new password      │
│            below                │
│                                 │
│   [Error box if any]            │
│                                 │
│   ┌─────────────────────────┐   │
│   │ 🔒  New password    👁   │   │  52px height
│   └─────────────────────────┘   │
│   At least 6 characters         │
│                                 │
│   ┌─────────────────────────┐   │
│   │ 🔒  Confirm password 👁  │   │  52px height
│   └─────────────────────────┘   │
│   ✓ Passwords match / ✗ Don't   │  Real-time feedback
│                                 │
│   ┌─────────────────────────┐   │
│   │   Update Password       │   │  52px height
│   └─────────────────────────┘   │
│                                 │
│      ← Back to Sign In          │
│                                 │
└─────────────────────────────────┘
```

**Invalid Token State:**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │      ✗           │       │
│      │   Red circle     │       │
│      │   #FF3B30        │       │
│      └──────────────────┘       │
│                                 │
│     Invalid Reset Link          │
│                                 │
│   Invalid or expired reset      │
│   link. Please request a        │
│   new one.                      │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Request New Reset Link  │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Success State:**
```
┌─────────────────────────────────┐
│                                 │
│      ┌──────────────────┐       │
│      │      ✓           │       │
│      │   Green circle   │       │
│      └──────────────────┘       │
│                                 │
│     Password Updated!           │
│                                 │
│   Your password has been        │
│   changed successfully.         │
│                                 │
│   ┌─────────────────────────┐   │
│   │ 🔄 Redirecting to       │   │
│   │    sign in...           │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### Components Used

| Component | Purpose |
|-----------|---------|
| MRC Logo (logo-large.png) | Branding header |
| Email input with mail icon | Email entry |
| Password input with lock icon | Password entry |
| Show/hide toggle (visibility) | Password visibility |
| Primary button (52px) | Submit actions |
| Loading spinner (SVG) | Loading states |
| Error icon (Material Symbols) | Error indicators |
| Checkmark icon (Material Symbols) | Success indicators |
| Back link with arrow | Navigation |
| Countdown timer | Resend cooldown |
| Info box (blue bg) | Helpful hints |
| Warning box (orange bg) | Rate limit warning |

### States Summary

| State | ForgotPassword | ResetPassword |
|-------|----------------|---------------|
| Default | Email form | N/A |
| Validating | N/A | Spinner + "Validating Reset Link" |
| Form Ready | N/A | Password form with inputs |
| Loading | Button disabled + spinner | Button disabled + spinner |
| Success | Green checkmark, "Check email" | Green checkmark, "Password Updated!" |
| Error | Red text below input | Red error box above form |
| Rate Limited | Orange warning box, countdown | N/A |
| Invalid Token | N/A | Red error screen, "Request New Link" |

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Required | "Please enter your email address" |
| Email | Valid format (regex) | "Please enter a valid email address" |
| Email | Max 254 characters | "Please enter a valid email address" |
| Password | Required | "Please enter a new password" |
| Password | Min 6 characters | "Password must be at least 6 characters" |
| Confirm Password | Must match password | "Passwords do not match" |

**Email Regex Used:**
```typescript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

---

## Backend

### Supabase Auth Functions

**1. Reset Password Email**
```typescript
// In AuthContext.tsx
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };
};
```

**2. Update Password**
```typescript
// In AuthContext.tsx
const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
};
```

### Token Management

| Attribute | Value |
|-----------|-------|
| Token generated by | Supabase (cryptographically secure) |
| Token expiry | 1 hour (Supabase default) |
| One-time use | Token invalidated after password change |
| Token in URL | `#access_token=xxx&type=recovery` |
| Validation timeout | 5 seconds |

### Audit Logging

Password reset requests are logged to the `login_activity` table:

```typescript
await supabase.from('login_activity').insert({
  user_id: null,                    // Don't reveal if user exists
  email: trimmedEmail,
  success: true,
  device_fingerprint: deviceInfo?.fingerprint || null,
  device_type: 'password_reset_request',  // Special type
  browser: deviceInfo?.browser || null,
  os: deviceInfo?.os || null,
  ip_address: locationInfo?.ip || null,
  city: locationInfo?.city || null,
  country: locationInfo?.country || null,
  user_agent: deviceInfo?.userAgent || null,
  error_message: resetError?.message || null,
});
```

---

## Security

### Rate Limiting (Client-Side)

```typescript
// Constants
const RESET_LIMIT = 3;                    // Max attempts
const RESET_WINDOW = 15 * 60 * 1000;      // 15 minutes in ms
const RESEND_COOLDOWN = 60;               // 60 seconds

// localStorage key
const STORAGE_KEY = 'mrc_reset_attempts';

// Storage format
{
  count: number,        // Number of attempts
  firstAttempt: number  // Timestamp of first attempt
}
```

### Security Features

| Feature | Implementation |
|---------|----------------|
| Don't reveal email exists | Always show success, even if email not found |
| Rate limiting | 3 requests per 15 minutes (client-side) |
| Secure token | Supabase-generated, cryptographically secure |
| Token expiry | 1 hour |
| One-time use | Token invalidated after use |
| HTTPS only | Reset link only works over HTTPS |
| Resend cooldown | 60 seconds between resend attempts |
| Session validation | 5 second timeout for token validation |
| Auto sign-out | User signed out after password change |
| Success redirect | Delayed 3 seconds to prevent timing attacks |

### Rate Limiting Helper Functions

```typescript
// Get current attempts
const getResetAttempts = (): { count: number; firstAttempt: number | null }

// Record new attempt
const recordResetAttempt = (): number

// Check if rate limited
const isRateLimited = (): boolean

// Get remaining lockout time in minutes
const getRemainingLockoutTime = (): number
```

---

## State Management

### ForgotPassword.tsx State

```typescript
// Form state
const [email, setEmail] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [error, setError] = useState('');

// Resend countdown state
const [resendCountdown, setResendCountdown] = useState(60);  // RESEND_COOLDOWN
const [canResend, setCanResend] = useState(false);

// Rate limiting state
const [isRateLimitedState, setIsRateLimitedState] = useState(false);
const [lockoutMinutes, setLockoutMinutes] = useState(0);
```

### ResetPassword.tsx State

```typescript
// Form state
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');
const [isSuccess, setIsSuccess] = useState(false);

// Token validation state
const [isValidating, setIsValidating] = useState(true);
const [isValidSession, setIsValidSession] = useState(false);
```

### localStorage

| Key | Purpose | Format |
|-----|---------|--------|
| `mrc_reset_attempts` | Rate limiting tracking | `{ count: number, firstAttempt: number }` |

---

## Error Handling

### Frontend Error Display

| Error Type | Display Location | Style |
|------------|------------------|-------|
| Validation (email) | Below email input | Red text with error icon |
| Rate limit | Below email input + warning box | Orange warning box |
| Network error | Below email input | Red text |
| Token invalid | Full screen error state | Red circle icon |
| Password validation | Above form in error box | Red box with error icon |
| Password mismatch | Below confirm input | Red text with ✗ icon |

### Backend Error Mapping

| Supabase Error | User Message |
|----------------|--------------|
| `invalid_email` | "Please enter a valid email address" |
| `rate_limit_exceeded` | "Too many requests. Please wait." |
| Any error with "session" | "Your reset link has expired. Please request a new one." |
| Other errors | Display error.message or fallback |

---

## Routes

```typescript
// In App.tsx - PUBLIC routes (no auth required)
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

Both routes are accessible without authentication.

---

## File Structure

```
src/
├── pages/
│   ├── ForgotPassword.tsx     # Email form page (503 lines)
│   └── ResetPassword.tsx      # New password form page (550 lines)
├── contexts/
│   └── AuthContext.tsx        # resetPassword(), updatePassword()
├── utils/
│   ├── deviceFingerprint.ts   # getDeviceInfo()
│   └── ipLocation.ts          # getLocationInfo()
└── assets/
    └── logo-large.png         # MRC logo
```

### Dependencies

| Import | Source | Purpose |
|--------|--------|---------|
| `useAuth` | `@/contexts/AuthContext` | resetPassword, updatePassword |
| `supabase` | `@/integrations/supabase/client` | Direct DB access for logging |
| `getDeviceInfo` | `@/utils/deviceFingerprint` | Device info for audit log |
| `getLocationInfo` | `@/utils/ipLocation` | Location info for audit log |
| `logoLarge` | `@/assets/logo-large.png` | MRC branding |

---

## Testing Checklist

### Manual Tests - ForgotPassword

- [ ] Click "Forgot Password?" from login → goes to /forgot-password
- [ ] Submit empty email → shows "Please enter your email address"
- [ ] Submit invalid email (no @) → shows "Please enter a valid email address"
- [ ] Submit valid email → shows success state
- [ ] Success state shows correct email
- [ ] Resend countdown starts at 60 seconds
- [ ] Resend button enabled after 60 seconds
- [ ] Click "Back to Sign In" → returns to login
- [ ] Rate limit after 3 attempts → shows warning
- [ ] Email received with correct template

### Manual Tests - ResetPassword

- [ ] Click link in email → goes to /reset-password
- [ ] Validating spinner shown initially
- [ ] Enter password < 6 chars → button disabled
- [ ] Enter mismatched passwords → shows "Passwords do not match"
- [ ] Real-time match indicator works (✓ or ✗)
- [ ] Enter valid password → success, redirect to login
- [ ] Success message shown on login page
- [ ] Try same reset link again → shows expired error
- [ ] "Request New Reset Link" button works

### Edge Cases

- [ ] Email not in system → still shows success (security)
- [ ] Network disconnection during submit → error message
- [ ] Token expired after 1 hour → error state
- [ ] Browser back button after success → proper handling
- [ ] Refresh during validating → re-validates token
- [ ] Very long email (>254 chars) → validation error

---

## Related Documentation

- [Login Page](./login-page.md) - Entry point for forgot password flow
- [Security Features](./security.md) - Overall security implementation
- [Auth Context](./auth-context.md) - Authentication context provider

---

## Discrepancies from Original Template

| Template | Actual Implementation |
|----------|----------------------|
| Button height 56px | Button height 52px |
| Token in URL as `?access_token=` | Token in URL as `#access_token=` (hash fragment) |
| "Password Changed" email | Handled by Supabase automatically |
| Check spam folder message | Slightly different wording |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial implementation | Claude Code |
| 2026-01-26 | Added rate limiting (3 attempts / 15 min) | Claude Code |
| 2026-01-26 | Added resend countdown (60 seconds) | Claude Code |
| 2026-01-26 | Added audit logging to login_activity | Claude Code |
| 2026-01-26 | Added token validation with 5s timeout | Claude Code |
| 2026-01-27 | Documentation created | Claude Code |
