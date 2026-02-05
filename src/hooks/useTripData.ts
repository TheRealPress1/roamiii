import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Trip, TripMember, TripProposal, ExpenseCategory } from '@/lib/tripchat-types';

export function useTripData(tripId: string) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [proposals, setProposals] = useState<TripProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrip = useCallback(async () => {
    try {
      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData as Trip);

      // Fetch members with profiles (only active members)
      // Use explicit foreign key reference since there are two: user_id and removed_by
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select(`
          *,
          profile:profiles!trip_members_user_id_fkey(id, name, email, avatar_url)
        `)
        .eq('trip_id', tripId)
        .eq('status', 'active');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }
      console.log('Fetched members:', membersData);
      setMembers((membersData || []) as unknown as TripMember[]);

      // Fetch proposals with votes (including voter profiles) and booker
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('trip_proposals')
        .select(`
          *,
          creator:profiles!trip_proposals_created_by_fkey(*),
          votes:trip_votes(*, voter:profiles!trip_votes_user_id_fkey(id, name, email, avatar_url)),
          booker:profiles!trip_proposals_booked_by_fkey(id, name, email, avatar_url)
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;
      setProposals(proposalsData as unknown as TripProposal[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();

    // Subscribe to vote changes
    const votesChannel = supabase
      .channel(`trip-votes-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_votes',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Refetch proposals when votes change
          fetchTrip();
        }
      )
      .subscribe();

    // Subscribe to member changes
    const membersChannel = supabase
      .channel(`trip-members-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Refetch when members change (includes carpool updates)
          fetchTrip();
        }
      )
      .subscribe();

    // Subscribe to trip changes
    const tripChannel = supabase
      .channel(`trip-details-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        () => {
          // Refetch when trip changes (phase, travel_mode, etc.)
          fetchTrip();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(tripChannel);
    };
  }, [tripId, fetchTrip]);

  // Claim a booking for a proposal - marks it as booked by current user and creates an expense
  const claimBooking = useCallback(async (proposalId: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };

    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return { error: new Error('Proposal not found') };
    if (proposal.booked_by) return { error: new Error('Already booked') };

    try {
      // 1. Update proposal with booked_by
      const { error: updateError } = await supabase
        .from('trip_proposals')
        .update({
          booked_by: user.id,
          booked_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      // 2. Create an expense for the proposal cost
      const totalCost = proposal.estimated_cost_per_person * members.length;
      if (totalCost > 0) {
        // Determine category based on proposal type
        const categoryMap: Record<string, ExpenseCategory> = {
          housing: 'housing',
          activity: 'activity',
        };
        const category = categoryMap[proposal.type] || 'other';

        // Create expense
        const { data: expenseData, error: expenseError } = await supabase
          .from('trip_expenses')
          .insert({
            trip_id: tripId,
            paid_by: user.id,
            amount: totalCost,
            description: `Booking: ${proposal.name || proposal.destination}`,
            category,
            expense_date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();

        if (expenseError) throw expenseError;

        // Create splits for all members
        const perPerson = Math.round((totalCost * 100) / members.length) / 100;
        const remainder = Math.round((totalCost - perPerson * members.length) * 100) / 100;

        const splits = members.map((member, index) => ({
          expense_id: expenseData.id,
          user_id: member.user_id,
          amount: index === 0 ? perPerson + remainder : perPerson,
        }));

        const { error: splitError } = await supabase
          .from('expense_splits')
          .insert(splits);

        if (splitError) {
          // Cleanup expense if splits fail
          await supabase.from('trip_expenses').delete().eq('id', expenseData.id);
          throw splitError;
        }
      }

      // Refresh data
      await fetchTrip();
      return { error: null };
    } catch (err) {
      console.error('[useTripData] Claim booking error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to claim booking') };
    }
  }, [user, proposals, members, tripId, fetchTrip]);

  return {
    trip,
    members,
    proposals,
    loading,
    error,
    refetch: fetchTrip,
    claimBooking,
  };
}
