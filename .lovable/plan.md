

# Partiful-Style Profile Layout + Drag-to-Crop Avatar Editor

This plan transforms the profile page into a clean, Partiful-inspired structure while adding a professional avatar cropping experience.

---

## Current State

The `/app/profile` page currently has:
- Avatar with upload button (but no crop control)
- Form fields: Name, Email (read-only), Phone, Tagline
- All fields in a single card with icon labels
- Standard form layout (label above input)

---

## Part 1: Partiful-Style Layout Restructure

### New Visual Hierarchy

```text
┌─────────────────────────────────────────────────────┐
│              [Back to Dashboard]                    │
│                                                     │
│                 ┌──────────┐                        │
│                 │  Avatar  │                        │
│                 │   112px  │                        │
│                 └──────────┘                        │
│                    [edit]                           │ ← Small "change photo" button
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Your name                                    │  │ ← Big prominent input
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Add a bio                                    │  │ ← Tagline input
│  └───────────────────────────────────────────────┘  │
│     One line your trip crew will see                │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Phone number · Only visible to you           │  │ ← Private block header
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ +1 (555) 123-4567                       │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Email · Only visible to you                  │  │ ← Private block header
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ user@email.com                (locked)  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              Save Profile                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Layout Changes

**File:** `src/pages/Profile.tsx`

1. **Remove page header section** (the icon + "Your Profile" title)
   - Keep only the back button
   - Avatar becomes the visual anchor at top

2. **Avatar section changes:**
   - Size: 112px (h-28 w-28 already matches)
   - Remove the "Upload photo" text button below
   - Add a small "change photo" overlay button at bottom-right corner of avatar
   - Keep the hover overlay for camera icon

3. **Name field redesign:**
   - Remove the label icon
   - Make input larger with bigger text (text-xl)
   - Placeholder: "Your name"
   - No visible label - the input IS the label visually

4. **Bio/Tagline field:**
   - Position directly below name
   - Placeholder: "Add a bio"
   - Smaller helper text: "One line your trip crew will see"
   - Remove icon from label

5. **Private contact blocks:**
   - Phone and Email each get a "card within card" treatment
   - Block header: "Phone number · Only visible to you" (muted text, small)
   - Input inside the block
   - Subtle background differentiation (bg-muted/50)
   - Lock icon on email field

6. **Initials generation improvement:**
   ```typescript
   const getInitials = () => {
     if (name) {
       const parts = name.trim().split(/\s+/);
       if (parts.length >= 2) {
         // First + Last initial
         return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
       }
       // Just first 2 chars of single name
       return name.slice(0, 2).toUpperCase();
     }
     if (user?.email) {
       return user.email[0].toUpperCase();
     }
     return 'U';
   };
   ```

---

## Part 2: Avatar Cropper Implementation

### Overview

When user selects an image file, instead of immediately uploading, open a crop modal where they can:
- Drag to reposition
- Zoom with a slider
- Preview the circular crop
- Save or cancel

### New Dependency

**Package:** `react-easy-crop`

Add to package.json dependencies.

### New Component

**File:** `src/components/profile/AvatarCropModal.tsx`

```typescript
interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
}
```

**Component structure:**
- Uses `Dialog` from `@radix-ui/react-dialog` (existing)
- Contains the `Cropper` component from `react-easy-crop`
- Includes zoom `Slider` (existing component)
- Cancel and Save buttons

**Cropper configuration:**
- `aspect={1}` - Square crop for avatar
- `cropShape="round"` - Circle preview
- `showGrid={false}` - Cleaner look
- Zoom range: 1 to 3

### New Utility

**File:** `src/lib/cropImage.ts`

```typescript
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  outputSize = 512
): Promise<Blob> {
  // 1. Create image element and load src
  // 2. Create canvas at outputSize x outputSize
  // 3. Draw cropped region to canvas
  // 4. Convert canvas to blob
  // 5. Return blob
}
```

This function:
- Creates an off-screen canvas
- Draws the cropped portion of the image
- Outputs a 512x512 PNG blob (good quality, reasonable size)

### Updated Upload Flow

**File:** `src/pages/Profile.tsx`

Current flow:
```text
File selected → Upload to storage → Update profile → Done
```

New flow:
```text
File selected → Open crop modal → User adjusts → Save clicked → 
Upload cropped blob to storage → Update profile → Done
```

**State additions:**
```typescript
const [cropModalOpen, setCropModalOpen] = useState(false);
const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
```

**Modified handleAvatarUpload:**
```typescript
const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate file type and size
  if (!file.type.startsWith('image/')) { ... }
  if (file.size > 5 * 1024 * 1024) { ... }
  
  // Convert to data URL for cropper
  const reader = new FileReader();
  reader.onload = () => {
    setRawImageSrc(reader.result as string);
    setCropModalOpen(true);
  };
  reader.readAsDataURL(file);
};
```

**New handleCroppedSave:**
```typescript
const handleCroppedSave = async (croppedBlob: Blob) => {
  setCropModalOpen(false);
  setUploading(true);
  
  try {
    const filePath = `${user.id}/avatar.png`;
    
    // Upload cropped blob
    await supabase.storage.from('avatars').upload(filePath, croppedBlob, {
      upsert: true,
      contentType: 'image/png'
    });
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(urlWithTimestamp);
    
    // Update profile
    await supabase.from('profiles')
      .update({ avatar_url: urlWithTimestamp })
      .eq('id', user.id);
    
    toast.success('Photo saved!');
    refreshProfile();
  } catch (error) {
    toast.error('Failed to upload photo');
  } finally {
    setUploading(false);
    setRawImageSrc(null);
  }
};
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Update | Add `react-easy-crop` dependency |
| `src/pages/Profile.tsx` | Major update | Partiful layout + cropper integration |
| `src/components/profile/AvatarCropModal.tsx` | Create | Modal with cropper, zoom slider, save/cancel |
| `src/lib/cropImage.ts` | Create | Canvas-based crop utility function |

---

## Crop Modal UI

```text
┌─────────────────────────────────────────────────────┐
│                  Adjust your photo              [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│          ┌─────────────────────────────┐            │
│          │                             │            │
│          │     [Draggable Image]       │            │
│          │                             │            │
│          │        ○ crop circle        │            │
│          │                             │            │
│          └─────────────────────────────┘            │
│                                                     │
│    [-]  ═══════════○═══════════  [+]               │ ← Zoom slider
│                                                     │
├─────────────────────────────────────────────────────┤
│              [Cancel]     [Save Photo]              │
└─────────────────────────────────────────────────────┘
```

---

## Technical Details

### react-easy-crop Types

```typescript
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

// Point = { x: number, y: number }
// Area = { x: number, y: number, width: number, height: number }
```

### Canvas Crop Implementation

```typescript
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 512
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = outputSize;
  canvas.height = outputSize;
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png', 0.95);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
```

---

## Mobile Considerations

- Crop modal should be full-screen on mobile (Dialog with `max-w-full h-full` on small screens)
- Touch drag/pinch-zoom works natively with react-easy-crop
- Zoom slider remains accessible below the crop area
- Sticky save button at bottom

---

## Acceptance Criteria

**Layout:**
- Avatar is centered at top, name field prominent below
- Bio/tagline has helper text
- Phone and Email are in "private info" styled blocks
- Clean, premium feel matching TripChat brand

**Cropper:**
- Selecting an image opens crop modal
- User can drag to reposition
- User can zoom with slider (1x to 3x)
- Cancel closes without saving
- Save uploads the cropped 512x512 image
- Works on both desktop and mobile

