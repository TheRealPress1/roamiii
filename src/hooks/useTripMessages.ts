import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/lib/tripchat-types';
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
      votes:trip_votes(*)
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

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendSystemMessage,
    refetch: fetchMessages,
  };
}
