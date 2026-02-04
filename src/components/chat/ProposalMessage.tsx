import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { MapPin, Calendar, DollarSign, ExternalLink, Reply, Link as LinkIcon } from 'lucide-react';
import type { Message, TripProposal, VoteType, TripPhase } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VibeTag } from '@/components/ui/VibeTag';
import { ProposalReactions } from '@/components/proposal/ProposalReactions';
import { CompareButton } from '@/components/compare/CompareButton';
import { IncludeToggle, IncludedBadge } from '@/components/proposal/IncludeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProposalMessageProps {
  message: Message;
  tripId: string;
  onViewDetails: (proposal: TripProposal) => void;
  isComparing?: boolean;
  onToggleCompare?: () => void;
  onReply?: (message: Message) => void;
  isAdmin?: boolean;
  tripPhase?: TripPhase;
  onProposalUpdated?: () => void;
}

export function ProposalMessage({ message, tripId, onViewDetails, isComparing, onToggleCompare, onReply, isAdmin, tripPhase, onProposalUpdated }: ProposalMessageProps) {
  const { user } = useAuth();
  const proposal = message.proposal;

  // Show include toggle in itinerary/finalize phases for non-destination proposals
  const showIncludeToggle = isAdmin &&
    tripPhase &&
    (tripPhase === 'itinerary' || tripPhase === 'finalize') &&
    proposal &&
    !proposal.is_destination;

  if (!proposal) return null;

  const votes = proposal.votes || [];
  const userVote = votes.find((v) => v.user_id === user?.id);
  const voteCounts = {
    in: votes.filter((v) => v.vote === 'in').length,
    maybe: votes.filter((v) => v.vote === 'maybe').length,
    out: votes.filter((v) => v.vote === 'out').length,
  };

  const handleVote = async (voteType: VoteType) => {
    if (!user) return;

    try {
      if (userVote) {
        if (userVote.vote === voteType) {
          // Remove vote
          await supabase.from('trip_votes').delete().eq('id', userVote.id);
        } else {
          // Update vote
          await supabase.from('trip_votes').update({ vote: voteType }).eq('id', userVote.id);
        }
      } else {
        // Create vote
        await supabase.from('trip_votes').insert({
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
        });
      }
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const authorName = message.author?.name || message.author?.email?.split('@')[0] || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  // Get proposal type info
  const proposalType = proposal.type || 'full_itinerary';
  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
  const isFullItinerary = proposalType === 'full_itinerary';
  const displayTitle = proposal.name || proposal.destination;

  const getActionText = () => {
    switch (proposalType) {
      case 'place': return 'suggested a place';
      case 'activity': return 'suggested an activity';
      case 'food_spot': return 'suggested a food spot';
      default: return 'proposed a trip';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3"
    >
      {/* Author header */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-6 w-6">
          <AvatarImage src={message.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {authorInitials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">{authorName}</span>
        <span className="text-xs text-muted-foreground">{getActionText()}</span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>

      {/* Proposal Card */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden max-w-md ml-8">
        {/* Cover Image */}
        <div className="aspect-[16/9] relative bg-gradient-to-br from-primary/20 to-accent/20">
          {proposal.cover_image_url ? (
            <img
              src={proposal.cover_image_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-primary/40" />
            </div>
          )}
          {/* Type badge */}
          {typeInfo && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1">
              <span>{typeInfo.emoji}</span>
              <span>{typeInfo.label}</span>
            </div>
          )}
          {/* Vibe tags - only for full itinerary */}
          {isFullItinerary && proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {proposal.vibe_tags.slice(0, 3).map((vibe) => (
                <VibeTag key={vibe} vibe={vibe as any} size="sm" />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {displayTitle}
          </h3>

          {/* Show destination as subtitle if name is present and different */}
          {proposal.name && proposal.destination && proposal.name !== proposal.destination && (
            <p className="text-sm text-muted-foreground mb-2">{proposal.destination}</p>
          )}

          {/* Description for quick posts */}
          {!isFullItinerary && proposal.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{proposal.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            {(proposal.date_start || proposal.date_end) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {proposal.date_start
                  ? format(new Date(proposal.date_start), 'MMM d')
                  : 'TBD'}
                {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d')}`}
              </span>
            )}
            {proposal.flexible_dates && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Flexible</span>
            )}
            {/* Price range for food spots, cost per person for full itineraries */}
            {proposalType === 'food_spot' && proposal.price_range ? (
              <span className="font-medium text-foreground">{proposal.price_range}</span>
            ) : isFullItinerary && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                ${proposal.estimated_cost_per_person}/person
              </span>
            )}
          </div>

          {/* Vote buttons */}
          <div className="flex gap-2 mb-3">
            <VoteButton
              type="in"
              count={voteCounts.in}
              isActive={userVote?.vote === 'in'}
              onClick={() => handleVote('in')}
            />
            <VoteButton
              type="maybe"
              count={voteCounts.maybe}
              isActive={userVote?.vote === 'maybe'}
              onClick={() => handleVote('maybe')}
            />
            <VoteButton
              type="out"
              count={voteCounts.out}
              isActive={userVote?.vote === 'out'}
              onClick={() => handleVote('out')}
            />
          </div>

          {/* Quick reactions */}
          <div className="mb-3">
            <ProposalReactions proposalId={proposal.id} tripId={tripId} />
          </div>

          {/* Compare button */}
          {onToggleCompare && (
            <div className="mb-3">
              <CompareButton
                isComparing={isComparing || false}
                onToggle={onToggleCompare}
              />
            </div>
          )}

          {/* Include Toggle for Admins (Phase 2+) */}
          {showIncludeToggle && (
            <div className="mb-3">
              <IncludeToggle
                proposalId={proposal.id}
                included={proposal.included}
                onToggled={onProposalUpdated}
              />
            </div>
          )}

          {/* Show included badge for non-admins */}
          {!isAdmin && proposal.included && !proposal.is_destination && (
            <div className="mb-3">
              <IncludedBadge />
            </div>
          )}

          {/* View Link button for quick posts with URL */}
          {!isFullItinerary && proposal.url && (
            <div className="mb-3">
              <a
                href={proposal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm text-primary transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                View Link
              </a>
            </div>
          )}

          <div className="flex gap-2">
            {onReply && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3.5 w-3.5 mr-1" />
                Reply
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-primary hover:text-primary", onReply ? "flex-1" : "w-full")}
              onClick={() => onViewDetails(proposal)}
            >
              View Details
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface VoteButtonProps {
  type: VoteType;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function VoteButton({ type, count, isActive, onClick }: VoteButtonProps) {
  const config = {
    in: { emoji: '✅', label: 'In', bg: 'bg-vote-in-bg', text: 'text-vote-in', activeBg: 'bg-vote-in' },
    maybe: { emoji: '🤔', label: 'Maybe', bg: 'bg-vote-maybe-bg', text: 'text-vote-maybe', activeBg: 'bg-vote-maybe' },
    out: { emoji: '❌', label: 'Out', bg: 'bg-vote-out-bg', text: 'text-vote-out', activeBg: 'bg-vote-out' },
  };

  const { emoji, label, bg, text, activeBg } = config[type];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        isActive
          ? `${activeBg} text-white`
          : `${bg} ${text} hover:opacity-80`
      )}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}
