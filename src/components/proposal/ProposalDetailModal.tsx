import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, DollarSign, ExternalLink, Trophy, Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VibeTag } from '@/components/ui/VibeTag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TripProposal, VoteType } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProposalDetailModalProps {
  open: boolean;
  onClose: () => void;
  proposal: TripProposal | null;
  tripId: string;
  isAdmin: boolean;
  onPinned: () => void;
}

export function ProposalDetailModal({ 
  open, 
  onClose, 
  proposal, 
  tripId, 
  isAdmin, 
  onPinned 
}: ProposalDetailModalProps) {
  const { user } = useAuth();
  const [pinning, setPinning] = useState(false);

  if (!proposal) return null;

  const votes = proposal.votes || [];
  const userVote = votes.find((v) => v.user_id === user?.id);
  const voteCounts = {
    in: votes.filter((v) => v.vote === 'in').length,
    maybe: votes.filter((v) => v.vote === 'maybe').length,
    out: votes.filter((v) => v.vote === 'out').length,
  };

  const handleVote = async (voteType: VoteType) => {
    if (!user) return;

    try {
      if (userVote) {
        if (userVote.vote === voteType) {
          await supabase.from('trip_votes').delete().eq('id', userVote.id);
        } else {
          await supabase.from('trip_votes').update({ vote: voteType }).eq('id', userVote.id);
        }
      } else {
        await supabase.from('trip_votes').insert({
          trip_id: tripId,
          proposal_id: proposal.id,
          user_id: user.id,
          vote: voteType,
        });
      }
      onPinned(); // Refresh data
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handlePin = async () => {
    if (!user) return;
    
    setPinning(true);
    try {
      // Update trip with pinned proposal
      await supabase
        .from('trips')
        .update({ 
          pinned_proposal_id: proposal.id,
          status: 'decided'
        })
        .eq('id', tripId);

      // Post system message
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `🎉 Final pick pinned: ${proposal.destination}!`,
      });

      toast.success('Final pick set!');
      onPinned();
      onClose();
    } catch (error) {
      toast.error('Failed to pin proposal');
    } finally {
      setPinning(false);
    }
  };

  const totalCost = 
    proposal.cost_lodging_total + 
    proposal.cost_transport_total + 
    proposal.cost_food_total + 
    proposal.cost_activities_total;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Cover Image */}
        <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
          {proposal.cover_image_url && (
            <img
              src={proposal.cover_image_url}
              alt={proposal.destination}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {proposal.destination}
            </h2>
            {proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {proposal.vibe_tags.map((vibe) => (
                  <VibeTag key={vibe} vibe={vibe as any} />
                ))}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              {(proposal.date_start || proposal.date_end) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {proposal.date_start && format(new Date(proposal.date_start), 'MMM d')}
                    {proposal.date_end && ` - ${format(new Date(proposal.date_end), 'MMM d, yyyy')}`}
                  </span>
                  {proposal.flexible_dates && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">Flexible</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{proposal.attendee_count} people</span>
              </div>
            </div>

            {/* Cost per person highlight */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-sm text-muted-foreground mb-1">Estimated cost per person</p>
              <p className="text-3xl font-bold text-primary">${proposal.estimated_cost_per_person}</p>
            </div>

            {/* Vote buttons */}
            <div className="flex gap-3">
              <VoteButton
                type="in"
                count={voteCounts.in}
                isActive={userVote?.vote === 'in'}
                onClick={() => handleVote('in')}
              />
              <VoteButton
                type="maybe"
                count={voteCounts.maybe}
                isActive={userVote?.vote === 'maybe'}
                onClick={() => handleVote('maybe')}
              />
              <VoteButton
                type="out"
                count={voteCounts.out}
                isActive={userVote?.vote === 'out'}
                onClick={() => handleVote('out')}
              />
            </div>

            {/* Cost Breakdown */}
            {totalCost > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Cost Breakdown</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {proposal.cost_lodging_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Lodging</span>
                      <span className="font-medium">${proposal.cost_lodging_total}</span>
                    </div>
                  )}
                  {proposal.cost_transport_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Transport</span>
                      <span className="font-medium">${proposal.cost_transport_total}</span>
                    </div>
                  )}
                  {proposal.cost_food_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Food</span>
                      <span className="font-medium">${proposal.cost_food_total}</span>
                    </div>
                  )}
                  {proposal.cost_activities_total > 0 && (
                    <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Activities</span>
                      <span className="font-medium">${proposal.cost_activities_total}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lodging Links */}
            {proposal.lodging_links && proposal.lodging_links.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Lodging Options</h4>
                <div className="space-y-2">
                  {proposal.lodging_links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <span className="truncate flex-1">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Pin as Final Pick (Admin only) */}
            {isAdmin && (
              <Button
                onClick={handlePin}
                disabled={pinning}
                className="w-full bg-vote-in hover:bg-vote-in/90 text-white"
                size="lg"
              >
                {pinning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting final pick...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Pin as Final Pick
                  </>
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface VoteButtonProps {
  type: VoteType;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function VoteButton({ type, count, isActive, onClick }: VoteButtonProps) {
  const config = {
    in: { emoji: '✅', label: "I'm In", bg: 'bg-vote-in-bg', text: 'text-vote-in', activeBg: 'bg-vote-in' },
    maybe: { emoji: '🤔', label: 'Maybe', bg: 'bg-vote-maybe-bg', text: 'text-vote-maybe', activeBg: 'bg-vote-maybe' },
    out: { emoji: '❌', label: "I'm Out", bg: 'bg-vote-out-bg', text: 'text-vote-out', activeBg: 'bg-vote-out' },
  };

  const { emoji, label, bg, text, activeBg } = config[type];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-medium transition-all',
        isActive
          ? `${activeBg} text-white`
          : `${bg} ${text} hover:opacity-80`
      )}
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-sm">{label}</span>
      <span className="text-xs opacity-80">{count}</span>
    </button>
  );
}
