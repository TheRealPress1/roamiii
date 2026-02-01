import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, Settings, Users, Vote, Award, Calendar, DollarSign, 
  MapPin, Loader2, Grid3X3, List, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeadlineCountdown } from '@/components/ui/DeadlineCountdown';
import { VibeTag } from '@/components/ui/VibeTag';
import { ProposalCard } from '@/components/ProposalCard';
import { MembersTab } from '@/components/MembersTab';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Board, BoardMember, Proposal, Vote as VoteType } from '@/lib/supabase-types';
import { formatCurrency } from '@/components/ui/BudgetBadge';
import { format } from 'date-fns';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [board, setBoard] = useState<Board | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentMember, setCurrentMember] = useState<BoardMember | null>(null);

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      // Fetch board
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError) throw boardError;
      setBoard(boardData as Board);

      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('board_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('board_id', boardId);

      if (membersError) throw membersError;
      const typedMembers = (membersData || []) as BoardMember[];
      setMembers(typedMembers);

      // Find current user's membership
      const currentUserMember = typedMembers.find(m => m.user_id === user?.id);
      setCurrentMember(currentUserMember || null);

      // Fetch proposals with creator
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          *,
          creator:profiles!proposals_created_by_fkey(*)
        `)
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;
      setProposals(proposalsData as Proposal[]);

      // Fetch all votes for this board
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('board_id', boardId);

      if (votesError) throw votesError;
      setVotes(votesData as VoteType[]);

    } catch (error) {
      console.error('Error fetching board data:', error);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, vote: 'in' | 'maybe' | 'out') => {
    if (!user || !boardId) return;

    try {
      const existingVote = votes.find(v => v.proposal_id === proposalId && v.user_id === user.id);

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('votes')
          .update({ vote })
          .eq('id', existingVote.id);

        if (error) throw error;

        setVotes(votes.map(v => 
          v.id === existingVote.id ? { ...v, vote } : v
        ));
      } else {
        // Create new vote
        const { data, error } = await supabase
          .from('votes')
          .insert({
            board_id: boardId,
            proposal_id: proposalId,
            user_id: user.id,
            vote,
          })
          .select()
          .single();

        if (error) throw error;
        setVotes([...votes, data as VoteType]);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return null;
  }

  const getProposalVotes = (proposalId: string) => {
    return votes.filter(v => v.proposal_id === proposalId);
  };

  const getUserVote = (proposalId: string) => {
    return votes.find(v => v.proposal_id === proposalId && v.user_id === user?.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container py-8">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Board Header */}
          <motion.div 
            className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {board.name}
                  </h1>
                  {board.status === 'decided' && (
                    <span className="px-2 py-1 rounded-full bg-vote-in text-white text-xs font-medium">
                      Decided
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {(board.date_start || board.date_end) && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {board.date_start && format(new Date(board.date_start), 'MMM d')}
                      {board.date_start && board.date_end && ' - '}
                      {board.date_end && format(new Date(board.date_end), 'MMM d, yyyy')}
                    </span>
                  )}

                  {(board.budget_min || board.budget_max) && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      {board.budget_min && formatCurrency(board.budget_min)}
                      {board.budget_min && board.budget_max && ' - '}
                      {board.budget_max && formatCurrency(board.budget_max)}
                      <span className="text-xs">/person</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {board.vibe_preferences && board.vibe_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {board.vibe_preferences.map((vibe) => (
                      <VibeTag key={vibe} vibe={vibe} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3">
                {board.decision_deadline && (
                  <DeadlineCountdown deadline={board.decision_deadline} size="md" />
                )}
                
                {currentMember?.role !== 'member' && (
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="proposals" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="proposals" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Proposals</span>
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {proposals.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="members" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Members</span>
                </TabsTrigger>
                <TabsTrigger value="decision" className="gap-2">
                  <Award className="h-4 w-4" />
                  <span className="hidden sm:inline">Decision</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="proposals" className="space-y-6">
              {/* Proposals Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Link to={`/app/board/${boardId}/propose`}>
                  <Button className="gradient-primary text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Propose a Trip
                  </Button>
                </Link>
              </div>

              {/* Proposals Grid/List */}
              {proposals.length === 0 ? (
                <motion.div 
                  className="text-center py-16 bg-card rounded-2xl border border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No proposals yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Be the first to propose a trip destination!
                  </p>
                  <Link to={`/app/board/${boardId}/propose`}>
                    <Button className="gradient-primary text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Propose a Trip
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'space-y-4'
                }>
                  {proposals.map((proposal, i) => (
                    <motion.div
                      key={proposal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <ProposalCard
                        proposal={proposal}
                        votes={getProposalVotes(proposal.id)}
                        userVote={getUserVote(proposal.id)}
                        memberCount={members.length}
                        boardBudgetMax={board.budget_max}
                        onVote={(vote) => handleVote(proposal.id, vote)}
                        compact={viewMode === 'list'}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="members">
              <MembersTab 
                boardId={boardId!} 
                members={members} 
                currentMember={currentMember}
                onRefresh={fetchBoardData}
              />
            </TabsContent>

            <TabsContent value="decision">
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Final Decision</h3>
                <p className="text-muted-foreground mb-6">
                  When you're ready, the group can vote on a final pick from the top proposals.
                </p>
                {proposals.length >= 2 && currentMember?.role !== 'member' && (
                  <Button className="gradient-primary text-white">
                    <Vote className="h-4 w-4 mr-2" />
                    Start Final Vote
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
