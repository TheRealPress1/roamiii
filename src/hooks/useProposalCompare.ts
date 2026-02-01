import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProposalCompare(tripId: string) {
  const { user } = useAuth();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's compare list for this trip
  const fetchCompareList = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('proposal_compare')
      .select('proposal_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching compare list:', error);
    }
    
    setCompareIds((data || []).map(d => d.proposal_id));
    setLoading(false);
  }, [tripId, user]);

  useEffect(() => {
    fetchCompareList();
  }, [fetchCompareList]);

  // Toggle proposal in compare list
  const toggleCompare = async (proposalId: string) => {
    if (!user) {
      toast.error('Please sign in to compare proposals');
      return;
    }
    
    const isInCompare = compareIds.includes(proposalId);
    
    if (isInCompare) {
      // Optimistic update - remove from compare
      setCompareIds(prev => prev.filter(id => id !== proposalId));
      
      const { error } = await supabase
        .from('proposal_compare')
        .delete()
        .eq('proposal_id', proposalId)
        .eq('user_id', user.id);
      
      if (error) {
        // Rollback on error
        setCompareIds(prev => [...prev, proposalId]);
        toast.error('Failed to remove from compare');
        console.error('Error removing from compare:', error);
      }
    } else {
      // Check max limit
      if (compareIds.length >= 4) {
        toast.error('You can compare up to 4 proposals');
        return;
      }
      
      // Optimistic update - add to compare
      setCompareIds(prev => [...prev, proposalId]);
      
      const { error } = await supabase
        .from('proposal_compare')
        .insert({ 
          trip_id: tripId, 
          proposal_id: proposalId, 
          user_id: user.id 
        });
      
      if (error) {
        // Rollback on error
        setCompareIds(prev => prev.filter(id => id !== proposalId));
        toast.error('Failed to add to compare');
        console.error('Error adding to compare:', error);
      }
    }
  };

  // Clear all compare selections
  const clearCompare = async () => {
    if (!user) return;
    
    const previousIds = [...compareIds];
    setCompareIds([]);
    
    const { error } = await supabase
      .from('proposal_compare')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user.id);
    
    if (error) {
      setCompareIds(previousIds);
      toast.error('Failed to clear compare list');
      console.error('Error clearing compare:', error);
    }
  };

  // Check if proposal is in compare
  const isComparing = (proposalId: string) => compareIds.includes(proposalId);

  return {
    compareIds,
    compareCount: compareIds.length,
    loading,
    toggleCompare,
    clearCompare,
    isComparing,
  };
}
