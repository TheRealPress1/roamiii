import { useState, useEffect } from 'react';
import { Loader2, DollarSign, X, Plus, Sparkles, Link as LinkIcon } from 'lucide-react';
import { CoverImagePicker } from '@/components/proposal/CoverImagePicker';
import { PriceScreenshotAnalyzer } from '@/components/proposal/PriceScreenshotAnalyzer';
import { getAutoPickCover } from '@/lib/cover-presets';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VibeTagSelector } from '@/components/ui/VibeTag';
import { DestinationAutocomplete } from '@/components/ui/DestinationAutocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PROPOSAL_TYPES, type ProposalType } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

type CostCategory = 'lodging' | 'transport' | 'food' | 'activities';

interface LinkEntry {
  url: string;
  price: string;
  category: CostCategory;
}

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
}

export function CreateProposalModal({ open, onClose, tripId, onCreated, memberCount }: CreateProposalModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // Proposal type
  const [proposalType, setProposalType] = useState<ProposalType>('full_itinerary');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [destination, setDestination] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkEntry[]>([{ url: '', price: '', category: 'lodging' }]);
  const [costLodging, setCostLodging] = useState('');
  const [costTransport, setCostTransport] = useState('');
  const [costFood, setCostFood] = useState('');
  const [costActivities, setCostActivities] = useState('');

  const isQuickPost = proposalType !== 'full_itinerary';

  // Auto-calculate split from actual trip members
  const splitCount = Math.max(memberCount, 1);

  const totalCost = 
    (parseFloat(costLodging) || 0) + 
    (parseFloat(costTransport) || 0) + 
    (parseFloat(costFood) || 0) + 
    (parseFloat(costActivities) || 0);
  
  const costPerPerson = Math.round(totalCost / splitCount);

  // Auto-sum link prices by category
  useEffect(() => {
    const totals = links.reduce(
      (acc, link) => {
        const price = parseFloat(link.price) || 0;
        acc[link.category] += price;
        return acc;
      },
      { lodging: 0, transport: 0, food: 0, activities: 0 }
    );

    if (totals.lodging > 0) setCostLodging(totals.lodging.toString());
    if (totals.transport > 0) setCostTransport(totals.transport.toString());
    if (totals.food > 0) setCostFood(totals.food.toString());
    if (totals.activities > 0) setCostActivities(totals.activities.toString());
  }, [links]);

  const addLink = () => {
    if (links.length < 5) {
      setLinks([...links, { url: '', price: '', category: 'lodging' }]);
    }
  };

  const updateLink = (index: number, field: keyof LinkEntry, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const getAiEstimate = async () => {
    if (!destination.trim()) {
      toast.error('Please enter a destination first');
      return;
    }

    console.log('[AI Estimate] Starting request for:', destination);
    setEstimating(true);
    try {
      const requestBody = {
        destination: destination.trim(),
        dateStart: dateStart || null,
        dateEnd: dateEnd || null,
        attendeeCount: splitCount,
        vibeTags,
      };
      console.log('[AI Estimate] Request body:', requestBody);

      const { data, error } = await supabase.functions.invoke('estimate-trip-costs', {
        body: requestBody,
      });

      console.log('[AI Estimate] Response data:', data);
      console.log('[AI Estimate] Response error:', error);

      if (error) throw error;

      if (data) {
        if (data.error) {
          throw new Error(data.error);
        }
        setCostLodging(data.lodging?.toString() || '');
        setCostTransport(data.transport?.toString() || '');
        setCostFood(data.food?.toString() || '');
        setCostActivities(data.activities?.toString() || '');
        toast.success('Cost estimates applied!');
      }
    } catch (error: any) {
      console.error('[AI Estimate] Error:', error);
      toast.error(error.message || 'Failed to get AI estimate. Please try again.');
    } finally {
      setEstimating(false);
    }
  };

  const handleSubmit = async () => {
    // Validation based on type
    if (isQuickPost) {
      if (!user || !name.trim()) {
        toast.error('Please enter a name');
        return;
      }
    } else {
      if (!user || !destination.trim()) {
        toast.error('Please fill in required fields');
        return;
      }
    }

    // Resolve cover image URL (selected preset or auto-pick)
    const finalCoverUrl = coverImageUrl || getAutoPickCover(vibeTags);

    // For quick posts, use name as destination if destination is empty
    const finalDestination = destination.trim() || name.trim();

    setLoading(true);
    try {
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('trip_proposals')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          type: proposalType,
          name: name.trim() || null,
          description: description.trim() || null,
          address: address.trim() || null,
          url: url.trim() || null,
          price_range: priceRange || null,
          destination: finalDestination,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          cover_image_url: finalCoverUrl,
          vibe_tags: vibeTags,
          lodging_links: links.filter((l) => l.url.trim()).map((l) => l.url),
          cost_lodging_total: parseFloat(costLodging) || 0,
          cost_transport_total: parseFloat(costTransport) || 0,
          cost_food_total: parseFloat(costFood) || 0,
          cost_activities_total: parseFloat(costActivities) || 0,
          estimated_cost_per_person: costPerPerson,
          attendee_count: splitCount,
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
    setProposalType('full_itinerary');
    setName('');
    setDescription('');
    setAddress('');
    setUrl('');
    setPriceRange('');
    setDestination('');
    setDateStart('');
    setDateEnd('');
    setFlexibleDates(false);
    setCoverImageKey(null);
    setCoverImageUrl('');
    setVibeTags([]);
    setLinks([{ url: '', price: '', category: 'lodging' }]);
    setCostLodging('');
    setCostTransport('');
    setCostFood('');
    setCostActivities('');
  };

  const getTitle = () => {
    const typeInfo = PROPOSAL_TYPES.find(t => t.value === proposalType);
    if (proposalType === 'full_itinerary') return 'Propose a Trip';
    return `Add ${typeInfo?.label || 'Proposal'}`;
  };

  const getPlaceholder = () => {
    switch (proposalType) {
      case 'place': return 'e.g., Eiffel Tower';
      case 'activity': return 'e.g., Hiking at Yosemite';
      case 'food_spot': return 'e.g., Amazing ramen place';
      default: return 'e.g., Cancún, Mexico';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[85vh] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">{getTitle()}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>What are you proposing?</Label>
            <div className="grid grid-cols-4 gap-2">
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
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Post Fields (Place/Activity/Food Spot) */}
          {isQuickPost && (
            <>
              {/* Name - Primary for quick posts */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={getPlaceholder()}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Notes (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any details you want to share..."
                  rows={2}
                />
              </div>

              {/* Destination - Optional for quick posts */}
              <div className="space-y-2">
                <Label htmlFor="destination">Location (optional)</Label>
                <DestinationAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder="e.g., Paris, France"
                />
              </div>

              {/* Address - Primary for food spots */}
              {(proposalType === 'place' || proposalType === 'food_spot') && (
                <div className="space-y-2">
                  <Label htmlFor="address">
                    Address {proposalType === 'food_spot' ? '' : '(optional)'}
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 123 Main St"
                  />
                </div>
              )}

              {/* Price Range - For food spots */}
              {proposalType === 'food_spot' && (
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="flex gap-2">
                    {['$', '$$', '$$$', '$$$$'].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setPriceRange(priceRange === range ? '' : range)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                          priceRange === range
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">Link (optional)</Label>
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

              {/* Dates - Optional for quick posts */}
              {(proposalType === 'place' || proposalType === 'activity') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dateStart">Date (optional)</Label>
                    <Input
                      id="dateStart"
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateEnd">End Date</Label>
                    <Input
                      id="dateEnd"
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      min={dateStart}
                    />
                  </div>
                </div>
              )}

              {/* Cover Image - Optional for quick posts */}
              <CoverImagePicker
                selectedKey={coverImageKey}
                onSelect={(key, url) => {
                  setCoverImageKey(key);
                  setCoverImageUrl(url);
                }}
                vibeTags={vibeTags}
                previewUrl={coverImageUrl}
              />
            </>
          )}

          {/* Full Itinerary Fields */}
          {!isQuickPost && (
            <>
              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <DestinationAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder="e.g., Cancún, Mexico"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dateStart">Start Date</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateEnd">End Date</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    min={dateStart}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="flexibleDates"
                  checked={flexibleDates}
                  onCheckedChange={setFlexibleDates}
                />
                <Label htmlFor="flexibleDates" className="cursor-pointer">
                  Flexible dates
                </Label>
              </div>

              {/* Cover Image Picker */}
              <CoverImagePicker
                selectedKey={coverImageKey}
                onSelect={(key, url) => {
                  setCoverImageKey(key);
                  setCoverImageUrl(url);
                }}
                vibeTags={vibeTags}
                previewUrl={coverImageUrl}
              />

              {/* Vibe Tags */}
              <div className="space-y-2">
                <Label>Vibe Tags</Label>
                <VibeTagSelector selected={vibeTags} onChange={setVibeTags} />
              </div>

              {/* Booking Links */}
              <div className="space-y-2">
                <Label>Booking Links</Label>
                {links.map((link, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={link.category}
                      onValueChange={(value) => updateLink(index, 'category', value)}
                    >
                      <SelectTrigger className="w-28 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lodging">Lodging</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="activities">Activities</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateLink(index, 'url', e.target.value)}
                      className="flex-1 h-9"
                    />
                    <div className="relative w-24">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0"
                        value={link.price}
                        onChange={(e) => updateLink(index, 'price', e.target.value)}
                        className="pl-7 h-9"
                      />
                    </div>
                    {links.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeLink(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {links.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addLink}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Link
                  </Button>
                )}
              </div>

              {/* AI Estimate Button */}
              <Button
                variant="outline"
                onClick={getAiEstimate}
                disabled={estimating || !destination.trim()}
                className="w-full"
              >
                {estimating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Estimating costs...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get AI Estimate
                  </>
                )}
              </Button>

              {/* Cost Estimator */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-foreground">Cost Estimator</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Lodging Total</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={costLodging}
                          onChange={(e) => setCostLodging(e.target.value)}
                          className="pl-7 h-9"
                        />
                      </div>
                      <PriceScreenshotAnalyzer
                        label="lodging"
                        onPriceExtracted={(price) => setCostLodging(price.toString())}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transport</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={costTransport}
                          onChange={(e) => setCostTransport(e.target.value)}
                          className="pl-7 h-9"
                        />
                      </div>
                      <PriceScreenshotAnalyzer
                        label="transport"
                        onPriceExtracted={(price) => setCostTransport(price.toString())}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Food</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={costFood}
                          onChange={(e) => setCostFood(e.target.value)}
                          className="pl-7 h-9"
                        />
                      </div>
                      <PriceScreenshotAnalyzer
                        label="food"
                        onPriceExtracted={(price) => setCostFood(price.toString())}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Activities</Label>
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0"
                          value={costActivities}
                          onChange={(e) => setCostActivities(e.target.value)}
                          className="pl-7 h-9"
                        />
                      </div>
                      <PriceScreenshotAnalyzer
                        label="activities"
                        onPriceExtracted={(price) => setCostActivities(price.toString())}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Split: {splitCount} {splitCount === 1 ? 'member' : 'members'}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Est. per person</p>
                    <p className="text-xl font-bold text-primary">${costPerPerson}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || (isQuickPost ? !name.trim() : !destination.trim())}
            className="w-full gradient-primary text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              isQuickPost ? 'Post' : 'Post Proposal'
            )}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
