import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, DollarSign, Users, MapPin, Clock, Trophy, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import type { Trip, TripMember, TripProposal } from '@/lib/tripchat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TripPanelProps {
  trip: Trip;
  members: TripMember[];
  proposals: TripProposal[];
  onInvite: () => void;
  onViewProposal: (proposal: TripProposal) => void;
  isOwner?: boolean;
  onDeleteTrip?: () => void;
}

export function TripPanel({ trip, members, proposals, onInvite, onViewProposal, isOwner, onDeleteTrip }: TripPanelProps) {
  const hasDeadline = trip.decision_deadline && new Date(trip.decision_deadline) > new Date();
  
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

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
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
            <div className="space-y-2.5">
              {(trip.date_start || trip.date_end) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {trip.date_start && format(new Date(trip.date_start), 'MMM d')}
                    {trip.date_end && ` - ${format(new Date(trip.date_end), 'MMM d, yyyy')}`}
                    {trip.flexible_dates && ' (Flexible)'}
                  </span>
                </div>
              )}
              {(trip.budget_min || trip.budget_max) && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {trip.budget_min && `$${trip.budget_min}`}
                    {trip.budget_min && trip.budget_max && ' - '}
                    {trip.budget_max && `$${trip.budget_max}`}
                    <span className="text-muted-foreground"> / person</span>
                  </span>
                </div>
              )}
              {hasDeadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-vote-maybe" />
                  <span className="text-vote-maybe font-medium">
                    Decide {formatDistanceToNow(new Date(trip.decision_deadline!), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Members ({members.length})
              </h3>
              <Button variant="ghost" size="sm" onClick={onInvite} className="h-7 text-xs">
                Invite
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const name = member.profile?.name || member.profile?.email?.split('@')[0] || '?';
                return (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
          </section>

          {/* Pinned Decision */}
          {pinnedProposal && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-vote-in" />
                Final Pick
              </h3>
              <button
                onClick={() => onViewProposal(pinnedProposal)}
                className="w-full p-3 bg-vote-in-bg rounded-lg border border-vote-in/20 hover:border-vote-in/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-vote-in" />
                  <span className="font-semibold text-foreground">{pinnedProposal.destination}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ${pinnedProposal.estimated_cost_per_person}/person
                </p>
              </button>
            </section>
          )}

          {/* Proposals Ranking */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Proposals ({proposals.length})
            </h3>
            {sortedProposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No proposals yet</p>
            ) : (
              <div className="space-y-2">
                {sortedProposals.slice(0, 5).map((proposal, index) => {
                  const inCount = (proposal.votes || []).filter((v) => v.vote === 'in').length;
                  const isPinned = proposal.id === trip.pinned_proposal_id;
                  
                  return (
                    <button
                      key={proposal.id}
                      onClick={() => onViewProposal(proposal)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left',
                        isPinned && 'bg-vote-in-bg border border-vote-in/20'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        index === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {proposal.destination}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${proposal.estimated_cost_per_person} · {inCount} in
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
