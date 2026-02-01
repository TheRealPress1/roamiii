

# Replace SMS Invites with Shareable Link + Invite Code + Gated Preview

This plan simplifies the invite system by removing SMS/Twilio dependencies and implementing a viral, link-based sharing approach with a gated preview for unauthenticated users.

---

## Overview

**Current State**: Phone/email invite inputs requiring SMS infrastructure
**Target State**: Copy-able invite links and codes with a beautiful gated preview experience

**Key Benefits**:
- No Twilio costs or SMS deliverability issues
- Viral by design - works in any group chat
- Matches how people naturally share links

---

## Database Changes

### Remove Phone Number Constraint

The recent migration added a `phone_number` column and constraint. We need to:

1. Drop the `invite_contact_check` constraint (requires exactly one of email/phone)
2. Make both `email` and `phone_number` fully nullable (invites may not need either for link-based sharing)

```sql
ALTER TABLE public.trip_invites 
DROP CONSTRAINT IF EXISTS invite_contact_check;

ALTER TABLE public.trip_invites 
ALTER COLUMN email DROP NOT NULL;
```

Note: The `join_code` column already exists on the `trips` table with the `generate_join_code()` function - no additional database changes needed for the core invite flow.

---

## New Route: `/join/:code`

Create a dedicated route for invite links that:
- Works for both authenticated and unauthenticated users
- Shows a gated preview for unauthenticated users
- Auto-joins authenticated users directly

**Route structure**:
```
/join/:code  →  JoinTripPreview (public, handles gated preview)
/app/join    →  Keep existing (for manual code entry when logged in)
```

---

## File Changes

### 1. Create New Page: `src/pages/JoinTripPreview.tsx`

This is the **gated preview page** for unauthenticated users:

**Behavior**:
- Fetches trip preview data using the join code (public query via service role or RLS bypass)
- Shows read-only preview for 2 seconds
- Then overlays modal: "Join this trip to continue"
- Buttons: "Sign Up" / "Sign In"
- After auth, auto-redirects back with code, triggering join

**Preview shows**:
- Trip name and dates
- Member count (e.g., "8 friends planning")
- Top proposal card (destination, cover image, price)
- Blurred recent messages area

**For authenticated users**:
- Auto-join the trip immediately
- Redirect to `/app/trip/:tripId`

---

### 2. Update: `src/App.tsx`

Add the new public route:

```typescript
<Route path="/join/:code" element={<JoinTripPreview />} />
```

This route is NOT wrapped in ProtectedRoute since it needs to show the gated preview.

---

### 3. Update: `src/pages/CreateTrip.tsx`

Replace Step 2 (Invite Crew) with the new share-first UI:

**New Step 2 UI**:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│            🎉 Invite your friends                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Invite Link                                  │  │
│  │  ┌─────────────────────────────┐ ┌────────┐   │  │
│  │  │ tripchat.app/join/ABCD12   │ │  Copy  │   │  │
│  │  └─────────────────────────────┘ └────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Invite Code                                  │  │
│  │                                               │  │
│  │          ┌──────────────────────┐             │  │
│  │          │     ABCD12           │  [Copy]     │  │
│  │          └──────────────────────┘             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Share this link or code in any group chat.         │
│                                                     │
│          [ Go to Trip Chat ]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key changes**:
- Remove all email/phone input fields
- Remove invite message textarea
- Remove trip_invites insertion logic
- Show invite link and code after trip creation
- Add copy buttons for both link and code
- Change final button to "Go to Trip Chat"

**Implementation approach**:
1. Step 1 stays the same (Trip Setup)
2. Step 2 becomes a "success + share" screen shown AFTER trip is created
3. Trip creation happens on Step 1's "Continue" click
4. Step 2 displays the generated invite link and code

---

### 4. Update: `src/components/invite/InviteModal.tsx`

Simplify to show only link and code:

**New UI**:
- Remove all email invite functionality
- Show invite link with copy button
- Show invite code with copy button
- Helper text: "Share this link or code in any group chat"

Remove:
- Email input and Add button
- Email chips display
- Send invites button and logic

---

### 5. Update: `src/pages/JoinTrip.tsx`

Update the authenticated join page:

**Changes**:
- Accept invite link paste (extract code from URL)
- Keep code input field
- Redirect to `/join/:code` for link-based joins (to leverage the auto-join logic)

---

### 6. Update: `src/pages/Auth.tsx`

Handle redirect after auth with pending join:

**Changes**:
- Check for `pendingJoinCode` in sessionStorage after successful auth
- If exists, redirect to `/join/:code` to complete the join flow
- Clear the pendingJoinCode after use

---

### 7. Create: `src/lib/trip-preview.ts`

Helper functions for fetching trip preview data:

```typescript
export async function fetchTripPreview(joinCode: string) {
  // Fetch basic trip info by join code
  // This needs to be a public query or use service role
  // Returns: name, dates, member_count, top_proposal
}
```

**Note**: This requires adding an RLS policy that allows reading basic trip info by join_code for preview purposes, OR creating an edge function to fetch preview data.

---

## Security Considerations

### RLS Policy for Trip Preview

Add a limited SELECT policy for unauthenticated preview:

```sql
-- Allow reading basic trip info by join_code (for preview)
CREATE POLICY "Anyone can preview trips by join code" ON public.trips
FOR SELECT
USING (
  -- Only return rows if querying by join_code
  join_code IS NOT NULL
);
```

However, this approach has risks. A safer approach is to:

1. Create an edge function `get-trip-preview` that:
   - Accepts a join_code
   - Returns limited data (name, dates, member count, top proposal)
   - Uses service role internally
   - No auth required

This keeps RLS intact and doesn't expose trip data broadly.

---

## Implementation Order

1. **Database migration**: Remove phone_number constraint
2. **Create JoinTripPreview page**: The core gated preview experience
3. **Update App.tsx**: Add `/join/:code` route
4. **Update CreateTrip.tsx**: New share-first Step 2
5. **Update InviteModal.tsx**: Simplify to link/code only
6. **Update Auth.tsx**: Handle pending join after auth
7. **Test the full flow**: Create trip → copy link → open in incognito → preview → auth → auto-join

---

## User Flow Diagram

```
Creator:
  1. Creates trip
  2. Sees invite link + code
  3. Copies link, shares in group chat

Friend (not logged in):
  1. Clicks link → /join/ABCD12
  2. Sees trip preview (2 seconds)
  3. Modal appears: "Join this trip to continue"
  4. Clicks "Sign Up" or "Sign In"
  5. Stores code in sessionStorage
  6. Completes auth
  7. Redirected back to /join/ABCD12
  8. Now authenticated → auto-joined
  9. Lands in trip chat

Friend (already logged in):
  1. Clicks link → /join/ABCD12
  2. Auto-joined immediately
  3. Lands in trip chat
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | Remove phone constraint |
| `src/pages/JoinTripPreview.tsx` | Create | Gated preview page |
| `src/App.tsx` | Update | Add `/join/:code` route |
| `src/pages/CreateTrip.tsx` | Update | Replace invite step with share UI |
| `src/components/invite/InviteModal.tsx` | Update | Link/code only, no email |
| `src/pages/Auth.tsx` | Update | Handle pending join code |
| `src/pages/JoinTrip.tsx` | Update | Accept pasted links |
| `supabase/functions/get-trip-preview/index.ts` | Create | Public preview data endpoint |

---

## Edge Function: get-trip-preview

Since RLS requires authentication to read trip data, we need a public edge function:

```typescript
// supabase/functions/get-trip-preview/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Get join_code from request
  // Use service role to fetch trip preview
  // Return limited data: name, dates, member_count, top_proposal
});
```

This allows unauthenticated users to see the preview without compromising RLS.

