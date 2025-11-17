#!/bin/bash

# 🧹 MRC Project Cleanup Script
# Generated: November 17, 2025
# ⚠️  ALWAYS review this script before running!
#
# This script will:
# 1. Create a backup of all files to be deleted
# 2. Delete obsolete files (41 files, ~25MB)
# 3. Provide restoration instructions
#
# Files to delete:
# - 28 completed feature summary docs
# - 6 root-level SQL scripts (already applied)
# - 5 old password reset screenshots
# - 2 misplaced test files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 MRC Project Cleanup Script${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}⚠️  This will delete 41 files (~25MB)${NC}"
echo ""
echo "Categories to clean:"
echo "  • 28 completed feature summary docs"
echo "  • 6 root-level SQL scripts"
echo "  • 5 old password reset screenshots"
echo "  • 2 misplaced test files"
echo ""
echo -e "${GREEN}✓ A backup will be created first${NC}"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Cleanup cancelled${NC}"
    exit 1
fi

# Create backup directory with timestamp
BACKUP_DIR=".cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/.playwright-mcp"
echo -e "${GREEN}✅ Created backup directory: $BACKUP_DIR${NC}"
echo ""

# Function to backup and delete a file
backup_and_delete() {
    local file=$1
    if [ -f "$file" ]; then
        # Get directory structure for backup
        local dir=$(dirname "$file")
        mkdir -p "$BACKUP_DIR/$dir"

        # Copy to backup
        cp "$file" "$BACKUP_DIR/$file"

        # Delete original
        rm "$file"

        echo -e "  ${GREEN}✓${NC} Deleted: $file (backed up)"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC}  Skipped: $file (not found)"
        return 1
    fi
}

# Counter for deleted files
DELETED_COUNT=0

# PHASE 1: Delete completed feature summaries
echo -e "${BLUE}📄 Phase 1: Cleaning up completed feature summaries...${NC}"
echo "   (28 files)"

declare -a feature_docs=(
    "AUTOMATIC-AGENT-TRIGGERING-IMPLEMENTATION-COMPLETE.md"
    "CLIENT-DETAIL-BUG-FIX.md"
    "COMPLETE-VIEW-LEAD-BUG-FIX.md"
    "COMPONENT_VERIFICATION.md"
    "HIPAGES-PIPELINE-FIX-COMPLETE.md"
    "INSPECTION-SELECT-LEAD-COMPLETE.md"
    "INSPECTION-SELECT-LEAD-SUMMARY.md"
    "NEW-LEAD-CREATION-FEATURE-COMPLETE.md"
    "NEW_LEAD_COMPONENTS_SUMMARY.md"
    "NOTIFICATIONS-IMPLEMENTATION-COMPLETE.md"
    "NOTIFICATIONS-SUMMARY.md"
    "NOTIFICATIONS-SYSTEM-COMPLETE.md"
    "PASSWORD_RESET_AUTO_LOGIN_FIX.md"
    "PASSWORD_RESET_DIAGNOSIS_SUMMARY.md"
    "PASSWORD_RESET_DIAGNOSTIC_TEST.md"
    "PASSWORD_RESET_FIX_SUMMARY.md"
    "PASSWORD_RESET_QUICK_TEST.md"
    "PASSWORD_RESET_SESSION_FIX.md"
    "REQUEST-INSPECTION-FORM-FIXED.md"
    "REQUEST-INSPECTION-IMPLEMENTATION-COMPLETE.md"
    "SESSION_TIMEOUT_FIX_COMPLETE.md"
    "SESSION_TIMEOUT_QUICK_TEST.md"
    "VIEW-LEAD-PAGE-FIX-COMPLETE.md"
    "PHASE-1-SCHEMA-VERIFICATION-REPORT.md"
    "PHASE-2A-2B-PROGRESS-REPORT.md"
    "PHASE-2C-CREATE-TEST-USERS.md"
    "PHASE-2D-COMPLETE.md"
    "PHASE-2E-COMPLETE.md"
    "PHASE-2F-MIGRATION-PLAN.md"
)

for file in "${feature_docs[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo ""

# PHASE 2: Delete root-level SQL scripts
echo -e "${BLUE}💾 Phase 2: Cleaning up root-level SQL scripts...${NC}"
echo "   (6 files - already applied to database)"

declare -a sql_scripts=(
    "apply-activity-triggers.sql"
    "apply-hipages-status-fix-v2.sql"
    "apply-hipages-status-fix.sql"
    "fix-lead-numbers.sql"
    "STEP-1-add-enum.sql"
    "STEP-2-update-leads.sql"
)

for file in "${sql_scripts[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo ""

# PHASE 3: Delete old password reset screenshots
echo -e "${BLUE}🖼️  Phase 3: Cleaning up old password reset screenshots...${NC}"
echo "   (5 files, ~6MB)"

declare -a old_screenshots=(
    ".playwright-mcp/01-forgot-password-initial.png"
    ".playwright-mcp/02-forgot-password-email-entered.png"
    ".playwright-mcp/03-check-email-success.png"
    ".playwright-mcp/04-reset-password-with-fake-token.png"
    ".playwright-mcp/05-real-token-expired.png"
)

for file in "${old_screenshots[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo ""

# PHASE 4: Delete misplaced test files
echo -e "${BLUE}🧪 Phase 4: Cleaning up misplaced test files...${NC}"
echo "   (2 files)"

declare -a test_files=(
    "test-migrations.js"
    "test-newleaddialog-mobile.cjs"
)

for file in "${test_files[@]}"; do
    if backup_and_delete "$file"; then
        ((DELETED_COUNT++))
    fi
done

echo ""
echo "======================================"
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "   • Files deleted: $DELETED_COUNT"
echo "   • Backup location: $BACKUP_DIR"
echo ""

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "${BLUE}💾 Space recovered: $BACKUP_SIZE${NC}"
echo ""

# Provide restoration instructions
echo -e "${YELLOW}📝 Restoration Instructions:${NC}"
echo "   If you need to restore any files:"
echo "   1. List backed up files:"
echo "      ls -R $BACKUP_DIR"
echo ""
echo "   2. Restore a specific file:"
echo "      cp $BACKUP_DIR/[filename] ./"
echo ""
echo "   3. Restore all files:"
echo "      cp -r $BACKUP_DIR/* ./"
echo ""
echo "   4. Once confirmed everything works, delete backup:"
echo "      rm -rf $BACKUP_DIR"
echo ""

# Suggest next steps
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "   1. Test the application to ensure nothing broke"
echo "   2. Review CLEANUP_ANALYSIS.md for Phase 2 tasks"
echo "   3. If everything works, delete the backup directory"
echo "   4. Commit changes: git add -A && git commit -m 'chore: cleanup obsolete files'"
echo ""
echo -e "${GREEN}Done! 🎉${NC}"
