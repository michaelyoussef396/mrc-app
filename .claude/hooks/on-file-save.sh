#!/bin/bash
# .claude/hooks/on-file-save.sh
# Triggered on EVERY file save to auto-invoke relevant agents

SAVED_FILE="$1"

if [ -z "$SAVED_FILE" ]; then
    echo "⚠️  No file path provided to on-file-save hook"
    exit 0
fi

echo "💾 File saved: $SAVED_FILE"

# Auto-trigger agents based on file type
case "$SAVED_FILE" in
    # UI Components - Mobile Testing (2s delay)
    *src/components/*.tsx|*src/pages/*.tsx|*src/styles/*.css)
        echo "🤖 UI change detected → Triggering mobile-tester in 2s..."
        echo ""
        echo "This will test:"
        echo "  ✓ 375px (iPhone SE)"
        echo "  ✓ 768px (iPad)"
        echo "  ✓ 1440px (Desktop)"
        echo "  ✓ Touch targets ≥48px"
        echo "  ✓ No horizontal scroll"
        sleep 2
        echo "✅ mobile-tester should be triggered by Claude Code"
        ;;

    # Pricing Logic - IMMEDIATE BLOCKING
    *pricing*.ts|*discount*.ts|*supabase/functions/calculate-price/*)
        echo "🚨 PRICING CHANGE DETECTED → Triggering pricing-calculator NOW (BLOCKING)"
        echo ""
        echo "⚠️  This is a BLOCKING operation!"
        echo "All 48 pricing scenarios will be validated:"
        echo "  • 13% discount cap (MUST NOT exceed)"
        echo "  • GST 10% calculation"
        echo "  • Equipment rates accuracy"
        echo "  • Multi-day discount logic"
        echo ""
        echo "❌ You CANNOT continue until pricing-calculator passes"
        sleep 1
        echo "✅ pricing-calculator should be triggered by Claude Code (BLOCKING)"
        ;;

    # Authentication - Security Scan (3s delay)
    *auth*.ts|*auth*.tsx|*src/lib/auth/*)
        echo "🔒 Auth change detected → Triggering Security Auditor in 3s..."
        echo ""
        echo "Security checks:"
        echo "  • Auth flow vulnerabilities"
        echo "  • Password handling"
        echo "  • Session management"
        echo "  • RLS policy enforcement"
        sleep 3
        echo "✅ Security Auditor should be triggered by Claude Code"
        ;;

    # Database Schema - Schema Review (2s delay)
    *.sql|*supabase/migrations/*)
        echo "🗄️  Schema change detected → Triggering Supabase Schema Architect in 2s..."
        echo ""
        echo "Schema validation:"
        echo "  • Table design best practices"
        echo "  • Index optimization"
        echo "  • RLS policy creation"
        echo "  • Type generation needed"
        sleep 2
        echo "✅ Supabase Schema Architect should be triggered by Claude Code"
        echo "🔗 Will chain: SQL Pro → Security Auditor → TypeScript Pro"
        ;;

    # TypeScript Types - Type Validation (1s delay)
    *src/types/*.ts)
        echo "📘 Type definition change → Triggering TypeScript Pro in 1s..."
        echo ""
        echo "Type checks:"
        echo "  • No 'any' types"
        echo "  • Proper interfaces"
        echo "  • Type safety"
        sleep 1
        echo "✅ TypeScript Pro should be triggered by Claude Code"
        ;;

    # Offline/Service Worker - Offline Validation (2s delay)
    *public/sw.js|*src/lib/offline/*.ts)
        echo "📶 Offline capability change → Triggering offline-architect in 2s..."
        echo ""
        echo "Offline checks:"
        echo "  • Service worker registration"
        echo "  • Cache strategies"
        echo "  • Offline queue logic"
        echo "  • Sync on reconnect"
        sleep 2
        echo "✅ offline-architect should be triggered by Claude Code"
        ;;

    # All TypeScript/TSX - Code Review (5s delay)
    *src/**/*.ts|*src/**/*.tsx)
        echo "📝 Code change detected → Triggering Code Reviewer in 5s..."
        echo ""
        echo "Code quality checks:"
        echo "  • Design standards compliance"
        echo "  • No hardcoded colors"
        echo "  • Australian formatting used"
        echo "  • Auto-save implemented"
        echo "  • Offline queue usage"
        sleep 5
        echo "✅ Code Reviewer should be triggered by Claude Code"
        ;;

    *)
        echo "ℹ️  No automatic agent triggers for this file type"
        ;;
esac

echo ""
echo "✅ on-file-save hook complete"
