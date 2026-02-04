-- Migrate existing proposals to the new types
-- 'place', 'food_spot', 'full_itinerary' -> 'housing'
-- 'activity' stays as 'activity'
UPDATE public.trip_proposals
SET type = 'housing'
WHERE type IN ('place', 'food_spot', 'full_itinerary');

-- Update default to 'housing'
ALTER TABLE public.trip_proposals
ALTER COLUMN type SET DEFAULT 'housing';
