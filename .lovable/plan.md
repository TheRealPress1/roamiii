

# Frictionless Cover Image System

Replace the manual URL input with a click-to-select preset gallery and intelligent auto-pick based on vibe tags.

---

## Overview

Transform the proposal creation experience by removing friction from cover image selection. Users will choose from beautiful preset images or let the system auto-select based on their vibe tag choices.

---

## Architecture

```text
Cover Image Flow:
┌────────────────────────────────────────────────────────────────┐
│  CreateProposalModal                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Cover Image Section                                      │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Selected Preview (if any)                          │  │  │
│  │  │  [Chosen image with checkmark overlay]              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Choose a cover:             [✨ Auto pick]              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ 🎿 Skiing │ 🏖️ Beach │ 🚢 Cruise │ 🏙️ City │ ... │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Changes

### 1. Create Cover Image Presets Data

**File:** `src/lib/cover-presets.ts` (new)

Define the preset cover images with categories and URLs:

```text
Categories:
├── skiing      → Snowy mountain scene
├── beach       → Tropical beach 
├── cruise      → Ocean cruise ship
├── city        → Urban skyline
├── mountains   → Mountain landscape
├── roadtrip    → Open road/car
├── europe      → European architecture
├── party       → Nightlife/celebration
├── nature      → Forest/wilderness
└── default     → Gradient fallback

Structure:
├── COVER_PRESETS: Array of { key, label, emoji, imageUrl }
├── getPresetByKey(key): Get preset by key
├── getAutoPickCover(vibeTags): Smart selection based on vibes
└── DEFAULT_COVER_URL: Fallback gradient image
```

Vibe-to-Cover Mapping:
| Vibe Tags | Suggested Cover |
|-----------|-----------------|
| adventure, nature | mountains |
| beach, chill | beach |
| city, culture, food | city |
| party | party |
| luxury | cruise or europe |
| romantic | beach or europe |
| Default | nature |

### 2. Create CoverImagePicker Component

**File:** `src/components/proposal/CoverImagePicker.tsx` (new)

A reusable component for selecting cover images:

```text
Props:
├── selectedKey: string | null
├── onSelect: (key: string, url: string) => void
├── vibeTags: string[] (for auto-pick)
└── previewUrl?: string (current selection preview)

Features:
├── Horizontal scrolling gallery of presets
├── Each preset shows:
│   ├── Thumbnail image (aspect-[3/2], rounded)
│   ├── Emoji + label below
│   └── Ring highlight when selected
├── "Auto pick" button that uses vibeTags to select
└── Selected preview at top (aspect-video)
```

### 3. Update CreateProposalModal

**File:** `src/components/proposal/CreateProposalModal.tsx`

Replace the URL input with the new picker:

```text
Changes:
├── Remove: coverImageUrl state + URL Input
├── Add: coverImageKey state (string | null)
├── Add: computed coverImageUrl from key or auto-pick
├── Import: CoverImagePicker, getPresetByKey, getAutoPickCover
├── Update validation: remove coverImageUrl requirement
├── Update submit: use resolved coverImageUrl
└── Add: Effect to auto-set cover when vibeTags change (optional)
```

Current validation:
```text
if (!user || !destination.trim() || !coverImageUrl.trim())
```

New validation:
```text
if (!user || !destination.trim())
// coverImageUrl auto-resolves from key or auto-pick
```

Before submit, resolve final URL:
```text
const finalCoverUrl = coverImageKey 
  ? getPresetByKey(coverImageKey)?.imageUrl 
  : getAutoPickCover(vibeTags);
```

### 4. Update Form Layout

Current layout (lines 215-236):
```text
{/* Cover Image URL */}
<div className="space-y-2">
  <Label htmlFor="coverImage">Cover Image URL *</Label>
  <Input ... />
  {coverImageUrl && <preview />}
</div>
```

New layout:
```text
{/* Cover Image */}
<div className="space-y-3">
  <CoverImagePicker
    selectedKey={coverImageKey}
    onSelect={(key, url) => {
      setCoverImageKey(key);
      setCoverImageUrl(url);
    }}
    vibeTags={vibeTags}
  />
</div>
```

---

## Technical Details

### Preset Image URLs

Using high-quality Unsplash photos (stable URLs):

| Key | Image Theme | Unsplash URL |
|-----|-------------|--------------|
| skiing | Snow mountains | https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&h=450&fit=crop |
| beach | Tropical beach | https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=450&fit=crop |
| cruise | Cruise ship | https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=450&fit=crop |
| city | City skyline | https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=450&fit=crop |
| mountains | Mountain vista | https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=450&fit=crop |
| roadtrip | Open road | https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=450&fit=crop |
| europe | European town | https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=450&fit=crop |
| party | Night celebration | https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&h=450&fit=crop |
| nature | Forest/lake | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop |

### Auto-Pick Algorithm

```text
function getAutoPickCover(vibeTags: string[]): string {
  // Priority-based matching
  if (hasAny(['adventure', 'nature'])) return presets.mountains.url;
  if (hasAny(['beach', 'chill'])) return presets.beach.url;
  if (hasAny(['city', 'culture', 'food'])) return presets.city.url;
  if (hasAny(['party'])) return presets.party.url;
  if (hasAny(['luxury'])) return presets.cruise.url;
  if (hasAny(['romantic'])) return presets.europe.url;
  return presets.nature.url; // Default fallback
}
```

### Fallback Behavior

1. User selects a preset → use that URL
2. User doesn't select but has vibe tags → auto-pick based on vibes
3. No selection, no vibes → use default (nature) cover

---

## UI Component Details

### CoverImagePicker Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  Selected Preview (when selection exists)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │            [Cover Image Preview]                      │  │
│  │               aspect-video                            │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Cover Image          [✨ Auto pick]                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Horizontal scroll →                                     ││
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        ││
│  │ │  🎿 │ │  🏖️ │ │  🚢 │ │  🏙️ │ │  ⛰️  │ │  🚗 │ ...    ││
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        ││
│  │ Skiing  Beach  Cruise  City  Mountains Roadtrip        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

Preset tile styling:
- Thumbnail: 96x64px (aspect-[3/2]), rounded-lg
- Selected: ring-2 ring-primary ring-offset-2
- Hover: scale-105 transition
- Label: text-xs text-center below image

---

## Files Summary

| File | Change |
|------|--------|
| `src/lib/cover-presets.ts` | New - Preset data and auto-pick logic |
| `src/components/proposal/CoverImagePicker.tsx` | New - Picker UI component |
| `src/components/proposal/CreateProposalModal.tsx` | Update - Replace URL input with picker |

---

## Acceptance Criteria

1. URL input is removed from proposal form
2. Horizontal gallery of 9 preset images shown
3. Clicking a preset selects it with visual feedback
4. Selected image shows as preview above gallery
5. "Auto pick" button selects cover based on vibe tags
6. Form submits without requiring manual image selection
7. If no selection, system auto-picks based on vibes or defaults
8. Proposal card always displays a cover image
9. Existing proposal display code works unchanged (still uses cover_image_url)

