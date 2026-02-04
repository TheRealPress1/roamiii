import { useDroppable } from '@dnd-kit/core';
import { MapPin, Home, Sparkles, Lock, X, Plus } from 'lucide-react';
import type { TripProposal } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

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
        'sticky top-0 z-20 bg-card border-b border-border p-4 transition-all duration-200',
        isOver && 'ring-2 ring-primary ring-inset bg-primary/5'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Your Itinerary</h3>
      </div>

      {/* Content */}
      {hasItems ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {/* Locked Destination Card */}
          {lockedDestination && (
            <ItineraryChip
              proposal={lockedDestination}
              isDestination
              isLocked
              isAdmin={isAdmin}
              onRemove={onRemoveItem}
            />
          )}

          {/* Included Items */}
          {includedProposals.map((proposal) => (
            <ItineraryChip
              key={proposal.id}
              proposal={proposal}
              isAdmin={isAdmin}
              onRemove={onRemoveItem}
            />
          ))}

          {/* Drop indicator when empty slots available */}
          {isOver && (
            <div className="flex-shrink-0 h-9 px-4 border-2 border-dashed border-primary rounded-full flex items-center justify-center gap-1 text-primary text-sm">
              <Plus className="h-3.5 w-3.5" />
              <span>Drop here</span>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          'flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-lg transition-colors',
          isOver ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
        )}>
          <Plus className="h-4 w-4" />
          <span className="text-sm">
            {isOver ? 'Drop to add!' : 'Drag proposals here to build your itinerary'}
          </span>
        </div>
      )}
    </div>
  );
}

interface ItineraryChipProps {
  proposal: TripProposal;
  isDestination?: boolean;
  isLocked?: boolean;
  isAdmin?: boolean;
  onRemove: (proposalId: string) => void;
}

function ItineraryChip({
  proposal,
  isDestination,
  isLocked,
  isAdmin,
  onRemove,
}: ItineraryChipProps) {
  const displayTitle = proposal.name || proposal.destination;
  const TypeIcon = isDestination ? MapPin : proposal.type === 'housing' ? Home : Sparkles;

  return (
    <div
      className={cn(
        'group flex-shrink-0 flex items-center gap-2 h-9 pl-1 pr-2 rounded-full transition-colors',
        isDestination
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-muted/50 border border-border hover:bg-muted'
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        'relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0',
        !proposal.cover_image_url && 'bg-muted'
      )}>
        {proposal.cover_image_url ? (
          <img
            src={proposal.cover_image_url}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className={cn(
              'h-3.5 w-3.5',
              isDestination ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
        )}
        {/* Lock badge for destination */}
        {isLocked && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Lock className="h-2 w-2 text-white" />
          </div>
        )}
      </div>

      {/* Title */}
      <span className={cn(
        'text-sm font-medium truncate max-w-[120px]',
        isDestination ? 'text-primary' : 'text-foreground'
      )}>
        {displayTitle}
      </span>

      {/* Type icon for non-destinations */}
      {!isDestination && (
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
          proposal.type === 'housing' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
        )}>
          <TypeIcon className="h-3 w-3" />
        </div>
      )}

      {/* Remove button (admins only, not for locked destination) */}
      {isAdmin && !isLocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(proposal.id);
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
