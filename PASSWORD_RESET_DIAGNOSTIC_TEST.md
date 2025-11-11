# 🔧 PASSWORD RESET DIAGNOSTIC TEST GUIDE

**Date:** 2025-11-11
**Issue:** Reset password link shows "Invalid or Expired Link" error immediately
**Status:** Diagnostic logging added, awaiting test results

---

## 🎯 WHAT WAS CHANGED

### **Key Improvements Made:**

1. **Added `onAuthStateChange` Listener** (Lines 60-88)
   - PRIMARY METHOD: Listens for `PASSWORD_RECOVERY` event
   - Also catches `SIGNED_IN` events during recovery flow
   - Immediately validates session when auth event fires

2. **Improved Timing** (Lines 90-141)
   - Waits 1 second before checking session (gives Supabase time to process)
   - Sets 2-second timeout for showing error (3 seconds total)
   - Uses `sessionChecked` flag to prevent duplicate validations

3. **Comprehensive Diagnostic Logging**
   - Logs full URL, hash, and search params
   - Logs all auth events
   - Logs session state at each step
   - Shows exactly where the flow fails

---

## 🧪 HOW TO TEST

### **Step 1: Start Development Server**

```bash
npm run dev
```

### **Step 2: Clear Browser Data**

**Critical:** Old session data can interfere with testing

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to "Application" tab
3. Click "Clear storage" in left sidebar
4. Click "Clear site data" button
5. Close and reopen browser

### **Step 3: Request Password Reset**

1. Navigate to: http://localhost:5173/login
2. Click "Forgot Password?" link
3. Enter email: `michaelyoussef396@gmail.com`
4. Click "Send Reset Link"
5. Should redirect to `/check-email` page
6. **VERIFY:** Success message shows

### **Step 4: Check Email**

1. Open your email inbox
2. Find email from Supabase (subject: "Reset Your Password")
3. **NOTE:** Email should arrive within 30-60 seconds
4. **IMPORTANT:** Copy the full reset link URL from email

**Example reset link format:**
```
http://localhost:5173/reset-password#access_token=LONG_TOKEN_HERE&expires_at=1234567890&expires_in=3600&refresh_token=REFRESH_TOKEN&token_type=bearer&type=recovery
```

### **Step 5: Open Browser Console BEFORE Clicking Link**

**CRITICAL:** We need to see the diagnostic logs

1. Open a NEW browser window/tab (not the one with /check-email)
2. Open DevTools (F12)
3. Go to "Console" tab
4. Click "Clear console" button
5. Keep DevTools visible

### **Step 6: Click Reset Link**

1. Click the reset link from your email
2. **OR** paste the URL into the browser
3. Browser should open: http://localhost:5173/reset-password#access_token=...

### **Step 7: IMMEDIATELY Check Console Logs**

**You should see these logs appear in order:**

```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=...&type=recovery
📍 Hash: #access_token=...&type=recovery
📍 Search:
📍 Pathname: /reset-password
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
🔑 token (search): null
🔑 type (search): null
🔔 Auth Event: PASSWORD_RECOVERY  (or SIGNED_IN)
👤 Session from event: EXISTS
✅ PASSWORD_RECOVERY event detected!
```

**If you see this, SUCCESS! The flow is working.**

**If you see different logs, copy ALL the console output.**

---

## 📋 EXPECTED BEHAVIORS

### **Scenario A: SUCCESS (What Should Happen)**

**Console Logs:**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=eyJ...&type=recovery
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
🔔 Auth Event: PASSWORD_RECOVERY
✅ PASSWORD_RECOVERY event detected!
```

**UI Behavior:**
- Shows "Validating Reset Link..." spinner for ~1 second
- Then shows password reset form
- **NO "Invalid or Expired Link" error**

---

### **Scenario B: TIMING ISSUE (Current Problem)**

**Console Logs:**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=eyJ...&type=recovery
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
🔍 Checking current session (fallback)...
👤 Current session: NULL
⏰ Setting 2-second timeout for error...
❌ No valid recovery session after 3 seconds total
❌ Showing error and redirecting...
```

**UI Behavior:**
- Shows "Validating Reset Link..." spinner
- After 3 seconds, shows "Invalid or Expired Link" error
- Redirects to /forgot-password

**Root Cause:** Supabase taking too long to process token, OR auth event not firing

---

### **Scenario C: WRONG URL FORMAT (Configuration Issue)**

**Console Logs:**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password?token=eyJ...&type=recovery
📍 Hash:
📍 Search: ?token=eyJ...&type=recovery
🔑 access_token (hash): NOT FOUND
🔑 type (hash): null
🔑 token (search): eyJ...
🔑 type (search): recovery
```

**UI Behavior:**
- Shows "Invalid or Expired Link" error immediately
- Token is in search params instead of hash params

**Root Cause:** Supabase email template configured incorrectly

---

### **Scenario D: NO AUTH EVENT (Supabase Issue)**

**Console Logs:**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=eyJ...&type=recovery
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
(NO AUTH EVENT LOGGED)
🔍 Checking current session (fallback)...
👤 Current session: NULL
```

**UI Behavior:**
- No `PASSWORD_RECOVERY` or `SIGNED_IN` event fires
- Fallback session check finds no session

**Root Cause:** Supabase auth listener not working, or token invalid

---

## 🔍 WHAT TO REPORT

After testing, copy and provide:

### **1. Console Logs (CRITICAL)**

Copy ALL console output from the moment you click the reset link. Should look like:

```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: [copy the full URL]
📍 Hash: [copy the hash]
📍 Search: [copy the search]
🔑 access_token (hash): [EXISTS or NOT FOUND]
🔑 type (hash): [value or null]
... (all other logs)
```

### **2. Email Link Format**

Copy the EXACT reset link from your email:
```
http://localhost:5173/reset-password#access_token=...
```

### **3. UI Behavior**

Describe what you see:
- [ ] Loading spinner shows (how long?)
- [ ] Password form appears (success!)
- [ ] Error message shows (failure - what message?)
- [ ] Redirects to /forgot-password

### **4. Which Scenario Matches?**

Based on console logs, which scenario above matches:
- [ ] Scenario A: SUCCESS
- [ ] Scenario B: TIMING ISSUE
- [ ] Scenario C: WRONG URL FORMAT
- [ ] Scenario D: NO AUTH EVENT

---

## 🔧 SUPABASE CONFIGURATION CHECK

### **Check 1: Email Template**

1. Go to Supabase Dashboard
2. Navigate to: **Authentication > Email Templates**
3. Click on **"Reset Password"** template
4. Check the redirect URL in the template

**Should be:**
```html
<a href="{{ .SiteURL }}/reset-password">Reset Password</a>
```

**Should NOT be:**
```html
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">Reset Password</a>
```

**Screenshot or copy the email template content**

---

### **Check 2: Site URL**

1. Go to: **Authentication > URL Configuration**
2. Check "Site URL" setting

**Should be:**
```
http://localhost:5173
```

**For production:**
```
https://app.mouldandrestoration.com.au
```

---

### **Check 3: Redirect URLs**

1. Go to: **Authentication > URL Configuration**
2. Check "Redirect URLs" list

**Must include:**
```
http://localhost:5173/**
http://localhost:5173/reset-password
http://localhost:5173/auth/callback
```

**Screenshot the URL Configuration page**

---

## 🚀 NEXT STEPS BASED ON RESULTS

### **If Scenario A (SUCCESS):**
✅ Flow is working! No further action needed.

### **If Scenario B (TIMING ISSUE):**
Need to increase timeout from 3 seconds to 5 seconds:

```typescript
// Change line 139 timeout from 2000 to 4000
setTimeout(() => {
  if (!sessionChecked) {
    // Show error
  }
}, 4000); // Increased from 2000 to 4000
```

### **If Scenario C (WRONG URL FORMAT):**
Need to fix Supabase email template:

1. Go to Supabase Dashboard
2. Authentication > Email Templates > Reset Password
3. Change template to use hash params instead of query params
4. Save template
5. Re-test

### **If Scenario D (NO AUTH EVENT):**
Need to verify Supabase configuration:

1. Check if Supabase project is using latest auth version
2. Verify API keys are correct in .env files
3. Check browser console for CORS errors
4. Try using Supabase CLI to reset project locally

---

## 📝 TEST RESULTS TEMPLATE

**Copy this template and fill it out:**

```markdown
## PASSWORD RESET TEST RESULTS

**Date:** [Date]
**Tester:** [Your name]

### Console Logs:
[Paste all console logs here]

### Email Link:
[Paste the reset link from email]

### UI Behavior:
- Loading spinner: [Yes/No] - Duration: [X seconds]
- Password form appeared: [Yes/No]
- Error message: [Yes/No] - Message: [Error text]
- Redirected to: [URL]

### Matching Scenario:
[A/B/C/D] - [Scenario name]

### Supabase Config:
- Email Template Format: [Correct/Incorrect]
- Site URL: [URL]
- Redirect URLs: [List of URLs]

### Screenshots:
[Attach screenshots if possible]
```

---

## 🆘 TROUBLESHOOTING

### **Issue: No email received**

**Solutions:**
1. Check spam folder
2. Wait 2-3 minutes (Supabase email can be slow)
3. Check Supabase Dashboard > Authentication > Users
4. Verify email exists in user list

### **Issue: Console shows no logs**

**Solutions:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload page (Ctrl+Shift+R)
3. Check if JavaScript is enabled
4. Try different browser (Chrome, Firefox, Safari)

### **Issue: Token expired immediately**

**Solutions:**
1. Supabase tokens expire in 1 hour by default
2. Request a NEW reset link
3. Click link within 60 minutes
4. Don't reuse old links

### **Issue: CORS errors in console**

**Solutions:**
1. Check Supabase URL Configuration
2. Verify localhost:5173 is in allowed origins
3. Check .env file has correct SUPABASE_URL
4. Restart dev server after .env changes

---

## 📚 RELATED FILES

**Modified Files:**
- `src/pages/ResetPassword.tsx` (Lines 40-149)

**Related Files:**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/pages/ForgotPassword.tsx` - Initiates reset flow
- `src/integrations/supabase/client.ts` - Supabase client config

**Documentation:**
- `PASSWORD_RESET_FIX_SUMMARY.md` - Complete fix documentation
- `CLAUDE.md` - Project guide

---

## ✅ SUCCESS CRITERIA

The password reset flow is working correctly when:

1. ✅ Console logs show `✅ PASSWORD_RECOVERY event detected!`
2. ✅ UI shows loading spinner for 1-2 seconds
3. ✅ Password reset form appears (NOT error message)
4. ✅ Can enter new password and submit successfully
5. ✅ Redirects to /login after successful reset
6. ✅ Can login with new password

---

**IMPORTANT:** Please run this test and provide the console logs + which scenario matches. This will help diagnose the exact root cause of the issue!

---

*Last Updated: 2025-11-11*
*Added by: Claude Code*
