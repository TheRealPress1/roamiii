-- Create proposal_reactions table
CREATE TABLE public.proposal_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('interested', 'love', 'nope')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_proposal_reaction UNIQUE (proposal_id, user_id)
);

-- Performance indexes
CREATE INDEX idx_proposal_reactions_proposal ON public.proposal_reactions(proposal_id);
CREATE INDEX idx_proposal_reactions_user ON public.proposal_reactions(user_id);

-- Enable RLS
ALTER TABLE public.proposal_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view reactions"
ON public.proposal_reactions FOR SELECT TO authenticated
USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can add reactions"
ON public.proposal_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

CREATE POLICY "Users can update own reactions"
ON public.proposal_reactions FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions"
ON public.proposal_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for instant count updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_reactions;