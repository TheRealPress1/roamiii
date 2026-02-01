import { useState, useMemo } from 'react';
import { Trophy, X } from 'lucide-react';
import type { TripProposal, CompareSortOption } from '@/lib/tripchat-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CompareCard } from './CompareCard';
import { cn } from '@/lib/utils';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  proposals: TripProposal[];
  tripId: string;
  isAdmin: boolean;
  onRemove: (proposalId: string) => void;
  onClearAll: () => void;
  onSelectWinner: (proposalId: string) => void;
}

export function CompareModal({
  open,
  onClose,
  proposals,
  tripId,
  isAdmin,
  onRemove,
  onClearAll,
  onSelectWinner,
}: CompareModalProps) {
  const [sortBy, setSortBy] = useState<CompareSortOption>('score_desc');
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Helper to get reaction count for a proposal
  const getReactionCount = (proposal: TripProposal, type: 'interested' | 'love' | 'nope') => {
    const reactions = proposal.reactions || [];
    return reactions.filter(r => r.reaction === type).length;
  };

  // Score calculation: love*2 + interested - nope
  const calculateScore = (proposal: TripProposal) => {
    return (
      getReactionCount(proposal, 'love') * 2 +
      getReactionCount(proposal, 'interested') -
      getReactionCount(proposal, 'nope')
    );
  };

  // Sort proposals based on selected option
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      switch (sortBy) {
        case 'cost_asc':
          return (a.estimated_cost_per_person || 0) - (b.estimated_cost_per_person || 0);
        case 'interested_desc':
          return getReactionCount(b, 'interested') - getReactionCount(a, 'interested');
        case 'love_desc':
          return getReactionCount(b, 'love') - getReactionCount(a, 'love');
        case 'score_desc':
        default:
          return calculateScore(b) - calculateScore(a);
      }
    });
  }, [proposals, sortBy]);

  const handleSelectWinner = () => {
    if (selectedWinner) {
      onSelectWinner(selectedWinner);
      setSelectedWinner(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header with sort and clear actions */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Compare Proposals</DialogTitle>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as CompareSortOption)}>
              <SelectTrigger className="w-40 sm:w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">Best overall score</SelectItem>
                <SelectItem value="cost_asc">Lowest cost/person</SelectItem>
                <SelectItem value="interested_desc">Most interested</SelectItem>
                <SelectItem value="love_desc">Most loved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Proposals grid (desktop) or horizontal scroll (mobile) */}
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            <div className="flex gap-4 p-4 overflow-x-auto snap-x snap-mandatory h-full">
              {sortedProposals.map(proposal => (
                <CompareCard
                  key={proposal.id}
                  proposal={proposal}
                  tripId={tripId}
                  isSelected={selectedWinner === proposal.id}
                  onSelect={() => setSelectedWinner(proposal.id)}
                  onRemove={() => onRemove(proposal.id)}
                  className="min-w-[280px] max-w-[300px] snap-center flex-shrink-0"
                />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className={cn(
                "grid gap-4 p-4",
                proposals.length === 2 && "grid-cols-2",
                proposals.length === 3 && "grid-cols-3",
                proposals.length >= 4 && "grid-cols-2 lg:grid-cols-4"
              )}>
                {sortedProposals.map(proposal => (
                  <CompareCard
                    key={proposal.id}
                    proposal={proposal}
                    tripId={tripId}
                    isSelected={selectedWinner === proposal.id}
                    onSelect={() => setSelectedWinner(proposal.id)}
                    onRemove={() => onRemove(proposal.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer with lock action */}
        <div className="p-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-card">
          <p className="text-sm text-muted-foreground">
            {selectedWinner 
              ? 'Click "Lock this trip" to finalize' 
              : 'Select a winner to proceed'}
          </p>
          <Button
            disabled={!selectedWinner || !isAdmin}
            onClick={handleSelectWinner}
            className="bg-vote-in hover:bg-vote-in/90"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Lock this trip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
