-- Create proposal_compare table for per-user compare selections
CREATE TABLE public.proposal_compare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_proposal_compare UNIQUE (user_id, proposal_id)
);

-- Performance indexes
CREATE INDEX idx_proposal_compare_user_trip ON public.proposal_compare(user_id, trip_id);
CREATE INDEX idx_proposal_compare_proposal ON public.proposal_compare(proposal_id);

-- Enable RLS
ALTER TABLE public.proposal_compare ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own compare selections
CREATE POLICY "Users can view own compare selections"
ON public.proposal_compare FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can add proposals to compare if they are trip members
CREATE POLICY "Trip members can add to compare"
ON public.proposal_compare FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

-- Users can remove their own compare selections
CREATE POLICY "Users can delete own compare selections"
ON public.proposal_compare FOR DELETE TO authenticated
USING (user_id = auth.uid());