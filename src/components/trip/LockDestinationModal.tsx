import { useState } from 'react';
import { MapPin, Lock, Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VibeTag } from '@/components/ui/VibeTag';
import type { TripProposal } from '@/lib/tripchat-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SFSymbol } from '@/components/icons';
import { VOTE_INDICATOR_ICON_MAP } from '@/lib/icon-mappings';

interface LockDestinationModalProps {
  open: boolean;
  onClose: () => void;
  proposal: TripProposal;
  tripId: string;
  onLocked: () => void;
}

export function LockDestinationModal({
  open,
  onClose,
  proposal,
  tripId,
  onLocked,
}: LockDestinationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const votes = proposal.votes || [];
  const voteCounts = {
    in: votes.filter((v) => v.vote === 'in').length,
    maybe: votes.filter((v) => v.vote === 'maybe').length,
    out: votes.filter((v) => v.vote === 'out').length,
  };

  const handleLock = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update trip: set locked_destination_id and move to itinerary phase
      const { error } = await supabase
        .from('trips')
        .update({
          locked_destination_id: proposal.id,
          phase: 'itinerary',
        })
        .eq('id', tripId);

      if (error) throw error;

      // Mark this proposal as included automatically
      await supabase
        .from('trip_proposals')
        .update({ included: true })
        .eq('id', proposal.id);

      // Post system message (plain text, icons rendered at display time)
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `Destination locked: ${proposal.name || proposal.destination}! Now let's build the itinerary.`,
      });

      toast.success('Destination locked! Moving to itinerary planning.');
      onLocked();
      onClose();
    } catch (error: any) {
      console.error('Error locking destination:', error);
      toast.error(error.message || 'Failed to lock destination');
    } finally {
      setLoading(false);
    }
  };

  const displayName = proposal.name || proposal.destination;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Lock Destination
          </DialogTitle>
          <DialogDescription>
            This will finalize the destination and move the trip to itinerary planning.
          </DialogDescription>
        </DialogHeader>

        {/* Destination Preview */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-border">
            {/* Cover Image */}
            <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
              {proposal.cover_image_url ? (
                <img
                  src={proposal.cover_image_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {displayName}
                </h3>
              </div>
            </div>

            {/* Vote Summary */}
            <div className="p-3 bg-card">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-vote-in">
                    <SFSymbol name={VOTE_INDICATOR_ICON_MAP.in} size="sm" /> {voteCounts.in} in
                  </span>
                  <span className="flex items-center gap-1 text-vote-maybe">
                    <SFSymbol name={VOTE_INDICATOR_ICON_MAP.maybe} size="sm" /> {voteCounts.maybe} maybe
                  </span>
                  <span className="flex items-center gap-1 text-vote-out">
                    <SFSymbol name={VOTE_INDICATOR_ICON_MAP.out} size="sm" /> {voteCounts.out} out
                  </span>
                </div>
              </div>
              {proposal.vibe_tags && proposal.vibe_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {proposal.vibe_tags.slice(0, 3).map((vibe) => (
                    <VibeTag key={vibe} vibe={vibe as any} size="sm" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p>
              <strong>What happens next:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Destination voting ends</li>
              <li>Members can add itinerary items (activities, food spots, etc.)</li>
              <li>You can unlock the destination later if needed</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleLock}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Destination
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
