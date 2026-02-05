-- Add 'poll' to message_type enum
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'poll';

-- Create polls table
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  poll_type TEXT CHECK (poll_type IN ('yes_no', 'multiple_choice')) DEFAULT 'yes_no',
  options JSONB DEFAULT '["Yes", "No"]',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create message_mentions table
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_polls_trip ON public.polls(trip_id);
CREATE INDEX idx_polls_message ON public.polls(message_id);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user ON public.poll_votes(user_id);
CREATE INDEX idx_mentions_message ON public.message_mentions(message_id);
CREATE INDEX idx_mentions_user ON public.message_mentions(mentioned_user_id);

-- Enable RLS on new tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls
CREATE POLICY "Members can view polls" ON public.polls
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create polls" ON public.polls
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Poll creators can update polls" ON public.polls
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Poll creators can delete polls" ON public.polls
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND m.user_id = auth.uid()
  )
);

-- RLS Policies for poll_votes
CREATE POLICY "Members can view poll votes" ON public.poll_votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND is_trip_member(p.trip_id, auth.uid())
  )
);

CREATE POLICY "Members can vote on polls" ON public.poll_votes
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND is_trip_member(p.trip_id, auth.uid())
  )
);

CREATE POLICY "Users can update own votes" ON public.poll_votes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes" ON public.poll_votes
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for message_mentions
CREATE POLICY "Members can view mentions" ON public.message_mentions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Members can create mentions" ON public.message_mentions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Message authors can delete mentions" ON public.message_mentions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND m.user_id = auth.uid()
  )
);

-- Enable realtime for polls and poll_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
