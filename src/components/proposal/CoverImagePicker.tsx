import { Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { COVER_PRESETS, getAutoPickCover, getAutoPickKey } from '@/lib/cover-presets';
import { SFSymbol } from '@/components/icons';
import { COVER_PRESET_ICON_MAP } from '@/lib/icon-mappings';

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
}: CoverImagePickerProps) {
  const handleAutoPick = () => {
    const autoKey = getAutoPickKey(vibeTags);
    const autoUrl = getAutoPickCover(vibeTags);
    onSelect(autoKey, autoUrl);
  };

  return (
    <div className="space-y-2">
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

      {/* Compact Preset Gallery - Grid */}
      <div className="grid grid-cols-5 gap-2">
        {COVER_PRESETS.map((preset) => {
          const isSelected = selectedKey === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSelect(preset.key, preset.imageUrl)}
              className={cn(
                'flex flex-col items-center gap-1 p-1 rounded-lg transition-all',
                'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/5'
              )}
            >
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted">
                <img
                  src={preset.imageUrl}
                  alt={preset.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight text-center flex items-center justify-center">
                {COVER_PRESET_ICON_MAP[preset.key] && (
                  <SFSymbol name={COVER_PRESET_ICON_MAP[preset.key]} size="xs" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
