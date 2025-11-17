# 🚀 MRC Project Quick Reference

**Last Updated:** 2025-01-17

---

## 📍 FILE LOCATIONS

### **Root Directory (Essential Only)**
```
/CLAUDE.md          - Primary session guide (READ FIRST)
/README.md          - Project overview
```

### **Documentation (context/)**
```
context/
├── MRC-PRD.md                           - Product requirements
├── MRC-TECHNICAL-SPEC.md               - Technical implementation
├── DATABASE-SCHEMA.md                   - Complete database schema
├── TASKS.md                             - All 320+ tasks
├── MRC-SPRINT-1-TASKS.md               - Current sprint
├── MRC-AGENT-WORKFLOW.md               - Agent workflows
├── PLANNING.md                          - Architecture decisions
├── PROJECT_ANALYSIS.md                  - Current state analysis
├── IMPROVEMENT_PLAN.md                  - Prioritized fixes
├── DEPLOYMENT-CHECKLIST.md             - Pre-deployment workflow
├── PRIORITY_ROADMAP.md                  - Sprint planning
├── design-checklist-s-tier.md          - Design standards
└── shadCN.md                            - shadcn/ui usage rules
```

### **Agents (.claude/agents/)**
```
.claude/agents/
├── design-review.md         - UI/UX comprehensive review
├── error-detective.md       - Debug and fix errors
├── supabase-specialist.md   - Database operations
├── frontend-builder.md      - React + shadcn/ui components
├── pricing-guardian.md      - Pricing validation (BLOCKER)
└── deployment-captain.md    - Pre-deployment gatekeeper
```

### **Archived (archive/)**
Old/redundant documentation (reference only)

---

## 🔌 MCP SERVERS (6 Connected)

1. **Supabase MCP** - Database operations, RLS testing
2. **Playwright MCP** - Visual testing, screenshots
3. **shadcn/ui MCP** - Component installation, demos
4. **GitHub MCP** - Git operations, commits
5. **Memory MCP** - Context persistence
6. **Fetch MCP** - External APIs, documentation

---

## 🤖 AGENTS (6 Specialized)

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **design-review** | UI/UX + accessibility | "Review the design" |
| **error-detective** | Debug errors | "Form not saving", errors |
| **supabase-specialist** | Database work | "Add table", migrations |
| **frontend-builder** | Build UI | "Build component" |
| **pricing-guardian** | Validate pricing | Before deployment (BLOCKER) |
| **deployment-captain** | Pre-deploy checks | "Ready to deploy" |

---

## ⚡ QUICK START

### **Every Session:**
```bash
cat CLAUDE.md                    # Read this first
cat context/TASKS.md             # Check current tasks
git status                       # Check git state
```

### **Common Commands:**
```bash
# Find current task
grep "🟡 IN PROGRESS" context/TASKS.md

# Read specific doc
cat context/MRC-PRD.md
cat context/DATABASE-SCHEMA.md
cat context/PROJECT_ANALYSIS.md
```

---

## 🎯 CRITICAL REMINDERS

- ✅ **Mobile-first:** Test 375px viewport FIRST
- ✅ **Touch targets:** ≥48px (gloves requirement)
- ✅ **Pricing:** 13% discount cap (NEVER exceed)
- ✅ **Security:** RLS on all tables
- ✅ **Performance:** <3s load time on 4G
- ✅ **Git:** Commit after every meaningful change

---

## 🚨 KNOWN CRITICAL GAPS

1. ❌ **Section 3 Inspection Form** - Area inspections + photos NOT COMPLETE
2. ❌ **Zero Tests** - No automated testing
3. ❌ **Offline Mode** - Service worker NOT IMPLEMENTED
4. ❌ **TypeScript Strict Mode** - Disabled (no type safety)
5. ❌ **No Code Splitting** - All routes load at once

**See context/PROJECT_ANALYSIS.md for details**

---

## 📚 WORKFLOW EXAMPLES

### **Build UI Component:**
```
"Build calendar booking component with shadcn/ui"
→ frontend-builder + Playwright MCP + design-review
```

### **Database Change:**
```
"Add email_log table with RLS policies"
→ supabase-specialist + Supabase MCP
```

### **Debug Error:**
```
"Inspection form not saving on mobile"
→ error-detective + Playwright MCP
```

### **Deploy:**
```
"Ready to deploy"
→ deployment-captain (runs all 5 checks)
```

---

**🎯 TIP:** Keep this file open during development for quick reference!
```

---

## ✅ YOUR PROJECT IS NOW OPTIMIZED!

**What you have:**
1. ✅ Clean root directory (2 files only)
2. ✅ All docs organized in context/
3. ✅ 6 specialized agents ready
4. ✅ 6 MCP servers connected
5. ✅ Quick reference guide
6. ✅ Git committed and clean

**Next steps:**
1. **Test the setup:** Ask Claude Code to "Build a simple lead card component"
2. **Verify agents work:** Try "Use error-detective to check console errors"
3. **Start Sprint 2:** Work on critical gaps (Section 3, tests, offline mode)

---

## 🎉 YOU'RE READY TO BUILD!

Your MRC development environment is now **production-ready** with:
- Optimized documentation structure
- 6 specialized agents
- 6 MCP servers
- Clear workflows
- No context overload

**Want to test it? Try this prompt in Claude Code:**
```
"Read CLAUDE.md and tell me the 3 most critical gaps in the MRC system right now"