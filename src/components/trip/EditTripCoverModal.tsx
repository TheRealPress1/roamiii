import { useState, useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CoverImagePicker } from '@/components/proposal/CoverImagePicker';
import { CoverCropModal } from './CoverCropModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trip } from '@/lib/tripchat-types';
import { COVER_PRESETS } from '@/lib/cover-presets';

interface EditTripCoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onUpdate: (updatedTrip: Trip) => void;
}

export function EditTripCoverModal({ open, onOpenChange, trip, onUpdate }: EditTripCoverModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    const preset = COVER_PRESETS.find(p => p.imageUrl === trip.cover_image_url);
    return preset?.key || null;
  });
  const [selectedUrl, setSelectedUrl] = useState<string | null>(trip.cover_image_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const handleSelect = (key: string, url: string) => {
    setSelectedKey(key);
    setSelectedUrl(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Convert to data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCroppedSave = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setUploading(true);

    try {
      const filePath = `trips/${trip.id}/cover.png`;

      // Upload cropped blob to tripchat-images bucket
      const { error: uploadError } = await supabase.storage
        .from('tripchat-images')
        .upload(filePath, croppedBlob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tripchat-images')
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // Set as selected (clear preset key since it's a custom upload)
      setSelectedKey(null);
      setSelectedUrl(urlWithTimestamp);

      toast.success('Image uploaded!');
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setRawImageSrc(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: selectedUrl })
        .eq('id', trip.id);

      if (error) throw error;

      onUpdate({ ...trip, cover_image_url: selectedUrl });
      toast.success('Cover image updated!');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating trip cover:', err);
      toast.error('Failed to update cover image');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: null })
        .eq('id', trip.id);

      if (error) throw error;

      onUpdate({ ...trip, cover_image_url: null });
      toast.success('Cover image removed');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error removing trip cover:', err);
      toast.error('Failed to remove cover image');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Trip Cover</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30">
              {selectedUrl ? (
                <img
                  src={selectedUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No cover image
                </div>
              )}
            </div>

            {/* Upload Custom Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Custom Image
                </>
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Preset Image Picker */}
            <CoverImagePicker
              selectedKey={selectedKey}
              onSelect={handleSelect}
              vibeTags={[]}
            />

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {trip.cover_image_url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemove}
                  disabled={saving}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !selectedUrl}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Modal */}
      {rawImageSrc && (
        <CoverCropModal
          open={cropModalOpen}
          imageSrc={rawImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageSrc(null);
          }}
          onSave={handleCroppedSave}
        />
      )}
    </>
  );
}
