// roamiii type definitions
export type TripStatus = 'planning' | 'decided';
export type TripRole = 'owner' | 'admin' | 'member';
export type MessageType = 'text' | 'proposal' | 'system' | 'driver' | 'poll';
export type PollType = 'yes_no' | 'multiple_choice';
export type VoteType = 'in' | 'maybe' | 'out';
export type MemberStatus = 'active' | 'removed';
export type ProposalType = 'housing' | 'activity';
export type TripPhase = 'building' | 'destination' | 'itinerary' | 'transportation' | 'finalize' | 'ready';
export type PlanningMode = 'collaborative' | 'freeform';
export type TravelMode = 'flying' | 'driving';

export const PROPOSAL_TYPES = [
  { value: 'housing', label: 'Housing', description: 'Where you\'ll stay' },
  { value: 'activity', label: 'Activity', description: 'Things to do' },
] as const;

export const TRIP_PHASES = [
  { value: 'building', label: 'Building', step: 0 },
  { value: 'destination', label: 'Pick Destination', step: 1 },
  { value: 'itinerary', label: 'Build Itinerary', step: 2 },
  { value: 'transportation', label: 'Transportation', step: 3 },
  { value: 'finalize', label: 'Finalize & Book', step: 4 },
  { value: 'ready', label: 'Ready!', step: 5 },
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
  travel_mode: TravelMode | null;
  destination_voting_deadline: string | null;
  itinerary_voting_deadline: string | null;
  flight_cost: number | null;
  flight_description: string | null;
  planning_mode: PlanningMode;
  flight_booking_url: string | null;
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
  travel_mode: TravelMode | null;
  is_driver: boolean;
  car_capacity: number | null;
  rides_with_id: string | null;
  flight_cost: number | null;
  flight_description: string | null;
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
  driver_id: string | null;
  created_at: string;
  author?: Profile;
  proposal?: TripProposal;
  reactions?: MessageReaction[];
  reply_to?: MessageReplyPreview | null;
  driver?: TripMember;
  poll?: Poll;
}

export interface Poll {
  id: string;
  message_id: string;
  trip_id: string;
  question: string;
  poll_type: PollType;
  options: string[];
  expires_at: string | null;
  created_at: string;
  votes?: PollVote[];
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
  voter?: Profile;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
  mentioned_user?: Profile;
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
  booked_by: string | null;
  booked_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  votes?: TripVote[];
  reactions?: ProposalReaction[];
  booker?: Profile;
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

// Reaction icons are now handled via icon-mappings.ts

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

// Temperature voting helper functions
export function scoreToLabel(score: number): string {
  if (score <= 30) return "Not feeling it";
  if (score <= 60) return "Maybe";
  return "I'm in!";
}

export function voteTypeToScore(vote: VoteType): number {
  switch (vote) {
    case 'out': return 15;
    case 'maybe': return 50;
    case 'in': return 85;
  }
}

export function scoreToVoteType(score: number): VoteType {
  if (score <= 30) return 'out';
  if (score <= 60) return 'maybe';
  return 'in';
}

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

// Expense types
export type ExpenseCategory = 'food' | 'transport' | 'housing' | 'activity' | 'other';

export interface TripExpense {
  id: string;
  trip_id: string;
  paid_by: string;
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  receipt_url: string | null;
  expense_date: string;
  created_at: string;
  payer?: Profile;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
  user?: Profile;
}

export interface SettlementSummary {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_user?: Profile;
  to_user?: Profile;
}

// Activity suggestion types
export type SuggestionCategory = 'activity' | 'food' | 'experience' | 'nightlife';

export interface ActivitySuggestion {
  name: string;
  description: string;
  category: SuggestionCategory;
  estimatedCost: number;
  duration: string;
  vibes: string[];
}

// Trip template types
export type TemplateCategory = 'beach' | 'city' | 'adventure' | 'culture' | 'nature' | 'romantic';

export interface TripTemplate {
  id: string;
  name: string;
  description: string | null;
  destination: string;
  cover_image_url: string;
  duration_days: number;
  vibe_tags: string[];
  budget_estimate_per_person: number | null;
  suggested_activities: ActivitySuggestion[];
  suggested_housing: { name: string; url: string; price_per_night: number }[];
  best_time_to_visit: string | null;
  local_tips: string | null;
  is_featured: boolean;
  category: TemplateCategory | null;
  created_at: string;
}
