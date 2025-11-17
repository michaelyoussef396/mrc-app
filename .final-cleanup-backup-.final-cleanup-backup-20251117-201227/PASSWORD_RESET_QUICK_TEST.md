# ⚡ PASSWORD RESET - QUICK TEST GUIDE

**Run this 5-minute test to diagnose the password reset link error.**

---

## 🚀 QUICK TEST (5 Minutes)

### **1. Start Dev Server**
```bash
npm run dev
```

### **2. Clear Browser (CRITICAL)**
- Press F12 (open DevTools)
- Application tab → Clear storage → **Clear site data**
- Close browser, reopen

### **3. Request Reset**
- Go to: http://localhost:5173/login
- Click "Forgot Password?"
- Enter: `michaelyoussef396@gmail.com`
- Click "Send Reset Link"

### **4. Prepare Console (BEFORE clicking email link)**
- Open NEW browser tab
- Press F12
- Go to Console tab
- Click "Clear console"
- **Keep DevTools open**

### **5. Click Email Link**
- Check your email
- Click "Reset Password" link
- Browser opens /reset-password

### **6. IMMEDIATELY Look at Console**

**Copy ALL these logs:**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: [URL here]
📍 Hash: [hash here]
🔑 access_token (hash): [EXISTS or NOT FOUND]
🔑 type (hash): [value]
🔔 Auth Event: [event name]
...all other logs...
```

---

## ✅ SUCCESS = This Console Output

```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=eyJ...
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
🔔 Auth Event: PASSWORD_RECOVERY
✅ PASSWORD_RECOVERY event detected!
```

**AND password form appears on screen (NO error).**

---

## ❌ FAILURE = This Console Output

```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=eyJ...
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery
🔍 Checking current session (fallback)...
👤 Current session: NULL
⏰ Setting 2-second timeout for error...
❌ No valid recovery session after 3 seconds total
❌ Showing error and redirecting...
```

**AND error message appears: "Invalid or Expired Link"**

---

## 📋 SEND ME THIS INFO

**After testing, send:**

1. **Console logs** (all of them)
2. **UI behavior** (spinner → form, OR spinner → error?)
3. **Email link** (copy the full URL from email)

---

## 🔧 BASED ON RESULTS, I'LL FIX:

**If SUCCESS:** ✅ Already working!

**If FAILURE:** I'll implement one of these fixes based on your console logs:

**Fix A: Increase Timeout**
- Change timeout from 3s to 5s
- For slower connections

**Fix B: Use Polling Method**
- Check session every 500ms for 5 seconds
- More reliable than events

**Fix C: Fix Supabase Config**
- Update email template
- Fix redirect URLs

---

## ⏱️ EXPECTED TIMELINE

**Your part:** 5 minutes
**My part:** 15-30 minutes (after receiving logs)
**Total:** ~45 minutes to final fix

---

**THAT'S IT! Run the test and send me the console logs.** 🚀
