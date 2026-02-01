

# Fix "new row violates RLS policy for trips" on Create Trip

## Problem Analysis

The error occurs because of how PostgreSQL RLS interacts with `INSERT ... RETURNING`:

1. When the app inserts a trip with `.select('id, name, join_code')`, PostgreSQL evaluates **both** the INSERT policy AND the SELECT policy
2. The INSERT policy passes: `auth.uid() = created_by`
3. The SELECT policy fails: `is_trip_member(id, auth.uid())` returns `false` because the trigger that creates the `trip_members` row runs **AFTER** the insert, but `RETURNING` needs the SELECT policy to pass **during** the insert

### Technical Detail
The `on_trip_created` trigger is an AFTER INSERT trigger that adds the creator to `trip_members`. But RLS for `RETURNING` is evaluated before the trigger completes/commits.

---

## Solution: Add Creator SELECT Policy

Add an additional SELECT policy that allows the **trip creator** to view their trip immediately, without needing to be in `trip_members` first.

### Database Migration

```sql
-- Add policy allowing trip creator to view their own trip
-- This enables INSERT ... RETURNING to work properly
-- since the trigger hasn't run yet at RETURNING evaluation time
CREATE POLICY "Creator can view own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);
```

This policy works alongside the existing "Members can view trips" policy. Since both are PERMISSIVE, either one passing allows SELECT access.

---

## Why This Works

```text
INSERT with RETURNING Flow:
┌─────────────────────────────────────────────────────────────────┐
│ 1. INSERT row with created_by = auth.uid()                      │
│    → INSERT policy "Users can create their own trips"           │
│    → CHECK: auth.uid() = created_by ✓                           │
├─────────────────────────────────────────────────────────────────┤
│ 2. RETURNING clause evaluates SELECT policies                   │
│    → Policy 1: is_trip_member(id, auth.uid()) ✗ (no member yet) │
│    → Policy 2: auth.uid() = created_by ✓  ← NEW POLICY          │
│    → At least one PERMISSIVE policy passes → SELECT allowed     │
├─────────────────────────────────────────────────────────────────┤
│ 3. AFTER INSERT trigger runs                                    │
│    → handle_new_trip() inserts trip_members row with role=owner │
├─────────────────────────────────────────────────────────────────┤
│ 4. Transaction commits                                          │
│    → Now is_trip_member() also returns true                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_fix_trip_rls_select.sql` | Create | Add new SELECT policy for creator |

---

## Code Review

The existing `src/pages/CreateTrip.tsx` code is **already correct**:

```typescript
// Line 75-95: Already includes created_by: user.id
const handleCreateTrip = async () => {
  if (!user) return;  // ✓ Checks for authenticated user
  
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      name: name.trim(),
      created_by: user.id,  // ✓ Correctly sets creator
      // ... other fields
    })
    .select('id, name, join_code')
    .single();
```

No code changes needed - the fix is purely database-side.

---

## Acceptance Criteria

After applying the migration:

1. Logged-in user navigates to `/app/create`
2. Enters trip name (minimum 3 characters)
3. Clicks "Continue" button
4. Trip is created successfully without RLS errors
5. User is automatically added as owner in `trip_members` (via trigger)
6. User proceeds to the Invite step with join code visible
7. User can navigate to trip chat
8. Refreshing the page still shows the trip (membership-based SELECT works)
9. Non-members still cannot see the trip (original policy still enforced)

---

## Summary

| Current State | Issue |
|---------------|-------|
| INSERT policy works | `auth.uid() = created_by` passes |
| SELECT policy fails on RETURNING | `is_trip_member()` returns false before trigger |

| Solution | Effect |
|----------|--------|
| Add creator SELECT policy | `auth.uid() = created_by` allows RETURNING |
| Keep member SELECT policy | Non-creators still need membership |
| Both are PERMISSIVE | Either passing allows access |

