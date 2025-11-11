import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://faxkjrhunqddjomfkakb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheGtqcmh1bnFkZGpvbWZrYWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDExMjExNCwiZXhwIjoyMDQ1Njg4MTE0fQ.NZ_dUwggHfhEkwfJsJk3yTnO5kM5KhBwP_t66bfR-N0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function runPreFlightChecks() {
  console.log('='.repeat(80));
  console.log('PRE-FLIGHT VERIFICATION CHECKS FOR PHASE 2F MIGRATIONS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Check 1: Verify tables exist before renaming
    console.log('Check 1: Verify tables exist before renaming');

    const { data: inspections, error: e2 } = await supabase.from('inspections').select('id', { count: 'exact', head: true });
    const { data: calendarEvents, error: e3 } = await supabase.from('calendar_events').select('id', { count: 'exact', head: true });

    let check1Pass = true;
    if (e2 && e2.message.includes('does not exist')) {
      console.log('  ❌ FAIL: inspections table does not exist');
      check1Pass = false;
    } else if (!e2) {
      console.log('  ✅ PASS: inspections table exists');
    } else {
      console.log('  ⚠️  ERROR checking inspections:', e2.message);
      check1Pass = false;
    }

    if (e3 && e3.message.includes('does not exist')) {
      console.log('  ❌ FAIL: calendar_events table does not exist');
      check1Pass = false;
    } else if (!e3) {
      console.log('  ✅ PASS: calendar_events table exists');
    } else {
      console.log('  ⚠️  ERROR checking calendar_events:', e3.message);
      check1Pass = false;
    }
    console.log('');

    // Check 2: Count rows
    console.log('Check 2: Count rows to ensure data preservation');
    const { count: inspectionsCount, error: e4 } = await supabase.from('inspections').select('*', { count: 'exact', head: true });
    const { count: eventsCount, error: e5 } = await supabase.from('calendar_events').select('*', { count: 'exact', head: true });

    console.log('  Inspections count: ' + (inspectionsCount || 0));
    console.log('  Calendar events count: ' + (eventsCount || 0));
    console.log('');

    // Check 3: Check for NULL values in critical columns
    console.log('Check 3: Check for NULL values that would break constraints');
    const { data: nullInspectorIds, error: e6 } = await supabase
      .from('inspections')
      .select('id')
      .is('inspector_id', null);

    const { data: nullAssignedTo, error: e7 } = await supabase
      .from('calendar_events')
      .select('id')
      .is('assigned_to', null);

    const nullInspectorCount = nullInspectorIds ? nullInspectorIds.length : 0;
    const nullAssignedCount = nullAssignedTo ? nullAssignedTo.length : 0;

    console.log('  NULL inspector_id in inspections: ' + nullInspectorCount);
    console.log('  NULL assigned_to in calendar_events: ' + nullAssignedCount);

    let check3Pass = true;
    if (nullInspectorCount > 0 || nullAssignedCount > 0) {
      console.log('  ⚠️  WARNING: NULL values found that may cause constraints to fail');
      check3Pass = false;
    } else {
      console.log('  ✅ PASS: No NULL values in critical columns');
    }
    console.log('');

    // Check 4: Verify new table names don't already exist
    console.log('Check 4: Verify new table names do not already exist');
    const { data: inspectionReports, error: e8 } = await supabase.from('inspection_reports').select('id', { head: true });
    const { data: calendarBookings, error: e9 } = await supabase.from('calendar_bookings').select('id', { head: true });

    let check4Pass = true;
    if (e8 && e8.message.includes('does not exist')) {
      console.log('  ✅ PASS: inspection_reports table does not exist (safe to create)');
    } else {
      console.log('  ❌ FAIL: inspection_reports table already exists');
      check4Pass = false;
    }

    if (e9 && e9.message.includes('does not exist')) {
      console.log('  ✅ PASS: calendar_bookings table does not exist (safe to create)');
    } else {
      console.log('  ❌ FAIL: calendar_bookings table already exists');
      check4Pass = false;
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('PRE-FLIGHT CHECKS COMPLETE');
    console.log('='.repeat(80));
    console.log('');

    // Determine if safe to proceed
    const safeToProc = check1Pass && check3Pass && check4Pass;

    if (safeToProc) {
      console.log('✅ ALL PRE-FLIGHT CHECKS PASSED - SAFE TO PROCEED WITH MIGRATIONS');
      return true;
    } else {
      console.log('❌ SOME PRE-FLIGHT CHECKS FAILED - REVIEW ISSUES BEFORE PROCEEDING');
      return false;
    }

  } catch (error) {
    console.error('❌ Error running pre-flight checks:', error.message);
    return false;
  }
}

async function applyMigration(migrationPath, migrationName) {
  console.log('');
  console.log('='.repeat(80));
  console.log(`APPLYING MIGRATION: ${migrationName}`);
  console.log('='.repeat(80));

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into statements and execute
    // Note: This is a simplified approach - production would use proper migration tool
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ FAILED: ${error.message}`);
      return false;
    }

    console.log(`✅ SUCCESS: ${migrationName} applied successfully`);
    return true;

  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    return false;
  }
}

async function verifyPostMigration() {
  console.log('');
  console.log('='.repeat(80));
  console.log('POST-MIGRATION VERIFICATION');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Verify new tables exist
    console.log('Verifying new tables exist...');
    const { data: inspectionReports, error: e1 } = await supabase.from('inspection_reports').select('id', { count: 'exact', head: true });
    const { data: calendarBookings, error: e2 } = await supabase.from('calendar_bookings').select('id', { count: 'exact', head: true });

    if (!e1) {
      console.log('  ✅ inspection_reports table exists');
    } else {
      console.log('  ❌ inspection_reports table missing:', e1.message);
    }

    if (!e2) {
      console.log('  ✅ calendar_bookings table exists');
    } else {
      console.log('  ❌ calendar_bookings table missing:', e2.message);
    }

    // Verify old tables removed
    console.log('');
    console.log('Verifying old tables removed...');
    const { data: inspections, error: e3 } = await supabase.from('inspections').select('id', { head: true });
    const { data: calendarEvents, error: e4 } = await supabase.from('calendar_events').select('id', { head: true });

    if (e3 && e3.message.includes('does not exist')) {
      console.log('  ✅ inspections table removed');
    } else {
      console.log('  ❌ inspections table still exists');
    }

    if (e4 && e4.message.includes('does not exist')) {
      console.log('  ✅ calendar_events table removed');
    } else {
      console.log('  ❌ calendar_events table still exists');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║          PHASE 2F MIGRATION TESTING - SUPABASE DATABASE                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Run pre-flight checks
  const preFlightPass = await runPreFlightChecks();

  if (!preFlightPass) {
    console.log('');
    console.log('⚠️  PRE-FLIGHT CHECKS FAILED - ABORTING MIGRATION TEST');
    console.log('');
    console.log('NOTE: Migrations can only be applied via Supabase Dashboard or CLI');
    console.log('      This script validates readiness but cannot execute migrations directly');
    console.log('');
    console.log('To apply migrations manually:');
    console.log('  1. Log into Supabase Dashboard: https://supabase.com/dashboard');
    console.log('  2. Navigate to SQL Editor');
    console.log('  3. Copy and paste migration SQL');
    console.log('  4. Execute in order: 016 → 017 → 018 → 019');
    process.exit(1);
  }

  console.log('');
  console.log('✅ ALL PRE-FLIGHT CHECKS PASSED');
  console.log('');
  console.log('READY TO PROCEED WITH MIGRATIONS');
  console.log('');
  console.log('Migration files ready:');
  console.log('  1. 20251111000016_rename_tables_to_match_spec.sql');
  console.log('  2. 20251111000017_add_missing_constraints.sql');
  console.log('  3. 20251111000018_remove_duplicate_indexes.sql');
  console.log('  4. 20251111000019_add_missing_composite_indexes.sql');
  console.log('');
  console.log('NOTE: To apply these migrations, use one of the following methods:');
  console.log('');
  console.log('METHOD 1 - Supabase CLI (Recommended):');
  console.log('  cd /Users/michaelyoussef/MRC_MAIN/mrc-app');
  console.log('  npx supabase db push');
  console.log('');
  console.log('METHOD 2 - Supabase Dashboard:');
  console.log('  1. Open: https://supabase.com/dashboard/project/faxkjrhunqddjomfkakb/sql');
  console.log('  2. Copy SQL from each migration file');
  console.log('  3. Execute in order');
  console.log('');
}

main();
