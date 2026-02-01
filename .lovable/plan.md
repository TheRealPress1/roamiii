

# Compare Mode for Trip Proposals

This plan implements a side-by-side comparison experience for trip proposals, allowing groups to quickly evaluate and decide between 2-4 proposals with all key details visible.

---

## Current State

- Proposals display in the chat feed via `ProposalMessage.tsx`
- Each proposal card shows destination, dates, cost, vibe tags, votes, and reactions
- `ProposalDetailModal.tsx` shows full proposal details one at a time
- `TripPanel.tsx` lists proposals ranked by votes
- Trip has `pinned_proposal_id` column for winner selection (already exists)
- `proposal_reactions` table tracks user reactions with counts

---

## Solution Overview

Add a Compare mode with:
1. "Add to Compare" button on each proposal card
2. Floating compare tray showing count when 2+ selected
3. Compare modal/sheet for side-by-side viewing
4. Per-user persistence via new `proposal_compare` table
5. Sorting options and winner selection

---

## Part 1: Database Schema

### New Table: `proposal_compare`

Stores each user's compare selections per trip.

```sql
CREATE TABLE public.proposal_compare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_proposal_compare UNIQUE (user_id, proposal_id)
);

-- Performance indexes
CREATE INDEX idx_proposal_compare_user_trip ON public.proposal_compare(user_id, trip_id);
CREATE INDEX idx_proposal_compare_proposal ON public.proposal_compare(proposal_id);

-- Enable RLS
ALTER TABLE public.proposal_compare ENABLE ROW LEVEL SECURITY;
```

### Row-Level Security Policies

```sql
-- Users can only view their own compare selections
CREATE POLICY "Users can view own compare selections"
ON public.proposal_compare FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can add proposals to compare if they are trip members
CREATE POLICY "Trip members can add to compare"
ON public.proposal_compare FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

-- Users can remove their own compare selections
CREATE POLICY "Users can delete own compare selections"
ON public.proposal_compare FOR DELETE TO authenticated
USING (user_id = auth.uid());
```

---

## Part 2: TypeScript Types

### File: `src/lib/tripchat-types.ts`

Add new types:

```typescript
export interface ProposalCompare {
  id: string;
  trip_id: string;
  proposal_id: string;
  user_id: string;
  created_at: string;
}

export type CompareSortOption = 
  | 'cost_asc' 
  | 'interested_desc' 
  | 'love_desc' 
  | 'score_desc';
```

---

## Part 3: Compare Hook

### New File: `src/hooks/useProposalCompare.ts`

Manages the user's compare list for a trip.

```typescript
export function useProposalCompare(tripId: string) {
  const { user } = useAuth();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's compare list for this trip
  const fetchCompareList = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('proposal_compare')
      .select('proposal_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id);
    setCompareIds((data || []).map(d => d.proposal_id));
    setLoading(false);
  }, [tripId, user?.id]);

  useEffect(() => {
    fetchCompareList();
  }, [fetchCompareList]);

  // Toggle proposal in compare list
  const toggleCompare = async (proposalId: string) => {
    if (!user) return;
    const isInCompare = compareIds.includes(proposalId);
    
    if (isInCompare) {
      // Remove from compare
      setCompareIds(prev => prev.filter(id => id !== proposalId));
      await supabase
        .from('proposal_compare')
        .delete()
        .eq('proposal_id', proposalId)
        .eq('user_id', user.id);
    } else {
      // Add to compare (max 4)
      if (compareIds.length >= 4) {
        toast.error('You can compare up to 4 proposals');
        return;
      }
      setCompareIds(prev => [...prev, proposalId]);
      await supabase
        .from('proposal_compare')
        .insert({ trip_id: tripId, proposal_id: proposalId, user_id: user.id });
    }
  };

  // Clear all compare selections
  const clearCompare = async () => {
    if (!user) return;
    setCompareIds([]);
    await supabase
      .from('proposal_compare')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user.id);
  };

  // Check if proposal is in compare
  const isComparing = (proposalId: string) => compareIds.includes(proposalId);

  return {
    compareIds,
    compareCount: compareIds.length,
    loading,
    toggleCompare,
    clearCompare,
    isComparing,
  };
}
```

---

## Part 4: UI Components

### New File: `src/components/compare/CompareButton.tsx`

Small toggle button for proposal cards.

```typescript
interface CompareButtonProps {
  proposalId: string;
  isComparing: boolean;
  onToggle: () => void;
}

export function CompareButton({ proposalId, isComparing, onToggle }: CompareButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
        isComparing
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/80 hover:bg-muted text-muted-foreground'
      )}
    >
      {isComparing ? (
        <>
          <Check className="h-3 w-3" />
          Comparing
        </>
      ) : (
        <>
          <Plus className="h-3 w-3" />
          Compare
        </>
      )}
    </button>
  );
}
```

### New File: `src/components/compare/CompareTray.tsx`

Floating button in bottom-right when 2+ proposals selected.

```typescript
interface CompareTrayProps {
  count: number;
  onClick: () => void;
}

export function CompareTray({ count, onClick }: CompareTrayProps) {
  if (count < 2) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
    >
      <GitCompareArrows className="h-5 w-5" />
      <span className="font-semibold">Compare ({count})</span>
    </motion.button>
  );
}
```

### New File: `src/components/compare/CompareModal.tsx`

Main comparison view with side-by-side proposals.

```typescript
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

export function CompareModal({...}) {
  const [sortBy, setSortBy] = useState<CompareSortOption>('score_desc');
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Sort proposals based on selected option
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      switch (sortBy) {
        case 'cost_asc':
          return a.estimated_cost_per_person - b.estimated_cost_per_person;
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

  // Score calculation: love*2 + interested - nope
  const calculateScore = (proposal: TripProposal) => {
    const reactions = proposal.reactions || [];
    return (
      reactions.filter(r => r.reaction === 'love').length * 2 +
      reactions.filter(r => r.reaction === 'interested').length -
      reactions.filter(r => r.reaction === 'nope').length
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        {/* Header with sort and clear actions */}
        <div className="p-4 border-b flex items-center justify-between">
          <DialogTitle>Compare Proposals</DialogTitle>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
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
              Clear all
            </Button>
          </div>
        </div>

        {/* Proposals grid (desktop) or horizontal scroll (mobile) */}
        <ScrollArea className="flex-1">
          {isMobile ? (
            <div className="flex gap-4 p-4 overflow-x-auto snap-x snap-mandatory">
              {sortedProposals.map(proposal => (
                <CompareCard
                  key={proposal.id}
                  proposal={proposal}
                  tripId={tripId}
                  isSelected={selectedWinner === proposal.id}
                  onSelect={() => setSelectedWinner(proposal.id)}
                  onRemove={() => onRemove(proposal.id)}
                  className="min-w-[300px] snap-center"
                />
              ))}
            </div>
          ) : (
            <div className={cn(
              "grid gap-4 p-4",
              proposals.length === 2 && "grid-cols-2",
              proposals.length === 3 && "grid-cols-3",
              proposals.length === 4 && "grid-cols-2 lg:grid-cols-4"
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
          )}
        </ScrollArea>

        {/* Footer with lock action */}
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedWinner ? 'Click "Lock this trip" to finalize' : 'Select a winner to proceed'}
          </p>
          <Button
            disabled={!selectedWinner || !isAdmin}
            onClick={() => selectedWinner && onSelectWinner(selectedWinner)}
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
```

### New File: `src/components/compare/CompareCard.tsx`

Individual proposal card for the compare view.

```typescript
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

  return (
    <div className={cn(
      "bg-card rounded-xl border-2 overflow-hidden transition-all",
      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
      className
    )}>
      {/* Cover Image */}
      <div className="aspect-video relative">
        <img
          src={proposal.cover_image_url}
          alt={proposal.destination}
          className="w-full h-full object-cover"
        />
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Vibe tags */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {proposal.vibe_tags?.slice(0, 2).map(vibe => (
            <VibeTag key={vibe} vibe={vibe} size="sm" />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg">{proposal.destination}</h3>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {proposal.date_start ? (
            <span>
              {format(new Date(proposal.date_start), 'MMM d')}
              {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d')}`}
            </span>
          ) : (
            <span>Flexible dates</span>
          )}
        </div>

        {/* Cost */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Per person</p>
          <p className="text-2xl font-bold text-primary">
            ${proposal.estimated_cost_per_person}
          </p>
          <p className="text-xs text-muted-foreground">
            Total: ${proposal.cost_lodging_total + proposal.cost_transport_total + 
                    proposal.cost_food_total + proposal.cost_activities_total}
          </p>
        </div>

        {/* Reaction counts */}
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1">
            <span>👍</span> {counts.interested}
          </span>
          <span className="flex items-center gap-1">
            <span>❤️</span> {counts.love}
          </span>
          <span className="flex items-center gap-1">
            <span>👎</span> {counts.nope}
          </span>
          <span className="ml-auto font-medium">Score: {score}</span>
        </div>

        {/* Links preview */}
        {proposal.lodging_links && proposal.lodging_links.length > 0 && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Lodging options:</p>
            <div className="space-y-1">
              {proposal.lodging_links.slice(0, 2).map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline truncate"
                >
                  <ExternalLink className="h-3 w-3" />
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Select winner button */}
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          onClick={onSelect}
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
  );
}
```

---

## Part 5: Integration Points

### Update `ProposalMessage.tsx`

Add compare button to proposal cards in chat.

```typescript
// Add to props interface
interface ProposalMessageProps {
  message: Message;
  tripId: string;
  onViewDetails: (proposal: TripProposal) => void;
  isComparing?: boolean;
  onToggleCompare?: () => void;
}

// Add button after reactions, before View Details
{onToggleCompare && (
  <CompareButton
    proposalId={proposal.id}
    isComparing={isComparing || false}
    onToggle={onToggleCompare}
  />
)}
```

### Update `TripChat.tsx`

Add compare state management and floating tray.

```typescript
// Add new state and hook
const { compareIds, compareCount, toggleCompare, clearCompare, isComparing } = 
  useProposalCompare(tripId!);
const [compareModalOpen, setCompareModalOpen] = useState(false);

// Get compared proposals
const comparedProposals = proposals.filter(p => compareIds.includes(p.id));

// Handle winner selection
const handleSelectWinner = async (proposalId: string) => {
  await supabase
    .from('trips')
    .update({ pinned_proposal_id: proposalId, status: 'decided' })
    .eq('id', tripId);
  
  // Notify members...
  toast.success('Trip locked!');
  setCompareModalOpen(false);
  refetch();
};

// In JSX - pass props to ChatFeed
<ChatFeed
  messages={messages}
  loading={messagesLoading}
  tripId={tripId!}
  onViewProposal={handleViewProposal}
  compareIds={compareIds}
  onToggleCompare={toggleCompare}
/>

// Add floating tray and modal
<AnimatePresence>
  <CompareTray count={compareCount} onClick={() => setCompareModalOpen(true)} />
</AnimatePresence>

<CompareModal
  open={compareModalOpen}
  onClose={() => setCompareModalOpen(false)}
  proposals={comparedProposals}
  tripId={tripId!}
  isAdmin={isAdmin}
  onRemove={toggleCompare}
  onClearAll={clearCompare}
  onSelectWinner={handleSelectWinner}
/>
```

### Update `ChatFeed.tsx`

Pass compare props to ProposalMessage.

```typescript
interface ChatFeedProps {
  // ... existing props
  compareIds?: string[];
  onToggleCompare?: (proposalId: string) => void;
}

// In rendering
<ProposalMessage
  key={message.id}
  message={message}
  tripId={tripId}
  onViewDetails={onViewProposal}
  isComparing={compareIds?.includes(message.proposal?.id || '')}
  onToggleCompare={() => onToggleCompare?.(message.proposal?.id || '')}
/>
```

---

## Part 6: Files Summary

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | `proposal_compare` table with RLS |
| `src/lib/tripchat-types.ts` | Update | Add `ProposalCompare` and `CompareSortOption` types |
| `src/hooks/useProposalCompare.ts` | Create | Hook for managing compare selections |
| `src/components/compare/CompareButton.tsx` | Create | Toggle button for proposal cards |
| `src/components/compare/CompareTray.tsx` | Create | Floating compare indicator |
| `src/components/compare/CompareCard.tsx` | Create | Card for comparison view |
| `src/components/compare/CompareModal.tsx` | Create | Main comparison modal |
| `src/components/chat/ProposalMessage.tsx` | Update | Add compare button |
| `src/components/chat/ChatFeed.tsx` | Update | Pass compare props |
| `src/pages/TripChat.tsx` | Update | Add compare state and modal |

---

## Acceptance Criteria

1. Users can add/remove proposals from compare via button on cards
2. Compare tray appears only when 2+ proposals selected
3. Compare modal shows proposals side-by-side with key details
4. Sorting works (cost, interested, love, overall score)
5. Users can select a winner and lock the trip
6. Per-user compare selections persisted in database
7. RLS prevents cross-user access to compare lists
8. Mobile: horizontal snap-scroll for cards
9. Desktop: responsive grid (2x2 for 4 proposals, etc.)
10. No RLS violation errors

