-- Add venmo_username column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS venmo_username text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.venmo_username IS 'User''s Venmo username for payment links';
