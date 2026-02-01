import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { Message } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuth();
  const isOwn = message.user_id === user?.id;
  const isSystem = message.type === 'system';

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

  const authorName = message.author?.name || message.author?.email?.split('@')[0] || 'Unknown';
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 px-4 py-2',
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
      </div>
    </motion.div>
  );
}
