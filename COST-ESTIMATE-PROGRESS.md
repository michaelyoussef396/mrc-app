# Cost Estimate Implementation Progress

**Started:** 2025-11-22
**Status:** IN PROGRESS

## Phases

### Phase 1: Refactor Pricing Logic ⏳
- [ ] Update base rates to anchor model (2h/8h)
- [ ] Add hourly rate calculation formula
- [ ] Update labor calculation logic
- [ ] Replace discount logic with hours-based tiers
- [ ] Add 13% cap validation

### Phase 2: Database Migration ⏳
- [ ] Create migration file
- [ ] Apply migration to local database
- [ ] Verify columns exist with query

### Phase 3: TypeScript Interfaces ⏳
- [ ] Update InspectionFormData interface (src/types/inspection.ts)
- [ ] Update InspectionData interface (src/lib/api/inspections.ts)

### Phase 4: Build Section 9 UI ⏳
- [ ] Job type hours inputs (No Demo, Demo, Construction, Subfloor)
- [ ] Equipment inputs (Dehumidifier, Air Mover, RCD, Days)
- [ ] Cost breakdown display (read-only)
- [ ] Manual override toggle with validation
- [ ] 13% cap notice display

### Phase 5: State Management ⏳
- [ ] Add pricing state variable
- [ ] Add handlePricingChange handler
- [ ] Add recalculatePricing function
- [ ] Add validateManualOverride function
- [ ] Add useEffect for auto-recalculation

### Phase 6: Save Logic ⏳
- [ ] Update handleSaveInspection with job type hours
- [ ] Add equipment quantities to save
- [ ] Add calculated values to save
- [ ] Add manual override fields to save

### Phase 7: Load Logic ⏳
- [ ] Update load logic PATH 1 (with areas)
- [ ] Update load logic PATH 2 (without areas)
- [ ] Add recalculation trigger after load

### Phase 8: Validation ⏳
- [ ] Run pricing-guardian agent (48 scenarios)
- [ ] Take Playwright screenshots at 375px
- [ ] Verify database saves with Supabase MCP
- [ ] Run design-review for mobile testing

### Phase 9: Git Commit ⏳
- [ ] Create comprehensive commit message
- [ ] Commit all changes

## Test Results

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| No Demo 2h | $673.20 (inc GST) | | ⏳ |
| No Demo 5h | $1,005.94 (inc GST) | | ⏳ |
| No Demo 8h | $1,338.69 (inc GST) | | ⏳ |
| No Demo 16h (7.5% discount) | $2,476.57 (inc GST) | | ⏳ |
| Demo 8h + Const 16h + Subfloor 5h (12%) | | | ⏳ |
| 40h job (13% cap) | | | ⏳ |

## Checkpoints

### After Phase 2 (Migration):
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'inspections'
AND (column_name LIKE '%demolition%' OR column_name LIKE '%equipment%');
```

### After Phase 7 (Load):
- Navigate to test inspection a06d1d4a-0062-41a4-ba38-e713e5348fbc
- Fill cost estimate fields
- Save
- Reload page
- Verify all values persist

### After Phase 8 (Validation):
- pricing-guardian: 48/48 scenarios MUST PASS
- All screenshots captured at 375px
- Database verification complete

## Notes

- Using base anchor model: 2h min and 8h full day rates
- Hours-based discount tiers (not days-based)
- Manual override enforces 13% cap
- Test inspection ID: a06d1d4a-0062-41a4-ba38-e713e5348fbc

## Agents Used

- [ ] pricing-guardian (Phase 8 validation)
- [ ] supabase-specialist (Phase 2 migration)
- [ ] design-review (Phase 8 mobile testing)
- [ ] error-detective (if issues arise)

## MCP Servers Used

- [ ] Supabase MCP (migration, verification)
- [ ] Playwright MCP (screenshots, testing)
- [ ] Memory MCP (progress storage)
- [ ] GitHub MCP (final commit)

## Issues & Blockers

None yet.
