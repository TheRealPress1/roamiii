
# Sticky Frosted Glass Navbar

Enhance the main navbar with a premium sticky translucent design featuring scroll-aware styling.

---

## Overview

The Header component already has `sticky top-0 z-50` positioning. We'll enhance it with:
- Consistent frosted glass background (translucent with blur)
- Scroll-aware shadow that appears after scrolling
- Subtle bottom border for definition
- Works seamlessly in both light and dark modes

---

## Changes

### 1. Update Header Component

**File:** `src/components/layout/Header.tsx`

Add scroll state tracking and enhanced styling:

- Add `useState` for tracking scroll position
- Add `useEffect` with scroll listener (threshold: 8px)
- Apply dynamic classes based on scroll state:
  - Always: translucent background with backdrop blur
  - On scroll: add shadow and slightly more opaque background
- Remove the `transparent` prop logic in favor of consistent frosted glass appearance

### 2. Updated Styling Logic

```text
Default State (not scrolled):
├── bg-background/60 (60% opacity)
├── backdrop-blur-xl (strong blur)
├── border-b border-transparent
└── shadow-none

Scrolled State (after 8px):
├── bg-background/80 (80% opacity)
├── backdrop-blur-xl
├── border-b border-border/50 (subtle border)
└── shadow-sm (soft shadow)
```

### 3. Dark Mode Compatibility

The styling uses CSS variables (`bg-background`) which automatically adapt to dark mode. The opacity and blur values work well in both themes.

---

## Technical Details

### Scroll Listener Hook

```text
useEffect:
├── Define handleScroll function
├── Check window.scrollY > 8
├── Set isScrolled state
├── Add 'scroll' event listener with { passive: true }
└── Cleanup: remove listener on unmount
```

### CSS Classes Applied

| State | Background | Blur | Border | Shadow |
|-------|-----------|------|--------|--------|
| Default | bg-background/60 | backdrop-blur-xl | border-transparent | none |
| Scrolled | bg-background/80 | backdrop-blur-xl | border-border/50 | shadow-sm |

### Transition

Smooth transition between states using `transition-all duration-300` for a polished feel.

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/layout/Header.tsx` | Add scroll listener and enhanced frosted glass styling |

---

## Acceptance Criteria

1. Navbar stays pinned at top while scrolling (sticky)
2. Translucent frosted glass effect visible on all pages
3. Shadow appears smoothly after scrolling 8px
4. Content beneath does not jump (height preserved at h-16)
5. Works on both desktop and mobile
6. Existing nav items remain aligned right
7. Smooth transition between default and scrolled states
8. Works correctly in both light and dark modes
