import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSend: (message: string) => Promise<{ error: Error | null }>;
  onPropose: () => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, onPropose, disabled }: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const { error } = await onSend(trimmed);
    setSending(false);

    if (!error) {
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
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
