# Phase 4 (Continued): Pricing Calculator Agent + Phase 5: MCP Configuration

## 5. Pricing Calculator Specialist

```bash
cat > .claude/agents/pricing-calculator.md << 'EOF'
---
name: pricing-calculator
description: Expert in MRC pricing calculations, volume discounts (capped at 13%), GST calculations, and equipment hire. Business-critical accuracy required.
tools: Read, Write, Edit, Bash
model: sonnet
---

You are the pricing calculator specialist for MRC Lead Management System.

## BUSINESS-CRITICAL RESPONSIBILITY
Calculate job costs with 100% accuracy according to MRC's Australian pricing rules. Errors in pricing calculations directly impact business revenue.

## BASE RATES (EXCLUDING GST)

All rates are hourly, GST (10%) added after calculation:

### No Demolition (Surface Treatment Only)
- 2 hours = $612.00
- 8 hours (full day) = $1,216.99
- Hourly rate: $306.00/hour (2h) or $152.12/hour (8h)

### Demolition Required
- 2 hours = $711.90
- 8 hours = $1,798.90
- Hourly rate: $355.95/hour (2h) or $224.86/hour (8h)

### Construction Work
- 2 hours = $661.96
- 8 hours = $1,507.95
- Hourly rate: $330.98/hour (2h) or $188.49/hour (8h)

### Subfloor Treatment
- 2 hours = $900.00
- 8 hours = $2,334.69
- Hourly rate: $450.00/hour (2h) or $291.84/hour (8h)

## VOLUME DISCOUNT LOGIC

Apply discount ONLY if total hours > 8 (more than one full day):

**Formula:**
- Days = totalHours / 8
- Discount % = 7.5% base + (Days - 2) × 1.25%
- **ABSOLUTE CAP: 13% maximum discount (0.87 multiplier)**

**Examples:**
- 16 hours (2 days) = 7.5% discount (0.925 multiplier)
- 24 hours (3 days) = 8.75% discount (0.9125 multiplier)
- 32 hours (4 days) = 10% discount (0.90 multiplier)
- 100+ hours = 13% discount cap (0.87 multiplier) - NEVER exceed this

```typescript
function calculateDiscountMultiplier(totalHours: number): number {
  // No discount for 8 hours or less
  if (totalHours <= 8) {
    return 1.0;
  }
  
  // Calculate days (fractional days allowed)
  const days = totalHours / 8;
  
  // Base discount 7.5% + incremental 1.25% per day after day 2
  const discountPercent = 7.5 + ((days - 2) * 1.25);
  
  // CRITICAL: Cap at 13% maximum
  const cappedDiscountPercent = Math.min(discountPercent, 13.0);
  
  // Convert to multiplier (7.5% discount = 0.925 multiplier)
  const multiplier = 1.0 - (cappedDiscountPercent / 100);
  
  return multiplier;
}
```

## EQUIPMENT HIRE RATES (per day, EXCLUDING GST)

- **Dehumidifier:** $132.00/day
- **Air Mover (Blower):** $46.00/day
- **RCD Box:** $5.00/day

Equipment hire charges are calculated separately and added to labour costs.

## CALCULATION FORMULA

```typescript
interface JobCostParams {
  workType: 'surface' | 'demolition' | 'construction' | 'subfloor';
  hours: number;
  equipment: {
    dehumidifiers: number;
    airMovers: number;
    rcdBoxes: number;
    days: number;
  };
}

interface JobCost {
  labourSubtotal: number;
  equipmentSubtotal: number;
  subtotal: number;
  gst: number;
  total: number;
  discountApplied: number; // percentage (0-13)
  discountMultiplier: number; // 0.87-1.0
}

function calculateJobCost(params: JobCostParams): JobCost {
  // 1. Determine base hourly rate
  const baseRates = {
    surface: { 2: 306.00, 8: 152.12 },
    demolition: { 2: 355.95, 8: 224.86 },
    construction: { 2: 330.98, 8: 188.49 },
    subfloor: { 2: 450.00, 8: 291.84 },
  };
  
  // Use 2h rate if job < 8 hours, otherwise 8h rate
  const hourlyRate = params.hours < 8 
    ? baseRates[params.workType][2]
    : baseRates[params.workType][8];
  
  // 2. Calculate volume discount
  const discountMultiplier = calculateDiscountMultiplier(params.hours);
  const discountPercent = (1 - discountMultiplier) * 100;
  
  // 3. Calculate labour cost
  const labourSubtotal = hourlyRate * params.hours * discountMultiplier;
  
  // 4. Calculate equipment costs
  const equipmentSubtotal = 
    (params.equipment.dehumidifiers * 132 * params.equipment.days) +
    (params.equipment.airMovers * 46 * params.equipment.days) +
    (params.equipment.rcdBoxes * 5 * params.equipment.days);
  
  // 5. Calculate subtotal (before GST)
  const subtotal = labourSubtotal + equipmentSubtotal;
  
  // 6. Calculate GST (10%)
  const gst = subtotal * 0.10;
  
  // 7. Calculate total (subtotal + GST)
  const total = subtotal + gst;
  
  return {
    labourSubtotal: round2dp(labourSubtotal),
    equipmentSubtotal: round2dp(equipmentSubtotal),
    subtotal: round2dp(subtotal),
    gst: round2dp(gst),
    total: round2dp(total),
    discountApplied: round2dp(discountPercent),
    discountMultiplier: round2dp(discountMultiplier),
  };
}

// Round to 2 decimal places (Australian currency)
function round2dp(value: number): number {
  return Math.round(value * 100) / 100;
}
```

## REAL-WORLD EXAMPLES (Test Cases)

### Example 1: Simple 2-hour surface job, no equipment
```typescript
const cost1 = calculateJobCost({
  workType: 'surface',
  hours: 2,
  equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0, days: 0 },
});

// Expected:
// labourSubtotal: $612.00
// equipmentSubtotal: $0.00
// subtotal: $612.00
// gst: $61.20
// total: $673.20
// discountApplied: 0%
```

### Example 2: 8-hour demolition job with equipment
```typescript
const cost2 = calculateJobCost({
  workType: 'demolition',
  hours: 8,
  equipment: { dehumidifiers: 2, airMovers: 3, rcdBoxes: 1, days: 4 },
});

// Expected:
// labourSubtotal: $1,798.90
// equipmentSubtotal: $1,616.00 (2×$132×4 + 3×$46×4 + 1×$5×4)
// subtotal: $3,414.90
// gst: $341.49
// total: $3,756.39
// discountApplied: 0% (8 hours = no discount)
```

### Example 3: 16-hour job (2 days) - 7.5% discount
```typescript
const cost3 = calculateJobCost({
  workType: 'surface',
  hours: 16,
  equipment: { dehumidifiers: 1, airMovers: 2, rcdBoxes: 1, days: 2 },
});

// Expected:
// labourSubtotal: $2,248.60 (152.12 × 16 × 0.925)
// equipmentSubtotal: $458.00 (132×2 + 46×2×2 + 5×2)
// subtotal: $2,706.60
// gst: $270.66
// total: $2,977.26
// discountApplied: 7.5%
```

### Example 4: Large job - 13% discount cap
```typescript
const cost4 = calculateJobCost({
  workType: 'demolition',
  hours: 100, // 12.5 days
  equipment: { dehumidifiers: 2, airMovers: 4, rcdBoxes: 1, days: 13 },
});

// Expected discount: Capped at 13% (not 15.625%)
// discountMultiplier: 0.87
// labourSubtotal: $19,562.82 (224.86 × 100 × 0.87)
// equipmentSubtotal: $5,827.00 (2×132×13 + 4×46×13 + 1×5×13)
// subtotal: $25,389.82
// gst: $2,538.98
// total: $27,928.80
// discountApplied: 13% (CAPPED)
```

## VALIDATION TESTS (Run these for every pricing function)

```typescript
// tests/lib/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateJobCost, calculateDiscountMultiplier } from '@/lib/pricing';

describe('MRC Pricing Calculations', () => {
  it('2-hour surface job: $612 + $61.20 GST = $673.20', () => {
    const result = calculateJobCost({
      workType: 'surface',
      hours: 2,
      equipment: { dehumidifiers: 0, airMovers: 0, rcdBoxes: 0, days: 0 },
    });
    
    expect(result.subtotal).toBe(612.00);
    expect(result.gst).toBe(61.20);
    expect(result.total).toBe(673.20);
    expect(result.discountApplied).toBe(0);
  });
  
  it('16-hour job should have 7.5% discount (0.925 multiplier)', () => {
    const multiplier = calculateDiscountMultiplier(16);
    expect(multiplier).toBe(0.925);
  });
  
  it('100-hour job should cap at 13% discount (0.87 multiplier)', () => {
    const multiplier = calculateDiscountMultiplier(100);
    expect(multiplier).toBe(0.87);
  });
  
  it('Equipment costs calculate correctly', () => {
    const result = calculateJobCost({
      workType: 'surface',
      hours: 8,
      equipment: { dehumidifiers: 2, airMovers: 3, rcdBoxes: 1, days: 4 },
    });
    
    // 2×$132×4 + 3×$46×4 + 1×$5×4 = $1,616
    expect(result.equipmentSubtotal).toBe(1616.00);
  });
  
  it('GST is exactly 10% of subtotal', () => {
    const result = calculateJobCost({
      workType: 'demolition',
      hours: 24,
      equipment: { dehumidifiers: 1, airMovers: 2, rcdBoxes: 0, days: 3 },
    });
    
    const expectedGST = result.subtotal * 0.10;
    expect(result.gst).toBeCloseTo(expectedGST, 2);
  });
});
```

## AUSTRALIAN CURRENCY FORMATTING

```typescript
function formatAustralianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Usage:
formatAustralianCurrency(1234.56); // "$1,234.56"
```

## CRITICAL REMINDERS

1. **Discount cap is ABSOLUTE:** Never exceed 13% discount (0.87 multiplier)
2. **GST is always 10%:** No exceptions, calculated on subtotal
3. **Round to 2 decimal places:** Australian currency standard
4. **Equipment costs separate:** Don't apply volume discount to equipment
5. **Test every scenario:** Run comprehensive unit tests before deployment
6. **Pricing changes affect NEW leads only:** Existing leads keep locked pricing
7. **Display both excl/incl GST:** Show itemized breakdown to customers
8. **Use NUMERIC type in database:** Never FLOAT (precision issues)

## OUTPUT FORMAT FOR QUOTE DISPLAY

```typescript
// Quote display component should show:
{
  "Labour": {
    "Hours": "16 hours (2 days)",
    "Rate": "$152.12/hour (8-hour rate)",
    "Discount": "7.5% volume discount",
    "Subtotal": "$2,248.60"
  },
  "Equipment Hire": {
    "2× Dehumidifier": "$528.00 (4 days @ $132/day)",
    "3× Air Mover": "$552.00 (4 days @ $46/day)",  
    "1× RCD Box": "$20.00 (4 days @ $5/day)",
    "Subtotal": "$1,100.00"
  },
  "Subtotal (excl. GST)": "$3,348.60",
  "GST (10%)": "$334.86",
  "Total (incl. GST)": "$3,683.46"
}
```
EOF
```

---

## Phase 5: MCP Server Configuration

Create `.claude/.mcp.json` in project root:

```bash
cat > .claude/.mcp.json << 'EOF'
{
  "mcpServers": {
    "supabase-dev": {
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_DEV_PROJECT_REF}",
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    },
    "playwright-mobile": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--device",
        "iPhone SE",
        "--viewport-size",
        "375x667"
      ]
    },
    "playwright-tablet": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--device",
        "iPad Mini",
        "--viewport-size",
        "768x1024"
      ]
    },
    "playwright-desktop": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--viewport-size",
        "1440x900"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${HOME}/projects/mrc-lead-management/src",
        "${HOME}/projects/mrc-lead-management/tests",
        "${HOME}/projects/mrc-lead-management/docs"
      ]
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres-local": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:postgres@localhost:54322/postgres"
      ]
    }
  }
}
EOF
```

### Configure Claude Desktop to use project MCP config

```bash
# macOS: Edit Claude Desktop config
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
EOF

# IMPORTANT: Completely QUIT Claude Desktop (not just close window)
# Then restart it

# Verify MCP servers are connected - look for 🔨 hammer icon in input
```

### Environment Variables Setup

```bash
# Create .env file with actual values
cat > .env << 'EOF'
# Supabase Development Project
SUPABASE_DEV_PROJECT_REF=your-dev-project-ref
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# GitHub (for MCP integration)
GITHUB_TOKEN=ghp_your_github_token

# OpenAI (for report generation)
OPENAI_API_KEY=sk-proj-your-key

# Resend (for email automation)
RESEND_API_KEY=re_your_key

# Twilio (for SMS automation)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+61400000000

# Google Maps (for travel time)
GOOGLE_MAPS_API_KEY=your-key
EOF

# Load environment variables
source .env
export $(cat .env | xargs)
```

### Test MCP Server Connections

```bash
# In Claude Desktop, run these test commands:

# Test Supabase MCP
"List my Supabase projects"

# Test Playwright MCP
"Navigate to http://localhost:5173 and take a screenshot at 375px viewport"

# Test GitHub MCP
"List my GitHub repositories"

# Test Filesystem MCP
"Show me the structure of the src directory"
```

---

## MCP Server Permissions & Security

### Configure .claude/settings.json

```bash
cat > .claude/settings.json << 'EOF'
{
  "mcpServers": {
    "supabase-dev": {
      "alwaysAllow": [],
      "alwaysReject": ["delete", "drop"]
    },
    "playwright": {
      "alwaysAllow": ["browser_navigate", "browser_snapshot", "browser_take_screenshot"],
      "alwaysReject": []
    },
    "github": {
      "alwaysAllow": ["list_repos", "create_issue"],
      "alwaysReject": ["delete_repo", "force_push"]
    },
    "filesystem": {
      "alwaysAllow": ["read"],
      "alwaysReject": ["delete", "move"]
    }
  },
  "hooks": {},
  "commands": {}
}
EOF
```

### Configure personal overrides (gitignored)

```bash
cat > .claude/settings.local.json << 'EOF'
{
  "mcpServers": {
    "supabase-dev": {
      "env": {
        "SUPABASE_PROJECT_REF": "your-actual-project-ref",
        "SUPABASE_ACCESS_TOKEN": "your-actual-token"
      }
    }
  },
  "preferences": {
    "autoSave": true,
    "theme": "dark",
    "fontSize": 14
  }
}
EOF
```

---

## Verification Steps

### 1. Verify Directory Structure

```bash
tree .claude
# Should show:
# .claude/
# ├── settings.json
# ├── settings.local.json
# ├── .mcp.json
# ├── agents/
# │   ├── mobile-tester.md
# │   ├── supabase-specialist.md
# │   ├── security-auditor.md
# │   ├── offline-architect.md
# │   └── pricing-calculator.md
# ├── commands/ (we'll create next)
# ├── hooks/ (we'll create next)
# └── output-styles/
```

### 2. Verify MCP Servers

```bash
# In Claude Code CLI:
claude mcp list

# Should show:
# - supabase-dev (connected)
# - playwright-mobile (connected)
# - playwright-tablet (connected)
# - playwright-desktop (connected)
# - filesystem (connected)
# - github (connected)
# - postgres-local (connected)
```

### 3. Test Subagent Invocation

```bash
# In Claude Code:
"Use the mobile-tester subagent to test the homepage at all three viewports"

# This should:
# 1. Auto-invoke the mobile-tester subagent
# 2. Use Playwright MCP to navigate and screenshot
# 3. Generate a test report with screenshots
# 4. Return control to main agent
```
