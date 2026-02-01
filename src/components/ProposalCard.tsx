import { Link } from 'react-router-dom';
import { Calendar, DollarSign, MessageCircle, Users } from 'lucide-react';
import { VibeTag } from '@/components/ui/VibeTag';
import { VotePill } from '@/components/ui/VotePill';
import { BudgetBadge, formatCurrency } from '@/components/ui/BudgetBadge';
import type { Proposal, Vote, VoteType } from '@/lib/supabase-types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProposalCardProps {
  proposal: Proposal;
  votes: Vote[];
  userVote?: Vote;
  memberCount: number;
  boardBudgetMax?: number | null;
  onVote: (vote: VoteType) => void;
  compact?: boolean;
}

export function ProposalCard({ 
  proposal, 
  votes, 
  userVote,
  memberCount, 
  boardBudgetMax,
  onVote,
  compact
}: ProposalCardProps) {
  const voteCount = {
    in: votes.filter(v => v.vote === 'in').length,
    maybe: votes.filter(v => v.vote === 'maybe').length,
    out: votes.filter(v => v.vote === 'out').length,
  };

  if (compact) {
    return (
      <div className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        <div className="flex">
          <div 
            className="w-40 h-32 bg-cover bg-center flex-shrink-0"
            style={{ backgroundImage: `url(${proposal.cover_image_url})` }}
          />
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {proposal.destination}
              </h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {proposal.date_start && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(proposal.date_start), 'MMM d')}
                    {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d')}`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(proposal.estimated_cost_per_person)}/person
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <VotePill vote="in" count={voteCount.in} selected={userVote?.vote === 'in'} onClick={() => onVote('in')} size="sm" />
              <VotePill vote="maybe" count={voteCount.maybe} selected={userVote?.vote === 'maybe'} onClick={() => onVote('maybe')} size="sm" />
              <VotePill vote="out" count={voteCount.out} selected={userVote?.vote === 'out'} onClick={() => onVote('out')} size="sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={proposal.cover_image_url} 
          alt={proposal.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Tags overlay */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {proposal.vibe_tags?.slice(0, 3).map((vibe) => (
            <VibeTag key={vibe} vibe={vibe} size="sm" />
          ))}
        </div>

        {/* Budget badge */}
        <div className="absolute top-3 right-3">
          <BudgetBadge 
            estimatedCost={proposal.estimated_cost_per_person} 
            budgetMax={boardBudgetMax}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
          {proposal.destination}
        </h3>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          {(proposal.date_start || proposal.flexible_dates) && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {proposal.flexible_dates ? (
                'Flexible dates'
              ) : (
                <>
                  {proposal.date_start && format(new Date(proposal.date_start), 'MMM d')}
                  {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d')}`}
                </>
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(proposal.estimated_cost_per_person)}
            <span className="text-xs">/person</span>
          </span>
        </div>

        {/* Compatibility */}
        {boardBudgetMax && (
          <div className="text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Works for {voteCount.in + voteCount.maybe}/{memberCount} people
            </span>
          </div>
        )}

        {/* Vote Buttons */}
        <div className="flex flex-wrap gap-2">
          <VotePill 
            vote="in" 
            count={voteCount.in} 
            selected={userVote?.vote === 'in'} 
            onClick={() => onVote('in')} 
          />
          <VotePill 
            vote="maybe" 
            count={voteCount.maybe} 
            selected={userVote?.vote === 'maybe'} 
            onClick={() => onVote('maybe')} 
          />
          <VotePill 
            vote="out" 
            count={voteCount.out} 
            selected={userVote?.vote === 'out'} 
            onClick={() => onVote('out')} 
          />
        </div>
      </div>
    </div>
  );
}
