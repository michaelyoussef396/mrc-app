# 🤖 MRC Automatic Agent Triggering & Workflow Orchestration

**Purpose:** Ensure agents trigger automatically based on context, file changes, and workflow stage without requiring manual invocation every time.

**Created:** November 11, 2025  
**Status:** Enhancement to existing workflow documentation

---

## 🎯 PROBLEM STATEMENT

**Current State:**
- 9 workflow files generated ✅
- 12 agents documented ✅
- Manual invocation patterns defined ✅

**Missing:**
- ❌ Automatic agent triggering based on file changes
- ❌ Intelligent agent chaining without explicit commands
- ❌ Context-aware agent selection
- ❌ Proactive agent invocation configuration

**Goal:** Make agents work **automatically and intelligently** like a real development team.

---

## 🔧 SOLUTION: 3-Layer Automation System

### **Layer 1: File Watch Triggers (Instant)**
Agents auto-invoke when specific files are modified

### **Layer 2: Context-Aware Orchestration (Intelligent)**
Claude Code automatically chains agents based on task context

### **Layer 3: Workflow Stage Triggers (Progressive)**
Agents invoke at specific development stages

---

## 📁 LAYER 1: FILE WATCH TRIGGERS

### **Implementation: Update `.claude/settings.json`**

Add this configuration:

```json
{
  "autoInvokeAgents": {
    "enabled": true,
    "triggers": [
      {
        "agent": "mobile-tester",
        "trigger": "file_modified",
        "patterns": [
          "src/components/**/*.tsx",
          "src/pages/**/*.tsx",
          "src/styles/**/*.css"
        ],
        "delay": 2000,
        "description": "Auto-test mobile viewports after UI changes"
      },
      {
        "agent": "pricing-calculator",
        "trigger": "file_modified",
        "patterns": [
          "src/lib/pricing/**/*.ts",
          "src/utils/pricing.ts",
          "supabase/functions/calculate-price/**/*"
        ],
        "delay": 1000,
        "blocking": true,
        "description": "BLOCKER: Validate pricing logic immediately"
      },
      {
        "agent": "Code Reviewer",
        "trigger": "file_modified",
        "patterns": [
          "src/**/*.ts",
          "src/**/*.tsx"
        ],
        "delay": 5000,
        "description": "Auto-review code quality after changes"
      },
      {
        "agent": "Security Auditor",
        "trigger": "file_modified",
        "patterns": [
          "src/lib/auth/**/*.ts",
          "supabase/migrations/**/*.sql",
          "src/components/auth/**/*.tsx"
        ],
        "delay": 3000,
        "description": "Auto-scan security on auth changes"
      },
      {
        "agent": "Supabase Schema Architect",
        "trigger": "file_modified",
        "patterns": [
          "supabase/migrations/**/*.sql",
          "supabase/schema.sql"
        ],
        "delay": 2000,
        "description": "Auto-review schema changes"
      },
      {
        "agent": "TypeScript Pro",
        "trigger": "file_created",
        "patterns": [
          "src/types/**/*.ts"
        ],
        "delay": 1000,
        "description": "Auto-validate new type definitions"
      },
      {
        "agent": "offline-architect",
        "trigger": "file_modified",
        "patterns": [
          "public/sw.js",
          "src/lib/offline/**/*.ts"
        ],
        "delay": 2000,
        "description": "Auto-validate service worker changes"
      },
      {
        "agent": "Web Vitals Optimizer",
        "trigger": "bundle_built",
        "patterns": [
          "dist/**/*"
        ],
        "delay": 5000,
        "description": "Auto-check performance after build"
      }
    ]
  }
}
```

### **How It Works:**

1. **File Change Detected** → Matches pattern → Triggers agent after delay
2. **Agent Runs Automatically** → Provides feedback in Claude Code
3. **If Blocking:** Prevents commits/builds until agent passes

**Example Flow:**
```
You modify: src/components/LeadCard.tsx
  ↓ (2 seconds delay)
Claude Code: "🤖 mobile-tester triggered by UI change"
  ↓ (agent runs)
Claude Code: "✅ Mobile tests passed at 375px, 768px, 1440px"
  ↓ (5 seconds delay)
Claude Code: "🤖 Code Reviewer triggered by file change"
  ↓ (agent runs)
Claude Code: "✅ Code quality approved, 2 minor suggestions"
```

---

## 🧠 LAYER 2: CONTEXT-AWARE ORCHESTRATION

### **Implementation: Update `CLAUDE.md` with Smart Invocation Rules**

Add this section to CLAUDE.md:

```markdown
## 🤖 Automatic Agent Orchestration

Claude Code automatically invokes agents based on **conversation context** without explicit commands.

### Trigger Phrases That Auto-Invoke Agents

| Your Message | Auto-Invoked Agents | Why |
|--------------|---------------------|-----|
| "I'm building a new component" | TypeScript Pro → React Performance Optimization | Type definitions → Optimized component |
| "I modified the pricing logic" | pricing-calculator (BLOCKING) | Validate 13% cap immediately |
| "Ready to deploy" | Security Auditor → pricing-calculator → Web Vitals Optimizer | 3 deployment blockers |
| "I changed the database schema" | Supabase Schema Architect → SQL Pro → Security Auditor | Schema → RLS verification |
| "The form looks wrong on mobile" | mobile-tester (all viewports) | UI issue triggers mobile testing |
| "I updated authentication" | Security Auditor → Code Reviewer | Auth changes need security scan |
| "Added a new page" | mobile-tester → Web Vitals Optimizer → Code Reviewer | UI + Performance + Quality |
| "Fixed a bug" | Test Engineer → Code Reviewer | Add regression test → Review |
| "Working on offline mode" | offline-architect → mobile-tester | Service worker → Test offline |
| "Need to optimize performance" | Performance Profiler → React Performance Optimization | Diagnose → Optimize |

### Smart Agent Chaining (Automatic Sequences)

**UI Component Task:**
```
You: "I need to build the inspection form"

Claude Code automatically:
1. 🤖 TypeScript Pro - "Defining interfaces first..."
2. 🤖 React Performance Optimization - "Building optimized component..."
3. 🤖 mobile-tester - "Testing at all viewports..."
4. 🤖 Web Vitals Optimizer - "Checking performance..."
5. 🤖 Code Reviewer - "Reviewing code quality..."
✅ Complete: All agents passed
```

**Database Change Task:**
```
You: "I'm adding a new table for invoices"

Claude Code automatically:
1. 🤖 Supabase Schema Architect - "Designing schema..."
2. 🤖 SQL Pro - "Writing migration..."
3. 🤖 Security Auditor - "Verifying RLS policies..."
4. 🤖 TypeScript Pro - "Generating types..."
✅ Complete: Schema ready
```

**Pricing Change Task (CRITICAL):**
```
You: "I updated the discount calculation"

Claude Code automatically:
1. 🤖 pricing-calculator - "⚠️ BLOCKING: Validating pricing..."
   ↓ If FAIL: "❌ 13% cap violated. Fix before continuing."
   ↓ If PASS: ✅ "All 48 scenarios passed"
2. 🤖 Test Engineer - "Adding regression tests..."
3. 🤖 Code Reviewer - "Reviewing pricing logic..."
✅ Complete: Pricing validated
```

### Context Detection Rules

Claude Code analyzes your message for:
- **Keywords:** "component", "pricing", "deploy", "schema", "mobile", "auth"
- **File mentions:** "LeadCard.tsx", "pricing.ts", "schema.sql"
- **Action verbs:** "building", "fixing", "deploying", "testing", "reviewing"
- **Problem indicators:** "broken", "slow", "error", "bug", "issue"

Then automatically invokes relevant agents.
```

---

## 📊 LAYER 3: WORKFLOW STAGE TRIGGERS

### **Implementation: Update `HOOKS-AND-AUTOMATION.md`**

Add these automated workflow stage hooks:

```bash
# .claude/hooks/on-feature-start.sh
#!/bin/bash
# Triggered when starting a new feature

echo "🎯 New Feature Workflow Started"
echo ""

# Step 1: Read requirements
echo "📖 Step 1: Reading requirements..."
cat TASKS.md | grep "IN PROGRESS"

# Step 2: Auto-invoke planning agents
echo ""
echo "🤖 Step 2: Invoking planning agents..."

# If DB changes needed
if grep -q "database\|schema\|migration" <<< "$FEATURE_NAME"; then
    echo "  → Supabase Schema Architect (DB changes detected)"
    # Agent invocation logic here
fi

# If UI changes needed
if grep -q "component\|page\|UI\|form" <<< "$FEATURE_NAME"; then
    echo "  → TypeScript Pro (Type definitions needed)"
    echo "  → React Performance Optimization (Component planning)"
fi

echo ""
echo "✅ Planning complete. Ready to implement."
```

```bash
# .claude/hooks/on-file-save.sh
#!/bin/bash
# Triggered on EVERY file save

SAVED_FILE="$1"

echo "💾 File saved: $SAVED_FILE"

# Auto-trigger agents based on file type
case "$SAVED_FILE" in
    *components/*.tsx|*pages/*.tsx)
        echo "🤖 UI change detected → Triggering mobile-tester in 2s..."
        sleep 2
        # Trigger mobile-tester
        ;;
    *pricing*.ts)
        echo "🚨 PRICING CHANGE → Triggering pricing-calculator NOW (BLOCKING)"
        # Trigger pricing-calculator (blocking)
        ;;
    *auth*.ts|*auth*.tsx)
        echo "🔒 Auth change detected → Triggering Security Auditor in 3s..."
        sleep 3
        # Trigger Security Auditor
        ;;
    *.sql|*migrations/*)
        echo "🗄️ Schema change detected → Triggering Supabase Schema Architect in 2s..."
        sleep 2
        # Trigger Supabase Schema Architect
        ;;
esac
```

```bash
# .claude/hooks/pre-commit.sh
#!/bin/bash
# Triggered before EVERY commit

echo "🔍 Pre-Commit Checks Starting..."
echo ""

BLOCKING_AGENTS=()

# Check 1: Mobile-First Verification
if git diff --cached --name-only | grep -E "(components|pages).*\.(tsx|jsx)"; then
    echo "📱 UI changes detected → Running mobile-tester..."
    # Run mobile-tester
    if [ $? -ne 0 ]; then
        BLOCKING_AGENTS+=("mobile-tester")
    fi
fi

# Check 2: Pricing Validation (CRITICAL)
if git diff --cached --name-only | grep -E "pricing"; then
    echo "💰 PRICING CHANGES → Running pricing-calculator (BLOCKING)..."
    # Run pricing-calculator
    if [ $? -ne 0 ]; then
        echo "❌ COMMIT BLOCKED: Pricing validation failed"
        exit 1
    fi
fi

# Check 3: Security Scan
if git diff --cached --name-only | grep -E "(auth|migrations)"; then
    echo "🔒 Security-sensitive changes → Running Security Auditor..."
    # Run Security Auditor
    if [ $? -ne 0 ]; then
        BLOCKING_AGENTS+=("Security Auditor")
    fi
fi

# Check 4: Code Quality
echo "📝 Running Code Reviewer..."
# Run Code Reviewer

if [ ${#BLOCKING_AGENTS[@]} -gt 0 ]; then
    echo ""
    echo "❌ COMMIT BLOCKED by agents:"
    printf '   - %s\n' "${BLOCKING_AGENTS[@]}"
    exit 1
fi

echo ""
echo "✅ All pre-commit checks passed"
```

```bash
# .claude/hooks/pre-push.sh
#!/bin/bash
# Triggered before pushing to remote

echo "🚀 Pre-Push Validation Starting..."
echo ""

# Run deployment blocker agents (MANDATORY)
echo "Running 3 deployment blockers..."

# Blocker 1: Security Auditor
echo "1/3 🔒 Security Auditor (BLOCKER)..."
# Run Security Auditor
if [ $? -ne 0 ]; then
    echo "❌ PUSH BLOCKED: Security vulnerabilities detected"
    exit 1
fi

# Blocker 2: pricing-calculator
echo "2/3 💰 pricing-calculator (BLOCKER)..."
# Run pricing-calculator
if [ $? -ne 0 ]; then
    echo "❌ PUSH BLOCKED: Pricing validation failed (13% cap violated?)"
    exit 1
fi

# Blocker 3: Web Vitals Optimizer
echo "3/3 ⚡ Web Vitals Optimizer (BLOCKER)..."
# Run Web Vitals Optimizer
if [ $? -ne 0 ]; then
    echo "❌ PUSH BLOCKED: Performance below threshold (mobile <90)"
    exit 1
fi

echo ""
echo "✅ All deployment blockers passed - Push approved"
```

---

## 🔄 PROACTIVE AGENT BEHAVIOR

### **Update Each Agent's Configuration**

Add to each agent's `.md` file in `.claude/agents/`:

```markdown
---
name: mobile-tester
description: USE PROACTIVELY when ANY UI file changes. Auto-triggers on *.tsx saves.
autoInvoke:
  triggers:
    - file_patterns: ["src/components/**/*.tsx", "src/pages/**/*.tsx"]
      delay: 2000
    - keywords: ["mobile", "responsive", "viewport", "touch"]
      delay: 0
  chainWith:
    - after: "Web Vitals Optimizer"
    - before: "Code Reviewer"
---
```

```markdown
---
name: pricing-calculator
description: MUST BE USED on ANY pricing change. Auto-triggers IMMEDIATELY. DEPLOYMENT BLOCKER.
autoInvoke:
  triggers:
    - file_patterns: ["**/pricing*.ts", "**/discount*.ts"]
      delay: 0
      blocking: true
    - keywords: ["pricing", "discount", "GST", "13%"]
      delay: 0
      blocking: true
  blockDeployment: true
  criticalErrors:
    - "13% discount cap exceeded"
    - "GST calculation incorrect"
    - "Equipment rates mismatch"
---
```

```markdown
---
name: Code Reviewer
description: USE PROACTIVELY on ANY code change. Auto-triggers after other agents complete.
autoInvoke:
  triggers:
    - file_patterns: ["src/**/*.ts", "src/**/*.tsx"]
      delay: 5000
    - keywords: ["code", "review", "quality"]
      delay: 0
  chainWith:
    - after: "mobile-tester"
    - after: "pricing-calculator"
    - after: "Security Auditor"
---
```

---

## 🎯 INTELLIGENT ORCHESTRATION EXAMPLES

### **Example 1: Building New Component (Automatic Chain)**

```
You: "I'm building the InspectionForm component"

Claude Code (automatically):
  🤖 Detected: UI component task
  🔗 Auto-chain activated: UI Component Workflow
  
  1. TypeScript Pro (0s delay)
     "Defining InspectionForm interfaces..."
     ✅ Complete: types/inspection-form.ts created
     
  2. React Performance Optimization (auto-chained)
     "Building optimized component with auto-save..."
     ✅ Complete: InspectionForm.tsx created
     
  3. mobile-tester (2s after file save)
     "Testing at 375px, 768px, 1440px..."
     ✅ Passed: All viewports working
     
  4. Web Vitals Optimizer (5s after build)
     "Checking load time and bundle impact..."
     ✅ Passed: Loads in 1.8s, bundle +45KB
     
  5. Code Reviewer (auto-chained)
     "Reviewing code quality..."
     ✅ Passed: 2 minor suggestions (see below)

🎉 InspectionForm complete! All agents passed.

Suggestions from Code Reviewer:
- Consider memoizing renderAreaSection (line 45)
- Extract validation logic to custom hook
```

### **Example 2: Modifying Pricing (Immediate Blocking)**

```
You: "I'm changing the multi-day discount calculation"

Claude Code (automatically):
  🚨 Detected: PRICING CHANGE (Critical)
  🔒 BLOCKING MODE: pricing-calculator invoked IMMEDIATELY
  
  pricing-calculator:
    Running all 48 pricing scenarios...
    
    ❌ FAILURE: Scenario 23 failed
    
    Error: 13% discount cap exceeded
    - Input: 48 hours (6 days), surface work
    - Expected max discount: 13% (0.87 multiplier)
    - Actual discount: 14.2% (0.858 multiplier)
    
    🚫 BLOCKED: Cannot continue until fixed
    
    Fix required in: src/lib/pricing/discount.ts:45
    
    Current: 
    ```typescript
    if (days >= 6) multiplier = 0.85
    ```
    
    Should be:
    ```typescript
    if (days >= 6) multiplier = Math.max(0.87, calculatedMultiplier)
    ```

❌ Task blocked until pricing-calculator passes
```

### **Example 3: Ready to Deploy (Full Validation)**

```
You: "I'm ready to deploy to production"

Claude Code (automatically):
  🚀 Detected: DEPLOYMENT REQUEST
  🔗 Auto-chain activated: Pre-Deployment Workflow (MANDATORY)
  
  Running 3 deployment blockers...
  
  1/3 Security Auditor (BLOCKER)
      Scanning for vulnerabilities...
      - npm audit: ✅ 0 high/critical
      - RLS policies: ✅ All tables protected
      - Hardcoded secrets: ✅ None found
      - Auth flows: ✅ Secure
      ✅ PASSED
      
  2/3 pricing-calculator (BLOCKER)
      Validating all pricing scenarios...
      - 48/48 scenarios: ✅ All passed
      - 13% discount cap: ✅ Enforced
      - GST 10%: ✅ Correct
      - Equipment rates: ✅ Accurate
      ✅ PASSED
      
  3/3 Web Vitals Optimizer (BLOCKER)
      Performance audit...
      - Mobile score: ✅ 94/100
      - Desktop score: ✅ 97/100
      - Load time: ✅ 2.1s average
      - Bundle size: ✅ 487KB
      ✅ PASSED

🟢 DEPLOYMENT APPROVED

All deployment blockers passed! Safe to deploy.

Next steps:
1. Push to main: git push origin main
2. Deploy to Vercel: npm run deploy
3. Monitor: Check logs for 1 hour post-deploy
```

---

## 📝 IMPLEMENTATION CHECKLIST

### **Step 1: Update Configuration Files** ⬜

- [ ] Add `autoInvokeAgents` to `.claude/settings.json`
- [ ] Update each agent `.md` with `autoInvoke` section
- [ ] Configure file watch patterns
- [ ] Set appropriate delays

### **Step 2: Install Hooks** ⬜

```bash
# Create hooks directory
mkdir -p .claude/hooks

# Create hook files
touch .claude/hooks/on-feature-start.sh
touch .claude/hooks/on-file-save.sh
touch .claude/hooks/pre-commit.sh
touch .claude/hooks/pre-push.sh

# Make executable
chmod +x .claude/hooks/*.sh

# Configure in .claude/settings.json
```

### **Step 3: Update Documentation** ⬜

- [ ] Enhance CLAUDE.md with automatic orchestration section
- [ ] Update MRC-AGENT-WORKFLOW.md with trigger rules
- [ ] Add to HOOKS-AND-AUTOMATION.md
- [ ] Update AGENT-INVOCATION-PATTERNS.md with automatic examples

### **Step 4: Test Automatic Triggering** ⬜

```bash
# Test 1: Modify UI component
echo "// test change" >> src/components/LeadCard.tsx
# Expected: mobile-tester auto-triggers in 2s

# Test 2: Modify pricing
echo "// test change" >> src/lib/pricing/discount.ts
# Expected: pricing-calculator auto-triggers IMMEDIATELY (blocking)

# Test 3: Try to commit with pricing issue
git add src/lib/pricing/discount.ts
git commit -m "test"
# Expected: Blocked by pricing-calculator

# Test 4: Try to deploy
# Expected: 3 deployment blockers run automatically
```

---

## ✅ SUCCESS CRITERIA

**You'll know automatic triggering works when:**

✅ Modifying a UI file auto-triggers mobile-tester (no manual command)  
✅ Changing pricing auto-blocks until validation passes  
✅ Committing runs Code Reviewer automatically  
✅ Pushing to remote runs 3 deployment blockers automatically  
✅ Claude Code suggests agents based on conversation context  
✅ Agent chains execute sequentially without prompting  
✅ Deployment is blocked if any blocker fails  

---

## 🚀 NEXT STEPS

1. **Review this document** with Claude Code
2. **Update configuration files** (.claude/settings.json, agent .md files)
3. **Install hooks** (.claude/hooks/*.sh)
4. **Test automatic triggering** (modify files, commit, push)
5. **Verify agent chains** work without manual invocation

**Command to implement:**
```
"Review this automatic agent triggering document and help me implement all 
configurations, hooks, and enhancements to make agents trigger automatically 
based on file changes, context, and workflow stages."
```

---

**With this enhancement, the MRC Multi-Agent Workflow System becomes truly autonomous and intelligent!** 🤖✨