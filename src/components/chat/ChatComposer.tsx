import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Loader2, X, Reply, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Message, TripPhase, TripMember, PollType } from '@/lib/tripchat-types';
import { SFSymbol } from '@/components/icons';
import { MentionAutocomplete } from './MentionAutocomplete';
import { CreatePollModal } from './CreatePollModal';
import {
  getCurrentMention,
  getMentionSuggestions,
  insertMention,
} from '@/lib/mention-utils';

interface ChatComposerProps {
  onSend: (message: string, replyToId?: string) => Promise<{ error: Error | null }>;
  onPropose: () => void;
  onCreatePoll?: (data: {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: string | null;
  }) => Promise<void>;
  onGetSuggestions?: () => void;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  tripPhase?: TripPhase;
  members?: TripMember[];
  currentUserId?: string;
  hasLockedDestination?: boolean;
}

export function ChatComposer({
  onSend,
  onPropose,
  onCreatePoll,
  onGetSuggestions,
  disabled,
  replyTo,
  onCancelReply,
  tripPhase = 'destination',
  members = [],
  currentUserId,
  hasLockedDestination = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Disable proposing in finalize and ready phases
  const canPropose = tripPhase === 'destination' || tripPhase === 'itinerary';

  // Show suggestions button when destination is locked (itinerary phase onwards)
  const canGetSuggestions = hasLockedDestination && onGetSuggestions;

  // Get appropriate button text based on phase
  const getProposalButtonText = () => {
    switch (tripPhase) {
      case 'destination':
        return 'Propose';
      case 'itinerary':
        return 'Add';
      default:
        return 'Propose';
    }
  };

  // Focus textarea when replying
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  // Get mention suggestions based on current cursor position
  const currentMention = getCurrentMention(message, cursorPosition);
  const mentionSuggestions = currentMention
    ? getMentionSuggestions(currentMention.searchText, members, currentUserId)
    : [];
  const showMentions = mentionSuggestions.length > 0;

  // Reset mention index when suggestions change
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSuggestions.length]);

  const handleMentionSelect = useCallback((member: TripMember) => {
    const { newText, newCursorPosition } = insertMention(message, cursorPosition, member);
    setMessage(newText);
    setCursorPosition(newCursorPosition);

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, [message, cursorPosition]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const { error } = await onSend(trimmed, replyTo?.id);
    setSending(false);

    if (!error) {
      setMessage('');
      onCancelReply?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention navigation
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, mentionSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (mentionSuggestions[mentionIndex]) {
          handleMentionSelect(mentionSuggestions[mentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        // Just clear the mention by continuing to type
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape to cancel reply
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0);
  };

  // Get preview text for the message being replied to
  const getReplyPreview = () => {
    if (!replyTo) return null;
    if (replyTo.type === 'proposal' && replyTo.proposal) {
      return (
        <span className="flex items-center gap-1">
          <SFSymbol name="mappin.circle.fill" size="xs" inline />
          {replyTo.proposal.destination}
        </span>
      );
    }
    return replyTo.body?.slice(0, 50) + (replyTo.body && replyTo.body.length > 50 ? '...' : '') || '';
  };

  const handleCreatePoll = async (data: {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: string | null;
  }) => {
    if (onCreatePoll) {
      await onCreatePoll(data);
    }
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
          <Reply className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to <span className="font-medium text-foreground">{replyTo.author?.name || 'Unknown'}</span>
            </p>
            <p className="text-sm text-foreground truncate">
              {getReplyPreview()}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancelReply}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        <div className="flex-1 relative">
          {/* Mention Autocomplete */}
          <MentionAutocomplete
            suggestions={mentionSuggestions}
            selectedIndex={mentionIndex}
            onSelect={handleMentionSelect}
            visible={showMentions}
          />

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            placeholder={replyTo ? "Write a reply... (@ to mention)" : "Type a message... (@ to mention)"}
            disabled={disabled || sending}
            rows={1}
            className={cn(
              'min-h-[44px] max-h-32 resize-none pr-32',
              'focus-visible:ring-1'
            )}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Poll button */}
            {onCreatePoll && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPollModal(true)}
                disabled={disabled || sending}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Create poll"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}

            {/* Get Ideas (Suggestions) button */}
            {canGetSuggestions && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onGetSuggestions}
                disabled={disabled || sending}
                className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                title="Get AI suggestions"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}

            {canPropose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPropose}
                disabled={disabled || sending}
                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
              >
                {tripPhase === 'destination' ? (
                  <Sparkles className="h-4 w-4 mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {getProposalButtonText()}
              </Button>
            )}
          </div>
        </div>
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || sending || !message.trim()}
          className="h-11 w-11 gradient-primary text-white"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Create Poll Modal */}
      <CreatePollModal
        open={showPollModal}
        onOpenChange={setShowPollModal}
        onSubmit={handleCreatePoll}
      />
    </div>
  );
}
