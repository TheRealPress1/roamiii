
# Fix Invite Links and Codes

## Root Cause

The invite flow is broken because **RLS policies block trip data access for non-members**.

Both `InvitePage.tsx` and `JoinTrip.tsx` query the `trips` table directly:

```typescript
// This fails for non-members due to RLS
const { data: trip } = await supabase
  .from('trips')
  .select('id, name')
  .eq('join_code', code)
  .single();
```

The `trips` table has RLS policies that only allow:
- Members to view trips (`is_trip_member(id, auth.uid())`)
- Creators to view trips (`auth.uid() = created_by`)

**Result**: Non-members (or unauthenticated users) get `null` data, triggering the "Invalid Invite Link" error.

---

## Solution

Use the existing `get-trip-preview` edge function which uses the service role key to bypass RLS. This function was already created for this exact purpose.

---

## Changes

### 1. Update InvitePage to Use Edge Function

**File:** `src/pages/InvitePage.tsx`

Replace direct Supabase query with edge function call:

```typescript
// Before (blocked by RLS)
const { data, error } = await supabase
  .from('trips')
  .select('id, name')
  .eq('join_code', code)
  .single();

// After (bypasses RLS via service role)
const response = await supabase.functions.invoke('get-trip-preview', {
  body: { code: normalizedCode }
});

if (response.error || !response.data) {
  setState('invalid');
  return;
}

setTrip({ id: response.data.id, name: response.data.name });
```

### 2. Update get-trip-preview Edge Function

**File:** `supabase/functions/get-trip-preview/index.ts`

Currently uses query parameters. Update to support JSON body as well (for `supabase.functions.invoke`):

```typescript
// Support both query param and body
let joinCode = url.searchParams.get("code");
if (!joinCode && req.method === "POST") {
  const body = await req.json();
  joinCode = body.code;
}
```

### 3. Update JoinTrip to Use Edge Function

**File:** `src/pages/JoinTrip.tsx`

Same change - use edge function instead of direct query:

```typescript
// Before
const { data: trip, error: tripError } = await supabase
  .from('trips')
  .select('id, name')
  .eq('join_code', code)
  .single();

// After
const { data: tripData, error: tripError } = await supabase.functions.invoke(
  'get-trip-preview',
  { body: { code } }
);

if (tripError || !tripData) {
  toast.error('Invalid join code. Please check and try again.');
  setLoading(false);
  return;
}

const trip = { id: tripData.id, name: tripData.name };
```

---

## Technical Details

### Why Edge Function Works

The edge function creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
```

This bypasses RLS entirely, allowing anyone (even unauthenticated users) to look up a trip by invite code.

### Security Note

This is safe because:
1. The edge function only exposes limited trip info (id, name, date range)
2. Join codes are random 6-character strings (36^6 = 2+ billion combinations)
3. Users still need to authenticate before actually joining

### Flow After Fix

```text
User clicks /invite/CNPFD4
        │
        ▼
InvitePage loads
        │
        ▼
Call edge function: get-trip-preview(code: "CNPFD4")
        │ (bypasses RLS via service role key)
        ▼
Edge function returns: { id: "bed4fc26...", name: "SKI TRIP: president weekend" }
        │
        ▼
InvitePage shows: "You're Invited! Join SKI TRIP: president weekend"
        │
        ▼
User clicks "Sign In to Join" or auto-joins if already authenticated
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/get-trip-preview/index.ts` | Support POST body in addition to query params |
| `src/pages/InvitePage.tsx` | Use `supabase.functions.invoke('get-trip-preview')` |
| `src/pages/JoinTrip.tsx` | Use `supabase.functions.invoke('get-trip-preview')` |

---

## Acceptance Criteria

1. Unauthenticated user clicking invite link sees trip name and "Sign In to Join" button
2. Authenticated user clicking invite link joins successfully
3. Manual code entry in `/app/join` works for logged-in users
4. Invalid codes show "Invalid Invite Link" message
5. Removed members see "You've been removed" message
