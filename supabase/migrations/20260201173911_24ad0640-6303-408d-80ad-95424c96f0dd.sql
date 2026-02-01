-- Create enum for roles
CREATE TYPE public.board_role AS ENUM ('owner', 'admin', 'member');

-- Create enum for invite status
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired');

-- Create enum for board status
CREATE TYPE public.board_status AS ENUM ('active', 'decided', 'archived');

-- Create enum for vote type
CREATE TYPE public.vote_type AS ENUM ('in', 'maybe', 'out');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create boards table
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

-- Create board_members table
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

-- Create invites table
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

-- Create proposals table
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

-- Add foreign key for chosen_proposal_id
ALTER TABLE public.boards ADD CONSTRAINT boards_chosen_proposal_fkey 
  FOREIGN KEY (chosen_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

-- Create votes table
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

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is board member
CREATE OR REPLACE FUNCTION public.is_board_member(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members 
    WHERE board_id = board_uuid AND user_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is board admin or owner
CREATE OR REPLACE FUNCTION public.is_board_admin(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members 
    WHERE board_id = board_uuid AND user_id = user_uuid AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is board owner
CREATE OR REPLACE FUNCTION public.is_board_owner(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members 
    WHERE board_id = board_uuid AND user_id = user_uuid AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Boards policies
CREATE POLICY "Members can view boards" ON public.boards
  FOR SELECT TO authenticated USING (public.is_board_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create boards" ON public.boards
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update boards" ON public.boards
  FOR UPDATE TO authenticated USING (public.is_board_admin(id, auth.uid()));

CREATE POLICY "Owners can delete boards" ON public.boards
  FOR DELETE TO authenticated USING (public.is_board_owner(id, auth.uid()));

-- Board members policies
CREATE POLICY "Members can view board members" ON public.board_members
  FOR SELECT TO authenticated USING (public.is_board_member(board_id, auth.uid()));

CREATE POLICY "Admins can add members" ON public.board_members
  FOR INSERT TO authenticated WITH CHECK (public.is_board_admin(board_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON public.board_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members" ON public.board_members
  FOR DELETE TO authenticated USING (public.is_board_admin(board_id, auth.uid()) OR user_id = auth.uid());

-- Invites policies
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

-- Proposals policies
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

-- Votes policies
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

-- Comments policies
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

-- Reactions policies
CREATE POLICY "Users can view reactions" ON public.reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reactions" ON public.reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions" ON public.reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to add creator as owner when board is created
CREATE OR REPLACE FUNCTION public.handle_new_board()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_board_created
  AFTER INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_board();

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
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

-- Create indexes for performance
CREATE INDEX idx_board_members_board_id ON public.board_members(board_id);
CREATE INDEX idx_board_members_user_id ON public.board_members(user_id);
CREATE INDEX idx_proposals_board_id ON public.proposals(board_id);
CREATE INDEX idx_votes_proposal_id ON public.votes(proposal_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_comments_proposal_id ON public.comments(proposal_id);
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_email ON public.invites(email);