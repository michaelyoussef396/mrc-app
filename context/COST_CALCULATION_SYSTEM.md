# MRC COST CALCULATION SYSTEM - REFERENCE GUIDE

**Last Updated:** January 8, 2026
**Author:** Michael Youssef
**Critical:** This document defines the exact pricing logic for the MRC Lead Management System. Follow it precisely.

---

## OVERVIEW

The MRC cost calculation system uses **tier-based pricing with linear interpolation** for labour, combined with **volume discounts** based on total labour hours. Equipment costs are entered as a direct total. All prices exclude GST until the final calculation step.

---

## LABOUR TIER RATES (EXCLUDING GST)

### Tier Structure

| Labour Type      | 2-Hour Rate | 8-Hour Rate |
|------------------|-------------|-------------|
| Non-Demolition   | $612.00     | $1,216.99   |
| Demolition       | $711.90     | $1,798.90   |
| Subfloor         | $900.00     | $2,334.69   |

**Note:** Construction labour ($661.96 / $1,507.95) is not currently implemented but may be added in future phases.

---

## CALCULATION RULES

### Rule 1: Pro-Rate for Under 2 Hours

Any amount of work under 2 hours is pro-rated from the 2-hour tier rate.

**Formula:**
```javascript
cost = (hours / 2) * tier2h
```

**Examples:**
- 0.5 hours non-demo → (0.5 / 2) × $612.00 = $153.00
- 1 hour non-demo → (1 / 2) × $612.00 = $306.00
- 1.5 hours non-demo → (1.5 / 2) × $612.00 = $459.00

### Rule 2: Linear Interpolation (2-8 Hour Range)

For work between 2 and 8 hours, use **linear interpolation** between the tier rates.

**Formula:**
```javascript
cost = tier2h + ((hours - 2) / 6) * (tier8h - tier2h)
```

**Example: 5 hours of demolition work**
```
tier2h = $711.90
tier8h = $1,798.90
hours = 5

cost = $711.90 + ((5 - 2) / 6) × ($1,798.90 - $711.90)
     = $711.90 + (3 / 6) × $1,087.00
     = $711.90 + $543.50
     = $1,255.40
```

**More Examples:**

| Hours | Labour Type | Calculation | Cost |
|-------|-------------|-------------|------|
| 3h | Non-Demo | $612 + (1/6) × $604.99 | $712.83 |
| 5h | Non-Demo | $612 + (3/6) × $604.99 | $914.50 |
| 7h | Demolition | $711.90 + (5/6) × $1,087 | $1,617.42 |
| 4h | Subfloor | $900 + (2/6) × $1,434.69 | $1,378.23 |

### Rule 3: Day Blocks (8+ Hours)

Work over 8 hours is broken into **8-hour day blocks**, with remaining hours calculated using Rules 1 or 2.

**Formula:**
```javascript
fullDays = Math.floor(hours / 8)
remainingHours = hours % 8

cost = (fullDays * tier8h) + interpolateCost(remainingHours)
```

**Example: 17 hours non-demolition**
```
Day 1: 8 hours → $1,216.99 (8h tier)
Day 2: 8 hours → $1,216.99 (8h tier)
Remaining: 1 hour → (1/2) × $612 = $306.00 (pro-rated)
───────────────────────────
Total: $2,739.98
```

**Example: 13 hours demolition**
```
Day 1: 8 hours → $1,798.90 (8h tier)
Remaining: 5 hours → $1,255.40 (interpolated)
───────────────────────────
Total: $3,054.30
```

**Example: 21 hours non-demolition**
```
Day 1: 8 hours → $1,216.99
Day 2: 8 hours → $1,216.99
Remaining: 5 hours → $914.50 (interpolated)
───────────────────────────
Total: $3,348.48
```

---

## VOLUME DISCOUNT SYSTEM

Discounts apply to **TOTAL labour hours** across all labour types combined (non-demo + demo + subfloor).

### Discount Tiers

| Total Hours | Days | Discount % | Multiplier |
|-------------|------|------------|------------|
| 0-8 hours   | 1    | 0%         | 1.00       |
| 9-16 hours  | 2    | 7.5%       | 0.925      |
| 17-24 hours | 3    | 10.25%     | 0.8975     |
| 25-32 hours | 4    | 11.5%      | 0.885      |
| 33+ hours   | 5+   | **13% MAX**| 0.87       |

### Discount Calculation

```javascript
function calculateDiscount(totalHours) {
  if (totalHours <= 8) return 0;
  if (totalHours <= 16) return 0.075;
  if (totalHours <= 24) return 0.1025;
  if (totalHours <= 32) return 0.115;
  return 0.13; // Maximum discount - NEVER EXCEED
}
```

### Discount Examples

| Total Hours | Days | Discount | Multiplier |
|-------------|------|----------|------------|
| 5h          | 1    | 0%       | 1.00       |
| 12h         | 2    | 7.5%     | 0.925      |
| 22h         | 3    | 10.25%   | 0.8975     |
| 28h         | 4    | 11.5%    | 0.885      |
| 40h         | 5    | 13%      | 0.87       |
| 100h        | 13   | 13%      | 0.87       |

**CRITICAL:** The maximum discount is **13%**, regardless of how many days of work.

---

## EQUIPMENT COSTS

### Current Implementation: Direct Cost Entry

Equipment is entered as a **direct total cost** (ex GST), not calculated from quantities and rates.

```javascript
equipmentCost = userEnteredAmount; // Direct input, no calculation
```

### Reference Rates (for manual estimation)

| Equipment          | Daily Rate |
|--------------------|------------|
| Dehumidifier       | $132/day   |
| Air Mover/Blower   | $46/day    |
| RCD Box            | $5/day     |

**Note:** Equipment days typically equal labour days (totalHours ÷ 8, rounded up).

---

## COMPLETE CALCULATION FLOW

### Step 1: Calculate Labour Costs (Before Discount)

Calculate each labour type separately using tier pricing:

```javascript
nonDemoCost = calculateLabourCost(nonDemoHours, LABOUR_RATES.nonDemo)
demoCost = calculateLabourCost(demoHours, LABOUR_RATES.demolition)
subfloorCost = calculateLabourCost(subfloorHours, LABOUR_RATES.subfloor)

labourSubtotal = nonDemoCost + demoCost + subfloorCost
```

### Step 2: Calculate Volume Discount

```javascript
totalHours = nonDemoHours + demoHours + subfloorHours
discountPercent = calculateDiscount(totalHours)
```

### Step 3: Apply Discount to Labour

```javascript
discountAmount = labourSubtotal * discountPercent
labourAfterDiscount = labourSubtotal - discountAmount
```

### Step 4: Add Equipment Costs

```javascript
equipmentCost = userEnteredEquipmentTotal // Direct entry
```

### Step 5: Calculate Totals with GST

```javascript
subtotalExGst = labourAfterDiscount + equipmentCost
gstAmount = subtotalExGst * 0.10
totalIncGst = subtotalExGst + gstAmount
```

---

## COMPLETE EXAMPLE

### Job Details
- Non-Demolition: 17 hours
- Demolition: 5 hours
- Subfloor: 0 hours
- Equipment: $990.00 (direct entry)

### Calculation

#### 1. Labour (Before Discount)

**Non-Demolition (17h):**
```
Day 1: 8h → $1,216.99
Day 2: 8h → $1,216.99
Remaining: 1h → (1/2) × $612 = $306.00
Total: $2,739.98
```

**Demolition (5h):**
```
5h interpolated: $711.90 + (3/6) × $1,087 = $1,255.40
```

**Labour Subtotal:** $3,995.38

#### 2. Volume Discount
```
Total hours: 22
Discount tier: 17-24h → 10.25%
Multiplier: 0.8975
```

#### 3. Labour (After Discount)
```
Discount amount: $3,995.38 × 0.1025 = $409.53
Labour after discount: $3,995.38 - $409.53 = $3,585.85
```

#### 4. Equipment
```
Equipment (direct entry): $990.00
```

#### 5. Final Totals
```
Labour (after discount):  $3,585.85
Equipment:                  $990.00
──────────────────────────────────
Subtotal (Ex GST):        $4,575.85
GST (10%):                  $457.59
──────────────────────────────────
TOTAL (Inc GST):          $5,033.44
```

---

## MANUAL OVERRIDE FEATURE

Users can manually override the final total if needed:

1. Check "Override Total" checkbox
2. Enter custom total (Inc GST)
3. System uses custom amount instead of calculated amount
4. Labour/equipment breakdown shows as $0 when override is active

When manual override is enabled, the entered value is the **final total including GST**.

---

## CRITICAL RULES - NEVER VIOLATE

1. **Pro-rate under 2 hours** - Use (hours/2) × tier2h for 0-2h work
2. **Linear interpolation** - Use formula for 2-8 hour range
3. **8-hour day blocks** - Break work over 8h into full days + remainder
4. **13% maximum discount** - **NEVER exceed** regardless of hours
5. **GST added last** - After all labour and equipment calculations
6. **Discount applies to TOTAL hours** - Combined across all labour types
7. **Discount applies to labour only** - Equipment is not discounted

---

## TEST CASES

Use these to verify correct implementation:

### Test 1: Simple 5-hour job
```
Input: 5h non-demo, 0 equipment
Expected:
- Labour: $612 + (3/6) × $604.99 = $914.50
- Discount: 0% (under 8h)
- Subtotal: $914.50
- GST: $91.45
- Total: $1,005.95
```

### Test 2: Under 2 hours (pro-rate)
```
Input: 1h non-demo
Expected:
- Labour: (1/2) × $612 = $306.00
- Total inc GST: $336.60
```

### Test 3: Exactly 8 hours
```
Input: 8h demolition
Expected:
- Labour: $1,798.90 (8h tier)
- Discount: 0%
- Total inc GST: $1,978.79
```

### Test 4: Multi-day with discount
```
Input: 17h non-demo, 5h demo (22h total)
Expected:
- Non-demo: $2,739.98
- Demo: $1,255.40
- Subtotal before: $3,995.38
- Discount: 10.25%
- Labour after: $3,585.85
```

### Test 5: Maximum discount (33+ hours)
```
Input: 40h non-demo
Expected:
- Discount: 13% (capped, NOT higher)
- Multiplier: 0.87
```

### Test 6: Day blocks calculation
```
Input: 25h demolition
Expected:
- Day 1: $1,798.90
- Day 2: $1,798.90
- Day 3: $1,798.90
- Remaining: 1h → (1/2) × $711.90 = $355.95
- Total before discount: $5,752.65
- Discount: 11.5% (25-32h tier)
- Total after discount: $5,091.10
```

---

## DATABASE FIELDS

| Field | Description |
|-------|-------------|
| `no_demolition_hours` | Non-demolition labour hours |
| `demolition_hours` | Demolition labour hours |
| `subfloor_hours` | Subfloor labour hours |
| `labor_cost_ex_gst` | Labour cost after discount (ex GST) |
| `discount_percent` | Volume discount applied (0-13) |
| `equipment_cost_ex_gst` | Equipment cost (direct entry, ex GST) |
| `subtotal_ex_gst` | Labour + Equipment |
| `gst_amount` | Subtotal × 0.10 |
| `total_inc_gst` | Final total including GST |
| `manual_price_override` | Boolean - is override active? |
| `manual_total` | Override amount (inc GST) |

---

## IMPLEMENTATION REFERENCE

**Pricing Calculator:** `/src/lib/calculations/pricing.ts`

Key exports:
- `LABOUR_RATES` - Tier rate constants
- `DISCOUNT_TIERS` - Discount tier definitions
- `calculateLabourCost()` - Single labour type calculation
- `calculateDiscount()` - Get discount for total hours
- `calculateCostEstimate()` - Complete calculation
- `formatCurrency()` - Australian currency formatting
- `getDiscountTierDescription()` - Human-readable tier description

---

## DEBUGGING CHECKLIST

If costs don't match expected:

1. Are tier rates correct? ($612/$1,216.99 for non-demo, etc.)
2. Is pro-rate applied for 0-2h work? ((hours/2) × tier2h)
3. Is linear interpolation formula correct for 2-8h?
4. Are day blocks splitting at 8-hour boundaries?
5. Is remaining hours after day blocks calculated correctly?
6. Is discount calculated from TOTAL hours (not per type)?
7. Is discount capped at 13%?
8. Is discount applied to labour subtotal (not individual types)?
9. Is equipment added AFTER labour discount?
10. Is GST calculated on (labourAfterDiscount + equipment)?

---

## VERSION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-08 | 1.0 | Initial tier pricing implementation |

---

**End of Document**
