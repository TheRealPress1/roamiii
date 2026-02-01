import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/tripchat-types';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3',
        isUnread && 'bg-primary/5'
      )}
    >
      {/* Actor avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={notification.actor?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {notification.actor?.name?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-foreground', isUnread && 'font-medium')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-sm text-muted-foreground truncate">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </button>
  );
}
