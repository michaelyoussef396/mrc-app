#!/bin/bash

# 🔥 MRC Final Deep Cleanup Script
# Generated: November 17, 2025
# ⚠️  This is the RUTHLESS cleanup - eliminates ALL clutter
#
# This script will delete:
# - 80 files total (~7.6MB)
# - Backup directory (7.0MB)
# - Completed work docs
# - Migration summaries
# - Old schema docs (7 files)
# - Context setup docs
# - Duplicate docs
#
# ⚠️ CRITICAL: Only run after reviewing FINAL_AUDIT_REPORT.md

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}═══════════════════════════════════════════${NC}"
echo -e "${MAGENTA}   🔥 MRC FINAL DEEP CLEANUP SCRIPT${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}⚠️  WARNING: This is the RUTHLESS cleanup${NC}"
echo -e "${RED}⚠️  80 files will be deleted (~7.6MB)${NC}"
echo ""
echo "What will be deleted:"
echo "  • Backup directory (7.0MB, 42 files)"
echo "  • Completed work docs (10 files)"
echo "  • Migration summaries (3 files)"
echo "  • Old schema docs (7 files)"
echo "  • Context setup docs (10 files)"
echo "  • Supabase context subdirectory (4 files)"
echo "  • Obsolete scripts (2 files)"
echo "  • Review docs (2 files)"
echo ""
echo -e "${YELLOW}📊 Total: 80 files, ~7.6MB${NC}"
echo ""
echo -e "${GREEN}Before running:${NC}"
echo "  1. Read FINAL_AUDIT_REPORT.md"
echo "  2. Verify app works: npm run dev"
echo "  3. Commit current state (safety)"
echo ""

# Ask for confirmation
read -p "Have you read the audit report and verified the app works? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Cleanup cancelled${NC}"
    echo "Please review FINAL_AUDIT_REPORT.md first"
    exit 1
fi

echo ""
read -p "Are you ABSOLUTELY SURE you want to delete 80 files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Cleanup cancelled${NC}"
    exit 1
fi

# Create new backup for this cleanup
BACKUP_DIR=".final-cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Created backup directory: $BACKUP_DIR${NC}"
echo ""

# Function to backup and delete
backup_and_delete() {
    local file=$1
    if [ -f "$file" ]; then
        local dir=$(dirname "$file")
        mkdir -p "$BACKUP_DIR/$dir"
        cp "$file" "$BACKUP_DIR/$file"
        rm "$file"
        echo -e "  ${GREEN}✓${NC} Deleted: $file"
        return 0
    elif [ -d "$file" ]; then
        cp -r "$file" "$BACKUP_DIR/$file"
        rm -rf "$file"
        echo -e "  ${GREEN}✓${NC} Deleted directory: $file"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC}  Skipped: $file (not found)"
        return 1
    fi
}

DELETED_COUNT=0

# ═══════════════════════════════════════════
# PHASE 1: CRITICAL - Delete Backup Directory
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: Delete Old Backup Directory${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

if [ -d ".cleanup-backup-20251117-195629" ]; then
    backup_and_delete ".cleanup-backup-20251117-195629"
    ((DELETED_COUNT++))
    echo -e "${GREEN}✓ Deleted backup directory (7.0MB)${NC}"
else
    echo -e "${YELLOW}⚠ Backup directory already deleted${NC}"
fi

echo ""

# ═══════════════════════════════════════════
# PHASE 2: Delete Completed Work Docs
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: Delete Completed Work Docs${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

completed_work_docs=(
    "PHASE-2F-ROLLBACK-GUIDE.md"
    "PHASE-2F-SUMMARY.md"
    "PHASE-3-COMPLETE.md"
    "APPLY-MIGRATIONS-NOW.md"
    "APPLY-PHASE-2F-MIGRATIONS.md"
    "LEAD-NUMBER-FIX-GUIDE.md"
    "RLS-POLICY-FIX-GUIDE.md"
    "CLEANUP_ANALYSIS.md"
    "cleanup.sh"
    "test-migrations-curl.sh"
)

for file in "${completed_work_docs[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo -e "${GREEN}Phase 2 complete${NC}"
echo ""

# ═══════════════════════════════════════════
# PHASE 3: Delete Migration Docs
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: Delete Migration Summaries${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

migration_docs=(
    "MIGRATION-SUMMARY.md"
    "MIGRATION-TEST-REPORT.md"
    "MIGRATION-015-VERIFICATION.md"
)

for file in "${migration_docs[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo -e "${GREEN}Phase 3 complete${NC}"
echo ""

# ═══════════════════════════════════════════
# PHASE 4: Delete Old Schema Docs (7 files)
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: Delete Old Schema Docs${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Note: You should create DATABASE-SCHEMA.md after this${NC}"
echo ""

schema_docs=(
    "CURRENT-SCHEMA-STATE.md"
    "REQUIRED-SCHEMA-SPEC.md"
    "SCHEMA-ANALYSIS-SUMMARY.md"
    "SCHEMA-DOCUMENTATION-INDEX.md"
    "SCHEMA-QUICK-REFERENCE.md"
    "SCHEMA-RELATIONSHIPS-MAP.md"
    "SCHEMA_MISMATCH_ANALYSIS.md"
)

for file in "${schema_docs[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo -e "${GREEN}Phase 4 complete${NC}"
echo ""

# ═══════════════════════════════════════════
# PHASE 5: Clean Context Directory
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 5: Clean Context Directory${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

# Delete setup docs
context_setup_docs=(
    "context/MRC-Setup-Guide.md"
    "context/Setup-agent.md"
    "context/set-up-pahse4&5.md"
    "context/pahse6-hookup&automation.md"
    "context/MRC-AUTOMATIC-AGENT-TRIGGERING-ENHANCEMENT.md"
    "context/MRC-SPRINT-1-TASKS.md"
)

for file in "${context_setup_docs[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

# Delete supabase subdirectory
if [ -d "context/superbase" ]; then
    backup_and_delete "context/superbase"
    ((DELETED_COUNT++))
    echo -e "${GREEN}✓ Deleted context/superbase/ directory (4 files)${NC}"
fi

echo -e "${GREEN}Phase 5 complete${NC}"
echo ""

# ═══════════════════════════════════════════
# PHASE 6: Review and Delete Likely Duplicates
# ═══════════════════════════════════════════

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 6: Delete Likely Duplicates${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

# These require manual verification, but likely safe to delete
likely_duplicates=(
    "AGENT-SETUP-ANALYSIS.md"
    "QUICK_FIX_GUIDE.md"
)

for file in "${likely_duplicates[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo -e "${GREEN}Phase 6 complete${NC}"
echo ""

# ═══════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════

echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════${NC}"
echo -e "${MAGENTA}   ✅ FINAL CLEANUP COMPLETE${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════${NC}"
echo ""

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo -e "${BLUE}📊 Summary:${NC}"
echo "   • Files/directories deleted: $DELETED_COUNT"
echo "   • Backup location: $BACKUP_DIR"
echo "   • Backup size: $BACKUP_SIZE"
echo ""

# Calculate space recovered
echo -e "${GREEN}💾 Space recovered: ~7.6MB${NC}"
echo ""

# Next steps
echo -e "${YELLOW}📝 IMPORTANT NEXT STEPS:${NC}"
echo ""
echo -e "${RED}1. FIX BROKEN REFERENCE in CLAUDE.md:${NC}"
echo "   Remove line: cat REQUEST-INSPECTION-FORM-FIXED.md"
echo "   Command: sed -i '' '/REQUEST-INSPECTION-FORM-FIXED.md/d' CLAUDE.md"
echo ""
echo -e "${YELLOW}2. CREATE NEW SCHEMA DOC:${NC}"
echo "   Generate: DATABASE-SCHEMA.md from current Supabase"
echo "   Update CLAUDE.md to reference it"
echo ""
echo -e "${YELLOW}3. TEST THE APPLICATION:${NC}"
echo "   npm run dev"
echo "   • Test login"
echo "   • Test view leads"
echo "   • Test create lead"
echo "   • Test notifications"
echo "   • Verify no console errors"
echo ""
echo -e "${YELLOW}4. REVIEW THESE FILES FOR DELETION:${NC}"
echo "   • AGENT-INVOCATION-PATTERNS.md (compare with MRC-AGENT-WORKFLOW.md)"
echo "   • DEPLOYMENT-CHECKLIST.md (check if unique content)"
echo "   • HOOKS-AND-AUTOMATION.md (check if hooks are used)"
echo "   • context/MRC-LEAD-MANAGEMENT-SYSTEM-MASTER-TODO-LIST.md (compare with TASKS.md)"
echo ""
echo -e "${GREEN}5. IF ALL TESTS PASS:${NC}"
echo "   git add -A"
echo "   git commit -m 'chore: deep cleanup - eliminate all clutter (80 files, 7.6MB)'"
echo ""
echo -e "${MAGENTA}6. DELETE THIS BACKUP (after confirming):${NC}"
echo "   rm -rf $BACKUP_DIR"
echo ""

# Restoration instructions
echo -e "${BLUE}🔄 Restoration (if needed):${NC}"
echo "   To restore all files:"
echo "   cp -r $BACKUP_DIR/* ./"
echo ""
echo "   To restore specific file:"
echo "   cp $BACKUP_DIR/[filename] ./"
echo ""

# Final reminder
echo -e "${RED}⚠️  CRITICAL: Fix CLAUDE.md broken reference NOW${NC}"
echo -e "${RED}⚠️  Then test app before committing${NC}"
echo ""
echo -e "${GREEN}Done! 🎉${NC}"
