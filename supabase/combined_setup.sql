-- Combined Roamiii Database Setup
-- Run this in Supabase SQL Editor to set up all tables, functions, and policies

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.board_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired');
CREATE TYPE public.board_status AS ENUM ('active', 'decided', 'archived');
CREATE TYPE public.vote_type AS ENUM ('in', 'maybe', 'out');
CREATE TYPE public.trip_status AS ENUM ('planning', 'decided');
CREATE TYPE public.trip_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.message_type AS ENUM ('text', 'proposal', 'system');
CREATE TYPE public.member_status AS ENUM ('active', 'removed');

-- ============================================
-- PROFILES TABLE (core)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- BOARDS TABLES (legacy)
-- ============================================
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  home_city TEXT,
  date_start DATE,
  date_end DATE,
  budget_min INTEGER,
  budget_max INTEGER,
  decision_deadline TIMESTAMPTZ,
  chosen_proposal_id UUID,
  status public.board_status NOT NULL DEFAULT 'active',
  vibe_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.board_role NOT NULL DEFAULT 'member',
  budget_min INTEGER,
  budget_max INTEGER,
  availability_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, email)
);

CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  flexible_dates BOOLEAN DEFAULT false,
  cover_image_url TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  vibe_tags TEXT[] DEFAULT '{}',
  lodging_links TEXT[] DEFAULT '{}',
  cost_lodging_total NUMERIC(10,2) DEFAULT 0,
  cost_transport_total NUMERIC(10,2) DEFAULT 0,
  cost_food_total NUMERIC(10,2) DEFAULT 0,
  cost_activities_total NUMERIC(10,2) DEFAULT 0,
  estimated_cost_per_person NUMERIC(10,2) DEFAULT 0,
  attendee_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boards ADD CONSTRAINT boards_chosen_proposal_fkey
  FOREIGN KEY (chosen_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote public.vote_type NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- ============================================
-- TRIPS TABLES (new TripChat)
-- ============================================
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

CREATE TABLE public.trip_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role trip_role NOT NULL DEFAULT 'member',
  budget_min INTEGER,
  budget_max INTEGER,
  availability_json JSONB,
  status member_status NOT NULL DEFAULT 'active',
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

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

ALTER TABLE public.trips
ADD CONSTRAINT trips_pinned_proposal_fkey
FOREIGN KEY (pinned_proposal_id) REFERENCES public.trip_proposals(id) ON DELETE SET NULL;

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type message_type NOT NULL DEFAULT 'text',
  body TEXT,
  proposal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
ADD CONSTRAINT messages_proposal_fkey
FOREIGN KEY (proposal_id) REFERENCES public.trip_proposals(id) ON DELETE CASCADE;

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

CREATE TABLE public.proposal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE public.trip_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, email)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE public.proposal_compare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_proposal_compare UNIQUE (user_id, proposal_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_board_members_board_id ON public.board_members(board_id);
CREATE INDEX idx_board_members_user_id ON public.board_members(user_id);
CREATE INDEX idx_proposals_board_id ON public.proposals(board_id);
CREATE INDEX idx_votes_proposal_id ON public.votes(proposal_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_comments_proposal_id ON public.comments(proposal_id);
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_email ON public.invites(email);
CREATE INDEX idx_messages_trip_id ON public.messages(trip_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX idx_trip_members_status ON public.trip_members(trip_id, status);
CREATE INDEX idx_trip_proposals_trip_id ON public.trip_proposals(trip_id);
CREATE INDEX idx_trip_votes_proposal_id ON public.trip_votes(proposal_id);
CREATE INDEX idx_trips_join_code ON public.trips(join_code);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_proposal_reactions_proposal ON public.proposal_reactions(proposal_id);
CREATE INDEX idx_proposal_reactions_user ON public.proposal_reactions(user_id);
CREATE INDEX idx_proposal_compare_user_trip ON public.proposal_compare(user_id, trip_id);
CREATE INDEX idx_proposal_compare_proposal ON public.proposal_compare(proposal_id);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_compare ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_board_member(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = board_uuid AND user_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_board_admin(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = board_uuid AND user_id = user_uuid AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_board_owner(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = board_uuid AND user_id = user_uuid AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_trip_member(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_uuid
      AND user_id = user_uuid
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_admin(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_uuid
      AND user_id = user_uuid
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_uuid
      AND user_id = user_uuid
      AND role = 'owner'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.notify_trip_members(
  _trip_id UUID,
  _actor_id UUID,
  _type TEXT,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _href TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, trip_id, actor_id, type, title, body, href)
  SELECT
    tm.user_id,
    _trip_id,
    _actor_id,
    _type,
    _title,
    _body,
    _href
  FROM public.trip_members tm
  WHERE tm.trip_id = _trip_id
    AND tm.user_id != _actor_id;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_board()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_board_created
  AFTER INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_board();

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

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- ============================================
-- RLS POLICIES - BOARDS (legacy)
-- ============================================
CREATE POLICY "Members can view boards" ON public.boards
  FOR SELECT TO authenticated USING (public.is_board_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create boards" ON public.boards
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update boards" ON public.boards
  FOR UPDATE TO authenticated USING (public.is_board_admin(id, auth.uid()));

CREATE POLICY "Owners can delete boards" ON public.boards
  FOR DELETE TO authenticated USING (public.is_board_owner(id, auth.uid()));

CREATE POLICY "Members can view board members" ON public.board_members
  FOR SELECT TO authenticated USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Admins can add members" ON public.board_members
  FOR INSERT TO authenticated WITH CHECK (public.is_board_admin(board_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON public.board_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members" ON public.board_members
  FOR DELETE TO authenticated USING (public.is_board_admin(board_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Members can view invites" ON public.invites
  FOR SELECT TO authenticated USING (
    public.is_board_member(board_id, auth.uid()) OR
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can create invites" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_board_admin(board_id, auth.uid()));

CREATE POLICY "Invited users can update invite" ON public.invites
  FOR UPDATE TO authenticated USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Members can view proposals" ON public.proposals
  FOR SELECT TO authenticated USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Members can create proposals" ON public.proposals
  FOR INSERT TO authenticated WITH CHECK (
    public.is_board_member(board_id, auth.uid()) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own proposals" ON public.proposals
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own proposals or admins" ON public.proposals
  FOR DELETE TO authenticated USING (
    created_by = auth.uid() OR public.is_board_admin(board_id, auth.uid())
  );

CREATE POLICY "Members can view votes" ON public.votes
  FOR SELECT TO authenticated USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Members can create votes" ON public.votes
  FOR INSERT TO authenticated WITH CHECK (
    public.is_board_member(board_id, auth.uid()) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own votes" ON public.votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes" ON public.votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members can view comments" ON public.comments
  FOR SELECT TO authenticated USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Members can create comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_board_member(board_id, auth.uid()) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments or admins" ON public.comments
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_board_member(board_id, auth.uid())
  );

CREATE POLICY "Users can view reactions" ON public.reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reactions" ON public.reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions" ON public.reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - TRIPS
-- ============================================
CREATE POLICY "Members can view trips" ON public.trips
FOR SELECT USING (is_trip_member(id, auth.uid()));

CREATE POLICY "Creator can view own trips" ON public.trips
FOR SELECT TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own trips" ON public.trips
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update trips" ON public.trips
FOR UPDATE USING (is_trip_admin(id, auth.uid()));

CREATE POLICY "Owners can delete trips" ON public.trips
FOR DELETE USING (is_trip_owner(id, auth.uid()));

CREATE POLICY "Members can view trip members" ON public.trip_members
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Admins can add trip members" ON public.trip_members
FOR INSERT WITH CHECK (is_trip_admin(trip_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own trip membership" ON public.trip_members
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can remove trip members" ON public.trip_members
FOR DELETE USING (is_trip_admin(trip_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Members can view messages" ON public.messages
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create messages" ON public.messages
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Members can view trip proposals" ON public.trip_proposals
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create trip proposals" ON public.trip_proposals
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update own trip proposals" ON public.trip_proposals
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own trip proposals or admins" ON public.trip_proposals
FOR DELETE USING (created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "Members can view trip votes" ON public.trip_votes
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create trip votes" ON public.trip_votes
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own trip votes" ON public.trip_votes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own trip votes" ON public.trip_votes
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Members can view proposal comments" ON public.proposal_comments
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create proposal comments" ON public.proposal_comments
FOR INSERT WITH CHECK (is_trip_member(trip_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own proposal comments" ON public.proposal_comments
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own proposal comments" ON public.proposal_comments
FOR DELETE USING (user_id = auth.uid() OR is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "Members can view message reactions" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Members can add message reactions" ON public.message_reactions
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND is_trip_member(m.trip_id, auth.uid())
  )
);

CREATE POLICY "Users can remove own message reactions" ON public.message_reactions
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Members can view trip invites" ON public.trip_invites
FOR SELECT USING (
  is_trip_member(trip_id, auth.uid()) OR
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can create trip invites" ON public.trip_invites
FOR INSERT WITH CHECK (is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "Invited users can update trip invite" ON public.trip_invites
FOR UPDATE USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Trip members can create notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    trip_id IS NULL
    OR is_trip_member(trip_id, user_id)
  )
);

CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can view proposal reactions" ON public.proposal_reactions
FOR SELECT TO authenticated
USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can add proposal reactions" ON public.proposal_reactions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

CREATE POLICY "Users can update own proposal reactions" ON public.proposal_reactions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own proposal reactions" ON public.proposal_reactions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view own compare selections" ON public.proposal_compare
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Trip members can add to compare" ON public.proposal_compare
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

CREATE POLICY "Users can delete own compare selections" ON public.proposal_compare
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_reactions;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('tripchat-images', 'tripchat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for tripchat-images bucket
CREATE POLICY "Anyone can view trip images" ON storage.objects
FOR SELECT USING (bucket_id = 'tripchat-images');

CREATE POLICY "Authenticated users can upload trip images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tripchat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own trip images" ON storage.objects
FOR UPDATE USING (bucket_id = 'tripchat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own trip images" ON storage.objects
FOR DELETE USING (bucket_id = 'tripchat-images' AND auth.uid()::text = (storage.foldername(name))[1]);
