-- Add phone_number column to trip_invites
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