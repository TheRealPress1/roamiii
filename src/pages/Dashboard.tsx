import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Loader2, MessageCircle } from 'lucide-react';
import { TripCard } from '@/components/TripCard';

// Rotating greetings system
const GREETINGS = [
  "Time to move, {name}.",
  "Get the gang together, {name}.",
  "Let's lock it in, {name}.",
  "Where to next, {name}?",
  "Round up the crew, {name}.",
  "Pick a place, {name}.",
  "Group chat → booked, {name}.",
  "Let's roam, {name}.",
];

function getDailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pickGreeting(name: string): string {
  const dayKey = getDailyKey();
  const storageKey = `roamiii_greeting_${dayKey}`;
  const cached = localStorage.getItem(storageKey);
  if (cached) return cached.replace("{name}", name);

  const idx = Math.floor(Math.random() * GREETINGS.length);
  const chosen = GREETINGS[idx];
  localStorage.setItem(storageKey, chosen);
  return chosen.replace("{name}", name);
}
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TripWithDetails {
  id: string;
  name: string;
  status: 'planning' | 'decided';
  date_start: string | null;
  date_end: string | null;
  flexible_dates: boolean | null;
  home_city: string | null;
  join_code: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  proposal_count: number;
  last_message: string | null;
  last_message_at: string | null;
  cover_image_url: string | null;
  top_destination: string | null;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Memoized greeting - computed once per render, persists for the day
  const headline = useMemo(() => {
    const firstName = profile?.name?.split(' ')[0] || 'there';
    return pickGreeting(firstName);
  }, [profile?.name]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    setError(null);
    try {
      // Fetch trips with members (to count active only), proposals, and first proposal image
      const { data: tripData, error: fetchError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members(id, status),
          trip_proposals!trip_proposals_trip_id_fkey(
            cover_image_url,
            destination
          )
        `)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get last message for each trip (wrapped in try-catch for robustness)
      const tripsWithDetails: TripWithDetails[] = await Promise.all(
        (tripData || []).map(async (trip: any) => {
          let lastMessageData = null;
          try {
            const { data } = await supabase
              .from('messages')
              .select('body, created_at, type')
              .eq('trip_id', trip.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            lastMessageData = data;
          } catch {
            // Silently fail - message preview is optional
          }

          const proposals = trip.trip_proposals || [];
          const firstProposal = proposals[0];

          // Count only active members
          const activeMembers = trip.trip_members?.filter((m: { status: string }) => m.status === 'active') || [];

          return {
            ...trip,
            member_count: activeMembers.length,
            proposal_count: proposals.length,
            last_message: lastMessageData?.body || null,
            last_message_at: lastMessageData?.created_at || null,
            // Prefer trip's own cover_image_url, fall back to first proposal's image
            cover_image_url: trip.cover_image_url || firstProposal?.cover_image_url || null,
            top_destination: firstProposal?.destination || null,
          };
        })
      );

      // Sort by last activity (message or update)
      tripsWithDetails.sort((a, b) => {
        const aTime = a.last_message_at || a.updated_at;
        const bTime = b.last_message_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setTrips(tripsWithDetails);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      const errorCode = err?.code || '';
      console.error('Error fetching trips:', { message: errorMessage, code: errorCode, details: err });
      setError(`Failed to load trips: ${errorMessage}`);
      toast.error(`Failed to load trips: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = async (e: React.MouseEvent, trip: TripWithDetails) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!trip.join_code) return;
    
    const inviteLink = `${window.location.origin}/join/${trip.join_code}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedId(trip.id);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-5xl pt-20 md:pt-16 pb-8">
          {/* Welcome Section */}
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {headline}
            </h1>
            <p className="text-muted-foreground">
              Your roamiii trips
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/app/create">
              <Button size="lg" className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all min-w-[200px]">
                <Plus className="h-5 w-5 mr-2" />
                Create a Trip
              </Button>
            </Link>
            <Link to="/app/join">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                <Users className="h-5 w-5 mr-2" />
                Join a Trip
              </Button>
            </Link>
          </motion.div>

          {/* Trips List */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Trips</h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : trips.length === 0 ? (
              <motion.div 
                className="text-center py-16 bg-card rounded-2xl border border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">You're not in any trips yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create a trip chat and invite your crew to start planning together.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/app/create">
                    <Button className="gradient-primary text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create a Trip
                    </Button>
                  </Link>
                  <Link to="/app/join">
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Join a Trip
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TripCard
                      trip={trip}
                      onCopyInvite={handleCopyInvite}
                      isCopied={copiedId === trip.id}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
