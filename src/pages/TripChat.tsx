import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, PanelRightOpen, PanelRightClose, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatFeed } from '@/components/chat/ChatFeed';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { TripPanel } from '@/components/trip/TripPanel';
import { CreateProposalModal } from '@/components/proposal/CreateProposalModal';
import { ProposalDetailModal } from '@/components/proposal/ProposalDetailModal';
import { InviteModal } from '@/components/invite/InviteModal';
import { useTripData } from '@/hooks/useTripData';
import { useTripMessages } from '@/hooks/useTripMessages';
import { useAuth } from '@/contexts/AuthContext';
import type { TripProposal } from '@/lib/tripchat-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TripChat() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { trip, members, proposals, loading: dataLoading, refetch } = useTripData(tripId!);
  const { messages, loading: messagesLoading, sendMessage } = useTripMessages(tripId!);
  
  const [showPanel, setShowPanel] = useState(true);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<TripProposal | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const isLoading = dataLoading || messagesLoading;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

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
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatFeed
            messages={messages}
            loading={messagesLoading}
            tripId={tripId!}
            onViewProposal={handleViewProposal}
          />
          <ChatComposer
            onSend={sendMessage}
            onPropose={() => setProposalModalOpen(true)}
          />
        </div>

        {/* Desktop panel */}
        <motion.div
          initial={false}
          animate={{ width: showPanel ? 320 : 0, opacity: showPanel ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn('hidden md:block overflow-hidden', !showPanel && 'pointer-events-none')}
        >
          <TripPanel
            trip={trip}
            members={members}
            proposals={proposals}
            onInvite={() => setInviteModalOpen(true)}
            onViewProposal={handleViewProposal}
          />
        </motion.div>
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
      />

      <ProposalDetailModal
        open={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        proposal={selectedProposal}
        tripId={tripId!}
        isAdmin={isAdmin}
        onPinned={refetch}
      />

      <InviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        tripId={tripId!}
        joinCode={trip.join_code}
      />
    </div>
  );
}
