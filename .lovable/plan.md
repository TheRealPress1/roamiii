

# Proposal Reactions (Vote System) Implementation

This plan implements a lightweight emoji-reaction system for trip proposals with three options: Interested 👍, Love ❤️, and Not for me 👎. Each user can only have one reaction per proposal at a time.

---

## Current State Analysis

The app already has a `trip_votes` table with `in/maybe/out` options for proposals. The new reaction system will be a **separate, lighter engagement layer** that provides quick sentiment feedback without the commitment level of the voting system.

---

## Part 1: Database Schema

### New Table: `proposal_reactions`

```sql
CREATE TABLE public.proposal_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('interested', 'love', 'nope')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_proposal_reaction UNIQUE (proposal_id, user_id)
);

-- Performance index
CREATE INDEX idx_proposal_reactions_proposal ON public.proposal_reactions(proposal_id);
CREATE INDEX idx_proposal_reactions_user ON public.proposal_reactions(user_id);

-- Enable RLS
ALTER TABLE public.proposal_reactions ENABLE ROW LEVEL SECURITY;

-- Enable realtime for instant count updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_reactions;
```

### Reaction Types

| Value | Emoji | Label |
|-------|-------|-------|
| `interested` | 👍 | Interested |
| `love` | ❤️ | Love it |
| `nope` | 👎 | Not for me |

---

## Part 2: Row-Level Security Policies

```sql
-- SELECT: Members can view reactions for proposals in their trips
CREATE POLICY "Members can view reactions"
ON public.proposal_reactions FOR SELECT TO authenticated
USING (is_trip_member(trip_id, auth.uid()));

-- INSERT: Members can add reactions to proposals in their trips
CREATE POLICY "Members can add reactions"
ON public.proposal_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_trip_member(trip_id, auth.uid())
);

-- UPDATE: Users can update their own reactions
CREATE POLICY "Users can update own reactions"
ON public.proposal_reactions FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.proposal_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());
```

---

## Part 3: TypeScript Types

### File: `src/lib/tripchat-types.ts`

Add new types:

```typescript
export type ReactionType = 'interested' | 'love' | 'nope';

export interface ProposalReaction {
  id: string;
  proposal_id: string;
  trip_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  updated_at: string;
}

// Add to TripProposal interface
export interface TripProposal {
  // ... existing fields
  reactions?: ProposalReaction[];
}
```

---

## Part 4: Hook for Reactions

### New File: `src/hooks/useProposalReactions.ts`

```typescript
export function useProposalReactions(proposalId: string, tripId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ProposalReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from('proposal_reactions')
      .select('*')
      .eq('proposal_id', proposalId);
    setReactions(data || []);
    setLoading(false);
  }, [proposalId]);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchReactions();
    
    const channel = supabase
      .channel(`reactions-${proposalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'proposal_reactions',
        filter: `proposal_id=eq.${proposalId}`,
      }, fetchReactions)
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [proposalId, fetchReactions]);

  // Toggle/change reaction
  const toggleReaction = async (reactionType: ReactionType) => {
    if (!user) return;

    const existingReaction = reactions.find(r => r.user_id === user.id);

    if (existingReaction) {
      if (existingReaction.reaction === reactionType) {
        // Same reaction - toggle off (delete)
        await supabase
          .from('proposal_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Different reaction - update
        await supabase
          .from('proposal_reactions')
          .update({ reaction: reactionType, updated_at: new Date().toISOString() })
          .eq('id', existingReaction.id);
      }
    } else {
      // No reaction - insert new
      await supabase
        .from('proposal_reactions')
        .insert({
          proposal_id: proposalId,
          trip_id: tripId,
          user_id: user.id,
          reaction: reactionType,
        });
    }
  };

  // Compute counts and user's reaction
  const counts = useMemo(() => ({
    interested: reactions.filter(r => r.reaction === 'interested').length,
    love: reactions.filter(r => r.reaction === 'love').length,
    nope: reactions.filter(r => r.reaction === 'nope').length,
  }), [reactions]);

  const userReaction = reactions.find(r => r.user_id === user?.id);

  return { reactions, counts, userReaction, loading, toggleReaction };
}
```

---

## Part 5: UI Component

### New File: `src/components/proposal/ProposalReactions.tsx`

A compact reaction bar component:

```typescript
interface ProposalReactionsProps {
  proposalId: string;
  tripId: string;
}

const reactionConfig = {
  interested: { emoji: '👍', label: 'Interested', color: 'text-blue-500', activeBg: 'bg-blue-500' },
  love: { emoji: '❤️', label: 'Love it', color: 'text-red-500', activeBg: 'bg-red-500' },
  nope: { emoji: '👎', label: 'Not for me', color: 'text-gray-500', activeBg: 'bg-gray-500' },
};

export function ProposalReactions({ proposalId, tripId }: ProposalReactionsProps) {
  const { counts, userReaction, loading, toggleReaction } = useProposalReactions(proposalId, tripId);

  if (loading) {
    return <Skeleton className="h-8 w-40" />;
  }

  return (
    <div className="flex items-center gap-2">
      {(Object.entries(reactionConfig) as [ReactionType, typeof reactionConfig.interested][]).map(
        ([type, config]) => {
          const isActive = userReaction?.reaction === type;
          const count = counts[type];

          return (
            <button
              key={type}
              onClick={() => toggleReaction(type)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium transition-all',
                isActive
                  ? `${config.activeBg} text-white`
                  : `bg-muted hover:bg-muted/80 ${config.color}`
              )}
            >
              <span>{config.emoji}</span>
              <span>{count}</span>
            </button>
          );
        }
      )}
    </div>
  );
}
```

---

## Part 6: Integration Points

### Update `ProposalMessage.tsx`

Add reactions bar below the existing vote buttons:

```typescript
// After vote buttons, before "View Details" button
<ProposalReactions proposalId={proposal.id} tripId={tripId} />
```

### Update `ProposalDetailModal.tsx`

Add reactions in the modal view:

```typescript
// After vote buttons section
<div className="pt-2 border-t">
  <p className="text-sm text-muted-foreground mb-2">Quick reactions</p>
  <ProposalReactions proposalId={proposal.id} tripId={tripId} />
</div>
```

---

## Part 7: Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_add_proposal_reactions.sql` | Create | Table, RLS, indexes, realtime |
| `src/lib/tripchat-types.ts` | Update | Add `ReactionType` and `ProposalReaction` types |
| `src/hooks/useProposalReactions.ts` | Create | Hook for fetching, realtime, and toggling |
| `src/components/proposal/ProposalReactions.tsx` | Create | Reaction bar component |
| `src/components/chat/ProposalMessage.tsx` | Update | Add reactions to proposal cards |
| `src/components/proposal/ProposalDetailModal.tsx` | Update | Add reactions to modal |

---

## Acceptance Criteria

1. Users can react to a proposal with one of three options (Interested/Love/Not for me)
2. Clicking the same reaction toggles it off
3. Clicking a different reaction switches to that one
4. Reaction counts update in real-time
5. User's active reaction is visually highlighted
6. Only one reaction per user per proposal (enforced by database constraint)
7. RLS prevents reacting to proposals in trips the user is not a member of
8. No console errors or RLS violations

---

## Alternative Consideration

The existing `trip_votes` table provides similar functionality with `in/maybe/out`. If you prefer to **replace** the vote system instead of adding reactions alongside it, let me know and I can adjust the plan to modify the existing vote buttons instead of creating a new reactions system.

