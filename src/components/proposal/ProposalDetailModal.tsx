import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, ExternalLink, Trophy, Loader2, Trash2, Navigation, Link as LinkIcon, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VibeTag } from '@/components/ui/VibeTag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TripProposal, TripVote, VoteType, TripPhase, ProposalType } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP, TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';

interface ProposalDetailModalProps {
  open: boolean;
  onClose: () => void;
  proposal: TripProposal | null;
  tripId: string;
  isAdmin: boolean; // Actually isOwner - only owner can lock/pin
  onPinned: () => void;
  onDeleted?: () => void;
  tripPhase?: TripPhase;
}

export function ProposalDetailModal({
  open,
  onClose,
  proposal,
  tripId,
  isAdmin: isOwner, // Renamed for clarity - only owner can perform admin actions
  onPinned,
  onDeleted,
  tripPhase = 'destination',
}: ProposalDetailModalProps) {
  const { user, profile } = useAuth();
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local state for optimistic voting
  const [localVotes, setLocalVotes] = useState<TripVote[]>(proposal?.votes || []);

  // Sync local votes with props when they change
  useEffect(() => {
    setLocalVotes(proposal?.votes || []);
  }, [proposal?.votes]);

  const canDelete = proposal && (proposal.created_by === user?.id || isOwner);

  if (!proposal) return null;

  const userVote = localVotes.find((v) => v.user_id === user?.id);
  const votesByType = {
    in: localVotes.filter((v) => v.vote === 'in'),
    maybe: localVotes.filter((v) => v.vote === 'maybe'),
    out: localVotes.filter((v) => v.vote === 'out'),
  };

  const handleVote = async (voteType: VoteType) => {
    if (!user || !profile) return;

    // Store previous state for rollback
    const previousVotes = [...localVotes];

    try {
      if (userVote) {
        if (userVote.vote === voteType) {
          // Optimistically remove vote
          setLocalVotes(prev => prev.filter(v => v.user_id !== user.id));
          await supabase.from('trip_votes').delete().eq('id', userVote.id);
        } else {
          // Optimistically update vote
          setLocalVotes(prev => prev.map(v =>
            v.user_id === user.id
              ? { ...v, vote: voteType }
              : v
          ));
          await supabase.from('trip_votes').update({ vote: voteType }).eq('id', userVote.id);
        }
      } else {
        // Optimistically add new vote
        const optimisticVote: TripVote = {
          id: `temp-${Date.now()}`,
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
          score: null,
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
        });
      }
      onPinned(); // Refresh data
    } catch (error) {
      // Revert on error
      setLocalVotes(previousVotes);
      toast.error('Failed to vote');
    }
  };

  const handlePin = async () => {
    if (!user) return;
    
    setPinning(true);
    try {
      // Update trip with pinned proposal
      await supabase
        .from('trips')
        .update({ 
          pinned_proposal_id: proposal.id,
          status: 'decided'
        })
        .eq('id', tripId);

      // Post system message (plain text, icons rendered at display time)
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
        // Non-blocking
      }

      toast.success('Final pick set!');
      onPinned();
      onClose();
    } catch (error) {
      toast.error('Failed to pin proposal');
    } finally {
      setPinning(false);
    }
  };

  const handleDeleteProposal = async () => {
    if (!proposal) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('trip_proposals')
        .delete()
        .eq('id', proposal.id);

      if (error) throw error;

      toast.success('Proposal deleted');
      onDeleted?.();
      onClose();
    } catch (error) {
      toast.error('Failed to delete proposal');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get proposal type info
  const proposalType = proposal.type || 'housing';
  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
  const isDestination = proposal.is_destination;
  const displayTitle = proposal.name || proposal.destination;

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

  // Generate Google Maps directions URL
  const getDirectionsUrl = () => {
    const query = encodeURIComponent(proposal.address || proposal.destination);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Cover Image */}
        <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
          {proposal.cover_image_url && (
            <img
              src={proposal.cover_image_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Type badge */}
          {badgeInfo && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-medium flex items-center gap-1.5">
              <SFSymbol name={badgeInfo.icon} size="sm" className="invert" />
              <span>{badgeInfo.label}</span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-display font-bold text-white mb-1 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {displayTitle}
            </h2>
            {/* Show destination as subtitle if name is present and different */}
            {proposal.name && proposal.destination && proposal.name !== proposal.destination && (
              <p className="text-white/80 text-sm mb-2">{proposal.destination}</p>
            )}
            {/* Vibe tags - show for destinations */}
            {isDestination && proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {proposal.vibe_tags.map((vibe) => (
                  <VibeTag key={vibe} vibe={vibe as any} />
                ))}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 space-y-6">
            {/* Description */}
            {proposal.description && (
              <div className="text-sm text-muted-foreground">
                {proposal.description}
              </div>
            )}

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              {(proposal.date_start || proposal.date_end) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {proposal.date_start && format(new Date(proposal.date_start), 'MMM d')}
                    {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d, yyyy')}`}
                  </span>
                  {proposal.flexible_dates && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">Flexible</span>
                  )}
                </div>
              )}
            </div>

            {/* Address with Get Directions */}
            {proposal.address && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{proposal.address}</p>
                  <a
                    href={getDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Get Directions
                  </a>
                </div>
              </div>
            )}

            {/* URL link */}
            {proposal.url && (
              <a
                href={proposal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <LinkIcon className="h-4 w-4 text-primary" />
                <span className="truncate flex-1 text-primary">{proposal.url}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            )}

            {/* Cost per person highlight (NOT for destinations) */}
            {!isDestination && proposal.estimated_cost_per_person > 0 && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Cost per person</p>
                <p className="text-3xl font-bold text-primary">${proposal.estimated_cost_per_person}</p>
              </div>
            )}

            {/* Vote buttons */}
            <div className="flex gap-3">
              <VoteButton
                type="in"
                votes={votesByType.in}
                isActive={userVote?.vote === 'in'}
                onClick={() => handleVote('in')}
              />
              <VoteButton
                type="maybe"
                votes={votesByType.maybe}
                isActive={userVote?.vote === 'maybe'}
                onClick={() => handleVote('maybe')}
              />
              <VoteButton
                type="out"
                votes={votesByType.out}
                isActive={userVote?.vote === 'out'}
                onClick={() => handleVote('out')}
              />
            </div>

            {/* Pin as Final Pick (Owner only - only show in destination phase) */}
            {isOwner && tripPhase === 'destination' && (
              <Button
                onClick={handlePin}
                disabled={pinning}
                className="w-full bg-vote-in hover:bg-vote-in/90 text-white"
                size="lg"
              >
                {pinning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting final pick...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Pin as Final Pick
                  </>
                )}
              </Button>
            )}

            {/* Delete Proposal (Creator or Owner) */}
            {canDelete && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Proposal
              </Button>
            )}
          </div>
        </ScrollArea>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the proposal for "{proposal.destination}" and all associated votes and comments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProposal}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

interface VoteButtonProps {
  type: VoteType;
  votes: TripVote[];
  isActive: boolean;
  onClick: () => void;
}

function VoterAvatars({ votes, isActive }: { votes: TripVote[]; isActive: boolean }) {
  const maxVisible = 4;
  const visibleVotes = votes.slice(0, maxVisible);
  const overflowCount = votes.length - maxVisible;

  if (votes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center -space-x-1.5">
      {visibleVotes.map((vote, index) => {
        const voter = vote.voter;
        const initials = voter?.name?.slice(0, 2).toUpperCase() || voter?.email?.slice(0, 2).toUpperCase() || '?';
        return (
          <Avatar
            key={vote.id}
            className={cn(
              'h-6 w-6 ring-2',
              isActive ? 'ring-white/30' : 'ring-background'
            )}
            style={{ zIndex: maxVisible - index }}
          >
            <AvatarImage src={voter?.avatar_url || undefined} />
            <AvatarFallback className={cn(
              'text-[10px] font-medium',
              isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflowCount > 0 && (
        <div
          className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ring-2',
            isActive
              ? 'bg-white/20 text-white ring-white/30'
              : 'bg-muted text-muted-foreground ring-background'
          )}
          style={{ zIndex: 0 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

function VoteButton({ type, votes, isActive, onClick }: VoteButtonProps) {
  const config = {
    in: {
      icon: ThumbsUp,
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    },
    maybe: {
      icon: Minus,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    },
    out: {
      icon: ThumbsDown,
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-900/50',
    },
  };

  const { icon: Icon, gradient, bg, text, border, hoverBg } = config[type];
  const voteCount = votes.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all duration-200 border',
        isActive
          ? `bg-gradient-to-r ${gradient} text-white border-transparent shadow-lg scale-[1.02]`
          : `${bg} ${text} ${border} ${hoverBg}`
      )}
    >
      <Icon className={cn('h-6 w-6', isActive && 'drop-shadow-sm')} />
      {voteCount > 0 && (
        <span className={cn(
          'min-w-[1.5rem] h-6 flex items-center justify-center rounded-full text-sm font-bold',
          isActive ? 'bg-white/20' : 'bg-current/10'
        )}>
          {voteCount}
        </span>
      )}
    </button>
  );
}
