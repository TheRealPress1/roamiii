import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, ExternalLink, Trophy, Loader2, Trash2, Navigation, Link as LinkIcon } from 'lucide-react';
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
import type { TripProposal, TripVote, TripPhase, ProposalType } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES, voteTypeToScore, scoreToVoteType } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP, TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';
import { TemperatureSlider, TemperatureDisplay } from '@/components/ui/TemperatureSlider';

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

            {/* Temperature Slider Voting */}
            <div className="space-y-3">
              <TemperatureSlider
                value={userTemperature}
                onChange={handleTemperatureVote}
                size="md"
              />
              <TemperatureDisplay
                averageScore={averageTemperature}
                voteCount={localVotes.length}
                size="md"
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

