// Custom types for Trip Arena that extend the generated Supabase types
export type VoteType = 'in' | 'maybe' | 'out';
export type BoardRole = 'owner' | 'admin' | 'member';
export type BoardStatus = 'active' | 'decided' | 'archived';
export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  tagline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  created_by: string;
  home_city: string | null;
  date_start: string | null;
  date_end: string | null;
  budget_min: number | null;
  budget_max: number | null;
  decision_deadline: string | null;
  chosen_proposal_id: string | null;
  status: BoardStatus;
  vibe_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardRole;
  budget_min: number | null;
  budget_max: number | null;
  availability_json: unknown;
  created_at: string;
  profile?: Profile;
}

export interface Invite {
  id: string;
  board_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  invited_by: string;
  accepted_by: string | null;
  accepted_at: string | null;
  message: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  board_id: string;
  created_by: string;
  destination: string;
  date_start: string | null;
  date_end: string | null;
  flexible_dates: boolean;
  cover_image_url: string;
  image_urls: string[];
  vibe_tags: string[];
  lodging_links: string[];
  cost_lodging_total: number;
  cost_transport_total: number;
  cost_food_total: number;
  cost_activities_total: number;
  estimated_cost_per_person: number;
  attendee_count: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  votes?: Vote[];
  comments?: Comment[];
}

export interface Vote {
  id: string;
  board_id: string;
  proposal_id: string;
  user_id: string;
  vote: VoteType;
  score: number | null;
  created_at: string;
  updated_at: string;
  voter?: Profile;
}

export interface Comment {
  id: string;
  board_id: string;
  proposal_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export const VIBE_TAGS = [
  { value: 'party', label: 'Party', color: 'vibe-party' },
  { value: 'chill', label: 'Chill', color: 'vibe-chill' },
  { value: 'adventure', label: 'Adventure', color: 'vibe-adventure' },
  { value: 'culture', label: 'Culture', color: 'vibe-culture' },
  { value: 'nature', label: 'Nature', color: 'vibe-nature' },
  { value: 'luxury', label: 'Luxury', color: 'vibe-luxury' },
  { value: 'beach', label: 'Beach', color: 'vibe-chill' },
  { value: 'city', label: 'City', color: 'vibe-culture' },
  { value: 'food', label: 'Foodie', color: 'vibe-adventure' },
  { value: 'romantic', label: 'Romantic', color: 'vibe-party' },
] as const;
