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
import { TripReadyView } from '@/components/trip/TripReadyView';
import { TripBuilderView } from '@/components/trip/TripBuilderView';
import { SuggestionsDrawer } from '@/components/suggestions/SuggestionsDrawer';
import { TemplateGalleryModal } from '@/components/templates/TemplateGalleryModal';
import { ExpenseLedgerModal } from '@/components/expenses/ExpenseLedgerModal';
import { useTripData } from '@/hooks/useTripData';
import { useTripMessages } from '@/hooks/useTripMessages';
import { useProposalCompare } from '@/hooks/useProposalCompare';
import { useAutoLock, useVotingStatus } from '@/hooks/useAutoLock';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { TripProposal, TripMember, Message, TripPhase, ActivitySuggestion, TripTemplate, PollType } from '@/lib/tripchat-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { trip, members, proposals, loading: dataLoading, error: dataError, refetch } = useTripData(tripId!);
  const { messages, loading: messagesLoading, sendMessage, sendDriverMessage, sendPollMessage } = useTripMessages(tripId!);
  const [joiningCarFor, setJoiningCarFor] = useState<string | null>(null);

  // New feature states
  const [suggestionsDrawerOpen, setSuggestionsDrawerOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [expenseLedgerOpen, setExpenseLedgerOpen] = useState(false);
  const [suggestionToPropose, setSuggestionToPropose] = useState<ActivitySuggestion | null>(null);
  
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
  const [transportationReadOnly, setTransportationReadOnly] = useState(false);
  const [finalizeReadOnly, setFinalizeReadOnly] = useState(false);
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

  // Derived state - must be defined before hooks that use them
  const isLoading = dataLoading || messagesLoading;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isOwner = currentMember?.role === 'owner';

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

  // Handler for adding/removing proposals from itinerary board
  const handleProposalIncludedChange = async (proposalId: string, included: boolean) => {
    const { error } = await supabase
      .from('trip_proposals')
      .update({ included })
      .eq('id', proposalId);

    if (error) {
      toast.error('Failed to update itinerary');
      console.error('Error updating proposal:', error);
      return;
    }
    toast.success(included ? 'Added to itinerary!' : 'Removed from itinerary');
    refetch();
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

  // Carpool handlers for chat driver messages
  const handleJoinCar = async (driverId: string) => {
    if (!user || !currentMember) return;

    setJoiningCarFor(driverId);
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ rides_with_id: driverId, is_driver: false })
        .eq('id', currentMember.id);

      if (error) throw error;
      toast.success('Joined car!');
      refetch();
    } catch (error: any) {
      console.error('Error joining car:', error);
      toast.error(error.message || 'Failed to join car');
    } finally {
      setJoiningCarFor(null);
    }
  };

  const handleLeaveCar = async () => {
    if (!user || !currentMember) return;

    setJoiningCarFor('leaving');
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ rides_with_id: null })
        .eq('id', currentMember.id);

      if (error) throw error;
      toast.success('Left car');
      refetch();
    } catch (error: any) {
      console.error('Error leaving car:', error);
      toast.error(error.message || 'Failed to leave car');
    } finally {
      setJoiningCarFor(null);
    }
  };

  // Handle clicks on completed phase steps
  const handlePhaseClick = (phase: TripPhase) => {
    // Determine if viewing from a later phase (read-only mode)
    const isViewingPastPhase = trip?.phase !== phase;

    switch (phase) {
      case 'transportation':
        setTransportationReadOnly(isViewingPastPhase);
        setTransportationViewOpen(true);
        break;
      case 'finalize':
        setFinalizeReadOnly(isViewingPastPhase);
        setFinalizeViewOpen(true);
        break;
      // destination and itinerary phases don't have dedicated modals
      // (they're shown in the main chat/proposal view)
    }
  };

  // Handler for adding an AI suggestion to the trip
  const handleAddSuggestion = (suggestion: ActivitySuggestion) => {
    setSuggestionToPropose(suggestion);
    setProposalModalOpen(true);
    setSuggestionsDrawerOpen(false);
  };

  // Handler for applying a trip template
  const handleApplyTemplate = async (template: TripTemplate, includeSuggestions: boolean) => {
    // Create a destination proposal from the template
    const { error } = await supabase.from('trip_proposals').insert({
      trip_id: tripId,
      created_by: user?.id,
      destination: template.destination,
      name: template.name,
      description: template.description,
      cover_image_url: template.cover_image_url,
      vibe_tags: template.vibe_tags,
      is_destination: true,
      type: 'housing',
      estimated_cost_per_person: template.budget_estimate_per_person || 0,
    });

    if (error) {
      toast.error('Failed to apply template');
      console.error('Error applying template:', error);
      return;
    }

    toast.success(`Applied "${template.name}" template!`);

    // TODO: If includeSuggestions is true, could create activity proposals
    // from template.suggested_activities

    refetch();
  };

  // Handler for creating a poll
  const handleCreatePoll = async (data: {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: string | null;
  }) => {
    const { error } = await sendPollMessage(data);
    if (error) {
      toast.error('Failed to create poll');
      console.error('Error creating poll:', error);
    }
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
              onOpenTemplates={() => setTemplateGalleryOpen(true)}
              onOpenExpenses={() => setExpenseLedgerOpen(true)}
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Phase Progress - show below header (hide for freeform building phase) */}
      {trip.phase && !(trip.planning_mode === 'freeform' && trip.phase === 'building') && (
        <PhaseProgress
          currentPhase={trip.phase}
          lockedDestination={lockedDestination}
          onClickPhase={handlePhaseClick}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat area, Builder View, or Ready View */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Freeform trips in building phase show TripBuilderView */}
          {trip.planning_mode === 'freeform' && trip.phase === 'building' ? (
            <TripBuilderView
              trip={trip}
              proposals={proposals}
              members={members}
              isAdmin={isAdmin}
              onUpdated={refetch}
            />
          ) : trip.phase === 'ready' ? (
            <TripReadyView
              trip={trip}
              lockedDestination={lockedDestination}
              includedProposals={includedProposals}
              members={members}
              // Chat props for ready view
              messages={messages}
              messagesLoading={messagesLoading}
              onSendMessage={sendMessage}
              tripId={tripId}
            />
          ) : (
            <>
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
                includedProposals={includedProposals}
                lockedDestination={lockedDestination}
                onProposalIncludedChange={handleProposalIncludedChange}
                members={members}
                currentUserId={user?.id}
                onJoinCar={handleJoinCar}
                onLeaveCar={handleLeaveCar}
                isJoiningCar={!!joiningCarFor}
              />
              <ChatComposer
                onSend={sendMessage}
                onPropose={() => setProposalModalOpen(true)}
                onCreatePoll={handleCreatePoll}
                onGetSuggestions={() => setSuggestionsDrawerOpen(true)}
                replyTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                tripPhase={trip.phase}
                members={members}
                currentUserId={user?.id}
                hasLockedDestination={!!lockedDestination}
              />
            </>
          )}
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
            onOpenTemplates={() => setTemplateGalleryOpen(true)}
            onOpenExpenses={() => setExpenseLedgerOpen(true)}
          />
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProposalModal
        open={proposalModalOpen}
        onClose={() => {
          setProposalModalOpen(false);
          setSuggestionToPropose(null);
        }}
        tripId={tripId!}
        onCreated={() => {
          setProposalModalOpen(false);
          setSuggestionToPropose(null);
          refetch();
        }}
        memberCount={members.length}
        tripPhase={trip.phase}
        prefillSuggestion={suggestionToPropose}
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
        onClose={() => {
          setFinalizeViewOpen(false);
          setFinalizeReadOnly(false);
        }}
        trip={trip}
        lockedDestination={lockedDestination}
        includedProposals={includedProposals}
        isAdmin={isAdmin}
        onFinalized={refetch}
        readOnly={finalizeReadOnly}
      />

      <TransportationView
        open={transportationViewOpen}
        onClose={() => {
          setTransportationViewOpen(false);
          setTransportationReadOnly(false);
        }}
        trip={trip}
        members={members}
        isAdmin={isAdmin}
        onUpdated={refetch}
        onSendDriverMessage={sendDriverMessage}
        readOnly={transportationReadOnly}
      />

      {/* AI Suggestions Drawer */}
      <SuggestionsDrawer
        open={suggestionsDrawerOpen}
        onClose={() => setSuggestionsDrawerOpen(false)}
        trip={trip}
        lockedDestination={lockedDestination}
        includedProposals={includedProposals}
        memberCount={members.length}
        onAddSuggestion={handleAddSuggestion}
      />

      {/* Trip Templates Gallery */}
      <TemplateGalleryModal
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Expense Ledger */}
      <ExpenseLedgerModal
        open={expenseLedgerOpen}
        onOpenChange={setExpenseLedgerOpen}
        tripId={tripId!}
        members={members}
        currentUserId={user?.id || ''}
      />
    </div>
  );
}
