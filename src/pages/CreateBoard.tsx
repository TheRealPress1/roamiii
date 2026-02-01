import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Calendar, DollarSign, Users, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/layout/Header';
import { VibeTagSelector } from '@/components/ui/VibeTag';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STEPS = [
  { id: 'basics', title: 'Basics', icon: MapPin },
  { id: 'constraints', title: 'Budget & Vibes', icon: DollarSign },
  { id: 'invites', title: 'Invite Friends', icon: Users },
];

export default function CreateBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [decisionDeadline, setDecisionDeadline] = useState('');
  const [vibePreferences, setVibePreferences] = useState<string[]>([]);
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
      case 2:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create the board
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .insert({
          name: name.trim(),
          created_by: user.id,
          home_city: homeCity.trim() || null,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          decision_deadline: decisionDeadline || null,
          vibe_preferences: vibePreferences,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Create invites if any
      if (inviteEmails.length > 0 && board) {
        const invites = inviteEmails.map(email => ({
          board_id: board.id,
          email,
          invited_by: user.id,
          message: inviteMessage.trim() || null,
        }));

        const { error: inviteError } = await supabase
          .from('invites')
          .insert(invites);

        if (inviteError) {
          console.error('Error creating invites:', inviteError);
          toast.warning('Board created but some invites failed to send');
        }
      }

      toast.success('Trip board created!');
      navigate(`/app/board/${board.id}`);
    } catch (error: any) {
      console.error('Error creating board:', error);
      toast.error(error.message || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            key="basics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Board Name *</Label>
              <Input
                id="name"
                placeholder='e.g., "Senior Spring Break" or "Birthday Getaway"'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">Give your trip a memorable name</p>
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
                <Label htmlFor="dateStart">Trip Start Date</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEnd">Trip End Date</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  min={dateStart}
                />
              </div>
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="constraints"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Minimum Budget (per person)</Label>
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
                <Label htmlFor="budgetMax">Maximum Budget (per person)</Label>
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
              <Label htmlFor="deadline">Decision Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={decisionDeadline}
                onChange={(e) => setDecisionDeadline(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">When should the group make a final decision?</p>
            </div>

            <div className="space-y-3">
              <Label>Vibe Preferences (Select up to 5)</Label>
              <VibeTagSelector selected={vibePreferences} onChange={setVibePreferences} />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="invites"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <Label>Invite Friends by Email</Label>
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
              Invites will be sent via email with a link to join your board.
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
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Create a Trip Board
            </h1>
            <p className="text-muted-foreground mb-8">
              Set up your board and invite friends to start planning.
            </p>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
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
                    <span className="hidden sm:inline font-medium">{s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-vote-in' : 'bg-muted'}`} />
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
                      Create Board
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
