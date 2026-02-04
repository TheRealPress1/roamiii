-- Create phase enum
CREATE TYPE public.trip_phase AS ENUM ('destination', 'itinerary', 'finalize', 'ready');

-- Add phase column to trips (default 'destination' for new trips)
ALTER TABLE public.trips
ADD COLUMN phase trip_phase NOT NULL DEFAULT 'destination';

-- Add locked_destination_id (the winning destination proposal)
ALTER TABLE public.trips
ADD COLUMN locked_destination_id UUID REFERENCES public.trip_proposals(id) ON DELETE SET NULL;

-- Add 'included' flag to proposals (for Phase 2 include/exclude)
ALTER TABLE public.trip_proposals
ADD COLUMN included BOOLEAN NOT NULL DEFAULT FALSE;

-- Add 'is_destination' flag to distinguish destination proposals
ALTER TABLE public.trip_proposals
ADD COLUMN is_destination BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing trips:
-- - Trips with pinned_proposal_id go to 'ready' (already decided)
-- - Trips without go to 'destination' (start fresh)
UPDATE public.trips
SET phase = CASE
  WHEN pinned_proposal_id IS NOT NULL THEN 'ready'::trip_phase
  ELSE 'destination'::trip_phase
END;

-- Index for phase queries
CREATE INDEX idx_trips_phase ON public.trips(phase);
CREATE INDEX idx_trip_proposals_included ON public.trip_proposals(included) WHERE included = TRUE;
