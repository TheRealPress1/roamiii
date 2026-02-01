-- Remove the phone constraint that was just added
ALTER TABLE public.trip_invites 
DROP CONSTRAINT IF EXISTS invite_contact_check;

-- Ensure email is nullable for link-based sharing
ALTER TABLE public.trip_invites 
ALTER COLUMN email DROP NOT NULL;