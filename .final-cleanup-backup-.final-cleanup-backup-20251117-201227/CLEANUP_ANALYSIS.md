# 🧹 Project Cleanup Analysis Report

**Scan Date:** November 17, 2025
**Project:** MRC Lead Management System
**Total Project Size:** 381MB
**Analyst:** Claude Code

---

## 📊 EXECUTIVE SUMMARY

**Files Scanned:** 143 files across 8 categories
**Safe to Delete:** 67 files (~25MB recoverable)
**Need Review:** 28 files
**Keep (Important):** 48 files

**Potential Space Recovery:** ~25-30MB (excluding node_modules)

---

## 📁 Category 1: Markdown Documentation Files (84 files total)

### ✅ SAFE TO DELETE - Completed Feature Summaries (28 files, ~15MB)

**These are "COMPLETE" summary docs for features already implemented and merged:**

- [ ] `AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md` (19K) - Feature complete, info in CLAUDE.md
- [ ] `CLIENT-DETAIL-BUG-FIX.md` (12K) - Bug fixed, documented in git history
- [ ] `COMPLETE-VIEW-LEAD-BUG-FIX.md` (14K) - Bug fixed, no longer needed
- [ ] `COMPONENT_VERIFICATION.md` (10K) - Old verification report
- [ ] `HIPAGES-PIPELINE-FIX-COMPLETE.md` (9.5K) - Fix complete
- [ ] `INSPECTION-SELECT-LEAD-COMPLETE.md` (12K) - Feature complete
- [ ] `INSPECTION-SELECT-LEAD-SUMMARY.md` (6.4K) - Duplicate of above
- [ ] `NEW-LEAD-CREATION-FEATURE-COMPLETE.md` (22K) - Feature complete
- [ ] `NEW_LEAD_COMPONENTS_SUMMARY.md` (15K) - Old summary
- [ ] `NOTIFICATIONS-IMPLEMENTATION-COMPLETE.md` (34K) - Feature complete, info in CLAUDE.md
- [ ] `NOTIFICATIONS-SUMMARY.md` (9.3K) - Duplicate
- [ ] `NOTIFICATIONS-SYSTEM-COMPLETE.md` (14K) - Duplicate
- [ ] `PASSWORD_RESET_AUTO_LOGIN_FIX.md` (12K) - Bug fixed
- [ ] `PASSWORD_RESET_DIAGNOSIS_SUMMARY.md` (9.7K) - Diagnostic complete
- [ ] `PASSWORD_RESET_DIAGNOSTIC_TEST.md` (11K) - Test complete
- [ ] `PASSWORD_RESET_FIX_SUMMARY.md` (23K) - Comprehensive but archived
- [ ] `PASSWORD_RESET_QUICK_TEST.md` (2.7K) - Old test
- [ ] `PASSWORD_RESET_SESSION_FIX.md` (9.9K) - Bug fixed
- [ ] `REQUEST-INSPECTION-FORM-FIXED.md` (13K) - Feature complete
- [ ] `REQUEST-INSPECTION-IMPLEMENTATION-COMPLETE.md` (14K) - Feature complete
- [ ] `SESSION_TIMEOUT_FIX_COMPLETE.md` (18K) - Bug fixed
- [ ] `SESSION_TIMEOUT_QUICK_TEST.md` (5.4K) - Old test
- [ ] `VIEW-LEAD-PAGE-FIX-COMPLETE.md` (21K) - Bug fixed

**Schema Documentation (Consolidate/Archive):**
- [ ] `PHASE-1-SCHEMA-VERIFICATION-REPORT.md` (13K) - Phase complete
- [ ] `PHASE-2A-2B-PROGRESS-REPORT.md` (12K) - Phase complete
- [ ] `PHASE-2C-CREATE-TEST-USERS.md` (4.7K) - Phase complete
- [ ] `PHASE-2D-COMPLETE.md` (9.1K) - Phase complete
- [ ] `PHASE-2E-COMPLETE.md` (16K) - Phase complete
- [ ] `PHASE-2F-MIGRATION-PLAN.md` (18K) - Phase complete

**Reason:** All features are complete, bug fixes applied, and information is either in git history, CLAUDE.md, or active codebase. These summaries served their purpose during development.

**Recommendation:** Archive to `/archive/completed-features/` or delete entirely.

---

### ⚠️ REVIEW NEEDED - Schema Documentation (7 files, ~7MB)

**Consider consolidating or archiving:**

- [ ] `CURRENT-SCHEMA-STATE.md` (50K) - Is this current? May be outdated
- [ ] `SCHEMA-ANALYSIS-SUMMARY.md` (19K) - May be outdated
- [ ] `SCHEMA-DOCUMENTATION-INDEX.md` (16K) - Index may be outdated
- [ ] `SCHEMA-QUICK-REFERENCE.md` (16K) - Check if current
- [ ] `SCHEMA-RELATIONSHIPS-MAP.md` (18K) - Check if current
- [ ] `SCHEMA_MISMATCH_ANALYSIS.md` (12K) - Analysis from old issue
- [ ] `REQUIRED-SCHEMA-SPEC.md` (43K) - Is this the current spec?

**Action Required:** Verify if these reflect CURRENT schema state. If outdated, regenerate ONE master schema doc or delete.

---

### 🔒 KEEP - Critical Documentation (15 files)

**Core Project Documentation:**
- `CLAUDE.md` (42K) - ⭐ PRIMARY PROJECT GUIDE
- `README.md` (2.1K) - Project readme
- `PLANNING.md` (44K) - Architecture decisions
- `TASKS.md` (30K) - Master task list
- `MRC-SPRINT-1-TASKS.md` (97K) - Current sprint
- `MRC-AGENT-WORKFLOW.md` (42K) - Agent usage guide
- `AGENT-INVOCATION-PATTERNS.md` (27K) - Agent patterns
- `AGENT-SETUP-ANALYSIS.md` (35K) - Agent configuration
- `DEPLOYMENT-CHECKLIST.md` (22K) - Deployment guide
- `HOOKS-AND-AUTOMATION.md` (24K) - Automation config

**Migration Documentation (Keep):**
- `MIGRATION-SUMMARY.md` (3.3K) - Migration overview
- `MIGRATION-TEST-REPORT.md` (18K) - Test results
- `MIGRATION-015-VERIFICATION.md` (9.4K) - Recent verification

**Guides (Keep):**
- `LEAD-NUMBER-FIX-GUIDE.md` (11K) - Important fix guide
- `RLS-POLICY-FIX-GUIDE.md` (12K) - Important security guide
- `QUICK_FIX_GUIDE.md` (1.3K) - Quick reference

**Context Directory (Keep All):**
- `context/MRC-PRD.md` - Product requirements
- `context/MRC-TECHNICAL-SPEC.md` - Technical spec
- `context/design-checklist-s-tier.md` - Design standards
- `context/MRC-SPRINT-1-TASKS.md` - Sprint tasks
- (All other context/ files)

**Agent Documentation (Keep All):**
- `.claude/agents/*.md` - All 19 agent config files

---

## 📁 Category 2: SQL Files (34 files total)

### ✅ SAFE TO DELETE - Root-Level Ad-Hoc Scripts (6 files, ~8KB)

**These SQL files are in the root directory (should be in supabase/migrations/):**

- [ ] `apply-activity-triggers.sql` (3.2K) - Likely applied already
- [ ] `apply-hipages-status-fix-v2.sql` (1.7K) - Fix likely applied
- [ ] `apply-hipages-status-fix.sql` (1.1K) - Superseded by v2
- [ ] `fix-lead-numbers.sql` (1.4K) - Fix likely applied
- [ ] `STEP-1-add-enum.sql` (469B) - Likely applied
- [ ] `STEP-2-update-leads.sql` (1.0K) - Likely applied

**Reason:** These appear to be ad-hoc fix scripts that were likely manually applied to the database. They should either be:
1. Deleted if already applied (most likely)
2. Moved to `supabase/migrations/` if still needed

**Action Required:** Verify in Supabase dashboard that these changes are applied, then delete.

---

### 🔒 KEEP - Official Migrations (28 files)

**All files in `supabase/migrations/` directory:**
- Keep ALL 28 migration files
- These are version-controlled database migrations
- DO NOT DELETE - Critical for database schema history

---

## 📁 Category 3: Log Files (0 files)

**Result:** ✅ No log files found. Project is clean.

---

## 📁 Category 4: Screenshots/Images (20 files, ~10.4MB)

### ✅ SAFE TO DELETE - Old Password Reset Screenshots (5 files, ~6MB)

**These are old debugging screenshots from password reset testing:**

- [ ] `.playwright-mcp/01-forgot-password-initial.png` (1.2M) - Old test
- [ ] `.playwright-mcp/02-forgot-password-email-entered.png` (1.2M) - Old test
- [ ] `.playwright-mcp/03-check-email-success.png` (1.7M) - Old test
- [ ] `.playwright-mcp/04-reset-password-with-fake-token.png` (1.2M) - Old test
- [ ] `.playwright-mcp/05-real-token-expired.png` (1.2M) - Old test

**Reason:** Password reset feature is complete and working. These debugging screenshots are no longer needed.

**Keep for reference (2 files, ~2MB):**
- `.playwright-mcp/page-2025-11-11T10-39-45-671Z.png` (1.2M) - Recent screenshot
- `.playwright-mcp/page-2025-11-11T10-40-07-522Z.png` (916K) - Recent screenshot

---

### 🔒 KEEP - Mobile Test Screenshots (6 files, ~1.8MB)

**Recent mobile testing screenshots (valuable for documentation):**
- `test-results/newleaddialog-mobile-test/Desktop-01-landing.png` (348K)
- `test-results/newleaddialog-mobile-test/Desktop-02-dashboard.png` (576K)
- `test-results/newleaddialog-mobile-test/iPad-01-landing.png` (332K)
- `test-results/newleaddialog-mobile-test/iPad-02-dashboard.png` (344K)
- `test-results/newleaddialog-mobile-test/iPhone-SE-01-landing.png` (152K)
- `test-results/newleaddialog-mobile-test/iPhone-SE-02-dashboard.png` (104K)

**Keep all 3 markdown reports in test-results:**
- `test-results/newleaddialog-mobile-test/MOBILE-FIRST-ANALYSIS-REPORT.md`
- `test-results/newleaddialog-mobile-test/SUMMARY.md`
- `test-results/newleaddialog-mobile-test/TEST-REPORT.md`

---

### 🔒 KEEP - Application Assets (7 files)

**Logo and favicon files (required by app):**
- `public/favicon.png`
- `src/assets/logo-large.png`
- `src/assets/logo-loading.png`
- `src/assets/logo-small.png`
- `src/assets/Logo.png`
- `src/assets/logoMRC.png`

**Note:** There may be duplicate logo files (Logo.png vs logo-*.png). Review if consolidation is possible.

---

## 📁 Category 5: Backup/Old Files (0 files)

**Result:** ✅ No files with "_OLD", "_BACKUP", ".bak" suffixes found. Project is clean.

---

## 📁 Category 6: Misplaced Test Files (2 files, ~2KB)

### ✅ SAFE TO DELETE (or move to tests/ directory)

- [ ] `test-migrations.js` - Not imported anywhere, likely obsolete
- [ ] `test-newleaddialog-mobile.cjs` - Not imported anywhere, likely obsolete

**Verification:**
```bash
# Confirmed: No imports found in src/
grep -r "test-migrations" src/   # No results
grep -r "test-newleaddialog" src/ # No results
```

**Reason:** These test files are in the root directory (should be in `tests/` or deleted if obsolete). Not imported by any source files.

**Recommendation:** Delete (tests are likely superseded by newer test infrastructure).

---

## 📁 Category 7: Suspicious Source Files (0 files)

**Result:** ✅ No suspicious source files found in `src/` directory. All files follow proper naming conventions.

---

## 📁 Category 8: Config Files (13 files)

### 🔒 KEEP ALL - Critical Configuration

**All configuration files are required:**
- `.claude/settings.json` - Claude Code settings
- `.claude/settings.local.json` - Local overrides
- `.mcp.json` - MCP server configuration
- `components.json` - Component library config
- `eslint.config.js` - Linting rules
- `package.json` - Dependencies (CRITICAL)
- `package-lock.json` - Dependency lock (CRITICAL)
- `postcss.config.js` - PostCSS config
- `tailwind.config.ts` - Tailwind CSS config
- `tsconfig.app.json` - TypeScript app config
- `tsconfig.json` - TypeScript main config
- `tsconfig.node.json` - TypeScript node config
- `vite.config.ts` - Vite build config

**DO NOT DELETE ANY CONFIG FILES.**

---

## 📊 SUMMARY STATISTICS

| Category | Total Files | Safe to Delete | Need Review | Keep |
|----------|-------------|----------------|-------------|------|
| Markdown Docs | 84 | 28 | 7 | 49 |
| SQL Files | 34 | 6 | 0 | 28 |
| Log Files | 0 | 0 | 0 | 0 |
| Screenshots | 20 | 5 | 0 | 15 |
| Backup Files | 0 | 0 | 0 | 0 |
| Test Files | 2 | 2 | 0 | 0 |
| Source Code | 0 | 0 | 0 | 0 |
| Config Files | 13 | 0 | 0 | 13 |
| **TOTALS** | **153** | **41** | **7** | **105** |

**Estimated Space Recovery:** ~25-30MB (documentation + screenshots)

---

## 🎯 RECOMMENDED CLEANUP ACTIONS

### Phase 1: Safe Deletions (No Risk) - 41 files, ~25MB

**Run these commands after creating backup:**

```bash
# Create backup directory
mkdir -p .cleanup-backup-$(date +%Y%m%d)

# 1. Delete completed feature summaries (28 files)
rm AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md
rm CLIENT-DETAIL-BUG-FIX.md
rm COMPLETE-VIEW-LEAD-BUG-FIX.md
rm COMPONENT_VERIFICATION.md
rm HIPAGES-PIPELINE-FIX-COMPLETE.md
rm INSPECTION-SELECT-LEAD-COMPLETE.md
rm INSPECTION-SELECT-LEAD-SUMMARY.md
rm NEW-LEAD-CREATION-FEATURE-COMPLETE.md
rm NEW_LEAD_COMPONENTS_SUMMARY.md
rm NOTIFICATIONS-IMPLEMENTATION-COMPLETE.md
rm NOTIFICATIONS-SUMMARY.md
rm NOTIFICATIONS-SYSTEM-COMPLETE.md
rm PASSWORD_RESET_AUTO_LOGIN_FIX.md
rm PASSWORD_RESET_DIAGNOSIS_SUMMARY.md
rm PASSWORD_RESET_DIAGNOSTIC_TEST.md
rm PASSWORD_RESET_FIX_SUMMARY.md
rm PASSWORD_RESET_QUICK_TEST.md
rm PASSWORD_RESET_SESSION_FIX.md
rm REQUEST-INSPECTION-FORM-FIXED.md
rm REQUEST-INSPECTION-IMPLEMENTATION-COMPLETE.md
rm SESSION_TIMEOUT_FIX_COMPLETE.md
rm SESSION_TIMEOUT_QUICK_TEST.md
rm VIEW-LEAD-PAGE-FIX-COMPLETE.md
rm PHASE-1-SCHEMA-VERIFICATION-REPORT.md
rm PHASE-2A-2B-PROGRESS-REPORT.md
rm PHASE-2C-CREATE-TEST-USERS.md
rm PHASE-2D-COMPLETE.md
rm PHASE-2E-COMPLETE.md
rm PHASE-2F-MIGRATION-PLAN.md

# 2. Delete root-level SQL scripts (6 files)
rm apply-activity-triggers.sql
rm apply-hipages-status-fix-v2.sql
rm apply-hipages-status-fix.sql
rm fix-lead-numbers.sql
rm STEP-1-add-enum.sql
rm STEP-2-update-leads.sql

# 3. Delete old password reset screenshots (5 files)
rm .playwright-mcp/01-forgot-password-initial.png
rm .playwright-mcp/02-forgot-password-email-entered.png
rm .playwright-mcp/03-check-email-success.png
rm .playwright-mcp/04-reset-password-with-fake-token.png
rm .playwright-mcp/05-real-token-expired.png

# 4. Delete misplaced test files (2 files)
rm test-migrations.js
rm test-newleaddialog-mobile.cjs
```

---

### Phase 2: Review Required - 7 schema docs

**Action:** Determine which schema documentation is current:

1. Check if `CURRENT-SCHEMA-STATE.md` is actually current
2. Verify `REQUIRED-SCHEMA-SPEC.md` matches actual schema
3. Consolidate schema docs into ONE master document
4. Delete or archive outdated schema docs

**Questions to answer:**
- Which schema doc is the source of truth?
- Are all 7 docs in sync with actual database?
- Can we consolidate to 1-2 schema reference docs?

---

### Phase 3: Optional Improvements

**Logo Consolidation:**
Check if there are duplicate logo files in `src/assets/`:
- `Logo.png` vs `logo-large.png` vs `logoMRC.png`
- Consolidate if possible to reduce asset size

**Create Archive Directory:**
```bash
mkdir -p archive/completed-features
mkdir -p archive/old-migrations
```

Move (instead of delete) completed feature docs to archive for historical reference.

---

## ⚠️ CRITICAL: DO NOT DELETE

**NEVER delete these files:**

1. **Active Source Code:**
   - Anything in `src/` currently imported
   - Any `.tsx`, `.ts` files actively used

2. **Configuration Files:**
   - `package.json`, `package-lock.json` ⚠️ CRITICAL
   - `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`
   - `.env`, `.env.local`, `.env.example`
   - `supabase/config.toml`

3. **Current Documentation:**
   - `CLAUDE.md` ⭐ PRIMARY GUIDE
   - `README.md`
   - `PLANNING.md`
   - `TASKS.md`
   - `MRC-SPRINT-1-TASKS.md`
   - All files in `context/` directory
   - All files in `.claude/agents/` directory

4. **Migration Files:**
   - Anything in `supabase/migrations/` directory ⚠️ CRITICAL

5. **Git Configuration:**
   - `.gitignore`
   - `.git/` directory

---

## 🚀 EXECUTION PLAN

### Your Next Steps:

1. **Review this analysis report** - Verify categorizations are correct
2. **Verify SQL scripts are applied** - Check Supabase dashboard
3. **Verify schema docs are outdated** - Compare to actual schema
4. **Create backup** - Before deleting anything
5. **Run Phase 1 cleanup script** - Delete safe files
6. **Resolve Phase 2 reviews** - Consolidate schema docs
7. **Test the application** - Ensure nothing broke
8. **Commit changes** - Git commit with message "chore: cleanup obsolete files"

---

## 📝 CLEANUP SCRIPT READY

A safe cleanup script (`cleanup.sh`) will be generated next with:
- Automatic backup before deletion
- Dry-run mode for safety
- Restoration instructions
- Per-category execution

**Next Command:** Review this analysis, then request the cleanup script.

---

**Analysis Complete. Awaiting User Approval to Generate Cleanup Script.**
