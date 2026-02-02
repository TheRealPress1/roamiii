// Cover image presets for trip proposals
export interface CoverPreset {
  key: string;
  label: string;
  emoji: string;
  imageUrl: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    key: 'skiing',
    label: 'Skiing',
    emoji: '🎿',
    imageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&h=450&fit=crop',
  },
  {
    key: 'beach',
    label: 'Beach',
    emoji: '🏖️',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop',
  },
  {
    key: 'cruise',
    label: 'Cruise',
    emoji: '🚢',
    imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=450&fit=crop',
  },
  {
    key: 'city',
    label: 'City',
    emoji: '🏙️',
    imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=450&fit=crop',
  },
  {
    key: 'mountains',
    label: 'Mountains',
    emoji: '⛰️',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop',
  },
  {
    key: 'roadtrip',
    label: 'Roadtrip',
    emoji: '🚗',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=450&fit=crop',
  },
  {
    key: 'europe',
    label: 'Europe',
    emoji: '🏰',
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=450&fit=crop',
  },
  {
    key: 'party',
    label: 'Party',
    emoji: '🎉',
    imageUrl: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&h=450&fit=crop',
  },
  {
    key: 'nature',
    label: 'Nature',
    emoji: '🌲',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',
  },
];

export const DEFAULT_COVER_URL = COVER_PRESETS.find((p) => p.key === 'nature')!.imageUrl;

export function getPresetByKey(key: string): CoverPreset | undefined {
  return COVER_PRESETS.find((p) => p.key === key);
}

/**
 * Auto-pick a cover image based on vibe tags
 * Priority-based matching from specific to general
 */
export function getAutoPickCover(vibeTags: string[]): string {
  const tags = vibeTags.map((t) => t.toLowerCase());
  const hasAny = (keywords: string[]) => keywords.some((kw) => tags.includes(kw));

  // Priority-based matching
  if (hasAny(['adventure', 'nature', 'hiking'])) {
    return getPresetByKey('mountains')!.imageUrl;
  }
  if (hasAny(['beach', 'chill', 'tropical'])) {
    return getPresetByKey('beach')!.imageUrl;
  }
  if (hasAny(['city', 'culture', 'food', 'foodie', 'urban'])) {
    return getPresetByKey('city')!.imageUrl;
  }
  if (hasAny(['party', 'nightlife', 'clubbing'])) {
    return getPresetByKey('party')!.imageUrl;
  }
  if (hasAny(['luxury', 'cruise', 'relaxation'])) {
    return getPresetByKey('cruise')!.imageUrl;
  }
  if (hasAny(['romantic', 'europe', 'historical'])) {
    return getPresetByKey('europe')!.imageUrl;
  }
  if (hasAny(['roadtrip', 'driving', 'scenic'])) {
    return getPresetByKey('roadtrip')!.imageUrl;
  }
  if (hasAny(['skiing', 'snow', 'winter'])) {
    return getPresetByKey('skiing')!.imageUrl;
  }

  // Default fallback
  return DEFAULT_COVER_URL;
}

/**
 * Get the preset key that matches the given vibe tags
 */
export function getAutoPickKey(vibeTags: string[]): string {
  const url = getAutoPickCover(vibeTags);
  const preset = COVER_PRESETS.find((p) => p.imageUrl === url);
  return preset?.key || 'nature';
}
