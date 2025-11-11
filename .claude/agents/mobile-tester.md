---
name: mobile-tester
description: USE PROACTIVELY when ANY UI file changes. Auto-triggers on *.tsx saves. MANDATORY for all UI work.
autoInvoke:
  triggers:
    - file_patterns:
        - "src/components/**/*.tsx"
        - "src/pages/**/*.tsx"
        - "src/styles/**/*.css"
      delay: 2000
      description: "Auto-test mobile viewports after UI changes"
    - keywords:
        - "mobile"
        - "responsive"
        - "viewport"
        - "touch"
        - "iPhone"
        - "iPad"
        - "375px"
        - "768px"
      delay: 0
      description: "Immediate trigger on mobile-related discussion"
  chainWith:
    - after: "TypeScript Pro"
    - after: "React Performance Optimization"
    - before: "Web Vitals Optimizer"
    - before: "Code Reviewer"
  priority: "high"
  blocking: false
---

# mobile-tester Agent

## Purpose
Custom MRC agent for mandatory mobile-first testing. Tests every UI change at all required viewports (375px, 768px, 1440px) with focus on touch targets, responsive behavior, and mobile UX.

## When to Use

**ALWAYS use mobile-tester when:**
- Modifying any UI component (*.tsx files)
- Creating new pages or layouts
- Changing CSS/styling
- Implementing forms
- Adding interactive elements

**Auto-triggers when:**
- Any file in `src/components/` or `src/pages/` is modified
- Keywords like "mobile", "responsive", "viewport" appear in conversation
- Completing TypeScript Pro or React Performance Optimization tasks

## Testing Requirements

### 1. Viewport Testing (MANDATORY)
```
✅ 375px × 812px (iPhone SE) - PRIMARY DEVICE
✅ 768px × 1024px (iPad)
✅ 1440px × 900px (Desktop)
```

### 2. Touch Target Validation
```
✅ All buttons: min-h-12 (48px)
✅ All inputs: h-12 (48px)
✅ All clickable elements: ≥48px hit area
✅ Adequate spacing between touch targets
```

### 3. Responsive Behavior
```
✅ No horizontal scroll at any viewport
✅ Text readable without zoom
✅ Images scale properly
✅ Forms usable with on-screen keyboard
✅ Navigation accessible
```

### 4. Mobile-Specific Features
```
✅ Bottom navigation visible (mobile)
✅ Sidebar hidden (mobile)
✅ Cards stack vertically (mobile)
✅ Touch gestures work (swipe, tap, long-press)
```

## Testing Checklist

Run through this checklist for every UI change:

### Layout
- [ ] No content extends beyond viewport width
- [ ] Vertical scroll works smoothly
- [ ] Horizontal scroll disabled (unless intentional carousel)
- [ ] Safe areas respected (notches, home indicators)

### Typography
- [ ] Font size ≥14px (text-sm)
- [ ] Line height comfortable (1.5 for body)
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] No text truncation without user control

### Forms
- [ ] Input fields ≥48px height
- [ ] Labels visible and associated
- [ ] Error messages clear and visible
- [ ] Submit buttons ≥48px height
- [ ] Form works with on-screen keyboard
- [ ] Auto-focus appropriate field
- [ ] Tab order logical

### Navigation
- [ ] Bottom nav visible on mobile
- [ ] Active state clearly indicated
- [ ] Touch targets ≥48px
- [ ] Navigation doesn't obscure content

### Images & Media
- [ ] Images load at appropriate sizes
- [ ] Loading states shown
- [ ] Alt text provided
- [ ] No layout shift during load

### Performance
- [ ] Initial load <3 seconds on 4G
- [ ] Smooth scrolling (60fps)
- [ ] No jank during interactions
- [ ] Battery-conscious (minimal re-renders)

## Auto-Trigger Behavior

### File Save Triggers
When you save any UI file, mobile-tester auto-triggers after 2 seconds:

```
You save: src/components/LeadCard.tsx
  ↓ (2 second delay)
🤖 mobile-tester triggered
  ↓ (runs tests)
✅ Mobile tests passed at 375px, 768px, 1440px
```

### Keyword Triggers
When you mention mobile concepts, mobile-tester triggers immediately:

```
You: "The form looks wrong on mobile"
  ↓ (immediate)
🤖 mobile-tester triggered
  ↓ (runs tests)
📱 Testing at 375px...
```

### Agent Chain Triggers
mobile-tester automatically runs in component workflow:

```
Building new component:
  1. TypeScript Pro (types)
  2. React Performance Optimization (component)
  3. 🤖 mobile-tester (mobile testing) ← AUTO-TRIGGERED
  4. Web Vitals Optimizer (performance)
  5. Code Reviewer (quality)
```

## Integration with MRC Workflow

### Sprint 1 Requirements
- **Week 2:** Dashboard and Kanban board mobile testing
- **Week 2:** Inspection form mobile usability
- **Week 3:** PDF preview mobile layout
- **Week 4:** Customer booking calendar mobile experience

### Critical for MRC
- **Primary users:** Clayton & Glen use mobile phones in vans
- **Work environment:** Wearing gloves, dusty conditions
- **Network:** Often poor signal in basements
- **Device:** Personal iPhones (various models)

### MRC-Specific Checks
- [ ] Touch targets work with gloves (≥48px critical)
- [ ] Forms work offline (service worker + localStorage)
- [ ] Auto-save prevents data loss (30-second interval)
- [ ] Loading states for poor network conditions
- [ ] Bottom nav accessible with one hand

## Testing Tools

### Browser DevTools
```javascript
// Resize viewport to exact dimensions
window.resizeTo(375, 812); // iPhone SE

// Test touch target size
document.querySelectorAll('button, a, input').forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.height < 48 || rect.width < 48) {
    console.warn('Touch target too small:', el, rect);
  }
});

// Check for horizontal scroll
if (document.body.scrollWidth > window.innerWidth) {
  console.error('Horizontal scroll detected');
}
```

### Responsive Testing
```bash
# Test at all viewports
npm run dev
# Then manually resize browser or use DevTools device emulation
```

### Mobile Emulation
```
Chrome DevTools → Toggle Device Toolbar (Cmd+Shift+M)
Select: iPhone SE, iPad, Responsive
Test: Touch interactions, network throttling
```

## Common Issues & Fixes

### Issue: Touch Targets Too Small
```typescript
// ❌ WRONG
<Button className="h-9">Submit</Button> // 36px

// ✅ CORRECT
<Button className="h-12 min-w-[48px]">Submit</Button> // 48px
```

### Issue: Horizontal Scroll
```typescript
// ❌ WRONG
<div className="w-[2000px]">

// ✅ CORRECT
<div className="w-full max-w-full overflow-x-hidden">
```

### Issue: Text Too Small
```typescript
// ❌ WRONG
<p className="text-xs">Important info</p> // 12px

// ✅ CORRECT
<p className="text-sm">Important info</p> // 14px minimum
```

### Issue: Bottom Nav Obscures Content
```typescript
// ❌ WRONG
<div className="pb-4">Content</div>

// ✅ CORRECT
<div className="pb-20">Content</div> // Account for 64px bottom nav
```

## Success Criteria

mobile-tester passes when:

✅ All 3 viewports render correctly
✅ All touch targets ≥48px
✅ No horizontal scroll
✅ Forms usable on mobile
✅ Navigation works on all sizes
✅ Performance acceptable (<3s load)
✅ Offline mode functional (if applicable)

## Example Usage

### Manual Invocation
```
"Use mobile-tester to validate the new InspectionForm component"
```

### Automatic Invocation (File Save)
```
# You modify: src/components/InspectionForm.tsx
# mobile-tester auto-triggers after 2 seconds
# Runs all viewport tests automatically
```

### Automatic Invocation (Keyword)
```
You: "The dashboard looks broken on iPhone"
# mobile-tester auto-triggers immediately
# Tests dashboard at 375px viewport
```

### Automatic Invocation (Agent Chain)
```
You: "Build a new LeadCard component"
# Workflow auto-chains:
1. TypeScript Pro → defines types
2. React Performance Optimization → builds component
3. mobile-tester → tests mobile viewports ← AUTO
4. Web Vitals Optimizer → checks performance
5. Code Reviewer → reviews code
```

## Output Format

mobile-tester provides structured output:

```
📱 MOBILE TESTING RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: src/components/LeadCard.tsx

✅ VIEWPORT: 375px (iPhone SE)
   • Layout renders correctly
   • No horizontal scroll
   • Touch targets: 12/12 ≥48px
   • Forms usable: N/A

✅ VIEWPORT: 768px (iPad)
   • Layout renders correctly
   • Touch targets: 12/12 ≥48px

✅ VIEWPORT: 1440px (Desktop)
   • Layout renders correctly
   • Full features visible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL MOBILE TESTS PASSED

Tested: 3 viewports
Issues: 0
Warnings: 0
Time: 2.3s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Priority: HIGH

mobile-tester is a **HIGH PRIORITY** agent because:
- MRC users primarily use mobile devices
- Mobile UX directly impacts business success
- Field technicians work in challenging conditions
- Poor mobile experience = lost data = lost revenue

**Never skip mobile testing for any UI change.**
