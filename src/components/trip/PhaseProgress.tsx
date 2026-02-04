import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripPhase, TripProposal } from '@/lib/tripchat-types';
import { TRIP_PHASES } from '@/lib/tripchat-types';
import { SFSymbol } from '@/components/icons';
import { TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';

interface PhaseProgressProps {
  currentPhase: TripPhase;
  lockedDestination?: TripProposal | null;
  className?: string;
}

export function PhaseProgress({ currentPhase, lockedDestination, className }: PhaseProgressProps) {
  const currentPhaseIndex = TRIP_PHASES.findIndex(p => p.value === currentPhase);

  // Only show the first 3 phases in progress bar (ready is the final state)
  const displayPhases = TRIP_PHASES.slice(0, 3);

  return (
    <div className={cn('bg-card border-b border-border p-4', className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-3">
        {displayPhases.map((phase, index) => {
          const isCompleted = currentPhaseIndex > index || currentPhase === 'ready';
          const isCurrent = phase.value === currentPhase;
          const isUpcoming = currentPhaseIndex < index;

          return (
            <div key={phase.value} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all',
                    isCompleted && 'bg-vote-in text-white',
                    isCurrent && 'bg-primary text-white ring-4 ring-primary/20',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <SFSymbol
                      name={TRIP_PHASE_ICON_MAP[phase.value as TripPhase]}
                      size="md"
                      className={isCurrent ? 'invert' : ''}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-medium text-center',
                    isCurrent && 'text-primary',
                    isCompleted && 'text-vote-in',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < displayPhases.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded-full transition-all',
                    currentPhaseIndex > index || currentPhase === 'ready'
                      ? 'bg-vote-in'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Locked Destination Banner (shows in Phase 2+) */}
      {lockedDestination && currentPhase !== 'destination' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Destination locked:
          </span>
          <span className="text-sm text-primary font-semibold">
            {lockedDestination.name || lockedDestination.destination}
          </span>
        </div>
      )}

      {/* Ready State Banner */}
      {currentPhase === 'ready' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-vote-in/10 border border-vote-in/20 rounded-lg">
          <SFSymbol name="party.popper.fill" size="md" />
          <span className="text-sm font-medium text-vote-in">
            Trip is ready! All planning complete.
          </span>
        </div>
      )}
    </div>
  );
}
