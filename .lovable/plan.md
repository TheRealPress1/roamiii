
# Dashboard Hero Spacing & Rotating Greetings

Fix the cramped hero section under the floating navbar and add dynamic rotating greetings that change daily.

---

## Overview

Two changes needed:

1. **Spacing Fix**: Add proper top padding to account for the floating navbar (which sits 16px from top + 56px height = ~72px total)
2. **Rotating Greetings**: Replace static "Hey, {name}!" with a daily-rotating one-liner from a curated list

---

## Changes

### 1. Fix Hero Spacing

**File:** `src/pages/Dashboard.tsx`

Update the main content container padding:

**Current:**
```text
<div className="container max-w-4xl py-8">
```

**New:**
```text
<div className="container max-w-4xl pt-20 md:pt-16 pb-8">
```

This adds:
- Mobile: `pt-20` = 80px top padding
- Desktop: `pt-16` = 64px top padding (navbar is more compact on larger screens)
- Keep `pb-8` for bottom padding

### 2. Add Rotating Greetings System

**File:** `src/pages/Dashboard.tsx`

Add greeting selection logic with daily persistence:

**Greetings Array:**
```text
1. "Time to move, {name}."
2. "Get the gang together, {name}."
3. "Let's lock it in, {name}."
4. "Where to next, {name}?"
5. "Round up the crew, {name}."
6. "Pick a place, {name}."
7. "Group chat → booked, {name}."
8. "Let's roam, {name}."
```

**Selection Logic:**
```text
getDailyKey()
├── Get current date
└── Return "YYYY-MM-DD" string

pickGreeting(name)
├── Build storage key: "roamiii_greeting_{dayKey}"
├── Check localStorage for cached greeting
├── If found → return with {name} interpolated
├── If not found:
│   ├── Pick random greeting from array
│   ├── Store in localStorage
│   └── Return with {name} interpolated
```

**Usage in Component:**
- Use `useMemo` to compute greeting once per render cycle
- Depends on `profile?.name`
- Falls back to "there" if name not available

### 3. Update Headline Render

**Current:**
```text
<h1>
  {profile?.name ? `Hey, ${profile.name.split(' ')[0]}!` : 'Dashboard'}
</h1>
```

**New:**
```text
<h1>
  {headline}
</h1>
```

Where `headline` is the memoized greeting with the user's first name interpolated.

---

## Technical Details

### Spacing Calculation

| Element | Value |
|---------|-------|
| Navbar top offset | 16px (top-4) |
| Navbar height | 56px (h-14) |
| Additional gap | ~8-24px for breathing room |
| **Total top padding** | 80px mobile / 64px desktop |

### LocalStorage Behavior

| Scenario | Behavior |
|----------|----------|
| First visit of day | Random greeting selected, stored |
| Page refresh same day | Same greeting retrieved |
| Next day visit | New random greeting selected |
| Login/logout same day | Same greeting (tied to date, not session) |

### No Flicker Guarantee

- Greeting computed synchronously on first render using `useMemo`
- LocalStorage is synchronous, so value is available immediately
- No async state updates that would cause re-renders

---

## Files Summary

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add top padding, implement rotating greetings with localStorage |

---

## Acceptance Criteria

1. Hero headline has clear separation from floating navbar (no cramping)
2. Greeting displays one of 8 curated one-liners
3. Same greeting persists throughout the day (localStorage)
4. New greeting appears on the next calendar day
5. User's first name is interpolated into the greeting
6. No flicker or loading state for the greeting
7. Works on both mobile and desktop viewports
