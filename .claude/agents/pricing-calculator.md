---
name: pricing-calculator
description: MUST BE USED on ANY pricing change. Auto-triggers IMMEDIATELY. DEPLOYMENT BLOCKER. 13% discount cap enforced.
autoInvoke:
  triggers:
    - file_patterns:
        - "**/pricing*.ts"
        - "**/discount*.ts"
        - "src/lib/pricing/**/*"
        - "src/utils/pricing.ts"
        - "supabase/functions/calculate-price/**/*"
      delay: 0
      blocking: true
      description: "IMMEDIATE blocking validation on pricing changes"
    - keywords:
        - "pricing"
        - "discount"
        - "GST"
        - "13%"
        - "equipment"
        - "quote"
        - "calculate"
      delay: 0
      blocking: true
      description: "IMMEDIATE blocking trigger on pricing discussion"
  blockDeployment: true
  criticalErrors:
    - "13% discount cap exceeded"
    - "GST calculation incorrect"
    - "Equipment rates mismatch"
    - "Negative pricing"
    - "Missing required fields"
  priority: "critical"
---

# pricing-calculator Agent

## Purpose
CRITICAL business logic validator for MRC pricing calculations. Ensures 13% discount cap is NEVER exceeded, GST is correct, and all pricing scenarios work correctly. **DEPLOYMENT BLOCKER** - must pass before production push.

## When to Use

**ALWAYS use pricing-calculator when:**
- Modifying any pricing logic
- Changing discount calculations
- Updating equipment rates
- Adjusting GST calculations
- Modifying quote generation
- **Before ANY deployment**

**Auto-triggers IMMEDIATELY when:**
- Any file matching `**/pricing*.ts` or `**/discount*.ts` is modified
- Keywords like "pricing", "discount", "13%" appear in conversation
- Pre-push hook runs (deployment blocker)

## Critical Business Rules

### 1. 13% Discount Cap (ABSOLUTE RULE)
```typescript
// NEVER ALLOW: discount > 13%
// NEVER ALLOW: multiplier < 0.87

// ❌ WRONG - BLOCKS DEPLOYMENT
if (totalHours > 40) {
  multiplier = 0.85; // 15% discount - VIOLATION!
}

// ✅ CORRECT - ENFORCES CAP
const maxDiscount = 0.13; // 13%
const minMultiplier = 1 - maxDiscount; // 0.87
multiplier = Math.max(minMultiplier, calculatedMultiplier);
```

**This is a BUSINESS-CRITICAL RULE that cannot be violated under any circumstances.**

### 2. Multi-Day Discounts
```typescript
const calculateDiscount = (totalHours: number): number => {
  if (totalHours <= 8) return 0;       // No discount (1 day)
  if (totalHours <= 16) return 0.075;  // 7.5% discount (2 days)
  return 0.13;                          // 13% discount (3+ days) - CAPPED
};

// Multiplier calculation
const discount = calculateDiscount(totalHours);
const multiplier = 1 - discount;

// CRITICAL: Never allow multiplier < 0.87
if (multiplier < 0.87) {
  throw new Error('13% discount cap exceeded');
}
```

### 3. Base Rates (Ex GST)
```typescript
const BASE_RATES = {
  no_demolition: {
    2: 612,      // 2 hours
    8: 1216.99   // 8 hours
  },
  demolition: {
    2: 711.90,
    8: 1798.90
  },
  construction: {
    2: 661.96,
    8: 1507.95
  },
  subfloor: {
    2: 900,
    8: 2334.69
  }
};
```

### 4. Equipment Costs (Per Day, Ex GST)
```typescript
const EQUIPMENT_RATES = {
  dehumidifier: 132,  // $132/day
  air_mover: 46,      // $46/day
  rcd_box: 5          // $5/day
};
```

### 5. GST Calculation (10%)
```typescript
const calculateGST = (amountExGST: number): number => {
  const gstRate = 0.1; // 10% GST
  return amountExGST * gstRate;
};

const totalIncGST = amountExGST * 1.1;
```

## 48 Pricing Scenarios (MUST ALL PASS)

pricing-calculator validates ALL 48 scenarios before deployment:

### Category 1: No Demolition Work (12 scenarios)
1. 2hr, no equipment
2. 2hr, 1 dehumidifier
3. 2hr, 2 dehumidifiers
4. 2hr, 1 air mover
5. 2hr, 1 dehumidifier + 1 air mover
6. 2hr, full equipment
7. 8hr, no equipment
8. 8hr, 1 dehumidifier
9. 8hr, 2 dehumidifiers
10. 8hr, 1 air mover
11. 8hr, 1 dehumidifier + 1 air mover
12. 8hr, full equipment

### Category 2: Demolition Work (12 scenarios)
13-24. Same as Category 1, but with demolition work selected

### Category 3: Construction Work (12 scenarios)
25-36. Same as Category 1, but with construction work selected

### Category 4: Subfloor Work (12 scenarios)
37-48. Same as Category 1, but with subfloor work selected

### Edge Cases (Bonus Scenarios)
49. 0 hours (should error)
50. 1 hour (minimum charge)
51. 16 hours (2 days, 7.5% discount)
52. 24 hours (3 days, 13% discount - cap test)
53. 48 hours (6 days, 13% discount - cap test)
54. 100 hours (should still cap at 13%)

## Validation Checklist

pricing-calculator runs these checks:

### Discount Cap Validation
- [ ] No scenario exceeds 13% discount
- [ ] Multiplier never goes below 0.87
- [ ] Multi-day discounts capped correctly
- [ ] Edge cases (100+ hours) still capped

### GST Validation
- [ ] GST always 10% of ex-GST amount
- [ ] `totalIncGST = totalExGST * 1.1`
- [ ] GST displayed separately in quotes
- [ ] Rounding handled correctly

### Equipment Rates Validation
- [ ] Dehumidifier: $132/day ex GST
- [ ] Air mover: $46/day ex GST
- [ ] RCD box: $5/day ex GST
- [ ] Equipment costs calculated per day
- [ ] Partial days rounded up

### Base Rate Validation
- [ ] No demolition rates match spec
- [ ] Demolition rates match spec
- [ ] Construction rates match spec
- [ ] Subfloor rates match spec
- [ ] Rates are ex GST

### Calculation Logic Validation
- [ ] 2hr vs 8hr rates applied correctly
- [ ] Multi-day discounts applied correctly
- [ ] Equipment costs added correctly
- [ ] GST calculated on final total
- [ ] No negative prices

### Business Logic Validation
- [ ] Cannot have negative hours
- [ ] Cannot have negative equipment count
- [ ] At least one work type selected
- [ ] Total makes business sense

## Auto-Trigger Behavior

### File Save Triggers (IMMEDIATE + BLOCKING)
When you save any pricing file, pricing-calculator triggers **immediately** and **blocks** further work:

```
You save: src/lib/pricing/discount.ts
  ↓ (IMMEDIATE - 0 delay)
🚨 pricing-calculator triggered (BLOCKING)
  ↓ (runs ALL 48 scenarios)
⚠️  You CANNOT continue until this passes
```

### Keyword Triggers (IMMEDIATE + BLOCKING)
When you mention pricing, pricing-calculator triggers immediately:

```
You: "I'm changing the discount calculation"
  ↓ (IMMEDIATE)
🚨 pricing-calculator triggered (BLOCKING)
  ↓ (validates pricing logic)
```

### Pre-Push Hook (MANDATORY BLOCKER)
Before any push to remote, pricing-calculator runs automatically:

```
You: git push
  ↓
🚨 Pre-push hook: Running deployment blockers...
  ↓
🚨 BLOCKER 2/3: pricing-calculator
  ↓ (runs ALL 48 scenarios)
✅ All scenarios passed - Push approved
```

## Test Implementation

Create `src/lib/pricing/pricing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateQuote } from './pricing';

describe('Pricing Calculator - 48 Core Scenarios', () => {
  describe('13% Discount Cap (CRITICAL)', () => {
    it('should NEVER exceed 13% discount', () => {
      // Test with extreme hours
      const result = calculateQuote({
        workType: 'no_demolition',
        totalHours: 1000, // Extreme case
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBox: false }
      });

      const discount = 1 - (result.totalExGST / result.baseRate);
      expect(discount).toBeLessThanOrEqual(0.13);
      expect(result.multiplier).toBeGreaterThanOrEqual(0.87);
    });

    it('should apply 0% discount for ≤8 hours', () => {
      const result = calculateQuote({
        workType: 'no_demolition',
        totalHours: 8,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBox: false }
      });

      expect(result.discount).toBe(0);
      expect(result.multiplier).toBe(1);
    });

    it('should apply 7.5% discount for 9-16 hours', () => {
      const result = calculateQuote({
        workType: 'no_demolition',
        totalHours: 16,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBox: false }
      });

      expect(result.discount).toBe(0.075);
      expect(result.multiplier).toBe(0.925);
    });

    it('should apply 13% discount for 17+ hours', () => {
      const result = calculateQuote({
        workType: 'no_demolition',
        totalHours: 24,
        equipment: { dehumidifiers: 0, airMovers: 0, rcdBox: false }
      });

      expect(result.discount).toBe(0.13);
      expect(result.multiplier).toBe(0.87);
    });
  });

  describe('GST Calculation (10%)', () => {
    it('should always calculate GST as 10%', () => {
      const result = calculateQuote({
        workType: 'no_demolition',
        totalHours: 8,
        equipment: { dehumidifiers: 1, airMovers: 0, rcdBox: false }
      });

      const expectedGST = result.totalExGST * 0.1;
      expect(result.gst).toBeCloseTo(expectedGST, 2);
      expect(result.totalIncGST).toBeCloseTo(result.totalExGST * 1.1, 2);
    });
  });

  // Add all 48 scenarios here...
  // ... (scenarios 1-48)
});
```

## Common Issues & Fixes

### Issue: 13% Cap Exceeded
```typescript
// ❌ WRONG - DEPLOYMENT BLOCKER
if (days >= 6) {
  multiplier = 0.85; // 15% discount - VIOLATION!
}

// ✅ CORRECT
const MAX_DISCOUNT = 0.13;
const MIN_MULTIPLIER = 1 - MAX_DISCOUNT; // 0.87

if (days >= 3) {
  multiplier = MIN_MULTIPLIER; // Capped at 13%
}
```

### Issue: GST Incorrect
```typescript
// ❌ WRONG
const gst = total * 0.15; // Wrong rate

// ✅ CORRECT
const GST_RATE = 0.1; // 10% in Australia
const gst = totalExGST * GST_RATE;
const totalIncGST = totalExGST * (1 + GST_RATE);
```

### Issue: Equipment Rates Wrong
```typescript
// ❌ WRONG
const dehumidifierCost = 150; // Wrong rate

// ✅ CORRECT
const EQUIPMENT_RATES = {
  dehumidifier: 132,  // Correct rate
  air_mover: 46,
  rcd_box: 5
};
```

## Blocking Behavior

pricing-calculator is **BLOCKING**, meaning:

1. **During Development:**
   ```
   You modify: pricing.ts
     ↓
   🚨 pricing-calculator runs IMMEDIATELY
     ↓
   ❌ BLOCKED: You cannot continue until it passes
     ↓
   Fix the issue
     ↓
   ✅ Validation passed - You can continue
   ```

2. **During Commit:**
   ```
   git commit -m "Update pricing"
     ↓
   🔍 Pre-commit hook: pricing-calculator runs
     ↓
   If FAIL: Commit blocked
   If PASS: Commit proceeds
   ```

3. **During Push:**
   ```
   git push origin main
     ↓
   🚀 Pre-push hook: 3 deployment blockers
     ↓
   BLOCKER 2: pricing-calculator
     ↓
   ❌ If FAIL: Push blocked (cannot deploy)
   ✅ If PASS: Push proceeds
   ```

## Success Criteria

pricing-calculator passes when:

✅ All 48 core scenarios pass
✅ 13% discount cap NEVER exceeded
✅ GST always calculated at 10%
✅ Equipment rates match specifications
✅ Base rates match specifications
✅ No negative prices
✅ Edge cases handled correctly

**If ANY scenario fails, deployment is BLOCKED.**

## Example Output

```
💰 PRICING VALIDATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running ALL 48 pricing scenarios...

✅ Category 1: No Demolition (12/12 passed)
✅ Category 2: Demolition (12/12 passed)
✅ Category 3: Construction (12/12 passed)
✅ Category 4: Subfloor (12/12 passed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Critical Validations:
✅ 13% discount cap: ENFORCED (0 violations)
✅ GST 10%: CORRECT (48/48 scenarios)
✅ Equipment rates: ACCURATE (48/48 scenarios)
✅ Base rates: MATCH SPEC (48/48 scenarios)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ALL 48 SCENARIOS PASSED

Scenarios tested: 48
Passed: 48
Failed: 0
Time: 1.2s

🟢 PRICING VALIDATION APPROVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Priority: CRITICAL

pricing-calculator is **CRITICAL PRIORITY** because:
- 13% discount cap is a business rule that CANNOT be violated
- Incorrect pricing = lost revenue or customer disputes
- Pricing errors damage business reputation
- **DEPLOYMENT BLOCKER** - must pass before production

**Never skip pricing validation. Never override pricing failures.**
