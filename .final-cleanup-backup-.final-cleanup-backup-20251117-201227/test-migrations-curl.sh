#!/bin/bash

# Phase 2F Migration Pre-Flight Tests
# Using Supabase REST API

SUPABASE_URL="https://faxkjrhunqddjomfkakb.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGtqcmh1bnFkZGpvbWZrYWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDExMjExNCwiZXhwIjoyMDQ1Njg4MTE0fQ.NZ_dUwggHfhEkwfJsJk3yTnO5kM5KhBwP_t66bfR-N0"

echo "================================================================================"
echo "           PRE-FLIGHT VERIFICATION CHECKS FOR PHASE 2F MIGRATIONS"
echo "================================================================================"
echo ""

# Check 1: Verify inspections table exists
echo "Check 1: Verify tables exist before renaming"
echo -n "  Testing 'inspections' table... "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/inspections?select=id&limit=0" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (HTTP $HTTP_CODE)"
fi

echo -n "  Testing 'calendar_events' table... "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/calendar_events?select=id&limit=0" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (HTTP $HTTP_CODE)"
fi
echo ""

# Check 2: Count rows
echo "Check 2: Count rows to ensure data preservation"
echo -n "  Inspections count: "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Prefer: count=exact" \
  "$SUPABASE_URL/rest/v1/inspections?select=id&limit=0" 2>&1)

COUNT=$(echo "$RESPONSE" | sed -n 's/.*content-range: [^\/]*\/\([0-9]*\).*/\1/p')
echo "${COUNT:-0}"

echo -n "  Calendar events count: "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Prefer: count=exact" \
  "$SUPABASE_URL/rest/v1/calendar_events?select=id&limit=0" 2>&1)

COUNT=$(echo "$RESPONSE" | sed -n 's/.*content-range: [^\/]*\/\([0-9]*\).*/\1/p')
echo "${COUNT:-0}"
echo ""

# Check 3: Check for NULL values
echo "Check 3: Check for NULL values that would break constraints"
echo -n "  NULL inspector_id in inspections: "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Prefer: count=exact" \
  "$SUPABASE_URL/rest/v1/inspections?select=id&inspector_id=is.null&limit=0" 2>&1)

COUNT=$(echo "$RESPONSE" | sed -n 's/.*content-range: [^\/]*\/\([0-9]*\).*/\1/p')
echo "${COUNT:-0}"

echo -n "  NULL assigned_to in calendar_events: "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Prefer: count=exact" \
  "$SUPABASE_URL/rest/v1/calendar_events?select=id&assigned_to=is.null&limit=0" 2>&1)

COUNT=$(echo "$RESPONSE" | sed -n 's/.*content-range: [^\/]*\/\([0-9]*\).*/\1/p')
echo "${COUNT:-0}"
echo ""

# Check 4: Verify new table names don't exist
echo "Check 4: Verify new table names do not already exist"
echo -n "  Testing 'inspection_reports' table (should not exist)... "
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/inspection_reports?select=id&limit=0" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "404" ] || echo "$RESPONSE" | grep -q "relation.*does not exist"; then
  echo "✅ PASS (table does not exist)"
else
  echo "❌ FAIL (table exists - HTTP $HTTP_CODE)"
fi

echo -n "  Testing 'calendar_bookings' table (should not exist)... "
RESPONSE=$(curl -s -w "\n%{http_CODE}" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/calendar_bookings?select=id&limit=0" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "404" ] || echo "$RESPONSE" | grep -q "relation.*does not exist"; then
  echo "✅ PASS (table does not exist)"
else
  echo "❌ FAIL (table exists - HTTP $HTTP_CODE)"
fi
echo ""

echo "================================================================================"
echo "                         PRE-FLIGHT CHECKS COMPLETE"
echo "================================================================================"
echo ""
echo "MIGRATION FILES READY:"
echo "  1. supabase/migrations/20251111000016_rename_tables_to_match_spec.sql"
echo "  2. supabase/migrations/20251111000017_add_missing_constraints.sql"
echo "  3. supabase/migrations/20251111000018_remove_duplicate_indexes.sql"
echo "  4. supabase/migrations/20251111000019_add_missing_composite_indexes.sql"
echo ""
echo "TO APPLY MIGRATIONS:"
echo "  Method 1 (CLI): npx supabase db push"
echo "  Method 2 (Dashboard): https://supabase.com/dashboard/project/faxkjrhunqddjomfkakb/sql"
echo ""
