-- Create status enum for membership
CREATE TYPE member_status AS ENUM ('active', 'removed');

-- Add columns to trip_members
ALTER TABLE trip_members 
  ADD COLUMN status member_status NOT NULL DEFAULT 'active',
  ADD COLUMN removed_at timestamptz,
  ADD COLUMN removed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX idx_trip_members_status ON trip_members(trip_id, status);

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

-- Update is_trip_admin to also check status
CREATE OR REPLACE FUNCTION public.is_trip_admin(trip_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid 
      AND user_id = user_uuid 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- Update is_trip_owner to also check status
CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid 
      AND user_id = user_uuid 
      AND role = 'owner'
      AND status = 'active'
  );
$$;