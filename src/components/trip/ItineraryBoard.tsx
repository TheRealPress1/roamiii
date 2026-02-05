import { useDroppable } from '@dnd-kit/core';
import { MapPin, Home, Sparkles, Lock, X, Plus, Check } from 'lucide-react';
import type { TripProposal } from '@/lib/tripchat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getDisplayName } from '@/lib/utils';
import { voteTypeToScore } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';

interface ItineraryBoardProps {
  lockedDestination: TripProposal | null;
  includedProposals: TripProposal[];
  isAdmin?: boolean;
  onRemoveItem: (proposalId: string) => void;
}

export function ItineraryBoard({
  lockedDestination,
  includedProposals,
  isAdmin,
  onRemoveItem,
}: ItineraryBoardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'itinerary-board',
  });

  const hasItems = lockedDestination || includedProposals.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'px-4 py-4 transition-all duration-200 border-b border-border bg-muted/30',
        isOver && 'bg-primary/5'
      )}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          In the Plan
        </h3>
        <span className="text-xs text-muted-foreground">
          ({(lockedDestination ? 1 : 0) + includedProposals.length})
        </span>
      </div>

      {/* Cards Grid - horizontal scroll */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {/* Locked Destination Card */}
          {lockedDestination && (
            <ItineraryCard
              proposal={lockedDestination}
              isDestination
              isLocked
              isAdmin={isAdmin}
              onRemove={onRemoveItem}
            />
          )}

          {/* Included Items */}
          {includedProposals.map((proposal) => (
            <ItineraryCard
              key={proposal.id}
              proposal={proposal}
              isAdmin={isAdmin}
              onRemove={onRemoveItem}
            />
          ))}

          {/* Drop indicator when dragging over */}
          {isOver && (
            <div className="flex-shrink-0 w-[300px] h-[100px] border-2 border-dashed border-primary rounded-xl flex items-center justify-center gap-2 text-primary bg-primary/5">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Drop here to add</span>
            </div>
          )}

          {/* Empty state hint */}
          {!hasItems && !isOver && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50 py-8">
              <Plus className="h-4 w-4" />
              <span>Drag proposals here to add them to your itinerary</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ItineraryCardProps {
  proposal: TripProposal;
  isDestination?: boolean;
  isLocked?: boolean;
  isAdmin?: boolean;
  onRemove: (proposalId: string) => void;
}

function ItineraryCard({
  proposal,
  isDestination,
  isLocked,
  isAdmin,
  onRemove,
}: ItineraryCardProps) {
  const { user } = useAuth();
  const displayTitle = proposal.name || proposal.destination;
  const TypeIcon = isDestination ? MapPin : proposal.type === 'housing' ? Home : Sparkles;

  // Get votes
  const votes = proposal.votes || [];
  const userVote = votes.find((v) => v.user_id === user?.id);
  const userTemperature = userVote?.score ?? (userVote ? voteTypeToScore(userVote.vote) : null);
  const averageTemperature = votes.length > 0
    ? votes.reduce((sum, v) => sum + (v.score ?? voteTypeToScore(v.vote)), 0) / votes.length
    : null;

  return (
    <div
      className={cn(
        'group flex-shrink-0 w-[340px] bg-card rounded-xl border shadow-card overflow-hidden transition-colors',
        isLocked
          ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20'
          : 'border-border hover:border-border/80'
      )}
    >
      <div className="flex">
        {/* Cover Image */}
        <div className={cn(
          'w-28 flex-shrink-0 relative bg-gradient-to-br',
          isDestination ? 'from-primary/20 to-accent/20' : 'from-muted to-muted/50'
        )}>
          {proposal.cover_image_url ? (
            <img
              src={proposal.cover_image_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <TypeIcon className={cn(
                'h-8 w-8',
                isDestination ? 'text-primary/40' : 'text-muted-foreground/40'
              )} />
            </div>
          )}
          {/* Locked badge */}
          {isLocked && (
            <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Lock className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Title */}
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                <TypeIcon className={cn(
                  'h-3.5 w-3.5 flex-shrink-0',
                  isDestination ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className="truncate">{displayTitle}</span>
              </h4>

              {/* Cost per person (NOT for destinations) */}
              {!isDestination && proposal.estimated_cost_per_person > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${proposal.estimated_cost_per_person}/person
                </p>
              )}

              {/* User's vote */}
              {userTemperature !== null && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600">
                  <Check className="h-3 w-3" />
                  <span>Voted: {userTemperature}°</span>
                </div>
              )}
            </div>

            {/* Average temp and avatars */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {averageTemperature !== null && (
                <span className="text-xs font-medium text-muted-foreground">
                  Avg: {Math.round(averageTemperature)}°
                </span>
              )}
              {votes.length > 0 && (
                <div className="flex -space-x-1.5">
                  {votes.slice(0, 3).map((vote) => (
                    <Avatar key={vote.id} className="h-5 w-5 border border-background">
                      <AvatarImage src={vote.voter?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {getDisplayName(vote.voter, '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {votes.length > 3 && (
                    <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] text-muted-foreground">
                      +{votes.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Remove button (admins only, not for locked destination) */}
              {isAdmin && !isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(proposal.id);
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
