
# Fix "Failed to Load Trips" and Notifications Errors

## Root Cause Analysis

I found the exact errors from the console logs:

### Error 1: Dashboard Trips Query
```
"Could not embed because more than one relationship was found for 'trips' and 'trip_proposals'"
```

**Cause:** There are two foreign key relationships between `trips` and `trip_proposals`:
1. `trip_proposals.trip_id → trips.id` (FK: `trip_proposals_trip_id_fkey`)
2. `trips.pinned_proposal_id → trip_proposals.id` (FK: `trips_pinned_proposal_fkey`)

Supabase/PostgREST can't determine which relationship to use for the embedded query.

### Error 2: Notifications Query
```
"Could not find a relationship between 'notifications' and 'profiles'"
```

**Cause:** The notifications table has no foreign key constraint from `actor_id` to `profiles.id`. The only FK on notifications is `trip_id → trips.id`.

---

## Solution

### 1. Fix Dashboard Trips Query

**File:** `src/pages/Dashboard.tsx`

The current query:
```typescript
.select(`
  *,
  trip_members(count),
  trip_proposals(count)
`)
```

**Fixed query** - explicitly specify the foreign key:
```typescript
.select(`
  *,
  trip_members(count),
  trip_proposals!trip_proposals_trip_id_fkey(count)
`)
```

The `!trip_proposals_trip_id_fkey` syntax tells PostgREST which foreign key relationship to use.

### 2. Add Better Error Logging

**File:** `src/pages/Dashboard.tsx`

Enhance the error handling to show specific error details:

```typescript
catch (err: any) {
  const errorMessage = err?.message || 'Unknown error';
  const errorCode = err?.code || '';
  console.error('Error fetching trips:', { message: errorMessage, code: errorCode, details: err });
  setError(`Failed to load trips: ${errorMessage}`);
  toast.error(`Failed to load trips: ${errorMessage}`);
}
```

### 3. Fix Notifications Query (Two Options)

**Option A - Add Foreign Key (Database Migration)**

Add a proper FK constraint from `notifications.actor_id` to `profiles.id`.

```sql
ALTER TABLE notifications 
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
```

**Option B - Fetch Actor Separately (Code Fix)**

Remove the embedded join and fetch actor profiles in a separate query. This is more robust.

**Recommended:** Option A (add the FK), as the current design clearly intends `actor_id` to reference a profile.

---

## Changes Summary

### File: `src/pages/Dashboard.tsx`

| Line | Change |
|------|--------|
| 84-88 | Fix ambiguous `trip_proposals` join by specifying FK |
| 128-131 | Add detailed error logging with error code/message |

### Database Migration

Add missing foreign key on notifications table for actor_id → profiles.id

---

## Technical Details

### Why This Fixes It

```text
Before (ambiguous):
trips ←─────┐
  │         │ trip_proposals_trip_id_fkey
  │         │
  ├─────────┤ trip_proposals (two paths!)
  │         │
  │         │ trips_pinned_proposal_fkey
  └─────────┘

After (explicit):
trips ←── trip_proposals!trip_proposals_trip_id_fkey (one path)
```

### Database Relationships After Fix

```text
notifications
├── trip_id → trips.id (existing)
└── actor_id → profiles.id (add this FK)

trip_proposals
├── trip_id → trips.id (use this with !trip_proposals_trip_id_fkey)
└── created_by → profiles.id

trips
└── pinned_proposal_id → trip_proposals.id (separate relationship)
```

---

## Acceptance Criteria

1. Dashboard no longer shows "Failed to load trips"
2. Trips load with correct member and proposal counts
3. Notifications load without error
4. Console shows detailed error info if something fails
5. Toast shows helpful error message to user
6. Newly created trips appear immediately in "Your Trips"
7. Trips persist after page refresh
8. Trips persist after logout/login
