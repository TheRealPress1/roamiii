import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Users, Calendar, MapPin, DollarSign, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TripPreview {
  id: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  member_count: number;
  top_proposal: {
    destination: string;
    cover_image_url: string;
    estimated_cost_per_person: number | null;
  } | null;
}

export default function JoinTripPreview() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [preview, setPreview] = useState<TripPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [joining, setJoining] = useState(false);

  // Fetch trip preview
  useEffect(() => {
    const fetchPreview = async () => {
      if (!code) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-trip-preview', {
          body: null,
          headers: {},
        });

        // Use query param instead of body for GET-like behavior
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-trip-preview?code=${code}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to load trip');
        }

        const previewData = await response.json();
        setPreview(previewData);
      } catch (err: any) {
        console.error('Error fetching preview:', err);
        setError(err.message || 'Trip not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [code]);

  // Auto-join if authenticated
  useEffect(() => {
    const autoJoin = async () => {
      if (authLoading || !preview || !user) return;
      
      setJoining(true);
      try {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('trip_members')
          .select('id')
          .eq('trip_id', preview.id)
          .eq('user_id', user.id)
          .single();

        if (existingMember) {
          toast.info('You\'re already a member of this trip!');
          navigate(`/app/trip/${preview.id}`);
          return;
        }

        // Add user as member
        const { error: memberError } = await supabase
          .from('trip_members')
          .insert({
            trip_id: preview.id,
            user_id: user.id,
            role: 'member',
          });

        if (memberError) throw memberError;

        // Post system message
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single();

        const displayName = profile?.name || profile?.email?.split('@')[0] || 'Someone';

        await supabase.from('messages').insert({
          trip_id: preview.id,
          user_id: user.id,
          type: 'system',
          body: `👋 ${displayName} joined the trip!`,
        });

        toast.success(`Joined "${preview.name}"!`);
        navigate(`/app/trip/${preview.id}`);
      } catch (err: any) {
        console.error('Error joining trip:', err);
        toast.error(err.message || 'Failed to join trip');
      } finally {
        setJoining(false);
      }
    };

    autoJoin();
  }, [user, authLoading, preview, navigate]);

  // Show auth modal after preview delay (only for unauthenticated users)
  useEffect(() => {
    if (authLoading || user || loading || error) return;

    const timer = setTimeout(() => {
      setShowAuthModal(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [authLoading, user, loading, error]);

  const handleAuth = (mode: 'login' | 'signup') => {
    // Store the join code in session storage
    if (code) {
      sessionStorage.setItem('pendingJoinCode', code);
    }
    navigate(`/auth?mode=${mode}`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Trip Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error}. The link may be invalid or expired.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (joining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Joining trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="p-4">
        <Logo size="md" />
      </header>

      {/* Preview Content */}
      <main className="container max-w-2xl py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Trip Header */}
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {preview?.name}
            </h1>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {preview?.member_count} {preview?.member_count === 1 ? 'friend' : 'friends'} planning
              </span>
              {preview?.date_start && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(preview.date_start), 'MMM d')}
                  {preview.date_end && ` - ${format(new Date(preview.date_end), 'MMM d')}`}
                </span>
              )}
            </div>
          </div>

          {/* Top Proposal Card */}
          {preview?.top_proposal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg"
            >
              <div className="aspect-video relative">
                <img
                  src={preview.top_proposal.cover_image_url}
                  alt={preview.top_proposal.destination}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {preview.top_proposal.destination}
                  </h3>
                  {preview.top_proposal.estimated_cost_per_person && (
                    <p className="text-white/80 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {preview.top_proposal.estimated_cost_per_person.toLocaleString()}/person
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Blurred Chat Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border p-4 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Recent messages</span>
            </div>
            <div className="space-y-3 blur-sm select-none pointer-events-none">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-4 w-36 bg-muted rounded" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <p className="text-sm text-muted-foreground">Sign in to see the conversation</p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Join this trip to continue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => handleAuth('signup')}
              className="w-full gradient-primary text-white"
              size="lg"
            >
              Sign Up
            </Button>
            <Button
              onClick={() => handleAuth('login')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Create an account to join "{preview?.name}" and start planning with friends.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
