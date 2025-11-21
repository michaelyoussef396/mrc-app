# 🚀 MRC Lead Management System - Claude Code Guide

**Mould & Restoration Co. - Business Automation Platform**  
**Users:** Field technicians (Clayton & Glen) on mobile devices  
**Tech Stack:** React/TypeScript + Supabase + PWA  
**Location:** Melbourne, Australia

---

## ⚡ SESSION START (EVERY TIME)

### **1. Read Context Files**
```bash
cat context/MRC-PRD.md                           # Product requirements
cat context/MRC-TECHNICAL-SPEC.md               # Technical specs
cat context/TASKS.md                              # All tasks
cat context/design-checklist-s-tier.md          # Design standards
cat context/PLANNING.md                          # Architecture decisions
cat context/DATABASE-SCHEMA.md                   # Database structure
```

### **2. Check Status**
```bash
git status && git log --oneline -5
grep "🟡 IN PROGRESS" context/TASKS.md
```

---

## 🤖 HOW THIS WORKS

**You describe what you want → Claude automatically:**
1. Reads all context files to understand requirements
2. Uses appropriate MCP servers for intelligence
3. Invokes necessary agents in the right order
4. Delivers production-ready code

**Example:**
```
You: "Build the calendar booking component"

Claude automatically:
1. Reads context files (PRD, Technical Spec)
2. Uses Supabase MCP to query schema
3. Uses supabase-specialist to design table
4. Uses frontend-builder with shadcn/ui components
5. Uses Playwright MCP to test at 375px/768px/1440px
6. Uses design-review for comprehensive UI check
7. Delivers complete, tested feature

Time: 10-15 minutes vs. 2-3 hours manually
```

**No manual agent chaining - just describe your goal!**

---

## 🔌 MCP SERVERS (5 CONNECTED)

### **1. Supabase MCP** - Database Operations
- Query schema in real-time
- Test RLS policies
- Generate migrations
- Create TypeScript types

### **2. Playwright MCP** - Visual Testing
- Test at 375px/768px/1440px viewports
- Capture screenshots
- Verify touch targets ≥48px
- Console and network monitoring

### **3. shadcn/ui MCP** - Component Library
- Install production-ready components
- Call demo tool for examples
- Implement forms, cards, dialogs
- Apply MRC design system

### **4. GitHub MCP** - Git Operations
- Create branches
- Generate commit messages
- Track deployment tags

### **5. Memory MCP** - Context Persistence
- Remember patterns
- Store decisions
- Track deployment history

### **6. Fetch MCP** - External APIs
- Fetch documentation
- Test integrations

---

## 🤖 AGENTS (6 SPECIALIZED)

### **1. design-review** 🎨
**Purpose:** Comprehensive UI/UX review with WCAG accessibility
**Uses:** Playwright MCP for 7-phase design review
**When:** After building UI, before merging
**Triggers:** "Review the design", "Check accessibility"

### **2. error-detective** 🔍 (MOST IMPORTANT)
**Purpose:** Debug and fix errors systematically
**Uses:** Playwright MCP for visual debugging, console analysis
**When:** "Form isn't saving", "Getting errors", any debugging
**Specializes in:** Inspection form issues, auth errors, state problems

### **3. supabase-specialist** 💾
**Purpose:** All database operations
**Uses:** Supabase MCP for schema queries, RLS testing
**When:** "Add table", "Create migration", database work
**Delivers:** Migrations + RLS policies + TypeScript types

### **4. frontend-builder** 🎨
**Purpose:** Build React components with shadcn/ui
**Uses:** shadcn/ui MCP + Playwright MCP for testing
**When:** "Build component", "Create form", any UI work
**Mobile-first:** Always tests 375px viewport first

### **5. pricing-guardian** 💰 (DEPLOYMENT BLOCKER)
**Purpose:** Validate 13% discount cap (48 scenarios)
**Uses:** Memory MCP for test storage
**When:** "Validate pricing", before ANY deployment
**Blocks deployment if:** ANY scenario fails or 13% cap violated

### **6. deployment-captain** 🚀 (FINAL GATEKEEPER)
**Purpose:** Run all pre-deployment checks (5 mandatory)
**Uses:** All MCP servers
**When:** "Ready to deploy", "Pre-deployment check"
**Runs:** Security, pricing, performance, bundle, tests
**Decision:** GO/NO-GO based on all 5 checks

---

## 🔄 AGENT WORKFLOWS

### **UI Component Workflow**
```
You: "Build lead capture form"

Auto-triggers:
1. supabase-specialist → Check schema
2. frontend-builder → Build with shadcn/ui
3. Playwright MCP → Test at 375px/768px/1440px
4. design-review → 7-phase UI/UX review
→ Production-ready component
```

### **Database Change Workflow**
```
You: "Add email_log table"

Auto-triggers:
1. Supabase MCP → Query current schema
2. supabase-specialist → Design + migration + RLS
3. TypeScript type generation
→ Complete database change
```

### **Bug Fix Workflow**
```
You: "Inspection form not saving"

Auto-triggers:
1. error-detective → Debug systematically
2. Playwright MCP → Visual debugging at 375px
3. Fix implementation with git checkpoints
4. Verification with screenshots
→ Verified fix
```

### **Pricing Change Workflow** 🚨
```
You: "Update discount calculation"

Auto-triggers:
1. Implementation with validation
2. pricing-guardian → Test 48 scenarios (BLOCKER)
   If FAIL: STOP - deployment blocked
   If PASS: Continue
3. Git checkpoint
→ Validated pricing change
```

### **Pre-Deployment Workflow** 🚨
```
You: "Ready to deploy"

deployment-captain runs:
1. Security scan (Supabase MCP for RLS)
2. pricing-guardian (48 scenarios) - BLOCKER
3. Performance (Playwright MCP, mobile >90)
4. Bundle size (<500KB)
5. Test suite (all passing)

Result: ✅ APPROVED or ❌ BLOCKED
```

---

## 📱 MOBILE-FIRST (NON-NEGOTIABLE)

**ALWAYS:**
- ✅ Test 375px viewport FIRST
- ✅ Touch targets ≥48px (gloves requirement)
- ✅ No horizontal scrolling
- ✅ Load time <3s on 4G
- ✅ Works offline (inspection form)

**Playwright MCP + frontend-builder test visually at all viewports!**

---

## 💰 PRICING RULES (ABSOLUTE)

- **13% discount cap** (0.87 multiplier minimum) - NEVER exceed
- **GST always 10%** on subtotal
- **Multi-day:** 0% (≤8h), 7.5% (9-16h), 13% (17+h)
- **Equipment:** Dehumidifier $132, Air Mover $46, RCD $5

**pricing-guardian validates 48 scenarios - DEPLOYMENT BLOCKER**

---

## 🔒 SECURITY REQUIREMENTS

- No hardcoded secrets (use .env)
- All tables have RLS policies (Supabase MCP verifies)
- Input validation with Zod
- XSS protection (DOMPurify)
- npm audit zero high/critical

**deployment-captain security check MUST PASS**

---

## 🇦🇺 AUSTRALIAN STANDARDS

- **Currency:** $X,XXX.XX (comma separators)
- **Phone:** (03) XXXX XXXX or 04XX XXX XXX
- **Date:** DD/MM/YYYY
- **Timezone:** Australia/Melbourne
- **Spelling:** Australian English (colour, labour)
- **ABN:** XX XXX XXX XXX

---

## 🎨 shadcn/ui INTEGRATION

### **Usage with frontend-builder**
```
You: "Build a lead form with shadcn/ui"

frontend-builder automatically:
1. Checks available shadcn components via MCP
2. Calls demo tool for usage examples
3. Installs components (Button, Input, Form, Card)
4. Builds mobile-first (375px first)
5. Tests with Playwright MCP
6. Applies MRC design system
```

### **/shadCN Commands**
```
/shadCN plan this app: [description]
→ Creates implementation.md with component breakdown

/shadCN implement: @implementation.md
→ Builds complete app with shadcn components
```

### **Theme Customization**
Use https://tweakcn.com/ for MRC color themes:
```css
:root {
  --primary: 210 100% 40%;  /* #0066CC MRC blue */
}
```

---

## 🚀 USAGE EXAMPLES

### **Complete Feature:**
```
"Build calendar booking component with:
- Available time slots
- Conflict detection
- Multi-day job support
- Mobile-first (375px)
- RLS policies"

Claude handles everything automatically.
```

### **Debug Error:**
```
"The inspection form auto-save is failing on mobile.
Use error-detective to find and fix the issue."
```

### **Add Database Table:**
```
"Add notification_preferences table for user settings.
Include RLS policies and generate TypeScript types."
```

### **Deploy:**
```
"Run complete pre-deployment workflow.
All checks must pass."
```

---

## 🎯 AGENT BEST PRACTICES

### **When to Invoke Manually:**
```
Use error-detective: When debugging specific errors
Use design-review: For comprehensive UI review
Use pricing-guardian: Before pricing changes
Use deployment-captain: Before every deployment
```

### **Automatic Triggering:**
- UI changes → design-review + frontend-builder
- Database work → supabase-specialist
- Errors → error-detective
- Deployment → deployment-captain

---

## 📚 AGENT DOCUMENTATION

Each agent has detailed documentation:
- `.claude/agents/design-review.md`
- `.claude/agents/error-detective.md`
- `.claude/agents/supabase-specialist.md`
- `.claude/agents/frontend-builder.md`
- `.claude/agents/pricing-guardian.md`
- `.claude/agents/deployment-captain.md`

---

## 🎓 KEY PRINCIPLES

1. **One Prompt = Complete Workflow** - No manual chaining
2. **Context-Aware** - Claude reads all docs automatically
3. **MCP-Powered** - 6 servers working together
4. **6 Specialized Agents** - Each expert in their domain
5. **Mobile-First Always** - 375px viewport is primary
6. **Security Non-Negotiable** - deployment-captain blocks if unsafe
7. **Pricing Sacred** - 13% cap absolute, pricing-guardian enforces
8. **Quality Built-In** - Agents work proactively
9. **shadcn/ui First** - Production-ready components
10. **Australian Compliance** - Built into all agents

---

## ⚠️ CRITICAL REMINDERS

- **Load time <3s** on 4G or fail
- **Touch targets ≥48px** or fail  
- **13% discount cap** NEVER exceeded
- **RLS on all tables** or fail
- **Mobile test 375px FIRST** always
- **shadcn/ui via MCP** don't write components manually
- **pricing-guardian before deploy** absolute blocker
- **deployment-captain final approval** required

**This system runs a growing Melbourne business. Quality = Revenue.**

---

## 📊 DEPLOYMENT CHECKLIST

Before deploying, deployment-captain runs:
1. ✅ Security scan (zero high/critical)
2. ✅ pricing-guardian (48/48 scenarios pass)
3. ✅ Mobile performance (>90 Lighthouse, <3s load)
4. ✅ Bundle size (<500KB)
5. ✅ All tests passing (100%)

**ALL 5 must pass for deployment approval.**

---

## 📝 RECENT SESSION LOGS (2025-11-21)

### Session: Inspection Form Sections 4-7 Complete

**Phases Completed:** 6/11 (55%)

#### Phase 4: Section 5 (Outdoor Info) ✅
**Issue:** Direction photos button non-functional
**Fix:** Added 'direction' to outdoor photo type check
- Changed from `photo_type='general'` to `photo_type='outdoor'`
- Fixed TypeScript types (directionPhotos → directionPhoto)
- Added direction_photos_enabled to InspectionData interface
**Commit:** cf3b2fa

#### Phase 5: Section 6 (Waste Disposal) ✅
**Issue:** Dropdown value had no database column
**Fix:** 3-step implementation
1. Migration: Added `waste_disposal_amount TEXT` column
2. Save logic: Added field at line 1586
3. Load logic: Added loading at lines 563-564, 712-713
**User Verified:** "PERFECT IT WORKED" ✅
**Commit:** 996f269

#### Phase 6: Section 7 (Work Procedure) ✅
**Issue:** ALL 11 fields missing from database
**Fix:** Complete implementation using specialized agents
1. **supabase-specialist:** Discovered all fields missing
2. **Migration:** Added 11 columns (4 toggles + 7 equipment fields)
3. **frontend-builder:** Added save/load logic for all fields
4. **error-detective:** Fixed RCD Box loading bug (`||` → `??`)

**Fields Implemented:**
- HEPA Vac, Antimicrobial, Stain Removing, Home Sanitation/Fogging
- Commercial Dehumidifiers (enabled + qty)
- Air Movers (enabled + qty)
- RCD Boxes (enabled + qty)

**Critical Bug Fixed:**
- RCD Box quantity not loading when value = 0
- Root cause: `||` treats 0 as falsy
- Solution: Changed to nullish coalescing (`??`)
- Applied to all 3 equipment quantities (preventive fix)

**Commits:** 03fb794, 0754255

**Progress:** 32/31 tasks complete (103%), 6/11 phases (55%)

---

*Last Updated: 2025-11-21*
*MCP Servers: 6 connected (Supabase, Playwright, shadcn/ui, GitHub, Memory, Fetch)*
*Agents: 6 specialized (design-review, error-detective, supabase-specialist, frontend-builder, pricing-guardian, deployment-captain)*
*Status: Production-critical system - test thoroughly*
*Workflow: One prompt = Complete feature with automatic agent orchestration*