import { useProposalReactions } from '@/hooks/useProposalReactions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReactionType } from '@/lib/tripchat-types';
import { SFSymbol } from '@/components/icons';
import { REACTION_ICON_MAP } from '@/lib/icon-mappings';

interface ProposalReactionsProps {
  proposalId: string;
  tripId: string;
}

const reactionConfig: Record<ReactionType, { label: string }> = {
  interested: { label: 'Interested' },
  love: { label: 'Love it' },
  nope: { label: 'Not for me' },
};

export function ProposalReactions({ proposalId, tripId }: ProposalReactionsProps) {
  const { counts, userReaction, loading, toggleReaction } = useProposalReactions(proposalId, tripId);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {(Object.entries(reactionConfig) as [ReactionType, typeof reactionConfig.interested][]).map(
        ([type, config]) => {
          const isActive = userReaction?.reaction === type;
          const count = counts[type];
          const iconName = REACTION_ICON_MAP[type];

          return (
            <button
              key={type}
              onClick={() => toggleReaction(type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              )}
              title={config.label}
            >
              <SFSymbol name={iconName} size="sm" className={isActive ? 'invert' : ''} />
              <span>{count}</span>
            </button>
          );
        }
      )}
    </div>
  );
}
