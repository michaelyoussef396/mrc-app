# 📚 MRC Project Knowledge Reference

**Configuration File:** `.claude/settings.json`

All core MRC workflow documentation is now configured for automatic availability in every Claude Code session.

---

## 🎯 Auto-Load Files (Read at Session Start)

These files are automatically loaded when you start a new Claude Code session:

1. **CLAUDE.md** (Priority: CRITICAL)
   - Session guide - Start here every time
   - Essential startup workflow
   - Agent quick reference
   - MRC-specific development standards

2. **MRC-AGENT-WORKFLOW.md** (Priority: HIGH)
   - Agent usage patterns
   - Workflow sequences
   - Invocation examples

3. **MRC-SPRINT-1-TASKS.md** (Priority: HIGH)
   - Current 4-week sprint roadmap
   - Daily task breakdown
   - Progress tracking

4. **.claude/agents/README.md** (Priority: HIGH)
   - Complete agent directory (12 agents)
   - Agent capabilities
   - Invocation patterns

---

## 📖 Available on Demand

These files are available but not auto-loaded (load when needed):

### Sprint & Tasks
- **TASKS.md** - All 320+ tasks with agent assignments
- **PLANNING.md** - Architecture decisions and tech stack

### Technical Documentation
- **context/MRC-PRD.md** - Product requirements document
- **context/MRC-TECHNICAL-SPEC.md** - Technical implementation guide
- **context/design-checklist-s-tier.md** - MRC design standards

### Deployment & Automation
- **DEPLOYMENT-CHECKLIST.md** - Pre-deployment workflow and blockers
- **HOOKS-AND-AUTOMATION.md** - Hook configurations
- **AGENT-INVOCATION-PATTERNS.md** - Copy-paste pattern library

### Automation System
- **context/MRC-AUTOMATIC-AGENT-TRIGGERING-ENHANCEMENT.md** - Specification
- **AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md** - Implementation guide

---

## 🔄 Startup Sequence

Every new Claude Code session should follow this sequence:

```bash
# 1. Read core documentation
cat CLAUDE.md
cat MRC-AGENT-WORKFLOW.md
cat MRC-SPRINT-1-TASKS.md
cat .claude/agents/README.md

# 2. Check git status
git status
git log --oneline -10
git branch

# 3. Identify current task
grep "🟡 IN PROGRESS" TASKS.md
grep "🔄 IN PROGRESS" MRC-SPRINT-1-TASKS.md
```

**This sequence is now automated via `.claude/settings.json`!**

---

## 📂 Context Windows

Files are organized into logical context groups:

### Essential (Always Available)
- CLAUDE.md
- MRC-AGENT-WORKFLOW.md
- .claude/agents/README.md

### Sprint Planning
- MRC-SPRINT-1-TASKS.md
- TASKS.md

### Technical Reference
- PLANNING.md
- context/MRC-TECHNICAL-SPEC.md

### Deployment
- DEPLOYMENT-CHECKLIST.md
- HOOKS-AND-AUTOMATION.md

### Patterns & Automation
- AGENT-INVOCATION-PATTERNS.md
- AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md

---

## 🎨 Priority Levels

Files are prioritized for loading:

**CRITICAL (Must Read First):**
- CLAUDE.md

**HIGH (Read at Session Start):**
- MRC-AGENT-WORKFLOW.md
- MRC-SPRINT-1-TASKS.md
- .claude/agents/README.md
- TASKS.md
- DEPLOYMENT-CHECKLIST.md

**MEDIUM (Load as Needed):**
- PLANNING.md
- context/MRC-PRD.md
- context/MRC-TECHNICAL-SPEC.md
- context/design-checklist-s-tier.md
- AGENT-INVOCATION-PATTERNS.md
- HOOKS-AND-AUTOMATION.md
- AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md

**LOW (Reference Only):**
- context/MRC-AUTOMATIC-AGENT-TRIGGERING-ENHANCEMENT.md

---

## 🚀 Quick Access Commands

### Read Essential Files
```bash
# Critical files
cat CLAUDE.md

# Agent reference
cat MRC-AGENT-WORKFLOW.md
cat .claude/agents/README.md

# Current sprint
cat MRC-SPRINT-1-TASKS.md
```

### Check Current Status
```bash
# Git status
git status
git log --oneline -10

# Current tasks
grep "IN PROGRESS" TASKS.md
grep "IN PROGRESS" MRC-SPRINT-1-TASKS.md
```

### Load Technical Docs
```bash
# Architecture
cat PLANNING.md

# Product requirements
cat context/MRC-PRD.md

# Technical specs
cat context/MRC-TECHNICAL-SPEC.md

# Design standards
cat context/design-checklist-s-tier.md
```

### Load Deployment Info
```bash
# Deployment workflow
cat DEPLOYMENT-CHECKLIST.md

# Hooks and automation
cat HOOKS-AND-AUTOMATION.md

# Agent patterns
cat AGENT-INVOCATION-PATTERNS.md
```

---

## 📋 File Locations

All files are in the project root except:

**In `.claude/` directory:**
- `.claude/settings.json` (configuration)
- `.claude/agents/README.md` (agent directory)
- `.claude/agents/*.md` (individual agent configs)
- `.claude/hooks/*.sh` (automation hooks)

**In `context/` directory:**
- `context/MRC-PRD.md`
- `context/MRC-TECHNICAL-SPEC.md`
- `context/design-checklist-s-tier.md`
- `context/MRC-AUTOMATIC-AGENT-TRIGGERING-ENHANCEMENT.md`

**In project root:**
- All other documentation files

---

## 💡 Usage Tips

### Starting a New Session
1. Claude Code automatically loads essential files
2. Review CLAUDE.md for session workflow
3. Check MRC-SPRINT-1-TASKS.md for current sprint
4. Run `git status` to see what's changed

### During Development
1. Reference MRC-AGENT-WORKFLOW.md for agent patterns
2. Check AGENT-INVOCATION-PATTERNS.md for copy-paste examples
3. Use DEPLOYMENT-CHECKLIST.md before deployment

### Before Deployment
1. Review DEPLOYMENT-CHECKLIST.md
2. Check HOOKS-AND-AUTOMATION.md
3. Ensure all 3 deployment blockers pass

### Need Help with Agents
1. Check .claude/agents/README.md (agent directory)
2. Review AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md
3. Reference individual agent config files

---

## 🔧 Configuration Details

The project knowledge configuration is in `.claude/settings.json`:

```json
{
  "projectKnowledge": {
    "alwaysInclude": [ /* 14 files */ ],
    "startupSequence": {
      "order": [ /* 4 essential files */ ],
      "runGitStatus": true,
      "checkCurrentTask": true
    },
    "contextWindows": {
      "essential": [ /* 3 files */ ],
      "sprint": [ /* 2 files */ ],
      "technical": [ /* 2 files */ ],
      "deployment": [ /* 2 files */ ],
      "patterns": [ /* 2 files */ ]
    }
  }
}
```

---

## ✅ Benefits

**With this configuration, every Claude Code session:**

✅ Automatically knows the MRC workflow system
✅ Has access to all agent patterns and invocations
✅ Understands the current sprint and tasks
✅ Knows the deployment requirements
✅ Can reference technical documentation instantly
✅ Follows consistent development standards

**No need to manually load files - it's all automated!** 🎉

---

## 📝 Maintenance

**When adding new documentation:**

1. Add file path to `.claude/settings.json` under `projectKnowledge.alwaysInclude`
2. Set appropriate priority (critical/high/medium/low)
3. Configure `autoLoad: true` if it should load at session start
4. Assign to appropriate context window group

**Example:**
```json
{
  "path": "NEW-DOCUMENT.md",
  "description": "Brief description",
  "priority": "medium",
  "autoLoad": false
}
```

---

**Last Updated:** November 11, 2025
**Configuration File:** `.claude/settings.json`
**Status:** ✅ All 14 core files configured and ready
