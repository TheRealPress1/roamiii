import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ActivitySuggestion, TripProposal, Trip } from '@/lib/tripchat-types';

interface SuggestionCacheEntry {
  suggestions: ActivitySuggestion[];
  timestamp: number;
}

// Simple in-memory cache (survives hot reloads but not page refreshes)
const suggestionCache = new Map<string, SuggestionCacheEntry>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getCacheKey(
  destination: string,
  vibeTags: string[],
  existingActivities: string[]
): string {
  return JSON.stringify({ destination, vibeTags: vibeTags.sort(), existingActivities: existingActivities.sort() });
}

interface UseSuggestionsResult {
  suggestions: ActivitySuggestion[];
  loading: boolean;
  error: string | null;
  fetchSuggestions: () => Promise<void>;
  clearCache: () => void;
}

export function useSuggestions(
  trip: Trip | null,
  lockedDestination: TripProposal | null,
  includedProposals: TripProposal[] = [],
  memberCount: number = 1
): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!lockedDestination) {
      setError('No destination selected');
      return;
    }

    const destination = lockedDestination.destination;
    const vibeTags = lockedDestination.vibe_tags || [];
    const existingActivities = includedProposals
      .filter(p => p.type === 'activity')
      .map(p => p.name || p.destination);

    // Check cache
    const cacheKey = getCacheKey(destination, vibeTags, existingActivities);
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.suggestions);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-activities', {
        body: {
          destination,
          dateStart: trip?.date_start,
          dateEnd: trip?.date_end,
          groupSize: memberCount,
          vibeTags,
          existingActivities,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const fetchedSuggestions = data.suggestions as ActivitySuggestion[];
      setSuggestions(fetchedSuggestions);

      // Update cache
      suggestionCache.set(cacheKey, {
        suggestions: fetchedSuggestions,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[useSuggestions] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  }, [trip, lockedDestination, includedProposals, memberCount]);

  const clearCache = useCallback(() => {
    suggestionCache.clear();
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    clearCache,
  };
}
