
# Rebranding: TripChat to Roamiii

This plan renames all visible instances of "TripChat" to "Roamiii" and updates the typography system to use Agrandir Wide for brand/headline elements while keeping Inter for body text. No changes to layout, routing, colors, or backend logic.

---

## Summary of Changes

### 1. Typography System Update

**Current state:**
- Display font: Playfair Display (serif)
- Body font: Inter

**New state:**
- Brand/Display font: Agrandir Wide (with fallbacks to Agrandir, Poppins, system-ui)
- Body font: Inter (unchanged)

**Files to update:**
- `src/index.css` - Add Agrandir Wide font import or self-host, update CSS variables
- `tailwind.config.ts` - Update `fontFamily.display` to use Agrandir Wide

---

### 2. Logo Component Update

**File:** `src/components/ui/Logo.tsx`

**Changes:**
- Replace "TripChat" text with "Roamiii"
- Add tracking class for tight letter spacing (-1% to -2%)
- Ensure font-display utility applies Agrandir Wide

```text
Before: TripChat
After:  Roamiii
```

---

### 3. Footer Update

**File:** `src/components/layout/Footer.tsx`

**Changes:**
- Replace "TripChat" with "Roamiii" in copyright text

```text
Before: © 2026 TripChat. Plan together, travel better.
After:  © 2026 Roamiii. Plan together, travel better.
```

---

### 4. Landing Page Updates

**File:** `src/pages/Landing.tsx`

**Changes (3 instances):**
- Line 77: "TripChat is where friends chat..." becomes "Roamiii is where friends chat..."
- Line 182: "How TripChat Works" becomes "How Roamiii Works"
- Line 250: "TripChat combines the ease..." becomes "Roamiii combines the ease..."

---

### 5. Dashboard Updates

**File:** `src/pages/Dashboard.tsx`

**Changes (1 instance):**
- Line 120: "Your trip chats" becomes "Your Roamiii trips" (microcopy alignment)

---

### 6. HTML Meta Tags Update

**File:** `index.html`

**Changes:**
- Update `<title>` from "Lovable App" to "Roamiii"
- Update `og:title` meta tag to "Roamiii"
- Update `description` meta tag to reflect Roamiii branding

---

### 7. Types File Comment Update

**File:** `src/lib/tripchat-types.ts`

**Changes:**
- Line 1: Update comment from "TripChat type definitions" to "Roamiii type definitions"

(Note: File name stays the same to avoid breaking imports - this is a non-visual change)

---

## Files Summary

| File | Changes |
|------|---------|
| `src/index.css` | Add Agrandir Wide font, update comment |
| `tailwind.config.ts` | Update display font family |
| `src/components/ui/Logo.tsx` | Change "TripChat" to "Roamiii", add letter-spacing |
| `src/components/layout/Footer.tsx` | Update copyright text |
| `src/pages/Landing.tsx` | 3 text replacements |
| `src/pages/Dashboard.tsx` | 1 text replacement |
| `index.html` | Update meta title and descriptions |
| `src/lib/tripchat-types.ts` | Update comment only |

---

## Font Loading Strategy

Agrandir Wide will be loaded via a web font service. If Agrandir Wide is not freely available, the implementation will:

1. First attempt: Use a CDN/Google Fonts-style import if available
2. Fallback: Use Poppins (available on Google Fonts) as a similar geometric sans-serif alternative
3. Final fallback: system-ui

The font stack will be:
```css
font-family: "Agrandir Wide", "Agrandir", "Poppins", system-ui, sans-serif;
```

---

## Non-Changes (Confirmed)

These items will NOT be touched:
- Database tables and routes
- Color palette and spacing system
- Component logic and behavior
- File names (e.g., `tripchat-types.ts`, `TripChat.tsx` page component)
- Internal variable names

---

## Acceptance Criteria

1. No visible "TripChat" text anywhere in the UI
2. "Roamiii" appears in:
   - Navbar logo
   - Footer copyright
   - Landing page (3 locations)
   - Meta title in browser tab
3. Headlines and brand text use Agrandir Wide (or Poppins fallback)
4. Body text continues to use Inter
5. All app functionality unchanged
6. No console errors

---

## Technical Notes

### Typography Classes

Headlines and brand elements will use:
```html
<h1 class="font-display tracking-tight">...</h1>
```

Where `font-display` now maps to Agrandir Wide.

### Letter Spacing

The Logo component will get an additional tracking utility:
```tsx
// Slightly tighter tracking for brand wordmark
className="font-display font-semibold tracking-tight"
```

The existing Tailwind `tracking-tight` provides approximately -2.5% letter spacing, which aligns with the -1% to -2% requirement.
