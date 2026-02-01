import { format } from 'date-fns';
import { Calendar, Check, ExternalLink, MapPin, X } from 'lucide-react';
import type { TripProposal } from '@/lib/tripchat-types';
import { useProposalReactions } from '@/hooks/useProposalReactions';
import { Button } from '@/components/ui/button';
import { VibeTag } from '@/components/ui/VibeTag';
import { cn } from '@/lib/utils';

interface CompareCardProps {
  proposal: TripProposal;
  tripId: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  className?: string;
}

export function CompareCard({
  proposal,
  tripId,
  isSelected,
  onSelect,
  onRemove,
  className
}: CompareCardProps) {
  const { counts } = useProposalReactions(proposal.id, tripId);
  const score = counts.love * 2 + counts.interested - counts.nope;
  
  const totalCost = 
    (proposal.cost_lodging_total || 0) + 
    (proposal.cost_transport_total || 0) + 
    (proposal.cost_food_total || 0) + 
    (proposal.cost_activities_total || 0);

  return (
    <div className={cn(
      "bg-card rounded-xl border-2 overflow-hidden transition-all flex flex-col",
      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
      className
    )}>
      {/* Cover Image */}
      <div className="aspect-video relative flex-shrink-0">
        {proposal.cover_image_url ? (
          <img
            src={proposal.cover_image_url}
            alt={proposal.destination}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <MapPin className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Vibe tags */}
        {proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {proposal.vibe_tags.slice(0, 2).map(vibe => (
              <VibeTag key={vibe} vibe={vibe as any} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="truncate">{proposal.destination}</span>
        </h3>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          {proposal.date_start ? (
            <span>
              {format(new Date(proposal.date_start), 'MMM d')}
              {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d')}`}
            </span>
          ) : (
            <span>Flexible dates</span>
          )}
          {proposal.flexible_dates && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Flex</span>
          )}
        </div>

        {/* Cost */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Per person</p>
          <p className="text-2xl font-bold text-primary">
            ${proposal.estimated_cost_per_person || 0}
          </p>
          <p className="text-xs text-muted-foreground">
            Total: ${totalCost}
          </p>
        </div>

        {/* Reaction counts */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
            <span>👍</span> {counts.interested}
          </span>
          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
            <span>❤️</span> {counts.love}
          </span>
          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
            <span>👎</span> {counts.nope}
          </span>
          <span className="ml-auto font-medium text-primary">Score: {score}</span>
        </div>

        {/* Links preview */}
        {proposal.lodging_links && proposal.lodging_links.length > 0 && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Lodging:</p>
            <div className="space-y-1">
              {proposal.lodging_links.slice(0, 2).map((link, i) => {
                let hostname = 'Link';
                try {
                  hostname = new URL(link).hostname.replace('www.', '');
                } catch {
                  // ignore invalid URLs
                }
                return (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{hostname}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Select winner button - pushed to bottom */}
        <div className="mt-auto pt-2">
          <Button
            variant={isSelected ? "default" : "outline"}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Selected as Winner
              </>
            ) : (
              'Select as Winner'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
