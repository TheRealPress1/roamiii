
# Floating Pill Navbar with Custom Wordmark

Transform the navbar into a floating, translucent pill-style container and update the "roamiii" wordmark to use a playful, rounded display font matching the Campfire style.

---

## Overview

This update involves two main changes:

1. **Floating Navbar**: Convert the full-width sticky header into a centered, floating pill/card with rounded corners, translucent background, and subtle shadow
2. **Wordmark Typography**: Update the "roamiii" text to use a thick, rounded display font (Fredoka) that matches the attached reference image

---

## Changes

### 1. Add Custom Font

**File:** `src/index.css`

Add Fredoka font import for the brand wordmark:
- Import from Google Fonts: `Fredoka` (thick, rounded display font)
- This font closely matches the "Campfire" style with its playful, rounded letterforms

### 2. Update Tailwind Config

**File:** `tailwind.config.ts`

Add a new font family for the brand wordmark:
- Add `brand: ["Fredoka", ...]` to the font families
- Keep existing `display` and `sans` fonts unchanged

### 3. Restructure Header Component

**File:** `src/components/layout/Header.tsx`

Transform the header into a floating pill navbar:

**Structure:**
```text
<div> (sticky outer wrapper)
  └── <header> (floating pill container)
        ├── Logo
        └── Nav items
```

**Outer Wrapper:**
- `position: sticky; top: 16px; z-index: 50;`
- Adds horizontal padding for mobile (16px each side)
- Full width, acts as positioning context

**Inner Floating Container:**
- `max-width: 1120px` centered
- `width: calc(100% - 32px)` with `mx-auto`
- Rounded corners: `rounded-2xl` (16px)
- Translucent background: `bg-white/75` (light) / `bg-black/60` (dark)
- Backdrop blur: `backdrop-blur-xl`
- Border: `border border-black/[0.06]` (light) / `border-white/10` (dark)
- Shadow: subtle drop shadow
- Padding: `px-4 sm:px-6`

### 4. Update Logo Component

**File:** `src/components/ui/Logo.tsx`

Apply the new brand font to the wordmark:
- Change `font-display` to `font-brand`
- Adjust font weight to `font-medium` (Fredoka looks best at medium weight)
- Keep existing sizing logic

---

## Technical Details

### Font Import

```css
@import url('...&family=Fredoka:wght@400;500;600&display=swap');
```

### Navbar Dimensions

| Breakpoint | Width | Horizontal Margin |
|------------|-------|-------------------|
| Mobile | calc(100% - 32px) | 16px each side |
| Desktop | max 1120px | auto-centered |

### Styling Tokens

| Property | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | rgba(255,255,255,0.75) | rgba(0,0,0,0.6) |
| Border | rgba(0,0,0,0.06) | rgba(255,255,255,0.1) |
| Blur | 16px (backdrop-blur-xl) | 16px |
| Shadow | soft drop shadow | slightly reduced |
| Border Radius | 16px (rounded-2xl) | 16px |

### Scroll Behavior

Keep existing scroll state logic but adjust:
- Default: slightly more transparent
- Scrolled: increase opacity, enhance shadow

---

## Files Summary

| File | Change |
|------|--------|
| `src/index.css` | Add Fredoka font import |
| `tailwind.config.ts` | Add `brand` font family |
| `src/components/layout/Header.tsx` | Restructure to floating pill navbar |
| `src/components/ui/Logo.tsx` | Apply brand font to wordmark |

---

## Acceptance Criteria

1. Navbar floats with ~16px gap from viewport top
2. Navbar has rounded corners (pill/card appearance)
3. Translucent background with visible backdrop blur effect
4. Subtle border and shadow visible
5. Navbar remains centered and doesn't clip on mobile
6. "roamiii" wordmark uses the new thick, rounded font
7. No layout shift or jitter while scrolling
8. Works correctly in both light and dark modes
9. Scroll-aware styling still applies (enhanced shadow when scrolled)
