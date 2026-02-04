import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

interface UseLinkPreviewResult {
  preview: LinkPreview | null;
  loading: boolean;
  error: string | null;
}

// In-memory cache to avoid redundant fetches within the same session
const previewCache = new Map<string, LinkPreview>();
const pendingFetches = new Map<string, Promise<LinkPreview | null>>();

export function useLinkPreview(url: string | null): UseLinkPreviewResult {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check memory cache first
    const cached = previewCache.get(url);
    if (cached) {
      setPreview(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if there's already a pending fetch for this URL
    const pendingFetch = pendingFetches.get(url);
    if (pendingFetch) {
      setLoading(true);
      pendingFetch.then(result => {
        if (result) {
          setPreview(result);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        setError('Failed to load preview');
      });
      return;
    }

    const fetchPreview = async (): Promise<LinkPreview | null> => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from Supabase cache first
        const { data: cachedData } = await supabase
          .from('link_previews')
          .select('*')
          .eq('url', url)
          .single();

        if (cachedData) {
          const preview: LinkPreview = {
            url: cachedData.url,
            title: cachedData.title,
            description: cachedData.description,
            image_url: cachedData.image_url,
            site_name: cachedData.site_name,
          };
          previewCache.set(url, preview);
          setPreview(preview);
          setLoading(false);
          return preview;
        }

        // Fetch from edge function
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
          body: { url },
        });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (data && !data.error) {
          const preview: LinkPreview = {
            url: data.url || url,
            title: data.title,
            description: data.description,
            image_url: data.image_url,
            site_name: data.site_name,
          };
          previewCache.set(url, preview);
          setPreview(preview);
          setLoading(false);
          return preview;
        } else {
          setError(data?.error || 'Failed to load preview');
          setLoading(false);
          return null;
        }
      } catch (err: any) {
        console.error('Error fetching link preview:', err);
        setError(err.message || 'Failed to load preview');
        setLoading(false);
        return null;
      } finally {
        pendingFetches.delete(url);
      }
    };

    const fetchPromise = fetchPreview();
    pendingFetches.set(url, fetchPromise);
  }, [url]);

  return { preview, loading, error };
}

// Hook for fetching multiple previews at once
export function useLinkPreviews(urls: string[]): Map<string, UseLinkPreviewResult> {
  const [results, setResults] = useState<Map<string, UseLinkPreviewResult>>(new Map());

  useEffect(() => {
    if (urls.length === 0) {
      setResults(new Map());
      return;
    }

    // Initialize results with loading state
    const initialResults = new Map<string, UseLinkPreviewResult>();
    urls.forEach(url => {
      const cached = previewCache.get(url);
      if (cached) {
        initialResults.set(url, { preview: cached, loading: false, error: null });
      } else {
        initialResults.set(url, { preview: null, loading: true, error: null });
      }
    });
    setResults(new Map(initialResults));

    // Fetch uncached URLs
    const uncachedUrls = urls.filter(url => !previewCache.has(url));

    uncachedUrls.forEach(async (url) => {
      try {
        // Try Supabase cache
        const { data: cachedData } = await supabase
          .from('link_previews')
          .select('*')
          .eq('url', url)
          .single();

        if (cachedData) {
          const preview: LinkPreview = {
            url: cachedData.url,
            title: cachedData.title,
            description: cachedData.description,
            image_url: cachedData.image_url,
            site_name: cachedData.site_name,
          };
          previewCache.set(url, preview);
          setResults(prev => {
            const next = new Map(prev);
            next.set(url, { preview, loading: false, error: null });
            return next;
          });
          return;
        }

        // Fetch from edge function
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
          body: { url },
        });

        if (fetchError) throw new Error(fetchError.message);

        if (data && !data.error) {
          const preview: LinkPreview = {
            url: data.url || url,
            title: data.title,
            description: data.description,
            image_url: data.image_url,
            site_name: data.site_name,
          };
          previewCache.set(url, preview);
          setResults(prev => {
            const next = new Map(prev);
            next.set(url, { preview, loading: false, error: null });
            return next;
          });
        } else {
          setResults(prev => {
            const next = new Map(prev);
            next.set(url, { preview: null, loading: false, error: data?.error || 'Failed' });
            return next;
          });
        }
      } catch (err: any) {
        setResults(prev => {
          const next = new Map(prev);
          next.set(url, { preview: null, loading: false, error: err.message });
          return next;
        });
      }
    });
  }, [urls.join(',')]);

  return results;
}
