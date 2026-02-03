-- Create proposal type enum
CREATE TYPE public.proposal_type AS ENUM ('place', 'activity', 'food_spot', 'full_itinerary');

-- Add type column (default full_itinerary for backward compat)
ALTER TABLE public.trip_proposals
ADD COLUMN type proposal_type NOT NULL DEFAULT 'full_itinerary';

-- Add flexible fields for quick proposals
ALTER TABLE public.trip_proposals
ADD COLUMN name TEXT,           -- Optional friendly name
ADD COLUMN description TEXT,    -- Optional notes
ADD COLUMN address TEXT,        -- For places/food spots
ADD COLUMN url TEXT,            -- Single link
ADD COLUMN price_range TEXT;    -- $, $$, $$$ for food spots

CREATE INDEX idx_trip_proposals_type ON public.trip_proposals(type);
