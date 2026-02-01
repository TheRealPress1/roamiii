import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Trip, TripMember, TripProposal } from '@/lib/tripchat-types';

export function useTripData(tripId: string) {
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

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('trip_id', tripId);

      if (membersError) throw membersError;
      setMembers(membersData as unknown as TripMember[]);

      // Fetch proposals with votes
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('trip_proposals')
        .select(`
          *,
          creator:profiles!trip_proposals_created_by_fkey(*),
          votes:trip_votes(*)
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

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [tripId, fetchTrip]);

  return {
    trip,
    members,
    proposals,
    loading,
    error,
    refetch: fetchTrip,
  };
}
