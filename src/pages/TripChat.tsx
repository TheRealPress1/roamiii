import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PanelRightOpen, PanelRightClose, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatFeed, type ChatViewMode } from '@/components/chat/ChatFeed';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { TripPanel } from '@/components/trip/TripPanel';
import { CreateProposalModal } from '@/components/proposal/CreateProposalModal';
import { ProposalDetailModal } from '@/components/proposal/ProposalDetailModal';
import { InviteModal } from '@/components/invite/InviteModal';
import { CompareTray } from '@/components/compare/CompareTray';
import { CompareModal } from '@/components/compare/CompareModal';
import { DeleteTripDialog } from '@/components/trip/DeleteTripDialog';
import { RemoveMemberDialog } from '@/components/trip/RemoveMemberDialog';
import { EditTripCoverModal } from '@/components/trip/EditTripCoverModal';
import { PhaseProgress } from '@/components/trip/PhaseProgress';
import { LockDestinationModal } from '@/components/trip/LockDestinationModal';
import { FinalizeView } from '@/components/trip/FinalizeView';
import { TransportationView } from '@/components/trip/TransportationView';
import { useTripData } from '@/hooks/useTripData';
import { useTripMessages } from '@/hooks/useTripMessages';
import { useProposalCompare } from '@/hooks/useProposalCompare';
import { useAutoLock, useVotingStatus } from '@/hooks/useAutoLock';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TripProposal, TripMember, Message } from '@/lib/tripchat-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { trip, members, proposals, loading: dataLoading, error: dataError, refetch } = useTripData(tripId!);
  const { messages, loading: messagesLoading, sendMessage } = useTripMessages(tripId!);
  
  const [showPanel, setShowPanel] = useState(true);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<TripProposal | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editCoverModalOpen, setEditCoverModalOpen] = useState(false);
  const [lockDestinationModalOpen, setLockDestinationModalOpen] = useState(false);
  const [proposalToLock, setProposalToLock] = useState<TripProposal | null>(null);
  const [finalizeViewOpen, setFinalizeViewOpen] = useState(false);
  const [transportationViewOpen, setTransportationViewOpen] = useState(false);
  const [chatViewMode, setChatViewMode] = useState<ChatViewMode>('proposals');
  const [lastViewedChatAt, setLastViewedChatAt] = useState<string | null>(null);

  // Initialize lastViewedChatAt from localStorage on mount
  useEffect(() => {
    if (tripId) {
      const stored = localStorage.getItem(`trip-${tripId}-lastViewedChatAt`);
      setLastViewedChatAt(stored);
    }
  }, [tripId]);

  // Handler for view mode changes - updates localStorage when switching to chat
  const handleViewModeChange = (mode: ChatViewMode) => {
    setChatViewMode(mode);
    if (mode === 'chat' && tripId) {
      const now = new Date().toISOString();
      localStorage.setItem(`trip-${tripId}-lastViewedChatAt`, now);
      setLastViewedChatAt(now);
    }
  };

  // Compare hook
  const { compareIds, compareCount, toggleCompare, clearCompare, isComparing } = useProposalCompare(tripId!);

  // Voting status hook
  const votingStatus = useVotingStatus(trip, proposals, members);

  // Auto-lock hook - only enable for owner
  useAutoLock({
    trip,
    proposals,
    members,
    onAutoLocked: refetch,
    userId: isOwner ? user?.id : undefined, // Only owner can trigger auto-lock
  });

  const isLoading = dataLoading || messagesLoading;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isOwner = currentMember?.role === 'owner';

  // Check if user has been removed (access denied)
  useEffect(() => {
    if (!dataLoading && !dataError && !trip && !isLoading) {
      // Trip not found or no access - check if user was kicked
      toast.error('You no longer have access to this trip.');
      navigate('/app', { replace: true });
    }
  }, [dataLoading, dataError, trip, isLoading, navigate]);

  // Get compared proposals
  const comparedProposals = proposals.filter(p => compareIds.includes(p.id));

  // Get locked destination proposal
  const lockedDestination = trip?.locked_destination_id
    ? proposals.find(p => p.id === trip.locked_destination_id) || null
    : null;

  // Filter proposals by phase context
  const destinationProposals = proposals.filter(p => p.is_destination);
  const itineraryProposals = proposals.filter(p => !p.is_destination);
  const includedProposals = proposals.filter(p => p.included);

  // Handler for opening lock destination modal
  const handleOpenLockDestination = (proposal: TripProposal) => {
    setProposalToLock(proposal);
    setLockDestinationModalOpen(true);
  };
  const handleCopyCode = async () => {
    if (!trip?.join_code) return;
    await navigator.clipboard.writeText(trip.join_code);
    setCodeCopied(true);
    toast.success('Join code copied!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleViewProposal = (proposal: TripProposal) => {
    setSelectedProposal(proposal);
  };

  // Handle winner selection from compare modal
  const handleSelectWinner = async (proposalId: string) => {
    const { error } = await supabase
      .from('trips')
      .update({ pinned_proposal_id: proposalId, status: 'decided' })
      .eq('id', tripId);

    if (error) {
      toast.error('Failed to lock trip');
      console.error('Error locking trip:', error);
      return;
    }

    toast.success('Trip locked!');
    setCompareModalOpen(false);
    refetch();
  };

  const handleDeleteTrip = async () => {
    setDeleteLoading(true);
    
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) {
      toast.error('Failed to delete trip');
      console.error('Error deleting trip:', error);
      setDeleteLoading(false);
      return;
    }

    toast.success('Trip deleted');
    navigate('/app');
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !user) return;
    
    setRemoveLoading(true);
    
    const { error } = await supabase
      .from('trip_members')
      .update({ 
        status: 'removed',
        removed_at: new Date().toISOString(),
        removed_by: user.id,
      })
      .eq('id', memberToRemove.id);

    if (error) {
      toast.error('Failed to remove member');
      console.error('Error removing member:', error);
      setRemoveLoading(false);
      return;
    }

    const memberName = memberToRemove.profile?.name || memberToRemove.profile?.email?.split('@')[0] || 'Member';
    toast.success(`${memberName} has been removed from the trip`);
    setMemberToRemove(null);
    setRemoveLoading(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">Trip not found</h1>
        <p className="text-muted-foreground mb-4">This trip doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/app')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">{trip.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Code: <span className="font-mono">{trip.join_code}</span>
              {codeCopied ? (
                <Check className="h-3.5 w-3.5 text-vote-in" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop panel toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowPanel(!showPanel)}
          className="hidden md:flex"
        >
          {showPanel ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
        </Button>

        {/* Mobile panel trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <PanelRightOpen className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80 p-0">
            <TripPanel
              trip={trip}
              members={members}
              proposals={proposals}
              onInvite={() => setInviteModalOpen(true)}
              onViewProposal={handleViewProposal}
              isOwner={isOwner}
              isAdmin={isAdmin}
              onDeleteTrip={() => setDeleteModalOpen(true)}
              onRemoveMember={(member) => setMemberToRemove(member)}
              onEditCover={() => setEditCoverModalOpen(true)}
              onOpenLockDestination={handleOpenLockDestination}
              onOpenFinalizeView={() => setFinalizeViewOpen(true)}
              onOpenTransportation={() => setTransportationViewOpen(true)}
              onPhaseChanged={refetch}
              lockedDestination={lockedDestination}
              destinationProposals={destinationProposals}
              includedProposals={includedProposals}
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Phase Progress - show below header */}
      {trip.phase && (
        <PhaseProgress
          currentPhase={trip.phase}
          lockedDestination={lockedDestination}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <ChatFeed
            messages={messages}
            loading={messagesLoading}
            tripId={tripId!}
            onViewProposal={handleViewProposal}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
            onReply={setReplyingTo}
            isAdmin={isAdmin}
            tripPhase={trip.phase}
            onProposalUpdated={refetch}
            viewMode={chatViewMode}
            onViewModeChange={handleViewModeChange}
            lockedDestinationId={trip.locked_destination_id}
            lastViewedChatAt={lastViewedChatAt}
            votingStatus={votingStatus}
          />
          <ChatComposer
            onSend={sendMessage}
            onPropose={() => setProposalModalOpen(true)}
            replyTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            tripPhase={trip.phase}
          />
        </div>

        {/* Desktop panel */}
        {showPanel && (
          <div className="hidden md:block w-80 flex-shrink-0 overflow-hidden">
            <TripPanel
            trip={trip}
            members={members}
            proposals={proposals}
            onInvite={() => setInviteModalOpen(true)}
            onViewProposal={handleViewProposal}
            isOwner={isOwner}
            isAdmin={isAdmin}
            onDeleteTrip={() => setDeleteModalOpen(true)}
            onRemoveMember={(member) => setMemberToRemove(member)}
            onEditCover={() => setEditCoverModalOpen(true)}
            onOpenLockDestination={handleOpenLockDestination}
            onOpenFinalizeView={() => setFinalizeViewOpen(true)}
            onOpenTransportation={() => setTransportationViewOpen(true)}
            onPhaseChanged={refetch}
            lockedDestination={lockedDestination}
            destinationProposals={destinationProposals}
            includedProposals={includedProposals}
          />
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProposalModal
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        tripId={tripId!}
        onCreated={() => {
          setProposalModalOpen(false);
          refetch();
        }}
        memberCount={members.length}
        tripPhase={trip.phase}
      />

      <ProposalDetailModal
        open={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        proposal={selectedProposal}
        tripId={tripId!}
        isAdmin={isOwner}
        onPinned={refetch}
        onDeleted={() => {
          setSelectedProposal(null);
          refetch();
        }}
        tripPhase={trip.phase}
      />

      <InviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        tripId={tripId!}
        joinCode={trip.join_code}
      />

      {/* Compare Tray and Modal */}
      <AnimatePresence>
        <CompareTray 
          count={compareCount} 
          onClick={() => setCompareModalOpen(true)} 
        />
      </AnimatePresence>

      <CompareModal
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        proposals={comparedProposals}
        tripId={tripId!}
        isAdmin={isAdmin}
        onRemove={toggleCompare}
        onClearAll={clearCompare}
        onSelectWinner={handleSelectWinner}
      />

      <DeleteTripDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        tripName={trip.name}
        onConfirm={handleDeleteTrip}
        loading={deleteLoading}
      />

      <RemoveMemberDialog
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        memberName={memberToRemove?.profile?.name || memberToRemove?.profile?.email?.split('@')[0] || 'Member'}
        onConfirm={handleRemoveMember}
        loading={removeLoading}
      />

      <EditTripCoverModal
        open={editCoverModalOpen}
        onOpenChange={setEditCoverModalOpen}
        trip={trip}
        onUpdate={(updatedTrip) => {
          refetch();
        }}
      />

      {/* Phase-specific modals */}
      {proposalToLock && (
        <LockDestinationModal
          open={lockDestinationModalOpen}
          onClose={() => {
            setLockDestinationModalOpen(false);
            setProposalToLock(null);
          }}
          proposal={proposalToLock}
          tripId={tripId!}
          onLocked={refetch}
        />
      )}

      <FinalizeView
        open={finalizeViewOpen}
        onClose={() => setFinalizeViewOpen(false)}
        trip={trip}
        lockedDestination={lockedDestination}
        includedProposals={includedProposals}
        isAdmin={isAdmin}
        onFinalized={refetch}
      />

      <TransportationView
        open={transportationViewOpen}
        onClose={() => setTransportationViewOpen(false)}
        trip={trip}
        members={members}
        isAdmin={isAdmin}
        onUpdated={refetch}
      />
    </div>
  );
}
