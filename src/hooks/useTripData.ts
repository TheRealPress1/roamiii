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

      // Fetch proposals with votes (including voter profiles)
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('trip_proposals')
        .select(`
          *,
          creator:profiles!trip_proposals_created_by_fkey(*),
          votes:trip_votes(*, voter:profiles!trip_votes_user_id_fkey(id, name, email, avatar_url))
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

  return {
    trip,
    members,
    proposals,
    loading,
    error,
    refetch: fetchTrip,
  };
}
