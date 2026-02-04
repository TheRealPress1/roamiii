import type { SFSymbolName } from '@/components/icons';
import type { ReactionType, VoteType, TripPhase, ProposalType } from './tripchat-types';

// Vibe tag to SF Symbol mapping
export const VIBE_ICON_MAP: Record<string, SFSymbolName> = {
  party: 'party.popper.fill',
  chill: 'leaf.fill',
  adventure: 'figure.hiking',
  culture: 'building.columns.fill',
  nature: 'tree.fill',
  luxury: 'sparkle',
  beach: 'beach.umbrella.fill',
  city: 'building.2.fill',
  food: 'fork.knife',
  romantic: 'heart.fill',
};

// Proposal type to SF Symbol mapping
export const PROPOSAL_TYPE_ICON_MAP: Record<ProposalType, SFSymbolName> = {
  housing: 'house.fill',
  activity: 'target',
};

// Trip phase to SF Symbol mapping
export const TRIP_PHASE_ICON_MAP: Record<TripPhase, SFSymbolName> = {
  destination: 'globe.europe.africa.fill',
  transportation: 'car.fill',
  itinerary: 'list.bullet.clipboard.fill',
  finalize: 'checkmark.circle.fill',
  ready: 'party.popper.fill',
};

// Reaction type to SF Symbol mapping
export const REACTION_ICON_MAP: Record<ReactionType, SFSymbolName> = {
  interested: 'hand.thumbsup.fill',
  love: 'heart.fill',
  nope: 'hand.thumbsdown.fill',
};

// Vote type to SF Symbol mapping
export const VOTE_INDICATOR_ICON_MAP: Record<VoteType, SFSymbolName> = {
  in: 'checkmark.circle.fill',
  maybe: 'questionmark.circle.fill',
  out: 'xmark.circle.fill',
};

// Cover preset to SF Symbol mapping
export const COVER_PRESET_ICON_MAP: Record<string, SFSymbolName> = {
  skiing: 'figure.skiing.downhill',
  beach: 'beach.umbrella.fill',
  cruise: 'ferry.fill',
  city: 'building.2.fill',
  mountains: 'mountain.2.fill',
  roadtrip: 'car.fill',
  europe: 'castle.fill',
  party: 'party.popper.fill',
  nature: 'tree.fill',
};
