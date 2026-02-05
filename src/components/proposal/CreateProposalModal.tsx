import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, DollarSign, Link as LinkIcon, ChevronDown, ChevronUp, Calendar, Users, Pencil, ImageIcon } from 'lucide-react';
import { getAutoPickCover, getAutoPickCoverFromName } from '@/lib/cover-presets';
import { resolveCoverImage, type CoverImageResult, type CoverImageSource } from '@/lib/cover-image-resolver';
import { useLinkPreview } from '@/hooks/useLinkPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DestinationAutocomplete } from '@/components/ui/DestinationAutocomplete';
import { MapPreview } from '@/components/ui/MapPreview';
import { PriceScreenshotAnalyzer } from '@/components/proposal/PriceScreenshotAnalyzer';
import { CoverImagePickerModal } from '@/components/proposal/CoverImagePickerModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PROPOSAL_TYPES, type ProposalType, type TripPhase } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

// Generate static map URL for destination cover images
const getMapCoverUrl = (coords: [number, number]): string => {
  const [lng, lat] = coords;
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  // Use 800x450 to match Unsplash cover preset dimensions
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+8b5cf6(${lng},${lat})/${lng},${lat},10,0/800x450@2x?access_token=${token}`;
};

// Notification helper - notify all trip members about new proposal
const notifyTripMembers = async (
  tripId: string,
  actorId: string,
  actorName: string,
  destination: string
) => {
  try {
    await supabase.rpc('notify_trip_members', {
      _trip_id: tripId,
      _actor_id: actorId,
      _type: 'proposal_posted',
      _title: 'New proposal posted',
      _body: `${actorName} proposed ${destination}`,
      _href: `/app/trip/${tripId}`,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Non-blocking - don't fail the whole action
  }
};

interface CreateProposalModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  onCreated: () => void;
  memberCount: number;
  tripPhase?: TripPhase;
}

export function CreateProposalModal({ open, onClose, tripId, onCreated, memberCount, tripPhase = 'destination' }: CreateProposalModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // In Phase 1 (destination), we show destination form
  // In Phase 2+ (itinerary), default to activity (more commonly added than housing)
  const defaultType: ProposalType = 'activity';

  // Proposal type (for itinerary phase)
  const [proposalType, setProposalType] = useState<ProposalType>(defaultType);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);

  // Collapsible sections
  const [showNotes, setShowNotes] = useState(false);
  const [showDate, setShowDate] = useState(false);

  // Cover image state
  const [coverImage, setCoverImage] = useState<CoverImageResult | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [manualCoverSelected, setManualCoverSelected] = useState(false);

  // Debounce refs
  const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Link preview hook for URL
  const { preview: linkPreview, loading: linkPreviewLoading } = useLinkPreview(
    url.startsWith('http') ? url : null
  );

  const isDestinationPhase = tripPhase === 'destination';

  // Auto-resolve cover image when URL changes
  useEffect(() => {
    if (isDestinationPhase || manualCoverSelected) return;

    // If link preview has an image, use it immediately
    if (linkPreview?.image_url) {
      setCoverImage({
        url: linkPreview.image_url,
        source: 'og',
      });
      return;
    }

    // If URL is being typed but no preview yet, wait
    if (url.startsWith('http') && linkPreviewLoading) {
      setCoverLoading(true);
      return;
    }

    setCoverLoading(false);
  }, [linkPreview, linkPreviewLoading, url, isDestinationPhase, manualCoverSelected]);

  // Auto-resolve cover image when name changes (if no URL image)
  useEffect(() => {
    if (isDestinationPhase || manualCoverSelected) return;

    // If we have an OG image from URL, don't override
    if (linkPreview?.image_url) return;

    // Clear any pending debounce
    if (nameDebounceRef.current) {
      clearTimeout(nameDebounceRef.current);
    }

    // If name is empty, clear cover
    if (!name.trim()) {
      setCoverImage(null);
      return;
    }

    // Debounce the search
    setCoverLoading(true);
    nameDebounceRef.current = setTimeout(async () => {
      const result = await resolveCoverImage({
        proposalUrl: url.startsWith('http') ? url : null,
        proposalName: name,
        vibeTags,
      });
      setCoverImage(result);
      setCoverLoading(false);
    }, 500);

    return () => {
      if (nameDebounceRef.current) {
        clearTimeout(nameDebounceRef.current);
      }
    };
  }, [name, url, vibeTags, linkPreview?.image_url, isDestinationPhase, manualCoverSelected]);

  // Handle manual cover image selection
  const handleCoverSelect = useCallback((
    imageUrl: string,
    source: CoverImageSource,
    attribution?: { photographer?: string; link?: string }
  ) => {
    setCoverImage({
      url: imageUrl,
      source,
      attribution,
    });
    setManualCoverSelected(true);
  }, []);

  // Auto-calculate cost per person from total cost / members
  const splitCount = Math.max(memberCount, 1);
  const totalCostNum = parseFloat(totalCost) || 0;
  // For housing: divide total by members. For activities: cost is already per-person
  const costPerPerson = totalCostNum > 0
    ? (proposalType === 'housing' ? Math.round(totalCostNum / splitCount) : totalCostNum)
    : 0;

  const handleSubmit = async () => {
    // Validation based on phase
    if (isDestinationPhase) {
      if (!user || !destination.trim()) {
        toast.error('Please enter a destination');
        return;
      }
    } else {
      if (!user || !name.trim()) {
        toast.error('Please enter a name');
        return;
      }
    }

    // Use map image for destination proposals
    // For itinerary items, use the resolved cover image or fall back to auto-pick
    let finalCoverUrl: string;
    if (isDestinationPhase && coordinates) {
      finalCoverUrl = getMapCoverUrl(coordinates);
    } else if (coverImage?.url) {
      finalCoverUrl = coverImage.url;
    } else if (name.trim()) {
      finalCoverUrl = getAutoPickCoverFromName(name);
    } else {
      finalCoverUrl = getAutoPickCover(vibeTags);
    }

    // For itinerary items, use name as destination if destination is empty
    const finalDestination = destination.trim() || name.trim();

    setLoading(true);
    try {
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('trip_proposals')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          type: isDestinationPhase ? 'housing' : proposalType, // Default to housing for destinations
          name: name.trim() || null,
          description: description.trim() || null,
          url: url.trim() || null,
          destination: finalDestination,
          date_start: dateStart || null,
          cover_image_url: finalCoverUrl,
          vibe_tags: vibeTags,
          estimated_cost_per_person: costPerPerson,
          attendee_count: splitCount,
          is_destination: isDestinationPhase,
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Post proposal message
      await supabase.from('messages').insert({
        trip_id: tripId,
        user_id: user.id,
        type: 'proposal',
        proposal_id: proposal.id,
      });

      // Notify other trip members
      const actorName = profile?.name || profile?.email?.split('@')[0] || 'Someone';
      const displayName = name.trim() || finalDestination;
      await notifyTripMembers(tripId, user.id, actorName, displayName);

      toast.success('Proposal posted!');
      resetForm();
      onCreated();
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(error.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProposalType(defaultType);
    setName('');
    setDescription('');
    setUrl('');
    setDestination('');
    setCoordinates(null);
    setDateStart('');
    setTotalCost('');
    setVibeTags([]);
    setShowNotes(false);
    setShowDate(false);
    setCoverImage(null);
    setCoverLoading(false);
    setManualCoverSelected(false);
  };

  const getTitle = () => {
    if (isDestinationPhase) return 'Propose a Destination';
    const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
    return `Add ${typeInfo?.label || 'to Itinerary'}`;
  };

  const getPlaceholder = () => {
    switch (proposalType) {
      case 'housing': return 'e.g., Airbnb in downtown Tokyo';
      case 'activity': return 'e.g., Skiing at Niseko';
      default: return 'e.g., Amazing hiking trip';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[85vh] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{getTitle()}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* PHASE 1: DESTINATION - Simple form */}
            {isDestinationPhase && (
              <>
                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination">Where do you want to go? *</Label>
                  <DestinationAutocomplete
                    value={destination}
                    onChange={setDestination}
                    onCoordinatesChange={setCoordinates}
                    placeholder="e.g., Tokyo, Japan"
                  />
                </div>

                {/* Map Preview - appears after selecting a place */}
                {coordinates && (
                  <MapPreview coordinates={coordinates} />
                )}

                {/* Optional notes - collapsed by default */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Add notes (optional)
                  </button>
                  {showNotes && (
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share why you think this would be a great destination..."
                      rows={2}
                    />
                  )}
                </div>
              </>
            )}

            {/* PHASE 2+: ITINERARY - Type selector and simplified fields */}
            {!isDestinationPhase && (
              <>
                {/* Type Selector */}
                <div className="space-y-2">
                  <Label>What are you adding?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPOSAL_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setProposalType(type.value as ProposalType)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center',
                          proposalType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        )}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name - Primary field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={getPlaceholder()}
                  />
                </div>

                {/* Link - Prominent */}
                <div className="space-y-2">
                  <Label htmlFor="url">Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Cover Image Preview */}
                {(coverImage || coverLoading || name.trim()) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Cover Image</Label>
                      {coverImage && (
                        <button
                          type="button"
                          onClick={() => setShowCoverPicker(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Change
                        </button>
                      )}
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
                      {coverLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : coverImage ? (
                        <>
                          <img
                            src={coverImage.url}
                            alt="Cover preview"
                            className="w-full h-full object-cover"
                            onError={() => {
                              // Fallback if image fails to load
                              setCoverImage({
                                url: getAutoPickCoverFromName(name),
                                source: 'preset',
                              });
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/80">
                                {coverImage.source === 'og' && linkPreview?.site_name
                                  ? `From ${linkPreview.site_name}`
                                  : coverImage.source === 'unsplash'
                                  ? `Photo by ${coverImage.attribution?.photographer}`
                                  : 'Preset image'}
                              </span>
                              {coverImage.source === 'unsplash' && coverImage.attribution?.link && (
                                <a
                                  href={coverImage.attribution.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-white/60 hover:text-white underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Unsplash
                                </a>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCoverPicker(true)}
                          className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        >
                          <ImageIcon className="h-8 w-8 mb-1" />
                          <span className="text-xs">Add cover image</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Cost with screenshot analyzer */}
                <div className="space-y-2">
                  <Label htmlFor="totalCost">
                    {proposalType === 'housing' ? 'Total Cost' : 'Cost per Person'}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="totalCost"
                        type="number"
                        value={totalCost}
                        onChange={(e) => setTotalCost(e.target.value)}
                        placeholder="0"
                        className="pl-9"
                      />
                    </div>
                    <PriceScreenshotAnalyzer
                      label={proposalType === 'housing' ? 'housing' : 'activity'}
                      onPriceExtracted={(price) => setTotalCost(price.toString())}
                    />
                  </div>
                  {/* Calculated cost per person */}
                  {totalCostNum > 0 && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                      {proposalType === 'housing' ? (
                        <>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {splitCount} {splitCount === 1 ? 'person' : 'people'}
                          </span>
                          <span className="font-semibold text-primary">
                            ${costPerPerson}/person
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-primary ml-auto">
                          ${costPerPerson}/person
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes - collapsed by default */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Add notes (optional)
                  </button>
                  {showNotes && (
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Any details you want to share..."
                      rows={2}
                    />
                  )}
                </div>

                {/* Specific Date - collapsed by default */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowDate(!showDate)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showDate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Calendar className="h-4 w-4" />
                    Add specific date (optional)
                  </button>
                  {showDate && (
                    <Input
                      id="dateStart"
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading || (isDestinationPhase ? !destination.trim() : !name.trim())}
              className="w-full gradient-primary text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                isDestinationPhase ? 'Propose Destination' : 'Add to Itinerary'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Cover Image Picker Modal */}
      <CoverImagePickerModal
        open={showCoverPicker}
        onClose={() => setShowCoverPicker(false)}
        onSelect={handleCoverSelect}
        initialSearch={name}
      />
    </Dialog>
  );
}
