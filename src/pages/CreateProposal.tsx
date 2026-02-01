import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Loader2, MapPin, Calendar, DollarSign, Image, Link as LinkIcon,
  Plus, X, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Header } from '@/components/layout/Header';
import { VibeTagSelector } from '@/components/ui/VibeTag';
import { formatCurrency } from '@/components/ui/BudgetBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Sample cover images for demo
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800',
  'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800',
];

export default function CreateProposal() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [destination, setDestination] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [lodgingLinks, setLodgingLinks] = useState<string[]>(['']);
  const [costLodging, setCostLodging] = useState('');
  const [costTransport, setCostTransport] = useState('');
  const [costFood, setCostFood] = useState('');
  const [costActivities, setCostActivities] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('4');

  const totalCost = 
    (parseFloat(costLodging) || 0) + 
    (parseFloat(costTransport) || 0) + 
    (parseFloat(costFood) || 0) + 
    (parseFloat(costActivities) || 0);

  const costPerPerson = attendeeCount ? totalCost / parseInt(attendeeCount) : 0;

  const addLodgingLink = () => {
    setLodgingLinks([...lodgingLinks, '']);
  };

  const updateLodgingLink = (index: number, value: string) => {
    const updated = [...lodgingLinks];
    updated[index] = value;
    setLodgingLinks(updated);
  };

  const removeLodgingLink = (index: number) => {
    setLodgingLinks(lodgingLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !boardId) return;

    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }

    if (!coverImage) {
      toast.error('Please select a cover image');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          board_id: boardId,
          created_by: user.id,
          destination: destination.trim(),
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          cover_image_url: coverImage,
          vibe_tags: vibeTags,
          lodging_links: lodgingLinks.filter(l => l.trim()),
          cost_lodging_total: parseFloat(costLodging) || 0,
          cost_transport_total: parseFloat(costTransport) || 0,
          cost_food_total: parseFloat(costFood) || 0,
          cost_activities_total: parseFloat(costActivities) || 0,
          estimated_cost_per_person: costPerPerson,
          attendee_count: parseInt(attendeeCount) || 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Proposal created!');
      navigate(`/app/board/${boardId}`);
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(error.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-2xl py-8">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/app/board/${boardId}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Propose a Trip
            </h1>
            <p className="text-muted-foreground mb-8">
              Add details about your destination idea for the group.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Destination */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Destination
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="destination">Where to? *</Label>
                  <Input
                    id="destination"
                    placeholder="e.g., Cancún, Mexico"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Cover Image *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {SAMPLE_IMAGES.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCoverImage(img)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          coverImage === img 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-border'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Or paste an image URL:
                  </p>
                  <Input
                    placeholder="https://..."
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Dates
                </h2>

                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="flexible" 
                    checked={flexibleDates}
                    onCheckedChange={(checked) => setFlexibleDates(checked as boolean)}
                  />
                  <Label htmlFor="flexible" className="cursor-pointer">Dates are flexible</Label>
                </div>

                {!flexibleDates && (
                  <div className="grid sm:grid-cols-2 gap-4">
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
                )}
              </div>

              {/* Vibes */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Vibe Tags</h2>
                <VibeTagSelector selected={vibeTags} onChange={setVibeTags} />
              </div>

              {/* Lodging Links */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Lodging Links
                </h2>
                <div className="space-y-3">
                  {lodgingLinks.map((link, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Airbnb or Booking.com link"
                        value={link}
                        onChange={(e) => updateLodgingLink(i, e.target.value)}
                      />
                      {lodgingLinks.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeLodgingLink(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLodgingLink}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              </div>

              {/* Cost Estimator */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Cost Estimator
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costLodging">Lodging Total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="costLodging"
                        type="number"
                        placeholder="0"
                        value={costLodging}
                        onChange={(e) => setCostLodging(e.target.value)}
                        className="pl-9"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costTransport">Transport Total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="costTransport"
                        type="number"
                        placeholder="0"
                        value={costTransport}
                        onChange={(e) => setCostTransport(e.target.value)}
                        className="pl-9"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costFood">Food Total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="costFood"
                        type="number"
                        placeholder="0"
                        value={costFood}
                        onChange={(e) => setCostFood(e.target.value)}
                        className="pl-9"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costActivities">Activities Total</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="costActivities"
                        type="number"
                        placeholder="0"
                        value={costActivities}
                        onChange={(e) => setCostActivities(e.target.value)}
                        className="pl-9"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendees">Split between (people)</Label>
                  <Input
                    id="attendees"
                    type="number"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    min="1"
                    className="w-32"
                  />
                </div>

                {totalCost > 0 && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Estimated Cost Per Person</div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(costPerPerson)}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/app/board/${boardId}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="gradient-primary text-white flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Proposal'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
