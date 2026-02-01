import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactionType, ProposalReaction } from '@/lib/tripchat-types';

export function useProposalReactions(proposalId: string, tripId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ProposalReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('proposal_reactions')
      .select('*')
      .eq('proposal_id', proposalId);
    
    if (!error) {
      setReactions((data || []) as ProposalReaction[]);
    }
    setLoading(false);
  }, [proposalId]);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchReactions();
    
    const channel = supabase
      .channel(`reactions-${proposalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'proposal_reactions',
        filter: `proposal_id=eq.${proposalId}`,
      }, () => {
        fetchReactions();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, fetchReactions]);

  // Toggle/change reaction
  const toggleReaction = async (reactionType: ReactionType) => {
    if (!user) return;

    const existingReaction = reactions.find(r => r.user_id === user.id);

    // Optimistic update
    if (existingReaction) {
      if (existingReaction.reaction === reactionType) {
        // Same reaction - toggle off (delete)
        setReactions(prev => prev.filter(r => r.id !== existingReaction.id));
        await supabase
          .from('proposal_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Different reaction - update
        setReactions(prev => 
          prev.map(r => 
            r.id === existingReaction.id 
              ? { ...r, reaction: reactionType, updated_at: new Date().toISOString() }
              : r
          )
        );
        await supabase
          .from('proposal_reactions')
          .update({ reaction: reactionType, updated_at: new Date().toISOString() })
          .eq('id', existingReaction.id);
      }
    } else {
      // No reaction - insert new (optimistic)
      const newReaction: ProposalReaction = {
        id: crypto.randomUUID(),
        proposal_id: proposalId,
        trip_id: tripId,
        user_id: user.id,
        reaction: reactionType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setReactions(prev => [...prev, newReaction]);
      
      await supabase
        .from('proposal_reactions')
        .insert({
          proposal_id: proposalId,
          trip_id: tripId,
          user_id: user.id,
          reaction: reactionType,
        });
    }
  };

  // Compute counts and user's reaction
  const counts = useMemo(() => ({
    interested: reactions.filter(r => r.reaction === 'interested').length,
    love: reactions.filter(r => r.reaction === 'love').length,
    nope: reactions.filter(r => r.reaction === 'nope').length,
  }), [reactions]);

  const userReaction = reactions.find(r => r.user_id === user?.id);

  return { reactions, counts, userReaction, loading, toggleReaction };
}
