import { MapPin, Home, Sparkles, Lock } from 'lucide-react';
import type { TripProposal } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

interface BoardItemPreviewProps {
  proposal: TripProposal;
  isDestination?: boolean;
}

export function BoardItemPreview({ proposal, isDestination }: BoardItemPreviewProps) {
  const displayTitle = proposal.name || proposal.destination;

  const TypeIcon = isDestination ? MapPin : proposal.type === 'housing' ? Home : Sparkles;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-2xl rotate-2 max-w-[200px]">
      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {proposal.cover_image_url ? (
          <img
            src={proposal.cover_image_url}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {/* Type badge */}
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center',
          isDestination ? 'bg-primary' : proposal.type === 'housing' ? 'bg-amber-500' : 'bg-green-500'
        )}>
          <TypeIcon className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-foreground truncate">
        {displayTitle}
      </span>
    </div>
  );
}
