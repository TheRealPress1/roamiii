-- Add per-phase voting deadlines to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_voting_deadline TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS itinerary_voting_deadline TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN trips.destination_voting_deadline IS 'Deadline for voting on destination proposals. Auto-lock triggers when all members vote AND deadline passes.';
COMMENT ON COLUMN trips.itinerary_voting_deadline IS 'Deadline for voting on itinerary proposals. Auto-lock triggers when all members vote AND deadline passes.';
