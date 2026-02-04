# CLAUDE CODE PROMPT — Fix Global Scroll-Blocking Bug

PROJECT: ~/Mould/mrc-app

## ROLE
You are the Frontend Builder for the MRC Lead Management System, specializing in CSS layout and scroll behaviour fixes.

## TASK
Fix the catastrophic global scroll-blocking bug that prevents ALL pages from scrolling across ALL devices and roles. Three components are fighting over `document.body.style.overflow` and breaking scroll for the entire app.

## CONTEXT

### The Problem
The entire application is non-scrollable — Admin Dashboard, Technician Dashboard, Profile, Login, every single page. Desktop, mobile, Chrome emulation — all broken. Scrolling is a basic function and it's completely dead.

### Root Cause Analysis (COMPLETED — do NOT re-investigate, just implement the fixes)

There are **3 bugs**, not 1. They interact with each other to create the catastrophic failure:

**BUG 1 — BottomNavbar.tsx (PRIMARY CULPRIT)**
File: `src/components/layout/BottomNavbar.tsx`, lines 58-67

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeQuickActions();
    }
  };
  
  if (showQuickActions) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
  }
  
  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = 'auto'; // ← BUG: runs on EVERY cleanup, even when showQuickActions was false
  };
}, [showQuickActions]);
```

The cleanup function runs unconditionally — even when `showQuickActions` is `false`. Every re-render of this component sets `body.style.overflow = 'auto'`. Setting `'auto'` is NOT the same as `''` (empty/browser default). It overrides CSS rules and fights with other components. Since BottomNavbar renders on every AppLayout page, this affects every protected route.

**BUG 2 — CreateLeadModal.tsx (SECONDARY)**
File: `src/components/admin/CreateLeadModal.tsx`, lines 161-180

```typescript
useEffect(() => {
  if (isOpen) {
    const originalOverflow = document.body.style.overflow;  // ← Captures whatever is currently set (could be 'auto' from BottomNavbar bug)
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || '';  // ← Restores 'auto' instead of '' if BottomNavbar already polluted it
    };
  }
}, [isOpen]);

useEffect(() => {
  if (!isOpen && document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';  // ← Only cleans 'hidden', doesn't handle 'auto' pollution
  }
}, []);
```

This captures the "original" overflow value on open. But if BottomNavbar already set it to `'auto'`, it captures `'auto'` as the original and restores that instead of `''`.

**BUG 3 — .page-content CSS (MINOR)**
File: `src/index.css`, around line 6378

The `.page-content` wrapper (from PageTransition.tsx) wraps ALL routes but has no explicit scroll support. While not the cause of the bug, adding proper scroll handling here provides a safety net.

### Why This Affects ALL Pages (including Login which has no BottomNavbar)

The Login page itself uses the `.login-page` class which has `overflow: hidden` (intentionally, for the gradient background effect). This is fine because login content fits in viewport. BUT if someone logs in, navigates around (BottomNavbar pollutes body), then logs out and returns to login — the body still has `overflow: 'auto'` inline style from BottomNavbar's cleanup, which can conflict.

The real damage is on all protected routes where BottomNavbar renders.

## REASONING

- This is a P0 blocker — the app is literally unusable without scrolling
- The fix must address ALL 3 bugs, not just patch one
- The approach must be: **stop fighting over body.style.overflow** — each component should clean up properly and only modify body overflow when it actually needs to
- The pattern of storing/restoring `originalOverflow` is fragile when multiple components compete. Better pattern: set `'hidden'` when needed, reset to `''` (empty string = browser default) when done

## OUTPUT

Make exactly these changes to exactly these files:

### Fix 1: `src/components/layout/BottomNavbar.tsx`

Replace the entire useEffect block (lines 58-67) with:

```typescript
// Close menu on escape key & manage body scroll
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeQuickActions();
    }
  };

  if (showQuickActions) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';  // Reset to default (empty string, NOT 'auto')
    };
  }

  // When showQuickActions is false, only set up escape listener, do NOT touch body overflow
  return undefined;
}, [showQuickActions]);
```

Key changes:
- Cleanup only runs when `showQuickActions` was `true` (via the early return of the cleanup function inside the if-block)
- When `showQuickActions` is `false`, return `undefined` (no cleanup needed — do NOT touch body overflow)
- Reset to `''` (empty string) not `'auto'` — empty string removes the inline style entirely, letting CSS take over

### Fix 2: `src/components/admin/CreateLeadModal.tsx`

Replace the TWO useEffect blocks (lines 161-180) with this single useEffect:

```typescript
// Prevent body scroll when modal is open
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';  // Always reset to default (empty string)
    };
  }
}, [isOpen]);
```

Key changes:
- Remove the fragile "capture original overflow" pattern — just set hidden when open, reset to empty when closed
- Remove the separate "emergency cleanup" useEffect — no longer needed since we always reset to `''`
- Empty string `''` removes the inline style entirely, which is always the correct behaviour

### Fix 3: `src/index.css` — .page-content class

Find the existing `.page-content` rule (around line 6378):

```css
.page-content {
  animation: contentFadeIn 0.3s ease-out;
}
```

Replace with:

```css
.page-content {
  animation: contentFadeIn 0.3s ease-out;
  min-height: 100vh;
  min-height: 100dvh;
}
```

Key changes:
- Add `min-height: 100dvh` so the content wrapper always fills the viewport (100dvh handles mobile browser chrome correctly)
- Do NOT add `overflow-y: auto` here — we want natural document scroll, not a scrollable container. The body/html should handle scrolling, not this div.

### Fix 4: Verify no stale inline styles — Add a one-time cleanup to App.tsx

In `src/App.tsx`, inside the `App` component, add this useEffect BEFORE the existing `useEffect`:

```typescript
// One-time cleanup: remove any stale inline overflow styles on body
useEffect(() => {
  document.body.style.overflow = '';
}, []);
```

This ensures that when the app loads, any stale `overflow: hidden` or `overflow: auto` left on body from a previous session/hot-reload is cleared.

## STOPPING CONDITION

STOP after making all 4 fixes. Then:

1. Run `npm run build` to verify no TypeScript/build errors
2. Run `npm run dev` and confirm the dev server starts
3. Report back with:
   - Exact changes made (file, line, before → after)
   - Build result (pass/fail)
   - Any warnings or issues encountered

Do NOT proceed to testing, do NOT modify any other files, do NOT refactor anything else. Only these 4 targeted fixes.
