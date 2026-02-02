
# Rebrand: Roamiii → roamiii (all lowercase)

This plan updates all visible instances of "Roamiii" to "roamiii" to match the modern, lowercase brand style inspired by partiful and luma. No changes to colors, layout, spacing, or icons.

---

## Summary of Changes

All instances of capitalized "Roamiii" become lowercase "roamiii". The browser tab title gets a new format with an em-dash separator.

---

## Part 1: Logo Component

**File:** `src/components/ui/Logo.tsx`

**Changes:**
- Line 30: Replace `Roamiii` with `roamiii`
- Remove `tracking-tight` class (no letter spacing as per instructions)
- Keep `font-semibold` (600-700 weight as requested)

```text
Before: Roamiii
After:  roamiii
```

---

## Part 2: HTML Meta Tags

**File:** `index.html`

**Changes:**
- Line 6: `<title>Roamiii</title>` → `<title>roamiii — plan trips together</title>`
- Line 7: Update description to use lowercase "roamiii"
- Line 8: `<meta name="author" content="Roamiii" />` → `<meta name="author" content="roamiii" />`
- Line 10: `<meta property="og:title" content="Roamiii" />` → `<meta property="og:title" content="roamiii — plan trips together" />`

---

## Part 3: Footer

**File:** `src/components/layout/Footer.tsx`

**Changes:**
- Line 10: Replace `Roamiii` with `roamiii` in copyright text

```text
Before: © 2026 Roamiii. Plan together, travel better.
After:  © 2026 roamiii. Plan together, travel better.
```

---

## Part 4: Dashboard

**File:** `src/pages/Dashboard.tsx`

**Changes:**
- Line 120: Replace `Your Roamiii trips` with `Your roamiii trips`

```text
Before: Your Roamiii trips
After:  Your roamiii trips
```

---

## Part 5: Landing Page

**File:** `src/pages/Landing.tsx`

**Changes (3 instances):**
- Line 77: `Roamiii is where friends chat...` → `roamiii is where friends chat...`
- Line 182: `<span className="text-primary">Roamiii</span>` → `<span className="text-primary">roamiii</span>`
- Line 250: `Roamiii combines the ease...` → `roamiii combines the ease...`

---

## Part 6: Types File Comment

**File:** `src/lib/tripchat-types.ts`

**Changes:**
- Line 1: `// Roamiii type definitions` → `// roamiii type definitions`

(Internal comment only, not user-facing)

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/ui/Logo.tsx` | "Roamiii" → "roamiii", remove tracking-tight |
| `index.html` | Title, meta tags all lowercase with new format |
| `src/components/layout/Footer.tsx` | Copyright lowercase |
| `src/pages/Dashboard.tsx` | "Your roamiii trips" |
| `src/pages/Landing.tsx` | 3 text replacements |
| `src/lib/tripchat-types.ts` | Comment update |

---

## Typography Notes

The Logo component will have:
- `font-display` (Poppins - clean geometric sans-serif)
- `font-semibold` (weight 600)
- No `tracking-tight` (natural letter spacing)
- No `text-transform` applied

---

## Non-Changes (Confirmed)

- Colors remain unchanged
- Layout and spacing remain unchanged
- Icons remain unchanged
- Button text remains as-is ("Create a Trip", "Join a Trip" - not brand names)
- Internal file names and routes unchanged

---

## Acceptance Criteria

1. No visible "Roamiii" (capitalized) anywhere in the UI
2. "roamiii" appears consistently across:
   - Navbar logo
   - Footer copyright
   - Landing page (3 locations)
   - Dashboard subtitle
   - Browser tab: "roamiii — plan trips together"
3. Font weight remains semibold (600)
4. No letter spacing on wordmark
5. All app functionality unchanged
