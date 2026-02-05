import { supabase } from '@/integrations/supabase/client';
import { getAutoPickCover, getAutoPickCoverFromName, DEFAULT_COVER_URL } from './cover-presets';

export type CoverImageSource = 'og' | 'unsplash' | 'preset' | 'custom';

export interface CoverImageResult {
  url: string;
  source: CoverImageSource;
  attribution?: {
    photographer?: string;
    link?: string;
  };
}

export interface UnsplashSearchResult {
  image_url: string;
  photographer: string;
  unsplash_link: string;
}

/**
 * Fetch link preview from edge function
 */
async function fetchLinkPreview(url: string): Promise<{ image_url: string | null } | null> {
  try {
    // First check cache
    const { data: cached } = await supabase
      .from('link_previews')
      .select('image_url')
      .eq('url', url)
      .single();

    if (cached?.image_url) {
      return { image_url: cached.image_url };
    }

    // Fetch from edge function
    const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
      body: { url },
    });

    if (error || data?.error) {
      console.warn('[cover-resolver] Link preview failed:', error?.message || data?.error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[cover-resolver] Error fetching link preview:', err);
    return null;
  }
}

/**
 * Search Unsplash for images matching a query
 */
export async function searchUnsplash(query: string): Promise<UnsplashSearchResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('search-unsplash', {
      body: { query },
    });

    if (error || data?.error) {
      console.warn('[cover-resolver] Unsplash search failed:', error?.message || data?.error);
      return null;
    }

    return data as UnsplashSearchResult;
  } catch (err) {
    console.error('[cover-resolver] Error searching Unsplash:', err);
    return null;
  }
}

/**
 * Smart cover image resolution with fallback chain:
 * 1. If proposalUrl provided → try OG image from link preview
 * 2. If no OG image → search Unsplash by proposalName
 * 3. Fallback → use preset based on vibeTags or name keywords
 */
export async function resolveCoverImage(params: {
  proposalUrl?: string | null;
  proposalName: string;
  vibeTags?: string[];
}): Promise<CoverImageResult> {
  const { proposalUrl, proposalName, vibeTags = [] } = params;

  // Step 1: Try OG image from URL
  if (proposalUrl && proposalUrl.startsWith('http')) {
    const preview = await fetchLinkPreview(proposalUrl);
    if (preview?.image_url) {
      return {
        url: preview.image_url,
        source: 'og',
      };
    }
  }

  // Step 2: Search Unsplash by proposal name
  if (proposalName.trim()) {
    const unsplashResult = await searchUnsplash(proposalName);
    if (unsplashResult?.image_url) {
      return {
        url: unsplashResult.image_url,
        source: 'unsplash',
        attribution: {
          photographer: unsplashResult.photographer,
          link: unsplashResult.unsplash_link,
        },
      };
    }
  }

  // Step 3: Fallback to preset based on vibe tags or name
  let presetUrl: string;
  if (vibeTags.length > 0) {
    presetUrl = getAutoPickCover(vibeTags);
  } else if (proposalName.trim()) {
    presetUrl = getAutoPickCoverFromName(proposalName);
  } else {
    presetUrl = DEFAULT_COVER_URL;
  }

  return {
    url: presetUrl,
    source: 'preset',
  };
}

/**
 * Quick resolution for preview (sync version using just presets)
 */
export function resolvePresetCover(params: {
  proposalName: string;
  vibeTags?: string[];
}): CoverImageResult {
  const { proposalName, vibeTags = [] } = params;

  let presetUrl: string;
  if (vibeTags.length > 0) {
    presetUrl = getAutoPickCover(vibeTags);
  } else if (proposalName.trim()) {
    presetUrl = getAutoPickCoverFromName(proposalName);
  } else {
    presetUrl = DEFAULT_COVER_URL;
  }

  return {
    url: presetUrl,
    source: 'preset',
  };
}
