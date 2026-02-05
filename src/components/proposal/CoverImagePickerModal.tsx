import { useState, useCallback, useRef } from 'react';
import { X, Search, Image, Upload, Loader2, Check, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { COVER_PRESETS, PRESET_CATEGORIES, getPresetsByCategory } from '@/lib/cover-presets';
import { searchUnsplash, type UnsplashSearchResult, type CoverImageSource } from '@/lib/cover-image-resolver';
import { COVER_PRESET_ICON_MAP } from '@/lib/icon-mappings';
import { SFSymbol } from '@/components/icons';
import { toast } from 'sonner';

interface CoverImagePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, source: CoverImageSource, attribution?: { photographer?: string; link?: string }) => void;
  initialSearch?: string;
}

interface UnsplashImage {
  url: string;
  photographer: string;
  link: string;
}

export function CoverImagePickerModal({
  open,
  onClose,
  onSelect,
  initialSearch = '',
}: CoverImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'presets' | 'upload'>('search');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('popular');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      // Search for multiple results by making the query broader
      const result = await searchUnsplash(searchQuery);
      if (result) {
        // For now we get one result, but the API can return more
        setSearchResults([{
          url: result.image_url,
          photographer: result.photographer,
          link: result.unsplash_link,
        }]);
      } else {
        toast.error('No images found for that search');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search images');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectUnsplash = (image: UnsplashImage) => {
    onSelect(image.url, 'unsplash', {
      photographer: image.photographer,
      link: image.link,
    });
    onClose();
  };

  const handleSelectPreset = (url: string) => {
    onSelect(url, 'preset');
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Convert to base64 data URL for now (could upload to storage later)
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onSelect(dataUrl, 'custom');
        onClose();
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const categoryPresets = getPresetsByCategory(selectedPresetCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[80vh]">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg font-display">Choose Cover Image</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="w-full justify-start gap-1 px-4 pt-2 bg-transparent">
              <TabsTrigger value="search" className="flex items-center gap-1.5 text-sm">
                <Search className="h-3.5 w-3.5" />
                Search
              </TabsTrigger>
              <TabsTrigger value="presets" className="flex items-center gap-1.5 text-sm">
                <Image className="h-3.5 w-3.5" />
                Presets
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-1.5 text-sm">
                <Upload className="h-3.5 w-3.5" />
                Upload
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="p-4 pt-2 space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for images..."
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((image, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectUnsplash(image)}
                        className="relative aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                      >
                        <img
                          src={image.url}
                          alt={`Search result ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  {searchResults.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Photo by {searchResults[0].photographer} on{' '}
                      <a
                        href={searchResults[0].link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Unsplash
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Search for images on Unsplash</p>
                  <p className="text-xs mt-1">Try "Louvre Museum" or "Tokyo restaurant"</p>
                </div>
              )}
            </TabsContent>

            {/* Presets Tab */}
            <TabsContent value="presets" className="p-4 pt-2 space-y-4">
              {/* Category selector */}
              <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedPresetCategory(cat.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      selectedPresetCategory === cat.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset grid */}
              <div className="grid grid-cols-3 gap-2">
                {categoryPresets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleSelectPreset(preset.imageUrl)}
                    className="relative aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                  >
                    <img
                      src={preset.imageUrl}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                      {COVER_PRESET_ICON_MAP[preset.key] && (
                        <SFSymbol
                          name={COVER_PRESET_ICON_MAP[preset.key]}
                          size="xs"
                          className="text-white drop-shadow"
                        />
                      )}
                      <span className="text-[10px] font-medium text-white drop-shadow truncate">
                        {preset.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="p-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  'w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25',
                  'flex flex-col items-center justify-center gap-2',
                  'hover:border-primary/50 hover:bg-muted/50 transition-colors',
                  uploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload an image
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      PNG, JPG up to 5MB
                    </span>
                  </>
                )}
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
