

# Phone Number Invites for TripChat

This plan adds phone number-based invitations to the Create Trip flow, allowing users to invite friends via SMS as the primary method while keeping email as a fallback option.

---

## Overview

**Current State**: Users can only invite friends by email during trip creation
**Target State**: Phone number invites as primary, with email as a toggle option

---

## Changes Required

### 1. Database Schema Update

Add a `phone_number` column to the `trip_invites` table and make `email` nullable:

```sql
-- Add phone_number column
ALTER TABLE public.trip_invites 
ADD COLUMN phone_number TEXT;

-- Make email nullable
ALTER TABLE public.trip_invites 
ALTER COLUMN email DROP NOT NULL;

-- Add constraint: exactly one of email or phone_number must be present
ALTER TABLE public.trip_invites 
ADD CONSTRAINT invite_contact_check 
CHECK (
  (email IS NOT NULL AND phone_number IS NULL) OR 
  (email IS NULL AND phone_number IS NOT NULL)
);

-- Update RLS policy for phone-based invite acceptance
DROP POLICY IF EXISTS "Invited users can update invite" ON public.trip_invites;

CREATE POLICY "Invited users can update invite" ON public.trip_invites
FOR UPDATE USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
  -- Phone-based acceptance will be handled via token validation
);
```

---

### 2. SMS Provider Setup (Twilio)

An edge function will be needed to send SMS invites. This requires:

- **TWILIO_ACCOUNT_SID** - Twilio account identifier
- **TWILIO_AUTH_TOKEN** - Twilio authentication token  
- **TWILIO_PHONE_NUMBER** - Your Twilio phone number for sending SMS

You'll need to sign up at [twilio.com](https://www.twilio.com) and get these credentials from your Twilio Console.

---

### 3. Edge Function: Send SMS Invite

Create `supabase/functions/send-sms-invite/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSInviteRequest {
  phoneNumber: string;
  joinCode: string;
  tripName: string;
  inviterName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, joinCode, tripName, inviterName }: SMSInviteRequest = await req.json();

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    const message = `${inviterName} invited you to join "${tripName}" on TripChat! 🌴\n\nJoin with code: ${joinCode}\n\nOr tap here: ${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/app/join?code=${joinCode}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioNumber!,
          To: phoneNumber,
          Body: message,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send SMS");
    }

    return new Response(JSON.stringify({ success: true, sid: result.sid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### 4. UI Updates: CreateTrip.tsx (Step 2 - Invite Crew)

**New state variables:**
- `inviteMode`: `'phone' | 'email'` - Toggle between phone and email input
- `phoneInput`: Current phone number being entered
- `countryCode`: Selected country code (default `'+1'`)
- `invites`: Array of `{ type: 'phone' | 'email', value: string }` objects

**UI changes:**
- Label: "Invite Friends by Phone (up to 30)"
- Helper text: "We'll text them a link to join the trip."
- Phone input with country code selector dropdown
- Placeholder: "+1 (555) 123-4567"
- Toggle link: "Invite by email instead" / "Invite by phone instead"
- Update helper text at bottom: "Invites will be sent via text with a link to join. You can invite people later."

**Country codes to support:**
```typescript
const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+52', country: 'MX', flag: '🇲🇽' },
];
```

---

### 5. UI Updates: InviteModal.tsx

Apply the same phone-first pattern to the InviteModal used in the Trip Panel:
- Default to phone input with country code
- Toggle link to switch to email
- Update placeholder and helper text

---

### 6. Submit Flow Updates

When creating invites:

```typescript
// For phone invites
const phoneInvites = invites
  .filter(i => i.type === 'phone')
  .map(i => ({
    trip_id: trip.id,
    phone_number: i.value,
    email: null,
    invited_by: user.id,
    message: inviteMessage.trim() || null,
  }));

// For email invites  
const emailInvites = invites
  .filter(i => i.type === 'email')
  .map(i => ({
    trip_id: trip.id,
    phone_number: null,
    email: i.value,
    invited_by: user.id,
    message: inviteMessage.trim() || null,
  }));

// Insert all invites
await supabase.from('trip_invites').insert([...phoneInvites, ...emailInvites]);

// Send SMS for phone invites via edge function
for (const invite of phoneInvites) {
  await supabase.functions.invoke('send-sms-invite', {
    body: {
      phoneNumber: invite.phone_number,
      joinCode: trip.join_code,
      tripName: trip.name,
      inviterName: profile?.name || 'A friend',
    },
  });
}
```

---

### 7. Type Updates

Update `src/lib/tripchat-types.ts` to include phone_number:

```typescript
export interface TripInvite {
  id: string;
  trip_id: string;
  email: string | null;
  phone_number: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string;
  message: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | Add phone_number column and constraint |
| `supabase/functions/send-sms-invite/index.ts` | Create | Edge function to send SMS via Twilio |
| `supabase/config.toml` | Update | Register new edge function |
| `src/pages/CreateTrip.tsx` | Update | Phone-first invite input with toggle |
| `src/components/invite/InviteModal.tsx` | Update | Phone-first invite in trip panel |
| `src/lib/tripchat-types.ts` | Update | Add phone_number to TripInvite type |

---

## Required Secrets

Before SMS sending will work, you'll need to provide:

1. **TWILIO_ACCOUNT_SID** - From your Twilio Console
2. **TWILIO_AUTH_TOKEN** - From your Twilio Console  
3. **TWILIO_PHONE_NUMBER** - A Twilio phone number you own

---

## Implementation Order

1. Run database migration to add phone_number column
2. Request Twilio API credentials from you
3. Create the SMS edge function
4. Update CreateTrip.tsx with phone-first UI
5. Update InviteModal.tsx with phone-first UI
6. Update type definitions
7. Test end-to-end flow

