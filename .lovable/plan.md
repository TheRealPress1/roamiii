

# Trip Delete Feature

Add ability for trip owners to delete a trip with confirmation, removing all related data.

---

## Overview

Enable trip owners to delete their trips via a settings menu in the TripPanel sidebar. Deletion requires typing "delete" to confirm, then removes the trip and all associated data, redirects to dashboard with a success toast.

---

## Architecture

```text
Trip Settings Flow:
┌───────────────────────────────────────────────────┐
│  TripPanel Sidebar                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ Trip Details          [⋯ Settings Menu]     │  │
│  │                        ├─ Delete Trip (owner)│ │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────┐
│  DeleteTripDialog (controlled by TripChat)        │
│  ┌─────────────────────────────────────────────┐  │
│  │  ⚠️ Delete Trip                              │  │
│  │  This will permanently delete...            │  │
│  │  [Type "delete" to confirm]                 │  │
│  │  [Cancel]              [Delete Trip]        │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
                      │
                      ▼ (on confirm)
          supabase.from('trips').delete()
                      │
                      ▼ (CASCADE deletes all related data)
          navigate('/app') + toast("Trip deleted")
```

---

## Database

**No migrations needed.** The existing RLS policy already handles owner-only deletion:

```sql
-- Existing policy on trips table
Policy Name: Owners can delete trips
Command: DELETE
Using Expression: is_trip_owner(id, auth.uid())
```

All related tables have `ON DELETE CASCADE`:
- trip_members
- messages (and message_reactions via cascade)
- trip_proposals (and trip_votes, proposal_comments, proposal_reactions via cascade)
- trip_invites
- proposal_compare
- notifications

---

## Changes

### 1. Create DeleteTripDialog Component

**File:** `src/components/trip/DeleteTripDialog.tsx` (new)

A confirmation dialog that:
- Shows warning about permanent deletion
- Requires typing "delete" (case-insensitive) to enable the delete button
- Calls onConfirm when user confirms

```text
Props:
├── open: boolean
├── onClose: () => void
├── tripName: string
├── onConfirm: () => void
└── loading: boolean
```

### 2. Update TripPanel Component

**File:** `src/components/trip/TripPanel.tsx`

Add a settings dropdown menu to the Trip Details section header:

```text
Changes:
├── Add props: isOwner, onDeleteTrip
├── Import: DropdownMenu components, Settings, Trash2 icons
└── Add: Settings kebab menu button (visible only when isOwner)
         └── "Delete Trip" menu item (red, destructive styling)
```

### 3. Update TripChat Page

**File:** `src/pages/TripChat.tsx`

Wire up the delete functionality:

```text
Changes:
├── Add state: deleteModalOpen, deleteLoading
├── Add: isOwner check (currentMember?.role === 'owner')
├── Add: handleDeleteTrip function
│   ├── Call supabase.from('trips').delete().eq('id', tripId)
│   ├── On success: navigate('/app'), toast.success('Trip deleted')
│   └── On error: toast.error('Failed to delete trip')
├── Pass isOwner, onDeleteTrip to TripPanel
└── Render DeleteTripDialog
```

---

## Technical Details

### Permission Check

```text
// In TripChat.tsx
const isOwner = currentMember?.role === 'owner';
```

This uses the existing `currentMember` lookup and is backed by the database RLS policy which enforces `is_trip_owner()` on DELETE operations.

### Delete Flow

1. Owner clicks Settings (⋯) > Delete Trip
2. DeleteTripDialog opens
3. User types "delete" (case-insensitive match)
4. Delete button becomes enabled
5. On click: 
   - Set loading state
   - Call Supabase delete
   - RLS validates ownership
   - CASCADE deletes all related data
   - Navigate to dashboard
   - Show success toast

### Security Layers

| Layer | Check |
|-------|-------|
| UI | Menu only shown if `isOwner === true` |
| Client | isOwner check before delete call |
| Database RLS | `is_trip_owner(id, auth.uid())` policy |

Non-owners cannot see the delete option, and even if they somehow trigger a delete request, RLS will reject it.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/trip/DeleteTripDialog.tsx` | New component for delete confirmation |
| `src/components/trip/TripPanel.tsx` | Add settings menu with delete option |
| `src/pages/TripChat.tsx` | Add delete state, handler, and dialog |

---

## Acceptance Criteria

1. Settings menu (⋯) visible in TripPanel sidebar for owners only
2. "Delete Trip" option in menu with destructive styling
3. Confirmation dialog requires typing "delete" (case-insensitive)
4. Delete button disabled until confirmation text matches
5. On delete: all related data removed via CASCADE
6. After delete: redirect to /app with "Trip deleted" toast
7. Non-owners cannot see or trigger delete
8. Deleted trips don't appear in My Trips
9. Attempting to open deleted trip URL shows "Trip not found"

