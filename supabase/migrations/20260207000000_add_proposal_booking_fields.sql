-- Add booking tracking fields to trip_proposals
ALTER TABLE public.trip_proposals
ADD COLUMN booked_by UUID REFERENCES public.profiles(id),
ADD COLUMN booked_at TIMESTAMPTZ;

-- Index for querying booked proposals
CREATE INDEX idx_trip_proposals_booked_by ON public.trip_proposals(booked_by) WHERE booked_by IS NOT NULL;
