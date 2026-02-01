import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Calendar, DollarSign, Users, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STEPS = [
  { id: 'setup', title: 'Trip Setup', icon: MapPin },
  { id: 'invite', title: 'Invite Crew', icon: Users },
];

export default function CreateTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [decisionDeadline, setDecisionDeadline] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (inviteEmails.includes(email)) {
      toast.error('Email already added');
      return;
    }

    if (inviteEmails.length >= 30) {
      toast.error('Maximum 30 invites allowed');
      return;
    }
    
    setInviteEmails([...inviteEmails, email]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length >= 3;
      case 1:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          created_by: user.id,
          home_city: homeCity.trim() || null,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          flexible_dates: flexibleDates,
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          decision_deadline: decisionDeadline || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create invites if any
      if (inviteEmails.length > 0 && trip) {
        const invites = inviteEmails.map(email => ({
          trip_id: trip.id,
          email,
          invited_by: user.id,
          message: inviteMessage.trim() || null,
        }));

        const { error: inviteError } = await supabase
          .from('trip_invites')
          .insert(invites);

        if (inviteError) {
          console.error('Error creating invites:', inviteError);
          toast.warning('Trip created but some invites failed to send');
        }
      }

      // Post a welcome system message
      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `🎉 Trip chat created! Start planning your adventure.`,
      });

      toast.success('Trip created!');
      navigate(`/app/trip/${trip.id}`);
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

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Min Budget (per person)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="budgetMin"
                    type="number"
                    placeholder="500"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    className="pl-9"
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Max Budget (per person)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="budgetMax"
                    type="number"
                    placeholder="2000"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    className="pl-9"
                    min={budgetMin || "0"}
                  />
                </div>
              </div>
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
            <div className="space-y-3">
              <Label>Invite Friends by Email (up to 30)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addEmail}>
                  Add
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {inviteEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-sm"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteMessage">Personal Message (Optional)</Label>
              <Textarea
                id="inviteMessage"
                placeholder="Hey! Join me in planning our next trip..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Invites will be sent via email with a link to join.
              {inviteEmails.length === 0 && " You can skip this step and invite people later."}
            </p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
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
                  <button
                    onClick={() => i < step && setStep(i)}
                    disabled={i > step}
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
                  </button>
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
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="gradient-primary text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
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
                      <Check className="h-4 w-4 mr-2" />
                      Create Trip
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
