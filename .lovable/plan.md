
# Add Dark Mode Toggle

Add a theme toggle to the app that allows users to switch between light and dark modes, persisting their preference.

---

## Overview

The project already has dark mode CSS variables defined and Tailwind configured for class-based dark mode. The `next-themes` package is installed but not configured. We need to:

1. Set up the ThemeProvider wrapper
2. Create a theme toggle component
3. Add the toggle to the Header navigation

---

## Changes

### 1. Create Theme Provider Component

**File:** `src/components/ThemeProvider.tsx` (new)

Create a wrapper component using `next-themes` that:
- Wraps the app with ThemeProvider
- Sets `attribute="class"` for Tailwind compatibility
- Enables `storageKey` for localStorage persistence
- Defaults to system preference

### 2. Create Theme Toggle Component

**File:** `src/components/ThemeToggle.tsx` (new)

Create a toggle button that:
- Uses Sun/Moon icons from lucide-react
- Shows current theme state visually
- Cycles between light and dark modes
- Has smooth icon transition animation
- Styled as a ghost button to match existing nav items

### 3. Update App.tsx

**File:** `src/App.tsx`

Wrap the entire app with the ThemeProvider component.

### 4. Update Header Component

**File:** `src/components/layout/Header.tsx`

Add the ThemeToggle button to the navigation bar:
- For logged-in users: Add before the notification bell
- For logged-out users: Add before the "Log in" button
- Maintains existing layout and spacing

---

## Technical Details

### ThemeProvider Setup

```text
App
  └── ThemeProvider (attribute="class", defaultTheme="system")
        └── QueryClientProvider
              └── ... rest of app
```

### Toggle Button Behavior

| Current Theme | Click Action | Icon Shown |
|--------------|--------------|------------|
| Light        | Switch to dark | Sun icon |
| Dark         | Switch to light | Moon icon |
| System       | Follows OS preference | Current state icon |

### Storage

- Theme preference stored in localStorage under key `theme`
- Persists across sessions
- Falls back to system preference if not set

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/ThemeProvider.tsx` | New - Theme context wrapper |
| `src/components/ThemeToggle.tsx` | New - Toggle button component |
| `src/App.tsx` | Wrap with ThemeProvider |
| `src/components/layout/Header.tsx` | Add ThemeToggle to nav |

---

## Acceptance Criteria

1. Toggle button visible in header navigation (all pages)
2. Clicking toggle switches between light and dark themes
3. Theme preference persists after page refresh
4. All UI components properly styled in both themes
5. Smooth transition when switching themes
6. Works for both logged-in and logged-out users
