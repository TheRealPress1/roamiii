import { Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { COVER_PRESETS, getAutoPickCover, getAutoPickKey } from '@/lib/cover-presets';

interface CoverImagePickerProps {
  selectedKey: string | null;
  onSelect: (key: string, url: string) => void;
  vibeTags: string[];
  previewUrl?: string;
}

export function CoverImagePicker({
  selectedKey,
  onSelect,
  vibeTags,
  previewUrl,
}: CoverImagePickerProps) {
  const handleAutoPick = () => {
    const autoKey = getAutoPickKey(vibeTags);
    const autoUrl = getAutoPickCover(vibeTags);
    onSelect(autoKey, autoUrl);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {previewUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={previewUrl}
            alt="Cover preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Header with Auto-pick button */}
      <div className="flex items-center justify-between">
        <Label>Cover Image</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAutoPick}
          className="h-7 text-xs gap-1"
        >
          <Sparkles className="h-3 w-3" />
          Auto pick
        </Button>
      </div>

      {/* Preset Gallery */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {COVER_PRESETS.map((preset) => {
            const isSelected = selectedKey === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => onSelect(preset.key, preset.imageUrl)}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-1.5 p-1 rounded-lg transition-all',
                  'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                <div className="relative w-24 aspect-[3/2] rounded-md overflow-hidden bg-muted">
                  <img
                    src={preset.imageUrl}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {preset.emoji} {preset.label}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
