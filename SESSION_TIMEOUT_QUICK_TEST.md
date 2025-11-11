# ⚡ SESSION TIMEOUT FIX - QUICK TEST GUIDE

**5-MINUTE TEST TO VERIFY ALL FIXES**

---

## 🚀 QUICK TEST (5 Minutes)

### **Step 1: Start Dev Server (30 seconds)**
```bash
npm run dev
```

Wait for: `Local: http://localhost:5173/`

---

### **Step 2: Clear Browser Storage (30 seconds)**
- Press F12 (open DevTools)
- Application tab → Clear storage
- Click "Clear site data"
- Close browser
- Reopen browser

---

### **Step 3: Request Password Reset (1 minute)**
1. Go to: http://localhost:5173/login
2. Click "Forgot Password?"
3. Enter: michaelyoussef396@gmail.com
4. Click "Send Reset Link"
5. Should see "Check Your Email" page

---

### **Step 4: Open Console BEFORE Clicking Link (30 seconds)**
1. Open NEW browser tab
2. Press F12 (open DevTools)
3. Go to Console tab
4. Clear console (trash icon)
5. **Keep DevTools open**

---

### **Step 5: Click Email Link (2 minutes)**
1. Check Gmail for "Reset Your Password" email
2. Click "Reset Password" button in email
3. Browser opens /reset-password page
4. **IMMEDIATELY look at console**

---

## ✅ WHAT YOU SHOULD SEE

### **Console Logs (Good Signs):**
```
🔍 === RESET PASSWORD DIAGNOSTICS ===
📍 Full URL: http://localhost:5173/reset-password#access_token=...
🔑 access_token (hash): EXISTS
🔑 type (hash): recovery

🔐 [Supabase Client] Auth State Change: PASSWORD_RECOVERY
✅ PASSWORD_RECOVERY event detected!

OR:

🔍 Starting session polling...
🔄 Poll attempt 1/10 (0.5s elapsed)
🔄 Poll attempt 2/10 (1.0s elapsed)
✅ Session found via polling
✅ Recovery session confirmed
```

### **Screen (Good Signs):**
1. ✅ "Validating Reset Link..." appears (1-5 seconds)
2. ✅ Then password form appears
3. ✅ **NO "Invalid or Expired Link" error**

### **SessionMonitor (Bottom-Right Corner):**
```
🔐 Session Monitor
✅ Active Session
👤 michaelyoussef396@gmail.com
⏰ Expires: 3:45:23 PM
⏳ 58m left
```

---

## ❌ WHAT YOU SHOULD NOT SEE

### **Bad Signs (Issues):**
```
❌ "Invalid or Expired Link" error immediately
❌ Instant redirect to /forgot-password
❌ access_token: NOT FOUND (in console)
❌ No polling attempts (in console)
❌ SessionMonitor shows "No Active Session"
```

**If you see these → Something is wrong → Check troubleshooting section**

---

## 🧪 COMPLETE THE TEST

### **Step 6: Enter New Password**
1. Password: `TestPassword123!`
2. Confirm: `TestPassword123!`
3. Click "Reset Password"

### **Step 7: Verify Success**
1. ✅ Should see success message
2. ✅ Redirects to login after 2 seconds
3. ✅ Can login with new password

---

## 📊 SUCCESS CHECKLIST

Test passes when ALL are true:

- [ ] Console shows "access_token: EXISTS"
- [ ] Console shows "type: recovery"
- [ ] Console shows either "PASSWORD_RECOVERY event" OR "Session found via polling"
- [ ] Password form appears after 1-5 seconds
- [ ] SessionMonitor shows "Active Session"
- [ ] Can enter and submit new password
- [ ] Password updates successfully
- [ ] Can login with new password
- [ ] NO "Invalid or Expired Link" error

**If ALL checked → ✅ FIX WORKING!**

---

## 🔧 QUICK TROUBLESHOOTING

### **If "Invalid or Expired Link" shows:**

1. **Check console for "access_token: EXISTS"**
   - If NOT FOUND → Email template issue, not our fix
   - If FOUND → Continue below

2. **Check if polling started:**
   ```
   Should see: 🔍 Starting session polling...
   ```
   - If NOT showing → Component not mounting, check React
   - If showing → Continue below

3. **Check polling attempts:**
   ```
   Should see: 🔄 Poll attempt 1/10, 2/10, etc.
   ```
   - If showing but no session found → Token expired or invalid
   - Request NEW reset link

4. **Check SessionMonitor:**
   - If not visible → Not in dev mode (npm run dev)
   - If showing "No Session" → Token not being processed

---

### **If password reset link is old:**
- Password reset links expire after 1 hour
- Request NEW reset link
- Click link within 60 minutes

---

### **If app was left open:**
- Should still work! (We fixed this)
- Page will clear existing session first
- Then process recovery token
- Watch for: "Found existing session - signing out..."

---

## 🎯 WHAT TO REPORT

If test fails, copy and send:

1. **Console logs** (all of them from step 5)
2. **Screenshot of error**
3. **SessionMonitor screenshot** (if visible)
4. **URL from browser** (full URL with hash)
5. **How long ago you requested reset** (minutes/hours)

---

## ⏱️ EXPECTED TIMELINE

- Step 1-2: 1 minute (setup)
- Step 3: 1 minute (request reset)
- Step 4-5: 2 minutes (wait for email + click)
- Step 6-7: 1 minute (test password reset)

**Total: ~5 minutes**

---

## 💡 PRO TIPS

### **Faster Testing:**
1. Use a test email account for quicker email delivery
2. Keep DevTools open from the start
3. Have Gmail open in another tab
4. Clear console before clicking reset link

### **Better Debugging:**
1. Watch console logs in real-time
2. Check SessionMonitor constantly
3. Note exact timing of events
4. Copy full URL from browser address bar

### **Common Mistakes:**
- ❌ Not clearing browser storage first
- ❌ Closing DevTools before clicking link
- ❌ Using old reset link (>1 hour old)
- ❌ Not in dev mode (npm run build instead of npm run dev)

---

**READY? START THE TEST NOW!** 🚀

Expected result: Password form appears, no errors, can reset password successfully.

---

*Test Guide Created: 2025-11-11*
*For: SESSION_TIMEOUT_FIX_COMPLETE.md*
*Expected: 100% pass rate*
