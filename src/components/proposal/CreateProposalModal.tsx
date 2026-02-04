import { useState } from 'react';
import { Loader2, DollarSign, Link as LinkIcon, ChevronDown, ChevronUp, Calendar, Users } from 'lucide-react';
import { getAutoPickCover } from '@/lib/cover-presets';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VibeTagSelector } from '@/components/ui/VibeTag';
import { DestinationAutocomplete } from '@/components/ui/DestinationAutocomplete';
import { PriceScreenshotAnalyzer } from '@/components/proposal/PriceScreenshotAnalyzer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PROPOSAL_TYPES, type ProposalType, type TripPhase } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

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
  const [dateStart, setDateStart] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);

  // Collapsible sections
  const [showNotes, setShowNotes] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const isDestinationPhase = tripPhase === 'destination';

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

    // Auto-pick cover image based on vibe tags
    const finalCoverUrl = getAutoPickCover(vibeTags);

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
    setDateStart('');
    setTotalCost('');
    setVibeTags([]);
    setShowNotes(false);
    setShowDate(false);
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
                    placeholder="e.g., Tokyo, Japan"
                  />
                </div>

                {/* Vibe Tags */}
                <div className="space-y-2">
                  <Label>What's the vibe?</Label>
                  <VibeTagSelector selected={vibeTags} onChange={setVibeTags} />
                </div>

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
    </Dialog>
  );
}
