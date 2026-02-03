import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Users, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function JoinTrip() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [joinInput, setJoinInput] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

  // Extract code from link or use as-is
  const extractCode = (input: string): string => {
    const trimmed = input.trim();
    
    // Check if it's a URL with /join/ pattern
    const urlMatch = trimmed.match(/\/join\/([A-Za-z0-9]+)/);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }
    
    // Otherwise treat as plain code
    return trimmed.toUpperCase();
  };

  const handleJoin = async () => {
    if (!user || !joinInput.trim()) return;

    setLoading(true);
    try {
      const code = extractCode(joinInput);

      if (code.length < 6) {
        toast.error('Invalid code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Find the trip by join code using database function (bypasses RLS)
      const { data: tripData, error: tripError } = await supabase
        .rpc('get_trip_by_code', { join_code_param: code });

      if (tripError || !tripData) {
        toast.error('Invalid join code. Please check and try again.');
        setLoading(false);
        return;
      }

      const trip = { id: tripData.id, name: tripData.name };

      // Check if already a member (including removed status)
      const { data: existingMember } = await supabase
        .from('trip_members')
        .select('id, status')
        .eq('trip_id', trip.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember?.status === 'active') {
        toast.info('You\'re already a member of this trip!');
        navigate(`/app/trip/${trip.id}`);
        return;
      }

      if (existingMember?.status === 'removed') {
        toast.error('You were removed from this trip. Ask the owner to re-invite you.');
        setLoading(false);
        return;
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
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
        trip_id: trip.id,
        user_id: user.id,
        type: 'system',
        body: `👋 ${displayName} joined the trip!`,
      });

      toast.success(`Joined "${trip.name}"!`);
      navigate(`/app/trip/${trip.id}`);
    } catch (error: any) {
      console.error('Error joining trip:', error);
      toast.error(error.message || 'Failed to join trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="bg-card rounded-2xl border border-border p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                Join a Trip
              </h1>
              <p className="text-muted-foreground">
                Paste an invite link or enter the 6-character code
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="joinInput">Invite Link or Code</Label>
                <Input
                  id="joinInput"
                  placeholder="Paste link or enter code (e.g., ABC123)"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="text-center text-lg"
                  autoComplete="off"
                />
              </div>

              <Button
                onClick={handleJoin}
                disabled={loading || joinInput.trim().length < 6}
                className="w-full gradient-primary text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Join Trip
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have a code? Ask the trip organizer to share it with you.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
