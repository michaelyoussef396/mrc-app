# Pricing Validator Skill

## Purpose
Validate that pricing calculations follow MRC's business rules, especially the 13% discount cap.

## When to Use
- Implementing or modifying pricing logic
- Testing cost estimate calculations
- Verifying pricing displays correctly

## CRITICAL RULES (NEVER VIOLATE)

### 13% Maximum Discount
```
DISCOUNT CAN NEVER EXCEED 13%
THIS IS A HARD BUSINESS RULE
```

### GST is Always 10%
```
GST = Subtotal × 0.10
Always added AFTER all other calculations
```

## Base Rates (Excluding GST)

| Work Type | 2 Hours | 8 Hours |
|-----------|---------|---------|
| No Demolition | $612.00 | $1,216.99 |
| Demolition | $711.90 | $1,798.90 |
| Construction | $661.96 | $1,507.95 |
| Subfloor | $900.00 | $2,334.69 |

## Discount Tiers

| Total Hours | Discount |
|-------------|----------|
| 1-8 | 0% |
| 9-16 | 7.5% |
| 17-24 | 10.25% |
| 25-32 | 11.5% |
| 33+ | 13% MAX |

## Equipment Rates (Per Day)

| Equipment | Rate |
|-----------|------|
| Dehumidifier | $132 |
| Air Mover | $46 |
| RCD Box | $5 |

## Validation Test Cases

Run these to verify pricing is correct:

### Test 1: Basic No Discount
```
Input: 2h no demolition, 0 equipment
Expected:
- Labour: $612.00
- Discount: 0%
- Subtotal Ex GST: $612.00
- GST: $61.20
- Total Inc GST: $673.20
```

### Test 2: With Discount
```
Input: 16h no demolition
Expected:
- Labour: $2,433.98
- Discount: 7.5% ($182.55)
- Labour After Discount: $2,251.43
- GST: $225.14
- Total Inc GST: $2,476.57
```

### Test 3: Max Discount Cap
```
Input: 100h any type
Expected:
- Discount: 13% (NOT 15%, NOT 20%, EXACTLY 13%)
```

### Test 4: With Equipment
```
Input: 8h no demo, 2 dehumidifiers, 3 air movers, 1 RCD, 3 days
Expected:
- Labour: $1,216.99
- Equipment: (2×$132×3) + (3×$46×3) + (1×$5×3) = $792 + $414 + $15 = $1,221
- Subtotal: $2,437.99
- GST: $243.80
- Total: $2,681.79
```

## Process

### Step 1: Locate Pricing Code
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "pricing\|calculateCost\|discount"
```
Main file: `src/lib/calculations/pricing.ts`

### Step 2: Run Test Cases
Create test file or run manually with each scenario above.

### Step 3: Verify Display
Check Section 9 of inspection form shows:
- Tier pricing reference table
- Labour breakdown per type
- Equipment breakdown (Qty × Rate × Days)
- Discount percentage and amount
- Subtotal Ex GST
- GST (10%)
- Total Inc GST (prominent)

### Step 4: Edge Case Testing
- [ ] 0 hours = $0
- [ ] 33+ hours = exactly 13% discount
- [ ] 100+ hours = still 13% (never more)
- [ ] Negative hours = handled (error or 0)
- [ ] Decimal hours (4.5h) = calculated correctly

## Output
- All test cases pass
- 13% cap verified
- GST calculation correct
- Display matches calculations

## Australian Formatting
- Currency: $X,XXX.XX (comma for thousands)
- Always show 2 decimal places
- Use `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`
