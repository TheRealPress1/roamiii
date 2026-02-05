// Cover image presets for trip proposals
export interface CoverPreset {
  key: string;
  label: string;
  imageUrl: string;
  category?: string; // For grouping in picker modal
}

// Preset categories for the picker modal
export const PRESET_CATEGORIES = [
  { key: 'popular', label: 'Popular' },
  { key: 'culture', label: 'Museums & Culture' },
  { key: 'food', label: 'Restaurants & Food' },
  { key: 'outdoor', label: 'Outdoor & Nature' },
  { key: 'urban', label: 'Urban & Nightlife' },
  { key: 'adventure', label: 'Adventure & Sports' },
] as const;

export const COVER_PRESETS: CoverPreset[] = [
  // Popular (original presets)
  {
    key: 'skiing',
    label: 'Skiing',
    imageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'beach',
    label: 'Beach',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'cruise',
    label: 'Cruise',
    imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'city',
    label: 'City',
    imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'mountains',
    label: 'Mountains',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'roadtrip',
    label: 'Roadtrip',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'europe',
    label: 'Europe',
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=450&fit=crop',
    category: 'popular',
  },
  {
    key: 'party',
    label: 'Party',
    imageUrl: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&h=450&fit=crop',
    category: 'urban',
  },
  {
    key: 'nature',
    label: 'Nature',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',
    category: 'outdoor',
  },
  // Museums & Culture
  {
    key: 'museum',
    label: 'Museum',
    imageUrl: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&h=450&fit=crop',
    category: 'culture',
  },
  {
    key: 'gallery',
    label: 'Art Gallery',
    imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&h=450&fit=crop',
    category: 'culture',
  },
  {
    key: 'landmark',
    label: 'Landmark',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=450&fit=crop',
    category: 'culture',
  },
  {
    key: 'historical',
    label: 'Historical',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=450&fit=crop',
    category: 'culture',
  },
  // Restaurants & Food
  {
    key: 'restaurant',
    label: 'Restaurant',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=450&fit=crop',
    category: 'food',
  },
  {
    key: 'cafe',
    label: 'Café',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=450&fit=crop',
    category: 'food',
  },
  {
    key: 'foodmarket',
    label: 'Food Market',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=450&fit=crop',
    category: 'food',
  },
  {
    key: 'winery',
    label: 'Winery',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=450&fit=crop',
    category: 'food',
  },
  // Outdoor & Nature
  {
    key: 'hiking',
    label: 'Hiking',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=450&fit=crop',
    category: 'outdoor',
  },
  {
    key: 'lake',
    label: 'Lake',
    imageUrl: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&h=450&fit=crop',
    category: 'outdoor',
  },
  {
    key: 'tropical',
    label: 'Tropical',
    imageUrl: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=450&fit=crop',
    category: 'outdoor',
  },
  {
    key: 'waterfall',
    label: 'Waterfall',
    imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&h=450&fit=crop',
    category: 'outdoor',
  },
  // Urban & Nightlife
  {
    key: 'nightlife',
    label: 'Nightlife',
    imageUrl: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=450&fit=crop',
    category: 'urban',
  },
  {
    key: 'rooftop',
    label: 'Rooftop Bar',
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=450&fit=crop',
    category: 'urban',
  },
  {
    key: 'shopping',
    label: 'Shopping',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=450&fit=crop',
    category: 'urban',
  },
  {
    key: 'skyline',
    label: 'City Skyline',
    imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=450&fit=crop',
    category: 'urban',
  },
  // Adventure & Sports
  {
    key: 'surfing',
    label: 'Surfing',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&h=450&fit=crop',
    category: 'adventure',
  },
  {
    key: 'diving',
    label: 'Diving',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=450&fit=crop',
    category: 'adventure',
  },
  {
    key: 'kayak',
    label: 'Kayaking',
    imageUrl: 'https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800&h=450&fit=crop',
    category: 'adventure',
  },
  {
    key: 'safari',
    label: 'Safari',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=450&fit=crop',
    category: 'adventure',
  },
];

export const DEFAULT_COVER_URL = COVER_PRESETS.find((p) => p.key === 'nature')!.imageUrl;

export function getPresetByKey(key: string): CoverPreset | undefined {
  return COVER_PRESETS.find((p) => p.key === key);
}

export function getPresetsByCategory(category: string): CoverPreset[] {
  if (category === 'popular') {
    // Return original 9 presets for popular
    return COVER_PRESETS.filter((p) => p.category === 'popular' || ['nature', 'party'].includes(p.key));
  }
  return COVER_PRESETS.filter((p) => p.category === category);
}

/**
 * Auto-pick a cover image based on vibe tags
 * Priority-based matching from specific to general
 */
export function getAutoPickCover(vibeTags: string[]): string {
  const tags = vibeTags.map((t) => t.toLowerCase());
  const hasAny = (keywords: string[]) => keywords.some((kw) => tags.includes(kw));

  // Priority-based matching (most specific first)

  // Museums & Culture
  if (hasAny(['museum', 'gallery', 'art', 'exhibition'])) {
    return getPresetByKey('museum')!.imageUrl;
  }
  if (hasAny(['landmark', 'monument', 'tour', 'sightseeing'])) {
    return getPresetByKey('landmark')!.imageUrl;
  }
  if (hasAny(['historical', 'castle', 'ruins', 'ancient'])) {
    return getPresetByKey('historical')!.imageUrl;
  }

  // Food & Dining
  if (hasAny(['restaurant', 'dinner', 'dining', 'lunch', 'brunch'])) {
    return getPresetByKey('restaurant')!.imageUrl;
  }
  if (hasAny(['cafe', 'coffee', 'breakfast'])) {
    return getPresetByKey('cafe')!.imageUrl;
  }
  if (hasAny(['wine', 'winery', 'vineyard', 'tasting'])) {
    return getPresetByKey('winery')!.imageUrl;
  }
  if (hasAny(['food', 'foodie', 'market', 'street food'])) {
    return getPresetByKey('foodmarket')!.imageUrl;
  }

  // Adventure & Sports
  if (hasAny(['surfing', 'surf', 'waves'])) {
    return getPresetByKey('surfing')!.imageUrl;
  }
  if (hasAny(['diving', 'snorkeling', 'scuba', 'underwater'])) {
    return getPresetByKey('diving')!.imageUrl;
  }
  if (hasAny(['kayak', 'kayaking', 'paddle', 'canoe'])) {
    return getPresetByKey('kayak')!.imageUrl;
  }
  if (hasAny(['safari', 'wildlife', 'animals', 'jungle'])) {
    return getPresetByKey('safari')!.imageUrl;
  }
  if (hasAny(['skiing', 'snow', 'winter', 'ski'])) {
    return getPresetByKey('skiing')!.imageUrl;
  }

  // Nature & Outdoor
  if (hasAny(['hiking', 'hike', 'trail', 'trekking'])) {
    return getPresetByKey('hiking')!.imageUrl;
  }
  if (hasAny(['lake', 'lakeside'])) {
    return getPresetByKey('lake')!.imageUrl;
  }
  if (hasAny(['waterfall', 'falls'])) {
    return getPresetByKey('waterfall')!.imageUrl;
  }
  if (hasAny(['tropical', 'island', 'palm'])) {
    return getPresetByKey('tropical')!.imageUrl;
  }
  if (hasAny(['adventure', 'nature'])) {
    return getPresetByKey('mountains')!.imageUrl;
  }

  // Beach & Water
  if (hasAny(['beach', 'chill', 'ocean', 'seaside', 'coast'])) {
    return getPresetByKey('beach')!.imageUrl;
  }
  if (hasAny(['cruise', 'boat', 'sailing', 'yacht'])) {
    return getPresetByKey('cruise')!.imageUrl;
  }

  // Urban & Nightlife
  if (hasAny(['party', 'nightlife', 'clubbing', 'club', 'bar'])) {
    return getPresetByKey('nightlife')!.imageUrl;
  }
  if (hasAny(['rooftop', 'cocktail', 'lounge'])) {
    return getPresetByKey('rooftop')!.imageUrl;
  }
  if (hasAny(['shopping', 'mall', 'boutique', 'market'])) {
    return getPresetByKey('shopping')!.imageUrl;
  }
  if (hasAny(['city', 'urban', 'downtown', 'skyline'])) {
    return getPresetByKey('city')!.imageUrl;
  }

  // General travel
  if (hasAny(['culture', 'historic'])) {
    return getPresetByKey('europe')!.imageUrl;
  }
  if (hasAny(['roadtrip', 'driving', 'scenic', 'road trip'])) {
    return getPresetByKey('roadtrip')!.imageUrl;
  }
  if (hasAny(['luxury', 'relaxation', 'spa', 'resort'])) {
    return getPresetByKey('cruise')!.imageUrl;
  }
  if (hasAny(['romantic', 'europe', 'european'])) {
    return getPresetByKey('europe')!.imageUrl;
  }

  // Default fallback
  return DEFAULT_COVER_URL;
}

/**
 * Auto-pick cover image based on proposal name keywords
 * Used when no vibe tags are provided
 */
export function getAutoPickCoverFromName(name: string): string {
  const lowerName = name.toLowerCase();

  // Check for specific keywords in the name
  const keywordMap: [string[], string][] = [
    [['museum', 'musée', 'gallery', 'art'], 'museum'],
    [['louvre', 'uffizi', 'prado', 'met ', 'moma', 'tate'], 'museum'],
    [['restaurant', 'bistro', 'trattoria', 'brasserie'], 'restaurant'],
    [['cafe', 'café', 'coffee', 'bakery'], 'cafe'],
    [['bar', 'pub', 'club', 'nightclub', 'disco'], 'nightlife'],
    [['rooftop', 'lounge', 'cocktail'], 'rooftop'],
    [['beach', 'playa', 'praia', 'strand'], 'beach'],
    [['hike', 'hiking', 'trail', 'trek'], 'hiking'],
    [['tour', 'walking tour', 'guided'], 'landmark'],
    [['castle', 'palace', 'château', 'schloss'], 'historical'],
    [['church', 'cathedral', 'basilica', 'temple', 'shrine'], 'historical'],
    [['tower', 'monument', 'statue'], 'landmark'],
    [['market', 'mercado', 'marché', 'bazaar'], 'foodmarket'],
    [['winery', 'vineyard', 'wine'], 'winery'],
    [['safari', 'zoo', 'aquarium', 'wildlife'], 'safari'],
    [['ski', 'skiing', 'snowboard'], 'skiing'],
    [['surf', 'surfing', 'dive', 'diving', 'snorkel'], 'surfing'],
    [['kayak', 'canoe', 'paddle'], 'kayak'],
    [['shopping', 'mall', 'outlet', 'store'], 'shopping'],
    [['spa', 'wellness', 'massage'], 'cruise'],
    [['lake', 'lago', 'lac'], 'lake'],
    [['waterfall', 'falls', 'cascade'], 'waterfall'],
    [['mountain', 'peak', 'summit', 'mont'], 'mountains'],
    [['island', 'tropical', 'paradise'], 'tropical'],
  ];

  for (const [keywords, presetKey] of keywordMap) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      return getPresetByKey(presetKey)!.imageUrl;
    }
  }

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
