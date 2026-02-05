import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TripTemplate, TemplateCategory } from '@/lib/tripchat-types';

interface UseTripTemplatesResult {
  templates: TripTemplate[];
  featuredTemplates: TripTemplate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getTemplatesByCategory: (category: TemplateCategory) => TripTemplate[];
}

export function useTripTemplates(): UseTripTemplatesResult {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trip_templates')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      // Parse JSONB fields
      const parsedTemplates: TripTemplate[] = (data || []).map(t => ({
        ...t,
        suggested_activities: Array.isArray(t.suggested_activities)
          ? t.suggested_activities
          : [],
        suggested_housing: Array.isArray(t.suggested_housing)
          ? t.suggested_housing
          : [],
        vibe_tags: t.vibe_tags || [],
      }));

      setTemplates(parsedTemplates);
    } catch (err) {
      console.error('[useTripTemplates] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const featuredTemplates = templates.filter(t => t.is_featured);

  const getTemplatesByCategory = useCallback(
    (category: TemplateCategory): TripTemplate[] => {
      return templates.filter(t => t.category === category);
    },
    [templates]
  );

  return {
    templates,
    featuredTemplates,
    loading,
    error,
    refetch: fetchTemplates,
    getTemplatesByCategory,
  };
}
