
# Invite Flow & Member Removal System

Complete implementation for seamless invite handling across auth states and owner-controlled member management.

---

## Overview

This plan implements:
1. A canonical `/invite/:code` route that handles all auth/onboarding states
2. Member removal with `status` tracking (active/removed)
3. Owner controls to eject members from the trip
4. Access enforcement everywhere based on membership status

---

## Architecture

```text
Invite Flow (3 scenarios):
┌──────────────────────────────────────────────────────────────────────────────┐
│  User clicks /invite/ABC123                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐│
│  │ Not logged in  │    │ Logged in, no   │    │ Logged in + profile complete ││
│  │                │    │ complete profile│    │                             ││
│  └───────┬────────┘    └────────┬────────┘    └──────────────┬──────────────┘│
│          │                      │                            │               │
│          ▼                      ▼                            ▼               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐│
│  │ Save pending     │  │ Save pending     │  │ Check existing membership:   ││
│  │ invite code      │  │ invite code      │  │ - None → Create + redirect   ││
│  │ → Redirect /auth │  │ → Redirect       │  │ - Active → Redirect to trip  ││
│  │                  │  │ /app/profile     │  │ - Removed → Show "removed"   ││
│  └──────────────────┘  └──────────────────┘  └──────────────────────────────┘│
│          │                      │                                            │
│          └──────────────────────┴────────────────────────────────────────────┤
│                                  ▼                                           │
│          After auth/profile complete → Resume at /invite/:code               │
└──────────────────────────────────────────────────────────────────────────────┘

Member Removal Flow:
┌─────────────────────────────────────────────────────────────────┐
│  TripPanel (Owner View)                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Members (3)                                [Invite]      │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 👤 Alice (you)  👑 Owner                           │  │  │
│  │  │ 👤 Bob          Member           [⋯] → Remove      │  │  │
│  │  │ 👤 Carol        Member           [⋯] → Remove      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ (on Remove click)
┌─────────────────────────────────────────────────────────────────┐
│  RemoveMemberDialog                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Remove Bob from trip?                                    │  │
│  │                                                           │  │
│  │  They'll lose access to this trip's chat and proposals.  │  │
│  │                                                           │  │
│  │  [Cancel]                              [Remove Member]    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
          UPDATE trip_members SET status='removed', removed_at=now()
```

---

## Database Changes

### Migration: Add status tracking to trip_members

```sql
-- Create status enum for membership
CREATE TYPE member_status AS ENUM ('active', 'removed');

-- Add columns to trip_members
ALTER TABLE trip_members 
  ADD COLUMN status member_status NOT NULL DEFAULT 'active',
  ADD COLUMN removed_at timestamptz,
  ADD COLUMN removed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX idx_trip_members_status ON trip_members(trip_id, status);
```

### Update RLS Policies

The existing policies use `is_trip_member()` function. We need to update this function to only consider `status = 'active'` members:

```sql
-- Update the is_trip_member function to check status
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid 
      AND user_id = user_uuid
      AND status = 'active'
  );
$$;
```

This single function change will automatically enforce access control across all existing RLS policies.

---

## Code Changes

### 1. Rename Route: `/join/:code` → `/invite/:code`

**File:** `src/App.tsx`

Change the route from `/join/:code` to `/invite/:code` for the canonical invite URL format. Keep `/join/:code` as an alias for backwards compatibility.

```text
Routes:
├── /invite/:code → InvitePage (new component)
├── /join/:code → Redirect to /invite/:code (backwards compat)
└── /app/join → JoinTrip (manual code entry)
```

### 2. Create New InvitePage Component

**File:** `src/pages/InvitePage.tsx` (new)

This component handles the complete invite flow with proper state machine:

```text
States:
├── loading: Fetching trip by code
├── invalid: Trip not found or code invalid
├── auth_required: User not logged in → show auth prompt, store pending
├── profile_required: User logged in but profile incomplete → redirect
├── checking_membership: Checking existing membership status
├── removed: User was previously removed → show message
├── joining: Creating membership
├── success: Redirect to trip
└── already_member: Redirect to trip immediately
```

Key logic:
- Use `useProfileComplete()` hook to check profile status
- Store `pending_invite_code` in localStorage (more persistent than sessionStorage)
- After checking auth/profile, look up existing membership
- If `status = 'removed'`, show "You've been removed" message
- If no membership, create one with `status = 'active'`

### 3. Update Auth Flow to Resume Invites

**File:** `src/pages/Auth.tsx`

After successful login, check for `pending_invite_code` in localStorage and redirect to `/invite/:code`:

```text
useEffect on user login:
├── Check localStorage.getItem('pending_invite_code')
├── If exists: navigate to /invite/{code}, remove from storage
└── If not: navigate to default destination
```

### 4. Update ProfileGate to Handle Invite Flow

**File:** `src/components/ProfileGate.tsx`

When redirecting to profile page, preserve the invite code:

```text
If !isComplete:
├── Check for pending invite code
├── Include in redirect: /app/profile?next=/invite/{code}
└── After profile save → resume at invite
```

### 5. Update Profile Page to Resume Flow

**File:** `src/pages/Profile.tsx`

After profile save, if `next` param points to invite, go there.

### 6. Create RemoveMemberDialog Component

**File:** `src/components/trip/RemoveMemberDialog.tsx` (new)

Simple confirmation dialog:

```text
Props:
├── open: boolean
├── onClose: () => void
├── memberName: string
├── onConfirm: () => void
└── loading: boolean
```

### 7. Update TripPanel with Member Management

**File:** `src/components/trip/TripPanel.tsx`

Add kebab menu to each member row (for owner only):

```text
Changes:
├── Add onRemoveMember prop
├── For each member (except owner themselves):
│   └── Show dropdown menu with "Remove from trip" option
├── Only visible when isOwner = true
└── Show role badges (Owner, Admin, Member)
```

### 8. Update TripChat Page

**File:** `src/pages/TripChat.tsx`

Add member removal handling and access verification:

```text
Changes:
├── Add state: removeMemberModalOpen, memberToRemove, removeLoading
├── Add handleRemoveMember function:
│   ├── Update trip_members: status='removed', removed_at, removed_by
│   └── Refetch members after removal
├── Pass onRemoveMember to TripPanel
├── Render RemoveMemberDialog
└── Check currentMember.status on load (redirect if removed)
```

### 9. Update useTripData Hook

**File:** `src/hooks/useTripData.ts`

Filter members query to only return active members:

```text
// In members query
.from('trip_members')
.select('*, profile:profiles(*)')
.eq('trip_id', tripId)
.eq('status', 'active')  // Add this filter
```

### 10. Update Dashboard Query

**File:** `src/pages/Dashboard.tsx`

The existing query relies on RLS (`is_trip_member`), which will now automatically exclude removed members since we're updating the function. No code changes needed.

### 11. Update JoinTrip Page

**File:** `src/pages/JoinTrip.tsx`

Check membership status when joining:

```text
Changes:
├── After finding trip by code:
│   ├── Check for existing membership (any status)
│   ├── If status = 'active' → redirect to trip
│   ├── If status = 'removed' → show "You've been removed" message
│   └── If none → create membership
```

---

## Technical Details

### localStorage Keys

| Key | Purpose | Cleared |
|-----|---------|---------|
| `pending_invite_code` | Store invite code during auth/onboarding | After successful join |

### Membership Status Transitions

```text
(none) ────────────────────────> active (user joins)
                                    │
                                    │ owner removes
                                    ▼
                                 removed
                                    │
                                    │ owner re-adds (optional)
                                    ▼
                                  active
```

For MVP, removed members cannot rejoin via invite link - owner must explicitly re-add them. This prevents harassment scenarios.

### Access Check Pattern

Every trip-scoped query will be protected by the updated `is_trip_member()` function:

```sql
-- This function now checks status = 'active'
is_trip_member(trip_id, auth.uid())
```

### Real-time Kick Detection

If a member is removed while viewing the trip:
- Next data refetch will fail (RLS denies access)
- `useTripData` hook catches error
- Redirect to dashboard with toast

---

## Files Summary

| File | Change |
|------|--------|
| `supabase/migrations/XXXXXXX_add_member_status.sql` | Add status, removed_at, removed_by columns + update function |
| `src/App.tsx` | Add /invite/:code route, redirect /join/:code |
| `src/pages/InvitePage.tsx` | New - Complete invite flow handler |
| `src/pages/Auth.tsx` | Resume invite after login |
| `src/pages/JoinTrip.tsx` | Check for removed status |
| `src/pages/TripChat.tsx` | Add member removal handling |
| `src/components/trip/TripPanel.tsx` | Add member management UI |
| `src/components/trip/RemoveMemberDialog.tsx` | New - Removal confirmation |
| `src/hooks/useTripData.ts` | Filter by status = 'active' |
| `src/lib/tripchat-types.ts` | Add MemberStatus type |

---

## Acceptance Criteria

1. Logged-out user clicks invite → auth → auto-joins → redirected to trip chat
2. Logged-in but unfinished profile user clicks invite → profile → auto-joins → trip chat
3. Logged-in + onboarded user clicks invite → joins instantly → trip chat
4. Duplicate invite clicks do not create duplicate memberships
5. Owner sees "Remove" option next to each member (except themselves)
6. Removed member disappears from member list and "My Trips"
7. Removed member cannot access trip URL directly (redirected to dashboard)
8. Removed member clicking invite link sees "removed" message
9. Console/toast shows specific errors if something fails
