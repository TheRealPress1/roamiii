
# Hide Global Header on Create Trip Flow

Remove the floating navbar from the Create Trip page for a cleaner, focused experience.

---

## Overview

The Create Trip flow should be a focused, distraction-free experience without the full global navigation. The page already has its own "Back" button, so removing the navbar is straightforward.

---

## Changes

### 1. Remove Header from CreateTrip Page

**File:** `src/pages/CreateTrip.tsx`

**Changes:**
- Remove the `<Header />` import
- Remove the `<Header />` component from the JSX

**Current:**
```text
import { Header } from '@/components/layout/Header';
...
<div className="min-h-screen flex flex-col bg-background">
  <Header />
  <main className="flex-1">
    <div className="container max-w-2xl py-8">
      <Button ... onClick={() => navigate('/app')}>Back</Button>
```

**New:**
```text
// No Header import
...
<div className="min-h-screen flex flex-col bg-background">
  {/* No Header component */}
  <main className="flex-1">
    <div className="container max-w-2xl py-8">
      <Button ... onClick={() => navigate('/app')}>Back</Button>
```

### 2. Adjust Top Spacing

Since we're removing the navbar, update the container padding to start appropriately from the top:

**Current:**
```text
<div className="container max-w-2xl py-8">
```

**New:**
```text
<div className="container max-w-2xl pt-8 pb-8">
```

The padding stays the same since `py-8` is equivalent to `pt-8 pb-8`. The content will now start ~32px from the top, which is appropriate for a focused flow page.

---

## Technical Details

### Why This Approach

| Approach | Pros | Cons |
|----------|------|------|
| Remove Header from page | Simple, single file | N/A |
| Route-based conditional in Header | Centralized logic | More complex, requires location hook |
| Layout wrapper pattern | Reusable | Over-engineered for one page |

The simplest approach wins: just don't render what you don't need.

### Layout After Change

```text
┌─────────────────────────────────┐
│         (no navbar)             │
├─────────────────────────────────┤
│  ← Back                         │  ← Existing button
│                                 │
│  Create a Trip                  │
│  Set up your trip...            │
│                                 │
│  [Step Indicator]               │
│                                 │
│  ┌─────────────────────────┐    │
│  │     Form Content        │    │
│  └─────────────────────────┘    │
│                                 │
│         [Continue →]            │
└─────────────────────────────────┘
```

---

## Files Summary

| File | Change |
|------|--------|
| `src/pages/CreateTrip.tsx` | Remove Header import and component |

---

## Acceptance Criteria

1. Global floating navbar is completely hidden on `/app/create`
2. "Back" button at top of page still works and navigates to dashboard
3. No layout jump or weird spacing - content starts near top
4. Navbar remains visible on dashboard and trip chat pages
5. Works when navigating to create from any entry point
