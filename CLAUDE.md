# 🚀 MRC Lead Management System - Claude Code Guide
# 🛠️ CLAUDE CODE: LEAD ENGINEER PROTOCOL

## 🤖 THE DUAL-AGENT TEAM
- **Lead Engineer (YOU):** Claude 4.5 Opus. Focus on Logic, Backend, and Production Code.
- **Lead Architect (PARTNER):** Gemini 3.0 Pro. Focus on 1M-token audits, UI/UX, and Planning.
- **The Bridge:** `/context/Channel.md`. This is your only way to talk to Gemini.

## 🔄 MANDATORY WORKFLOW
1. **READ:** Every session MUST start by reading `GEMINI.md` and `/context/Channel.md`.
2. **PLAN:** Never write code before a plan is approved in the Channel.
3. **DELEGATE:** If a task involves auditing >500 lines or complex UI, tell the User: "Please ask the Architect (Gemini) to audit this and update the Channel."
4. **SYNC:** After every successful commit or database change, update the "Engineering Status" in `/context/Channel.md`.

## ✍️ MANDATORY PROMPT STRUCTURE (FOR CHANNEL UPDATES)
When writing to the Architect in the Channel, you MUST use:
- ROLE: [Expert Persona]
- TASK: [What you need Gemini to do]
- CONTEXT: [Files/Tables involved]
- REASONING: [Why you are delegating this]
- OUTPUT: [Desired format in Channel.md]
- STOP: [Exit condition]

## 📱 MOBILE-FIRST STANDARDS (NON-NEGOTIABLE)
- Test 375px viewport FIRST.
- Touch targets ≥48px.
- Currency: $X,XXX.XX | Date: DD/MM/YYYY | Time: Australia/Melbourne.

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

# 🎯 MANAGER-AGENT ORCHESTRATION SYSTEM

**Complete Workflow Documentation for MRC Lead Management System**

---

## 📋 SYSTEM OVERVIEW

This is a Manager-Agent orchestration system where a single Manager Agent coordinates specialized sub-agents to complete tasks with zero debugging cycles.

**Core Philosophy:**
- Manager NEVER uses MCPs directly - only delegates
- Agents work sequentially (one at a time)
- Testing is mandatory before completion
- User approval required on all plans
- Loop until task is fully complete and tested

**System Goals:**
- ✅ Zero debugging cycles
- ✅ Production-ready code every time
- ✅ Complete testing coverage
- ✅ Proper documentation
- ✅ Australian business compliance
- ✅ Mobile-first (375px) design

---

## 🔄 THE COMPLETE WORKFLOW

```
┌─────────────────────────────────────────────────────────┐
│                     USER GIVES TASK                     │
│                                                         │
│  Examples:                                              │
│  • "Fix Labor field not saving"                         │
│  • "Add new section to inspection form"                 │
│  • "Create calendar booking system"                     │
│  • "Implement email automation"                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    MANAGER AGENT                        │
│                  (orchestrator.md)                      │
│                                                         │
│  Role: Analyze → Delegate → Verify → Repeat           │
│  MCPs: NONE (only communicates with sub-agents)       │
│                                                         │
│  Process:                                               │
│  1. Receive and analyze user task                       │
│  2. Assess complexity (Simple/Medium/Complex)           │
│  3. Delegate to planner-researcher agent                │
│  4. Wait for plan + user approval (GATE)                │
│  5. Execute plan sub-task by sub-task                   │
│  6. Evaluate each sub-task completion                   │
│  7. Loop until all sub-tasks complete                   │
│  8. Initiate mandatory testing phase                    │
│  9. Review all test results                             │
│  10. If tests fail: Send back to fix                    │
│  11. If tests pass: Complete documentation              │
│  12. Present to user and exit                           │
│                                                         │
│  Decision Framework:                                    │
│  • Database changes? → database-specialist              │
│  • Business logic? → backend-builder                    │
│  • UI components? → frontend-builder                    │
│  • Integration? → integration-specialist                │
│  • Testing? → All 3 testers simultaneously              │
│  • Done? → documentation-agent                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PLANNING & RESEARCH                           │
│                                                         │
│ Agent: planner-researcher                               │
│ MCPs: Memory, Supabase, Context7, Fetch                │
│ Time: 5-10 minutes                                      │
│                                                         │
│ Step 1.1: LOAD PROJECT CONTEXT                         │
│ ────────────────────────────────                        │
│ • Memory MCP: Recall past sessions                      │
│   - What was recently worked on?                        │
│   - Known issues or gotchas?                            │
│   - Successful patterns used before?                    │
│                                                         │
│ • Claude Code built-in file reading:                    │
│   - CLAUDE.md (session history)                         │
│   - INSPECTION-FORM-TODO.md (progress tracking)         │
│   - PLANNING.md (architecture decisions)                │
│   - MRC-PRD.md (product requirements)                   │
│                                                         │
│ Step 1.2: UNDERSTAND DATABASE                           │
│ ────────────────────────────────                        │
│ • Supabase MCP: Check schema                            │
│   - List relevant tables                                │
│   - Check columns and types                             │
│   - Review RLS policies                                 │
│   - Check existing data (if relevant)                   │
│   - Verify indexes                                      │
│                                                         │
│ Step 1.3: UNDERSTAND CODEBASE                           │
│ ────────────────────────────────                        │
│ • Claude Code built-in file navigation:                 │
│   - Find relevant files                                 │
│   - Read current implementation                         │
│   - Understand data flow                                │
│   - Identify dependencies                               │
│   - Check for related components                        │
│                                                         │
│ Step 1.4: RESEARCH BEST PRACTICES                       │
│ ────────────────────────────────────                    │
│ • Context7 MCP: Check documentation & tools             │
│   - React/TypeScript documentation                      │
│   - Supabase documentation                              │
│   - shadcn/ui component patterns                        │
│   - Language-specific best practices                    │
│                                                         │
│ • Fetch MCP: External resources (if needed)             │
│   - Australian standards (dates, currency)              │
│   - Mobile-first design patterns                        │
│   - Accessibility guidelines                            │
│                                                         │
│ Step 1.5: CREATE DETAILED PLAN                          │
│ ────────────────────────────────                        │
│ • Break task into 3-7 sub-tasks                         │
│ • For each sub-task:                                    │
│   - Clear description                                   │
│   - Which agent should handle it                        │
│   - Estimated complexity (Low/Medium/High)              │
│   - Dependencies on other sub-tasks                     │
│   - Expected output                                     │
│                                                         │
│ • Identify risks:                                       │
│   - What could break?                                   │
│   - Performance concerns?                               │
│   - Mobile responsiveness issues?                       │
│   - Data integrity risks?                               │
│                                                         │
│ • Define success criteria:                              │
│   - How will we know it's done?                         │
│   - What tests must pass?                               │
│   - What should user see?                               │
│                                                         │
│ Step 1.6: PRESENT TO USER                               │
│ ────────────────────────────────                        │
│ • Summary of current state                              │
│ • Research findings                                     │
│ • Proposed approach                                     │
│ • Step-by-step plan                                     │
│ • Estimated time                                        │
│ • Identified risks                                      │
│ • Success criteria                                      │
│                                                         │
│ Output Format:                                          │
│ ┌─────────────────────────────────────────┐            │
│ │ RESEARCH FINDINGS:                      │            │
│ │ • Current state: [summary]              │            │
│ │ • Relevant code: [files/locations]      │            │
│ │ • Database: [tables/columns]            │            │
│ │ • Dependencies: [what exists]           │            │
│ │                                         │            │
│ │ PROPOSED PLAN:                          │            │
│ │ Sub-task 1: [description]               │            │
│ │   Agent: [specialist]                   │            │
│ │   Complexity: [Low/Medium/High]         │            │
│ │   Depends on: [None/other tasks]        │            │
│ │                                         │            │
│ │ Sub-task 2: [description]               │            │
│ │   Agent: [specialist]                   │            │
│ │   Complexity: [Low/Medium/High]         │            │
│ │   Depends on: [None/other tasks]        │            │
│ │                                         │            │
│ │ RISKS:                                  │            │
│ │ • [Risk 1]                              │            │
│ │ • [Risk 2]                              │            │
│ │                                         │            │
│ │ SUCCESS CRITERIA:                       │            │
│ │ • [Criteria 1]                          │            │
│ │ • [Criteria 2]                          │            │
│ │                                         │            │
│ │ ESTIMATED TIME: X-Y minutes             │            │
│ └─────────────────────────────────────────┘            │
│                                                         │
│ ⚠️  GATE: WAIT FOR USER APPROVAL                        │
│ ────────────────────────────────                        │
│ • User must explicitly approve plan                     │
│ • If rejected: Revise plan based on feedback            │
│ • If approved: Manager proceeds to Phase 2              │
│ • DO NOT start implementation without approval          │
└─────────────────────────────────────────────────────────┘
                            ↓
                    USER APPROVES ✅
                            ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: IMPLEMENTATION                                 │
│                                                         │
│ Sequential execution of planned sub-tasks               │
│ Manager delegates ONE agent at a time                   │
│ Time: 15-40 minutes (varies by complexity)              │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────────┐      ┌──────────────────────────┐
│ 2A: DATABASE CHANGES     │      │ 2B: BACKEND LOGIC        │
│                          │      │                          │
│ Agent:                   │      │ Agent:                   │
│ database-specialist      │      │ backend-builder          │
│                          │      │                          │
│ MCPs:                    │      │ MCPs:                    │
│ • Supabase               │      │ • Supabase (for testing) │
│                          │      │ • TestSprite             │
│ Tools:                   │      │                          │
│ • Claude Code built-in   │      │ Tools:                   │
│   file operations        │      │ • Claude Code built-in   │
│                          │      │   file operations        │
│ When to use:             │      │                          │
│ • Schema changes needed  │      │ When to use:             │
│ • New tables/columns     │      │ • Calculations needed    │
│ • RLS policy updates     │      │ • Validation functions   │
│ • Index creation         │      │ • Utility functions      │
│                          │      │ • Business rules         │
│ Tasks:                   │      │                          │
│ 1. Check current schema  │      │ Tasks:                   │
│ 2. Create migration file │      │ 1. Create functions      │
│ 3. Apply migration       │      │ 2. Add TypeScript types  │
│ 4. Update RLS if needed  │      │ 3. Add error handling    │
│ 5. Verify with queries   │      │ 4. Test with TestSprite  │
│                          │      │ 5. Add JSDoc comments    │
│ Output:                  │      │                          │
│ • Migration applied ✅   │      │ Output:                  │
│ • Verification query     │      │ • Functions created ✅   │
│ • Column names (for FE)  │      │ • Unit tests passed ✅   │
│                          │      │ • Usage examples         │
│ Example:                 │      │                          │
│ "Added labor_cost_ex_gst │      │ Example:                 │
│  column to inspections   │      │ "Created calculateCost() │
│  table. Verified with    │      │  function. Tests: 8/8    │
│  SELECT query. Ready for │      │  passed. Ready for UI    │
│  frontend integration."  │      │  integration."           │
└──────────────────────────┘      └──────────────────────────┘
        ↓                                       ↓
        └───────────────────┬───────────────────┘
                            ↓
                Reports to Manager
                            ↓
        Manager evaluates: Complete? or More work?
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────────┐      ┌──────────────────────────┐
│ 2C: FRONTEND UI          │      │ 2D: INTEGRATION          │
│                          │      │                          │
│ Agent:                   │      │ Agent:                   │
│ frontend-builder         │      │ integration-specialist   │
│                          │      │                          │
│ MCPs:                    │      │ MCPs:                    │
│ • shadcn                 │      │ • Supabase               │
│                          │      │                          │
│ Tools:                   │      │ Tools:                   │
│ • Claude Code built-in   │      │ • Claude Code built-in   │
│   file operations        │      │   file operations        │
│                          │      │                          │
│ When to use:             │      │ When to use:             │
│ • New UI components      │      │ • Connect UI to backend  │
│ • Form updates           │      │ • Save/load functions    │
│ • Styling changes        │      │ • Data flow             │
│ • State management       │      │ • Error handling         │
│                          │      │                          │
│ Tasks:                   │      │ Tasks:                   │
│ 1. Create/update React   │      │ 1. Wire UI handlers to   │
│    components            │      │    backend functions     │
│ 2. Add state (useState,  │      │ 2. Implement save to DB  │
│    useEffect, etc)       │      │ 3. Implement load from DB│
│ 3. Wire event handlers   │      │ 4. Test save/load cycle  │
│ 4. Style mobile-first    │      │ 5. Add loading states    │
│    (375px)               │      │ 6. Add error messages    │
│ 5. Use shadcn/ui         │      │                          │
│ 6. Add TypeScript types  │      │ Critical Checks:         │
│ 7. Add validation        │      │ • Field name mapping:    │
│                          │      │   camelCase → snake_case │
│ Design Requirements:     │      │ • Console.log for debug  │
│ • Mobile-first (375px)   │      │ • Test with Supabase MCP │
│ • Touch targets ≥48px    │      │                          │
│ • Australian formats:    │      │ Output:                  │
│   - Currency: $X,XXX.XX  │      │ • UI connected to DB ✅  │
│   - Dates: DD/MM/YYYY    │      │ • Save verified ✅       │
│ • Loading indicators     │      │ • Load verified ✅       │
│ • Error messages         │      │ • Ready for testing      │
│                          │      │                          │
│ Output:                  │      │ Example:                 │
│ • Component ready ✅     │      │ "Wired laborCost to      │
│ • Styled for mobile ✅   │      │  labor_cost_ex_gst.      │
│ • Touch targets ok ✅    │      │  Tested save/load cycle  │
│ • Ready for integration  │      │  with Supabase. Data     │
│                          │      │  persists correctly."    │
│ Example:                 │      │                          │
│ "Created CostBreakdown   │      └──────────────────────────┘
│  component with editable │                  ↓
│  Labor field. Mobile-    │      Reports to Manager
│  responsive at 375px.    │                  ↓
│  Ready to wire to DB."   │      Manager evaluates completion
└──────────────────────────┘                  ↓
        ↓                         ┌───────────┴───────────┐
        │                         ↓                       ↓
        │                   ✅ Sub-task done      ❌ Needs work
        │                   Move to next         Send agent back
        │                         ↓                       ↓
        └─────────────────────────┴───────────────────────┘
                                  ↓
                    Loop until ALL sub-tasks complete
                                  ↓
┌─────────────────────────────────────────────────────────┐
│ PHASE 3: MANDATORY TESTING                              │
│                                                         │
│ All 3 testing agents work together                      │
│ Manager coordinates their efforts                       │
│ Time: 10-20 minutes                                     │
│                                                         │
│ ⚠️  CRITICAL: Cannot skip this phase                    │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                   ↓                   ↓
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ PLAYWRIGHT     │  │ TESTSPRITE     │  │ SUPABASE       │
│ TESTER         │  │ TESTER         │  │ VERIFIER       │
│                │  │                │  │                │
│ MCP:           │  │ MCP:           │  │ MCP:           │
│ • Playwright   │  │ • TestSprite   │  │ • Supabase     │
│                │  │                │  │                │
│ Focus:         │  │ Focus:         │  │ Focus:         │
│ UI & UX        │  │ Logic & Code   │  │ Data & DB      │
│                │  │                │  │                │
│ Tests:         │  │ Tests:         │  │ Verifies:      │
│                │  │                │  │                │
│ 1. Mobile      │  │ 1. All         │  │ 1. Data saved  │
│    (375px):    │  │    functions   │  │    correctly   │
│    • Visible   │  │    work        │  │                │
│    • No scroll │  │                │  │ 2. Values      │
│    • Touch     │  │ 2. Calcs       │  │    match input │
│      targets   │  │    correct     │  │                │
│                │  │                │  │ 3. Data types  │
│ 2. Desktop     │  │ 3. Edge cases: │  │    correct     │
│    (1920px):   │  │    • Zero      │  │                │
│    • Layout ok │  │    • Negative  │  │ 4. No NULLs    │
│    • Readable  │  │    • Large #s  │  │    (unless ok) │
│                │  │    • Decimals  │  │                │
│ 3. Save/Load:  │  │                │  │ 5. RLS         │
│    • Fill form │  │ 4. No errors   │  │    policies    │
│    • Click save│  │    thrown      │  │    working     │
│    • Reload    │  │                │  │                │
│    • Verify    │  │ 5. Return      │  │ 6. Indexes     │
│                │  │    types ok    │  │    used        │
│ 4. Screenshots │  │                │  │                │
│    • Before    │  │ Output:        │  │ 7. Foreign     │
│    • After     │  │ ┌────────────┐ │  │    keys valid  │
│    • Proof     │  │ │ PASSED:    │ │  │                │
│                │  │ │ 8/8 tests  │ │  │ Query:         │
│ Output:        │  │ │            │ │  │ SELECT * FROM  │
│ ┌────────────┐ │  │ │ • calc()   │ │  │ table WHERE    │
│ │ ✅ Mobile  │ │  │ │ • valid()  │ │  │ id = 'xxx'     │
│ │ ✅ Desktop │ │  │ │ • format() │ │  │                │
│ │ ✅ Save    │ │  │ │ • edges    │ │  │ Compare:       │
│ │ ✅ Load    │ │  │ └────────────┘ │  │ Expected vs    │
│ │ ✅ Touch   │ │  │                │  │ Actual         │
│ │            │ │  │ OR:            │  │                │
│ │ Screenshots│ │  │ ┌────────────┐ │  │ Output:        │
│ │ attached   │ │  │ │ ❌ FAILED: │ │  │ ┌────────────┐ │
│ └────────────┘ │  │ │ calc() off │ │  │ │ ✅ Data ok │ │
│                │  │ │ by 0.01    │ │  │ │ ✅ Types   │ │
│ OR:            │  │ └────────────┘ │  │ │ ✅ RLS ok  │ │
│ ┌────────────┐ │  │                │  │ │ ✅ No NULL │ │
│ │ ❌ Touch   │ │  │                │  │ └────────────┘ │
│ │ target too │ │  │                │  │                │
│ │ small: 40px│ │  │                │  │ OR:            │
│ └────────────┘ │  │                │  │ ┌────────────┐ │
└────────────────┘  └────────────────┘  │ │ ❌ Field   │ │
        ↓                   ↓            │ │ is NULL    │ │
        └───────────────────┴────────────┴─┘ └────────────┘ │
                            ↓                                │
                All report to Manager                        │
                            ↓                                │
        Manager reviews ALL test results                     │
                            ↓                                │
        ┌───────────────────┴───────────────────┐           │
        ↓                                       ↓           │
    ✅ ALL PASSED                         ❌ ANY FAILED     │
        ↓                                       ↓           │
    Proceed to Phase 4                  Identify which agent│
        ↓                                needs to fix       │
        │                                       ↓           │
        │                               Send back with      │
        │                               failure details     │
        │                                       ↓           │
        │                               Agent fixes → Retest│
        │                                       ↓           │
        └───────────────────┬───────────────────┘           │
                            ↓                                │
                     Tests must pass                         │
                     before proceeding                       │
                            ↓                                │
┌─────────────────────────────────────────────────────────┐ │
│ PHASE 4: DOCUMENTATION & COMPLETION                     │ │
│                                                         │ │
│ Agent: documentation-agent                              │ │
│ MCPs: GitHub, Memory                                    │ │
│ Tools: Claude Code built-in file operations             │ │
│ Time: 5-10 minutes                                      │ │
│                                                         │ │
│ Step 4.1: GATHER ALL OUTPUTS                            │ │
│ ────────────────────────────                            │ │
│ • What did each agent do?                               │ │
│ • What files were changed?                              │ │
│ • What tests passed?                                    │ │
│ • What was verified?                                    │ │
│                                                         │ │
│ Step 4.2: CREATE GIT COMMIT                             │ │
│ ────────────────────────────                            │ │
│ • GitHub MCP: Create commit                             │ │
│                                                         │ │
│ Commit Message Format:                                  │ │
│ ┌─────────────────────────────────────┐                │ │
│ │ [Type]: [Brief summary]             │                │ │
│ │                                     │                │ │
│ │ [Detailed description]              │                │ │
│ │                                     │                │ │
│ │ Changes:                            │                │ │
│ │ • [File]: [What changed]            │                │ │
│ │ • [File]: [What changed]            │                │ │
│ │                                     │                │ │
│ │ Testing:                            │                │ │
│ │ • Playwright: [results]             │                │ │
│ │ • TestSprite: [results]             │                │ │
│ │ • Supabase: [verification]          │                │ │
│ │                                     │                │ │
│ │ Verified:                           │                │ │
│ │ • [Success criteria 1] ✅           │                │ │
│ │ • [Success criteria 2] ✅           │                │ │
│ └─────────────────────────────────────┘                │ │
│                                                         │ │
│ Step 4.3: UPDATE DOCUMENTATION                          │ │
│ ────────────────────────────────                        │ │
│ • Built-in file ops: Update CLAUDE.md                   │ │
│   - Add session summary                                 │ │
│   - Record what was accomplished                        │ │
│   - Note any learnings                                  │ │
│                                                         │ │
│ • Built-in file ops: Update TODO files                  │ │
│   - Mark completed tasks ✅                             │ │
│   - Update progress tracking                            │ │
│                                                         │ │
│ • Built-in file ops: Update PLANNING.md (if needed)     │ │
│   - Record architectural decisions                      │ │
│   - Document new patterns used                          │ │
│                                                         │ │
│ Step 4.4: STORE IN MEMORY                               │ │
│ ────────────────────────────────                        │ │
│ • Memory MCP: Save learnings                            │ │
│   - Successful patterns                                 │ │
│   - Gotchas encountered                                 │ │
│   - Solutions that worked                               │ │
│   - MRC-specific knowledge                              │ │
│                                                         │ │
│ Step 4.5: PRESENT TO USER                               │ │
│ ────────────────────────────────                        │ │
│ Output Format:                                          │ │
│ ┌─────────────────────────────────────┐                │ │
│ │ ✅ TASK COMPLETE                    │                │ │
│ │                                     │                │ │
│ │ Summary:                            │                │ │
│ │ • [What was accomplished]           │                │ │
│ │ • [What was tested]                 │                │ │
│ │ • [What was verified]               │                │ │
│ │                                     │                │ │
│ │ Files Changed:                      │                │ │
│ │ • [List of files]                   │                │ │
│ │                                     │                │ │
│ │ Testing Results:                    │                │ │
│ │ • Playwright: ✅ All passed         │                │ │
│ │ • TestSprite: ✅ 8/8 tests          │                │ │
│ │ • Supabase: ✅ Data verified        │                │ │
│ │                                     │                │ │
│ │ Git Commit: [hash]                  │                │ │
│ │                                     │                │ │
│ │ Ready for your verification!        │                │ │
│ └─────────────────────────────────────┘                │ │
└─────────────────────────────────────────────────────────┘ │
                            ↓                                │
                    ✅ MANAGER EXITS                         │
                    Session complete                         │
```

---

## 👥 THE AGENT TEAM

### 1. Manager Agent
**File:** `orchestrator.md`  
**Role:** Master coordinator  
**MCPs:** NONE - only delegates to sub-agents  

**Responsibilities:**
- Analyze user task and assess complexity
- Break into achievable sub-tasks
- Delegate to appropriate specialists
- Evaluate each sub-task completion
- Decide if more work needed
- Ensure mandatory testing happens
- Only exit when complete + tested + documented

**Decision Framework:**
```
Task type → Agent to call
─────────────────────────
Database changes → database-specialist
Business logic → backend-builder
UI components → frontend-builder
Connect UI to backend → integration-specialist
Testing phase → All 3 testers
Documentation → documentation-agent
```

---

### 2. Planner-Researcher
**File:** `planner-researcher.md`  
**Role:** Combined planning and research specialist  
**MCPs:** Memory, Supabase, Context7, Fetch  
**Tools:** Claude Code built-in file reading

**Responsibilities:**
- Load project context from Memory MCP
- Read project files (CLAUDE.md, TODO, PLANNING, PRD)
- Check database schema with Supabase MCP
- Understand codebase with built-in file navigation
- Research documentation with Context7 MCP
- Fetch external resources with Fetch MCP
- Create detailed 3-7 sub-task plan
- Present plan to user for approval

---

### 3. Database Specialist
**File:** `database-specialist.md`  
**Role:** All database operations  
**MCPs:** Supabase  
**Tools:** Claude Code built-in file operations

**Tasks:**
- Create migration files
- Add/modify columns
- Update RLS policies
- Create indexes
- Verify changes with SQL queries

---

### 4. Backend Builder
**File:** `backend-builder.md`  
**Role:** Business logic and calculations  
**MCPs:** Supabase, TestSprite  
**Tools:** Claude Code built-in file operations

**Tasks:**
- Create calculation functions
- Create validation functions
- Add TypeScript types
- Test with TestSprite MCP
- Add error handling

---

### 5. Frontend Builder
**File:** `frontend-builder.md`  
**Role:** UI components and styling  
**MCPs:** shadcn  
**Tools:** Claude Code built-in file operations

**Tasks:**
- Create/update React components
- Add state management
- Style mobile-first (375px)
- Use shadcn/ui components
- Add validation

---

### 6. Integration Specialist
**File:** `integration-specialist.md`  
**Role:** Connect UI to backend  
**MCPs:** Supabase  
**Tools:** Claude Code built-in file operations

**Tasks:**
- Wire UI to backend functions
- Implement save/load
- Test with Supabase MCP
- Add error handling

---

### 7. Playwright Tester
**File:** `playwright-tester.md`  
**Role:** UI and interaction testing  
**MCPs:** Playwright

**Tasks:**
- Test at 375px and 1920px
- Test save/load cycle
- Take screenshots
- Verify touch targets

---

### 8. TestSprite Tester
**File:** `testsprite-tester.md`  
**Role:** Unit and logic testing  
**MCPs:** TestSprite

**Tasks:**
- Test all functions
- Test edge cases
- Verify no errors
- Check return types

---

### 9. Supabase Verifier
**File:** `supabase-verifier.md`  
**Role:** Database verification  
**MCPs:** Supabase

**Tasks:**
- Verify data saved
- Check RLS policies
- Verify data types
- Check for NULLs

---

### 10. Documentation Agent
**File:** `documentation-agent.md`  
**Role:** Final documentation and Git commit  
**MCPs:** GitHub, Memory  
**Tools:** Claude Code built-in file operations

**Tasks:**
- Create Git commit
- Update project docs
- Store in Memory MCP
- Present to user

---

## 📊 MCP & TOOLS USAGE MATRIX

| Agent | Memory | Supabase | Context7 | Fetch | GitHub | Playwright | TestSprite | shadcn | Built-in Files |
|-------|--------|----------|----------|-------|--------|------------|------------|--------|----------------|
| Manager | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Planner-Researcher | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Database Specialist | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Backend Builder | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Frontend Builder | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Integration Specialist | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Playwright Tester | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| TestSprite Tester | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Supabase Verifier | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Documentation Agent | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

**Key:**
- ✅ = Agent uses this MCP/tool
- ❌ = Agent does NOT use this MCP/tool

**Notes:**
- Manager uses NO MCPs - only delegates
- Context7 is for checking documentation and language tools
- All file reading/writing uses Claude Code built-in operations
- MCPs are for specialized tasks (database, testing, memory, etc.)

---

## 🎯 KEY WORKFLOW RULES

### 1. Sequential Execution
- Manager delegates ONE agent at a time
- Wait for agent to complete before next delegation
- No parallel execution (except testing phase)
- Clear handoffs between agents

### 2. Mandatory Gates
- **Phase 1 Gate:** User must approve plan before implementation
- **Phase 3 Gate:** All tests must pass before completion
- **Phase 4 Gate:** Documentation must be complete before exit

### 3. Testing Requirements
- Cannot skip testing phase
- All 3 testers must run
- All tests must pass
- If any test fails: Send back to fix and re-test

### 4. Communication Protocol
```
Manager → Sub-agent:
• Clear task description
• Relevant context
• Expected output
• Success criteria

Sub-agent → Manager:
• Completed output
• Test results (if applicable)
• Any issues encountered
• Ready for next step
```

### 5. Error Handling
```
If agent fails:
1. Agent reports failure with details
2. Manager evaluates root cause
3. Manager decides:
   - Same agent with more context?
   - Different agent?
   - Ask user for clarification?
4. Loop until resolved
```

### 6. Quality Standards
- **Code:** TypeScript strict mode, no `any` types
- **Mobile:** 375px viewport first, touch targets ≥48px
- **Australian:** Currency $X,XXX.XX, dates DD/MM/YYYY, GST 10%
- **Testing:** Playwright + TestSprite + Supabase verification
- **Documentation:** Complete commit messages, updated docs

---