import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, Clock, Loader2, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeadlineCountdown } from '@/components/ui/DeadlineCountdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Board } from '@/lib/supabase-types';
import { format } from 'date-fns';

interface BoardWithMeta extends Board {
  member_count: number;
  proposal_count: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [boards, setBoards] = useState<BoardWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data: boardData, error } = await supabase
        .from('boards')
        .select(`
          *,
          board_members(count),
          proposals(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const boardsWithMeta = (boardData || []).map((board: any) => ({
        ...board,
        member_count: board.board_members?.[0]?.count || 0,
        proposal_count: board.proposals?.[0]?.count || 0,
      }));

      setBoards(boardsWithMeta);
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container py-8">
          {/* Welcome Section */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground">
              Manage your trip boards and plan your next adventure.
            </p>
          </motion.div>

          {/* Create New Board CTA */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/app/create">
              <Button size="lg" className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-5 w-5 mr-2" />
                Create New Trip Board
              </Button>
            </Link>
          </motion.div>

          {/* Boards Grid */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-6">Your Trip Boards</h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : boards.length === 0 ? (
              <motion.div 
                className="text-center py-20 bg-card rounded-2xl border border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No trip boards yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first board to start planning with friends.
                </p>
                <Link to="/app/create">
                  <Button className="gradient-primary text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Board
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board, i) => (
                  <motion.div
                    key={board.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/app/board/${board.id}`}>
                      <div className="group bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
                        {/* Preview Header */}
                        <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary relative">
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <MapPin className="h-16 w-16 text-primary" />
                          </div>
                          {board.status === 'decided' && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-vote-in text-white text-xs font-medium">
                              Decided
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 flex items-center justify-between">
                            {board.name}
                            <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </h3>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            {(board.date_start || board.date_end) && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {board.date_start && format(new Date(board.date_start), 'MMM d')}
                                  {board.date_start && board.date_end && ' - '}
                                  {board.date_end && format(new Date(board.date_end), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{board.member_count} member{board.member_count !== 1 ? 's' : ''}</span>
                            </div>

                            {board.decision_deadline && new Date(board.decision_deadline) > new Date() && (
                              <DeadlineCountdown deadline={board.decision_deadline} size="sm" />
                            )}
                          </div>

                          {board.proposal_count > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <span className="text-sm text-primary font-medium">
                                {board.proposal_count} proposal{board.proposal_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
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
