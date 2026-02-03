import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Users, XCircle, Home, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileComplete } from '@/hooks/useProfileComplete';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type InviteState = 
  | 'loading'
  | 'invalid'
  | 'auth_required'
  | 'profile_required'
  | 'checking_membership'
  | 'removed'
  | 'joining'
  | 'success'
  | 'error';

interface TripPreview {
  id: string;
  name: string;
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isComplete: profileComplete, isLoading: profileLoading } = useProfileComplete();
  
  const [state, setState] = useState<InviteState>('loading');
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch trip by invite code using database function (bypasses RLS)
  useEffect(() => {
    if (!code) {
      setState('invalid');
      return;
    }

    const fetchTrip = async () => {
      const normalizedCode = code.toUpperCase();

      const { data, error: fetchError } = await supabase
        .rpc('get_trip_by_code', { join_code_param: normalizedCode });

      if (fetchError || !data) {
        setState('invalid');
        return;
      }

      setTrip({ id: data.id, name: data.name });
      // Continue to auth check
    };

    fetchTrip();
  }, [code]);

  // Handle auth and profile state transitions
  useEffect(() => {
    if (!trip || state === 'invalid') return;
    if (authLoading || profileLoading) return;

    const processInvite = async () => {
      // Not logged in - need auth first
      if (!user) {
        localStorage.setItem('pending_invite_code', code!);
        setState('auth_required');
        return;
      }

      // Logged in but profile incomplete - need onboarding
      if (!profileComplete) {
        localStorage.setItem('pending_invite_code', code!);
        setState('profile_required');
        navigate(`/app/profile?next=/invite/${code}`, { replace: true });
        return;
      }

      // Check existing membership
      setState('checking_membership');
      
      const { data: existingMember, error: memberError } = await supabase
        .from('trip_members')
        .select('id, status')
        .eq('trip_id', trip.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error checking membership:', memberError);
        setError(memberError.message);
        setState('error');
        return;
      }

      // Already an active member - redirect to trip
      if (existingMember?.status === 'active') {
        localStorage.removeItem('pending_invite_code');
        navigate(`/app/trip/${trip.id}`, { replace: true });
        return;
      }

      // Was removed - show message
      if (existingMember?.status === 'removed') {
        setState('removed');
        return;
      }

      // No membership - create one
      setState('joining');
      
      const { error: insertError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          role: 'member',
          status: 'active',
        });

      if (insertError) {
        console.error('Error joining trip:', insertError);
        setError(insertError.message);
        setState('error');
        return;
      }

      // Post system message
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const displayName = profile?.name || profile?.email?.split('@')[0] || 'Someone';

      await supabase.from('messages').insert({
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `👋 ${displayName} joined the trip!`,
      });

      localStorage.removeItem('pending_invite_code');
      toast.success(`Joined "${trip.name}"!`);
      setState('success');
      navigate(`/app/trip/${trip.id}`, { replace: true });
    };

    processInvite();
  }, [trip, user, authLoading, profileLoading, profileComplete, code, navigate, state]);

  // Redirect to auth
  const handleGoToAuth = () => {
    localStorage.setItem('pending_invite_code', code!);
    navigate('/auth');
  };

  // Loading state
  if (state === 'loading' || state === 'checking_membership' || state === 'joining' || state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {state === 'joining' ? 'Joining trip...' : 'Loading...'}
          </p>
        </motion.div>
      </div>
    );
  }

  // Invalid invite code
  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Invalid Invite Link
          </h1>
          <p className="text-muted-foreground mb-6">
            This invite link is invalid or has expired. Please ask the trip organizer for a new link.
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // Auth required
  if (state === 'auth_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            You're Invited!
          </h1>
          {trip && (
            <p className="text-lg text-foreground mb-2">
              Join <span className="font-semibold">{trip.name}</span>
            </p>
          )}
          <p className="text-muted-foreground mb-6">
            Sign in or create an account to join this trip.
          </p>
          <Button onClick={handleGoToAuth} size="lg" className="gradient-primary text-white">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In to Join
          </Button>
        </motion.div>
      </div>
    );
  }

  // Removed from trip
  if (state === 'removed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            You've Been Removed
          </h1>
          <p className="text-muted-foreground mb-6">
            You were previously removed from this trip. Please ask the trip owner to re-invite you if you'd like to rejoin.
          </p>
          <Button asChild variant="outline">
            <Link to="/app">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-6 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Something Went Wrong
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
