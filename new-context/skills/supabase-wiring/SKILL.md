# Supabase Wiring Skill

## Purpose
Replace mock/hardcoded data in React components with real Supabase queries.

## When to Use
- Component has mock data (arrays, hardcoded values)
- Need to wire a dashboard/list to real database
- MASTER-TODO says "mock data" for a component

## Inputs
- Component file path (e.g., `src/pages/TechnicianDashboard.tsx`)
- Target Supabase table (e.g., `calendar_bookings`)
- Filter requirements (e.g., `technician_id = current user`)

## Process

### Step 1: Identify Mock Data
```bash
grep -n "mock\|Mock\|MOCK\|hardcoded" <component_path>
grep -n "const.*=.*\[" <component_path>  # Find hardcoded arrays
```

### Step 2: Check for Existing Hook
```bash
ls src/hooks/
grep -l "<table_name>" src/hooks/*.ts
```

### Step 3: Create or Reuse Hook
If no hook exists, create one following this pattern:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function use<Name>(userId: string) {
  return useQuery({
    queryKey: ['<key>', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('<table>')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

### Step 4: Replace Mock Data in Component
```typescript
// Before
const mockData = [{ id: '1', ... }];

// After
const { data, isLoading, error } = useHookName(user.id);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error.message} />;
if (!data?.length) return <EmptyState />;
```

### Step 5: Verify
- [ ] No `mock`, `Mock`, `MOCK` in file
- [ ] No hardcoded arrays
- [ ] Loading state works
- [ ] Error state works
- [ ] Empty state works
- [ ] Data displays correctly
- [ ] Works at 375px viewport

## Output
- Updated component using real Supabase data
- New hook file if created
- Verified working at 375px

## Edge Cases
- **RLS blocking data:** Check RLS policies allow access for user's role
- **No data in table:** Ensure empty state shows, seed test data if needed
- **Slow queries:** Add loading state, consider pagination for large datasets

## Examples
See `skills/supabase-wiring/examples/` for before/after examples.
