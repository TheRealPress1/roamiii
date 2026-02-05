import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, MapPin, Clock, Trophy, ChevronRight, MoreVertical, Trash2, UserMinus, Crown, Shield, ImageIcon, Lock, Check, Eye, Car, Receipt, Sparkles, Users, CheckCircle2, CircleDashed, DollarSign, RotateCcw, Loader2 } from 'lucide-react';
import type { Trip, TripMember, TripProposal, SettlementSummary } from '@/lib/tripchat-types';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  onOpenTemplates?: () => void;
  onOpenExpenses?: () => void;
  // Ready phase specific props
  onClaimBooking?: (proposalId: string) => Promise<{ error: Error | null }>;
  settlements?: SettlementSummary[];
  totalPerPerson?: number;
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
  onOpenTemplates,
  onOpenExpenses,
  onClaimBooking,
  settlements = [],
  totalPerPerson = 0,
}: TripPanelProps) {
  const { user } = useAuth();
  const [claimingBookingId, setClaimingBookingId] = useState<string | null>(null);
  const hasDeadline = trip.decision_deadline && new Date(trip.decision_deadline) > new Date();
  const currentPhase = trip.phase || 'destination';
  const phaseInfo = TRIP_PHASES.find(p => p.value === currentPhase);
  const isReadyPhase = currentPhase === 'ready';

  // Handle claim booking
  const handleClaimBooking = async (proposalId: string) => {
    if (!onClaimBooking) return;
    setClaimingBookingId(proposalId);
    await onClaimBooking(proposalId);
    setClaimingBookingId(null);
  };

  // Get settlements where current user owes someone
  const userOwes = settlements.filter(s => s.from_user_id === user?.id);

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

  // Members section component (shared between layouts)
  const MembersSection = ({ prominent = false }: { prominent?: boolean }) => (
    <section className={cn(prominent && "pb-4 border-b border-border")}>
      <div className="flex items-center justify-between mb-3 min-w-0">
        <h3 className={cn(
          "font-semibold uppercase tracking-wider truncate flex items-center gap-2",
          prominent ? "text-sm text-foreground" : "text-xs text-muted-foreground"
        )}>
          {prominent && <Users className="h-4 w-4" />}
          {prominent ? "Who's Going" : `Members (${members.length})`}
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
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <div className="relative" style={{ zIndex: 6 - index }}>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">{name}</p>
                  {isOwnerMember && <p className="text-muted-foreground">Owner</p>}
                  {isAdminMember && <p className="text-muted-foreground">Admin</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {members.length > 6 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-background"
                  style={{ zIndex: 0 }}
                >
                  +{members.length - 6}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{members.length - 6} more members</p>
              </TooltipContent>
            </Tooltip>
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
      {prominent && (
        <p className="text-xs text-muted-foreground mt-2">
          {members.map(m => m.profile?.name || m.profile?.email?.split('@')[0]).slice(0, 3).join(', ')}
          {members.length > 3 && `, +${members.length - 3}`}
        </p>
      )}
    </section>
  );

  // Ready phase layout
  if (isReadyPhase) {
    return (
      <div className="w-80 min-w-0 border-l border-border bg-card flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6 overflow-hidden">
            {/* Who's Going - Prominent members section */}
            <MembersSection prominent />

            {/* Booking Status */}
            <section>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Booking Status
              </h3>
              <div className="space-y-3">
                {includedProposals.map((proposal) => {
                  const displayName = proposal.name || proposal.destination;
                  const isBooked = !!proposal.booked_by;
                  const bookerName = proposal.booker?.name || proposal.booker?.email?.split('@')[0];
                  const isClaiming = claimingBookingId === proposal.id;
                  const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposal.type);

                  return (
                    <div
                      key={proposal.id}
                      className="p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="flex-shrink-0 text-base">{typeInfo?.emoji || '📍'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isBooked ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-vote-in flex-shrink-0" />
                                <span className="text-xs text-vote-in">Booked by {bookerName}</span>
                              </>
                            ) : (
                              <>
                                <CircleDashed className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">Not booked</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {proposal.estimated_cost_per_person > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          ${proposal.estimated_cost_per_person.toLocaleString()}/person
                        </p>
                      )}
                      {!isBooked && onClaimBooking && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => handleClaimBooking(proposal.id)}
                          disabled={isClaiming}
                        >
                          {isClaiming ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            "I'll book it"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {includedProposals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items in the itinerary yet.
                  </p>
                )}
              </div>
            </section>

            {/* Payment Summary */}
            <section>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Summary
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                {totalPerPerson > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold text-foreground">${totalPerPerson.toLocaleString()}/person</span>
                  </div>
                )}

                {userOwes.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-2">
                    {userOwes.map((settlement, idx) => {
                      const toName = settlement.to_user?.name || settlement.to_user?.email?.split('@')[0] || 'Unknown';
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">You owe {toName}</span>
                          <span className="font-medium text-foreground">${settlement.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {userOwes.length === 0 && totalPerPerson === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No expenses tracked yet.
                  </p>
                )}

                {onOpenExpenses && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={onOpenExpenses}
                  >
                    View All Expenses
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </section>

            {/* Reopen for Changes (Owner only) */}
            {isOwner && onPhaseChanged && (
              <section>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    // Reopen to finalize phase
                    // This would need a handler to update the trip phase
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen for Changes
                </Button>
              </section>
            )}

            {/* Trip Settings (Owner dropdown) */}
            {isOwner && (
              <section className="pt-2 border-t border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <MoreVertical className="h-4 w-4 mr-2" />
                      Trip Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
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
              </section>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Default layout for non-ready phases
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

            {/* Templates button - show in destination phase for admins */}
            {currentPhase === 'destination' && isAdmin && onOpenTemplates && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTemplates}
                className="w-full mt-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            )}

            {/* Expenses button - show in all phases */}
            {onOpenExpenses && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenExpenses}
                className="w-full mt-2"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Expenses
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
          <MembersSection />

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
