import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, Check, X, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PriceScreenshotAnalyzerProps {
  onPriceExtracted: (price: number) => void;
  label?: string;
}

interface AnalysisResult {
  price: number;
  currency: string;
  description: string;
}

export function PriceScreenshotAnalyzer({
  onPriceExtracted,
  label = "expense"
}: PriceScreenshotAnalyzerProps) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImage(null);
    setPreview("");
    setResult(null);
    setAnalyzing(false);
    setDragOver(false);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setImage(file);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      const { data, error } = await supabase.functions.invoke('analyze-price-screenshot', {
        body: {
          imageBase64: base64,
          category: label,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      if (data.price > 0) {
        toast.success(`Found price: $${data.price.toLocaleString()}`);
      } else {
        toast.error('Could not extract price from image');
      }
    } catch (err: any) {
      console.error('Error analyzing screenshot:', err);
      toast.error(err.message || 'Failed to analyze screenshot');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUsePrice = () => {
    if (result && result.price > 0) {
      onPriceExtracted(result.price);
      handleClose(false);
      toast.success(`Applied $${result.price.toLocaleString()} to ${label}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          title={`Upload ${label} screenshot`}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extract Price from Screenshot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / File input */}
          {!preview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a screenshot here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                <img
                  src={preview}
                  alt="Screenshot preview"
                  className="w-full max-h-[300px] object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
                  onClick={() => {
                    setImage(null);
                    setPreview("");
                    setResult(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Analyze button */}
              {!result && (
                <Button
                  onClick={analyzeImage}
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Extract Price
                    </>
                  )}
                </Button>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted">
                    {result.price > 0 ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Price found</span>
                        </div>
                        <p className="text-2xl font-bold">
                          ${result.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.description}
                        </p>
                      </>
                    ) : (
                      <div className="text-amber-600">
                        <p className="font-medium">Could not extract price</p>
                        <p className="text-sm mt-1">
                          Try a clearer screenshot showing the total price
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImage(null);
                        setPreview("");
                        setResult(null);
                      }}
                      className="flex-1"
                    >
                      Try Another
                    </Button>
                    {result.price > 0 && (
                      <Button
                        onClick={handleUsePrice}
                        className="flex-1"
                      >
                        Use ${result.price.toLocaleString()}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
