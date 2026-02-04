import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, DollarSign, ExternalLink, Trophy, Loader2, Users, Trash2, Navigation, Link as LinkIcon, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VibeTag } from '@/components/ui/VibeTag';
import { ProposalReactions } from '@/components/proposal/ProposalReactions';
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
import type { TripProposal, VoteType, TripPhase } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { IncludeToggle, IncludedBadge } from '@/components/proposal/IncludeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProposalDetailModalProps {
  open: boolean;
  onClose: () => void;
  proposal: TripProposal | null;
  tripId: string;
  isAdmin: boolean;
  onPinned: () => void;
  onDeleted?: () => void;
  tripPhase?: TripPhase;
}

export function ProposalDetailModal({
  open,
  onClose,
  proposal,
  tripId,
  isAdmin,
  onPinned,
  onDeleted,
  tripPhase = 'destination',
}: ProposalDetailModalProps) {
  const { user } = useAuth();
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canDelete = proposal && (proposal.created_by === user?.id || isAdmin);

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
          await supabase.from('trip_votes').delete().eq('id', userVote.id);
        } else {
          await supabase.from('trip_votes').update({ vote: voteType }).eq('id', userVote.id);
        }
      } else {
        await supabase.from('trip_votes').insert({
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
        });
      }
      onPinned(); // Refresh data
    } catch (error) {
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

      // Post system message
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `🎉 Final pick pinned: ${proposal.destination}!`,
      });

      // Notify all trip members about the locked plan
      try {
        await supabase.rpc('notify_trip_members', {
          _trip_id: tripId,
          _actor_id: user.id,
          _type: 'plan_locked',
          _title: 'Plan locked ✅',
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

  const totalCost =
    proposal.cost_lodging_total +
    proposal.cost_transport_total +
    proposal.cost_food_total +
    proposal.cost_activities_total;

  // Get proposal type info
  const proposalType = proposal.type || 'full_itinerary';
  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
  const isFullItinerary = proposalType === 'full_itinerary';
  const isDestination = proposal.is_destination;
  const displayTitle = proposal.name || proposal.destination;

  // Get badge info - special case for destinations
  const getBadgeInfo = () => {
    if (isDestination) {
      return { emoji: '🌍', label: 'Destination' };
    }
    return typeInfo;
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
              <span>{badgeInfo.emoji}</span>
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
            {/* Vibe tags - only for full itinerary */}
            {isFullItinerary && proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
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
            {/* Description for quick posts */}
            {!isFullItinerary && proposal.description && (
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
              {isFullItinerary && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{proposal.attendee_count} people</span>
                </div>
              )}
              {/* Price range for food spots */}
              {proposalType === 'food_spot' && proposal.price_range && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{proposal.price_range}</span>
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

            {/* URL link for quick posts */}
            {!isFullItinerary && proposal.url && (
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

            {/* Cost per person highlight - only for full itinerary (NOT destinations) */}
            {isFullItinerary && !isDestination && proposal.estimated_cost_per_person > 0 && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-sm text-muted-foreground mb-1">Estimated cost per person</p>
                <p className="text-3xl font-bold text-primary">${proposal.estimated_cost_per_person}</p>
              </div>
            )}

            {/* Vote buttons */}
            <div className="flex gap-3">
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
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Quick reactions</p>
              <ProposalReactions proposalId={proposal.id} tripId={tripId} />
            </div>

            {/* Cost Breakdown - only for full itinerary */}
            {isFullItinerary && totalCost > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Cost Breakdown</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {proposal.cost_lodging_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Lodging</span>
                      <span className="font-medium">${proposal.cost_lodging_total}</span>
                    </div>
                  )}
                  {proposal.cost_transport_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Transport</span>
                      <span className="font-medium">${proposal.cost_transport_total}</span>
                    </div>
                  )}
                  {proposal.cost_food_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Food</span>
                      <span className="font-medium">${proposal.cost_food_total}</span>
                    </div>
                  )}
                  {proposal.cost_activities_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Activities</span>
                      <span className="font-medium">${proposal.cost_activities_total}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lodging Links - only for full itinerary */}
            {isFullItinerary && proposal.lodging_links && proposal.lodging_links.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Lodging Options</h4>
                <div className="space-y-2">
                  {proposal.lodging_links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <span className="truncate flex-1">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Include in Plan Toggle (Admin only, Phase 2+, non-destination proposals) */}
            {isAdmin &&
              (tripPhase === 'itinerary' || tripPhase === 'finalize') &&
              !proposal.is_destination && (
                <IncludeToggle
                  proposalId={proposal.id}
                  included={proposal.included}
                  onToggled={onPinned}
                  className="w-full"
                />
              )}

            {/* Show included badge for non-admins */}
            {!isAdmin && proposal.included && !proposal.is_destination && (
              <div className="flex justify-center">
                <IncludedBadge />
              </div>
            )}

            {/* Pin as Final Pick (Admin only - only show in destination phase or for ready phase) */}
            {isAdmin && tripPhase === 'destination' && (
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

            {/* Delete Proposal (Creator or Admin) */}
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
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function VoteButton({ type, count, isActive, onClick }: VoteButtonProps) {
  const config = {
    in: {
      icon: ThumbsUp,
      label: "I'm in",
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    },
    maybe: {
      icon: Minus,
      label: 'Maybe',
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    },
    out: {
      icon: ThumbsDown,
      label: "I'm out",
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-900/50',
    },
  };

  const { icon: Icon, label, gradient, bg, text, border, hoverBg } = config[type];

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
      <span className="text-sm">{label}</span>
      <span className={cn('text-xs font-normal', isActive ? 'text-white/80' : 'opacity-60')}>{count} votes</span>
    </button>
  );
}
