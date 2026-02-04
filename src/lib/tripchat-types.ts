// roamiii type definitions
export type TripStatus = 'planning' | 'decided';
export type TripRole = 'owner' | 'admin' | 'member';
export type MessageType = 'text' | 'proposal' | 'system';
export type VoteType = 'in' | 'maybe' | 'out';
export type MemberStatus = 'active' | 'removed';
export type ProposalType = 'place' | 'activity' | 'food_spot' | 'full_itinerary';
export type TripPhase = 'destination' | 'itinerary' | 'finalize' | 'ready';

export const PROPOSAL_TYPES = [
  { value: 'place', label: 'Place', emoji: '📍', description: 'A destination to visit' },
  { value: 'activity', label: 'Activity', emoji: '🎯', description: 'Something to do' },
  { value: 'food_spot', label: 'Food Spot', emoji: '🍽️', description: 'Restaurant, cafe, bar' },
  { value: 'full_itinerary', label: 'Full Itinerary', emoji: '🗺️', description: 'Complete trip plan' },
] as const;

export const TRIP_PHASES = [
  { value: 'destination', label: 'Pick Destination', emoji: '🌍', step: 1 },
  { value: 'itinerary', label: 'Build Itinerary', emoji: '📋', step: 2 },
  { value: 'finalize', label: 'Finalize & Book', emoji: '✅', step: 3 },
  { value: 'ready', label: 'Ready!', emoji: '🎉', step: 4 },
] as const;

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  created_by: string;
  date_start: string | null;
  date_end: string | null;
  flexible_dates: boolean;
  home_city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  decision_deadline: string | null;
  status: TripStatus;
  pinned_proposal_id: string | null;
  join_code: string;
  cover_image_url: string | null;
  phase: TripPhase;
  locked_destination_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripRole;
  status: MemberStatus;
  budget_min: number | null;
  budget_max: number | null;
  availability_json: unknown;
  created_at: string;
  removed_at: string | null;
  removed_by: string | null;
  profile?: Profile;
}

export interface Message {
  id: string;
  trip_id: string;
  user_id: string;
  type: MessageType;
  body: string | null;
  proposal_id: string | null;
  reply_to_id: string | null;
  created_at: string;
  author?: Profile;
  proposal?: TripProposal;
  reactions?: MessageReaction[];
  reply_to?: MessageReplyPreview | null;
}

// Lightweight preview of a message for reply context
export interface MessageReplyPreview {
  id: string;
  type: MessageType;
  body: string | null;
  user_id: string;
  author?: Profile;
  proposal?: {
    id: string;
    destination: string;
  };
}

export interface TripProposal {
  id: string;
  trip_id: string;
  created_by: string;
  type: ProposalType;
  destination: string;
  name: string | null;
  description: string | null;
  address: string | null;
  url: string | null;
  price_range: string | null;
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
  included: boolean;
  is_destination: boolean;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  votes?: TripVote[];
  reactions?: ProposalReaction[];
}

export interface TripVote {
  id: string;
  trip_id: string;
  proposal_id: string;
  user_id: string;
  vote: VoteType;
  score: number | null;
  created_at: string;
  updated_at: string;
  voter?: Profile;
}

export interface ProposalComment {
  id: string;
  proposal_id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TripInvite {
  id: string;
  trip_id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string;
  message: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface TripWithMeta extends Trip {
  member_count: number;
  proposal_count: number;
  last_message?: Message | null;
}

export const VIBE_TAGS = [
  { value: 'party', label: '🎉 Party', color: 'vibe-party' },
  { value: 'chill', label: '🌴 Chill', color: 'vibe-chill' },
  { value: 'adventure', label: '🏔️ Adventure', color: 'vibe-adventure' },
  { value: 'culture', label: '🏛️ Culture', color: 'vibe-culture' },
  { value: 'nature', label: '🌿 Nature', color: 'vibe-nature' },
  { value: 'luxury', label: '✨ Luxury', color: 'vibe-luxury' },
  { value: 'beach', label: '🏖️ Beach', color: 'vibe-chill' },
  { value: 'city', label: '🌆 City', color: 'vibe-culture' },
  { value: 'food', label: '🍜 Foodie', color: 'vibe-adventure' },
  { value: 'romantic', label: '💕 Romantic', color: 'vibe-party' },
] as const;

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '🙌', '✈️', '🏝️'] as const;

// Proposal reaction types
export type ReactionType = 'interested' | 'love' | 'nope';

export interface ProposalReaction {
  id: string;
  proposal_id: string;
  trip_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  updated_at: string;
}

// Proposal compare types
export interface ProposalCompare {
  id: string;
  trip_id: string;
  proposal_id: string;
  user_id: string;
  created_at: string;
}

export type CompareSortOption = 
  | 'cost_asc' 
  | 'interested_desc' 
  | 'love_desc' 
  | 'score_desc';

// Notification types
export type NotificationType = 'member_joined' | 'proposal_posted' | 'plan_locked' | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  trip_id: string | null;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Profile;
}
