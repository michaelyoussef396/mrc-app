# TODO Sync Skill

## Purpose
Keep MASTER-TODO.md accurate by verifying claims against actual code.

## When to Use
- After completing any task
- When code state seems to contradict TODO
- During weekly documentation review
- Before deployment

## Why This Matters
MASTER-TODO.md is the source of truth. If it says "complete" but code has mock data, the whole team is misled.

## Process

### Step 1: Identify Claim to Verify
Example claim from MASTER-TODO.md:
```
| TechnicianDashboard | ✅ Complete | Wired to calendar_bookings |
```

### Step 2: Verify Against Code
```bash
# Check for mock data
grep -n "mock\|Mock\|MOCK" src/pages/TechnicianDashboard.tsx

# Check what data source is used
grep -n "useQuery\|supabase\|fetch" src/pages/TechnicianDashboard.tsx

# Check imports
head -50 src/pages/TechnicianDashboard.tsx
```

### Step 3: Determine Actual State
- ✅ Complete = Works fully, real data, tested
- 🟡 Partial = UI done but mock data, or has known bugs
- ❌ Not Working = Broken or not built
- ⬜ TODO = Not started

### Step 4: Update MASTER-TODO.md
If claim doesn't match reality, update it:
```markdown
# Before (incorrect)
| TechnicianDashboard | ✅ Complete | Wired to calendar_bookings |

# After (correct)
| TechnicianDashboard | 🟡 Partial | Uses mockJobs (line 15), needs wiring |
```

### Step 5: Log the Discrepancy
Add to learnings section:
```markdown
## Learnings Log
- 2025-02-07: TechnicianDashboard claimed "complete" but used mock data. Always grep for 'mock' before marking complete.
```

## Verification Commands

### Check for Mock Data
```bash
grep -rn "mock\|Mock\|MOCK" src/pages/
grep -rn "hardcoded\|TODO\|FIXME" src/pages/
```

### Check Hook Data Sources
```bash
grep -l "supabase" src/hooks/*.ts  # Real data
grep -L "supabase" src/hooks/*.ts  # NOT using Supabase (suspicious)
```

### Compare TODO vs Reality
```bash
# List all pages
ls src/pages/*.tsx

# For each, check if it uses real data
for f in src/pages/*.tsx; do
  echo "=== $f ==="
  grep -c "mock\|Mock" "$f" && echo "HAS MOCK DATA"
done
```

## Output
- Updated MASTER-TODO.md with accurate status
- List of discrepancies found
- Learnings added to log
