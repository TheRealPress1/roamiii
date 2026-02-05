import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Trip, TripProposal, TripMember, TripPhase, TripVote } from '@/lib/tripchat-types';
import { voteTypeToScore } from '@/lib/tripchat-types';
import { toast } from 'sonner';

interface UseAutoLockProps {
  trip: Trip | null;
  proposals: TripProposal[];
  members: TripMember[];
  onAutoLocked: () => void;
  userId?: string;
}

interface AutoLockResult {
  shouldAutoLock: boolean;
  allVoted: boolean;
  deadlinePassed: boolean;
  winningProposal: TripProposal | null;
  votedCount: number;
  totalMembers: number;
  deadline: Date | null;
}

/**
 * Hook that monitors voting status and auto-locks proposals when:
 * 1. All active members have voted on at least one proposal in the category
 * 2. The voting deadline has passed
 *
 * When both conditions are met, the highest voted proposal is auto-locked.
 */
export function useAutoLock({
  trip,
  proposals,
  members,
  onAutoLocked,
  userId,
}: UseAutoLockProps) {
  // Get active members only
  const activeMembers = members.filter(m => m.status === 'active');

  // Determine which phase we're checking
  const currentPhase = trip?.phase || 'destination';

  // Get relevant proposals based on phase
  const relevantProposals = currentPhase === 'destination'
    ? proposals.filter(p => p.is_destination)
    : proposals.filter(p => !p.is_destination);

  // Get the appropriate deadline
  const deadline = currentPhase === 'destination'
    ? trip?.destination_voting_deadline
    : trip?.itinerary_voting_deadline;

  /**
   * Check if all members have voted on at least one proposal in the category
   */
  const checkAllVoted = useCallback((): { allVoted: boolean; votedCount: number } => {
    if (relevantProposals.length === 0) {
      return { allVoted: false, votedCount: 0 };
    }

    // Collect all votes across all relevant proposals
    const allVotes = relevantProposals.flatMap(p => p.votes || []);

    // Get unique user IDs who have voted
    const voterIds = new Set(allVotes.map(v => v.user_id));

    // Check if all active members have voted
    const allVoted = activeMembers.every(m => voterIds.has(m.user_id));

    return { allVoted, votedCount: voterIds.size };
  }, [relevantProposals, activeMembers]);

  /**
   * Check if the deadline has passed
   */
  const checkDeadlinePassed = useCallback((): boolean => {
    if (!deadline) return false;
    return new Date(deadline) <= new Date();
  }, [deadline]);

  /**
   * Get the winning proposal by highest average temperature score
   */
  const getWinningProposal = useCallback((): TripProposal | null => {
    if (relevantProposals.length === 0) return null;

    // Helper to calculate average temperature
    const getAverageTemperature = (votes: TripVote[]): number => {
      if (votes.length === 0) return 0;
      return votes.reduce((sum, v) => sum + (v.score ?? voteTypeToScore(v.vote)), 0) / votes.length;
    };

    return [...relevantProposals].sort((a, b) => {
      const aAvg = getAverageTemperature(a.votes || []);
      const bAvg = getAverageTemperature(b.votes || []);
      return bAvg - aAvg; // Higher average temperature wins
    })[0] || null;
  }, [relevantProposals]);

  /**
   * Get the current auto-lock status
   */
  const getAutoLockStatus = useCallback((): AutoLockResult => {
    const { allVoted, votedCount } = checkAllVoted();
    const deadlinePassed = checkDeadlinePassed();
    const winningProposal = getWinningProposal();

    return {
      shouldAutoLock: allVoted && deadlinePassed && winningProposal !== null,
      allVoted,
      deadlinePassed,
      winningProposal,
      votedCount,
      totalMembers: activeMembers.length,
      deadline: deadline ? new Date(deadline) : null,
    };
  }, [checkAllVoted, checkDeadlinePassed, getWinningProposal, activeMembers.length, deadline]);

  /**
   * Perform the auto-lock
   */
  const performAutoLock = useCallback(async (winningProposal: TripProposal) => {
    if (!trip || !userId) return;

    try {
      if (currentPhase === 'destination') {
        // Lock destination and advance to itinerary
        const { error } = await supabase
          .from('trips')
          .update({
            locked_destination_id: winningProposal.id,
            phase: 'itinerary' as TripPhase,
          })
          .eq('id', trip.id);

        if (error) throw error;

        // Mark proposal as included
        await supabase
          .from('trip_proposals')
          .update({ included: true })
          .eq('id', winningProposal.id);

        // Post system message
        await supabase.from('messages').insert({
          trip_id: trip.id,
          user_id: userId,
          type: 'system',
          body: `Voting complete! Destination auto-locked: ${winningProposal.name || winningProposal.destination}`,
        });

        toast.success('Destination auto-locked based on votes!');
      } else {
        // For itinerary phase, just mark the winning proposal as included
        const { error } = await supabase
          .from('trip_proposals')
          .update({ included: true })
          .eq('id', winningProposal.id);

        if (error) throw error;

        // Post system message
        await supabase.from('messages').insert({
          trip_id: trip.id,
          user_id: userId,
          type: 'system',
          body: `Voting complete! "${winningProposal.name || winningProposal.destination}" added to plan.`,
        });

        toast.success('Proposal auto-added to plan based on votes!');
      }

      onAutoLocked();
    } catch (error) {
      console.error('Auto-lock failed:', error);
      toast.error('Failed to auto-lock proposal');
    }
  }, [trip, userId, currentPhase, onAutoLocked]);

  // Check for auto-lock conditions periodically
  useEffect(() => {
    if (!trip || !userId) return;

    // Don't auto-lock if already past the relevant phase
    if (currentPhase === 'destination' && trip.locked_destination_id) return;

    const status = getAutoLockStatus();

    if (status.shouldAutoLock && status.winningProposal) {
      performAutoLock(status.winningProposal);
    }
  }, [trip, userId, currentPhase, getAutoLockStatus, performAutoLock]);

  // Also check when deadline is reached (set up a timer)
  useEffect(() => {
    if (!deadline || !trip) return;

    const deadlineDate = new Date(deadline);
    const now = new Date();

    if (deadlineDate <= now) return; // Already passed

    const timeUntilDeadline = deadlineDate.getTime() - now.getTime();

    // Set timeout to check right when deadline passes
    const timer = setTimeout(() => {
      const status = getAutoLockStatus();
      if (status.shouldAutoLock && status.winningProposal && userId) {
        performAutoLock(status.winningProposal);
      }
    }, timeUntilDeadline + 1000); // Add 1 second buffer

    return () => clearTimeout(timer);
  }, [deadline, trip, userId, getAutoLockStatus, performAutoLock]);

  return {
    ...getAutoLockStatus(),
    activeMembers,
    currentPhase,
  };
}

/**
 * Utility hook for getting just the voting status display info
 */
export function useVotingStatus(
  trip: Trip | null,
  proposals: TripProposal[],
  members: TripMember[]
) {
  const activeMembers = members.filter(m => m.status === 'active');
  const currentPhase = trip?.phase || 'destination';

  const relevantProposals = currentPhase === 'destination'
    ? proposals.filter(p => p.is_destination)
    : proposals.filter(p => !p.is_destination);

  const deadline = currentPhase === 'destination'
    ? trip?.destination_voting_deadline
    : trip?.itinerary_voting_deadline;

  // Get unique voters
  const allVotes = relevantProposals.flatMap(p => p.votes || []);
  const voterIds = new Set(allVotes.map(v => v.user_id));

  return {
    votedCount: voterIds.size,
    totalMembers: activeMembers.length,
    allVoted: activeMembers.every(m => voterIds.has(m.user_id)),
    deadline: deadline ? new Date(deadline) : null,
    deadlinePassed: deadline ? new Date(deadline) <= new Date() : false,
    hasDeadline: !!deadline,
  };
}
