import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, Clock, Users } from 'lucide-react';
import type { Message, Poll, PollVote } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PollMessageProps {
  message: Message;
  poll: Poll;
  onVoteChange?: () => void;
}

export function PollMessage({ message, poll, onVoteChange }: PollMessageProps) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const [localVotes, setLocalVotes] = useState<PollVote[]>(poll.votes || []);

  const isOwn = message.user_id === user?.id;
  const authorName = message.author?.name || message.author?.email?.split('@')[0] || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  // Check if poll is expired
  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;

  // Get user's current vote
  const userVote = useMemo(
    () => localVotes.find(v => v.user_id === user?.id),
    [localVotes, user?.id]
  );

  // Calculate vote counts per option
  const voteCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    poll.options.forEach((_, index) => {
      counts[index] = localVotes.filter(v => v.option_index === index).length;
    });
    return counts;
  }, [localVotes, poll.options]);

  const totalVotes = localVotes.length;

  // Get voters for each option
  const votersByOption = useMemo(() => {
    const result: Record<number, PollVote[]> = {};
    poll.options.forEach((_, index) => {
      result[index] = localVotes.filter(v => v.option_index === index);
    });
    return result;
  }, [localVotes, poll.options]);

  const handleVote = async (optionIndex: number) => {
    if (!user || isExpired || voting) return;

    const previousVotes = [...localVotes];
    setVoting(true);

    try {
      if (userVote) {
        if (userVote.option_index === optionIndex) {
          // Remove vote (clicking same option)
          setLocalVotes(prev => prev.filter(v => v.id !== userVote.id));
          await supabase.from('poll_votes').delete().eq('id', userVote.id);
        } else {
          // Change vote
          setLocalVotes(prev =>
            prev.map(v =>
              v.id === userVote.id
                ? { ...v, option_index: optionIndex }
                : v
            )
          );
          await supabase
            .from('poll_votes')
            .update({ option_index: optionIndex })
            .eq('id', userVote.id);
        }
      } else {
        // New vote
        const newVote: PollVote = {
          id: crypto.randomUUID(),
          poll_id: poll.id,
          user_id: user.id,
          option_index: optionIndex,
          created_at: new Date().toISOString(),
        };
        setLocalVotes(prev => [...prev, newVote]);

        const { error } = await supabase.from('poll_votes').insert({
          poll_id: poll.id,
          user_id: user.id,
          option_index: optionIndex,
        });

        if (error) throw error;
      }

      onVoteChange?.();
    } catch (error) {
      console.error('Failed to vote:', error);
      setLocalVotes(previousVotes);
      toast.error('Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group flex gap-3 px-4 py-2',
        isOwn && 'flex-row-reverse'
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.author?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {authorInitials}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[85%] min-w-[280px]', isOwn && 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isOwn ? 'You' : authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>

        <div className={cn(
          'w-full rounded-xl p-4',
          'bg-card border border-border shadow-sm'
        )}>
          {/* Question */}
          <h4 className="font-semibold text-foreground mb-3">{poll.question}</h4>

          {/* Options */}
          <div className="space-y-2">
            {poll.options.map((option, index) => {
              const count = voteCounts[index] || 0;
              const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isSelected = userVote?.option_index === index;
              const voters = votersByOption[index] || [];

              return (
                <button
                  key={index}
                  onClick={() => handleVote(index)}
                  disabled={isExpired || voting}
                  className={cn(
                    'w-full relative overflow-hidden rounded-lg border transition-all text-left',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-background',
                    (isExpired || voting) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Progress bar background */}
                  <div
                    className={cn(
                      'absolute inset-0 transition-all duration-300',
                      isSelected ? 'bg-primary/10' : 'bg-muted/50'
                    )}
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Content */}
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{option}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Voter avatars (max 3) */}
                      {voters.length > 0 && (
                        <div className="flex -space-x-2">
                          {voters.slice(0, 3).map((vote) => (
                            <Avatar key={vote.user_id} className="h-5 w-5 border-2 border-background">
                              <AvatarImage src={vote.voter?.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {(vote.voter?.name || vote.voter?.email || '?').slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {voters.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-[8px] text-muted-foreground">
                                +{voters.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground min-w-[36px] text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
            {poll.expires_at && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isExpired ? 'text-destructive' : 'text-muted-foreground'
              )}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {isExpired
                    ? 'Poll ended'
                    : `Ends ${format(new Date(poll.expires_at), 'MMM d, h:mm a')}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
