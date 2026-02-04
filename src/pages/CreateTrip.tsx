import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Users, Copy, Link as LinkIcon, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COVER_PRESETS } from '@/lib/cover-presets';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'setup', title: 'Trip Setup', icon: MapPin },
  { id: 'invite', title: 'Invite Friends', icon: Users },
];

interface CreatedTrip {
  id: string;
  name: string;
  join_code: string;
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<CreatedTrip | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [coverImageKey, setCoverImageKey] = useState('nature');
  const [decisionDeadline, setDecisionDeadline] = useState('');

  const getInviteLink = () => {
    if (!createdTrip) return '';
    return `${window.location.origin}/join/${createdTrip.join_code}`;
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getInviteLink());
    setCopiedLink(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!createdTrip) return;
    await navigator.clipboard.writeText(createdTrip.join_code);
    setCopiedCode(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length >= 3;
      case 1:
        return true;
      default:
        return false;
    }
  };

  const handleCreateTrip = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create the trip
      const coverPreset = COVER_PRESETS.find(p => p.key === coverImageKey);
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          created_by: user.id,
          home_city: homeCity.trim() || null,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          cover_image_url: coverPreset?.imageUrl || null,
          decision_deadline: decisionDeadline || null,
        })
        .select('id, name, join_code')
        .single();

      if (tripError) throw tripError;

      // Post a welcome system message (plain text, icons rendered at display time)
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `Trip chat created! Start planning your adventure.`,
      });

      setCreatedTrip(trip);
      setStep(1); // Move to invite step
      toast.success('Trip created!');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error(error.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Trip Name *</Label>
              <Input
                id="name"
                placeholder='e.g., "Senior Spring Break" or "Birthday Getaway"'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Cover Image Picker */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="grid grid-cols-5 gap-2">
                {COVER_PRESETS.map((preset) => {
                  const isSelected = coverImageKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setCoverImageKey(preset.key)}
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
                      <span className="text-[10px] text-muted-foreground leading-tight text-center">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="homeCity">Home City / Airport (Optional)</Label>
              <Input
                id="homeCity"
                placeholder="e.g., New York, LAX"
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Decision Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={decisionDeadline}
                onChange={(e) => setDecisionDeadline(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">When should the group make a final decision?</p>
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-vote-in-bg mx-auto mb-4 flex items-center justify-center">
                <PartyPopper className="h-8 w-8 text-vote-in" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Invite your friends
              </h2>
              <p className="text-muted-foreground mt-1">
                Share this link or code in any group chat
              </p>
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={getInviteLink()}
                    readOnly
                    className="pl-9 text-sm bg-muted"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4 text-vote-in" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Invite Code */}
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                <div className="flex-1 text-center">
                  <span className="text-3xl font-mono font-bold tracking-widest text-foreground">
                    {createdTrip?.join_code}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyCode}
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-vote-in" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Friends can paste the link or enter the code to join your trip.
            </p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        <div className="container max-w-2xl py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Create a Trip
            </h1>
            <p className="text-muted-foreground mb-8">
              Set up your trip chat and invite your crew.
            </p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-8">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      i === step
                        ? 'bg-primary text-primary-foreground'
                        : i < step
                        ? 'bg-vote-in text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < step ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                    <span className="font-medium">{s.title}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${i < step ? 'bg-vote-in' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-6">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              {step === 0 ? (
                <>
                  <div /> {/* Spacer */}
                  <Button
                    onClick={handleCreateTrip}
                    disabled={loading || !canProceed()}
                    className="gradient-primary text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div /> {/* Spacer */}
                  <Button
                    onClick={() => navigate(`/app/trip/${createdTrip?.id}`)}
                    className="gradient-primary text-white"
                  >
                    Go to Trip Chat
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
