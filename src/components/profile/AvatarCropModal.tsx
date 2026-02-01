import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { Minus, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { getCroppedImg } from '@/lib/cropImage';

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
}

export function AvatarCropModal({ open, imageSrc, onClose, onSave }: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      onSave(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Adjust your photo</DialogTitle>
        </DialogHeader>

        {/* Cropper Container */}
        <div className="relative w-full h-64 sm:h-80 bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Zoom Slider */}
        <div className="px-6 py-4 flex items-center gap-3">
          <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(values) => setZoom(values[0])}
            className="flex-1"
          />
          <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>

        <DialogFooter className="p-6 pt-2 flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 gradient-primary text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
