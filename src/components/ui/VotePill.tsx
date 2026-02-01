import { cn } from '@/lib/utils';
import type { VoteType } from '@/lib/supabase-types';

interface VotePillProps {
  vote: VoteType;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const voteConfig = {
  in: {
    label: "I'm In",
    emoji: '✓',
    bgClass: 'bg-vote-in-bg',
    textClass: 'text-vote-in',
    activeClass: 'bg-vote-in text-white',
    borderClass: 'border-vote-in',
  },
  maybe: {
    label: 'Maybe',
    emoji: '?',
    bgClass: 'bg-vote-maybe-bg',
    textClass: 'text-vote-maybe',
    activeClass: 'bg-vote-maybe text-white',
    borderClass: 'border-vote-maybe',
  },
  out: {
    label: "I'm Out",
    emoji: '✕',
    bgClass: 'bg-vote-out-bg',
    textClass: 'text-vote-out',
    activeClass: 'bg-vote-out text-white',
    borderClass: 'border-vote-out',
  },
};

export function VotePill({ vote, count, selected, onClick, size = 'md' }: VotePillProps) {
  const config = voteConfig[vote];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all duration-200',
        sizeClasses[size],
        selected ? config.activeClass : `${config.bgClass} ${config.textClass}`,
        onClick && !selected && `hover:${config.activeClass} hover:shadow-md border-2 border-transparent hover:${config.borderClass}`,
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {count !== undefined && (
        <span className={cn(
          'ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold',
          selected ? 'bg-white/20' : 'bg-black/5'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
