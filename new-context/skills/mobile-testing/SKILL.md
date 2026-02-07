# Mobile Testing Skill

## Purpose
Verify all UI works correctly at 375px viewport for field technicians using phones.

## When to Use
- After ANY UI change
- Before marking any component complete
- When fixing mobile bugs
- Pre-deployment testing

## Why This Matters
Field technicians (Clayton, Glen) work:
- In vans
- In basements (poor signal)
- Outdoors
- Wearing work gloves

**If it doesn't work at 375px, it doesn't work.**

## Requirements

### Viewport
- Primary: 375px width (iPhone SE/12 Mini)
- Also test: 390px (iPhone 14), 414px (iPhone Plus)

### Touch Targets
- Minimum: 48px × 48px
- Buttons: `h-12` (48px) minimum
- Adequate spacing between targets (≥8px)

### Typography
- Body text: 16px minimum (prevents iOS zoom)
- Inputs: 16px (prevents zoom on focus)

### Layout
- No horizontal scrolling
- Content fits viewport
- Bottom padding for nav: `pb-32`

## Process

### Step 1: Set Up Testing
```bash
# Using Playwright
npx playwright test --project=mobile

# Or Chrome DevTools
# 1. Open DevTools (F12)
# 2. Toggle device mode (Ctrl+Shift+M)
# 3. Select iPhone SE or 375px width
```

### Step 2: Visual Checklist
- [ ] No horizontal scrollbar
- [ ] No text cut off
- [ ] No overlapping elements
- [ ] All buttons ≥48px
- [ ] All text readable
- [ ] Bottom nav visible

### Step 3: Functional Checklist
- [ ] All navigation works
- [ ] All forms functional
- [ ] Dropdowns open correctly
- [ ] Date pickers work
- [ ] Photo capture works
- [ ] Loading states show
- [ ] Error states show

### Step 4: Touch Testing
Test with finger-sized taps:
- Can tap all buttons easily
- No accidental taps on adjacent elements
- Scrolling is smooth

## Common Fixes

### Horizontal Scroll
```css
overflow-x: hidden;
max-width: 100vw;
```

### Touch Targets Too Small
```css
min-height: 48px;
min-width: 48px;
padding: 12px 16px;
```

### Text Too Small
```css
font-size: 16px;  /* Minimum for body */
```

### Fixed Elements Blocking
```css
padding-bottom: 80px;  /* For bottom nav */
```

## Output
- Screenshot at 375px
- List of issues found (if any)
- Confirmation all checks pass
- Touch target audit results
