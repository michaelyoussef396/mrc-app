# Active Sprint Spec
> **User Instruction:** Please run `claude` and ask it to "Execute the active sprint spec".

## 🎯 Sprint Goal
*Status: READY_FOR_DEV*

**Objective:** Skills Infrastructure Setup

## 📖 Context
We need to establish a `skills/` library to standardize agent capabilities. The `new-context/skills` directory already contains the Anthropic skills. We need to filter them and create custom MRC-specific skills using the `skill-creator` skill.

**Target Directory:** `new-context/skills/`

## 📋 Comprehensive Execution Plan

### STEP 1: VALIDATE SKILLS DIRECTORY
- Verify that `new-context/skills` exists and contains subdirectories.
- **DO NOT CLONE** the repo again.

### STEP 2: FILTER SKILLS (DELETE UNUSED)
**Keep these folders** in `new-context/skills/`:
- `frontend-design`
- `webapp-testing`
- `pdf`
- `docx`
- `skill-creator`
- `spec`
- `template`

**Delete these folders** from `new-context/skills/`:
- `algorithmic-art`
- `brand-guidelines`
- `canvas-design`
- `doc-coauthoring`
- `internal-comms`
- `mcp-builder`
- `pptx`
- `slack-gif-creator`
- `theme-factory`
- `web-artifacts-builder`
- `xlsx`

### STEP 3: CREATE CUSTOM MRC SKILLS
Use the `skill-creator` skill (located at `new-context/skills/skill-creator`) to create the following skills.
Create the directory and `SKILL.md` file for each with the EXACT content provided below.

#### 1. `new-context/skills/supabase-wiring/SKILL.md`
```markdown
# Supabase Wiring Skill

## Purpose
Replace mock/hardcoded data in React components with real Supabase queries.

## When to Use
- Component has mock data (arrays, hardcoded values)
- Need to wire a dashboard/list to real database
- MASTER-TODO says "mock data" for a component

## Inputs
- Component file path (e.g., `src/pages/TechnicianDashboard.tsx`)
- Target Supabase table (e.g., `calendar_bookings`)
- Filter requirements (e.g., `technician_id = current user`)

## Process

### Step 1: Identify Mock Data
```bash
grep -n "mock\|Mock\|MOCK\|hardcoded" <component_path>
grep -n "const.*=.*\[" <component_path>  # Find hardcoded arrays
```

### Step 2: Check for Existing Hook
```bash
ls src/hooks/
grep -l "<table_name>" src/hooks/*.ts
```

### Step 3: Create or Reuse Hook
If no hook exists, create one following this pattern:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function use<Name>(userId: string) {
  return useQuery({
    queryKey: ['<key>', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('<table>')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

### Step 4: Replace Mock Data in Component
```typescript
// Before
const mockData = [{ id: '1', ... }];

// After
const { data, isLoading, error } = useHookName(user.id);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error.message} />;
if (!data?.length) return <EmptyState />;
```

### Step 5: Verify
- [ ] No `mock`, `Mock`, `MOCK` in file
- [ ] No hardcoded arrays
- [ ] Loading state works
- [ ] Error state works
- [ ] Empty state works
- [ ] Data displays correctly
- [ ] Works at 375px viewport

## Output
- Updated component using real Supabase data
- New hook file if created
- Verified working at 375px

## Edge Cases
- **RLS blocking data:** Check RLS policies allow access for user's role
- **No data in table:** Ensure empty state shows, seed test data if needed
- **Slow queries:** Add loading state, consider pagination for large datasets

## Examples
See `skills/supabase-wiring/examples/` for before/after examples.
```

#### 2. `new-context/skills/pricing-validator/SKILL.md`
```markdown
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
```

#### 3. `new-context/skills/mobile-testing/SKILL.md`
```markdown
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
```

#### 4. `new-context/skills/todo-sync/SKILL.md`
```markdown
# TODO Sync Skill

## Purpose
Keep MASTER-TODO.md accurate by verifying claims against actual code.

## When to Use
- After completing any task
- When code state seems to contradict TODO
- During weekly documentation review
- Before deployment

## Why This Matters
MASTER-TODO.md is the source of truth. If it says "complete" but code has mock data, the whole team is misled.

## Process

### Step 1: Identify Claim to Verify
Example claim from MASTER-TODO.md:
```
| TechnicianDashboard | ✅ Complete | Wired to calendar_bookings |
```

### Step 2: Verify Against Code
```bash
# Check for mock data
grep -n "mock\|Mock\|MOCK" src/pages/TechnicianDashboard.tsx

# Check what data source is used
grep -n "useQuery\|supabase\|fetch" src/pages/TechnicianDashboard.tsx

# Check imports
head -50 src/pages/TechnicianDashboard.tsx
```

### Step 3: Determine Actual State
- ✅ Complete = Works fully, real data, tested
- 🟡 Partial = UI done but mock data, or has known bugs
- ❌ Not Working = Broken or not built
- ⬜ TODO = Not started

### Step 4: Update MASTER-TODO.md
If claim doesn't match reality, update it:
```markdown
# Before (incorrect)
| TechnicianDashboard | ✅ Complete | Wired to calendar_bookings |

# After (correct)
| TechnicianDashboard | 🟡 Partial | Uses mockJobs (line 15), needs wiring |
```

### Step 5: Log the Discrepancy
Add to learnings section:
```markdown
## Learnings Log
- 2025-02-07: TechnicianDashboard claimed "complete" but used mock data. Always grep for 'mock' before marking complete.
```

## Verification Commands

### Check for Mock Data
```bash
grep -rn "mock\|Mock\|MOCK" src/pages/
grep -rn "hardcoded\|TODO\|FIXME" src/pages/
```

### Check Hook Data Sources
```bash
grep -l "supabase" src/hooks/*.ts  # Real data
grep -L "supabase" src/hooks/*.ts  # NOT using Supabase (suspicious)
```

### Compare TODO vs Reality
```bash
# List all pages
ls src/pages/*.tsx

# For each, check if it uses real data
for f in src/pages/*.tsx; do
  echo "=== $f ==="
  grep -c "mock\|Mock" "$f" && echo "HAS MOCK DATA"
done
```

## Output
- Updated MASTER-TODO.md with accurate status
- List of discrepancies found
- Learnings added to log
```

#### 5. `new-context/skills/australian-compliance/SKILL.md`
```markdown
# Australian Compliance Skill

## Purpose
Ensure all data formatting follows Australian business standards.

## When to Use
- Displaying phone numbers
- Formatting currency
- Formatting dates
- Calculating GST
- Displaying addresses

## Standards

### Phone Numbers
```
Mobile: 04XX XXX XXX
Landline: (03) XXXX XXXX
International: +61 4XX XXX XXX
```

```typescript
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('04')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  if (cleaned.startsWith('03')) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2 $3');
  }
  return phone;
}
```

### Currency
```
Format: $X,XXX.XX
Thousands separator: comma
Decimal: 2 places always
```

```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}
// Output: $1,234.56
```

### Dates
```
Display: DD/MM/YYYY
Input: YYYY-MM-DD (ISO for database)
Time: 12-hour with AM/PM
```

```typescript
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
// Output: 07/02/2025

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
// Output: 2:30 PM
```

### GST
```
Rate: 10% always
Applied: AFTER all other calculations
Display: Show subtotal ex GST, GST amount, total inc GST
```

```typescript
function calculateGST(subtotal: number): { gst: number; total: number } {
  const gst = subtotal * 0.10;
  return {
    gst: Math.round(gst * 100) / 100,
    total: Math.round((subtotal + gst) * 100) / 100,
  };
}
```

### ABN
```
Format: XX XXX XXX XXX
Example: 51 824 753 556
```

### Addresses
```
Format:
{street_number} {street_name}
{suburb} {state} {postcode}

Example:
123 Collins Street
Melbourne VIC 3000
```

### Timezone
```
Timezone: Australia/Melbourne
Handles AEST (UTC+10) and AEDT (UTC+11) automatically
```

```typescript
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
  });
}
```

### Spelling
Use Australian English:
- colour (not color)
- labour (not labor)
- organisation (not organization)
- metre (not meter)
- recognise (not recognize)

## Verification Checklist
- [ ] Phone numbers formatted correctly
- [ ] Currency shows $X,XXX.XX
- [ ] Dates show DD/MM/YYYY
- [ ] GST is exactly 10%
- [ ] ABN formatted with spaces
- [ ] Timezone is Australia/Melbourne
- [ ] Australian spelling used
```

### STEP 4: UPDATE AGENTS.md

Append the following section to `new-context/AGENTS.md`:

```markdown
## Skills

Before starting any task, check if a relevant skill exists in `skills/`:

### Anthropic Skills (Built-in)
- `skills/frontend-design/` - Building mobile-first UI components
- `skills/webapp-testing/` - E2E testing, browser testing
- `skills/pdf/` - Working with PDF files
- `skills/docx/` - Creating Word documents
- `skills/skill-creator/` - Creating new skills

### Custom MRC Skills
- `skills/supabase-wiring/` - Wiring components to real Supabase data
- `skills/pricing-validator/` - Validating pricing calculations (13% cap!)
- `skills/mobile-testing/` - Testing at 375px viewport
- `skills/todo-sync/` - Keeping MASTER-TODO.md accurate
- `skills/australian-compliance/` - Australian formatting standards

**Always read the relevant SKILL.md before starting a task.**
```

### STEP 5: COMMIT
Comit the changes to git.
