-- Create new enums for TripChat
CREATE TYPE public.trip_status AS ENUM ('planning', 'decided');
CREATE TYPE public.trip_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.message_type AS ENUM ('text', 'proposal', 'system');

-- Generate random join code function
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  date_start DATE,
  date_end DATE,
  flexible_dates BOOLEAN DEFAULT false,
  home_city TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  decision_deadline TIMESTAMP WITH TIME ZONE,
  status trip_status NOT NULL DEFAULT 'planning',
  pinned_proposal_id UUID,
  join_code TEXT UNIQUE DEFAULT public.generate_join_code(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_members table
CREATE TABLE public.trip_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role trip_role NOT NULL DEFAULT 'member',
  budget_min INTEGER,
  budget_max INTEGER,
  availability_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type message_type NOT NULL DEFAULT 'text',
  body TEXT,
  proposal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_proposals table (separate from board proposals)
CREATE TABLE public.trip_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  flexible_dates BOOLEAN DEFAULT false,
  cover_image_url TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  vibe_tags TEXT[] DEFAULT '{}',
  lodging_links TEXT[] DEFAULT '{}',
  cost_lodging_total NUMERIC DEFAULT 0,
  cost_transport_total NUMERIC DEFAULT 0,
  cost_food_total NUMERIC DEFAULT 0,
  cost_activities_total NUMERIC DEFAULT 0,
  estimated_cost_per_person NUMERIC DEFAULT 0,
  attendee_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for pinned_proposal_id
ALTER TABLE public.trips 
ADD CONSTRAINT trips_pinned_proposal_fkey 
FOREIGN KEY (pinned_proposal_id) REFERENCES public.trip_proposals(id) ON DELETE SET NULL;

-- Add foreign key for messages.proposal_id
ALTER TABLE public.messages
ADD CONSTRAINT messages_proposal_fkey
FOREIGN KEY (proposal_id) REFERENCES public.trip_proposals(id) ON DELETE CASCADE;

-- Create trip_votes table
CREATE TABLE public.trip_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote vote_type NOT NULL,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

-- Create proposal_comments table
CREATE TABLE public.proposal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create trip_invites table
CREATE TABLE public.trip_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, email)
);

-- Create indexes for performance
CREATE INDEX idx_messages_trip_id ON public.messages(trip_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX idx_trip_proposals_trip_id ON public.trip_proposals(trip_id);
CREATE INDEX idx_trip_votes_proposal_id ON public.trip_votes(proposal_id);
CREATE INDEX idx_trips_join_code ON public.trips(join_code);

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Security definer functions for trip membership
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_admin(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid AND user_id = user_uuid AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = trip_uuid AND user_id = user_uuid AND role = 'owner'
  );
$$;

-- Trigger to auto-create owner when trip is created
CREATE OR REPLACE FUNCTION public.handle_new_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_trip();

-- RLS Policies for trips
CREATE POLICY "Members can view trips" ON public.trips
FOR SELECT USING (is_trip_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create trips" ON public.trips
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update trips" ON public.trips
FOR UPDATE USING (is_trip_admin(id, auth.uid()));

CREATE POLICY "Owners can delete trips" ON public.trips
FOR DELETE USING (is_trip_owner(id, auth.uid()));

-- RLS Policies for trip_members
CREATE POLICY "Members can view trip members" ON public.trip_members
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Admins can add members" ON public.trip_members
FOR INSERT WITH CHECK (is_trip_admin(trip_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON public.trip_members
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members" ON public.trip_members
FOR DELETE USING (is_trip_admin(trip_id, auth.uid()) OR user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Members can view messages" ON public.messages
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create messages" ON public.messages
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for trip_proposals
CREATE POLICY "Members can view proposals" ON public.trip_proposals
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create proposals" ON public.trip_proposals
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update own proposals" ON public.trip_proposals
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own proposals or admins" ON public.trip_proposals
FOR DELETE USING (created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid()));

-- RLS Policies for trip_votes
CREATE POLICY "Members can view votes" ON public.trip_votes
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create votes" ON public.trip_votes
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own votes" ON public.trip_votes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes" ON public.trip_votes
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for proposal_comments
CREATE POLICY "Members can view comments" ON public.proposal_comments
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create comments" ON public.proposal_comments
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.proposal_comments
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.proposal_comments
FOR DELETE USING (user_id = auth.uid() OR is_trip_admin(trip_id, auth.uid()));

-- RLS Policies for message_reactions
CREATE POLICY "Members can view reactions" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Members can add reactions" ON public.message_reactions
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for trip_invites
CREATE POLICY "Members can view invites" ON public.trip_invites
FOR SELECT USING (
  is_trip_member(trip_id, auth.uid()) OR 
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can create invites" ON public.trip_invites
FOR INSERT WITH CHECK (is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "Invited users can update invite" ON public.trip_invites
FOR UPDATE USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_votes;

-- Create storage bucket for trip images
INSERT INTO storage.buckets (id, name, public) VALUES ('tripchat-images', 'tripchat-images', true);

-- Storage policies for tripchat-images bucket
CREATE POLICY "Anyone can view trip images" ON storage.objects
FOR SELECT USING (bucket_id = 'tripchat-images');

CREATE POLICY "Authenticated users can upload trip images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tripchat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own trip images" ON storage.objects
FOR UPDATE USING (bucket_id = 'tripchat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own trip images" ON storage.objects
FOR DELETE USING (bucket_id = 'tripchat-images' AND auth.uid()::text = (storage.foldername(name))[1]);