import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message, PollType } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';

export function useTripMessages(tripId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Common select query for messages with all relations
  // Note: reply_to join removed temporarily until migration is applied
  const messageSelectQuery = `
    *,
    author:profiles!messages_user_id_fkey(*),
    proposal:trip_proposals(
      *,
      votes:trip_votes(*, voter:profiles!trip_votes_user_id_fkey(id, name, email, avatar_url))
    ),
    driver:trip_members!messages_driver_id_fkey(
      *,
      profile:profiles!trip_members_user_id_fkey(*)
    ),
    poll:polls(
      *,
      votes:poll_votes(*, voter:profiles!poll_votes_user_id_fkey(id, name, email, avatar_url))
    )
  `;

  const fetchMessages = useCallback(async () => {
    try {
      console.log('[useTripMessages] Fetching messages for trip:', tripId);
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(messageSelectQuery)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[useTripMessages] Fetch error:', fetchError);
        throw fetchError;
      }
      console.log('[useTripMessages] Fetched messages:', data?.length || 0);
      setMessages(data as unknown as Message[]);
    } catch (err) {
      console.error('[useTripMessages] Error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`trip-messages-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          // Fetch the full message with relations
          const { data } = await supabase
            .from('messages')
            .select(messageSelectQuery)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as unknown as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchMessages]);

  const sendMessage = async (body: string, _replyToId?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Note: reply_to_id disabled until migration is applied
    const { error } = await supabase.from('messages').insert({
      trip_id: tripId,
      user_id: user.id,
      type: 'text',
      body,
    });

    return { error };
  };

  const sendSystemMessage = async (body: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('messages').insert({
      trip_id: tripId,
      user_id: user.id,
      type: 'system',
      body,
    });

    return { error };
  };

  const sendDriverMessage = async (driverId: string, driverName: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('messages').insert({
      trip_id: tripId,
      user_id: user.id,
      type: 'driver',
      body: `${driverName} is offering a ride!`,
      driver_id: driverId,
    });

    return { error };
  };

  const sendPollMessage = async (data: {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: string | null;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    // First create the message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'poll',
        body: data.question,
      })
      .select('id')
      .single();

    if (messageError) return { error: messageError };

    // Then create the poll
    const { error: pollError } = await supabase.from('polls').insert({
      message_id: messageData.id,
      trip_id: tripId,
      question: data.question,
      poll_type: data.pollType,
      options: data.options,
      expires_at: data.expiresAt,
    });

    if (pollError) {
      // Cleanup message if poll creation fails
      await supabase.from('messages').delete().eq('id', messageData.id);
      return { error: pollError };
    }

    return { error: null };
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendSystemMessage,
    sendDriverMessage,
    sendPollMessage,
    refetch: fetchMessages,
  };
}
