import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X, Reply, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/tripchat-types';

interface ChatComposerProps {
  onSend: (message: string, replyToId?: string) => Promise<{ error: Error | null }>;
  onPropose: () => void;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
}

export function ChatComposer({ onSend, onPropose, disabled, replyTo, onCancelReply }: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when replying
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape to cancel reply
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.();
    }
  };

  // Get preview text for the message being replied to
  const getReplyPreview = () => {
    if (!replyTo) return '';
    if (replyTo.type === 'proposal' && replyTo.proposal) {
      return `📍 ${replyTo.proposal.destination}`;
    }
    return replyTo.body?.slice(0, 50) + (replyTo.body && replyTo.body.length > 50 ? '...' : '') || '';
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
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? "Write a reply..." : "Type a message..."}
            disabled={disabled || sending}
            rows={1}
            className={cn(
              'min-h-[44px] max-h-32 resize-none pr-24',
              'focus-visible:ring-1'
            )}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPropose}
              disabled={disabled || sending}
              className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Propose
            </Button>
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
    </div>
  );
}
