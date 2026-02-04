-- Add transportation phase to trip_phase enum
-- Note: PostgreSQL doesn't support inserting enum values in a specific position,
-- so we recreate the enum with the correct order

-- Step 1: Add new enum value
ALTER TYPE public.trip_phase ADD VALUE IF NOT EXISTS 'transportation' AFTER 'destination';

-- Step 2: Add travel_mode column to trips (trip-wide default)
-- 'flying' | 'driving' | null (null means not set)
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS travel_mode TEXT CHECK (travel_mode IN ('flying', 'driving'));

-- Step 3: Add transportation columns to trip_members
-- travel_mode: personal override ('flying' | 'driving' | null means use trip default)
ALTER TABLE public.trip_members
ADD COLUMN IF NOT EXISTS travel_mode TEXT CHECK (travel_mode IN ('flying', 'driving'));

-- is_driver: whether this member is offering to drive
ALTER TABLE public.trip_members
ADD COLUMN IF NOT EXISTS is_driver BOOLEAN DEFAULT FALSE;

-- car_capacity: how many passengers the driver can take (null if not driving)
ALTER TABLE public.trip_members
ADD COLUMN IF NOT EXISTS car_capacity INTEGER CHECK (car_capacity IS NULL OR car_capacity >= 1);

-- rides_with_id: FK to the driver's trip_member row (null if not a passenger)
ALTER TABLE public.trip_members
ADD COLUMN IF NOT EXISTS rides_with_id UUID REFERENCES public.trip_members(id) ON DELETE SET NULL;

-- Step 4: Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trip_members_is_driver ON public.trip_members(is_driver) WHERE is_driver = TRUE;
CREATE INDEX IF NOT EXISTS idx_trip_members_rides_with ON public.trip_members(rides_with_id) WHERE rides_with_id IS NOT NULL;

-- Step 5: Add constraint to ensure rides_with_id points to a driver in the same trip
-- This is enforced via application logic since cross-table constraints are complex in Postgres

COMMENT ON COLUMN public.trips.travel_mode IS 'Trip-wide default travel mode: flying or driving';
COMMENT ON COLUMN public.trip_members.travel_mode IS 'Member personal travel mode override';
COMMENT ON COLUMN public.trip_members.is_driver IS 'Whether member is offering to drive others';
COMMENT ON COLUMN public.trip_members.car_capacity IS 'Number of passengers driver can take';
COMMENT ON COLUMN public.trip_members.rides_with_id IS 'FK to driver trip_member if riding with someone';
