import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CoverImagePicker } from '@/components/proposal/CoverImagePicker';
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
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    // Find the key if current cover matches a preset
    const preset = COVER_PRESETS.find(p => p.imageUrl === trip.cover_image_url);
    return preset?.key || null;
  });
  const [selectedUrl, setSelectedUrl] = useState<string | null>(trip.cover_image_url);
  const [saving, setSaving] = useState(false);

  const handleSelect = (key: string, url: string) => {
    setSelectedKey(key);
    setSelectedUrl(url);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trip Cover</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30">
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

          {/* Image Picker */}
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
  );
}
