// ── Poster Theme System ──
// Gradient/pattern-based poster backgrounds (like Partiful)
// Stored as "poster:<key>" in cover_image_url column

export type PosterCategory = 'warm' | 'cool' | 'vibrant' | 'dark' | 'playful' | 'minimal';

export interface PosterTheme {
  key: string;
  label: string;
  category: PosterCategory;
  background: string; // CSS gradient
  pattern?: string;   // Optional SVG pattern overlay as CSS background-image
  textColor: 'light' | 'dark'; // For contrast
}

export const POSTER_CATEGORIES: { key: PosterCategory; label: string }[] = [
  { key: 'warm', label: 'Warm' },
  { key: 'cool', label: 'Cool' },
  { key: 'vibrant', label: 'Vibrant' },
  { key: 'dark', label: 'Dark' },
  { key: 'playful', label: 'Playful' },
  { key: 'minimal', label: 'Minimal' },
];

// ── SVG Pattern Generators ──

const dotPattern = (color: string, size = 2, spacing = 20) => {
  const svg = `<svg width="${spacing}" height="${spacing}" xmlns="http://www.w3.org/2000/svg"><circle cx="${spacing / 2}" cy="${spacing / 2}" r="${size}" fill="${color}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const wavePattern = (color: string, opacity = 0.15) => {
  const svg = `<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M0 10 Q25 0 50 10 Q75 20 100 10" fill="none" stroke="${color}" stroke-width="1.5" opacity="${opacity}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const diagonalPattern = (color: string, opacity = 0.08) => {
  const svg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M-4 4l8-8M0 16l16-16M12 20l8-8" stroke="${color}" stroke-width="1" opacity="${opacity}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const gridPattern = (color: string, opacity = 0.06) => {
  const svg = `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h40v40" fill="none" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const confettiPattern = (opacity = 0.12) => {
  const svg = `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="8" width="4" height="4" rx="1" fill="#ff6b6b" opacity="${opacity}" transform="rotate(15 12 10)"/><rect x="40" y="15" width="3" height="6" rx="1" fill="#ffd93d" opacity="${opacity}" transform="rotate(-20 41 18)"/><rect x="25" y="40" width="5" height="3" rx="1" fill="#6bcb77" opacity="${opacity}" transform="rotate(30 27 41)"/><rect x="50" y="45" width="4" height="4" rx="1" fill="#4d96ff" opacity="${opacity}" transform="rotate(-10 52 47)"/><rect x="8" y="50" width="3" height="5" rx="1" fill="#ff6b9d" opacity="${opacity}" transform="rotate(25 9 52)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const starsPattern = (color: string, opacity = 0.1) => {
  const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="15" r="1" fill="${color}" opacity="${opacity}"/><circle cx="60" cy="30" r="1.5" fill="${color}" opacity="${opacity * 0.8}"/><circle cx="10" cy="55" r="1" fill="${color}" opacity="${opacity * 0.6}"/><circle cx="45" cy="65" r="1.2" fill="${color}" opacity="${opacity}"/><circle cx="70" cy="10" r="0.8" fill="${color}" opacity="${opacity * 0.7}"/><circle cx="35" cy="40" r="1.3" fill="${color}" opacity="${opacity * 0.9}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

// ── Theme Definitions ──

export const POSTER_THEMES: PosterTheme[] = [
  // ── Warm ──
  {
    key: 'sunset-glow',
    label: 'Sunset Glow',
    category: 'warm',
    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
    textColor: 'light',
  },
  {
    key: 'coral-dream',
    label: 'Coral Dream',
    category: 'warm',
    background: 'linear-gradient(160deg, #ff6b6b 0%, #ee5a24 30%, #f0932b 60%, #ffeaa7 100%)',
    pattern: wavePattern('#fff', 0.1),
    textColor: 'light',
  },
  {
    key: 'golden-hour',
    label: 'Golden Hour',
    category: 'warm',
    background: 'linear-gradient(135deg, #f9ca24 0%, #f0932b 40%, #eb4d4b 100%)',
    textColor: 'light',
  },
  {
    key: 'peach-fuzz',
    label: 'Peach Fuzz',
    category: 'warm',
    background: 'linear-gradient(145deg, #FFBE98 0%, #E88D67 40%, #BB5A5A 100%)',
    pattern: dotPattern('rgba(255,255,255,0.12)', 1.5, 24),
    textColor: 'light',
  },
  {
    key: 'blush-rose',
    label: 'Blush Rose',
    category: 'warm',
    background: 'linear-gradient(135deg, #fbc2eb 0%, #e6a0c4 30%, #c47799 60%, #a855f7 100%)',
    textColor: 'light',
  },
  {
    key: 'terra-cotta',
    label: 'Terra Cotta',
    category: 'warm',
    background: 'linear-gradient(155deg, #D4A373 0%, #BC6C25 40%, #8B4513 80%, #6B3410 100%)',
    pattern: diagonalPattern('#fff', 0.08),
    textColor: 'light',
  },

  // ── Cool ──
  {
    key: 'ocean-breeze',
    label: 'Ocean Breeze',
    category: 'cool',
    background: 'linear-gradient(135deg, #667eea 0%, #3b82f6 40%, #06b6d4 70%, #22d3ee 100%)',
    textColor: 'light',
  },
  {
    key: 'arctic-frost',
    label: 'Arctic Frost',
    category: 'cool',
    background: 'linear-gradient(160deg, #E0F7FA 0%, #80DEEA 30%, #4DD0E1 60%, #00ACC1 100%)',
    pattern: dotPattern('rgba(255,255,255,0.15)', 1.5, 28),
    textColor: 'dark',
  },
  {
    key: 'twilight',
    label: 'Twilight',
    category: 'cool',
    background: 'linear-gradient(135deg, #2c3e50 0%, #4a69bd 40%, #6c5ce7 70%, #a29bfe 100%)',
    pattern: starsPattern('#fff', 0.15),
    textColor: 'light',
  },
  {
    key: 'mint-breeze',
    label: 'Mint Breeze',
    category: 'cool',
    background: 'linear-gradient(145deg, #a8edea 0%, #65d6ce 30%, #38a89d 60%, #2d8f88 100%)',
    textColor: 'dark',
  },
  {
    key: 'steel-blue',
    label: 'Steel Blue',
    category: 'cool',
    background: 'linear-gradient(155deg, #74b9ff 0%, #5f8dd3 30%, #4a69bd 60%, #3d5a99 100%)',
    pattern: gridPattern('#fff', 0.08),
    textColor: 'light',
  },
  {
    key: 'deep-teal',
    label: 'Deep Teal',
    category: 'cool',
    background: 'linear-gradient(140deg, #004D40 0%, #00695C 30%, #00897B 60%, #4DB6AC 100%)',
    pattern: wavePattern('#fff', 0.08),
    textColor: 'light',
  },

  // ── Vibrant ──
  {
    key: 'neon-nights',
    label: 'Neon Nights',
    category: 'vibrant',
    background: 'linear-gradient(135deg, #f953c6 0%, #b91d73 30%, #6a0572 60%, #370070 100%)',
    textColor: 'light',
  },
  {
    key: 'electric-lime',
    label: 'Electric Lime',
    category: 'vibrant',
    background: 'linear-gradient(145deg, #CCFF00 0%, #89E51C 30%, #32CD32 60%, #228B22 100%)',
    textColor: 'dark',
  },
  {
    key: 'rainbow-sherbet',
    label: 'Rainbow Sherbet',
    category: 'vibrant',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 20%, #FFD93D 40%, #6BCB77 60%, #4D96FF 80%, #9B59B6 100%)',
    textColor: 'light',
  },
  {
    key: 'tropical-punch',
    label: 'Tropical Punch',
    category: 'vibrant',
    background: 'linear-gradient(150deg, #ff6b6b 0%, #ffa502 25%, #2ed573 50%, #1e90ff 75%, #a855f7 100%)',
    pattern: confettiPattern(0.15),
    textColor: 'light',
  },
  {
    key: 'candy-pop',
    label: 'Candy Pop',
    category: 'vibrant',
    background: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 30%, #FF85C0 50%, #FFB6C1 70%, #FFC0CB 100%)',
    pattern: dotPattern('rgba(255,255,255,0.15)', 2, 18),
    textColor: 'light',
  },
  {
    key: 'aurora-borealis',
    label: 'Aurora',
    category: 'vibrant',
    background: 'linear-gradient(170deg, #00c9ff 0%, #92fe9d 25%, #f7ff00 50%, #ff6e7f 75%, #bfe9ff 100%)',
    textColor: 'dark',
  },

  // ── Dark ──
  {
    key: 'midnight',
    label: 'Midnight',
    category: 'dark',
    background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 30%, #2d2b55 60%, #3b3870 100%)',
    pattern: starsPattern('#fff', 0.2),
    textColor: 'light',
  },
  {
    key: 'deep-ocean',
    label: 'Deep Ocean',
    category: 'dark',
    background: 'linear-gradient(160deg, #000428 0%, #001a3a 30%, #004e71 60%, #006d8f 100%)',
    pattern: wavePattern('#4dd0e1', 0.1),
    textColor: 'light',
  },
  {
    key: 'cosmic',
    label: 'Cosmic',
    category: 'dark',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #4a148c 100%)',
    pattern: starsPattern('#e1bee7', 0.12),
    textColor: 'light',
  },
  {
    key: 'noir',
    label: 'Noir',
    category: 'dark',
    background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 30%, #383838 60%, #434343 100%)',
    pattern: diagonalPattern('#fff', 0.04),
    textColor: 'light',
  },
  {
    key: 'dark-ember',
    label: 'Dark Ember',
    category: 'dark',
    background: 'linear-gradient(155deg, #1a0a00 0%, #3d1c00 25%, #6b2f00 50%, #b34700 75%, #ff6b00 100%)',
    textColor: 'light',
  },
  {
    key: 'deep-purple',
    label: 'Deep Purple',
    category: 'dark',
    background: 'linear-gradient(140deg, #12002e 0%, #2a0845 30%, #4a148c 60%, #7c4dff 100%)',
    textColor: 'light',
  },

  // ── Playful ──
  {
    key: 'bubblegum',
    label: 'Bubblegum',
    category: 'playful',
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #ffdde1 100%)',
    pattern: dotPattern('rgba(255,105,180,0.12)', 2, 22),
    textColor: 'dark',
  },
  {
    key: 'confetti',
    label: 'Confetti',
    category: 'playful',
    background: 'linear-gradient(135deg, #fff8e1 0%, #ffe0ec 30%, #e8d5f5 60%, #d5f5e3 100%)',
    pattern: confettiPattern(0.2),
    textColor: 'dark',
  },
  {
    key: 'sherbet',
    label: 'Sherbet',
    category: 'playful',
    background: 'linear-gradient(145deg, #f093fb 0%, #f5576c 25%, #ffd86f 50%, #4facfe 75%, #43e97b 100%)',
    textColor: 'dark',
  },
  {
    key: 'lavender-haze',
    label: 'Lavender Haze',
    category: 'playful',
    background: 'linear-gradient(140deg, #E8D5F5 0%, #D5C6F0 30%, #C4B0EB 50%, #B39DDB 70%, #9575CD 100%)',
    pattern: wavePattern('rgba(149,117,205,0.1)', 0.08),
    textColor: 'dark',
  },
  {
    key: 'mint-chip',
    label: 'Mint Chip',
    category: 'playful',
    background: 'linear-gradient(155deg, #C8E6C9 0%, #A5D6A7 30%, #81C784 60%, #66BB6A 100%)',
    pattern: dotPattern('rgba(56,142,60,0.1)', 2, 20),
    textColor: 'dark',
  },
  {
    key: 'cotton-candy',
    label: 'Cotton Candy',
    category: 'playful',
    background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 40%, #f9a8d4 70%, #c084fc 100%)',
    textColor: 'dark',
  },

  // ── Minimal ──
  {
    key: 'cream',
    label: 'Cream',
    category: 'minimal',
    background: 'linear-gradient(160deg, #fdfcfb 0%, #f5f0e8 30%, #e8d5b7 60%, #d4b896 100%)',
    textColor: 'dark',
  },
  {
    key: 'fog',
    label: 'Fog',
    category: 'minimal',
    background: 'linear-gradient(145deg, #f5f7fa 0%, #e4e8ed 30%, #c3cfe2 60%, #a3b1c6 100%)',
    pattern: gridPattern('#94a3b8', 0.06),
    textColor: 'dark',
  },
  {
    key: 'soft-blush',
    label: 'Soft Blush',
    category: 'minimal',
    background: 'linear-gradient(150deg, #ffecd2 0%, #fcb69f 50%, #f8a489 100%)',
    textColor: 'dark',
  },
  {
    key: 'sage',
    label: 'Sage',
    category: 'minimal',
    background: 'linear-gradient(155deg, #e8efe5 0%, #c5d5bc 30%, #9cba8f 60%, #7da872 100%)',
    textColor: 'dark',
  },
  {
    key: 'dove',
    label: 'Dove',
    category: 'minimal',
    background: 'linear-gradient(140deg, #f8f9fa 0%, #e9ecef 25%, #dee2e6 50%, #ced4da 75%, #adb5bd 100%)',
    pattern: diagonalPattern('#6c757d', 0.04),
    textColor: 'dark',
  },
  {
    key: 'warm-linen',
    label: 'Warm Linen',
    category: 'minimal',
    background: 'linear-gradient(150deg, #FAF0E6 0%, #F5DEB3 30%, #DEB887 60%, #D2B48C 100%)',
    textColor: 'dark',
  },
];

// ── Utility Functions ──

/** Check if a cover_image_url represents a poster theme */
export function isPosterCover(coverUrl: string | null | undefined): boolean {
  return !!coverUrl?.startsWith('poster:');
}

/** Extract poster key from "poster:<key>" string */
export function getPosterKeyFromCover(coverUrl: string): string {
  return coverUrl.replace('poster:', '');
}

/** Get a poster theme by its key */
export function getPosterTheme(key: string): PosterTheme | undefined {
  return POSTER_THEMES.find((t) => t.key === key);
}

/** Get poster themes by category */
export function getPostersByCategory(category: PosterCategory): PosterTheme[] {
  return POSTER_THEMES.filter((t) => t.category === category);
}

/** Get CSS background properties for a poster theme */
export function getPosterBackground(theme: PosterTheme): React.CSSProperties {
  if (theme.pattern) {
    return {
      background: `${theme.pattern}, ${theme.background}`,
    };
  }
  return {
    background: theme.background,
  };
}
