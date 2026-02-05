import { useMemo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Reply, MapPin } from 'lucide-react';
import type { Message } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getDisplayName } from '@/lib/utils';
import { extractUrls } from '@/lib/url-utils';
import { LinkPreviewCard } from '@/components/ui/LinkPreviewCard';

interface ChatMessageProps {
  message: Message;
  onReply?: (message: Message) => void;
}

export function ChatMessage({ message, onReply }: ChatMessageProps) {
  const { user } = useAuth();
  const isOwn = message.user_id === user?.id;
  const isSystem = message.type === 'system';

  // Extract URLs from message body (limit to first 3)
  const urls = useMemo(() => {
    if (!message.body || isSystem) return [];
    return extractUrls(message.body).slice(0, 3);
  }, [message.body, isSystem]);

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center py-2"
      >
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {message.body}
        </span>
      </motion.div>
    );
  }

  const authorName = getDisplayName(message.author);
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  // Get reply preview content
  const getReplyPreview = () => {
    if (!message.reply_to) return null;

    const replyAuthorName = getDisplayName(message.reply_to.author);

    if (message.reply_to.type === 'proposal' && message.reply_to.proposal) {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3 w-3" />
          <span className="font-medium">{replyAuthorName}</span>
          <span className="text-muted-foreground">·</span>
          <span>{message.reply_to.proposal.destination}</span>
        </div>
      );
    }

    return (
      <div className="text-xs">
        <span className="font-medium">{replyAuthorName}: </span>
        <span className="text-muted-foreground">
          {message.reply_to.body?.slice(0, 40)}
          {message.reply_to.body && message.reply_to.body.length > 40 ? '...' : ''}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group flex gap-3 px-4 py-2',
        isOwn && 'flex-row-reverse'
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.author?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {authorInitials}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isOwn ? 'You' : authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>

        {/* Reply context */}
        {message.reply_to && (
          <div
            className={cn(
              'mb-1 px-3 py-1.5 rounded-lg border-l-2 border-primary/50',
              isOwn ? 'bg-primary/10' : 'bg-muted/50'
            )}
          >
            {getReplyPreview()}
          </div>
        )}

        <div className="flex items-end gap-1">
          {/* Reply button (show on hover, left side for own messages) */}
          {isOwn && onReply && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReply(message)}
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            >
              <Reply className="h-4 w-4" />
            </Button>
          )}

          <div
            className={cn(
              'px-4 py-2.5 rounded-2xl',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          </div>

          {/* Reply button (show on hover, right side for others' messages) */}
          {!isOwn && onReply && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReply(message)}
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            >
              <Reply className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Link Previews */}
        {urls.length > 0 && (
          <div className={cn(
            "mt-2 space-y-2",
            isOwn ? "ml-auto" : "mr-auto",
            "max-w-[85%]"
          )}>
            {urls.map((url) => (
              <LinkPreviewCard key={url} url={url} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
