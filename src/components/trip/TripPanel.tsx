import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, MapPin, Clock, Trophy, ChevronRight, MoreVertical, Trash2, UserMinus, Crown, Shield, ImageIcon, Lock, Check, Eye, Car } from 'lucide-react';
import type { Trip, TripMember, TripProposal } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES, TRIP_PHASES } from '@/lib/tripchat-types';
import { PhaseActions } from '@/components/trip/PhaseActions';
import { DeadlineSettings } from '@/components/trip/DeadlineSettings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface TripPanelProps {
  trip: Trip;
  members: TripMember[];
  proposals: TripProposal[];
  onInvite: () => void;
  onViewProposal: (proposal: TripProposal) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  onDeleteTrip?: () => void;
  onRemoveMember?: (member: TripMember) => void;
  onEditCover?: () => void;
  onOpenLockDestination?: (proposal: TripProposal) => void;
  onOpenFinalizeView?: () => void;
  onOpenTransportation?: () => void;
  onPhaseChanged?: () => void;
  lockedDestination?: TripProposal | null;
  destinationProposals?: TripProposal[];
  includedProposals?: TripProposal[];
}

export function TripPanel({
  trip,
  members,
  proposals,
  onInvite,
  onViewProposal,
  isOwner,
  isAdmin,
  onDeleteTrip,
  onRemoveMember,
  onEditCover,
  onOpenLockDestination,
  onOpenFinalizeView,
  onOpenTransportation,
  onPhaseChanged,
  lockedDestination,
  destinationProposals = [],
  includedProposals = [],
}: TripPanelProps) {
  const { user } = useAuth();
  const hasDeadline = trip.decision_deadline && new Date(trip.decision_deadline) > new Date();
  const currentPhase = trip.phase || 'destination';
  const phaseInfo = TRIP_PHASES.find(p => p.value === currentPhase);
  
  // Sort proposals by vote count
  const sortedProposals = [...proposals].sort((a, b) => {
    const aScore = (a.votes || []).filter((v) => v.vote === 'in').length * 2 +
      (a.votes || []).filter((v) => v.vote === 'maybe').length;
    const bScore = (b.votes || []).filter((v) => v.vote === 'in').length * 2 +
      (b.votes || []).filter((v) => v.vote === 'maybe').length;
    return bScore - aScore;
  });

  const pinnedProposal = trip.pinned_proposal_id
    ? proposals.find((p) => p.id === trip.pinned_proposal_id)
    : null;

  const getRoleBadge = (role: TripMember['role']) => {
    if (role === 'owner') {
      return (
        <Badge variant="secondary" className="h-5 text-[10px] gap-0.5 px-1.5 bg-primary/10 text-primary border-0">
          <Crown className="h-3 w-3" />
          Owner
        </Badge>
      );
    }
    if (role === 'admin') {
      return (
        <Badge variant="secondary" className="h-5 text-[10px] gap-0.5 px-1.5">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="w-80 min-w-0 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 overflow-hidden">
          {/* Phase Status */}
          <section className="pb-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3 min-w-0">
              <span className="text-lg flex-shrink-0">{phaseInfo?.emoji}</span>
              <span className="text-sm font-semibold text-foreground truncate">{phaseInfo?.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0 whitespace-nowrap">
                Step {phaseInfo?.step}/5
              </Badge>
            </div>

            {/* Phase Actions for Owner */}
            {isOwner && onOpenLockDestination && onPhaseChanged && (
              <PhaseActions
                tripId={trip.id}
                currentPhase={currentPhase}
                destinationProposals={destinationProposals}
                includedProposals={includedProposals}
                onOpenLockDestination={onOpenLockDestination}
                onOpenTransportation={onOpenTransportation}
                onPhaseChanged={onPhaseChanged}
                isOwner={isOwner}
              />
            )}

            {/* Deadline Settings for Owner */}
            {isOwner && onPhaseChanged && (currentPhase === 'destination' || currentPhase === 'itinerary') && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <DeadlineSettings trip={trip} onUpdated={onPhaseChanged} />
              </div>
            )}

            {/* View Transportation button in itinerary or transportation phase */}
            {(currentPhase === 'itinerary' || currentPhase === 'transportation') && onOpenTransportation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTransportation}
                className="w-full mt-2"
              >
                <Car className="h-4 w-4 mr-2" />
                View Transportation
              </Button>
            )}

            {/* View Finalize button in finalize phase */}
            {currentPhase === 'finalize' && onOpenFinalizeView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFinalizeView}
                className="w-full mt-2"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Trip Summary
              </Button>
            )}
          </section>

          {/* Locked Destination */}
          {lockedDestination && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Destination
              </h3>
              {(() => {
                const destDisplayName = lockedDestination.name || lockedDestination.destination;
                return (
                  <button
                    onClick={() => onViewProposal(lockedDestination)}
                    className="w-full p-3 bg-primary/5 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors text-left overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-semibold text-foreground truncate">{destDisplayName}</span>
                    </div>
                    {lockedDestination.vibe_tags && lockedDestination.vibe_tags.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {lockedDestination.vibe_tags.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </button>
                );
              })()}
            </section>
          )}

          {/* Trip Basics */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trip Details
              </h3>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Trip settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEditCover}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Edit Cover Image
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDeleteTrip}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Trip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="space-y-2.5 overflow-hidden">
              {(trip.date_start || trip.date_end) && (
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {trip.date_start && format(new Date(trip.date_start), 'MMM d')}
                    {trip.date_end && ` - ${format(new Date(trip.date_end), 'MMM d, yyyy')}`}
                    {trip.flexible_dates && ' (Flexible)'}
                  </span>
                </div>
              )}
              {hasDeadline && (
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Clock className="h-4 w-4 text-vote-maybe flex-shrink-0" />
                  <span className="text-vote-maybe font-medium truncate">
                    Decide {formatDistanceToNow(new Date(trip.decision_deadline!), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-3 min-w-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Members ({members.length})
              </h3>
              <Button variant="ghost" size="sm" onClick={onInvite} className="h-7 text-xs flex-shrink-0">
                Invite
              </Button>
            </div>
            {/* Stacked avatars */}
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1">
                {members.slice(0, 6).map((member, index) => {
                  const name = member.profile?.name || member.profile?.email?.split('@')[0] || '?';
                  const isOwnerMember = member.role === 'owner';
                  const isAdminMember = member.role === 'admin';

                  return (
                    <div key={member.id} className="relative" style={{ zIndex: 6 - index }}>
                      <Avatar className={cn(
                        'h-8 w-8 ring-2 ring-background',
                        isOwnerMember && 'ring-primary/50',
                        isAdminMember && 'ring-muted-foreground/30'
                      )}>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOwnerMember && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                          <Crown className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {members.length > 6 && (
                  <div
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-background"
                    style={{ zIndex: 0 }}
                  >
                    +{members.length - 6}
                  </div>
                )}
              </div>
              {/* Member management dropdown for owner */}
              {isOwner && members.some(m => m.user_id !== user?.id && m.role !== 'owner') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {members
                      .filter(m => m.user_id !== user?.id && m.role !== 'owner')
                      .map(member => {
                        const name = member.profile?.name || member.profile?.email?.split('@')[0] || '?';
                        return (
                          <DropdownMenuItem
                            key={member.id}
                            onClick={() => onRemoveMember?.(member)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove {name}
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </section>

          {/* Pinned Decision */}
          {pinnedProposal && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-vote-in" />
                Final Pick
              </h3>
              {(() => {
                const pinnedType = pinnedProposal.type || 'housing';
                const pinnedTypeInfo = PROPOSAL_TYPES.find(t => t.value === pinnedType);
                const pinnedDisplayName = pinnedProposal.name || pinnedProposal.destination;

                return (
                  <button
                    onClick={() => onViewProposal(pinnedProposal)}
                    className="w-full p-3 bg-vote-in-bg rounded-lg border border-vote-in/20 hover:border-vote-in/40 transition-colors text-left overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <span className="flex-shrink-0">{pinnedTypeInfo?.emoji}</span>
                      <span className="font-semibold text-foreground truncate">{pinnedDisplayName}</span>
                    </div>
                    {pinnedProposal.estimated_cost_per_person > 0 && (
                      <p className="text-sm text-muted-foreground truncate">
                        ${pinnedProposal.estimated_cost_per_person}/person
                      </p>
                    )}
                  </button>
                );
              })()}
            </section>
          )}


          {/* Included Items Summary (Phase 2+) */}
          {currentPhase !== 'destination' && includedProposals.length > 0 && (
            <section className="overflow-hidden">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1 min-w-0">
                <Check className="h-3.5 w-3.5 text-vote-in flex-shrink-0" />
                <span className="truncate">In the Plan ({includedProposals.length})</span>
              </h3>
              <div className="space-y-1.5">
                {includedProposals.slice(0, 5).map((proposal) => {
                  const proposalType = proposal.type || 'housing';
                  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
                  const displayName = proposal.name || proposal.destination;

                  return (
                    <button
                      key={proposal.id}
                      onClick={() => onViewProposal(proposal)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left text-sm min-w-0"
                    >
                      <span className="flex-shrink-0">{typeInfo?.emoji}</span>
                      <span className="flex-1 truncate min-w-0">{displayName}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
                {includedProposals.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{includedProposals.length - 5} more
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
