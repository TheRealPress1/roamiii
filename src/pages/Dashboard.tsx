import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, Loader2, MessageCircle, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TripWithMeta } from '@/lib/tripchat-types';
import { format } from 'date-fns';

export default function Dashboard() {
  const { profile } = useAuth();
  const [trips, setTrips] = useState<TripWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data: tripData, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members(count),
          trip_proposals(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tripsWithMeta = (tripData || []).map((trip: any) => ({
        ...trip,
        member_count: trip.trip_members?.[0]?.count || 0,
        proposal_count: trip.trip_proposals?.[0]?.count || 0,
      }));

      setTrips(tripsWithMeta);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container max-w-4xl py-8">
          {/* Welcome Section */}
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {profile?.name ? `Hey, ${profile.name.split(' ')[0]}!` : 'Welcome back!'}
            </h1>
            <p className="text-muted-foreground">
              Plan your next adventure with friends
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
                <h3 className="text-lg font-semibold text-foreground mb-2">No trips yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create a trip chat and invite your crew to start planning together.
                </p>
                <Link to="/app/create">
                  <Button className="gradient-primary text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Trip
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/app/trip/${trip.id}`}>
                      <div className="group flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:shadow-card-hover hover:border-primary/20 transition-all">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="h-6 w-6 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {trip.name}
                            </h3>
                            {trip.status === 'decided' && (
                              <span className="px-2 py-0.5 rounded-full bg-vote-in text-white text-xs font-medium flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                Decided
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {(trip.date_start || trip.date_end) && (
                              <span>
                                {trip.date_start && format(new Date(trip.date_start), 'MMM d')}
                                {trip.date_end && ` - ${format(new Date(trip.date_end), 'MMM d')}`}
                              </span>
                            )}
                            {trip.flexible_dates && <span>Flexible dates</span>}
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {trip.member_count}
                            </span>
                            {trip.proposal_count > 0 && (
                              <span className="text-primary font-medium">
                                {trip.proposal_count} proposal{trip.proposal_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </div>
                    </Link>
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
