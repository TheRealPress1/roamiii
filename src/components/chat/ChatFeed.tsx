import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { Message, TripProposal, TripPhase } from '@/lib/tripchat-types';
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

export function ChatFeed({ messages, loading, tripId, onViewProposal, compareIds, onToggleCompare, onReply, isAdmin, tripPhase, onProposalUpdated }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <ScrollArea className="flex-1">
      <div className="py-4 space-y-1">
        {messages.map((message) =>
          message.type === 'proposal' && message.proposal ? (
            <ProposalMessage
              key={message.id}
              message={message}
              tripId={tripId}
              onViewDetails={onViewProposal}
              isComparing={compareIds?.includes(message.proposal.id) || false}
              onToggleCompare={onToggleCompare ? () => onToggleCompare(message.proposal!.id) : undefined}
              onReply={onReply}
              isAdmin={isAdmin}
              tripPhase={tripPhase}
              onProposalUpdated={onProposalUpdated}
            />
          ) : (
            <ChatMessage key={message.id} message={message} onReply={onReply} />
          )
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
