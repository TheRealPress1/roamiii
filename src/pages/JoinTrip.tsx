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
  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;

    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();

      // Find the trip by join code
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, name')
        .eq('join_code', code)
        .single();

      if (tripError || !trip) {
        toast.error('Invalid join code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast.info('You\'re already a member of this trip!');
        navigate(`/app/trip/${trip.id}`);
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
                Enter the 6-character code shared by your friend
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Join Code</Label>
                <Input
                  id="joinCode"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl font-mono tracking-widest uppercase"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              <Button
                onClick={handleJoin}
                disabled={loading || joinCode.trim().length < 6}
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
