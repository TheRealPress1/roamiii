

# Replace Logo Image

This is a simple asset replacement. The new logo image (black rounded square with tunnel/road motif) will replace the current temporary logo.

---

## Changes

### 1. Copy New Logo Asset

**Action:** Copy the uploaded image to replace the existing logo file

```
Source: user-uploads://roamiii_1.png
Target: public/roamiii-logo-temp.png
```

---

## No Code Changes Needed

The `Logo.tsx` component already references `/roamiii-logo-temp.png`, so simply replacing the image file will update the logo everywhere:

- Top navigation bar (all pages)
- Auth screens
- Footer
- Any loading/empty states using the Logo component

---

## Files Summary

| File | Change |
|------|--------|
| `public/roamiii-logo-temp.png` | Replace with new logo image |

---

## Acceptance Criteria

1. New black square logo with tunnel/road design appears in navbar
2. Logo displays correctly at all sizes (sm: 24px, md: 28px, lg: 32px)
3. "roamiii" wordmark text still appears next to the logo
4. Hover opacity effect (90%) still works
5. Click navigates to home/dashboard

