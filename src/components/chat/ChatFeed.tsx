import { useRef, useEffect, useMemo } from 'react';
import { Loader2, Vote, MessageCircle } from 'lucide-react';
import type { Message, TripProposal, TripPhase, ProposalType } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { ChatMessage } from './ChatMessage';
import { ProposalMessage } from './ProposalMessage';
import { cn } from '@/lib/utils';
import { SFSymbol } from '@/components/icons';
import { PROPOSAL_TYPE_ICON_MAP, TRIP_PHASE_ICON_MAP } from '@/lib/icon-mappings';
import type { SFSymbolName } from '@/components/icons';

export type ChatViewMode = 'proposals' | 'chat';

interface VotingStatusInfo {
  votedCount: number;
  totalMembers: number;
  deadline: Date | null;
  deadlinePassed: boolean;
  allVoted: boolean;
}

interface ChatFeedProps {
  messages: Message[];
  loading: boolean;
  tripId: string;
  onViewProposal: (proposal: TripProposal) => void;
  compareIds?: string[];
  onToggleCompare?: (proposalId: string) => void;
  onReply?: (message: Message) => void;
  isAdmin?: boolean;
  tripPhase?: TripPhase;
  onProposalUpdated?: () => void;
  viewMode: ChatViewMode;
  onViewModeChange: (mode: ChatViewMode) => void;
  lockedDestinationId?: string | null;
  lastViewedChatAt?: string | null;
  votingStatus?: VotingStatusInfo;
}

interface ProposalGroup {
  type: ProposalType | 'destination';
  label: string;
  icon: SFSymbolName;
  messages: Message[];
}

export function ChatFeed({ messages, loading, tripId, onViewProposal, compareIds, onToggleCompare, onReply, isAdmin, tripPhase, onProposalUpdated, viewMode, onViewModeChange, lockedDestinationId, lastViewedChatAt, votingStatus }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Separate proposals from regular messages and group proposals by type
  const { proposalGroups, regularMessages, repliesByProposalMessageId } = useMemo(() => {
    const proposalMessages: Message[] = [];
    const regularMsgs: Message[] = [];
    const repliesMap = new Map<string, Message[]>();

    // First pass: separate proposals, regular messages, and collect replies
    messages.forEach((msg) => {
      if (msg.type === 'proposal' && msg.proposal) {
        proposalMessages.push(msg);
      } else if (msg.reply_to_id) {
        // This message is a reply - add it to the replies map
        const existingReplies = repliesMap.get(msg.reply_to_id) || [];
        repliesMap.set(msg.reply_to_id, [...existingReplies, msg]);
      } else {
        regularMsgs.push(msg);
      }
    });

    // Group proposals by type
    const groups: ProposalGroup[] = [];

    // Destinations group - only show locked destination if one is locked
    const destinationMsgs = proposalMessages.filter(m => {
      if (!m.proposal?.is_destination) return false;
      // If a destination is locked, only show the locked one
      if (lockedDestinationId) {
        return m.proposal.id === lockedDestinationId;
      }
      return true;
    });
    if (destinationMsgs.length > 0) {
      groups.push({
        type: 'destination',
        label: 'Destinations',
        icon: TRIP_PHASE_ICON_MAP.destination,
        messages: destinationMsgs,
      });
    }

    // Housing group
    const housingMsgs = proposalMessages.filter(m => !m.proposal?.is_destination && m.proposal?.type === 'housing');
    if (housingMsgs.length > 0) {
      const typeInfo = PROPOSAL_TYPES.find(t => t.value === 'housing');
      groups.push({
        type: 'housing',
        label: typeInfo?.label || 'Housing',
        icon: PROPOSAL_TYPE_ICON_MAP.housing,
        messages: housingMsgs,
      });
    }

    // Activity group
    const activityMsgs = proposalMessages.filter(m => !m.proposal?.is_destination && m.proposal?.type === 'activity');
    if (activityMsgs.length > 0) {
      const typeInfo = PROPOSAL_TYPES.find(t => t.value === 'activity');
      groups.push({
        type: 'activity',
        label: typeInfo?.label || 'Activity',
        icon: PROPOSAL_TYPE_ICON_MAP.activity,
        messages: activityMsgs,
      });
    }

    return {
      proposalGroups: groups,
      regularMessages: regularMsgs,
      repliesByProposalMessageId: repliesMap,
    };
  }, [messages, lockedDestinationId]);

  // Count proposals for badge
  const proposalCount = proposalGroups.reduce((acc, g) => acc + g.messages.length, 0);

  // Calculate unread chat count (messages after last viewed)
  const unreadChatCount = lastViewedChatAt
    ? regularMessages.filter(m => m.created_at > lastViewedChatAt).length
    : regularMessages.length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          proposalCount={proposalCount}
          chatCount={unreadChatCount}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          proposalCount={proposalCount}
          chatCount={unreadChatCount}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <SFSymbol name={viewMode === 'proposals' ? 'square.stack.3d.up.fill' : 'bubble.left.fill'} size="xl" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {viewMode === 'proposals' ? 'No proposals yet' : 'No messages yet'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {viewMode === 'proposals'
                ? 'Add a proposal to start voting on trip ideas!'
                : 'Start the conversation! Share ideas with your group.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* View Mode Toggle */}
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        proposalCount={proposalCount}
        chatCount={unreadChatCount}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="py-4 space-y-4">
          {/* Proposals View */}
          {viewMode === 'proposals' && (
            <>
              {proposalGroups.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                      <SFSymbol name="square.stack.3d.up.fill" size="xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No proposals yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Add a proposal to start voting on trip ideas!
                    </p>
                  </div>
                </div>
              ) : (
                proposalGroups.map((group) => (
                  <div key={group.type} className="px-4">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <SFSymbol name={group.icon} size="md" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        {group.label}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        ({group.messages.length})
                      </span>
                    </div>

                    {/* Horizontal scrollable container for proposal cards */}
                    <div className="overflow-x-auto pb-2 -mx-4 px-4">
                      <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
                        {group.messages.map((message) => {
                          const isLocked = message.proposal?.is_destination && message.proposal?.id === lockedDestinationId;
                          return (
                            <div key={message.id} className={cn("flex-shrink-0", isLocked ? "w-[280px]" : "w-[340px]")}>
                              <ProposalMessage
                                message={message}
                                tripId={tripId}
                                onViewDetails={onViewProposal}
                                isComparing={compareIds?.includes(message.proposal!.id) || false}
                                onToggleCompare={onToggleCompare ? () => onToggleCompare(message.proposal!.id) : undefined}
                                onReply={onReply}
                                isAdmin={isAdmin}
                                tripPhase={tripPhase}
                                onProposalUpdated={onProposalUpdated}
                                replies={repliesByProposalMessageId.get(message.id) || []}
                                isLocked={isLocked}
                                votingStatus={!isLocked ? votingStatus : undefined}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Chat View */}
          {viewMode === 'chat' && (
            <>
              {regularMessages.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                      <SFSymbol name="bubble.left.fill" size="xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Start the conversation! Share ideas with your group.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {regularMessages.map((message) => (
                    <ChatMessage key={message.id} message={message} onReply={onReply} />
                  ))}
                </div>
              )}
            </>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// Toggle component for switching between Proposals and Chat views
interface ViewModeToggleProps {
  viewMode: ChatViewMode;
  onViewModeChange: (mode: ChatViewMode) => void;
  proposalCount: number;
  chatCount: number;
}

function ViewModeToggle({ viewMode, onViewModeChange, proposalCount, chatCount }: ViewModeToggleProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-1 p-2 border-b border-border bg-card relative z-10">
      <button
        onClick={() => onViewModeChange('proposals')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          viewMode === 'proposals'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Vote className="h-4 w-4" />
        <span>Proposals</span>
        {proposalCount > 0 && (
          <span className={cn(
            'px-1.5 py-0.5 text-xs rounded-full',
            viewMode === 'proposals'
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}>
            {proposalCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onViewModeChange('chat')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          viewMode === 'chat'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <MessageCircle className="h-4 w-4" />
        <span>Chat</span>
        {chatCount > 0 && (
          <span className={cn(
            'px-1.5 py-0.5 text-xs rounded-full',
            viewMode === 'chat'
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}>
            {chatCount}
          </span>
        )}
      </button>
    </div>
  );
}
