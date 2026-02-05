import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, DollarSign, ExternalLink, Reply, Link as LinkIcon, Lock, Loader2, Check } from 'lucide-react';
import type { Message, TripProposal, TripVote, TripPhase, ProposalType } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES, voteTypeToScore, scoreToVoteType } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VibeTag } from '@/components/ui/VibeTag';
import { CompareButton } from '@/components/compare/CompareButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP, TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';
import { TemperatureSlider, VoterAvatarsBar } from '@/components/ui/TemperatureSlider';

interface VotingStatusInfo {
  votedCount: number;
  totalMembers: number;
  deadline: Date | null;
  deadlinePassed: boolean;
  allVoted: boolean;
}

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
  replies?: Message[];
  isLocked?: boolean;
  votingStatus?: VotingStatusInfo;
}

export function ProposalMessage({ message, tripId, onViewDetails, isComparing, onToggleCompare, onReply, isAdmin, tripPhase, onProposalUpdated, replies = [], isLocked, votingStatus }: ProposalMessageProps) {
  const { user, profile } = useAuth();
  const proposal = message.proposal;

  // Local state for optimistic voting
  const [localVotes, setLocalVotes] = useState<TripVote[]>(proposal?.votes || []);
  const [locking, setLocking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sync local votes with props when they change
  useEffect(() => {
    setLocalVotes(proposal?.votes || []);
  }, [proposal?.votes]);

  if (!proposal) return null;

  const userVote = localVotes.find((v) => v.user_id === user?.id);

  // Get user's current temperature score (default to 50 if no vote)
  const userTemperature = userVote?.score ?? (userVote ? voteTypeToScore(userVote.vote) : 50);

  // Calculate average temperature from all votes
  const averageTemperature = localVotes.length > 0
    ? localVotes.reduce((sum, v) => sum + (v.score ?? voteTypeToScore(v.vote)), 0) / localVotes.length
    : null;

  const handleTemperatureVote = async (score: number) => {
    if (!user || !profile) return;

    // Derive VoteType from score for backwards compatibility
    const voteType = scoreToVoteType(score);

    // Store previous state for rollback
    const previousVotes = [...localVotes];

    try {
      if (userVote) {
        // Optimistically update vote
        setLocalVotes(prev => prev.map(v =>
          v.user_id === user.id
            ? { ...v, vote: voteType, score }
            : v
        ));
        await supabase.from('trip_votes').update({ vote: voteType, score }).eq('id', userVote.id);
      } else {
        // Optimistically add new vote
        const optimisticVote: TripVote = {
          id: `temp-${Date.now()}`,
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
          score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          voter: profile,
        };
        setLocalVotes(prev => [...prev, optimisticVote]);

        await supabase.from('trip_votes').insert({
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
          score,
        });
      }
    } catch (error) {
      // Revert on error
      setLocalVotes(previousVotes);
      toast.error('Failed to vote');
    }
  };

  const handleLock = async () => {
    if (!user) return;

    setLocking(true);
    try {
      // Update trip with pinned proposal
      await supabase
        .from('trips')
        .update({
          pinned_proposal_id: proposal.id,
          status: 'decided'
        })
        .eq('id', tripId);

      // Post system message
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `Final pick pinned: ${proposal.destination}!`,
      });

      // Notify all trip members about the locked plan
      try {
        await supabase.rpc('notify_trip_members', {
          _trip_id: tripId,
          _actor_id: user.id,
          _type: 'plan_locked',
          _title: 'Plan locked',
          _body: `The plan for ${proposal.destination} has been finalized!`,
          _href: `/app/trip/${tripId}`,
        });
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
      }

      toast.success('Final pick set!');
      onProposalUpdated?.();
    } catch (error) {
      toast.error('Failed to lock destination');
    } finally {
      setLocking(false);
    }
  };

  const authorName = message.author?.name || message.author?.email?.split('@')[0] || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  // Get proposal type info
  const proposalType = proposal.type || 'housing';
  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
  const isDestination = proposal.is_destination;
  const displayTitle = proposal.name || proposal.destination;

  const getActionText = () => {
    if (isDestination) return 'proposed a destination';
    switch (proposalType) {
      case 'housing': return 'suggested housing';
      case 'activity': return 'suggested an activity';
      default: return 'added to itinerary';
    }
  };

  // Get badge info - special case for destinations
  const getBadgeInfo = () => {
    if (isDestination) {
      return { icon: TRIP_PHASE_ICON_MAP.destination, label: 'Destination' };
    }
    return {
      icon: PROPOSAL_TYPE_ICON_MAP[proposalType as ProposalType],
      label: typeInfo?.label || proposalType
    };
  };
  const badgeInfo = getBadgeInfo();

  // Can lock: owner only, destination phase, is a destination proposal
  const canLock = isAdmin && tripPhase === 'destination' && isDestination;

  // Collapsible state: compact when user has voted and not hovering
  const hasVoted = !!userVote;
  const isCompact = hasVoted && !isHovered;

  // Compact locked card for destinations
  if (isLocked && isDestination) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Compact Author header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={message.author?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>

        {/* Compact Locked Card */}
        <motion.div
          layout
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden w-full"
        >
          {/* Compact Cover Image */}
          <div className="aspect-[3/1] relative bg-gradient-to-br from-emerald-500/20 to-green-600/20">
            {proposal.cover_image_url ? (
              <img
                src={proposal.cover_image_url}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-primary/40" />
              </div>
            )}
            {/* Locked badge */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600/90 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Locked</span>
            </div>
          </div>

          {/* Compact Content */}
          <div className="p-3">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{displayTitle}</span>
            </h3>

            <button
              onClick={() => onViewDetails(proposal)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              View Details
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Author header */}
      <div className={cn("flex items-center gap-2", isCompact ? "mb-2" : "mb-3")}>
        <Avatar className={cn(isCompact ? "h-5 w-5" : "h-6 w-6")}>
          <AvatarImage src={message.author?.avatar_url || undefined} />
          <AvatarFallback className={cn("bg-primary/10 text-primary", isCompact ? "text-[10px]" : "text-xs")}>
            {authorInitials}
          </AvatarFallback>
        </Avatar>
        <span className={cn("font-medium text-foreground", isCompact ? "text-xs" : "text-sm")}>{authorName}</span>
        <span className="text-xs text-muted-foreground">{getActionText()}</span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>

      {/* Proposal Card */}
      <motion.div
        layout
        className="bg-card rounded-xl border border-border shadow-card overflow-hidden w-full"
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isCompact ? (
            /* Compact Card Layout */
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex"
            >
              {/* Compact Cover Image */}
              <div className="w-28 flex-shrink-0 aspect-[3/2] relative bg-gradient-to-br from-primary/20 to-accent/20">
                {proposal.cover_image_url ? (
                  <img
                    src={proposal.cover_image_url}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary/40" />
                  </div>
                )}
              </div>

              {/* Compact Content */}
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{displayTitle}</span>
                    </h3>
                    {/* Cost per person (NOT for destinations) */}
                    {!isDestination && proposal.estimated_cost_per_person > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${proposal.estimated_cost_per_person}/person
                      </p>
                    )}
                    {/* Voted indicator */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                      <Check className="h-3 w-3" />
                      <span>Voted: {userTemperature}°</span>
                    </div>
                  </div>

                  {/* Average temp and avatars */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {averageTemperature !== null && (
                      <span className="text-xs font-medium text-muted-foreground">
                        Avg: {Math.round(averageTemperature)}°
                      </span>
                    )}
                    {localVotes.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {localVotes.slice(0, 4).map((vote) => (
                          <Avatar key={vote.id} className="h-5 w-5 border border-background">
                            <AvatarImage src={vote.voter?.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {(vote.voter?.name || vote.voter?.email || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {localVotes.length > 4 && (
                          <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] text-muted-foreground">
                            +{localVotes.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Full Expanded Card Layout */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
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
                {badgeInfo && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1">
                    <SFSymbol name={badgeInfo.icon} size="sm" className="invert" />
                    <span>{badgeInfo.label}</span>
                  </div>
                )}
                {/* Vibe tags - show for destinations */}
                {isDestination && proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
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

                {/* Description */}
                {proposal.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{proposal.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4 min-h-[20px]">
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
                  {/* Cost per person (NOT for destinations) */}
                  {!isDestination && proposal.estimated_cost_per_person > 0 && (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${proposal.estimated_cost_per_person}/person
                    </span>
                  )}
                </div>

                {/* Voter avatars bar */}
                <div className="mb-3">
                  <VoterAvatarsBar
                    votes={localVotes}
                    averageScore={averageTemperature}
                    size="sm"
                  />
                </div>

                {/* Temperature Slider Voting */}
                <div className="mb-3">
                  <TemperatureSlider
                    value={userTemperature}
                    onChange={handleTemperatureVote}
                    size="sm"
                  />
                </div>

                {/* Compare button - only for non-destination proposals (housing/activities with prices) */}
                {onToggleCompare && !isDestination && (
                  <div className="mb-3">
                    <CompareButton
                      isComparing={isComparing || false}
                      onToggle={onToggleCompare}
                    />
                  </div>
                )}

                {/* View Link button for items with URL */}
                {proposal.url && (
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
                  {canLock && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-vote-in hover:text-vote-in hover:bg-vote-in/10"
                      onClick={handleLock}
                      disabled={locking}
                    >
                      {locking ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          Locking...
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          Lock
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Inline Replies */}
              {replies.length > 0 && (
                <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/30">
                  {replies.map((reply) => {
                    const replyAuthorName = reply.author?.name || reply.author?.email?.split('@')[0] || 'Unknown';
                    const replyAuthorInitials = replyAuthorName.slice(0, 2).toUpperCase();
                    return (
                      <div key={reply.id} className="flex items-start gap-2">
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarImage src={reply.author?.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {replyAuthorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground">{replyAuthorName}: </span>
                          <span className="text-xs text-muted-foreground break-words">{reply.body}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
