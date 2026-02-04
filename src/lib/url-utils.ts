/**
 * URL utilities for link preview functionality
 */

// Regex to match URLs in text
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * Extract all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : []; // Deduplicate
}

/**
 * Extract the domain from a URL for display
 */
export function getUrlDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix for cleaner display
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Check if a URL is from a known video/media platform
 */
export function isMediaUrl(url: string): boolean {
  const domain = getUrlDomain(url).toLowerCase();
  const mediaDomains = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'facebook.com',
    'twitch.tv',
  ];
  return mediaDomains.some(d => domain.includes(d));
}

/**
 * Get a friendly site name from a URL
 */
export function getSiteName(url: string): string {
  const domain = getUrlDomain(url).toLowerCase();

  const siteNames: Record<string, string> = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'tiktok.com': 'TikTok',
    'instagram.com': 'Instagram',
    'twitter.com': 'Twitter',
    'x.com': 'X',
    'facebook.com': 'Facebook',
    'airbnb.com': 'Airbnb',
    'booking.com': 'Booking.com',
    'tripadvisor.com': 'TripAdvisor',
    'vrbo.com': 'Vrbo',
    'viator.com': 'Viator',
    'expedia.com': 'Expedia',
    'yelp.com': 'Yelp',
    'google.com': 'Google',
  };

  for (const [key, name] of Object.entries(siteNames)) {
    if (domain.includes(key)) return name;
  }

  // Capitalize first letter of domain
  const baseDomain = domain.split('.')[0];
  return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
}
