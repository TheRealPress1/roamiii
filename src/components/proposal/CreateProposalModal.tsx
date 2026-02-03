import { useState } from 'react';
import { Loader2, MapPin, DollarSign, X, Plus } from 'lucide-react';
import { CoverImagePicker } from '@/components/proposal/CoverImagePicker';
import { getAutoPickCover } from '@/lib/cover-presets';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { VibeTagSelector } from '@/components/ui/VibeTag';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Form state
  const [destination, setDestination] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [lodgingLinks, setLodgingLinks] = useState<string[]>(['']);
  const [costLodging, setCostLodging] = useState('');
  const [costTransport, setCostTransport] = useState('');
  const [costFood, setCostFood] = useState('');
  const [costActivities, setCostActivities] = useState('');

  // Auto-calculate split from actual trip members
  const splitCount = Math.max(memberCount, 1);

  const totalCost = 
    (parseFloat(costLodging) || 0) + 
    (parseFloat(costTransport) || 0) + 
    (parseFloat(costFood) || 0) + 
    (parseFloat(costActivities) || 0);
  
  const costPerPerson = Math.round(totalCost / splitCount);

  const addLodgingLink = () => {
    if (lodgingLinks.length < 3) {
      setLodgingLinks([...lodgingLinks, '']);
    }
  };

  const updateLodgingLink = (index: number, value: string) => {
    const updated = [...lodgingLinks];
    updated[index] = value;
    setLodgingLinks(updated);
  };

  const removeLodgingLink = (index: number) => {
    setLodgingLinks(lodgingLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !destination.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    // Resolve cover image URL (selected preset or auto-pick)
    const finalCoverUrl = coverImageUrl || getAutoPickCover(vibeTags);

    setLoading(true);
    try {
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('trip_proposals')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          destination: destination.trim(),
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          cover_image_url: finalCoverUrl,
          vibe_tags: vibeTags,
          lodging_links: lodgingLinks.filter((l) => l.trim()),
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
      await notifyTripMembers(tripId, user.id, actorName, destination.trim());

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
    setDestination('');
    setDateStart('');
    setDateEnd('');
    setFlexibleDates(false);
    setCoverImageKey(null);
    setCoverImageUrl('');
    setVibeTags([]);
    setLodgingLinks(['']);
    setCostLodging('');
    setCostTransport('');
    setCostFood('');
    setCostActivities('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Propose a Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="destination"
                placeholder="e.g., Cancún, Mexico"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-9"
              />
            </div>
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

          {/* Lodging Links */}
          <div className="space-y-2">
            <Label>Lodging Links</Label>
            {lodgingLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://airbnb.com/..."
                  value={link}
                  onChange={(e) => updateLodgingLink(index, e.target.value)}
                />
                {lodgingLinks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLodgingLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {lodgingLinks.length < 3 && (
              <Button variant="outline" size="sm" onClick={addLodgingLink}>
                <Plus className="h-4 w-4 mr-1" />
                Add Link
              </Button>
            )}
          </div>

          {/* Cost Estimator */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground">Cost Estimator</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Lodging Total</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={costLodging}
                    onChange={(e) => setCostLodging(e.target.value)}
                    className="pl-7 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transport</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={costTransport}
                    onChange={(e) => setCostTransport(e.target.value)}
                    className="pl-7 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Food</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={costFood}
                    onChange={(e) => setCostFood(e.target.value)}
                    className="pl-7 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Activities</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={costActivities}
                    onChange={(e) => setCostActivities(e.target.value)}
                    className="pl-7 h-9"
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

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !destination.trim()}
            className="w-full gradient-primary text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post Proposal'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
