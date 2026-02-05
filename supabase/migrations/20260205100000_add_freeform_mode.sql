-- Add freeform planning mode support

-- Step 1: Add 'building' phase to trip_phase enum (for freeform trips in progress)
-- This phase comes before 'destination' as freeform trips start here
ALTER TYPE public.trip_phase ADD VALUE IF NOT EXISTS 'building' BEFORE 'destination';

-- Step 2: Add planning_mode column to trips
-- 'collaborative' = current sequential phases with group voting (default)
-- 'freeform' = owner builds everything, then shares when ready
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS planning_mode TEXT DEFAULT 'collaborative'
  CHECK (planning_mode IN ('collaborative', 'freeform'));

-- Step 3: Add flight_booking_url column to trips
-- Stores a URL where members can book their flights
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS flight_booking_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.trips.planning_mode IS 'Planning mode: collaborative (group voting) or freeform (owner builds everything)';
COMMENT ON COLUMN public.trips.flight_booking_url IS 'URL where members can book their flights';
