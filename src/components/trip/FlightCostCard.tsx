import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, Check, X, Pencil, DollarSign, Plane, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trip } from '@/lib/tripchat-types';

interface FlightCostCardProps {
  trip: Trip;
  flyingMemberCount: number;
  onCostUpdated: () => void;
  className?: string;
}

interface AnalysisResult {
  price: number;
  currency: string;
  description: string;
}

export function FlightCostCard({
  trip,
  flyingMemberCount,
  onCostUpdated,
  className,
}: FlightCostCardProps) {
  const hasCost = trip.flight_cost !== null && trip.flight_cost > 0;

  // Drop zone state
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [manualCost, setManualCost] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [bookingUrl, setBookingUrl] = useState(trip.flight_booking_url || '');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImage(null);
    setPreview('');
    setResult(null);
    setManualCost('');
    setManualDescription('');
    setAnalyzing(false);
    setDragOver(false);
    setSaving(false);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleFile = useCallback(async (file: File, autoAnalyze = false) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setImage(file);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (autoAnalyze) {
      // Auto-analyze when dropped directly on card
      await analyzeImageFile(file);
    }
  }, []);

  const analyzeImageFile = async (file: File) => {
    setAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-price-screenshot', {
        body: {
          imageBase64: base64,
          category: 'flight booking',
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);

      if (data.price > 0) {
        toast.success(`Found price: $${data.price.toLocaleString()}`);
        // Auto-save when dropped on card
        await saveCost(data.price, data.description);
      } else {
        // Open modal for manual entry if extraction failed
        setModalOpen(true);
        toast.error('Could not extract price - please enter manually');
      }
    } catch (err: any) {
      console.error('Error analyzing screenshot:', err);
      toast.error(err.message || 'Failed to analyze screenshot');
      setModalOpen(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      const { data, error } = await supabase.functions.invoke('analyze-price-screenshot', {
        body: {
          imageBase64: base64,
          category: 'flight booking',
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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

  const saveCost = async (cost: number, description: string, url?: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          flight_cost: cost,
          flight_description: description || null,
          flight_booking_url: url || bookingUrl || null,
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast.success('Flight cost saved');
      onCostUpdated();
      handleModalClose(false);
    } catch (err: any) {
      console.error('Error saving flight cost:', err);
      toast.error(err.message || 'Failed to save flight cost');
    } finally {
      setSaving(false);
    }
  };

  const handleUseExtractedPrice = () => {
    if (result && result.price > 0) {
      saveCost(result.price, result.description);
    }
  };

  const handleManualSave = () => {
    const cost = parseFloat(manualCost);
    if (isNaN(cost) || cost <= 0) {
      toast.error('Please enter a valid cost');
      return;
    }
    saveCost(cost, manualDescription);
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
      handleFile(file, true);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file, false);
    }
  };

  const totalCost = hasCost ? trip.flight_cost! * flyingMemberCount : 0;

  return (
    <>
      <div
        className={cn(
          'rounded-xl border bg-card p-4 transition-colors',
          dragOver && 'border-primary bg-primary/5',
          !analyzing && 'cursor-pointer hover:border-primary/50',
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !analyzing && setModalOpen(true)}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">
              Flight Cost
            </p>

            {analyzing ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing screenshot...
              </p>
            ) : hasCost ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-vote-in">${trip.flight_cost!.toLocaleString()}</span>
                <span className="text-muted-foreground">/person</span>
                {trip.flight_description && (
                  <span className="ml-1">- {trip.flight_description}</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Drop screenshot or click to add cost
              </p>
            )}
          </div>

          {hasCost && (
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-foreground">
                ${totalCost.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                total ({flyingMemberCount})
              </p>
            </div>
          )}

          {hasCost && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Modal for screenshot upload / manual entry */}
      <Dialog open={modalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Flight Cost</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drop zone / File input */}
            {!preview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file, false);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a screenshot or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={preview}
                    alt="Screenshot preview"
                    className="w-full max-h-[200px] object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
                    onClick={() => {
                      setImage(null);
                      setPreview('');
                      setResult(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {!result && (
                  <Button onClick={analyzeImage} disabled={analyzing} className="w-full">
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Extract Price
                      </>
                    )}
                  </Button>
                )}

                {result && (
                  <div className="p-3 rounded-lg bg-muted">
                    {result.price > 0 ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Price found</span>
                        </div>
                        <p className="text-xl font-bold">${result.price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                        <Button onClick={handleUseExtractedPrice} disabled={saving} className="w-full mt-3">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Use $${result.price.toLocaleString()}`}
                        </Button>
                      </>
                    ) : (
                      <p className="text-amber-600 text-sm">
                        Could not extract price - enter manually below
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual entry section */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Or enter manually:</p>
              <div className="space-y-3">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={manualCost}
                    onChange={(e) => setManualCost(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Input
                  placeholder="e.g. LAX → CDG roundtrip"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="Booking URL (optional)"
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={handleManualSave}
                  disabled={saving || !manualCost}
                  variant="outline"
                  className="w-full"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Cost'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
