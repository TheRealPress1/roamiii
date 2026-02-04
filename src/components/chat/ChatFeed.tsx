import { useRef, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { Message, TripProposal, TripPhase, ProposalType } from '@/lib/tripchat-types';
import { PROPOSAL_TYPES } from '@/lib/tripchat-types';
import { ChatMessage } from './ChatMessage';
import { ProposalMessage } from './ProposalMessage';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

interface ProposalGroup {
  type: ProposalType | 'destination';
  label: string;
  emoji: string;
  messages: Message[];
}

export function ChatFeed({ messages, loading, tripId, onViewProposal, compareIds, onToggleCompare, onReply, isAdmin, tripPhase, onProposalUpdated }: ChatFeedProps) {
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

    // Destinations group
    const destinationMsgs = proposalMessages.filter(m => m.proposal?.is_destination);
    if (destinationMsgs.length > 0) {
      groups.push({
        type: 'destination',
        label: 'Destinations',
        emoji: '🌍',
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
        emoji: typeInfo?.emoji || '🏠',
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
        emoji: typeInfo?.emoji || '🎯',
        messages: activityMsgs,
      });
    }

    return {
      proposalGroups: groups,
      regularMessages: regularMsgs,
      repliesByProposalMessageId: repliesMap,
    };
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Start the conversation! Share ideas or propose a trip destination.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-w-0">
      <div className="py-4 space-y-4">
        {/* Proposal Groups - side by side layout */}
        {proposalGroups.map((group) => (
          <div key={group.type} className="px-4">
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{group.emoji}</span>
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
                {group.messages.map((message) => (
                  <div key={message.id} className="flex-shrink-0 w-[340px]">
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
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Separator if we have both proposals and messages */}
        {proposalGroups.length > 0 && regularMessages.length > 0 && (
          <div className="border-t border-border mx-4" />
        )}

        {/* Regular chat messages */}
        <div className="space-y-1">
          {regularMessages.map((message) => (
            <ChatMessage key={message.id} message={message} onReply={onReply} />
          ))}
        </div>

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
