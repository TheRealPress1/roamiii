import { useState } from 'react';
import { Lock, Unlock, CheckCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TripPhase, TripProposal } from '@/lib/tripchat-types';
import { TRIP_PHASES } from '@/lib/tripchat-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';

interface PhaseActionsProps {
  tripId: string;
  currentPhase: TripPhase;
  destinationProposals: TripProposal[];
  includedProposals: TripProposal[];
  onOpenLockDestination: (proposal: TripProposal) => void;
  onOpenTransportation?: () => void;
  onPhaseChanged: () => void;
  isOwner: boolean;
  className?: string;
}

export function PhaseActions({
  tripId,
  currentPhase,
  destinationProposals,
  includedProposals,
  onOpenLockDestination,
  onOpenTransportation,
  onPhaseChanged,
  isOwner,
  className,
}: PhaseActionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<TripPhase | null>(null);

  if (!isOwner) return null;

  const handleAdvancePhase = async (targetPhase: TripPhase) => {
    if (!user) return;

    setLoading(true);
    try {
      const phaseInfo = TRIP_PHASES.find(p => p.value === targetPhase);

      const { error } = await supabase
        .from('trips')
        .update({ phase: targetPhase })
        .eq('id', tripId);

      if (error) throw error;

      // Post system message (plain text, icons rendered at display time)
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `Trip moved to: ${phaseInfo?.label || targetPhase}`,
      });

      toast.success(`Moved to ${phaseInfo?.label || targetPhase}`);
      onPhaseChanged();
    } catch (error: any) {
      console.error('Error advancing phase:', error);
      toast.error(error.message || 'Failed to advance phase');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockPhase = async () => {
    if (!user || !unlockTarget) return;

    setLoading(true);
    try {
      const updates: Record<string, any> = { phase: unlockTarget };

      // If unlocking to destination, clear the locked destination
      if (unlockTarget === 'destination') {
        updates.locked_destination_id = null;
      }

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      if (error) throw error;

      const phaseInfo = TRIP_PHASES.find(p => p.value === unlockTarget);

      // Post system message (plain text, icons rendered at display time)
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'system',
        body: `Trip reopened for: ${phaseInfo?.label || unlockTarget}`,
      });

      toast.success(`Reopened ${phaseInfo?.label || unlockTarget}`);
      setUnlockTarget(null);
      onPhaseChanged();
    } catch (error: any) {
      console.error('Error unlocking phase:', error);
      toast.error(error.message || 'Failed to unlock phase');
    } finally {
      setLoading(false);
    }
  };

  // Get the top destination proposal by votes
  const topDestination = [...destinationProposals].sort((a, b) => {
    const aScore = (a.votes || []).filter((v) => v.vote === 'in').length * 2 +
      (a.votes || []).filter((v) => v.vote === 'maybe').length;
    const bScore = (b.votes || []).filter((v) => v.vote === 'in').length * 2 +
      (b.votes || []).filter((v) => v.vote === 'maybe').length;
    return bScore - aScore;
  })[0];

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* Phase 1: Lock Destination */}
        {currentPhase === 'destination' && (
          <>
            {destinationProposals.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                No destination proposals yet. Members need to propose destinations first.
              </div>
            ) : topDestination ? (
              <Button
                onClick={() => onOpenLockDestination(topDestination)}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Lock className="h-4 w-4 mr-2" />
                Lock Destination
              </Button>
            ) : null}
          </>
        )}

        {/* Phase 2: Build Itinerary */}
        {currentPhase === 'itinerary' && (
          <>
            <Button
              onClick={() => handleAdvancePhase('transportation')}
              disabled={loading || includedProposals.length === 0}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Plan Transportation
            </Button>
            {includedProposals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Include at least one item in the itinerary first
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnlockTarget('destination')}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Reopen Destination Selection
            </Button>
          </>
        )}

        {/* Phase 3: Transportation */}
        {currentPhase === 'transportation' && (
          <>
            {onOpenTransportation && (
              <Button
                onClick={onOpenTransportation}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Plan Transportation
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnlockTarget('itinerary')}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Reopen Itinerary
            </Button>
          </>
        )}

        {/* Phase 4: Mark Ready */}
        {currentPhase === 'finalize' && (
          <>
            <Button
              onClick={() => handleAdvancePhase('ready')}
              disabled={loading}
              className="w-full bg-vote-in hover:bg-vote-in/90 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Trip Ready
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnlockTarget('transportation')}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Reopen Transportation
            </Button>
          </>
        )}

        {/* Phase 4: Reopen */}
        {currentPhase === 'ready' && (
          <Button
            variant="outline"
            onClick={() => setUnlockTarget('finalize')}
            className="w-full"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Reopen for Changes
          </Button>
        )}
      </div>

      {/* Unlock Confirmation Dialog */}
      <AlertDialog open={!!unlockTarget} onOpenChange={() => setUnlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-vote-maybe" />
              Reopen {TRIP_PHASES.find(p => p.value === unlockTarget)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will allow the group to make changes again.
              {unlockTarget === 'destination' && (
                <span className="block mt-2 text-vote-maybe">
                  Warning: This will unlock the destination and clear all itinerary progress context.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlockPhase}
              disabled={loading}
              className="bg-vote-maybe text-white hover:bg-vote-maybe/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reopening...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Reopen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
