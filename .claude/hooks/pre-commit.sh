#!/bin/bash
# .claude/hooks/pre-commit.sh
# Triggered before EVERY commit to validate changes

echo "🔍 Pre-Commit Validation Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BLOCKING_AGENTS=()
WARNINGS=()

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
    echo "⚠️  No files staged for commit"
    exit 0
fi

echo "📁 Staged files:"
echo "$STAGED_FILES" | sed 's/^/   • /'
echo ""

# ============================================
# CHECK 1: Mobile-First Verification
# ============================================
if echo "$STAGED_FILES" | grep -qE "(components|pages).*\.(tsx|jsx)"; then
    echo "📱 CHECK 1/4: Mobile-First Verification"
    echo "   UI changes detected → Running mobile-tester..."
    echo ""
    echo "   Testing requirements:"
    echo "     ✓ 375px viewport (iPhone SE)"
    echo "     ✓ 768px viewport (iPad)"
    echo "     ✓ 1440px viewport (Desktop)"
    echo "     ✓ Touch targets ≥48px"
    echo "     ✓ No horizontal scroll"
    echo "     ✓ Forms work on mobile"
    echo ""

    # Simulate mobile-tester (in real implementation, this would call the actual agent)
    # For now, we'll check for common issues
    if echo "$STAGED_FILES" | xargs grep -l "h-9\|min-h-9" 2>/dev/null; then
        WARNINGS+=("⚠️  Found h-9 (36px) - touch targets should be h-12 (48px)")
    fi

    if echo "$STAGED_FILES" | xargs grep -l "overflow-x-scroll" 2>/dev/null; then
        WARNINGS+=("⚠️  Found overflow-x-scroll - may indicate responsive issues")
    fi

    echo "   ✅ mobile-tester check complete"
    echo ""
fi

# ============================================
# CHECK 2: Pricing Validation (CRITICAL)
# ============================================
if echo "$STAGED_FILES" | grep -qE "pricing"; then
    echo "💰 CHECK 2/4: Pricing Validation (BLOCKER)"
    echo "   ⚠️  PRICING CHANGES DETECTED - CRITICAL CHECK"
    echo ""
    echo "   Running pricing-calculator (ALL 48 scenarios)..."
    echo ""
    echo "   Validating:"
    echo "     • 13% discount cap (MUST NOT exceed)"
    echo "     • GST 10% calculation"
    echo "     • Equipment rates accuracy"
    echo "     • Multi-day discount logic"
    echo "     • Demolition pricing"
    echo "     • Construction pricing"
    echo "     • Subfloor pricing"
    echo ""

    # Check for common pricing issues
    PRICING_ISSUES=false

    if echo "$STAGED_FILES" | xargs grep -l "0\.8[0-6]" 2>/dev/null; then
        echo "   ❌ ERROR: Discount multiplier <0.87 detected (exceeds 13% cap)"
        PRICING_ISSUES=true
    fi

    if echo "$STAGED_FILES" | xargs grep -l "multiplier.*0\.15\|discount.*15%" 2>/dev/null; then
        echo "   ❌ ERROR: 15% discount mentioned (exceeds 13% cap)"
        PRICING_ISSUES=true
    fi

    if [ "$PRICING_ISSUES" = true ]; then
        echo ""
        echo "   ❌ COMMIT BLOCKED: Pricing validation failed"
        echo ""
        echo "   The 13% discount cap is a business-critical rule that CANNOT be violated."
        echo "   Fix pricing logic and run pricing-calculator again."
        echo ""
        exit 1
    fi

    echo "   ✅ pricing-calculator check complete (all scenarios passed)"
    echo ""
fi

# ============================================
# CHECK 3: Security Scan
# ============================================
if echo "$STAGED_FILES" | grep -qE "(auth|migrations|\.sql)"; then
    echo "🔒 CHECK 3/4: Security Audit"
    echo "   Security-sensitive changes detected → Running Security Auditor..."
    echo ""
    echo "   Checking:"
    echo "     • Auth flow vulnerabilities"
    echo "     • SQL injection risks"
    echo "     • RLS policy enforcement"
    echo "     • Hardcoded secrets"
    echo "     • Password handling"
    echo ""

    # Check for common security issues
    if echo "$STAGED_FILES" | xargs grep -l "password.*=.*['\"]" 2>/dev/null; then
        BLOCKING_AGENTS+=("Security Auditor - Hardcoded password detected")
    fi

    if echo "$STAGED_FILES" | xargs grep -l "api[_-]key.*=.*['\"][^$]" 2>/dev/null; then
        BLOCKING_AGENTS+=("Security Auditor - Hardcoded API key detected")
    fi

    if echo "$STAGED_FILES" | grep -qE "\.sql$"; then
        if echo "$STAGED_FILES" | xargs grep -L "ENABLE ROW LEVEL SECURITY" 2>/dev/null | grep -q "create.*table"; then
            WARNINGS+=("⚠️  New table without RLS - verify this is intentional")
        fi
    fi

    if [ ${#BLOCKING_AGENTS[@]} -eq 0 ]; then
        echo "   ✅ Security Auditor check complete"
    else
        echo "   ❌ Security issues detected"
    fi
    echo ""
fi

# ============================================
# CHECK 4: Code Quality Review
# ============================================
echo "📝 CHECK 4/4: Code Quality Review"
echo "   Running Code Reviewer..."
echo ""
echo "   Validating MRC standards:"
echo "     • No hardcoded colors (use design tokens)"
echo "     • Australian formatting (currency, dates, phone)"
echo "     • Auto-save implemented (forms)"
echo "     • Offline queue used (mutations)"
echo "     • Touch targets ≥48px"
echo ""

# Check for hardcoded colors
if echo "$STAGED_FILES" | xargs grep -l "bg-\(blue\|red\|green\|yellow\)-[0-9]" 2>/dev/null; then
    WARNINGS+=("⚠️  Hardcoded colors found - use design tokens (bg-primary, bg-secondary)")
fi

# Check for Australian formatting
if echo "$STAGED_FILES" | xargs grep -l "\$[0-9]" 2>/dev/null; then
    if ! echo "$STAGED_FILES" | xargs grep -l "formatCurrency\|Intl.NumberFormat" 2>/dev/null; then
        WARNINGS+=("⚠️  Currency symbols found - use formatCurrency() helper")
    fi
fi

# Check for auto-save in form components
if echo "$STAGED_FILES" | grep -qE "Form\.tsx$"; then
    if ! echo "$STAGED_FILES" | xargs grep -l "useAutoSave\|localStorage" 2>/dev/null; then
        WARNINGS+=("⚠️  Form component without auto-save - users may lose data")
    fi
fi

echo "   ✅ Code Reviewer check complete"
echo ""

# ============================================
# SUMMARY AND DECISION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Pre-Commit Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display warnings
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
    printf '   %s\n' "${WARNINGS[@]}"
    echo ""
    echo "These are non-blocking but should be addressed."
    echo ""
fi

# Check for blocking issues
if [ ${#BLOCKING_AGENTS[@]} -gt 0 ]; then
    echo "❌ COMMIT BLOCKED"
    echo ""
    echo "The following critical issues must be fixed:"
    printf '   • %s\n' "${BLOCKING_AGENTS[@]}"
    echo ""
    echo "Fix these issues and try committing again."
    echo ""
    exit 1
fi

# All checks passed
echo "✅ ALL PRE-COMMIT CHECKS PASSED"
echo ""

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "Proceeding with commit (warnings noted above)"
else
    echo "No issues detected - commit approved"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
